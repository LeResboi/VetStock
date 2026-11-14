// FILE: routes/Inventory.js
// PURPOSE: VetStock inventory API

import express from "express";

import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";
import { createAuditLog } from "../Utils/AuditLogger.js";

const router = express.Router();

// ============================================================
// GET ALL INVENTORY
// ============================================================

router.get(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
        "Inventory Staff",
        "Veterinarian"

    ),
    async (req, res) => {
        try {

            const { data, error } = await supabase
                .from("inventory_items")
                .select(`
                *,
                suppliers (
                    supplier_id,
                    supplier_name
                ),
                inventory_batches (
                    batch_id,
                    batch_number,
                    quantity,
                    expiration_date
                )
            `)
                .eq("clinic_id", req.user.clinic_id)
                .eq("is_active", true)
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }


            // =====================================================
            // CALCULATE CURRENT STOCK
            // =====================================================

            const inventoryWithStock = data.map(item => {

                const totalQuantity =
                    Array.isArray(item.inventory_batches)
                        ? item.inventory_batches.reduce(
                            (total, batch) =>
                                total + Number(batch.quantity || 0),
                            0
                        )
                        : 0;


                return {
                    ...item,

                    // Current stock from all batches
                    quantity: totalQuantity
                };

            });


            res.json({
                success: true,
                count: inventoryWithStock.length,
                data: inventoryWithStock
            });

        } catch (error) {

            console.error(
                "Get inventory error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Internal server error."
            });

        }
    });

// ============================================================
// CREATE INVENTORY ITEM
// ============================================================

router.post(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Inventory Staff"
    ),
    async (req, res) => {

        try {

            const {
                item_name,
                category,
                unit_of_measure,
                unit_price,
                cost_price,
                supplier_id,
                min_stock_level,
                max_stock_level,
                reorder_point,
                storage_conditions,
                quantity,
                expiration_date
            } = req.body;

            if (!item_name) {
                return res.status(400).json({
                    success: false,
                    message: "Item name is required."
                });
            }


            // =====================================================
            // CREATE INVENTORY ITEM
            // =====================================================

            const { data: item, error: itemError } =
                await supabase
                    .from("inventory_items")
                    .insert({
                        clinic_id: req.user.clinic_id,
                        supplier_id: supplier_id || null,
                        item_name,
                        category: category || null,
                        unit_of_measure:
                            unit_of_measure || null,
                        unit_price:
                            Number(unit_price) || 0,
                        cost_price:
                            Number(cost_price) || 0,
                        min_stock_level:
                            Number(min_stock_level) || 0,
                        max_stock_level:
                            Number(max_stock_level) || 0,
                        reorder_point:
                            Number(reorder_point) || 0,
                        storage_conditions:
                            storage_conditions || null
                    })
                    .select()
                    .single();


            if (itemError) {

                console.error(
                    "Inventory item error:",
                    itemError
                );

                return res.status(500).json({
                    success: false,
                    message: itemError.message
                });
            }


            // =====================================================
            // CREATE INVENTORY BATCH
            // =====================================================

            const { data: batch, error: batchError } =
                await supabase
                    .from("inventory_batches")
                    .insert({
                        item_id: item.item_id,
                        batch_number: `BATCH-${Date.now()}`,
                        quantity: Number(quantity) || 0,
                        expiration_date:
                            expiration_date || null
                    })
                    .select()
                    .single();


            if (batchError) {

                console.error(
                    "Inventory batch error:",
                    batchError
                );

                await supabase
                    .from("inventory_items")
                    .delete()
                    .eq("item_id", item.item_id);

                return res.status(500).json({
                    success: false,
                    message: batchError.message
                });
            }


            // =====================================================
            // CREATE NEW BATCH ALERT
            // =====================================================

            let batchAlertWarning = null;

            const { error: batchAlertError } = await supabase
                .from("alerts")
                .insert({
                    clinic_id: req.user.clinic_id,
                    item_id: item.item_id,
                    patient_id: null,
                    alert_type: "NEW_BATCH_CREATED",
                    severity: "low",
                    message:
                        `New batch ${batch.batch_number} of ${item.item_name} ` +
                        `was created with ${Number(batch.quantity) || 0} units.`,
                    current_stock: Number(batch.quantity) || 0,
                    threshold: null,
                    status: "active",
                    is_read: false,
                    read_at: null
                });

            if (batchAlertError) {
                console.error(
                    "New batch alert error:",
                    batchAlertError
                );

                batchAlertWarning =
                    "The inventory item and batch were created, but the notification could not be saved.";
            }


            // =====================================================
            // CREATE AUDIT LOG
            // =====================================================

            await createAuditLog(req, {
                action: "CREATE",
                targetTable: "inventory_items",
                targetId: item.item_id,
                details: {
                    description: `Created inventory item: ${item.item_name}`,
                    category: item.category,
                    batch_id: batch.batch_id,
                    batch_number: batch.batch_number,
                    initial_quantity: Number(batch.quantity) || 0,
                    expiration_date: batch.expiration_date || null
                }
            });

            res.status(201).json({
                success: true,
                message: batchAlertWarning ||
                    "Inventory item created successfully.",
                warning: batchAlertWarning,
                data: {
                    item,
                    batch
                }
            });


        } catch (error) {

            console.error(
                "Create inventory error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }
    }
);

// ============================================================
// UPDATE INVENTORY ITEM
// ============================================================

router.put(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
        "Inventory Staff"
    ),
    async (req, res) => {
        try {
            const {
                item_name,
                category,
                unit_of_measure,
                unit_price,
                cost_price,
                supplier_id,
                min_stock_level,
                max_stock_level,
                reorder_point,
                storage_conditions
            } = req.body;

            if (!item_name || !item_name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Item name is required."
                });
            }

            const updates = {
                item_name: item_name.trim(),
                category: category || null,
                unit_of_measure: unit_of_measure || null,
                unit_price: Number(unit_price) || 0,
                cost_price: Number(cost_price) || 0,
                supplier_id: supplier_id || null,
                min_stock_level: Number(min_stock_level) || 0,
                max_stock_level: Number(max_stock_level) || 0,
                reorder_point: Number(reorder_point) || 0,
                storage_conditions: storage_conditions || null,
                updated_at: new Date().toISOString()
            };

            const { data: item, error } = await supabase
                .from("inventory_items")
                .update(updates)
                .eq("item_id", req.params.id)
                .eq("clinic_id", req.user.clinic_id)
                .eq("is_active", true)
                .select()
                .single();

            if (error) {
                console.error("Update inventory error:", error);

                return res.status(
                    error.code === "PGRST116" ? 404 : 500
                ).json({
                    success: false,
                    message: error.code === "PGRST116"
                        ? "Inventory item not found."
                        : error.message
                });
            }

            await createAuditLog(req, {
                action: "UPDATE",
                targetTable: "inventory_items",
                targetId: item.item_id,
                details: {
                    description: `Updated inventory item: ${item.item_name}`
                }
            });

            res.json({
                success: true,
                message: "Inventory item updated successfully.",
                data: item
            });

        } catch (error) {
            console.error("Update inventory error:", error);

            res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }
    }
);

// ============================================================
// DELETE INVENTORY ITEM (SOFT DELETE)
// ============================================================

router.delete(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
        "Inventory Staff"
    ),
    async (req, res) => {
        try {
            const { data: item, error } = await supabase
                .from("inventory_items")
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq("item_id", req.params.id)
                .eq("clinic_id", req.user.clinic_id)
                .eq("is_active", true)
                .select()
                .single();

            if (error) {
                console.error("Delete inventory error:", error);

                return res.status(
                    error.code === "PGRST116" ? 404 : 500
                ).json({
                    success: false,
                    message: error.code === "PGRST116"
                        ? "Inventory item not found or already deleted."
                        : error.message
                });
            }

            await createAuditLog(req, {
                action: "DELETE",
                targetTable: "inventory_items",
                targetId: item.item_id,
                details: {
                    description: `Deactivated inventory item: ${item.item_name}`
                }
            });

            res.json({
                success: true,
                message: "Inventory item deleted successfully."
            });

        } catch (error) {
            console.error("Delete inventory error:", error);

            res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }
    }
);

export default router;