// FILE: Routes/InventoryBatches.js
// PURPOSE: Manage inventory batches and expiration dates

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();


// ======================================================
// GET ALL BATCHES
// GET /api/inventory-batches
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Get inventory items belonging to the user's clinic
        const { data: items, error: itemError } = await supabase
            .from("inventory_items")
            .select("item_id")
            .eq("clinic_id", req.user.clinic_id);

        if (itemError) {
            throw itemError;
        }

        const itemIds = items.map(item => item.item_id);

        if (itemIds.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Get batches belonging to those inventory items
        const { data, error } = await supabase
            .from("inventory_batches")
            .select(`
                *,
                inventory_items (
                    item_id,
                    item_name
                )
            `)
            .in("item_id", itemIds)
            .order("expiry_date", { ascending: true });

        if (error) {
            throw error;
        }

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory batches.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE BATCH
// GET /api/inventory-batches/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data: batch, error: batchError } = await supabase
            .from("inventory_batches")
            .select(`
                *,
                inventory_items (
                    item_id,
                    item_name,
                    clinic_id
                )
            `)
            .eq("batch_id", req.params.id)
            .single();

        if (batchError || !batch) {
            return res.status(404).json({
                success: false,
                message: "Inventory batch not found."
            });
        }

        if (
            batch.inventory_items?.clinic_id !==
            req.user.clinic_id
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        return res.json({
            success: true,
            data: batch
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory batch.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE BATCH
// POST /api/inventory-batches
// ======================================================
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
                item_id,
                batch_number,
                quantity,
                expiry_date,
                manufacturing_date,
                cost_price
            } = req.body;

            if (
                !item_id ||
                !batch_number ||
                quantity === undefined ||
                !expiry_date
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "item_id, batch_number, quantity and expiry_date are required."
                });
            }

            // Make sure the item belongs to the user's clinic
            const { data: item, error: itemError } = await supabase
                .from("inventory_items")
                .select("item_id")
                .eq("item_id", item_id)
                .eq("clinic_id", req.user.clinic_id)
                .single();

            if (itemError || !item) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory item not found."
                });
            }

            const { data, error } = await supabase
                .from("inventory_batches")
                .insert([{
                    item_id,
                    batch_number,
                    quantity,
                    expiry_date,
                    manufacturing_date: manufacturing_date || null,
                    cost_price: cost_price || null
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.status(201).json({
                success: true,
                message: "Inventory batch created successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to create inventory batch.",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE BATCH
// PUT /api/inventory-batches/:id
// ======================================================
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
            // First check ownership
            const { data: batch, error: batchError } = await supabase
                .from("inventory_batches")
                .select(`
                    batch_id,
                    inventory_items (
                        clinic_id
                    )
                `)
                .eq("batch_id", req.params.id)
                .single();

            if (batchError || !batch) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory batch not found."
                });
            }

            if (
                batch.inventory_items?.clinic_id !==
                req.user.clinic_id
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied."
                });
            }

            const allowedFields = [
                "batch_number",
                "quantity",
                "expiry_date",
                "manufacturing_date",
                "cost_price"
            ];

            const updates = {};

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from("inventory_batches")
                .update(updates)
                .eq("batch_id", req.params.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.json({
                success: true,
                message: "Inventory batch updated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to update inventory batch.",
                error: error.message
            });
        }
    }
);


export default router;