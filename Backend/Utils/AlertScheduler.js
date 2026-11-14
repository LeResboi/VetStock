
/*
 * FILE: Utils/AlertScheduler.js
 * PURPOSE: Automatically generate inventory and appointment alerts.
 */

import { supabase } from "../VetStockDatabase/Supabase.js";

const TIME_ZONE = "Asia/Manila";
const CHECK_INTERVAL = 60 * 1000;

// Prevent overlapping scheduler executions.
let isRunning = false;
let schedulerInterval = null;

// ======================================================
// PHILIPPINE DATE AND TIME
// ======================================================

function getManilaDateTime() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const values = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`,
        timestamp: Date.now()
    };
}

function addDays(dateString, days) {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day + days)
    );

    return date.toISOString().slice(0, 10);
}

function getDaysDifference(dateA, dateB) {
    const a = new Date(`${dateA}T00:00:00Z`).getTime();
    const b = new Date(`${dateB}T00:00:00Z`).getTime();

    return Math.round((b - a) / 86400000);
}

// ======================================================
// SAVE OR UPDATE ALERT
// ======================================================

async function saveAlert(existingAlerts, payload) {
    const matchingAlerts = existingAlerts.filter(alert =>
        alert.alert_type === payload.alert_type &&
        alert.item_id === (payload.item_id || null) &&
        alert.patient_id === (payload.patient_id || null)
    );

    // Prefer an existing active alert.
    const existing =
        matchingAlerts.find(alert => alert.status === "active") ||
        matchingAlerts[0];

    if (existing) {
        const hasChanged =
            existing.status !== "active" ||
            existing.message !== payload.message;

        const updates = {
            ...payload,
            status: "active",
            resolved_at: null,
            resolution_notes: null
        };

        // A new or changed warning should be unread.
        if (hasChanged) {
            updates.is_read = false;
            updates.read_at = null;
        }

        const { error } = await supabase
            .from("alerts")
            .update(updates)
            .eq("alert_id", existing.alert_id)
            .eq("clinic_id", payload.clinic_id);

        if (error) {
            throw error;
        }

        Object.assign(existing, updates);

        return existing;
    }

    const { data, error } = await supabase
        .from("alerts")
        .insert([{
            ...payload,
            status: "active",
            is_read: false,
            read_at: null
        }])
        .select()
        .single();

    if (error) {
        throw error;
    }

    existingAlerts.push(data);

    return data;
}

// ======================================================
// RESOLVE ALERT
// ======================================================

async function resolveAlert(alert) {
    if (alert.status !== "active") {
        return;
    }

    const { error } = await supabase
        .from("alerts")
        .update({
            status: "resolved",
            resolved_at: new Date().toISOString()
        })
        .eq("alert_id", alert.alert_id)
        .eq("clinic_id", alert.clinic_id);

    if (error) {
        throw error;
    }

    alert.status = "resolved";
}

// ======================================================
// CHECK INVENTORY ALERTS
// ======================================================

async function checkInventoryAlerts(clinicId, existingAlerts, today) {
    const { data: inventory, error } = await supabase
        .from("inventory_items")
        .select(`
            item_id,
            item_name,
            min_stock_level,
            inventory_batches (
                quantity,
                expiration_date
            )
        `)
        .eq("clinic_id", clinicId)
        .eq("is_active", true);

    if (error) {
        throw error;
    }

    // Resolve alerts belonging to inactive or deleted inventory items.
    const activeItemIds = new Set(
        (inventory || []).map(item => item.item_id)
    );

    for (const alert of existingAlerts) {
        if (
            ["LOW_STOCK", "EXPIRATION"].includes(alert.alert_type) &&
            alert.status === "active" &&
            alert.item_id &&
            !activeItemIds.has(alert.item_id)
        ) {
            await resolveAlert(alert);
        }
    }

    const thirtyDaysFromNow = addDays(today, 30);

    for (const item of inventory || []) {
        const batches = item.inventory_batches || [];

        const totalQuantity = batches.reduce(
            (total, batch) =>
                total + Math.max(0, Number(batch.quantity) || 0),
            0
        );

        const minimumStock =
            Number(item.min_stock_level) || 0;

        // ----------------------------------------------
        // LOW STOCK
        // ----------------------------------------------

        const lowStockAlert = existingAlerts.filter(alert =>
            alert.item_id === item.item_id &&
            alert.alert_type === "LOW_STOCK"
        );

        if (minimumStock > 0 && totalQuantity <= minimumStock) {
            await saveAlert(existingAlerts, {
                clinic_id: clinicId,
                item_id: item.item_id,
                patient_id: null,
                alert_type: "LOW_STOCK",
                severity: totalQuantity === 0 ? "high" : "medium",
                message:
                    `${item.item_name} has low quantity: ` +
                    `${totalQuantity} remaining. ` +
                    `Minimum is ${minimumStock}.`,
                current_stock: totalQuantity,
                threshold: minimumStock
            });
        } else {
            for (const alert of lowStockAlert) {
                await resolveAlert(alert);
            }
        }

        // ----------------------------------------------
        // EXPIRATION
        // Only batches with available stock are checked.
        // ----------------------------------------------

        const expirationDates = batches
            .filter(batch =>
                Number(batch.quantity) > 0 &&
                batch.expiration_date
            )
            .map(batch => batch.expiration_date)
            .sort();

        const expirationAlerts = existingAlerts.filter(alert =>
            alert.item_id === item.item_id &&
            alert.alert_type === "EXPIRATION"
        );

        if (expirationDates.length === 0) {
            for (const alert of expirationAlerts) {
                await resolveAlert(alert);
            }

            continue;
        }

        const nearestExpiration = expirationDates[0];

        if (nearestExpiration > thirtyDaysFromNow) {
            for (const alert of expirationAlerts) {
                await resolveAlert(alert);
            }

            continue;
        }

        const daysLeft = getDaysDifference(today, nearestExpiration);

        const formattedDate = new Date(
            `${nearestExpiration}T00:00:00Z`
        ).toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "long",
            day: "numeric",
            year: "numeric"
        });

        let message;
        let severity;

        if (daysLeft <= 0) {
            message =
                `${item.item_name} expired on ${formattedDate}.`;
            severity = "high";
        } else if (daysLeft <= 7) {
            message =
                `${item.item_name} expires in ${daysLeft} day` +
                `${daysLeft === 1 ? "" : "s"} on ${formattedDate}.`;
            severity = "high";
        } else {
            message =
                `${item.item_name} expires on ${formattedDate}.`;
            severity = "medium";
        }

        await saveAlert(existingAlerts, {
            clinic_id: clinicId,
            item_id: item.item_id,
            patient_id: null,
            alert_type: "EXPIRATION",
            severity,
            message,
            current_stock: null,
            threshold: null
        });
    }
}

// ======================================================
// CHECK APPOINTMENT ALERTS
// ======================================================

async function checkAppointmentAlerts(
    clinicId,
    existingAlerts,
    manilaDateTime
) {
    const { data: patients, error } = await supabase
        .from("patients")
        .select(`
            patient_id,
            patient_name,
            appointment_date,
            appointment_time,
            appointment_status,
            appointment_veterinarian_id,
            is_active
        `)
        .eq("clinic_id", clinicId);

    if (error) {
        throw error;
    }

    const today = manilaDateTime.date;
    const tomorrow = addDays(today, 1);

    const appointmentTypes = [
        "APPOINTMENT_TOMORROW",
        "APPOINTMENT_TODAY",
        "APPOINTMENT_OVERDUE"
    ];

    for (const patient of patients || []) {
        const patientAlerts = existingAlerts.filter(alert =>
            alert.patient_id === patient.patient_id &&
            appointmentTypes.includes(alert.alert_type) &&
            alert.status === "active"
        );

        const appointmentStatus =
            String(patient.appointment_status || "")
                .trim()
                .toLowerCase();

        let expectedType = null;
        let severity = "medium";
        let message = "";

        // Ignore inactive patients and non-scheduled appointments.
        if (
            patient.is_active &&
            appointmentStatus === "scheduled" &&
            patient.appointment_date
        ) {
            const appointmentDate = patient.appointment_date;

            const appointmentTime =
                patient.appointment_time
                    ? String(patient.appointment_time).slice(0, 8)
                    : null;

            if (appointmentDate === tomorrow) {
                expectedType = "APPOINTMENT_TOMORROW";
                severity = "low";

                message =
                    `${patient.patient_name} has an appointment tomorrow` +
                    (appointmentTime ? ` at ${appointmentTime.slice(0, 5)}` : "") +
                    ".";
            } else if (appointmentDate === today) {
                let appointmentPassed = false;

                if (appointmentTime) {
                    const appointmentTimestamp = Date.parse(
                        `${appointmentDate}T${appointmentTime}+08:00`
                    );

                    appointmentPassed =
                        !Number.isNaN(appointmentTimestamp) &&
                        manilaDateTime.timestamp >= appointmentTimestamp;
                }

                if (appointmentPassed) {
                    expectedType = "APPOINTMENT_OVERDUE";
                    severity = "high";

                    message =
                        `${patient.patient_name}'s scheduled appointment time has passed. ` +
                        `Please update its appointment status.`;
                } else {
                    expectedType = "APPOINTMENT_TODAY";
                    severity = "medium";

                    message =
                        `${patient.patient_name} has an appointment today` +
                        (appointmentTime ? ` at ${appointmentTime.slice(0, 5)}` : "") +
                        ".";
                }
            } else if (appointmentDate < today) {
                expectedType = "APPOINTMENT_OVERDUE";
                severity = "high";

                message =
                    `${patient.patient_name}'s appointment scheduled for ` +
                    `${appointmentDate} has passed. Please update its status.`;
            }
        }

        // Resolve outdated appointment reminders.
        for (const alert of patientAlerts) {
            if (alert.alert_type !== expectedType) {
                await resolveAlert(alert);
            }
        }

        // Create or update the current reminder.
        if (expectedType) {
            await saveAlert(existingAlerts, {
                clinic_id: clinicId,
                item_id: null,
                patient_id: patient.patient_id,
                assigned_to:
                    patient.appointment_veterinarian_id || null,
                alert_type: expectedType,
                severity,
                message,
                current_stock: null,
                threshold: null
            });
        }
    }
}

// ======================================================
// RUN ALL CLINICS
// ======================================================

export async function runAlertChecks() {
    const manilaDateTime = getManilaDateTime();

    const { data: clinics, error } = await supabase
        .from("clinics")
        .select("clinic_id");

    if (error) {
        throw error;
    }

    for (const clinic of clinics || []) {
        try {
            const clinicId = clinic.clinic_id;

            const { data: existingAlerts, error: alertError } =
                await supabase
                    .from("alerts")
                    .select(`
                        alert_id,
                        clinic_id,
                        item_id,
                        patient_id,
                        alert_type,
                        status,
                        message,
                        is_read,
                        created_at
                    `)
                    .eq("clinic_id", clinicId);

            if (alertError) {
                throw alertError;
            }

            const alerts = existingAlerts || [];

            await checkInventoryAlerts(
                clinicId,
                alerts,
                manilaDateTime.date
            );

            await checkAppointmentAlerts(
                clinicId,
                alerts,
                manilaDateTime
            );

        } catch (error) {
            console.error(
                `Alert scheduler error for clinic ${clinic.clinic_id}:`,
                error.message
            );
        }
    }

    console.log(
        `[ALERT SCHEDULER] Completed check at ` +
        `${manilaDateTime.date} ${manilaDateTime.time} (Asia/Manila)`
    );
}

// ======================================================
// START AUTOMATIC SCHEDULER
// ======================================================

export function startAlertScheduler() {
    if (schedulerInterval) {
        console.log("[ALERT SCHEDULER] Already running.");
        return;
    }

    const runSafely = async () => {
        if (isRunning) {
            console.log("[ALERT SCHEDULER] Previous check still running.");
            return;
        }

        isRunning = true;

        try {
            await runAlertChecks();
        } catch (error) {
            console.error(
                "[ALERT SCHEDULER] Failed:",
                error
            );
        } finally {
            isRunning = false;
        }
    };

    console.log(
        "[ALERT SCHEDULER] Starting automatic checks every 60 seconds."
    );

    // Run immediately when the server starts.
    void runSafely();

    // Continue checking every 60 seconds.
    schedulerInterval = setInterval(
        runSafely,
        CHECK_INTERVAL
    );

    schedulerInterval.unref?.();
}
