// FILE: Routes/AuditLogs.js
// PURPOSE: Manage system audit logs

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();


// ======================================================
// GET AUDIT LOGS
// GET /api/audit-logs
// ======================================================
router.get(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager"
    ),
    async (req, res) => {
        try {
            // Get users belonging to this clinic
            const { data: users, error: userError } = await supabase
                .from("users")
                .select("user_id")
                .eq("clinic_id", req.user.clinic_id);

            if (userError) {
                throw userError;
            }

            const userIds = users.map(user => user.user_id);

            if (userIds.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .in("user_id", userIds)
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
                message: "Failed to retrieve audit logs.",
                error: error.message
            });
        }
    }
);


// ======================================================
// CREATE AUDIT LOG
// POST /api/audit-logs
// ======================================================
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            action,
            table_name,
            record_id,
            description
        } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                message: "action is required."
            });
        }

        const { data, error } = await supabase
            .from("audit_logs")
            .insert([{
                user_id: req.user.user_id,
                action,
                table_name: table_name || null,
                record_id: record_id || null,
                description: description || null
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Audit log created successfully.",
            data
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to create audit log.",
            error: error.message
        });
    }
});


export default router;