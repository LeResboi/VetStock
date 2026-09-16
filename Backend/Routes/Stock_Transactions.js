// FILE: Routes/StockTransactions.js
// PURPOSE: Record inventory stock transactions

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";

const router = express.Router();


// ======================================================
// GET ALL STOCK TRANSACTIONS
// GET /api/stock-transactions
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Get inventory items for the user's clinic
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

        const { data, error } = await supabase
            .from("stock_transactions")
            .select(`
                *,
                inventory_items (
                    item_name
                )
            `)
            .in("item_id", itemIds)
            .order("transaction_date", { ascending: false });

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
            message: "Failed to retrieve stock transactions.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE STOCK TRANSACTION
// GET /api/stock-transactions/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data: transaction, error } = await supabase
            .from("stock_transactions")
            .select(`
                *,
                inventory_items (
                    item_name,
                    clinic_id
                )
            `)
            .eq("transaction_id", req.params.id)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: "Stock transaction not found."
            });
        }

        if (
            transaction.inventory_items?.clinic_id !==
            req.user.clinic_id
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        return res.json({
            success: true,
            data: transaction
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve stock transaction.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE STOCK TRANSACTION
// POST /api/stock-transactions
// ======================================================
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            item_id,
            batch_id,
            transaction_type,
            quantity,
            patient_id,
            prescription_id,
            notes
        } = req.body;

        if (
            !item_id ||
            !transaction_type ||
            quantity === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "item_id, transaction_type and quantity are required."
            });
        }

        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than zero."
            });
        }

        const allowedTypes = [
            "IN",
            "OUT",
            "ADJUSTMENT"
        ];

        if (!allowedTypes.includes(transaction_type)) {
            return res.status(400).json({
                success: false,
                message:
                    "transaction_type must be IN, OUT, or ADJUSTMENT."
            });
        }

        // Make sure item belongs to user's clinic
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
            .from("stock_transactions")
            .insert([{
                item_id,
                batch_id: batch_id || null,
                user_id: req.user.user_id,
                patient_id: patient_id || null,
                prescription_id: prescription_id || null,
                transaction_type,
                quantity,
                notes: notes || null,
                transaction_date: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Stock transaction recorded successfully.",
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to record stock transaction.",
            error: error.message
        });
    }
});


export default router;