// FILE: Routes/Prescriptions.js
// PURPOSE: Manage prescriptions and prescription items

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();


// ======================================================
// GET ALL PRESCRIPTIONS
// GET /api/prescriptions
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Find patients belonging to clinic
        const { data: patients, error: patientError } = await supabase
            .from("patients")
            .select("patient_id")
            .eq("clinic_id", req.user.clinic_id);

        if (patientError) {
            throw patientError;
        }

        const patientIds = patients.map(patient => patient.patient_id);

        if (patientIds.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const { data, error } = await supabase
            .from("prescriptions")
            .select(`
                *,
                prescription_items (
                    *
                )
            `)
            .in("patient_id", patientIds)
            .order("prescription_date", { ascending: false });

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
            message: "Failed to retrieve prescriptions.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE PRESCRIPTION
// GET /api/prescriptions/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data: prescription, error } = await supabase
            .from("prescriptions")
            .select(`
                *,
                prescription_items (
                    *
                )
            `)
            .eq("prescription_id", req.params.id)
            .single();

        if (error || !prescription) {
            return res.status(404).json({
                success: false,
                message: "Prescription not found."
            });
        }

        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("clinic_id")
            .eq("patient_id", prescription.patient_id)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found."
            });
        }

        if (patient.clinic_id !== req.user.clinic_id) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        return res.json({
            success: true,
            data: prescription
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve prescription.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE PRESCRIPTION
// POST /api/prescriptions
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
                patient_id,
                instructions,
                items
            } = req.body;

            if (
                !patient_id ||
                !Array.isArray(items) ||
                items.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "patient_id and at least one prescription item are required."
                });
            }

            // Verify patient belongs to clinic
            const { data: patient, error: patientError } = await supabase
                .from("patients")
                .select("patient_id")
                .eq("patient_id", patient_id)
                .eq("clinic_id", req.user.clinic_id)
                .single();

            if (patientError || !patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            const { data: prescription, error: prescriptionError } =
                await supabase
                    .from("prescriptions")
                    .insert([{
                        patient_id,
                        veterinarian_id: req.user.user_id,
                        instructions: instructions || null,
                        prescription_date: new Date().toISOString()
                    }])
                    .select()
                    .single();

            if (prescriptionError) {
                throw prescriptionError;
            }

            const prescriptionItems = items.map(item => ({
                prescription_id: prescription.prescription_id,
                item_id: item.item_id,
                quantity: item.quantity,
                dosage: item.dosage || null,
                frequency: item.frequency || null,
                duration: item.duration || null
            }));

            const { data: insertedItems, error: itemError } =
                await supabase
                    .from("prescription_items")
                    .insert(prescriptionItems)
                    .select();

            if (itemError) {
                throw itemError;
            }

            return res.status(201).json({
                success: true,
                message: "Prescription created successfully.",
                prescription,
                items: insertedItems
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to create prescription.",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE PRESCRIPTION
// PUT /api/prescriptions/:id
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
            const {
                instructions,
                status
            } = req.body;

            const updates = {
                updated_at: new Date().toISOString()
            };

            if (instructions !== undefined) {
                updates.instructions = instructions;
            }

            if (status !== undefined) {
                updates.status = status;
            }

            const { data, error } = await supabase
                .from("prescriptions")
                .update(updates)
                .eq("prescription_id", req.params.id)
                .select()
                .single();

            if (error || !data) {
                return res.status(404).json({
                    success: false,
                    message: "Prescription not found."
                });
            }

            return res.json({
                success: true,
                message: "Prescription updated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to update prescription.",
                error: error.message
            });
        }
    }
);


export default router;