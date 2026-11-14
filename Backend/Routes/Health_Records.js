// FILE: Routes/HealthRecords.js
// PURPOSE: Manage animal health records

import express from "express";
import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";
import { createAuditLog } from "../Utils/AuditLogger.js";

const router = express.Router();


// ======================================================
// FOLLOW-UP DATE VALIDATION (ASIA/MANILA)
// ======================================================
function getTodayManilaDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;
    const day = parts.find(part => part.type === "day").value;

    return `${year}-${month}-${day}`;
}

function isValidFollowUpDate(date) {
    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
    ) {
        return false;
    }

    return date >= getTodayManilaDate();
}


// ======================================================
// VERIFY HEALTH RECORD BELONGS TO USER'S CLINIC
// ======================================================
async function getClinicHealthRecord(recordId, clinicId) {
    const { data: record, error: recordError } = await supabase
        .from("health_records")
        .select("record_id, patient_id")
        .eq("record_id", recordId)
        .maybeSingle();

    if (recordError) {
        throw recordError;
    }

    if (!record) {
        return {
            status: 404,
            message: "Health record not found."
        };
    }

    const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("clinic_id")
        .eq("patient_id", record.patient_id)
        .maybeSingle();

    if (patientError) {
        throw patientError;
    }

    if (!patient || patient.clinic_id !== clinicId) {
        return {
            status: 403,
            message: "Access denied."
        };
    }

    return {
        record,
        status: 200
    };
}

// ======================================================
// GET ALL HEALTH RECORDS
// GET /api/health-records
// ======================================================
router.get("/", authenticateToken, requireRole
    ("Administrator", "Clinic Manager", "Veterinarian"),
    async (req, res) => {
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


            // Get all follow-up appointments for these health records
            const recordIds = data.map(record => record.record_id);

            const { data: followUpAppointments, error: followUpError } =
                await supabase
                    .from("health_record_followups")
                    .select("record_id, follow_up_date, status")
                    .in("record_id", recordIds)
                    .order("follow_up_date", { ascending: true });

            if (followUpError) {
                throw followUpError;
            }

            // Track the nearest scheduled appointment and latest
            // completed, missed, or cancelled appointment.
            const nextFollowUpMap = new Map();
            const latestHistoryMap = new Map();

            for (const appointment of followUpAppointments || []) {
                const status = appointment.status?.toLowerCase();

                if (status === "scheduled") {
                    // Keep the earliest scheduled appointment.
                    if (!nextFollowUpMap.has(appointment.record_id)) {
                        nextFollowUpMap.set(appointment.record_id, appointment);
                    }
                } else {
                    // Keep the most recent non-scheduled appointment.
                    latestHistoryMap.set(appointment.record_id, appointment);
                }
            }

            // Attach appointment date and actual status to each health record.
            const dataWithMrn = data.map(record => {
                const appointment =
                    nextFollowUpMap.get(record.record_id) ||
                    latestHistoryMap.get(record.record_id);

                return {
                    ...record,
                    mrn_number: patientMrnMap.get(record.patient_id),
                    follow_up_date: appointment?.follow_up_date || null,
                    follow_up_status: appointment?.status || null
                };
            });

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
router.get("/:id", authenticateToken, requireRole
    ("Administrator", "Clinic Manager", "Veterinarian"),
    async (req, res) => {
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

            // Check whether the associated patient belongs to this clinic
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
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const {
                patient_id,
                diagnosis,
                symptoms,
                treatment,
                follow_up_date,
                notes
            } = req.body;

            if (!patient_id) {
                return res.status(400).json({
                    success: false,
                    message: "patient_id is required."
                });
            }

            // Validate initial follow-up date
            if (
                follow_up_date &&
                !isValidFollowUpDate(follow_up_date)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up date must be today or a future date."
                });
            }

            // Confirm patient belongs to the clinic
            const { data: patient, error: patientError } = await supabase
                .from("patients")
                .select("patient_id")
                .eq("patient_id", patient_id)
                .eq("clinic_id", req.user.clinic_id)
                .single();

            if (patientError || !patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found in your clinic."
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
                    follow_up_date: follow_up_date || null,
                    notes: notes || null,
                    record_date: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Create the initial follow-up appointment if a date was provided
            if (follow_up_date) {
                const { error: followUpError } = await supabase
                    .from("health_record_followups")
                    .insert([{
                        record_id: data.record_id,
                        follow_up_date,
                        status: "scheduled",
                        notes: null
                    }]);

                if (followUpError) {
                    // Remove the health record if its initial appointment cannot be saved
                    const { error: rollbackError } = await supabase
                        .from("health_records")
                        .delete()
                        .eq("record_id", data.record_id);

                    if (rollbackError) {
                        console.error("Health record rollback failed:", rollbackError);
                    }

                    throw followUpError;
                }
            }

            await createAuditLog(req, {
                action: "HEALTH_RECORD_CREATED",
                targetTable: "health_records",
                targetId: data.record_id,
                details: {
                    description: "Created a new health record.",
                    patient_id: data.patient_id
                }
            });

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
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            const updates = {};

            // Update health record recovery status
            if (req.body.status !== undefined) {
                const allowedStatuses = [
                    "active",
                    "recovered",
                    "cancelled"
                ];

                const newStatus = req.body.status.toLowerCase();

                if (!allowedStatuses.includes(newStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid health record status."
                    });
                }

                updates.status = newStatus;
            }

            if (req.body.patient_id !== undefined) {
                updates.patient_id = req.body.patient_id;
            }

            if (req.body.diagnosis !== undefined) {
                updates.diagnosis = req.body.diagnosis || null;
            }

            if (req.body.symptoms !== undefined) {
                updates.symptoms = req.body.symptoms
                    ? [req.body.symptoms]
                    : null;
            }


            if (req.body.treatment !== undefined) {
                updates.treatment_notes = req.body.treatment || null;
            }


            if (req.body.follow_up_date !== undefined) {
                if (
                    req.body.follow_up_date &&
                    !isValidFollowUpDate(req.body.follow_up_date)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Follow-up date must be today or a future date."
                    });
                }

                updates.follow_up_date = req.body.follow_up_date || null;
            }

            if (req.body.notes !== undefined) {
                updates.notes = req.body.notes || null;
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

            // Verify that a replacement patient belongs to this clinic
            if (req.body.patient_id !== undefined) {
                const { data: newPatient, error: newPatientError } = await supabase
                    .from("patients")
                    .select("patient_id")
                    .eq("patient_id", req.body.patient_id)
                    .eq("clinic_id", req.user.clinic_id)
                    .maybeSingle();

                if (newPatientError) {
                    throw newPatientError;
                }

                if (!newPatient) {
                    return res.status(400).json({
                        success: false,
                        message: "Selected patient does not belong to your clinic."
                    });
                }
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


            // Synchronize an edited follow-up date with appointment history
            if (req.body.follow_up_date !== undefined) {

                // If the follow-up date is cleared, cancel all scheduled appointments
                if (!req.body.follow_up_date) {
                    const { error: cancelError } = await supabase
                        .from("health_record_followups")
                        .update({
                            status: "cancelled",
                            updated_at: new Date().toISOString()
                        })
                        .eq("record_id", req.params.id)
                        .eq("status", "scheduled");

                    if (cancelError) {
                        throw cancelError;
                    }
                } else {
                    // Look for an existing scheduled appointment
                    const { data: existingFollowUp, error: followUpFetchError } =
                        await supabase
                            .from("health_record_followups")
                            .select("followup_id")
                            .eq("record_id", req.params.id)
                            .eq("status", "scheduled")
                            .order("created_at", { ascending: true })
                            .limit(1)
                            .maybeSingle();

                    if (followUpFetchError) {
                        throw followUpFetchError;
                    }

                    if (existingFollowUp) {
                        // Update the existing scheduled appointment
                        const { error: followUpUpdateError } = await supabase
                            .from("health_record_followups")
                            .update({
                                follow_up_date: req.body.follow_up_date,
                                updated_at: new Date().toISOString()
                            })
                            .eq("followup_id", existingFollowUp.followup_id);

                        if (followUpUpdateError) {
                            throw followUpUpdateError;
                        }
                    } else {
                        // Create a new appointment if none is scheduled
                        const { error: followUpInsertError } = await supabase
                            .from("health_record_followups")
                            .insert([{
                                record_id: req.params.id,
                                follow_up_date: req.body.follow_up_date,
                                status: "scheduled",
                                notes: null
                            }]);
                        if (followUpInsertError) {
                            throw followUpInsertError;
                        }
                    }
                }
            }


            await createAuditLog(req, {
                action: "HEALTH_RECORD_UPDATED",
                targetTable: "health_records",
                targetId: data.record_id,
                details: {
                    description: "Updated a health record.",
                    updated_fields: Object.keys(updates).filter(
                        field => field !== "updated_at"
                    )
                }
            });

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

// ======================================================
// GET FOLLOW-UP APPOINTMENTS
// GET /api/health-records/:id/followups
// ======================================================
router.get("/:id/followups", authenticateToken,
    requireRole("Administrator", "Clinic Manager", "Veterinarian"),
    async (req, res) => {
        try {
            const result = await getClinicHealthRecord(
                req.params.id,
                req.user.clinic_id
            );

            if (result.status !== 200) {
                return res.status(result.status).json({
                    success: false,
                    message: result.message
                });
            }

            const { data, error } = await supabase
                .from("health_record_followups")
                .select("*")
                .eq("record_id", req.params.id)
                .order("follow_up_date", { ascending: true });

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
                message: "Failed to retrieve follow-up appointments.",
                error: error.message
            });
        }
    });


// ======================================================
// SCHEDULE FOLLOW-UP APPOINTMENT
// POST /api/health-records/:id/followups
// ======================================================
router.post(
    "/:id/followups",
    authenticateToken,
    requireRole("Administrator", "Veterinarian"),
    async (req, res) => {
        try {
            const { follow_up_date, notes } = req.body;

            if (!follow_up_date) {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up date is required."
                });
            }

            // Validate follow-up appointment date
            if (!isValidFollowUpDate(follow_up_date)) {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up date must be today or a future date."
                });
            }

            const result = await getClinicHealthRecord(
                req.params.id,
                req.user.clinic_id
            );

            if (result.status !== 200) {
                return res.status(result.status).json({
                    success: false,
                    message: result.message
                });
            }

            // Prevent scheduling on an already recovered record
            const { data: healthRecord, error: statusError } = await supabase
                .from("health_records")
                .select("status")
                .eq("record_id", req.params.id)
                .single();

            if (statusError) {
                throw statusError;
            }

            if (healthRecord.status?.toLowerCase() === "recovered") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot schedule a follow-up for a recovered health record."
                });
            }

            const { data, error } = await supabase
                .from("health_record_followups")
                .insert([{
                    record_id: req.params.id,
                    follow_up_date,
                    status: "scheduled",
                    notes: notes || null
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            await createAuditLog(req, {
                action: "FOLLOWUP_SCHEDULED",
                targetTable: "health_record_followups",
                targetId: data.followup_id,
                details: {
                    description: "Scheduled a health record follow-up appointment.",
                    record_id: data.record_id,
                    follow_up_date: data.follow_up_date
                }
            });

            return res.status(201).json({
                success: true,
                message: "Follow-up appointment scheduled successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to schedule follow-up appointment.",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE FOLLOW-UP APPOINTMENT
// PUT /api/health-records/:id/followups/:followupId
// ======================================================
router.put(
    "/:id/followups/:followupId",
    authenticateToken,
    requireRole("Administrator", "Veterinarian"),
    async (req, res) => {
        try {
            const result = await getClinicHealthRecord(
                req.params.id,
                req.user.clinic_id
            );

            if (result.status !== 200) {
                return res.status(result.status).json({
                    success: false,
                    message: result.message
                });
            }

            const updates = {};

            if (req.body.follow_up_date !== undefined) {
                if (
                    !req.body.follow_up_date ||
                    !isValidFollowUpDate(req.body.follow_up_date)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Follow-up date must be today or a future date."
                    });
                }

                updates.follow_up_date = req.body.follow_up_date;
            }

            if (req.body.notes !== undefined) {
                updates.notes = req.body.notes || null;
            }

            if (req.body.status !== undefined) {
                const allowedStatuses = [
                    "scheduled",
                    "completed",
                    "missed",
                    "cancelled"
                ];

                const newStatus = req.body.status.toLowerCase();

                if (!allowedStatuses.includes(newStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid follow-up appointment status."
                    });
                }

                updates.status = newStatus;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No valid fields provided for update."
                });
            }

            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from("health_record_followups")
                .update(updates)
                .eq("followup_id", req.params.followupId)
                .eq("record_id", req.params.id)
                .select()
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Follow-up appointment not found."
                });
            }

            await createAuditLog(req, {
                action: "FOLLOWUP_UPDATED",
                targetTable: "health_record_followups",
                targetId: data.followup_id,
                details: {
                    description: "Updated a health record follow-up appointment.",
                    record_id: data.record_id,
                    updated_fields: Object.keys(updates).filter(
                        field => field !== "updated_at"
                    )
                }
            });

            return res.json({
                success: true,
                message: "Follow-up appointment updated successfully.",
                data
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to update follow-up appointment.",
                error: error.message
            });
        }
    }
);

// ======================================================
// DELETE HEALTH RECORD
// DELETE /api/health-records/:id
// ======================================================
router.delete(
    "/:id",
    authenticateToken,
    requireRole(
        "Administrator",
    ),
    async (req, res) => {
        try {
            // Find the health record
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

            // Verify that the associated patient belongs to this clinic
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

            // Delete the health record
            const { error: deleteError } = await supabase
                .from("health_records")
                .delete()
                .eq("record_id", req.params.id);

            if (deleteError) {
                throw deleteError;
            }

            await createAuditLog(req, {
                action: "HEALTH_RECORD_DELETED",
                targetTable: "health_records",
                targetId: record.record_id,
                details: {
                    description: "Deleted a health record.",
                    patient_id: record.patient_id
                }
            });

            return res.json({
                success: true,
                message: "Health record deleted successfully."
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to delete health record.",
                error: error.message
            });
        }
    }
);

export default router;