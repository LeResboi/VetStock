// FILE: VetStockDatabase/Supabase.js
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
// Never expose this key to React or browser code.
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

console.log("Supabase PostgreSQL client initialized.");