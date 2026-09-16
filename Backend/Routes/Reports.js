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
                        cost_price,
                        expiry_date
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
                            Number(
                                batch.cost_price ??
                                item.cost_price ??
                                0
                            );

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
                .order("transaction_date", {
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


export default router;