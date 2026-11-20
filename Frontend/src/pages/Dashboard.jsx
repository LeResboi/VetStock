import React, { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';

export default function Dashboard({ showPage }) {
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [healthRecords, setHealthRecords] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Calendar Modal State
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);

    async function loadDashboardData() {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const invRes = await fetch("https://vetstock-backend.onrender.com/api/inventory", { headers });
            const invData = await invRes.json();
            if (invRes.ok) setInventory(Array.isArray(invData.data) ? invData.data : (Array.isArray(invData) ? invData : []));

            const txRes = await fetch("https://vetstock-backend.onrender.com/api/stock-transactions", { headers });
            const txData = await txRes.json();
            if (txRes.ok) setTransactions(Array.isArray(txData.data) ? txData.data : (Array.isArray(txData) ? txData : []));

            const alRes = await fetch("https://vetstock-backend.onrender.com/api/alerts", { headers });
            const alData = await alRes.json();
            if (alRes.ok) setAlerts(Array.isArray(alData.data) ? alData.data : (Array.isArray(alData) ? alData : []));

            const hrRes = await fetch("https://vetstock-backend.onrender.com/api/health-records", { headers });
            const hrData = await hrRes.json();
            if (hrRes.ok) {
                const records = Array.isArray(hrData.data) ? hrData.data : (Array.isArray(hrData) ? hrData : (hrData.records || []));
                
                const recordsWithFollowUps = await Promise.all(
                    records.map(async (rec) => {
                        try {
                            const fuRes = await fetch(`https://vetstock-backend.onrender.com/api/health-records/${rec.record_id}/followups`, { headers });
                            const fuData = await fuRes.json();
                            if (fuRes.ok && fuData.success) {
                                return { ...rec, followUpsList: fuData.data || [] };
                            }
                        } catch (err) {
                            console.error(`Error fetching followups for record ${rec.record_id}:`, err);
                        }
                        return { ...rec, followUpsList: [] };
                    })
                );

                setHealthRecords(recordsWithFollowUps);
            }

            const patRes = await fetch("https://vetstock-backend.onrender.com/api/patients", { headers });
            const patData = await patRes.json();
            if (patRes.ok) setPatients(Array.isArray(patData.data) ? patData.data : (Array.isArray(patData) ? patData : []));

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
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const first = storedUser.first_name || storedUser.firstName || '';
            const last = storedUser.last_name || storedUser.lastName || '';
            const fullName = storedUser.name || `${first} ${last}`.trim() || storedUser.username || storedUser.email || 'User';
            setUserName(fullName);
        } catch (error) {
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
        return String(item.item_name || item.name || '').toLowerCase().includes(search) ||
               String(item.category || '').toLowerCase().includes(search);
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

    const calendarEvents = [];
    
    inventory.forEach(item => {
        if (item.inventory_batches && Array.isArray(item.inventory_batches)) {
            item.inventory_batches.forEach(b => {
                if (b.expiration_date) {
                    calendarEvents.push({
                        date: new Date(b.expiration_date).toDateString(),
                        type: 'expiry',
                        status: 'Expiry',
                        title: `Expiry: ${item.item_name || item.name}`,
                        desc: `Batch expires on ${b.expiration_date}`
                    });
                }
            });
        }
    });

    healthRecords.forEach(hr => {
        const patientName = hr.patient_name || hr.animal_name || hr.pet_name || hr.name || hr.patient || `Record #${hr.mrn_number || hr.record_id?.substring(0, 8) || ''}`;
        const diagnosis = hr.diagnosis || 'General Checkup';
        const treatment = hr.treatment_notes || hr.treatment || 'N/A';

        const datesMap = new Map();

        if (hr.followUpsList && hr.followUpsList.length > 0) {
            hr.followUpsList.forEach(fu => {
                const fuDate = fu.follow_up_date || fu.date;
                if (fuDate) {
                    datesMap.set(fuDate.substring(0, 10), fu.status || hr.follow_up_status || 'Upcoming');
                }
            });
        } else if (hr.follow_up_date) {
            datesMap.set(hr.follow_up_date.substring(0, 10), hr.follow_up_status || 'Upcoming');
        }

        datesMap.forEach((statusVal, dateStr) => {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                const rawStatus = String(statusVal).trim().toLowerCase();
                let displayStatus = 'Upcoming';
                if (rawStatus.includes('complete')) displayStatus = 'Completed';
                else if (rawStatus.includes('cancel')) displayStatus = 'Cancelled';
                else if (rawStatus.includes('overdue') || rawStatus.includes('miss')) displayStatus = 'Overdue';

                calendarEvents.push({
                    date: parsedDate.toDateString(),
                    type: 'appointment',
                    status: displayStatus,
                    title: `Check-up: ${patientName}`,
                    desc: `Diagnosis: ${diagnosis} | Treatment: ${treatment}`
                });
            }
        });
    });

    patients.forEach(pat => {
        if (pat.appointment_date) {
            const rawStatus = String(pat.appointment_status || 'Upcoming').trim().toLowerCase();
            let displayStatus = 'Upcoming';
            if (rawStatus.includes('complete')) displayStatus = 'Completed';
            else if (rawStatus.includes('cancel')) displayStatus = 'Cancelled';
            else if (rawStatus.includes('overdue') || rawStatus.includes('miss')) displayStatus = 'Overdue';

            calendarEvents.push({
                date: new Date(pat.appointment_date).toDateString(),
                type: 'appointment',
                status: displayStatus,
                title: `Appointment: ${pat.patient_name} (${pat.species})`,
                desc: `Status: ${displayStatus} | Owner: ${pat.owner_name} | Reason: ${pat.appointment_reason || 'General check-up'}`
            });
        }
    });

    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [calYear, setCalYear] = useState(now.getFullYear());

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const yearsList = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

    return (
        <div className="page active-page" style={{ paddingBottom: "40px" }}>
            <div className="dashboard-main-layout">
                <div className="dashboard-left-column">
                    <div className="dashboard-search-bar">
                        <div>
                            <h4 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>Welcome Back!, {userName}!</h4>
                            <p style={{ fontSize: "12px", color: "var(--muted)" }}>Here is your inventory overview for this month.</p>
                        </div>
                        <div className="dashboard-search-input-wrapper">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input type="text" placeholder="Search items or medicine..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="stats-grid-3">
                        <div className="stat-box-modern">
                            <div className="stat-header-row"><span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>TOTAL ITEMS</span><div className="stat-badge-icon"><i className="fa-solid fa-boxes-stacked"></i></div></div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : totalItems}</h2>
                        </div>
                        <div className="stat-box-modern">
                            <div className="stat-header-row"><span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>STOCK IN</span><div className="stat-badge-icon"><i className="fa-solid fa-box-open"></i></div></div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : stockInThisMonth}</h2>
                        </div>
                        <div className="stat-box-modern">
                            <div className="stat-header-row"><span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>LOW STOCK</span><div className="stat-badge-icon rose"><i className="fa-solid fa-triangle-exclamation"></i></div></div>
                            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text)" }}>{loading ? "..." : lowStockCount}</h2>
                        </div>
                    </div>

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
                                <LineChart
                                    series={[{ data: weeklySalesData, color: '#0d9488', label: 'Stock Out', area: true }]}
                                    xAxis={[{ scaleType: 'point', data: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] }]}
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
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff" }}>Transactions</span>
                            </button>
                            <button onClick={() => showPage && showPage("Notifications")} className="action-tile dark">
                                <i className="fa-solid fa-bell" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff" }}>Check Alerts</span>
                            </button>
                            <button onClick={() => showPage && showPage("Reports")} className="action-tile darker">
                                <i className="fa-solid fa-chart-pie" style={{ fontSize: "16px", marginBottom: "6px" }}></i>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#ffffff" }}>Reports</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* MINI CALENDAR WIDGET */}
                <div className="right-timeline-card" onClick={() => setIsCalendarModalOpen(true)} style={{ cursor: "pointer", transition: "all 0.2s ease" }} title="Click to open full calendar">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                            <i className="fa-solid fa-calendar-days" style={{ marginRight: "6px", color: "var(--primary)" }}></i> Schedule & Expiry
                        </h3>
                        <span style={{ fontSize: "10px", background: "#ccfbf1", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>Expand</span>
                    </div>

                    <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "10px" }}>{monthNames[calMonth]} {calYear} (Click to view full calendar)</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "11px" }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <span key={d} style={{ fontWeight: "bold", color: "var(--muted)", fontSize: "10px" }}>{d}</span>
                        ))}
                        {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const thisDateObj = new Date(calYear, calMonth, dayNum);
                            const dateString = thisDateObj.toDateString();
                            const dayEvents = calendarEvents.filter(ev => ev.date === dateString);
                            const hasEvent = dayEvents.length > 0;
                            
                            const isCompleted = hasEvent && dayEvents.some(ev => ev.status === 'Completed');
                            const isCancelled = hasEvent && dayEvents.some(ev => ev.status === 'Cancelled');
                            const isOverdue = hasEvent && dayEvents.some(ev => ev.status === 'Overdue');
                            const isToday = thisDateObj.toDateString() === new Date().toDateString();

                            let bgStyle = "transparent";
                            let textStyle = "var(--text)";
                            if (isToday) {
                                bgStyle = "var(--primary)";
                                textStyle = "#ffffff";
                            } else if (isCancelled || isOverdue) {
                                bgStyle = "#fee2e2";
                                textStyle = "#991b1b";
                            } else if (isCompleted) {
                                bgStyle = "#dcfce7";
                                textStyle = "#166534";
                            } else if (hasEvent) {
                                bgStyle = "#fef3c7";
                                textStyle = "#92400e";
                            }

                            return (
                                <div key={dayNum} style={{ padding: "6px 0", borderRadius: "4px", background: bgStyle, color: textStyle, fontWeight: hasEvent || isToday ? "bold" : "normal", position: "relative" }}>
                                    {dayNum}
                                    {hasEvent && !isToday && (
                                        <span style={{ position: "absolute", bottom: "2px", left: "50%", transform: "translateX(-50%)", width: "4px", height: "4px", background: (isCancelled || isOverdue) ? "#991b1b" : isCompleted ? "#166534" : "#d97706", borderRadius: "50%" }}></span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: "12px", fontSize: "9px", color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "space-between" }}>
                        <span><span style={{ color: "#166534", fontWeight: "bold" }}>●</span> Completed</span>
                        <span><span style={{ color: "#d97706", fontWeight: "bold" }}>●</span> Upcoming</span>
                        <span><span style={{ color: "#991b1b", fontWeight: "bold" }}>●</span> Cancelled/Overdue</span>
                    </div>
                </div>
            </div>

            {/* FULL CALENDAR MODAL */}
            {isCalendarModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#ffffff", width: "90%", maxWidth: "750px", borderRadius: "12px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827" }}>VetStock Schedule & Expiry Calendar</h2>
                            <button onClick={() => setIsCalendarModalOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", background: "#f9fafb", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#374151" }}>Jump to Date:</span>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <select value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#ffffff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                                    {monthNames.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                                </select>
                                <select value={calYear} onChange={(e) => setCalYear(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#ffffff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                                    {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center", marginBottom: "10px" }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontWeight: "bold", fontSize: "12px", color: "#6b7280", paddingBottom: "6px" }}>{d}</div>)}
                            {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`modal-empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const thisDateObj = new Date(calYear, calMonth, dayNum);
                                const dateString = thisDateObj.toDateString();
                                const dayEvents = calendarEvents.filter(ev => ev.date === dateString);

                                return (
                                    <div key={dayNum} onClick={() => { setSelectedDate(thisDateObj); setIsDayDetailModalOpen(true); }} style={{ minHeight: "75px", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px", background: "#ffffff", cursor: "pointer", textAlign: "left", overflow: "hidden" }}>
                                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", marginBottom: "4px" }}>{dayNum}</div>
                                        {dayEvents.slice(0, 2).map((ev, idx) => {
                                            let tagBg = "#fef3c7";
                                            let tagColor = "#92400e";
                                            if (ev.status === 'Completed') { tagBg = "#dcfce7"; tagColor = "#166534"; }
                                            else if (ev.status === 'Cancelled' || ev.status === 'Overdue') { tagBg = "#fee2e2"; tagColor = "#991b1b"; }
                                            else if (ev.status === 'Upcoming') { tagBg = "#dbeafe"; tagColor = "#1e40af"; }

                                            return (
                                                <div key={idx} style={{ fontSize: "9px", background: tagBg, color: tagColor, padding: "2px 4px", borderRadius: "3px", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {ev.title}
                                                </div>
                                            );
                                        })}
                                        {dayEvents.length > 2 && <div style={{ fontSize: "8px", color: "#6b7280", fontWeight: "bold" }}>+{dayEvents.length - 2} more</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* DAY DETAIL MODAL (Naalis na ang X button sa itaas) */}
            {isDayDetailModalOpen && selectedDate && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0, 0, 0, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#ffffff", width: "90%", maxWidth: "450px", borderRadius: "12px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#111827" }}>{selectedDate.toDateString()}</h3>
                        </div>
                        <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {calendarEvents.filter(ev => ev.date === selectedDate.toDateString()).length > 0 ? (
                                calendarEvents.filter(ev => ev.date === selectedDate.toDateString()).map((ev, i) => {
                                    let badgeBg = "#fef3c7";
                                    let badgeColor = "#92400e";
                                    if (ev.status === 'Completed') { badgeBg = "#dcfce7"; badgeColor = "#166534"; }
                                    else if (ev.status === 'Cancelled' || ev.status === 'Overdue') { badgeBg = "#fee2e2"; badgeColor = "#991b1b"; }
                                    else if (ev.status === 'Upcoming') { badgeBg = "#dbeafe"; badgeColor = "#1e40af"; }

                                    return (
                                        <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                <strong style={{ fontSize: "13px", color: "#111827" }}>{ev.title}</strong>
                                                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: badgeBg, color: badgeColor, fontWeight: "bold" }}>
                                                    {ev.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>{ev.desc}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "20px 0" }}>No events or schedules for this date.</p>
                            )}
                        </div>
                        <div style={{ marginTop: "20px", textAlign: "right" }}>
                            <button onClick={() => setIsDayDetailModalOpen(false)} style={{ background: "var(--primary)", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}