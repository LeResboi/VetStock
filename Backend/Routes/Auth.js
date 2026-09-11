// FILE: routes/auth.js
// PURPOSE: VetStock authentication endpoints

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { supabase } from "../VetStockDatabase/Supabase.js";

const router = express.Router();

// ============================================================
// REGISTER
// ============================================================

router.post("/register", async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            last_name,
            clinic_id,
            role_id
        } = req.body;

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

        // ----------------------------------------------------
        // CHECK EXISTING USER
        // ----------------------------------------------------

        const { data: existingUser, error: existingError } =
            await supabase
                .from("users")
                .select("user_id")
                .eq("email", email)
                .maybeSingle();

        if (existingError) {
            return res.status(500).json({
                success: false,
                message: existingError.message
            });
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        // ----------------------------------------------------
        // HASH PASSWORD
        // ----------------------------------------------------

        const passwordHash = await bcrypt.hash(password, 12);

        // ----------------------------------------------------
        // CREATE USER
        // ----------------------------------------------------

        const { data: user, error } = await supabase
            .from("users")
            .insert({
                email,
                password_hash: passwordHash,
                first_name: first_name || null,
                last_name: last_name || null,
                clinic_id: clinic_id || null,
                role_id: role_id || null,
                is_active: true
            })
            .select(`
                user_id,
                email,
                first_name,
                last_name,
                clinic_id,
                role_id,
                is_active,
                created_at
            `)
            .single();

        if (error) {
            console.error("Registration error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to create account."
            });
        }

        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user
        });

    } catch (error) {
        console.error("Register error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error."
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

export default router;