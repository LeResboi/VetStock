
/*
 * FILE: Routes/Forecast.js
 * PURPOSE: Generate VetStock demand insights using OpenAI.
 */

import express from "express";
import OpenAI from "openai";

import { supabase } from "../VetStockDatabase/Supabase.js";
import { authenticateToken } from "../Middleware/Authentication.js";
import { requireRole } from "../Middleware/Roles.js";

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
        "Inventory Staff",
        "Veterinarian"
    ),
    async (req, res) => {
        try {
            // ==============================================
            // 1. CHECK OPENAI CONFIGURATION
            // ==============================================

            const apiKey = process.env.OPENAI_API_KEY;

            if (!apiKey) {
                return res.status(500).json({
                    success: false,
                    message:
                        "OpenAI API key is missing from the backend environment."
                });
            }

            const openai = new OpenAI({ apiKey });

            const model =
                process.env.OPENAI_MODEL || "gpt-6-luna";

            const clinicId = req.user.clinic_id;

            if (!clinicId) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has no clinic assigned."
                });
            }

            const DAY_MS = 24 * 60 * 60 * 1000;
            const now = new Date();

            const cutoff90Days = new Date(
                now.getTime() - 90 * DAY_MS
            );

            const cutoff30Days = new Date(
                now.getTime() - 30 * DAY_MS
            );

            // ==============================================
            // 2. GET INVENTORY AND BATCH INFORMATION
            // ==============================================

            const { data: items, error: itemError } =
                await supabase
                    .from("inventory_items")
                    .select(`
                        item_id,
                        item_name,
                        category,
                        unit_of_measure,
                        min_stock_level,
                        reorder_point,
                        inventory_batches (
                            quantity,
                            expiration_date,
                            is_active
                        )
                    `)
                    .eq("clinic_id", clinicId);

            if (itemError) {
                throw itemError;
            }


            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const thirtyDaysFromToday = new Date(today);
            thirtyDaysFromToday.setDate(
                thirtyDaysFromToday.getDate() + 30
            );

            function parseBatchExpiry(expirationDate) {
                if (!expirationDate) return null;

                const dateText = String(expirationDate).slice(0, 10);
                const [year, month, day] = dateText.split("-").map(Number);

                if (!year || !month || !day) return null;

                const date = new Date(year, month - 1, day);

                return Number.isNaN(date.getTime()) ? null : date;
            }

            const inventorySummary = (items || []).map(item => {
                const batches = item.inventory_batches || [];

                // Only active batches can contribute to usable stock.
                const activeBatches = batches.filter(
                    batch => batch.is_active === true
                );

                const batchesWithExpiry = activeBatches.map(batch => ({
                    batch,
                    expiry: parseBatchExpiry(batch.expiration_date)
                }));

                // Exclude expired batches from the usable-stock total.
                // Batches without an expiration date remain included.
                const usableBatches = batchesWithExpiry.filter(
                    ({ expiry }) => !expiry || expiry >= today
                );

                const totalQuantity = usableBatches.reduce(
                    (total, { batch }) =>
                        total + Math.max(0, Number(batch.quantity) || 0),
                    0
                );

                const expiringWithin30Days = batchesWithExpiry.filter(
                    ({ expiry }) =>
                        expiry &&
                        expiry >= today &&
                        expiry <= thirtyDaysFromToday
                ).length;

                const expiredBatchCount = batchesWithExpiry.filter(
                    ({ expiry }) => expiry && expiry < today
                ).length;

                return {
                    item_id: item.item_id,
                    name: item.item_name,
                    category: item.category,
                    unit_of_measure: item.unit_of_measure,
                    current_stock: totalQuantity,
                    minimum_stock: Number(item.min_stock_level || 0),
                    reorder_point: Number(item.reorder_point || 0),
                    expiring_within_30_days: expiringWithin30Days,
                    expired_batch_count: expiredBatchCount
                };
            });


            // ==============================================
            // 3. GET STOCK TRANSACTION HISTORY
            // ==============================================

            let transactionSummary = [];

            const itemIds = (items || []).map(
                item => item.item_id
            );

            if (itemIds.length > 0) {
                const {
                    data: transactions,
                    error: transactionError
                } = await supabase
                    .from("stock_transactions")
                    .select(`
                        item_id,
                        transaction_type,
                        quantity,
                        created_at
                    `)
                    .in("item_id", itemIds)
                    .gte("created_at", cutoff90Days.toISOString())
                    .order("created_at", {
                        ascending: false
                    })
                    .limit(1000);

                if (transactionError) {
                    throw transactionError;
                }

                transactionSummary = transactions || [];
            }


            // ==============================================
            // 3. CALCULATE NUMERICAL DEMAND FORECASTS
            // ==============================================

            function isStockOutTransaction(type) {
                const normalized = String(type || "")
                    .toLowerCase()
                    .replace(/[_-]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                return [
                    "stock out",
                    "stockout",
                    "out",
                    "dispense",
                    "dispensed",
                    "consumption",
                    "consumed",
                    "used"
                ].includes(normalized);
            }

            function roundToTwo(value) {
                return Math.round((value + Number.EPSILON) * 100) / 100;
            }

            const itemForecasts = inventorySummary.map(item => {
                const stockOuts = transactionSummary
                    .filter(transaction =>
                        transaction.item_id === item.item_id &&
                        isStockOutTransaction(transaction.transaction_type) &&
                        transaction.created_at
                    )
                    .map(transaction => ({
                        date: new Date(transaction.created_at),
                        quantity: Math.abs(Number(transaction.quantity) || 0)
                    }))
                    .filter(transaction =>
                        !Number.isNaN(transaction.date.getTime()) &&
                        transaction.date >= cutoff90Days &&
                        transaction.date <= now &&
                        transaction.quantity > 0
                    );


                const itemTransactionDates = transactionSummary
                    .filter(transaction =>
                        transaction.item_id === item.item_id &&
                        transaction.created_at
                    )
                    .map(transaction => new Date(transaction.created_at))
                    .filter(date =>
                        !Number.isNaN(date.getTime()) &&
                        date >= cutoff90Days &&
                        date <= now
                    );

                const earliestTransactionTime =
                    itemTransactionDates.length > 0
                        ? Math.min(
                            ...itemTransactionDates.map(date => date.getTime())
                        )
                        : null;

                // Approximate how much of the 90-day observation window
                // has recorded transaction history for this item.
                const historyCoverageDays =
                    earliestTransactionTime === null
                        ? 0
                        : Math.min(
                            90,
                            Math.floor(
                                (now.getTime() - earliestTransactionTime) / DAY_MS
                            ) + 1
                        );

                // Split the history into the latest 30 days
                // and the preceding 60 days.
                const recent30Days = stockOuts.filter(
                    transaction => transaction.date >= cutoff30Days
                );

                const previous60Days = stockOuts.filter(
                    transaction => transaction.date < cutoff30Days
                );

                const total90Days = stockOuts.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                const actualRecent30Days = recent30Days.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                const actualPrevious60Days = previous60Days.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                // A missing history is not the same as zero demand.
                const hasComplete90DayHistory = historyCoverageDays >= 90;

                const hasDemandHistory =
                    hasComplete90DayHistory &&
                    stockOuts.length > 0 &&
                    total90Days > 0;

                const currentStock = Number(item.current_stock) || 0;

                const avgDailyDemand = hasDemandHistory
                    ? total90Days / 90
                    : null;
                // Baseline forecast: average daily usage over 90 days,
                // multiplied by the next 30 days.
                const forecastNext30Days = hasDemandHistory
                    ? roundToTwo(avgDailyDemand * 30)
                    : null;

                const daysUntilStockOut =
                    hasDemandHistory && avgDailyDemand > 0
                        ? roundToTwo(currentStock / avgDailyDemand)
                        : null;

                const potentialShortfall =
                    hasDemandHistory
                        ? roundToTwo(
                            Math.max(0, forecastNext30Days - currentStock)
                        )
                        : null;

                const projectedRemainingStock =
                    hasDemandHistory
                        ? roundToTwo(
                            Math.max(0, currentStock - forecastNext30Days)
                        )
                        : null;

                // Compare a forecast based on the previous 60 days
                // with the actual usage during the most recent 30 days.
                const backtestPrediction =
                    hasComplete90DayHistory && previous60Days.length > 0
                        ? roundToTwo((actualPrevious60Days / 60) * 30)
                        : null;

                const backtestAbsoluteError =
                    backtestPrediction !== null
                        ? roundToTwo(
                            Math.abs(backtestPrediction - actualRecent30Days)
                        )
                        : null;

                // Compare daily usage in the latest 30 days with the
                // daily usage in the preceding 60 days.
                const recentDailyDemand = actualRecent30Days / 30;
                const previousDailyDemand = actualPrevious60Days / 60;

                let demandTrend = "Insufficient comparison history";

                if (
                    previous60Days.length > 0 &&
                    recent30Days.length > 0
                ) {
                    if (
                        previousDailyDemand > 0 &&
                        recentDailyDemand > previousDailyDemand * 1.2
                    ) {
                        demandTrend = "Increasing";
                    } else if (
                        previousDailyDemand > 0 &&
                        recentDailyDemand < previousDailyDemand * 0.8
                    ) {
                        demandTrend = "Decreasing";
                    } else {
                        demandTrend = "Stable";
                    }
                } else if (
                    previous60Days.length > 0 &&
                    recent30Days.length === 0
                ) {
                    demandTrend = "No recent stock-outs recorded";
                } else if (
                    previous60Days.length === 0 &&
                    recent30Days.length > 0
                ) {
                    demandTrend = "Insufficient comparison history";
                }

                const restockThreshold = Math.max(
                    Number(item.minimum_stock) || 0,
                    Number(item.reorder_point) || 0
                );

                let riskStatus;

                if (currentStock <= 0) {
                    riskStatus = "No Stock";
                } else if (currentStock <= restockThreshold) {
                    riskStatus = "At or Below Restock Threshold";
                } else if (
                    hasDemandHistory &&
                    forecastNext30Days >= currentStock
                ) {
                    riskStatus = "Potential Shortage Within 30 Days";
                } else if (!hasDemandHistory) {
                    riskStatus = "Insufficient Demand History";
                } else {
                    riskStatus = "No Shortfall Projected by Baseline";
                }

                return {
                    item_id: item.item_id,
                    name: item.name,
                    category: item.category,

                    current_stock: currentStock,
                    minimum_stock: item.minimum_stock,
                    reorder_point: item.reorder_point,

                    historical_stock_out_transaction_count: stockOuts.length,
                    historical_stock_out_units_90_days: roundToTwo(total90Days),
                    actual_stock_out_units_recent_30_days:
                        roundToTwo(actualRecent30Days),

                    average_daily_demand_90_days: hasDemandHistory
                        ? roundToTwo(avgDailyDemand)
                        : null,

                    estimated_demand_next_30_days: forecastNext30Days,
                    estimated_days_until_stockout: daysUntilStockOut,
                    potential_shortfall_next_30_days: potentialShortfall,
                    projected_remaining_stock_after_30_days:
                        projectedRemainingStock,

                    demand_trend: demandTrend,
                    risk_status: riskStatus,

                    // ADD THESE TWO FIELDS HERE
                    history_coverage_days: historyCoverageDays,

                    history_status: hasComplete90DayHistory
                        ? "Sufficient recorded history"
                        : "Insufficient recorded history",

                    backtest: {
                        predicted_demand_last_30_days:
                            backtestPrediction,
                        actual_demand_last_30_days:
                            roundToTwo(actualRecent30Days),
                        absolute_error_units:
                            backtestAbsoluteError
                    }
                };
            });

            // ==============================================
            // 4. ASK OPENAI TO ANALYZE THE CLINIC'S DATA
            // ==============================================

            const prompt = `
You are VetStock's veterinary inventory demand analysis assistant.

Analyze only the inventory and stock transaction data provided.

IMPORTANT RULES:
- Use only the supplied data.
- Never invent stock quantities, transactions, dates, or usage rates.
- Distinguish current stock from historical demand.
- Do not treat stock-in transactions as medicine consumption.
- Use transaction dates and transaction types when discussing demand.
- If transaction types do not clearly identify stock-in and stock-out,
  explain that limitation.
- Do not present an unsupported estimate as a reliable prediction.
- Base restocking recommendations on the supplied stock levels,
  minimum stock levels, reorder points, and transaction history.
- Explain when more historical consumption data is needed.

Write a clear report using exactly these Markdown sections:

## Demand Overview
Summarize demand patterns supported by the dated transaction history.
Discuss possible trends only when the data supports them.
State when the historical data is insufficient for a reliable forecast.

## Restocking Recommendations
Identify items at or below their minimum stock or reorder point.
Explain the evidence behind each recommendation.
Do not invent recommended quantities.

## Stock and Expiration Risks
Identify low-stock items and items with batches expiring within
30 days. Do not claim an item has expired unless the supplied data
supports that conclusion.

## Forecast Limitations
Describe missing or insufficient historical data.
Clearly distinguish observed information from estimates.
Recommend what additional data would improve forecasting.

Inventory data:
${JSON.stringify(inventorySummary, null, 2)}

Stock transaction history:
${JSON.stringify(transactionSummary, null, 2)}

Numerical baseline forecasts calculated by the backend:
${JSON.stringify(itemForecasts, null, 2)}

The backend-calculated numerical forecasts are the authoritative
baseline numbers. Explain them, but do not change or invent their
values.

Explain that the 30-day demand estimates use the average daily
stock-out quantity over the last 90 days.

Discuss the backtest by comparing the prediction made from the
previous 60 days with the actual stock-out quantity in the most
recent 30 days. A large absolute error indicates that the baseline
may not predict demand accurately for that item.

If there is insufficient transaction history, say so clearly.
These estimates do not account for future deliveries, sudden
demand changes, or seasonal patterns.

Current date:
${new Date().toISOString().slice(0, 10)}

If there are no inventory items, explain that inventory must be added
before stock recommendations can be made.

If there are no stock transactions, clearly state that historical
demand cannot yet be evaluated reliably.
`;

            const response = await openai.responses.create({
                model,
                input: prompt,
                max_output_tokens: 1800
            });

            const forecast = response.output_text?.trim();

            if (!forecast) {
                throw new Error(
                    "OpenAI returned an empty forecast."
                );
            }

            // ==============================================
            // 5. RETURN RESULTS TO THE FRONTEND
            // ==============================================

            return res.json({
                success: true,
                forecast,
                item_forecasts: itemForecasts,
                inventory_count: inventorySummary.length,
                transaction_count: transactionSummary.length,
                generated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error("OpenAI forecast error:", error);

            return res.status(500).json({
                success: false,
                message:
                    "Failed to generate the AI forecast. Check the backend logs for details."
            });
        }
    }
);

export default router;