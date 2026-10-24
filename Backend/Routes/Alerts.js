// FILE: Routes/Alerts.js
// PURPOSE: Manage VetStock alerts

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";

const router = express.Router();


// ======================================================
// GET ALL ALERTS
// GET /api/alerts
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {

        // ==================================================
        // DATE SETTINGS
        // ==================================================

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date(today);

        thirtyDaysFromNow.setDate(
            thirtyDaysFromNow.getDate() + 30
        );


        // ==================================================
        // GET INVENTORY
        // ==================================================

        const { data: inventory, error: inventoryError } =
            await supabase
                .from("inventory_items")
                .select(`
                    item_id,
                    item_name,
                    min_stock_level,
                    inventory_batches (
                        quantity,
                        expiration_date
                    )
                `)
                .eq(
                    "clinic_id",
                    req.user.clinic_id
                );

        if (inventoryError) {
            throw inventoryError;
        }


        // ==================================================
        // GET EXISTING ACTIVE ALERTS
        // ==================================================

        const { data: existingAlerts, error: alertError } =
            await supabase
                .from("alerts")
                .select(`
                    alert_id,
                    item_id,
                    alert_type,
                    status
                `)
                .eq(
                    "clinic_id",
                    req.user.clinic_id
                )
                .eq(
                    "status",
                    "active"
                );

        if (alertError) {
            throw alertError;
        }


        // ==================================================
        // CHECK EACH INVENTORY ITEM
        // ==================================================

        for (const item of inventory) {

            // ==============================================
            // TOTAL STOCK
            // ==============================================

            const totalQuantity =
                item.inventory_batches?.reduce(
                    (total, batch) =>
                        total + (Number(batch.quantity) || 0),
                    0
                ) || 0;


            const minimumStock =
                Number(item.min_stock_level) || 0;


            // ==============================================
            // LOW STOCK ALERT
            // ==============================================

            const existingLowStockAlert =
                existingAlerts.find(
                    (alert) =>
                        alert.item_id === item.item_id &&
                        alert.alert_type === "LOW_STOCK"
                );


            // DEBUG: CHECK LOW STOCK VALUES

            console.log(
                "LOW STOCK CHECK:",
                item.item_name,
                "Quantity:",
                totalQuantity,
                "Minimum:",
                minimumStock
            );


            if (totalQuantity <= minimumStock) {

                const message =
                    `${item.item_name} has low quantity: ` +
                    `${totalQuantity} remaining. ` +
                    `Minimum is ${minimumStock}.`;


                // ==========================================
                // UPDATE EXISTING LOW STOCK ALERT
                // ==========================================

                if (existingLowStockAlert) {

                    const {
                        error: updateLowStockError
                    } = await supabase
                        .from("alerts")
                        .update({
                            message,
                            current_stock: totalQuantity,
                            threshold: minimumStock,
                            severity:
                                totalQuantity === 0
                                    ? "high"
                                    : "medium",
                            status: "active"
                        })
                        .eq(
                            "alert_id",
                            existingLowStockAlert.alert_id
                        );


                    if (updateLowStockError) {
                        throw updateLowStockError;
                    }


                // ==========================================
                // CREATE NEW LOW STOCK ALERT
                // ==========================================

                } else {

                    const {
                        error: lowStockError
                    } = await supabase
                        .from("alerts")
                        .insert([{
                            clinic_id:
                                req.user.clinic_id,

                            item_id:
                                item.item_id,

                            alert_type:
                                "LOW_STOCK",

                            severity:
                                totalQuantity === 0
                                    ? "high"
                                    : "medium",

                            message,

                            current_stock:
                                totalQuantity,

                            threshold:
                                minimumStock,

                            status:
                                "active"
                        }]);


                    if (lowStockError) {
                        throw lowStockError;
                    }
                }


            // ==============================================
            // STOCK IS NO LONGER LOW
            // ==============================================

            } else if (existingLowStockAlert) {

                const {
                    error: resolveLowStockError
                } = await supabase
                    .from("alerts")
                    .update({
                        status: "resolved",
                        resolved_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "alert_id",
                        existingLowStockAlert.alert_id
                    );


                if (resolveLowStockError) {
                    throw resolveLowStockError;
                }
            }


            // ==================================================
            // FIND NEAREST EXPIRATION DATE
            // ==================================================

            const expirationDates =
                item.inventory_batches
                    ?.filter(
                        (batch) =>
                            batch.expiration_date
                    )
                    .map(
                        (batch) =>
                            new Date(
                                `${batch.expiration_date}T00:00:00`
                            )
                    ) || [];


            if (expirationDates.length > 0) {

                const nearestExpiration =
                    new Date(
                        Math.min(
                            ...expirationDates.map(
                                (date) =>
                                    date.getTime()
                            )
                        )
                    );


                const existingExpirationAlert =
                    existingAlerts.find(
                        (alert) =>
                            alert.item_id ===
                                item.item_id &&
                            alert.alert_type ===
                                "EXPIRATION"
                    );


                // ==========================================
                // EXPIRATION WITHIN 30 DAYS
                // ==========================================

                if (
                    nearestExpiration <=
                    thirtyDaysFromNow
                ) {

                    const formattedDate =
                        nearestExpiration.toLocaleDateString(
                            "en-US",
                            {
                                month: "long",
                                day: "numeric",
                                year: "numeric"
                            }
                        );


                    let message;
                    let severity;


                    // ======================================
                    // EXPIRED
                    // ======================================

                    if (
                        nearestExpiration <= today
                    ) {

                        message =
                            `${item.item_name} expired on ` +
                            `${formattedDate}.`;

                        severity = "high";


                    } else {

                        const daysLeft =
                            Math.ceil(
                                (
                                    nearestExpiration -
                                    today
                                ) /
                                (1000 * 60 * 60 * 24)
                            );


                        // ==================================
                        // WITHIN 7 DAYS
                        // ==================================

                        if (daysLeft <= 7) {

                            message =
                                `${item.item_name} expires ` +
                                `in ${daysLeft} day` +
                                `${daysLeft === 1 ? "" : "s"} ` +
                                `on ${formattedDate}.`;

                            severity = "high";


                        // ==================================
                        // WITHIN 30 DAYS
                        // ==================================

                        } else {

                            message =
                                `${item.item_name} expires ` +
                                `on ${formattedDate}.`;

                            severity = "medium";
                        }
                    }


                    // ======================================
                    // UPDATE EXISTING EXPIRATION ALERT
                    // ======================================

                    if (existingExpirationAlert) {

                        const {
                            error: updateExpirationError
                        } = await supabase
                            .from("alerts")
                            .update({
                                message,
                                severity,
                                status: "active"
                            })
                            .eq(
                                "alert_id",
                                existingExpirationAlert.alert_id
                            );


                        if (updateExpirationError) {
                            throw updateExpirationError;
                        }


                    // ======================================
                    // CREATE NEW EXPIRATION ALERT
                    // ======================================

                    } else {

                        const {
                            error: expirationError
                        } = await supabase
                            .from("alerts")
                            .insert([{
                                clinic_id:
                                    req.user.clinic_id,

                                item_id:
                                    item.item_id,

                                alert_type:
                                    "EXPIRATION",

                                severity,

                                message,

                                status:
                                    "active"
                            }]);


                        if (expirationError) {
                            throw expirationError;
                        }
                    }


                // ==========================================
                // NO LONGER WITHIN 30 DAYS
                // ==========================================

                } else if (
                    existingExpirationAlert
                ) {

                    const {
                        error: resolveExpirationError
                    } = await supabase
                        .from("alerts")
                        .update({
                            status: "resolved",
                            resolved_at:
                                new Date().toISOString()
                        })
                        .eq(
                            "alert_id",
                            existingExpirationAlert.alert_id
                        );


                    if (resolveExpirationError) {
                        throw resolveExpirationError;
                    }
                }
            }
        }


        // ==================================================
        // GET ACTIVE ALERTS
        // ==================================================

        const { data, error } =
            await supabase
                .from("alerts")
                .select("*")
                .eq(
                    "clinic_id",
                    req.user.clinic_id
                )
                .eq(
                    "status",
                    "active"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }


        return res.json({
            success: true,
            data
        });


    } catch (error) {

        console.error(
            "Alert error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to retrieve alerts.",
            error:
                error.message
        });
    }
});


// ======================================================
// RESOLVE ALERT
// PUT /api/alerts/:id
// ======================================================
router.put(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const { data, error } =
                await supabase
                    .from("alerts")
                    .update({
                        status: "resolved",
                        resolved_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "alert_id",
                        req.params.id
                    )
                    .eq(
                        "clinic_id",
                        req.user.clinic_id
                    )
                    .select()
                    .single();


            if (error || !data) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Alert not found."
                });
            }


            return res.json({
                success: true,
                message:
                    "Alert resolved successfully.",
                data
            });


        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message:
                    "Failed to resolve alert.",
                error:
                    error.message
            });
        }
    }
);


export default router;