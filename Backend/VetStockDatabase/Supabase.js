// FILE: VetStockDatabase/supabase.js
// PURPOSE: Supabase PostgreSQL connection for the VetStock backend

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is missing from .env");
}

if (!SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_SECRET_KEY is missing from .env");
}

// SERVER ONLY
// This key has elevated privileges and must NEVER be exposed to React/browser code.
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

console.log("Supabase PostgreSQL client initialized.");