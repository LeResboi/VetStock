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

// ======================================================
// GET LATEST SAVED FORECAST
// GET /api/forecast-ai
// ======================================================

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
            const clinicId = req.user.clinic_id;

            if (!clinicId) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has no clinic assigned."
                });
            }

            const { data: savedForecast, error } =
                await supabase
                    .from("forecast_results")
                    .select(`
                        forecast_id,
                        forecast,
                        item_forecasts,
                        inventory_count,
                        transaction_count,
                        generated_at
                    `)
                    .eq("clinic_id", clinicId)
                    .order("generated_at", {
                        ascending: false
                    })
                    .limit(1)
                    .maybeSingle();

            if (error) {
                throw error;
            }

            // No forecast has been generated yet.
            if (!savedForecast) {
                return res.json({
                    success: true,
                    forecast_id: null,
                    forecast: null,
                    item_forecasts: [],
                    inventory_count: 0,
                    transaction_count: 0,
                    generated_at: null
                });
            }

            return res.json({
                success: true,
                forecast_id: savedForecast.forecast_id,
                forecast: savedForecast.forecast,
                item_forecasts: savedForecast.item_forecasts,
                inventory_count: savedForecast.inventory_count,
                transaction_count: savedForecast.transaction_count,
                generated_at: savedForecast.generated_at
            });

        } catch (error) {
            console.error("Saved forecast retrieval error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve the saved forecast."
            });
        }
    }
);

router.post(
    "/refresh",
    authenticateToken,
    requireRole(
        "Administrator",
        "Clinic Manager",
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

            const cutoff60Days = new Date(
                now.getTime() - 60 * DAY_MS
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
                        created_at,
                        inventory_batches (
                            quantity,
                            expiration_date,
                            is_active
                        )
                    `)
                    .eq("clinic_id", clinicId)
                    .eq("is_active", true);

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

                const itemCreatedAt = item.created_at
                    ? new Date(item.created_at)
                    : null;

                const itemAgeDays =
                    itemCreatedAt && !Number.isNaN(itemCreatedAt.getTime())
                        ? Math.floor(
                            (now.getTime() - itemCreatedAt.getTime()) / DAY_MS
                        )
                        : 0;

                return {
                    item_id: item.item_id,
                    name: item.item_name,
                    category: item.category,
                    created_at: item.created_at,
                    unit_of_measure: item.unit_of_measure,
                    current_stock: totalQuantity,
                    minimum_stock: Number(item.min_stock_level || 0),
                    reorder_point: Number(item.reorder_point || 0),
                    expiring_within_30_days: expiringWithin30Days,
                    expired_batch_count: expiredBatchCount,
                    item_age_days: itemAgeDays
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
                const pageSize = 1000;
                let from = 0;
                let hasMore = true;

                while (hasMore) {
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
                        .gte("created_at", cutoff60Days.toISOString())
                        .lte("created_at", now.toISOString())
                        .order("created_at", {
                            ascending: false
                        })
                        .range(from, from + pageSize - 1);

                    if (transactionError) {
                        throw transactionError;
                    }

                    const currentPage = transactions || [];

                    transactionSummary.push(...currentPage);

                    hasMore = currentPage.length === pageSize;
                    from += pageSize;
                }
            }


            // ==============================================
            // 4. CALCULATE NUMERICAL DEMAND FORECASTS
            // ==============================================

            function isStockOutTransaction(type) {
                return String(type || "").trim().toUpperCase() === "OUT";
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
                        transaction.date >= cutoff60Days &&
                        transaction.date <= now &&
                        transaction.quantity > 0
                    );

                // Get all recorded transaction dates for this item.
                const itemTransactionDates = transactionSummary
                    .filter(transaction =>
                        transaction.item_id === item.item_id &&
                        transaction.created_at
                    )
                    .map(transaction => new Date(transaction.created_at))
                    .filter(date =>
                        !Number.isNaN(date.getTime()) &&
                        date >= cutoff60Days &&
                        date <= now
                    );

                const earliestTransactionTime =
                    itemTransactionDates.length > 0
                        ? Math.min(
                            ...itemTransactionDates.map(date => date.getTime())
                        )
                        : null;

                // Estimate how far back recorded transactions extend.
                const historyCoverageDays =
                    earliestTransactionTime === null
                        ? 0
                        : Math.min(
                            60,
                            Math.floor(
                                (now.getTime() - earliestTransactionTime) / DAY_MS
                            ) + 1
                        );

                // Divide the 60-day period into two 30-day periods.
                const previous30Days = stockOuts.filter(
                    transaction => transaction.date < cutoff30Days
                );

                const recent30Days = stockOuts.filter(
                    transaction => transaction.date >= cutoff30Days
                );

                // Calculate recorded consumption.
                const total60Days = stockOuts.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                const actualPrevious30Days = previous30Days.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                const actualRecent30Days = recent30Days.reduce(
                    (total, transaction) => total + transaction.quantity,
                    0
                );

                // Check whether recorded transactions span the full 60-day period.
                // This does not guarantee that every transaction was recorded.
                const has60DayTransactionSpan =
                    historyCoverageDays >= 60 &&
                    item.item_age_days >= 60;

                const hasDemandHistory =
                    has60DayTransactionSpan &&
                    stockOuts.length > 0 &&
                    total60Days > 0;

                const currentStock = Number(item.current_stock) || 0;

                // Average daily demand over the previous 60 days.
                const avgDailyDemand = hasDemandHistory
                    ? total60Days / 60
                    : null;

                // Project demand for the next 30 days.
                const forecastNext30Days = hasDemandHistory
                    ? roundToTwo(avgDailyDemand * 30)
                    : null;

                // Estimate days until available stock runs out.
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

                // Backtest: use the first 30 days to predict
                // the actual demand in the latest 30 days.
                const backtestPrediction =
                    has60DayTransactionSpan && actualPrevious30Days > 0
                        ? roundToTwo(actualPrevious30Days)
                        : null;

                const backtestAbsoluteError =
                    backtestPrediction !== null
                        ? roundToTwo(
                            Math.abs(backtestPrediction - actualRecent30Days)
                        )
                        : null;

                // Compare daily consumption between both periods.
                const previousDailyDemand = actualPrevious30Days / 30;
                const recentDailyDemand = actualRecent30Days / 30;

                let demandTrend = "Insufficient comparison history";

                if (previousDailyDemand > 0) {
                    if (recentDailyDemand > previousDailyDemand * 1.2) {
                        demandTrend = "Increasing";
                    } else if (recentDailyDemand < previousDailyDemand * 0.8) {
                        demandTrend = "Decreasing";
                    } else {
                        demandTrend = "Stable";
                    }
                } else if (recentDailyDemand > 0) {
                    demandTrend = "Newly recorded demand; insufficient baseline";
                } else if (has60DayTransactionSpan) {
                    demandTrend =
                        "No OUT transactions recorded; demand cannot be confirmed";
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
                    unit_of_measure: item.unit_of_measure,

                    current_stock: currentStock,
                    minimum_stock: item.minimum_stock,
                    reorder_point: item.reorder_point,

                    expiring_within_30_days: item.expiring_within_30_days,
                    expired_batch_count: item.expired_batch_count,

                    historical_stock_out_transaction_count: stockOuts.length,

                    historical_stock_out_units_60_days:
                        roundToTwo(total60Days),

                    actual_stock_out_units_previous_30_days:
                        roundToTwo(actualPrevious30Days),

                    actual_stock_out_units_recent_30_days:
                        roundToTwo(actualRecent30Days),

                    average_daily_demand_60_days: hasDemandHistory
                        ? roundToTwo(avgDailyDemand)
                        : null,

                    estimated_demand_next_30_days: forecastNext30Days,

                    estimated_days_until_stockout: daysUntilStockOut,

                    potential_shortfall_next_30_days: potentialShortfall,

                    projected_remaining_stock_after_30_days:
                        projectedRemainingStock,

                    demand_trend: demandTrend,

                    risk_status: riskStatus,

                    history_coverage_days: historyCoverageDays,

                    history_status: has60DayTransactionSpan
                        ? "Recorded transactions span 60 days; completeness not verified"
                        : "Insufficient recorded transaction span",

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

            // Prepare a compact version of the forecasts for OpenAI.
            // The complete itemForecasts array will still be saved to Supabase.

            const aiForecastSummary = itemForecasts.map(item => ({
                name: item.name,
                category: item.category,
                unit: item.unit_of_measure,

                current_stock: item.current_stock,
                minimum_stock: item.minimum_stock,
                reorder_point: item.reorder_point,

                expiring_batches: item.expiring_within_30_days,
                expired_batches: item.expired_batch_count,

                stock_out_count: item.historical_stock_out_transaction_count,
                consumption_60_days: item.historical_stock_out_units_60_days,

                previous_30_days: item.actual_stock_out_units_previous_30_days,
                recent_30_days: item.actual_stock_out_units_recent_30_days,

                average_daily_demand: item.average_daily_demand_60_days,
                projected_demand_30_days: item.estimated_demand_next_30_days,
                days_until_stockout: item.estimated_days_until_stockout,

                potential_shortfall: item.potential_shortfall_next_30_days,
                projected_remaining_stock:
                    item.projected_remaining_stock_after_30_days,

                demand_trend: item.demand_trend,
                risk_status: item.risk_status,

                history_coverage_days: item.history_coverage_days,
                history_status: item.history_status,

                backtest_predicted: item.backtest.predicted_demand_last_30_days,
                backtest_actual: item.backtest.actual_demand_last_30_days,
                backtest_error: item.backtest.absolute_error_units
            }));

            const prompt = `
You are VetStock AI, a veterinary inventory demand analysis assistant.

Your responsibility is to analyze the clinic's inventory information and interpret the numerical forecasts calculated by the VetStock backend.

IMPORTANT ANALYSIS RULES:

1. Use only the inventory and forecast data provided.
2. Never invent stock quantities, demand, transactions, dates, or predictions.
3. Treat all backend-calculated numerical forecasts as authoritative.
4. Never modify, recalculate, or contradict backend forecast values.
5. Distinguish recorded stock consumption from projected demand.
6. Do not treat stock-in transactions as medicine consumption.
7. Do not interpret missing transaction records as zero demand.
8. Clearly identify items with insufficient historical data.
9. Base restocking recommendations on current usable stock, minimum stock levels, reorder points, and projected demand.
10. Consider expiration risks separately from stock shortage risks.
11. Never invent recommended purchase quantities, supplier details, or delivery dates.
12. Explain uncertainty whenever historical data is incomplete.
13. A 60-day transaction span does not prove that all transactions were recorded. Do not describe historical records as complete or verified.
14. The expiring_within_30_days and expired_batch_count fields represent the number of batches, not the quantity of medicine. Never describe these values as medicine units.

FORECASTING PERIODS:

- Historical demand analysis: Previous 60 days.
- Demand comparison: Previous 30 days versus most recent 30 days.
- Future demand projection: Next 30 days.
- Expiration monitoring: Next 30 days.

REPORT FORMAT:

## Demand Overview

Summarize recorded medicine consumption over the previous 60 days.

Discuss demand trends using the comparison between the previous 30 days and the latest 30 days.

Explain projected demand for the next 30 days.

Identify medicines with increasing, decreasing, or stable demand only when supported by the supplied data.

Clearly identify medicines without sufficient historical information.

## Restocking Recommendations

Prioritize medicines based on:

- Items with zero usable stock.
- Items at or below their minimum stock level.
- Items at or below their reorder point.
- Items with projected shortages within the next 30 days.

Explain why each item requires attention using its actual stock levels and calculated forecasts.

Do not invent reorder quantities.

## Stock and Expiration Risks

Identify:

- Medicines with critically low or zero usable stock.
- Medicines with expired batches.
- Medicines with batches expiring within 30 days.
- Medicines with projected stock shortages.

Do not count expired batches as usable inventory.

Do not confuse expiring stock with already expired stock.

## Forecast Accuracy

Explain the backend backtesting results.

Compare the predicted demand for the latest 30 days against the actual recorded demand during that period.

Describe the difference between predicted and actual demand using the supplied absolute error. Do not classify an error as large or small using an arbitrary threshold.

Do not claim that a forecast is accurate without supporting evidence.

## Forecast Limitations

Explain limitations such as:

- Insufficient transaction history.
- Missing or inconsistent stock transaction records.
- Unusual changes in medicine consumption.
- Future deliveries not included in the projection.
- Seasonal demand changes not accounted for.

Clearly distinguish actual recorded information from estimated future demand.

WRITING REQUIREMENTS:

- Use clear, professional, and understandable language.
- Keep explanations concise and relevant.
- Prioritize the most urgent inventory concerns.
- Avoid repeating the same information across sections.
- Do not provide unsupported veterinary treatment recommendations.
- Never present an estimate as a confirmed future outcome.

CURRENT DATE:
${now.toISOString().slice(0, 10)}

BACKEND-CALCULATED FORECASTS:
${JSON.stringify(aiForecastSummary)}

If the inventory is empty, explain that inventory records must be added before inventory recommendations can be generated.

If historical transaction data is unavailable, explain that reliable demand forecasting is not yet possible.
`;


            const response = await openai.responses.create({
                model,
                input: prompt,
                max_output_tokens: 1200
            });

            const forecast = response.output_text?.trim();

            if (!forecast) {
                throw new Error(
                    "OpenAI returned an empty forecast."
                );
            }

            // ==============================================
            // 6. SAVE GENERATED FORECAST TO SUPABASE
            // ==============================================

            const { data: savedForecast, error: saveError } =
                await supabase
                    .from("forecast_results")
                    .insert({
                        clinic_id: clinicId,
                        forecast,
                        item_forecasts: itemForecasts,
                        inventory_count: inventorySummary.length,
                        transaction_count: transactionSummary.length
                    })
                    .select(`
                        forecast_id,
                        generated_at
                    `)
                    .single();

            if (saveError) {
                throw saveError;
            }

            // ==============================================
            // 7. RETURN RESULTS TO THE FRONTEND
            // ==============================================

            return res.json({
                success: true,
                forecast_id: savedForecast.forecast_id,
                forecast,
                item_forecasts: itemForecasts,
                inventory_count: inventorySummary.length,
                transaction_count: transactionSummary.length,
                generated_at: savedForecast.generated_at
            });

        } catch (error) {
            console.error("OpenAI forecast error:", error);

            if (error.status === 429) {
                const retryAfter = error.headers?.get("retry-after");

                return res.status(429).json({
                    success: false,
                    message: "AI forecasting is temporarily unavailable because the OpenAI rate limit has been reached. Please try again later.",
                    retry_after_seconds: retryAfter
                        ? Number(retryAfter)
                        : null
                });
            }

            return res.status(500).json({
                success: false,
                message: "Failed to generate AI forecast."
            });
        }
    }
);

export default router;