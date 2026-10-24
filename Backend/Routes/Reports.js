// FILE: Routes/Reports.js
// PURPOSE: Generate VetStock reports

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";

const router = express.Router();


// ======================================================
// INVENTORY SUMMARY
// GET /api/reports/inventory-summary
// ======================================================

router.get(
    "/inventory-summary",
    authenticateToken,
    async (req, res) => {
        try {
            const { data: items, error: itemError } = await supabase
                .from("inventory_items")
                .select(`
                    item_id,
                    item_name,
                    cost_price,
                    reorder_point,
                    max_stock_level,
                    inventory_batches (
                         quantity,
                        expiration_date
                    )
                `)
                .eq("clinic_id", req.user.clinic_id)
                .eq("is_active", true);

            if (itemError) {
                throw itemError;
            }

            const report = items.map(item => {
                const batches = item.inventory_batches || [];

                const totalQuantity = batches.reduce(
                    (total, batch) =>
                        total + Number(batch.quantity || 0),
                    0
                );

                const inventoryValue = batches.reduce(
                    (total, batch) => {
                        const quantity =
                            Number(batch.quantity || 0);

                        const price =
                            Number(item.cost_price || 0);

                        return total + quantity * price;
                    },
                    0
                );

                const isLowStock =
                    item.reorder_point !== null &&
                    totalQuantity <=
                    Number(item.reorder_point);

                return {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    total_quantity: totalQuantity,
                    inventory_value: inventoryValue,
                    reorder_point: item.reorder_point,
                    max_stock_level: item.max_stock_level,
                    low_stock: isLowStock
                };
            });

            return res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to generate inventory summary.",
                error: error.message
            });
        }
    }
);


// ======================================================
// RECENT STOCK TRANSACTIONS
// GET /api/reports/recent-transactions
// ======================================================
router.get(
    "/recent-transactions",
    authenticateToken,
    async (req, res) => {
        try {
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
                .order("created_at", {
                    ascending: false
                })
                .limit(100);

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
                message: "Failed to generate transaction report.",
                error: error.message
            });
        }
    }
);

// ======================================================
// PATIENT HEALTH SUMMARY
// GET /api/reports/health-summary
// ======================================================
router.get(
    "/health-summary",
    authenticateToken,
    async (req, res) => {
        try {
            // Get patients for this clinic
            const { data: patients, error: patientError } = await supabase
                .from("patients")
                .select("patient_id, mrn_number")
                .eq("clinic_id", req.user.clinic_id);

            if (patientError) {
                throw patientError;
            }

            if (!patients || patients.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const patientIds = patients.map(p => p.patient_id);

            // Get health records for those patients
            const { data: records, error } = await supabase
                .from("health_records")
                .select(`
                    record_id,
                    patient_id,
                    diagnosis,
                    symptoms,
                    treatment_notes,
                    notes,
                    record_date
                `)
                .in("patient_id", patientIds)
                .order("record_date", { ascending: false });

            if (error) {
                throw error;
            }

            // Attach MRN
            const mrnMap = new Map(
                patients.map(p => [p.patient_id, p.mrn_number])
            );

            const report = records.map(r => ({
                record_id: r.record_id,
                patient_id: r.patient_id,
                mrn_number: mrnMap.get(r.patient_id) || null,
                diagnosis: r.diagnosis,
                symptoms: r.symptoms,
                treatment_notes: r.treatment_notes,
                notes: r.notes,
                record_date: r.record_date
            }));

            return res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to generate health summary.",
                error: error.message
            });
        }
    }
);


// ======================================================
// EXPIRY REPORT
// GET /api/reports/expiring?days=90
// ======================================================
router.get(
    "/expiring",
    authenticateToken,
    async (req, res) => {
        try {
            const days = Number(req.query.days) || 90;

            const today = new Date();
            const limit = new Date();
            limit.setDate(today.getDate() + days);

            const todayStr = today.toISOString().split("T")[0];
            const limitStr = limit.toISOString().split("T")[0];

            // Get clinic inventory items first
            const { data: items, error: itemsError } = await supabase
                .from("inventory_items")
                .select("item_id, item_name, category")
                .eq("clinic_id", req.user.clinic_id);

            if (itemsError) {
                throw itemsError;
            }

            const itemIds = items.map(i => i.item_id);

            if (itemIds.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const { data: batches, error: batchError } = await supabase
                .from("inventory_batches")
                .select(`
                    batch_id,
                    item_id,
                    batch_number,
                    quantity,
                    expiration_date
                `)
                .in("item_id", itemIds)
                .gte("expiration_date", todayStr)
                .lte("expiration_date", limitStr)
                .order("expiration_date", { ascending: true });

            if (batchError) {
                throw batchError;
            }

            const itemMap = new Map(
                items.map(i => [i.item_id, i])
            );

            const report = batches.map(b => ({
                batch_id: b.batch_id,
                item_id: b.item_id,
                item_name: itemMap.get(b.item_id)?.item_name || null,
                category: itemMap.get(b.item_id)?.category || null,
                batch_number: b.batch_number,
                quantity: b.quantity,
                expiration_date: b.expiration_date
            }));

            return res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to generate expiry report.",
                error: error.message
            });
        }
    }
);


export default router;