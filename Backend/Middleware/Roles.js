// FILE: middleware/role.js
// PURPOSE: VetStock Role-Based Access Control

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
                message:
                    "You do not have permission to perform this action."
            });
        }

        next();
    };
}