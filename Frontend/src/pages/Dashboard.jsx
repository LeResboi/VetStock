import React, { useState, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';

export default function Dashboard({ showPage }) {
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    async function loadDashboardData() {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const invRes = await fetch("http://localhost:3001/api/inventory", { headers });
            const invData = await invRes.json();
            if (invRes.ok) setInventory(Array.isArray(invData.data) ? invData.data : (Array.isArray(invData) ? invData : []));

            const txRes = await fetch("http://localhost:3001/api/stock-transactions", { headers });
            const txData = await txRes.json();
            if (txRes.ok) setTransactions(Array.isArray(txData.data) ? txData.data : (Array.isArray(txData) ? txData : []));

            const alRes = await fetch("http://localhost:3001/api/alerts", { headers });
            const alData = await alRes.json();
            if (alRes.ok) setAlerts(Array.isArray(alData.data) ? alData.data : (Array.isArray(alData) ? alData : []));
        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const [userName, setUserName] = useState('');

    useEffect(() => {
        try {
            const storedUser = JSON.parse(
                localStorage.getItem('user') || '{}'
            );

            const first = storedUser.first_name || storedUser.firstName || '';
            const last = storedUser.last_name || storedUser.lastName || '';

            const fullName =
                storedUser.name ||
                `${first} ${last}`.trim() ||
                storedUser.username ||
                storedUser.email ||
                'User';

            setUserName(fullName);
        } catch (error) {
            console.error('Error reading user information:', error);
            setUserName('User');
        }
    }, []);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    function isThisMonth(dateValue) {
        if (!dateValue) return false;
        const date = new Date(dateValue);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }

    const filteredInventory = inventory.filter(item => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) return false;

        return (
            String(item.item_name || item.name || '')
                .toLowerCase()
                .includes(search) ||
            String(item.category || '')
                .toLowerCase()
                .includes(search)
        );
    });

    const totalItems = inventory.length;
    const stockInThisMonth = transactions.filter(t => String(t.transaction_type || "").toUpperCase() === "IN" && isThisMonth(t.created_at)).length;
    const stockOutThisMonth = transactions.filter(t => String(t.transaction_type || "").toUpperCase() === "OUT" && isThisMonth(t.created_at)).length;

    const lowStockCount = inventory.filter(item => {
        const qty = Number(item.quantity ?? 0);
        const reorder = Number(item.reorder_point ?? item.min_stock_level ?? 0);
        return qty <= reorder;
    }).length;

    const stockOutTransactions = transactions.filter(t => String(t.transaction_type || "").toUpperCase() === "OUT" && isThisMonth(t.created_at));

    let w1Count = 0, w2Count = 0, w3Count = 0, w4Count = 0;
    stockOutTransactions.forEach(t => {
        const day = new Date(t.created_at).getDate();
        if (day >= 1 && day <= 7) w1Count += Number(t.quantity || 1);
        else if (day >= 8 && day <= 14) w2Count += Number(t.quantity || 1);
        else if (day >= 15 && day <= 21) w3Count += Number(t.quantity || 1);
        else w4Count += Number(t.quantity || 1);
    });

    const weeklySalesData = [w1Count, w2Count, w3Count, w4Count];
    const recentAlerts = [...alerts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4);

    return (
        <div className="page active-page" style={{ paddingBottom: "40px" }}>
            <div className="dashboard-main-layout">

                {/* LEFT SIDE COLUMN */}
                <div className="dashboard-left-column">

                    <div className="dashboard-search-bar">
                        <div>
                            <h4 style={{
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "var(--text)"
                            }}>
                                Welcome Back!, {userName}!
                            </h4>

                            <p style={{
                                fontSize: "12px",
                                color: "var(--muted)"
                            }}>
                                Here is your inventory overview for this month.
                            </p>
                        </div>

                        <div className="dashboard-search-input-wrapper">
                            <i className="fa-solid fa-magnifying-glass"></i>

                            <input
                                type="text"
                                placeholder="Search items or medicine..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            {searchTerm.trim() !== '' && (
                                <div className="dashboard-search-results">
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map((item, index) => (
                                            <div
                                                key={item.item_id || item.id || index}
                                                className="dashboard-search-result"
                                            >
                                                <strong>
                                                    {item.item_name || item.name}
                                                </strong>

                                                <span>
                                                    Stock: {item.quantity ?? 0}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dashboard-search-empty">
                                            No matching inventory found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STATS CARDS */}
                    <div className="stats-grid-3">
                        <div className="stat-box-modern">
                            <div className="stat-header-row">
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>TOTAL ITEMS</span>
                                <div className="stat-badge-icon"><i className="fa-solid fa-boxes-stacked"></i></div>
                            </div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : totalItems}</h2>
                            <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Active inventory count</p>
                        </div>

                        <div className="stat-box-modern">
                            <div className="stat-header-row">
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>STOCK IN</span>
                                <div className="stat-badge-icon"><i className="fa-solid fa-box-open"></i></div>
                            </div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : stockInThisMonth}</h2>
                            <p style={{ fontSize: "11px", color: "var(--primary)", marginTop: "4px", fontWeight: "600" }}>This month</p>
                        </div>

                        <div className="stat-box-modern">
                            <div className="stat-header-row">
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>LOW STOCK</span>
                                <div className="stat-badge-icon rose"><i className="fa-solid fa-triangle-exclamation"></i></div>
                            </div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : lowStockCount}</h2>
                            <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px", fontWeight: "600" }}>Requires attention</p>
                        </div>
                    </div>

                    {/* GRAPH & ACTION TILES SECTION */}
                    <div className="dashboard-split-grid">

                        <div className="analytics-card-custom">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--primary)", textTransform: "uppercase" }}>Recent Goods Sales</span>
                                    <p style={{ fontSize: "11px", color: "var(--muted)" }}>Total Stock Out: <strong style={{ color: "var(--text)" }}>{stockOutThisMonth} items</strong></p>
                                </div>
                                <button onClick={() => showPage && showPage("Transactions")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="fa-solid fa-arrow-right" style={{ fontSize: "10px" }}></i>
                                </button>
                            </div>

                            <div style={{ width: '100%', height: '180px', marginTop: '10px' }}>
                                <BarChart
                                    series={[{ data: weeklySalesData, color: '#0d9488', label: 'Stock Out' }]}
                                    xAxis={[{ scaleType: 'band', data: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] }]}
                                    margin={{ top: 10, bottom: 20, left: 25, right: 10 }}
                                />
                            </div>
                        </div>

                        <div className="action-buttons-grid">
                            <button onClick={() => showPage && showPage("Inventory")} className="action-tile">
                                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff" }}>View Inventory</span>
                            </button>
                            <button onClick={() => showPage && showPage("Transactions")} className="action-tile dark">
                                <i className="fa-solid fa-right-left" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff"  }}>Transactions</span>
                            </button>
                            <button onClick={() => showPage && showPage("Notifications")} className="action-tile dark">
                                <i className="fa-solid fa-bell" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff"  }}>Check Alerts</span>
                            </button>
                            <button onClick={() => showPage && showPage("Reports")} className="action-tile darker">
                                <i className="fa-solid fa-chart-pie" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff"  }}>Reports</span>
                            </button>
                        </div>

                    </div>

                </div>

                {/* RIGHT SIDE COLUMN (RECENT ALERTS TIMELINE) */}
                <div className="right-timeline-card">
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>Recent Alerts</h3>
                            <span style={{ fontSize: "10px", background: "#ccfbf1", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>Live</span>
                        </div>

                        <div>
                            {recentAlerts.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "30px 0" }}>No current alerts.</p>
                            ) : (
                                recentAlerts.map((alert, idx) => (
                                    <div key={idx} className="timeline-item" style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--primary)", marginTop: "4px", flexShrink: "0" }}></div>
                                        <div>
                                            <strong style={{ fontSize: "11px", color: "var(--text)", display: "block" }}>{alert.alert_type || "Notification"}</strong>
                                            <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", display: "block" }}>{alert.message}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>System Status: Normal</span>
                        <button onClick={loadDashboardData} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--background)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)" }}>
                            <i className="fa-solid fa-rotate-right" style={{ fontSize: "10px" }}></i>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}