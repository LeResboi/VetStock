// FILE: VetStockDatabase/Backup_Data.js
// PURPOSE: Free local backup of old schema
// RUN: node Backup_Data.js

import { collection, getDocs } from "firebase/firestore";
import { db } from "./Firebase.js";
import fs from "fs";

// List all the OLD collections you want to back up
const collectionsToBackup = [
    "users_id", 
    "item_id", 
    "health_records", 
    "stock_transactions", 
    "alerts", 
    "demand_forecasting", 
    "audit_logs"
];

async function backupDatabase() {
    console.log(" Starting free local backup...");
    
    let backupData = {};

    for (const colName of collectionsToBackup) {
        console.log(` Backing up collection: ${colName}...`);
        
        try {
            const querySnapshot = await getDocs(collection(db, colName));
            let docsData = {};
            
            querySnapshot.forEach((doc) => {
                docsData[doc.id] = doc.data();
            });

            backupData[colName] = docsData;
            console.log(`Saved ${querySnapshot.size} documents.`);
            
        } catch (error) {
            console.log(`Collection "${colName}" not found, skipping.`);
        }
    }

    fs.writeFileSync("backup_data.json", JSON.stringify(backupData, null, 2));
    console.log("\n🎉 Backup complete! Look for 'backup_data.json' in your VetStockDatabase folder.");
}

backupDatabase();