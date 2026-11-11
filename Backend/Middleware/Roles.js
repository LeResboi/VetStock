
// FILE: Middleware/Role.js
// PURPOSE: VetStock Role-Based Access Control

// ======================================================
// ROLE-BASED ACCESS CONTROL
// ======================================================

export function requireRole(...allowedRoles) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRole = req.user.role;

        if (!userRole) {
            return res.status(403).json({
                success: false,
                message: "User role is not assigned."
            });
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}

// ======================================================
// PERMISSION-BASED ACCESS CONTROL
// ======================================================

export function requirePermission(...requiredPermissions) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userPermissions = req.user.permissions || [];

        if (!Array.isArray(userPermissions)) {
            return res.status(403).json({
                success: false,
                message: "Invalid user permissions."
            });
        }

        const hasPermission = requiredPermissions.some(
            permission => userPermissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}
