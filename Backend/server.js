// FILE: server.js
// PURPOSE: Main Express server for VetStock

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./Routes/Auth.js";
import inventoryRoutes from "./Routes/Inventory.js";
import stockTransactionRoutes from "./Routes/Stock_Transactions.js";
import alertRoutes from "./Routes/Alerts.js";
import healthRecordsRoutes from "./Routes/Health_Records.js";
import patientRoutes from "./Routes/Patients.js";
import reportsRoutes from "./Routes/Reports.js";


dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());
app.use(
    "/api/stock-transactions",
    stockTransactionRoutes
);

// ============================================================
// BASIC TEST ROUTE
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "VetStock API is running."
    });
});

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/health-records", healthRecordsRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/reports", reportsRoutes);

app.use(
    "/api/stock-transactions",
    stockTransactionRoutes
);

app.use("/api/alerts", alertRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`VetStock API running on http://localhost:${3001}`);
});