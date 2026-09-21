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
        console.log("POST /api/patients reached");
        console.log("User:", req.user);
        try {

            const {
                patient_name,
                species,

                owner_name,
                owner_phone,
                owner_email,
                appointment_date,
                appointment_time,
                appointment_veterinarian_name,
                appointment_reason,
                appointment_status
            } = req.body;


            // ==================================================
            // REQUIRED FIELDS
            // ==================================================

            if (!patient_name || !species || !owner_name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Patient name, species, and owner name are required."
                });

            }


            // ==================================================
            // FIND VETERINARIAN
            // ==================================================

            let veterinarianId = null;


            if (appointment_veterinarian_name) {

                console.log("Veterinarian name received:", appointment_veterinarian_name);

                const cleanName =
                    appointment_veterinarian_name
                        .replace(/^Dr\.?\s*/i, "")
                        .trim()
                        .toLowerCase();

                console.log("Clean veterinarian name:", cleanName);


                // Find the Veterinarian role
                const { data: role, error: roleError } =
                    await supabase
                        .from("roles")
                        .select("role_id")
                        .eq("role_name", "Veterinarian")
                        .single();

                console.log("Veterinarian role result:", role);
                console.log("Veterinarian role error:", roleError);

                if (roleError) {
                    throw roleError;
                }


                // Get veterinarians from this clinic
                const { data: veterinarians, error: vetError } =
                    await supabase
                        .from("users")
                        .select(
                            "user_id, first_name, last_name"
                        )
                        .eq("clinic_id", req.user.clinic_id)
                        .eq("role_id", role.role_id)
                        .eq("is_active", true);

                console.log("Veterinarians found:", veterinarians);
                console.log("Veterinarian query error:", vetError);

                if (vetError) {
                    throw vetError;
                }


                // Find matching veterinarian
                const veterinarian = veterinarians.find(
                    (vet) => {

                        const fullName =
                            `${vet.first_name || ""} ${vet.last_name || ""}`
                                .trim()
                                .toLowerCase();

                        return (
                            fullName === cleanName ||
                            (vet.last_name || "")
                                .trim()
                                .toLowerCase() === cleanName
                        );

                    }
                );


                if (!veterinarian) {

                    return res.status(404).json({
                        success: false,
                        message:
                            `Veterinarian "${appointment_veterinarian_name}" was not found.`
                    });

                }


                veterinarianId =
                    veterinarian.user_id;

            }


            // ==================================================
            // CREATE PATIENT
            // ==================================================

            const { data, error } = await supabase
                .from("patients")
                .insert([{

                    // Patient
                    clinic_id: req.user.clinic_id,
                    patient_name,
                    species,

                    // Owner
                    owner_name,
                    owner_phone:
                        owner_phone || null,
                    owner_email:
                        owner_email || null,

                    // Appointment
                    appointment_date:
                        appointment_date || null,

                    appointment_time:
                        appointment_time || null,

                    appointment_veterinarian_id:
                        veterinarianId,

                    appointment_reason:
                        appointment_reason || null,

                    appointment_status:
                        appointment_status || "scheduled",

                    // Active
                    is_active: true

                }])
                .select()
                .single();


            if (error) {
                throw error;
            }


            return res.status(201).json({

                success: true,

                message:
                    "Patient created successfully.",

                data

            });


        } catch (error) {

            console.error(
                "Create patient error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to create patient.",

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

                // Patient
                "patient_name",
                "species",
                "breed",
                "date_of_birth",
                "gender",
                "is_neutered",
                "microchip_number",

                // Owner
                "owner_name",
                "owner_phone",
                "owner_email",

                // Appointment
                "appointment_date",
                "appointment_time",
                "appointment_veterinarian_id",
                "appointment_reason",
                "appointment_status"

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