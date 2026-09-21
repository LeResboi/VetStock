import { useEffect, useState } from "react";

function Notifications({ onAlertCountChange }) {

    const [alerts, setAlerts] = useState([]);

    // ================= LOAD WHEN PAGE OPENS =================

useEffect(() => {

    async function loadAlerts() {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:3001/api/alerts",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    "Failed to load alerts:",
                    data.message
                );

                if (onAlertCountChange) {
                    onAlertCountChange(0);
                }

                return;
            }

            setAlerts(data.data);

            if (onAlertCountChange) {
                onAlertCountChange(data.data.length);
            }

        } catch (error) {

            console.error(
                "Load alerts error:",
                error
            );

            if (onAlertCountChange) {
                onAlertCountChange(0);
            }
        }
    }

    loadAlerts();

}, [onAlertCountChange]);

    // ================= ALERT STYLE =================

    function getAlertClass(alertType) {

        if (alertType === "LOW_STOCK") {
            return "danger";
        }

        if (alertType === "EXPIRATION") {
            return "warning";
        }

        return "";
    }

    // ================= ALERT ICON =================

    function getAlertIcon(alertType) {

        if (alertType === "LOW_STOCK") {
            return "fa-solid fa-circle-exclamation";
        }

        if (alertType === "EXPIRATION") {
            return "fa-solid fa-triangle-exclamation";
        }

        return "fa-solid fa-circle-info";
    }

    // ================= ALERT TITLE =================

    function getAlertTitle(alertType) {

        if (alertType === "LOW_STOCK") {
            return "Low Stock Alert";
        }

        if (alertType === "EXPIRATION") {
            return "Expiration Warning";
        }

        return "Stock Update";
    }

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Notifications</h2>

                    <p>
                        System alerts and notifications
                    </p>
                </div>

            </div>


            <div className="notification-list">

                {alerts.length === 0 ? (

                    <div className="notification">

                        <i className="fa-solid fa-circle-info"></i>

                        <div>

                            <strong>
                                No Notifications
                            </strong>

                            <p>
                                There are currently no alerts.
                            </p>

                            <small>
                                Today
                            </small>

                        </div>

                    </div>

                ) : (

                    alerts.map((alert) => (

                        <div
                            className={`notification ${getAlertClass(
                                alert.alert_type
                            )}`}
                            key={alert.alert_id}
                        >

                            <i
                                className={getAlertIcon(
                                    alert.alert_type
                                )}
                            ></i>

                            <div>

                                <strong>
                                    {getAlertTitle(
                                        alert.alert_type
                                    )}
                                </strong>

                                <p>
                                    {alert.message}
                                </p>

                                <small>
                                    {new Date(
                                        alert.created_at
                                    ).toLocaleDateString(
                                        "en-US",
                                        {
                                            month: "short",
                                            day: "2-digit",
                                            year: "numeric"
                                        }
                                    )}
                                </small>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </div>
    );
}

export default Notifications;