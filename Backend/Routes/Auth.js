// FILE: routes/Auth.js
// PURPOSE: VetStock authentication endpoints

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { supabase } from "../VetStockDatabase/Supabase.js";
import { createAuditLog } from "../Utils/AuditLogger.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

// ============================================================
// GET USERS - ADMINISTRATOR ONLY
// ============================================================

router.get(
    "/users",
    authenticateToken,
    requireRole("Administrator"),
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select(`
                    user_id,
                    first_name,
                    last_name,
                    email,
                    is_active,
                    created_at,
                    roles (
                        role_name
                    )
                `)
                .eq("clinic_id", req.user.clinic_id)
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            return res.json({
                success: true,
                count: data.length,
                data
            });

        } catch (error) {
            console.error("Get users error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve users."
            });
        }
    }
);

// ============================================================
// GET PENDING REGISTRATION REQUESTS
// ADMINISTRATOR ONLY
// ============================================================

router.get(
    "/registration-requests",
    authenticateToken,
    requireRole("Administrator"),
    async (req, res) => {
        try {
            const { data: requests, error } = await supabase
                .from("user_registration_requests")
                .select(`
                    request_id,
                    clinic_id,
                    first_name,
                    last_name,
                    email,
                    requested_role_id,
                    status,
                    created_at
                `)
                .eq("clinic_id", req.user.clinic_id)
                .eq("status", "PENDING")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Retrieve the requested role names
            const roleIds = [
                ...new Set(requests.map(request => request.requested_role_id))
            ];

            let roles = [];

            if (roleIds.length > 0) {
                const { data: roleData, error: roleError } =
                    await supabase
                        .from("roles")
                        .select("role_id, role_name")
                        .in("role_id", roleIds);

                if (roleError) throw roleError;

                roles = roleData || [];
            }

            const roleMap = new Map(
                roles.map(role => [role.role_id, role.role_name])
            );

            const formattedRequests = requests.map(request => ({
                ...request,
                requested_role: {
                    role_name:
                        roleMap.get(request.requested_role_id) || "Unknown"
                }
            }));

            return res.json({
                success: true,
                count: formattedRequests.length,
                data: formattedRequests
            });

        } catch (error) {
            console.error("Get registration requests error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve registration requests."
            });
        }
    }
);

// ============================================================
// APPROVE REGISTRATION REQUEST
// ADMINISTRATOR ONLY
// ============================================================

router.post(
    "/registration-requests/:requestId/approve",
    authenticateToken,
    requireRole("Administrator"),
    async (req, res) => {
        try {
            const { requestId } = req.params;

            const approvedRole =
                typeof req.body.approved_role === "string"
                    ? req.body.approved_role.trim()
                    : "";

            const allowedRoles = [
                "Administrator",
                "Clinic Manager",
                "Inventory Staff",
                "Veterinarian"
            ];

            if (!allowedRoles.includes(approvedRole)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assigned role."
                });
            }

            // Find the pending request in this Administrator's clinic
            const { data: request, error: requestError } =
                await supabase
                    .from("user_registration_requests")
                    .select(`
                        request_id,
                        clinic_id,
                        first_name,
                        last_name,
                        email,
                        status
                    `)
                    .eq("request_id", requestId)
                    .eq("clinic_id", req.user.clinic_id)
                    .eq("status", "PENDING")
                    .maybeSingle();

            if (requestError) throw requestError;

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: "Pending registration request not found."
                });
            }

            // Find the final assigned role
            const { data: roleData, error: roleError } =
                await supabase
                    .from("roles")
                    .select("role_id, role_name")
                    .eq("role_name", approvedRole)
                    .single();

            if (roleError || !roleData) {
                return res.status(400).json({
                    success: false,
                    message: "Selected role was not found."
                });
            }

            // Create the account and approve the request atomically
            const { data: newUserId, error: approvalError } =
                await supabase.rpc(
                    "approve_user_registration_request",
                    {
                        p_request_id: request.request_id,
                        p_approved_role_id: roleData.role_id,
                        p_reviewed_by: req.user.user_id
                    }
                );

            if (approvalError) {
                console.error("Approval error:", approvalError);

                return res.status(400).json({
                    success: false,
                    message: approvalError.message
                });
            }

            // Record the Administrator who approved the request
            await createAuditLog(req, {
                action: "USER_APPROVED",
                targetTable: "users",
                targetId: newUserId,
                details: {
                    description:
                        `Approved account for ${request.first_name} ${request.last_name}`,
                    request_id: request.request_id,
                    email: request.email,
                    assigned_role: roleData.role_name
                }
            });

            return res.json({
                success: true,
                message: "Registration request approved successfully.",
                user_id: newUserId
            });

        } catch (error) {
            console.error("Approve request error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to approve registration request."
            });
        }
    }
);

// ============================================================
// SUBMIT REGISTRATION REQUEST
// PUBLIC - ACCOUNT REQUIRES ADMINISTRATOR APPROVAL
// ============================================================

router.post("/register", async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            last_name,
            role
        } = req.body;

        // ----------------------------------------------------
        // VALIDATE INPUT
        // ----------------------------------------------------

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";

        const firstName =
            typeof first_name === "string" ? first_name.trim() : "";

        const lastName =
            typeof last_name === "string" ? last_name.trim() : "";

        const requestedRole =
            typeof role === "string" ? role.trim() : "";

        if (
            !normalizedEmail ||
            !password ||
            !firstName ||
            !lastName ||
            !requestedRole
        ) {
            return res.status(400).json({
                success: false,
                message: "All registration fields are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

        // ----------------------------------------------------
        // VALIDATE REQUESTED ROLE
        // Applicants cannot request Administrator access.
        // The Administrator assigns the final role on approval.
        // ----------------------------------------------------

        const allowedRequestedRoles = [
            "Clinic Manager",
            "Inventory Staff",
            "Administrator",
            "Veterinarian"
        ];

        if (!allowedRequestedRoles.includes(requestedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid requested role."
            });
        }

        // ----------------------------------------------------
        // CHECK IF EMAIL ALREADY HAS AN ACCOUNT
        // ----------------------------------------------------

        const { data: existingUser, error: userError } =
            await supabase
                .from("users")
                .select("user_id")
                .ilike("email", normalizedEmail)
                .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email already has a VetStock account."
            });
        }

        // ----------------------------------------------------
        // CHECK EXISTING PENDING REQUEST
        // ----------------------------------------------------

        const { data: existingRequest, error: requestError } =
            await supabase
                .from("user_registration_requests")
                .select("request_id")
                .ilike("email", normalizedEmail)
                .eq("status", "PENDING")
                .maybeSingle();

        if (requestError) {
            throw requestError;
        }

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                message: "A registration request for this email is already pending."
            });
        }

        // ----------------------------------------------------
        // FIND REQUESTED ROLE
        // ----------------------------------------------------

        const { data: roleData, error: roleError } =
            await supabase
                .from("roles")
                .select("role_id")
                .eq("role_name", requestedRole)
                .single();

        if (roleError || !roleData) {
            return res.status(400).json({
                success: false,
                message: "The selected role was not found."
            });
        }

        // ----------------------------------------------------
        // FIND ACTIVE CLINIC
        // This follows your existing single-clinic setup.
        // ----------------------------------------------------

        const { data: clinic, error: clinicError } =
            await supabase
                .from("clinics")
                .select("clinic_id")
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

        if (clinicError || !clinic) {
            console.error("Clinic lookup error:", clinicError);

            return res.status(400).json({
                success: false,
                message: "No active clinic is configured."
            });
        }

        // ----------------------------------------------------
        // HASH PASSWORD
        // ----------------------------------------------------

        const passwordHash = await bcrypt.hash(password, 12);

        // ----------------------------------------------------
        // SAVE REGISTRATION REQUEST
        // DO NOT CREATE A USER ACCOUNT YET
        // ----------------------------------------------------

        const { data: registrationRequest, error: insertError } =
            await supabase
                .from("user_registration_requests")
                .insert({
                    clinic_id: clinic.clinic_id,
                    first_name: firstName,
                    last_name: lastName,
                    email: normalizedEmail,
                    password_hash: passwordHash,
                    requested_role_id: roleData.role_id,
                    status: "PENDING"
                })
                .select(`
                    request_id,
                    first_name,
                    last_name,
                    email,
                    status,
                    created_at
                `)
                .single();

        if (insertError) {
            if (insertError.code === "23505") {
                return res.status(409).json({
                    success: false,
                    message: "A pending request already exists for this email."
                });
            }

            throw insertError;
        }

        // RECORD REGISTRATION REQUEST
        await createAuditLog(req, {
            action: "REGISTRATION_REQUESTED",
            targetTable: "user_registration_requests",
            targetId: registrationRequest.request_id,
            details: {
                description:
                    `Registration request from ${firstName} ${lastName}`,
                email: normalizedEmail,
                requested_role: requestedRole
            }
        });

        // ----------------------------------------------------
        // RETURN PENDING REQUEST
        // ----------------------------------------------------

        return res.status(201).json({
            success: true,
            message: "Registration request submitted successfully. Please wait for Administrator approval.",
            data: registrationRequest
        });

    } catch (error) {
        console.error("Registration request error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit registration request."
        });
    }
});
// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        const { data: user, error } = await supabase
            .from("users")
            .select(`
                user_id,
                email,
                password_hash,
                first_name,
                last_name,
                clinic_id,
                role_id,
                is_active,
                roles (
                    role_name
                )
            `)
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error("Login database error:", error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // ----------------------------------------------------
        // CHECK ACTIVE STATUS
        // ----------------------------------------------------

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "This account is inactive."
            });
        }

        // ----------------------------------------------------
        // CHECK PASSWORD
        // ----------------------------------------------------

        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // ----------------------------------------------------
        // GENERATE JWT
        // ----------------------------------------------------

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role_id: user.role_id,
                role: user.roles?.role_name || null,
                clinic_id: user.clinic_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        // ----------------------------------------------------
        // UPDATE LAST LOGIN
        // ----------------------------------------------------

        await supabase
            .from("users")
            .update({
                last_login: new Date().toISOString()
            })
            .eq("user_id", user.user_id);

        // Never return password_hash
        delete user.password_hash;

        await createAuditLog(req, {
            userId: user.user_id,
            action: "LOGIN",
            targetTable: "users",
            targetId: user.user_id,
            details: {
                description: "User logged in successfully."
            }
        });

        res.json({
            success: true,
            message: "Login successful.",
            token,
            user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});

// ============================================================
// LOGOUT
// RECORD WHO LOGGED OUT
// ============================================================

router.post(
    "/logout",
    authenticateToken,
    async (req, res) => {
        try {
            await createAuditLog(req, {
                userId: req.user.user_id,
                action: "LOGOUT",
                targetTable: "users",
                targetId: req.user.user_id,
                details: {
                    description: "User logged out successfully."
                },
                throwOnError: true
            });

            return res.json({
                success: true,
                message: "Logout recorded successfully."
            });

        } catch (error) {
            console.error("Logout error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to record logout."
            });
        }
    }
);

export default router;