// FILE: Routes/Patients.js
// PURPOSE: Manage veterinary patients

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

// ======================================================
// GET ACTIVE VETERINARIANS
// GET /api/patients/veterinarians
// ======================================================

router.get("/veterinarians", authenticateToken, async (req, res) => {
    try {
        // Find the Veterinarian role
        const { data: role, error: roleError } = await supabase
            .from("roles")
            .select("role_id")
            .eq("role_name", "Veterinarian")
            .single();

        if (roleError) {
            throw roleError;
        }

        // Get active veterinarians in the logged-in user's clinic
        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("user_id, first_name, last_name")
            .eq("clinic_id", req.user.clinic_id)
            .eq("role_id", role.role_id)
            .eq("is_active", true)
            .order("first_name", { ascending: true });

        if (usersError) {
            throw usersError;
        }

        // Return each veterinarian's ID and full name
        const veterinarians = (users || []).map(user => ({
            user_id: user.user_id,
            full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim()
        }));

        return res.json({
            success: true,
            data: veterinarians
        });

    } catch (error) {
        console.error("Fetch veterinarians error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve veterinarians.",
            error: error.message
        });
    }
});

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

        // Find the veterinarian IDs used by these patients
        const veterinarianIds = [
            ...new Set(
                data
                    .map(patient => patient.appointment_veterinarian_id)
                    .filter(Boolean)
            )
        ];

        let veterinarianNames = new Map();

        if (veterinarianIds.length > 0) {
            const { data: veterinarians, error: vetError } = await supabase
                .from('users')
                .select('user_id, first_name, last_name')
                .eq('clinic_id', req.user.clinic_id)
                .in('user_id', veterinarianIds);

            if (vetError) {
                throw vetError;
            }

            veterinarianNames = new Map(
                (veterinarians || []).map(vet => [
                    vet.user_id,
                    `${vet.first_name || ''} ${vet.last_name || ''}`.trim()
                ])
            );
        }

        // Include the veterinarian name in each patient response
        const patientsWithVetNames = data.map(patient => ({
            ...patient,
            appointment_veterinarian_name:
                veterinarianNames.get(patient.appointment_veterinarian_id) || null
        }));

        return res.json({
            success: true,
            data: patientsWithVetNames
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

        // Get the assigned veterinarian's full name
        let appointment_veterinarian_name = null;

        if (data.appointment_veterinarian_id) {
            const { data: veterinarian, error: vetError } = await supabase
                .from("users")
                .select("first_name, last_name")
                .eq("user_id", data.appointment_veterinarian_id)
                .eq("clinic_id", req.user.clinic_id)
                .maybeSingle();

            if (vetError) {
                throw vetError;
            }

            if (veterinarian) {
                appointment_veterinarian_name =
                    `${veterinarian.first_name || ""} ${veterinarian.last_name || ""}`.trim();
            }
        }

        return res.json({
            success: true,
            data: {
                ...data,
                appointment_veterinarian_name
            }
        });

    } catch (error) {
        console.error("Get patient error:", error);

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
                gender,
                owner_name,
                owner_phone,
                owner_email,
                appointment_date,
                appointment_time,
                appointment_veterinarian_id,
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
            // VALIDATE SELECTED VETERINARIAN
            // ==================================================

            let veterinarianId = appointment_veterinarian_id || null;

            if (veterinarianId) {
                const { data: role, error: roleError } = await supabase
                    .from("roles")
                    .select("role_id")
                    .eq("role_name", "Veterinarian")
                    .single();

                if (roleError) {
                    throw roleError;
                }

                // Confirm the selected user is an active veterinarian
                // belonging to the current clinic
                const { data: veterinarian, error: vetError } = await supabase
                    .from("users")
                    .select("user_id")
                    .eq("user_id", veterinarianId)
                    .eq("clinic_id", req.user.clinic_id)
                    .eq("role_id", role.role_id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (vetError) {
                    throw vetError;
                }

                if (!veterinarian) {
                    return res.status(400).json({
                        success: false,
                        message: "The selected veterinarian is invalid or inactive."
                    });
                }
                veterinarianId = veterinarian.user_id;
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
                    gender: gender || null,

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
// PATCH PATIENT
// PATCH /api/patients/:id
// ======================================================

router.patch(
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
                "appointment_reason",
                "appointment_status"

            ];


            const updates = {};
            // Validate the selected veterinarian when updating a patient
            if (req.body.appointment_veterinarian_id !== undefined) {
                const requestedVetId = req.body.appointment_veterinarian_id;

                // Allow the veterinarian assignment to be cleared
                if (requestedVetId === null || requestedVetId === "") {
                    updates.appointment_veterinarian_id = null;
                } else {
                    const { data: role, error: roleError } = await supabase
                        .from("roles")
                        .select("role_id")
                        .eq("role_name", "Veterinarian")
                        .single();

                    if (roleError) {
                        throw roleError;
                    }

                    const { data: veterinarian, error: vetError } = await supabase
                        .from("users")
                        .select("user_id")
                        .eq("user_id", requestedVetId)
                        .eq("clinic_id", req.user.clinic_id)
                        .eq("role_id", role.role_id)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (vetError) {
                        throw vetError;
                    }

                    if (!veterinarian) {
                        return res.status(400).json({
                            success: false,
                            message: "The selected veterinarian is invalid or inactive."
                        });
                    }

                    updates.appointment_veterinarian_id = veterinarian.user_id;
                }
            }

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
                .maybeSingle();

            // Show the actual database error
            if (error) {
                console.error("Update patient database error:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    patientId: req.params.id,
                    clinicId: req.user.clinic_id
                });

                return res.status(500).json({
                    success: false,
                    message: "Database error while updating patient.",
                    error: error.message
                });
            }

            // No matching patient was updated
            if (!data) {
                console.error("No patient matched the update request:", {
                    patientId: req.params.id,
                    clinicId: req.user.clinic_id
                });

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