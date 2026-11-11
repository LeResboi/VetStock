// FILE: Routes/Audit_Logs.js
// PURPOSE: For auditing and tracking user actions in VetStock

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

// GET AUDIT LOGS - ADMINISTRATOR ONLY
router.get(
    "/",
    authenticateToken,
    requireRole("Administrator"),
    async (req, res) => {
        try {
            const clinicId = req.user.clinic_id;

            if (!clinicId) {
                return res.status(400).json({
                    success: false,
                    message: "Clinic ID not found."
                });
            }

            // Get users belonging to the administrator's clinic
            const { data: users, error: userError } = await supabase
                .from("users")
                .select(`
        user_id,
        first_name,
        last_name,
        email,
        clinic_id,
        roles (
            role_name
        )
    `)
                .eq("clinic_id", clinicId);

            if (userError) {
                throw userError;
            }



            // Get existing audit logs created by users in the same clinic
            const { data: userLogs, error: userLogsError } = await supabase
                .from("audit_logs")
                .select(`
        log_id,
        user_id,
        action,
        target_id,
        target_table,
        details,
        ip_address,
        user_agent,
        created_at
    `)
                .in("user_id", users.map(user => user.user_id));

            if (userLogsError) {
                throw userLogsError;
            }

            // Get registration request logs belonging to the same clinic
            const { data: clinicLogs, error: clinicLogsError } = await supabase
                .from("audit_logs")
                .select(`
                    log_id,
                    user_id,
                    action,
                    target_id,
                    target_table,
                    details,
                    ip_address,
                    user_agent,
                    created_at
    `)
                .eq("clinic_id", clinicId);

            if (clinicLogsError) {
                throw clinicLogsError;
            }

            // Combine both results without duplicate log entries
            const logsMap = new Map();

            [...(userLogs || []), ...(clinicLogs || [])].forEach(log => {
                logsMap.set(log.log_id, log);
            });

            const logs = Array.from(logsMap.values()).sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );


            // Match each log with its user information
            const userMap = new Map(
                users.map(user => [user.user_id, user])
            );

            const formattedLogs = logs.map(log => {
                const user = userMap.get(log.user_id);

                const fullName = [
                    user?.first_name,
                    user?.last_name
                ].filter(Boolean).join(" ");

                const registrationName = log.details?.description?.replace(
                    "Registration request from ",
                    ""
                );

                return {
                    ...log,

                    username:   
                        fullName ||
                        registrationName ||
                        log.details?.email ||
                        user?.email ||
                        "Unknown User",

                    role:
                        user?.roles?.role_name ||
                        log.details?.requested_role ||
                        "Unknown Role",

                    action_description:
                        log.details?.description ||
                        log.action.replaceAll("_", " ")
                };
            });

            // RETURN AUDIT LOGS
            return res.json({
                success: true,
                count: formattedLogs.length,
                data: formattedLogs
            });

        } catch (error) {
            console.error("Audit Logs Error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve audit logs."
            });
        }
    }
);

export default router;
