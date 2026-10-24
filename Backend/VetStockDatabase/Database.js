// FILE: VetStockDatabase/init_database.js
// PURPOSE: Initialize VetStock PostgreSQL database

import dotenv from "dotenv";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

async function initializeDatabase() {
    console.log("Initializing VetStock PostgreSQL database...");

    /*
     * Supabase's Data API client is not intended to execute arbitrary
     * CREATE TABLE SQL directly.
     *
     * Therefore, schema.sql should be executed through:
     * Supabase Dashboard → SQL Editor
     *
     * This script simply verifies database connectivity.
     */

    const { error } = await supabase
        .from("roles")
        .select("role_id")
        .limit(1);

    if (error) {
        console.error("Database connection failed.");
        console.error(error.message);
        process.exit(1);
    }

    console.log("VetStock PostgreSQL database connection successful.");
}

initializeDatabase();