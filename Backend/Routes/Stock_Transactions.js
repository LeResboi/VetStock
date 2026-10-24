// FILE: Routes/StockTransactions.js
// PURPOSE: Record inventory stock transactions

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();


// ======================================================
// GET ALL STOCK TRANSACTIONS
// GET /api/stock-transactions
// ======================================================
router.get(
    "/batches",
    authenticateToken,
    requireRole(
        "Administrator",
        "Inventory Staff",
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const { data: items, error: itemError } =
                await supabase
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
                .from("inventory_batches")
                .select(`
                    batch_id,
                    item_id,
                    batch_number,
                    quantity,
                    expiration_date,
                    is_active
                `)
                .in("item_id", itemIds)
                .eq("is_active", true)
                .order("expiration_date", {
                    ascending: true
                });

            if (error) {
                throw error;
            }

            return res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error("Load transaction batches error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to load inventory batches.",
                error: error.message
            });
        }
    }
);


// ======================================================
// GET ONE STOCK TRANSACTION
// GET /api/stock-transactions/:id
// ======================================================
router.get(
    "/:id",
    authenticateToken,
    requireRole("Administrator", "Inventory Staff"),
    async (req, res) => {
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
router.post(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Inventory Staff",
        "Veterinarian"
    ),

    async (req, res) => {
        try {
            const {
                item_id,
                batch_id,
                transaction_type,
                quantity,
                patient_id,
                prescription_id,
                reason
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

            // 2. Validate quantity
            const parsedQuantity = Number(quantity);

            if (
                !Number.isInteger(parsedQuantity) ||
                parsedQuantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a positive whole number."
                });
            }

            // 3. Continue with your existing allowedTypes validation
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

            if (
                req.user.role === "Veterinarian" &&
                transaction_type !== "OUT"
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Veterinarians can only record OUT transactions."
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

            let data;
            let error;

            if (transaction_type === "OUT") {

                if (!batch_id) {
                    return res.status(400).json({
                        success: false,
                        message: "Please select a batch for Stock Out."
                    });
                }

                const result = await supabase.rpc("dispense_medicine", {
                    p_item_id: item_id,
                    p_batch_id: batch_id,
                    p_quantity: parsedQuantity,
                    p_user_id: req.user.user_id,
                    p_patient_id: patient_id || null,
                    p_prescription_id: prescription_id || null,
                    p_reason: reason || null,
                    p_clinic_id: req.user.clinic_id
                });

                data = result.data;
                error = result.error;

                // ==========================================
                // STOCK IN
                // ==========================================
            } else if (transaction_type === "IN") {

                if (!batch_id) {
                    return res.status(400).json({
                        success: false,
                        message: "Please select a batch for Stock In."
                    });
                }

                const result = await supabase.rpc("receive_medicine", {
                    p_item_id: item_id,
                    p_batch_id: batch_id,
                    p_quantity: parsedQuantity,
                    p_user_id: req.user.user_id,
                    p_reason: reason || null,
                    p_clinic_id: req.user.clinic_id
                });

                data = result.data;
                error = result.error;

                // ==========================================
                // ADJUSTMENT — keep existing behavior
                // ==========================================
            } else {

                const result = await supabase
                    .from("stock_transactions")
                    .insert([{
                        item_id,
                        batch_id: batch_id || null,
                        user_id: req.user.user_id,
                        patient_id: patient_id || null,
                        prescription_id: prescription_id || null,
                        transaction_type,
                        quantity: parsedQuantity,
                        reason: reason || null
                    }])
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) {
                console.error("Stock transaction error:", error);

                if (error.message.includes("Insufficient stock")) {
                    return res.status(400).json({
                        success: false,
                        message: "Insufficient stock in the selected batch."
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Failed to record stock transaction.",
                    error: error.message
                });
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

// ======================================================
// GET ALL STOCK TRANSACTIONS
// GET /api/stock-transactions
// ======================================================
router.get(
    "/",
    authenticateToken,
    requireRole("Administrator", "Inventory Staff"),
    async (req, res) => {
        try {
            const { data: items, error: itemError } =
                await supabase
                    .from("inventory_items")
                    .select("item_id")
                    .eq("clinic_id", req.user.clinic_id);

            if (itemError) throw itemError;

            const itemIds = items.map(item => item.item_id);

            if (itemIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            const { data, error } = await supabase
                .from("stock_transactions")
                .select(`
                    *,
                    inventory_items (item_name),
                    users (first_name, last_name)
                `)
                .in("item_id", itemIds)
                .order("created_at", { ascending: true });

            if (error) throw error;

            return res.json({ success: true, data });

        } catch (error) {
            console.error("Load transactions error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve stock transactions.",
                error: error.message
            });
        }
    }
);

export default router;