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
                )
            `)
            .eq("clinic_id", req.user.clinic_id)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});

// ============================================================
// GET ONE INVENTORY ITEM
// ============================================================

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("inventory_items")
            .select(`
                *,
                suppliers (
                    supplier_id,
                    supplier_name
                )
            `)
            .eq("item_id", id)
            .eq("clinic_id", req.user.clinic_id)
            .maybeSingle();

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found."
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
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
                storage_conditions
            } = req.body;

            if (!item_name) {
                return res.status(400).json({
                    success: false,
                    message: "Item name is required."
                });
            }

            const { data, error } = await supabase
                .from("inventory_items")
                .insert({
                    clinic_id: req.user.clinic_id,
                    supplier_id: supplier_id || null,
                    item_name,
                    category: category || null,
                    unit_of_measure: unit_of_measure || null,
                    unit_price: Number(unit_price) || 0,
                    cost_price: Number(cost_price) || 0,
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

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(201).json({
                success: true,
                message:
                    "Inventory item created successfully.",
                data
            });

        } catch (error) {
            console.error(error);

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
        "Clinic Manager",
        "Inventory Staff"
    ),
    async (req, res) => {

        try {
            const { id } = req.params;

            const allowedFields = [
                "item_name",
                "category",
                "unit_of_measure",
                "unit_price",
                "cost_price",
                "supplier_id",
                "min_stock_level",
                "max_stock_level",
                "reorder_point",
                "storage_conditions",
                "is_active"
            ];

            const updates = {};

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            updates.updated_at =
                new Date().toISOString();

            const { data, error } = await supabase
                .from("inventory_items")
                .update(updates)
                .eq("item_id", id)
                .eq("clinic_id", req.user.clinic_id)
                .select()
                .maybeSingle();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory item not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Inventory item updated successfully.",
                data
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }
    }
);

// ============================================================
// DELETE / DEACTIVATE INVENTORY ITEM
// ============================================================

router.delete(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager"
    ),
    async (req, res) => {

        try {
            const { id } = req.params;

            /*
             * Soft delete:
             * We deactivate the item instead of permanently
             * deleting historical inventory information.
             */

            const { data, error } = await supabase
                .from("inventory_items")
                .update({
                    is_active: false,
                    updated_at:
                        new Date().toISOString()
                })
                .eq("item_id", id)
                .eq("clinic_id", req.user.clinic_id)
                .select()
                .maybeSingle();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory item not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Inventory item deactivated successfully.",
                data
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }
    }
);

export default router;