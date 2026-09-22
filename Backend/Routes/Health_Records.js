// FILE: Routes/HealthRecords.js
// PURPOSE: Manage animal health records

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

// ======================================================
// GET ALL HEALTH RECORDS
// GET /api/health-records
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Get patients belonging to this clinic
        const { data: patients, error: patientError } = await supabase
            .from("patients")
            .select("patient_id, mrn_number")
            .eq("clinic_id", req.user.clinic_id);

        if (patientError) {
            throw patientError;
        }

        const patientIds = patients.map(
            patient => patient.patient_id
        );

        if (patientIds.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const { data, error } = await supabase
            .from("health_records")
            .select("*")
            .in("patient_id", patientIds)
            .order("record_date", { ascending: false });

        if (error) {
            throw error;
        }

        // Match each health record to its patient's MRN
        const patientMrnMap = new Map(
            patients.map(patient => [
                patient.patient_id,
                patient.mrn_number
            ])
        );

        const dataWithMrn = data.map(record => ({
            ...record,
            mrn_number: patientMrnMap.get(record.patient_id)
        }));

        return res.json({
            success: true,
            data: dataWithMrn
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve health records.",
            error: error.message
        });
    }
});

// ======================================================
// GET ONE HEALTH RECORD
// GET /api/health-records/:id
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data: record, error } = await supabase
            .from("health_records")
            .select("*")
            .eq("record_id", req.params.id)
            .single();

        if (error || !record) {
            return res.status(404).json({
                success: false,
                message: "Health record not found."
            });
        }

        // Check patient belongs to clinic
        // Confirm patient belongs to the clinic
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("clinic_id")
            .eq("patient_id", record.patient_id)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({
                success: false,
                message: "Associated patient not found."
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
            data: record
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve health record.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE HEALTH RECORD
// POST /api/health-records
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
                diagnosis,
                symptoms,
                treatment,
                notes
            } = req.body;

            if (!patient_id) {
                return res.status(400).json({
                    success: false,
                    message: "patient_id is required."
                });
            }

            // Confirm patient belongs to the clinic
            const cleanPatientId = patient_id.trim().toUpperCase();

            const match = cleanPatientId.match(/^MRN-(\d+)-A$/);

            if (!match) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Patient ID format. Use MRN-00001-A."
                });
            }

            const mrnNumber = Number(match[1]);

            const { data: patient, error: patientError } = await supabase
                .from("patients")
                .select("patient_id")
                .eq("mrn_number", mrnNumber)
                .eq("clinic_id", req.user.clinic_id)
                .single();

            if (patientError || !patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            const { data, error } = await supabase
                .from("health_records")
                .insert([{
                    patient_id: patient.patient_id,
                    veterinarian_id: req.user.user_id,
                    diagnosis: diagnosis || null,
                    symptoms: symptoms
                        ? [symptoms]
                        : null,
                    treatment_notes: treatment || null,
                    notes: notes || null,
                    record_date: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.status(201).json({
                success: true,
                message: "Health record created successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to create health record.",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE HEALTH RECORD
// PUT /api/health-records/:id
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
                "diagnosis",
                "symptoms",
                "treatment",
                "notes"
            ];

            const updates = {};

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            updates.updated_at = new Date().toISOString();

            // First get the record
            const { data: record, error: recordError } = await supabase
                .from("health_records")
                .select("record_id, patient_id")
                .eq("record_id", req.params.id)
                .single();

            if (recordError || !record) {
                return res.status(404).json({
                    success: false,
                    message: "Health record not found."
                });
            }

            // Check patient's clinic
            const { data: patient, error: patientError } = await supabase
                .from("patients")
                .select("clinic_id")
                .eq("patient_id", record.patient_id)
                .single();

            if (patientError || patient?.clinic_id !== req.user.clinic_id) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied."
                });
            }

            const { data, error } = await supabase
                .from("health_records")
                .update(updates)
                .eq("record_id", req.params.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.json({
                success: true,
                message: "Health record updated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to update health record.",
                error: error.message
            });
        }
    }
);


export default router;