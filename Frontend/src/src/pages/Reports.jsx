import { useState } from "react";

function Reports() {

    const reports = [
        {
            icon: "fa-solid fa-boxes-stacked",
            title: "Inventory Report",
            text: "View current inventory levels and stock status.",
        },
        {
            icon: "fa-solid fa-right-left",
            title: "Transaction Report",
            text: "View stock in and stock out transactions.",
        },
        {
            icon: "fa-solid fa-notes-medical",
            title: "Patient Health Report",
            text: "View patient health records and medical history.",
        },
        {
            icon: "fa-solid fa-triangle-exclamation",
            title: "Expiry Report",
            text: "View medicines that are nearing expiration.",
        },
    ];

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

                        <button>
                            <i className="fa-solid fa-file-export"></i>
                            &nbsp; Generate
                        </button>

                    </div>

                ))}

            </div>

        </div>
    );
}


/* ================= NOTIFICATIONS ================= */

export default Reports;
