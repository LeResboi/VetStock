// FILE: Routes/Patients.js
// PURPOSE: Manage veterinary patients

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();


// ======================================================
// GET ALL PATIENTS
// GET /api/patients
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("clinic_id", req.user.clinic_id)
            .eq("is_active", true)
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
            message: "Failed to retrieve patients.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE PATIENT
// GET /api/patients/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("patient_id", req.params.id)
            .eq("clinic_id", req.user.clinic_id)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: "Patient not found."
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
            message: "Failed to retrieve patient.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE PATIENT
// POST /api/patients
// ======================================================
router.post(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const {
                patient_name,
                species,
                breed,
                sex,
                date_of_birth,
                owner_name,
                owner_contact
            } = req.body;

            if (!patient_name || !species) {
                return res.status(400).json({
                    success: false,
                    message:
                        "patient_name and species are required."
                });
            }

            const { data, error } = await supabase
                .from("patients")
                .insert([{
                    clinic_id: req.user.clinic_id,
                    patient_name,
                    species,
                    breed: breed || null,
                    sex: sex || null,
                    date_of_birth: date_of_birth || null,
                    owner_name: owner_name || null,
                    owner_contact: owner_contact || null,
                    is_active: true
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.status(201).json({
                success: true,
                message: "Patient created successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to create patient.",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE PATIENT
// PUT /api/patients/:id
// ======================================================
router.put(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const allowedFields = [
                "patient_name",
                "species",
                "breed",
                "sex",
                "date_of_birth",
                "owner_name",
                "owner_contact"
            ];

            const updates = {};

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from("patients")
                .update(updates)
                .eq("patient_id", req.params.id)
                .eq("clinic_id", req.user.clinic_id)
                .select()
                .single();

            if (error || !data) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            return res.json({
                success: true,
                message: "Patient updated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to update patient.",
                error: error.message
            });
        }
    }
);


// ======================================================
// DEACTIVATE PATIENT
// DELETE /api/patients/:id
// ======================================================
router.delete(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .from("patients")
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq("patient_id", req.params.id)
                .eq("clinic_id", req.user.clinic_id)
                .select()
                .single();

            if (error || !data) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            return res.json({
                success: true,
                message: "Patient deactivated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to deactivate patient.",
                error: error.message
            });
        }
    }
);


export default router;