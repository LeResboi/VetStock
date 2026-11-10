// FILE: Routes/StockTransactions.js
// PURPOSE: Record inventory stock transactions

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";
import { createAuditLog } from "../Utils/AuditLogger.js";

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

            // =====================================================
            // GET TODAY'S DATE USING PHILIPPINES TIMEZONE
            // =====================================================

            const dateParts = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date());

            const today = `${dateParts.find(p => p.type === "year").value}-${dateParts.find(p => p.type === "month").value}-${dateParts.find(p => p.type === "day").value}`;


            // =====================================================
            // GET ACTIVE AND NON-EXPIRED BATCHES
            // =====================================================

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
                .or(`expiration_date.is.null,expiration_date.gte.${today}`)
                .order("expiration_date", {
                    ascending: true,
                    nullsFirst: false
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
                    ),
                    users (
                        first_name,
                        last_name
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
                reason,
                receipt_method,
                batch_number,
                expiration_date
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
                .select("item_id, item_name")
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

                // Support the two receiving methods.
                // Older frontend requests with batch_id
                // will continue using EXISTING_BATCH.

                const receivingMethod =
                    receipt_method ||
                    (batch_id ? "EXISTING_BATCH" : null);


                // ==========================================
                // OPTION 1: CREATE NEW BATCH
                // ==========================================

                if (receivingMethod === "NEW_BATCH") {

                    if (
                        typeof batch_number !== "string" ||
                        !batch_number.trim()
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Batch number is required for a new batch."
                        });
                    }

                    const result = await supabase.rpc(
                        "receive_new_batch",
                        {
                            p_item_id: item_id,
                            p_batch_number: batch_number.trim(),
                            p_expiration_date: expiration_date || null,
                            p_quantity: parsedQuantity,
                            p_user_id: req.user.user_id,
                            p_reason: reason || null,
                            p_clinic_id: req.user.clinic_id
                        }
                    );

                    data = result.data;
                    error = result.error;


                    // ==========================================
                    // OPTION 2: ADD TO EXISTING BATCH
                    // ==========================================

                } else if (receivingMethod === "EXISTING_BATCH") {

                    if (!batch_id) {
                        return res.status(400).json({
                            success: false,
                            message: "Please select an existing batch."
                        });
                    }

                    const result = await supabase.rpc(
                        "receive_medicine",
                        {
                            p_item_id: item_id,
                            p_batch_id: batch_id,
                            p_quantity: parsedQuantity,
                            p_user_id: req.user.user_id,
                            p_reason: reason || null,
                            p_clinic_id: req.user.clinic_id
                        }
                    );

                    data = result.data;
                    error = result.error;


                } else {

                    return res.status(400).json({
                        success: false,
                        message: "Please select a valid stock receiving method."
                    });

                }

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

                
                const errorMessage =
                    error.message || "Unknown database error.";

                // Handle duplicate batch numbers
                if (
                    errorMessage.toLowerCase().includes(
                        "batch number already exists"
                    )
                ) {
                    return res.status(409).json({
                        success: false,
                        message: "This batch number already exists for this medicine. Please select Add to Existing Batch instead."
                    });
                }

                // Handle expired medicine
                if (
                    errorMessage.toLowerCase().includes("expired medicine")
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "This medicine batch has expired and cannot be dispensed."
                    });
                }

                // Handle insufficient stock
                if (
                    errorMessage.toLowerCase().includes("insufficient stock")
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Insufficient stock in the selected batch."
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Failed to record stock transaction.",
                    error: errorMessage
                });
            }

            // ==========================================
            // CREATE AUDIT LOG
            // ==========================================

            const auditAction =
                transaction_type === "IN"
                    ? "STOCK_IN"
                    : transaction_type === "OUT"
                        ? "STOCK_OUT"
                        : "STOCK_ADJUSTMENT";

            await createAuditLog(req, {
                action: auditAction,
                targetTable: "inventory_items",
                targetId: item.item_id,
                details: {
                    description:
                        `${auditAction.replace("_", " ")}: ${parsedQuantity} units of ${item.item_name}`,

                    item_id: item.item_id,
                    item_name: item.item_name,

                    batch_id: batch_id || null,
                    batch_number: batch_number || null,

                    transaction_type,
                    quantity: parsedQuantity,

                    patient_id: patient_id || null,
                    prescription_id: prescription_id || null,

                    reason: reason || null,
                    receipt_method: receipt_method || null
                }
            });

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