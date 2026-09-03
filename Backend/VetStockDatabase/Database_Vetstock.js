// FILE: VetStockDatabase/Database_Vetstock.js
// PURPOSE: Create database structure (empty data)
// RUN: node Database_Vetstock.js

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./Firebase.js";

async function init() {
    console.log("Initializing VetStock Database...");

    // ============================================================
    // USERS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "users", "user_placeholder"),
        {
            uid: "user_placeholder",
            email: "",
            displayName: "",
            role: "",
            clinicId: "",
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            lastLogin: null
        }
    );
    console.log(" Users collection created");

    // ============================================================
    // INVENTORY COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "inventory", "item_placeholder"),
        {
            itemId: "item_placeholder",
            itemName: "",
            category: "",
            unitOfMeasure: "",
            unitPrice: 0,
            costPrice: 0,
            stockQuantity: 0,
            minStockLevel: 0,
            maxStockLevel: 0,
            reorderPoint: 0,
            supplier: "",
            batchNumber: "",
            expirationDate: null,
            storageConditions: "",
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Inventory collection created");

    // ============================================================
    // PATIENTS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "patients", "patient_placeholder"),
        {
            patientId: "patient_placeholder",
            patientName: "",
            species: "",
            breed: "",
            dateOfBirth: null,
            gender: "",
            isNeutered: false,
            microchipNumber: "",
            ownerName: "",
            ownerPhone: "",
            ownerEmail: "",
            clinicId: "",
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Patients collection created");

    // ============================================================
    // SUPPLIERS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "suppliers", "supplier_placeholder"),
        {
            supplierId: "supplier_placeholder",
            supplierName: "",
            contactPerson: "",
            phone: "",
            email: "",
            address: "",
            performanceRating: 0,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Suppliers collection created");

    // ============================================================
    // HEALTH RECORDS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "health_records", "record_placeholder"),
        {
            recordId: "record_placeholder",
            patientId: "patient_placeholder",
            veterinarianId: "user_placeholder",
            visitDate: Timestamp.now(),
            diagnosis: "",
            symptoms: [],
            treatmentNotes: "",
            medications: [],
            followUpDate: null,
            status: "active",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Health Records collection created");

    // ============================================================
    // PRESCRIPTIONS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "prescriptions", "presc_placeholder"),
        {
            prescriptionId: "presc_placeholder",
            patientId: "patient_placeholder",
            veterinarianId: "user_placeholder",
            items: [],
            status: "",
            issuedDate: Timestamp.now(),
            expiryDate: null,
            refills: 0,
            maxRefills: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Prescription collection created");

    // ============================================================
    // STOCK TRANSACTIONS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "stock_transactions", "trans_placeholder"),
        {
            transactionId: "trans_placeholder",
            itemId: "item_placeholder",
            userId: "user_placeholder",
            transactionType: "",
            quantity: 0,
            previousStock: 0,
            newStock: 0,
            unitPrice: 0,
            totalValue: 0,
            patientId: "",
            prescriptionId: "",
            reason: "",
            ipAddress: "",
            deviceInfo: "",
            createdAt: Timestamp.now()
        }
    );
    console.log(" Stock Transactions collection created");

    // ============================================================
    // PURCHASE REQUESTS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "purchase_requests", "request_placeholder"),
        {
            requestId: "request_placeholder",
            clinicId: "",
            itemId: "item_placeholder",
            quantity: 0,
            urgency: "",
            status: "",
            purpose: "",
            requestedBy: "user_placeholder",
            approvedBy: "",
            notes: "",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            fulfilledAt: null
        }
    );
    console.log(" Purchase Records collection created");

    // ============================================================
    // ALERTS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "alerts", "alert_placeholder"),
        {
            alertId: "alert_placeholder",
            itemId: "item_placeholder",
            userId: "user_placeholder",
            alertType: "",
            severity: "",
            message: "",
            currentStock: 0,
            threshold: 0,
            status: "",
            assignedTo: "user_placeholder",
            createdAt: Timestamp.now(),
            resolvedAt: null,
            resolutionNotes: ""
        }
    );
    console.log(" Alerts collection created");

    // ============================================================
    // DEMAND FORECASTS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "demand_forecasts", "forecast_placeholder"),
        {
            forecastId: "forecast_placeholder",
            itemId: "item_placeholder",
            forecastPeriod: "",
            historicalData: {},
            predictedDemand: 0,
            confidenceInterval: { lower: 0, upper: 0 },
            seasonalityFactor: 0,
            recommendedOrderQuantity: 0,
            recommendedOrderDate: null,
            modelVersion: "",
            forecastDate: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    );
    console.log(" Demand Forecasting collections created");

    // ============================================================
    // AUDIT LOGS COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "audit_logs", "log_placeholder"),
        {
            logId: "log_placeholder",
            userId: "user_placeholder",
            action: "",
            targetId: "",
            targetCollection: "",
            details: {},
            ipAddress: "",
            userAgent: "",
            createdAt: Timestamp.now()
        }
    );
    console.log(" Audit logs collection created");

    // ============================================================
    // SYSTEM CONFIG COLLECTION
    // ============================================================
    await setDoc(
        doc(db, "system_config", "config_001"),
        {
            configId: "config_001",
            reorderPointDefault: 0,
            lowStockThreshold: 0,
            expiryWarningDays: 0,
            forecastModel: "",
            backupSchedule: "",
            clinicName: "",
            clinicAddress: "",
            clinicPhone: "",
            clinicEmail: "",
            updatedAt: Timestamp.now()
        }
    );
    console.log(" System Config collection created");
}

init();