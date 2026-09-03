import { collection, getDocs, setDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "./Firebase.js";

// Helper function to safely convert old strings to Firestore Timestamps
const safeTimestamp = (dateString) => {
    if (!dateString) return Timestamp.now();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? Timestamp.now() : Timestamp.fromDate(date);
};

async function migrateDatabase() {
    console.log(" Starting Database Migration from Old Schema to New Schema...\n");

    try {
        // ============================================================
        // 1. MIGRATE USERS: FROM "users_id" TO "users"
        // ============================================================
        console.log("Migrating users...");
        const usersSnapshot = await getDocs(collection(db, "users_id"));
        let userCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const data = userDoc.data();
            // Write to NEW collection
            await setDoc(doc(db, "users", userDoc.id), {
                uid: userDoc.id,
                email: data.email || "",
                displayName: data.username || "Unknown",
                role: data.role || "staff",
                clinicId: "",
                isActive: true,
                createdAt: safeTimestamp(data.created_at),
                updatedAt: Timestamp.now(),
                lastLogin: null
            });
            // DELETE from OLD collection
            await deleteDoc(doc(db, "users_id", userDoc.id));
            userCount++;
        }
        console.log(`Migrated ${userCount} users\n`);

        // ============================================================
        // 2. MIGRATE INVENTORY: FROM "item_id" TO "inventory"
        // ============================================================
        console.log("Migrating inventory...");
        const inventorySnapshot = await getDocs(collection(db, "item_id"));
        let itemCount = 0;
        
        for (const itemDoc of inventorySnapshot.docs) {
            const data = itemDoc.data();
            
            // Write to NEW collection
            await setDoc(doc(db, "inventory", itemDoc.id), {
                itemId: itemDoc.id,
                itemName: data.item_name || "",
                category: data.category || "",
                unitOfMeasure: "",
                unitPrice: parseFloat(data.unit_price) || 0,
                costPrice: 0,
                stockQuantity: parseInt(data.stock_quantity) || 0,
                minStockLevel: 0,
                maxStockLevel: 0,
                reorderPoint: 0,
                supplier: "",
                batchNumber: "",
                expirationDate: safeTimestamp(data.expiration_date),
                storageConditions: "",
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // DELETE from OLD collection
            await deleteDoc(doc(db, "item_id", itemDoc.id));
            itemCount++;
        }
        console.log(`Migrated ${itemCount} inventory items\n`);

        // ============================================================
        // 3. MIGRATE HEALTH RECORDS: FROM "health_records" TO "health_records"
        // (And create a basic "patients" collection from old patient_name data)
        // ============================================================
        console.log("Migrating health records...");
        const healthSnapshot = await getDocs(collection(db, "health_records"));
        let healthCount = 0;
        
        for (const recordDoc of healthSnapshot.docs) {
            const data = recordDoc.data();
            const oldPatientId = data.patient_name ? `legacy_patient_${recordDoc.id}` : "unassigned";

            // Create the patient in the new 'patients' collection
            if (data.patient_name) {
                await setDoc(doc(db, "patients", oldPatientId), {
                    patientId: oldPatientId,
                    patientName: data.patient_name || "",
                    species: "",
                    breed: "",
                    dateOfBirth: null,
                    gender: "",
                    isNeutered: false,
                    microchipNumber: "",
                    ownerName: data.owner_details || "",
                    ownerPhone: "",
                    ownerEmail: "",
                    clinicId: "",
                    isActive: true,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }

            // Write to NEW health_records collection
            await setDoc(doc(db, "health_records", recordDoc.id), {
                recordId: recordDoc.id,
                patientId: oldPatientId,
                veterinarianId: data.user_id ? data.user_id : "unassigned",
                visitDate: safeTimestamp(data.consultation_date),
                diagnosis: data.diagnosis || "",
                symptoms: [],
                treatmentNotes: data.treatment_notes || "",
                medications: [],
                followUpDate: null,
                status: "active",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // DELETE from OLD collection
            await deleteDoc(doc(db, "health_records", recordDoc.id));
            healthCount++;
        }
        console.log(`Migrated ${healthCount} health records\n`);

        // ============================================================
        // 4. MIGRATE STOCK TRANSACTIONS
        // (Note: Old code used references, new code uses string IDs)
        // ============================================================
        console.log("Migrating stock transactions...");
        const transSnapshot = await getDocs(collection(db, "stock_transactions"));
        let transCount = 0;
        
        for (const transDoc of transSnapshot.docs) {
            const data = transDoc.data();
            
            await setDoc(doc(db, "stock_transactions", transDoc.id), {
                transactionId: transDoc.id,
                itemId: data.item_id ? data.item_id : "", 
                userId: data.user_id ? data.user_id : "",
                transactionType: data.transaction || "unknown",
                quantity: parseInt(data.quantity) || 0,
                previousStock: 0,
                newStock: 0,
                unitPrice: 0,
                totalValue: 0,
                patientId: "",
                prescriptionId: "",
                reason: "",
                ipAddress: "",
                deviceInfo: "",
                createdAt: safeTimestamp(data.timestamp)
            });

            await deleteDoc(doc(db, "stock_transactions", transDoc.id));
            transCount++;
        }
        console.log(`Migrated ${transCount} transactions\n`);

        // ============================================================
        // 5. MIGRATE ALERTS
        // ============================================================
        console.log("Migrating alerts...");
        const alertsSnapshot = await getDocs(collection(db, "alerts"));
        let alertCount = 0;
        
        for (const alertDoc of alertsSnapshot.docs) {
            const data = alertDoc.data();
            
            await setDoc(doc(db, "alerts", alertDoc.id), {
                alertId: alertDoc.id,
                itemId: data.item_id ? data.item_id : "",
                userId: data.user_id ? data.user_id : "",
                alertType: data.alert_type || "",
                severity: "medium",
                message: "",
                currentStock: 0,
                threshold: 0,
                status: data.status || "active",
                assignedTo: "",
                createdAt: safeTimestamp(data.created_at),
                resolvedAt: null,
                resolutionNotes: ""
            });

            await deleteDoc(doc(db, "alerts", alertDoc.id));
            alertCount++;
        }
        console.log(`Migrated ${alertCount} alerts\n`);

        // ============================================================
        // 6. MIGRATE DEMAND FORECASTS
        // ============================================================
        console.log("Migrating demand forecasts...");
        const forecastSnapshot = await getDocs(collection(db, "demand_forecasting"));
        let forecastCount = 0;
        
        for (const forecastDoc of forecastSnapshot.docs) {
            const data = forecastDoc.data();
            
            await setDoc(doc(db, "demand_forecasts", forecastDoc.id), {
                forecastId: forecastDoc.id,
                itemId: data.item_id ? data.item_id : "",
                forecastPeriod: "",
                historicalData: data.history_data ? { old: data.history_data } : {},
                predictedDemand: parseFloat(data.pred_demand) || 0,
                confidenceInterval: { lower: 0, upper: 0 },
                seasonalityFactor: 0,
                recommendedOrderQuantity: 0,
                recommendedOrderDate: null,
                modelVersion: "legacy_migrated",
                forecastDate: safeTimestamp(data.forecast_date),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            await deleteDoc(doc(db, "demand_forecasting", forecastDoc.id));
            forecastCount++;
        }
        console.log(`Migrated ${forecastCount} forecasts\n`);

        // ============================================================
        // 7. CHECK FOR NEW COLLECTIONS (Empty)
        // ============================================================
        console.log(" Creating new collections (if not already exists)...");
        console.log(" patients, suppliers, prescriptions, purchase_requests, system_config\n");

        // ============================================================
        // COMPLETE
        // ============================================================
        console.log(" MIGRATION COMPLETED SUCCESSFULLY!");
        console.log(" SUMMARY:");
        console.log(`   - Users: ${userCount}`);
        console.log(`   - Inventory: ${itemCount}`);
        console.log(`   - Health Records: ${healthCount}`);
        console.log(`   - Transactions: ${transCount}`);
        console.log(`   - Alerts: ${alertCount}`);
        console.log(`   - Forecasts: ${forecastCount}`);
        console.log("\n Your old collections have been deleted. You are now running the clean, modern NoSQL structure!");
        
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrateDatabase();