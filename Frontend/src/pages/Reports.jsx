import { useState, useEffect } from "react";

function Reports() {

    /* ================= STATE ================= */
    const [activeReport, setActiveReport] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    /* ================= REPORT CARDS ================= */
    const reports = [
        {
            id: "inventory",
            icon: "fa-solid fa-boxes-stacked",
            title: "Inventory Report",
            text: "View current inventory levels and stock status.",
            endpoint: "http://localhost:3001/api/reports/inventory-summary",
        },
        {
            id: "transactions",
            icon: "fa-solid fa-right-left",
            title: "Transaction Report",
            text: "View stock in and stock out transactions.",
            endpoint: "http://localhost:3001/api/reports/recent-transactions",
        },
        {
            id: "health",
            icon: "fa-solid fa-notes-medical",
            title: "Patient Health Report",
            text: "View patient health records and medical history.",
            endpoint: "http://localhost:3001/api/reports/health-summary",
        },
        {
            id: "expiring",
            icon: "fa-solid fa-triangle-exclamation",
            title: "Expiry Report",
            text: "View medicines that are nearing expiration.",
            endpoint: "http://localhost:3001/api/reports/expiring?days=90",
        },
    ];

    /* ================= FETCH REPORT ================= */
    async function generateReport(report) {
        try {
            setActiveReport(report);
            setLoading(true);
            setError("");
            setReportData([]);

            const response = await fetch(report.endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to load report.");
                return;
            }

            setReportData(data.data || []);

        } catch (err) {
            console.error("Report fetch error:", err);
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    function closeReport() {
        setActiveReport(null);
        setReportData([]);
        setError("");
    }

    /* ================= TABLE COLUMNS PER REPORT ================= */
    function renderTable() {
        if (!reportData.length) return null;

        const columns = Object.keys(reportData[0]);

        return (
            <table>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col}>{col.replace(/_/g, " ")}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {reportData.map((row, i) => (
                        <tr key={i}>
                            {columns.map((col) => (
                                <td key={col}>
                                    {Array.isArray(row[col])
                                        ? row[col].join(", ")
                                        : String(row[col] ?? "—")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Reports</h2>

                    <p>
                        Generate system reports
                    </p>
                </div>

            </div>


            <div className="report-grid">

                {reports.map((report) => (

                    <div
                        className="report-card"
                        key={report.title}
                    >

                        <i className={report.icon}></i>

                        <h3>
                            {report.title}
                        </h3>

                        <p>
                            {report.text}
                        </p>

                        <button onClick={() => generateReport(report)}>
                            <i className="fa-solid fa-file-export"></i>
                            &nbsp; Generate
                        </button>

                    </div>

                ))}

            </div>


            {/* ================= REPORT DETAIL VIEW ================= */}
            {activeReport && (
                <div className="report-detail">

                    <div className="report-detail-header">

                        <h3>
                            {activeReport.title}
                        </h3>

                        <button
                            className="close-btn"
                            onClick={closeReport}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                    </div>

                    {loading && (
                        <p style={{ padding: "20px" }}>
                            Loading report...
                        </p>
                    )}

                    {error && (
                        <p style={{ padding: "20px", color: "red" }}>
                            {error}
                        </p>
                    )}

                    {!loading && !error && reportData.length === 0 && (
                        <p style={{ padding: "20px" }}>
                            No data available for this report.
                        </p>
                    )}

                    {!loading && !error && reportData.length > 0 && (
                        <div className="table-container">
                            {renderTable()}
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}


/* ================= NOTIFICATIONS ================= */

export default Reports;