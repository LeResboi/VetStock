// FILE: Middleware/Authentication.js
// PURPOSE: Verify VetStock JWT authentication,
// account status, and retrieve current RBAC permissions.

import jwt from "jsonwebtoken";
import { supabase } from "../VetStockDatabase/Supabase.js";

export async function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authorization token is required."
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format."
        });
    }

    try {

        // ====================================================
        // 1. VERIFY JWT
        // ====================================================

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // ====================================================
        // 2. GET CURRENT USER INFORMATION
        // ====================================================

        const { data: user, error: userError } = await supabase
            .from("users")
            .select(`
                user_id,
                email,
                first_name,
                last_name,
                clinic_id,
                role_id,
                is_active,
                roles (
                    role_name
                )
            `)
            .eq("user_id", decoded.user_id)
            .maybeSingle();

        if (userError) {
            console.error(
                "Authentication database error:",
                userError.message
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify account status."
            });
        }

        // ====================================================
        // 3. CHECK IF USER ACCOUNT EXISTS
        // ====================================================

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        // ====================================================
        // 4. CHECK ACCOUNT STATUS
        // ====================================================

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact your Administrator."
            });
        }

        // ====================================================
        // 5. CHECK USER ROLE
        // ====================================================

        if (!user.role_id || !user.roles?.role_name) {
            return res.status(403).json({
                success: false,
                message: "User role is not assigned."
            });
        }

        // ====================================================
        // 6. RETRIEVE CURRENT ROLE PERMISSIONS FROM SUPABASE
        // ====================================================

        const { data: permissionAssignments, error: permissionError } =
            await supabase
                .from("role_permissions")
                .select(`
                    permissions (
                        permission_key
                    )
                `)
                .eq("role_id", user.role_id);

        if (permissionError) {
            console.error(
                "Permission retrieval error:",
                permissionError.message
            );

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve user permissions."
            });
        }

        // ====================================================
        // 7. EXTRACT PERMISSION NAMES
        // ====================================================

        const permissions = [
            ...new Set(
                (permissionAssignments || [])
                    .map(
                        assignment =>
                            assignment.permissions?.permission_key
                    )
                    .filter(Boolean)
            )
        ];

        // ====================================================
        // 8. ATTACH CURRENT USER AND PERMISSIONS
        // ====================================================

        req.user = {
            ...decoded,

            // Always use current database information
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            clinic_id: user.clinic_id,
            role_id: user.role_id,
            role: user.roles.role_name,

            // Current permissions from Supabase
            permissions
        };

        // ====================================================
        // 9. CONTINUE TO THE REQUESTED ROUTE
        // ====================================================

        next();

    } catch (error) {

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
}
