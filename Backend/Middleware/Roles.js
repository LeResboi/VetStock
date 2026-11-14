
// FILE: Middleware/Roles.js
// PURPOSE: VetStock Role-Based Access Control

// ======================================================
// 1. ROLE-BASED ACCESS CONTROL
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
// 2. PERMISSION-BASED ACCESS CONTROL
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


// ======================================================
// 3. PERMISSION CHECK WITH TEMPORARY LEGACY ROLE SUPPORT
// PURPOSE: Gradually migrate VetStock roles to RBAC
// ======================================================

export function requirePermissionOrLegacyRoles(
    permission,
    ...legacyRoles
) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userPermissions = req.user.permissions || [];

        const hasPermission =
            Array.isArray(userPermissions) &&
            userPermissions.includes(permission);

        const hasLegacyRole = legacyRoles.includes(req.user.role);

        if (!hasPermission && !hasLegacyRole) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}
