import { useEffect, useState } from "react";

function Dashboard({ showPage }) {

    // ======================================================
    // DASHBOARD DATA
    // ======================================================

    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [alerts, setAlerts] = useState([]);

    const [loading, setLoading] = useState(true);


    // ======================================================
    // GET DASHBOARD DATA
    // ======================================================

    async function loadDashboardData() {

        try {

            setLoading(true);

            const token = localStorage.getItem("token");

            if (!token) {
                console.error("No login token found.");
                return;
            }

            const headers = {
                "Authorization": `Bearer ${token}`
            };


            // ==================================================
            // LOAD INVENTORY
            // ==================================================

            const inventoryResponse = await fetch(
                "http://localhost:3001/api/inventory",
                {
                    method: "GET",
                    headers
                }
            );

            const inventoryResult =
                await inventoryResponse.json();

            if (inventoryResponse.ok) {

                setInventory(
                    Array.isArray(inventoryResult.data)
                        ? inventoryResult.data
                        : []
                );

            } else {

                console.error(
                    "Failed to load inventory:",
                    inventoryResult.message
                );

            }


            // ==================================================
            // LOAD STOCK TRANSACTIONS
            // ==================================================

            const transactionResponse = await fetch(
                "http://localhost:3001/api/stock-transactions",
                {
                    method: "GET",
                    headers
                }
            );

            const transactionResult =
                await transactionResponse.json();

            if (transactionResponse.ok) {

                setTransactions(
                    Array.isArray(transactionResult.data)
                        ? transactionResult.data
                        : []
                );

            } else {

                console.error(
                    "Failed to load transactions:",
                    transactionResult.message
                );

            }


            // ==================================================
            // LOAD ALERTS
            // ==================================================

            const alertResponse = await fetch(
                "http://localhost:3001/api/alerts",
                {
                    method: "GET",
                    headers
                }
            );

            const alertResult =
                await alertResponse.json();

            if (alertResponse.ok) {

                setAlerts(
                    Array.isArray(alertResult.data)
                        ? alertResult.data
                        : []
                );

            } else {

                console.error(
                    "Failed to load alerts:",
                    alertResult.message
                );

            }

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

        } finally {

            setLoading(false);

        }

    }


    // ======================================================
    // LOAD DASHBOARD WHEN PAGE OPENS
    // ======================================================

    useEffect(() => {

        loadDashboardData();

        const interval = setInterval(
            loadDashboardData,
            30000
        );

        return () => {
            clearInterval(interval);
        };

    }, []);


    // ======================================================
    // CURRENT USER
    // ======================================================

    const currentUser = (() => {

        try {

            return JSON.parse(
                localStorage.getItem("user")
            ) || null;

        } catch (error) {

            return null;

        }

    })();


    const displayName =
        [
            currentUser?.first_name,
            currentUser?.last_name
        ]
            .filter(Boolean)
            .join(" ") ||
        currentUser?.email ||
        "User";


    // ======================================================
    // DATE HELPERS
    // ======================================================

    const now = new Date();

    const currentMonth =
        now.getMonth();

    const currentYear =
        now.getFullYear();


    function isThisMonth(dateValue) {

        if (!dateValue) {
            return false;
        }

        const date = new Date(dateValue);

        return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
        );

    }


    // ======================================================
    // DASHBOARD COUNTS
    // ======================================================

    const totalItems =
        inventory.length;


    const stockInThisMonth =
        transactions.filter(
            (transaction) => {

                const type =
                    String(
                        transaction.transaction_type || ""
                    ).toUpperCase();

                return (
                    type === "IN" &&
                    isThisMonth(
                        transaction.created_at
                    )
                );

            }
        ).length;


    const stockOutThisMonth =
        transactions.filter(
            (transaction) => {

                const type =
                    String(
                        transaction.transaction_type || ""
                    ).toUpperCase();

                return (
                    type === "OUT" &&
                    isThisMonth(
                        transaction.created_at
                    )
                );

            }
        ).length;


    // ======================================================
    // LOW STOCK
    // ======================================================

    const lowStockItems =
        inventory.filter(
            (item) => {

                const quantity =
                    Number(
                        item.quantity ?? 0
                    );

                const reorderPoint =
                    Number(
                        item.reorder_point ??
                        item.min_stock_level ??
                        0
                    );

                return (
                    quantity <= reorderPoint
                );

            }
        );


    const lowStockCount =
        lowStockItems.length;


    // ======================================================
    // STOCK LEVEL CATEGORY CALCULATION
    // ======================================================

    function getCategory(item) {

        const category =
            String(
                item.category || ""
            ).toLowerCase();

        const itemName =
            String(
                item.item_name || ""
            ).toLowerCase();


        if (
            category.includes("vaccine") ||
            itemName.includes("vaccine")
        ) {
            return "Vaccines";
        }


        if (
            category.includes("supply") ||
            category.includes("supplies")
        ) {
            return "Supplies";
        }


        return "Medicines";
    }


    function calculateStockLevel(categoryName) {

        const categoryItems =
            inventory.filter(
                (item) =>
                    getCategory(item) ===
                    categoryName
            );


        if (categoryItems.length === 0) {
            return 0;
        }


        let totalQuantity = 0;
        let totalMaximum = 0;


        categoryItems.forEach(
            (item) => {

                totalQuantity +=
                    Number(
                        item.quantity ?? 0
                    );

                totalMaximum +=
                    Number(
                        item.max_stock_level ??
                        item.quantity ??
                        0
                    );

            }
        );


        if (totalMaximum <= 0) {
            return 0;
        }


        return Math.min(
            Math.round(
                (
                    totalQuantity /
                    totalMaximum
                ) * 100
            ),
            100
        );

    }


    const medicineLevel =
        calculateStockLevel(
            "Medicines"
        );


    const vaccineLevel =
        calculateStockLevel(
            "Vaccines"
        );


    const supplyLevel =
        calculateStockLevel(
            "Supplies"
        );


    // ======================================================
    // RECENT TRANSACTIONS
    // ======================================================

    const recentTransactions =
        [...transactions]
            .sort(
                (a, b) =>
                    new Date(
                        b.created_at || 0
                    ) -
                    new Date(
                        a.created_at || 0
                    )
            )
            .slice(0, 4);


    // ======================================================
    // RECENT ALERTS
    // ======================================================

    const recentAlerts =
        [...alerts]
            .sort(
                (a, b) =>
                    new Date(
                        b.created_at || 0
                    ) -
                    new Date(
                        a.created_at || 0
                    )
            )
            .slice(0, 3);


    // ======================================================
    // ALERT STYLE
    // ======================================================

    function getAlertClass(alert) {

        const type =
            String(
                alert.alert_type || ""
            ).toLowerCase();

        const severity =
            String(
                alert.severity || ""
            ).toLowerCase();


        if (
            severity === "high" ||
            type.includes("low")
        ) {
            return "danger";
        }


        if (
            type.includes("expir") ||
            severity === "medium"
        ) {
            return "warning";
        }


        return "info";

    }


    function getAlertTitle(alert) {

        const type =
            String(
                alert.alert_type || ""
            ).toLowerCase();


        if (type.includes("low")) {
            return "Low Stock";
        }


        if (type.includes("expir")) {
            return "Expiring Soon";
        }


        if (type.includes("stock")) {
            return "Stock Update";
        }


        return (
            alert.alert_type ||
            "Inventory Alert"
        );

    }


    // ======================================================
    // FORMAT DATE
    // ======================================================

    function formatDate(dateValue) {

        if (!dateValue) {
            return "-";
        }

        return new Date(
            dateValue
        ).toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        );

    }


    // ======================================================
    // FORMAT STAFF NAME
    // ======================================================

    function getStaffName(transaction) {

        const firstName =
            transaction.users?.first_name ||
            "";

        const lastName =
            transaction.users?.last_name ||
            "";

        const fullName =
            `${firstName} ${lastName}`
                .trim();


        return (
            fullName ||
            "Unknown"
        );

    }


    // ======================================================
    // FORMAT MEDICINE NAME
    // ======================================================

    function getMedicineName(transaction) {

        return (
            transaction.inventory_items?.item_name ||
            transaction.item_name ||
            "Unknown Item"
        );

    }


    // ======================================================
    // PAGE
    // ======================================================

    return (
        <div className="page active-page">

            {/* ==================================================
                WELCOME
            ================================================== */}

            <div className="welcome">

                <div>

                    <h2>
                        Good day, {displayName}!
                    </h2>

                    <p>
                        Here's what's happening with your
                        veterinary inventory today.
                    </p>

                </div>


                <button
                    className="primary-btn"
                    onClick={() =>
                        showPage("inventory")
                    }
                >
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; Add Inventory
                </button>

            </div>


            {/* ==================================================
                STATISTICS
            ================================================== */}

            <div className="stats-grid">

                <div className="stat-card">

                    <div className="stat-icon blue">
                        <i className="fa-solid fa-boxes-stacked"></i>
                    </div>

                    <div>

                        <span>
                            Total Items
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : totalItems}
                        </h2>

                        <small>
                            Current inventory
                        </small>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon green">
                        <i className="fa-solid fa-box-open"></i>
                    </div>

                    <div>

                        <span>
                            Stock In
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : stockInThisMonth}
                        </h2>

                        <small>
                            This month
                        </small>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon yellow">
                        <i className="fa-solid fa-arrow-up-from-bracket"></i>
                    </div>

                    <div>

                        <span>
                            Stock Out
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : stockOutThisMonth}
                        </h2>

                        <small>
                            This month
                        </small>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon red">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>

                        <span>
                            Low Stock
                        </span>

                        <h2>
                            {loading
                                ? "..."
                                : lowStockCount}
                        </h2>

                        <small>
                            Needs attention
                        </small>

                    </div>

                </div>

            </div>


            {/* ==================================================
                DASHBOARD GRID
            ================================================== */}

            <div className="dashboard-grid">

                {/* ==================================================
                    STOCK LEVEL
                ================================================== */}

                <div className="card">

                    <div className="card-header">

                        <div>

                            <h3>
                                Stock Level Overview
                            </h3>

                            <p>
                                Current inventory status
                            </p>

                        </div>

                        <button
                            className="view-btn"
                            onClick={() =>
                                showPage("inventory")
                            }
                        >
                            View Inventory
                        </button>

                    </div>


                    {/* MEDICINES */}

                    <div className="progress-item">

                        <div>

                            <span>
                                Medicines
                            </span>

                            <strong>
                                {medicineLevel}%
                            </strong>

                        </div>

                        <div className="progress">

                            <div
                                className="progress-bar green-bar"
                                style={{
                                    width:
                                        `${medicineLevel}%`
                                }}
                            ></div>

                        </div>

                    </div>


                    {/* VACCINES */}

                    <div className="progress-item">

                        <div>

                            <span>
                                Vaccines
                            </span>

                            <strong>
                                {vaccineLevel}%
                            </strong>

                        </div>

                        <div className="progress">

                            <div
                                className="progress-bar yellow-bar"
                                style={{
                                    width:
                                        `${vaccineLevel}%`
                                }}
                            ></div>

                        </div>

                    </div>


                    {/* SUPPLIES */}

                    <div className="progress-item">

                        <div>

                            <span>
                                Supplies
                            </span>

                            <strong>
                                {supplyLevel}%
                            </strong>

                        </div>

                        <div className="progress">

                            <div
                                className="progress-bar red-bar"
                                style={{
                                    width:
                                        `${supplyLevel}%`
                                }}
                            ></div>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    ALERTS
                ================================================== */}

                <div className="card">

                    <div className="card-header">

                        <div>

                            <h3>
                                Inventory Alerts
                            </h3>

                            <p>
                                Items that need attention
                            </p>

                        </div>

                        <button
                            className="view-btn"
                            onClick={() =>
                                showPage("notifications")
                            }
                        >
                            View All
                        </button>

                    </div>


                    {recentAlerts.length === 0 ? (

                        <div className="alert-item info">

                            <i className="fa-solid fa-circle-info"></i>

                            <div>

                                <strong>
                                    No Alerts
                                </strong>

                                <p>
                                    No inventory alerts at the moment.
                                </p>

                            </div>

                        </div>

                    ) : (

                        recentAlerts.map(
                            (alert, index) => (

                                <div
                                    className={
                                        `alert-item ${getAlertClass(alert)}`
                                    }
                                    key={
                                        alert.alert_id ||
                                        alert.alertId ||
                                        index
                                    }
                                >

                                    <i
                                        className={
                                            getAlertClass(alert) === "danger"
                                                ? "fa-solid fa-circle-exclamation"
                                                : getAlertClass(alert) === "warning"
                                                    ? "fa-solid fa-triangle-exclamation"
                                                    : "fa-solid fa-circle-info"
                                        }
                                    ></i>

                                    <div>

                                        <strong>
                                            {getAlertTitle(alert)}
                                        </strong>

                                        <p>
                                            {alert.message ||
                                                "Inventory alert requires attention."
                                            }
                                        </p>

                                    </div>

                                </div>

                            )
                        )

                    )}

                </div>

            </div>


            {/* ==================================================
                RECENT TRANSACTIONS
            ================================================== */}

            <div className="card table-card">

                <div className="card-header">

                    <div>

                        <h3>
                            Recent Stock Transactions
                        </h3>

                        <p>
                            Latest inventory movements
                        </p>

                    </div>

                    <button
                        className="view-btn"
                        onClick={() =>
                            showPage("transactions")
                        }
                    >
                        View All
                    </button>

                </div>


                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Medicine
                                </th>

                                <th>
                                    Type
                                </th>

                                <th>
                                    Quantity
                                </th>

                                <th>
                                    Staff
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {recentTransactions.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                    >
                                        No stock transactions found.
                                    </td>

                                </tr>

                            ) : (

                                recentTransactions.map(
                                    (transaction) => {

                                        const type =
                                            String(
                                                transaction.transaction_type || ""
                                            ).toUpperCase();

                                        return (

                                            <tr
                                                key={
                                                    transaction.transaction_id
                                                }
                                            >

                                                <td>
                                                    {formatDate(
                                                        transaction.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    {getMedicineName(
                                                        transaction
                                                    )}
                                                </td>

                                                <td>

                                                    {type === "IN" ? (

                                                        <span className="stock-in">
                                                            Stock In
                                                        </span>

                                                    ) : (

                                                        <span className="stock-out">
                                                            Stock Out
                                                        </span>

                                                    )}

                                                </td>

                                                <td>
                                                    {transaction.quantity}
                                                </td>

                                                <td>
                                                    {getStaffName(
                                                        transaction
                                                    )}
                                                </td>

                                            </tr>

                                        );

                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );

}


export default Dashboard;