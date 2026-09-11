import { supabase } from "./VetStockDatabase/Supabase.js";

async function testConnection() {
    console.log("Testing Supabase connection...");

    const { data, error } = await supabase
        .from("roles")
        .select("*")
        .limit(5);

    if (error) {
        console.error("Supabase connection failed:");
        console.error(error.message);
        process.exit(1);
    }

    console.log("Supabase connection successful!");
    console.log("Roles:", data);
}

testConnection();