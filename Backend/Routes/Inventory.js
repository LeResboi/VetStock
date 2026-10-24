// FILE: routes/inventory.js
// PURPOSE: VetStock inventory API

import express from "express";

import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

// ============================================================
// GET ALL INVENTORY
// ============================================================

router.get("/", authenticateToken, async (req, res) => {
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
            .order("created_at", {
                ascending: true
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
        "Clinic Manager",
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


            res.status(201).json({
                success: true,
                message:
                    "Inventory item created successfully.",
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

export default router;