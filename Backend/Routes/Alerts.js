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
        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("clinic_id", req.user.clinic_id)
            .order("created_at", { ascending: false });

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
            message: "Failed to retrieve alerts.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE ALERT
// GET /api/alerts/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("alert_id", req.params.id)
            .eq("clinic_id", req.user.clinic_id)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: "Alert not found."
            });
        }

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve alert.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE ALERT
// POST /api/alerts
// ======================================================
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            alert_type,
            message,
            item_id,
            assigned_to
        } = req.body;

        if (!alert_type || !message) {
            return res.status(400).json({
                success: false,
                message:
                    "alert_type and message are required."
            });
        }

        const { data, error } = await supabase
            .from("alerts")
            .insert([{
                clinic_id: req.user.clinic_id,
                alert_type,
                message,
                item_id: item_id || null,
                assigned_to: assigned_to || null,
                is_resolved: false
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Alert created successfully.",
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to create alert.",
            error: error.message
        });
    }
});


// ======================================================
// RESOLVE ALERT
// PUT /api/alerts/:id
// ======================================================
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("alerts")
            .update({
                is_resolved: true,
                resolved_at: new Date().toISOString()
            })
            .eq("alert_id", req.params.id)
            .eq("clinic_id", req.user.clinic_id)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: "Alert not found."
            });
        }

        return res.json({
            success: true,
            message: "Alert resolved successfully.",
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to resolve alert.",
            error: error.message
        });
    }
});


export default router;