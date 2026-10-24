// FILE: VetStockDatabase/backup_database.js
// PURPOSE: Export VetStock PostgreSQL data to local JSON backup

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

const tablesToBackup = [
    "clinics",
    "roles",
    "users",
    "suppliers",
    "inventory_items",
    "inventory_batches",
    "patients",
    "health_records",
    "prescriptions",
    "prescription_items",
    "stock_transactions",
    "purchase_requests",
    "purchase_request_items",
    "alerts",
    "demand_forecasts",
    "audit_logs",
    "system_config"
];

async function backupDatabase() {
    console.log("Starting VetStock PostgreSQL backup...\n");

    const backupData = {};

    for (const table of tablesToBackup) {
        console.log(`Backing up ${table}...`);

        const { data, error } = await supabase
            .from(table)
            .select("*");

        if (error) {
            console.error(
                `Failed to backup ${table}: ${error.message}`
            );
            continue;
        }

        backupData[table] = data;

        console.log(
            `Saved ${data.length} records from ${table}.`
        );
    }

    const backupDirectory = path.join(
        __dirname,
        "..",
        "backup_data"
    );

    if (!fs.existsSync(backupDirectory)) {
        fs.mkdirSync(backupDirectory, {
            recursive: true
        });
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupPath = path.join(
        backupDirectory,
        `vetstock_backup_${timestamp}.json`
    );

    fs.writeFileSync(
        backupPath,
        JSON.stringify(backupData, null, 2)
    );

    console.log("\nBackup completed successfully.");
    console.log(`Backup file: ${backupPath}`);
}

backupDatabase().catch((error) => {
    console.error("Backup failed:", error);
    process.exit(1);
});