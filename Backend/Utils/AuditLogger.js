
// FILE: Utils/AuditLogger.js
// PURPOSE: Log user actions for auditing purposes
import { supabase } from "../VetStockDatabase/Supabase.js";

export async function createAuditLog(
    req,
    {
        userId = null,
        clinicId = null,
        action,
        targetTable = null,
        targetId = null,
        details = null,
        throwOnError = false
    }
) {
    try {
        const { error } = await supabase
            .from("audit_logs")
            .insert({
                user_id: userId || req.user?.user_id || null,
                clinic_id: clinicId || req.user?.clinic_id || null,
                action,
                target_id: targetId,
                target_table: targetTable,
                details,
                ip_address: req.ip || null,
                user_agent: req.get("user-agent") || null
            });

        if (error) {
            console.error(
                "Failed to create audit log:",
                error.message
            );

            if (throwOnError) {
                throw error;
            }
        }

    } catch (error) {
        console.error(
            "Audit logger error:",
            error.message
        );

        if (throwOnError) {
            throw error;
        }
    }
}