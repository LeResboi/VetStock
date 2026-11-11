/*
 * FILE: Routes/Alerts.js
 * PURPOSE: Retrieve and manage VetStock notifications.
 */

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";

const router = express.Router();

// ======================================================
// GET ACTIVE ALERTS
// GET /api/alerts
// ======================================================

router.get("/", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("clinic_id", req.user.clinic_id)
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return res.json({
            success: true,
            data: data || []
        });

    } catch (error) {
        console.error("Fetch alerts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve alerts.",
            error: error.message
        });
    }
});

// ======================================================
// MARK ALERT AS READ
// PUT /api/alerts/:id
// ======================================================

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("alerts")
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq("alert_id", req.params.id)
            .eq("clinic_id", req.user.clinic_id)
            .select()
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Alert not found."
            });
        }

        return res.json({
            success: true,
            message: "Alert marked as read.",
            data
        });

    } catch (error) {
        console.error("Mark alert as read error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to mark alert as read.",
            error: error.message
        });
    }
});

// ======================================================
// RESOLVE ALERT
// PATCH /api/alerts/:id/resolve
// ======================================================

router.patch("/:id/resolve", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("alerts")
            .update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
                resolution_notes: req.body.resolution_notes || null
            })
            .eq("alert_id", req.params.id)
            .eq("clinic_id", req.user.clinic_id)
            .eq("status", "active")
            .select()
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Active alert not found."
            });
        }

        return res.json({
            success: true,
            message: "Alert resolved successfully.",
            data
        });

    } catch (error) {
        console.error("Resolve alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to resolve alert.",
            error: error.message
        });
    }
});

export default router;
