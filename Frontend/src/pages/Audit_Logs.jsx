// FILE: Frontend/src/pages/AuditLogs.jsx
// PURPOSE: Administrator audit activity monitoring

import React, { useEffect, useMemo, useState } from "react";
import "./Audit_Logs.css";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAction, setSelectedAction] = useState("All");
    const [pageSize, setPageSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    // ============================================================
    // FETCH AUDIT LOGS
    // ============================================================

    useEffect(() => {
        const controller = new AbortController();

        const fetchAuditLogs = async () => {
            try {
                setLoading(true);
                setError("");

                const token = localStorage.getItem("token");

                if (!token) {
                    setError("Please log in to view audit logs.");
                    return;
                }

                const response = await fetch(
                    "http://localhost:3001/api/audit-logs",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        signal: controller.signal
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Failed to retrieve audit logs."
                    );
                }

                setLogs(Array.isArray(result.data) ? result.data : []);

            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Audit logs error:", err);
                    setError(err.message || "Unable to load audit logs.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchAuditLogs();

        return () => controller.abort();
    }, []);

    // ============================================================
    // STATISTICS
    // ============================================================

    const loginCount = logs.filter(
        log => log.action?.toUpperCase() === "LOGIN"
    ).length;

    const usersWithActivity = new Set(
        logs.map(log => log.user_id).filter(Boolean)
    ).size;

    // ============================================================
    // FILTER AUDIT LOGS
    // ============================================================

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const search = searchTerm.toLowerCase();

            const matchesSearch = [
                log.username,
                log.role,
                log.action,
                log.target_table,
                log.target_id,
                log.details?.description
            ].some(value =>
                String(value || "").toLowerCase().includes(search)
            );

            const matchesAction =
                selectedAction === "All" ||
                log.action?.toUpperCase() === selectedAction.toUpperCase();

            return matchesSearch && matchesAction;
        });
    }, [logs, searchTerm, selectedAction]);

    // ============================================================
    // PAGINATION
    // ============================================================

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedAction, pageSize]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredLogs.length / pageSize)
    );

    const startIndex = (currentPage - 1) * pageSize;

    const paginatedLogs = filteredLogs.slice(
        startIndex,
        startIndex + pageSize
    );

    // ============================================================
    // FORMAT DATE AND TIME
    // ============================================================

    const formatDateTime = date => {
        if (!date) return "N/A";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "N/A";
        }

        return parsedDate.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // ============================================================
    // FORMAT MODULE NAME
    // ============================================================

    const formatModule = tableName => {
        if (!tableName) return "System";

        return tableName
            .replace(/_/g, " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());
    };


    // ============================================================
    // FORMAT ACTIVITY LABEL
    // ============================================================

    const formatAction = action => {
        if (!action) return "Unknown";

        const actionLabels = {
            USER_APPROVED: "Accepted",

            HEALTH_RECORD_CREATED: "Record Created",
            HEALTH_RECORD_UPDATED: "Record Updated",
            HEALTH_RECORD_DELETED: "Record Deleted",
            FOLLOWUP_SCHEDULED: "Follow-up Scheduled",
            FOLLOWUP_UPDATED: "Follow-up Updated",

            PATIENT_CREATED: "Patient Created",
            PATIENT_UPDATED: "Patient Updated",
            PATIENT_DEACTIVATED: "Patient Deactivated"
        };

        return actionLabels[action.toUpperCase()] ||
            action.replace(/_/g, " ");
    };



    // ============================================================
    // FORMAT ACTIVITY DETAILS
    // ============================================================

    const formatDetails = (details, actionDescription) => {
        if (actionDescription) {
            return actionDescription;
        }
        if (!details) return "No additional details";
        if (typeof details === "string") {
            return details;
        }
        return (
            details.description ||
            JSON.stringify(details)
        );
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="audit-page">

            {/* PAGE HEADER */}
            <div className="audit-header">
                <div>
                    <h1>Audit Logs</h1>
                    <p>
                        Monitor and track user activities across VetStock.
                    </p>
                </div>

                <div className="audit-header-icon">
                    <span>Activity Monitoring</span>
                </div>
            </div>

            {/* STATISTICS */}
            <div className="audit-stats">

                <div className="audit-stat-card">
                    <div className="audit-stat-icon purple">
                        <span>≡</span>
                    </div>
                    <div>
                        <p>Total Activities</p>
                        <h2>{logs.length}</h2>
                    </div>
                </div>

                <div className="audit-stat-card">
                    <div className="audit-stat-icon green">
                        <span>↗</span>
                    </div>
                    <div>
                        <p>Login Activities</p>
                        <h2>{loginCount}</h2>
                    </div>
                </div>

                <div className="audit-stat-card">
                    <div className="audit-stat-icon orange">
                        <span>♙</span>
                    </div>
                    <div>
                        <p>Users with Activity</p>
                        <h2>{usersWithActivity}</h2>
                    </div>
                </div>

            </div>

            {/* AUDIT LOGS TABLE */}
            <div className="audit-content">

                <div className="audit-toolbar">
                    <div>
                        <h2>Activity History</h2>
                        <p>Review recorded system activities.</p>
                    </div>

                    <div className="audit-filters">

                        <input
                            type="text"
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />

                        <select
                            value={selectedAction}
                            onChange={e => setSelectedAction(e.target.value)}
                        >
                            <option value="All">All Activities</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                            <option value="USER_APPROVED">Accepted</option>
                            <option value="REGISTRATION_REQUESTED">Registration</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="STOCK_IN">Stock In</option>
                            <option value="STOCK_OUT">Stock Out</option>
                            <option value="HEALTH_RECORD_CREATED">Health Record Created</option>
                            <option value="HEALTH_RECORD_UPDATED">Health Record Updated</option>
                            <option value="HEALTH_RECORD_DELETED">Health Record Deleted</option>
                            <option value="FOLLOWUP_SCHEDULED">Follow-up Scheduled</option>
                            <option value="FOLLOWUP_UPDATED">Follow-up Updated</option>
                            <option value="PATIENT_CREATED">Patient Created</option>
                            <option value="PATIENT_UPDATED">Patient Updated</option>
                            <option value="PATIENT_DEACTIVATED">Patient Deactivated</option>
                        </select>

                    </div>
                </div>

                {error && (
                    <div className="audit-error">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="audit-message">
                        Loading audit logs...
                    </div>
                ) : (
                    <div className="audit-table-container">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Activity</th>
                                    <th>Module</th>
                                    <th>Details</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredLogs.length > 0 ? (
                                    paginatedLogs.map(log => (
                                        <tr key={log.log_id}>
                                            <td className="audit-date">
                                                {formatDateTime(log.created_at)}
                                            </td>

                                            <td>
                                                <span className="audit-user">
                                                    {log.username || "Unknown User"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="audit-role">
                                                    {log.role || "Unknown Role"}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`audit-action action-${(
                                                        log.action || "unknown"
                                                    ).toLowerCase().replace(/[^a-z0-9-]/g, "-")}`}
                                                >
                                                    {formatAction(log.action)}
                                                </span>
                                            </td>

                                            <td>
                                                {formatModule(log.target_table)}
                                            </td>

                                            <td className="audit-details">
                                                {formatDetails(log.details, log.action_description)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="audit-empty">
                                            {searchTerm || selectedAction !== "All"
                                                ? "No matching activities found."
                                                : "No audit activities recorded yet."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="audit-footer">

                    <div className="audit-pagination-info">
                        <label htmlFor="audit-page-size">
                            Rows per page:
                        </label>

                        <select
                            id="audit-page-size"
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                        </select>

                        <span>
                            Showing {filteredLogs.length === 0 ? 0 : startIndex + 1}
                            {" - "}
                            {Math.min(startIndex + pageSize, filteredLogs.length)}
                            {" of "}
                            {filteredLogs.length} activities
                        </span>
                    </div>

                    <div className="audit-pagination-controls">

                        <button
                            disabled={currentPage === 1}
                            onClick={() =>
                                setCurrentPage(prev => Math.max(1, prev - 1))
                            }
                        >
                            Previous
                        </button>

                        <span>
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() =>
                                setCurrentPage(prev =>
                                    Math.min(totalPages, prev + 1)
                                )
                            }
                        >
                            Next
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}