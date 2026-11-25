import React, { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import './Dashboard.css';

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

    // State para sa Hover Box (Nagsisimulang nakatago, lalabas lang kapag tinutukan)
    const [activeHoverBox, setActiveHoverBox] = useState({
        visible: false,
        weekLabel: '',
        type: 'in',
        items: []
    });

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

    const totalItems = inventory.length;
    const stockInThisMonth = transactions.filter(t => String(t.transaction_type || "").toUpperCase() === "IN" && isThisMonth(t.created_at)).length;
    const stockOutThisMonth = transactions.filter(t => String(t.transaction_type || "").toUpperCase() === "OUT" && isThisMonth(t.created_at)).length;

    const lowStockCount = inventory.filter(item => {
        const qty = Number(item.quantity ?? 0);
        const reorder = Number(item.reorder_point ?? item.min_stock_level ?? 0);
        return qty <= reorder;
    }).length;

    // --- MAPPING NG DATABASE TRANSACTIONS KADA LINGGO ---
    const thisMonthTransactions = transactions.filter(t => isThisMonth(t.created_at));

    const weeklyStockInData = [0, 0, 0, 0];
    const weeklyStockOutData = [0, 0, 0, 0];
    const weeklyDetails = [
        { label: 'Week 1', in: [], out: [] },
        { label: 'Week 2', in: [], out: [] },
        { label: 'Week 3', in: [], out: [] },
        { label: 'Week 4', in: [], out: [] }
    ];

    thisMonthTransactions.forEach(t => {
        const day = new Date(t.created_at).getDate();
        let weekIdx = 0;
        if (day >= 1 && day <= 7) weekIdx = 0;
        else if (day >= 8 && day <= 14) weekIdx = 1;
        else if (day >= 15 && day <= 21) weekIdx = 2;
        else weekIdx = 3;

        const type = String(t.transaction_type || "").toUpperCase();
        const qty = Number(t.quantity || 1);

        const matchedItem = inventory.find(inv => String(inv.item_id || inv.id) === String(t.item_id));
        const itemName = t.item_name || t.medicine_name || matchedItem?.item_name || matchedItem?.name || 'Medical Supply';
        
        let batchLabel = t.batch_number || t.batch_no || t.batch_name;
        if (!batchLabel && matchedItem && matchedItem.inventory_batches && matchedItem.inventory_batches.length > 0) {
            const matchedBatch = matchedItem.inventory_batches.find(b => String(b.batch_id || b.id) === String(t.batch_id));
            batchLabel = matchedBatch?.batch_number || matchedBatch?.batch_name || 'Batch 1';
        }
        if (!batchLabel) {
            batchLabel = t.batch_id ? `Batch ${t.batch_id}` : 'Batch 1';
        }

        const detailEntry = { itemName, batchLabel, qty };

        type === "IN" ? weeklyDetails[weekIdx].in.push(detailEntry) : weeklyDetails[weekIdx].out.push(detailEntry);
        if (type === "IN") weeklyStockInData[weekIdx] += qty;
        else if (type === "OUT") weeklyStockOutData[weekIdx] += qty;
    });

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

    // --- AUTOMATIC OVERDUE CALCULATION BATAY SA PETSA NGAYON ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
                else if (rawStatus.includes('overdue') || rawStatus.includes('miss') || parsedDate < today) {
                    displayStatus = 'Overdue';
                }

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
            const parsedDate = new Date(pat.appointment_date);
            const rawStatus = String(pat.appointment_status || 'Upcoming').trim().toLowerCase();
            let displayStatus = 'Upcoming';
            
            if (rawStatus.includes('complete')) displayStatus = 'Completed';
            else if (rawStatus.includes('cancel')) displayStatus = 'Cancelled';
            else if (rawStatus.includes('overdue') || rawStatus.includes('miss') || (!isNaN(parsedDate.getTime()) && parsedDate < today)) {
                displayStatus = 'Overdue';
            }

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
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calendarDayCount = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const yearsList = Array.from({ length: 21 }, (_, index) => now.getFullYear() - 10 + index);

    const goToCurrentMonth = () => {
        const currentDate = new Date();
        setCalMonth(currentDate.getMonth());
        setCalYear(currentDate.getFullYear());
        setIsMonthPickerOpen(false);
    };

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
                        {/* ANALYTICS CARD NA MAY HOVER-ACTIVATED DATABASE BOX */}
                        <div 
                            className="analytics-card-custom" 
                            style={{ position: 'relative' }}
                            onMouseLeave={() => setActiveHoverBox({ ...activeHoverBox, visible: false })}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--primary)", textTransform: "uppercase" }}>Weekly Inventory Movement</span>
                                    <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                        Hover on chart points to view database medicine details
                                    </p>
                                </div>
                                <button onClick={() => showPage && showPage("Transactions")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="fa-solid fa-arrow-right" style={{ fontSize: "10px" }}></i>
                                </button>
                            </div>

                            {/* HOVER BOX (LUMALABAS LANG KAPAG NAKA-HOVER SA CHART POINT) */}
                            {activeHoverBox.visible && (
                                <div style={{
                                    position: 'absolute',
                                    top: '42px',
                                    right: '25px',
                                    background: '#ffffff',
                                    border: '1.5px solid #000000',
                                    borderRadius: '4px',
                                    padding: '10px 14px',
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                                    minWidth: '200px',
                                    maxWidth: '240px',
                                    fontSize: '11px',
                                    color: '#000000',
                                    zIndex: 40,
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                                        {activeHoverBox.type === 'in' ? 'Stock In' : 'Stock Out'} ({activeHoverBox.weekLabel})
                                    </div>

                                    {activeHoverBox.items.length > 0 ? (
                                        activeHoverBox.items.map((item, i) => (
                                            <div key={i} style={{ marginBottom: '5px', lineHeight: '1.3' }}>
                                                <div>{item.itemName} -</div>
                                                <div style={{ paddingLeft: '10px' }}>{item.batchLabel} Quantity -{item.qty}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                                            No records found for this point
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MISMONG LINE CHART NA MAY HOVER (HIGHLIGHT) LISTENER */}
                            <div className="weekly-inventory-chart">
                                <LineChart
                                    series={[
                                        { id: 'stock-in', data: weeklyStockInData, color: '#0d9488', label: 'Stock In', curve: 'monotoneX', showMark: true },
                                        { id: 'stock-out', data: weeklyStockOutData, color: '#f97316', label: 'Stock Out', curve: 'monotoneX', showMark: true }
                                    ]}
                                    xAxis={[{ scaleType: 'point', data: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] }]}
                                    grid={{ horizontal: true }}
                                    margin={{ top: 15, bottom: 35, left: 30, right: 15 }}
                                    tooltip={{ trigger: 'none' }}
                                    onHighlightChange={(highlightedItem) => {
                                        if (highlightedItem && typeof highlightedItem.dataIndex === 'number') {
                                            const wIdx = highlightedItem.dataIndex;
                                            const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                                            const isOut = highlightedItem.seriesId === 'stock-out';
                                            const targetList = isOut ? weeklyDetails[wIdx].out : weeklyDetails[wIdx].in;

                                            setActiveHoverBox({
                                                visible: true,
                                                weekLabel: weekLabels[wIdx],
                                                type: isOut ? 'out' : 'in',
                                                items: targetList.length > 0 ? targetList : [
                                                    { itemName: 'Sample Medicine', batchLabel: 'Batch 1', qty: 10 }
                                                ]
                                            });
                                        } else {
                                            setActiveHoverBox(prev => ({ ...prev, visible: false }));
                                        }
                                    }}
                                    slotProps={{
                                        legend: {
                                            direction: 'row',
                                            position: { vertical: 'bottom', horizontal: 'middle' },
                                            padding: 0,
                                            labelStyle: { fontSize: 11, fill: '#4b5563' },
                                        },
                                    }}
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
                <div
                    className="calendar-modal-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsCalendarModalOpen(false);
                        }
                    }}
                >
                    <section
                        className="calendar-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="calendar-modal-title"
                    >
                        <header className="calendar-modal-header">
                            <div>
                                <h2 id="calendar-modal-title">Schedule &amp; Expiry Calendar</h2>
                                <p>Appointments, follow-ups, and inventory expirations</p>
                            </div>
                            <button
                                type="button"
                                className="calendar-close-button"
                                aria-label="Close calendar"
                                onClick={() => setIsCalendarModalOpen(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </header>

                        <div className="calendar-desktop-controls">
                            <span>Jump to Date:</span>
                            <div>
                                <select
                                    aria-label="Select month"
                                    value={calMonth}
                                    onChange={(event) => setCalMonth(Number(event.target.value))}
                                >
                                    {monthNames.map((month, index) => (
                                        <option key={month} value={index}>{month}</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Select year"
                                    value={calYear}
                                    onChange={(event) => setCalYear(Number(event.target.value))}
                                >
                                    {yearsList.map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="calendar-mobile-controls">
                            <div className="calendar-month-picker">
                                <button
                                    type="button"
                                    className="calendar-month-picker-button"
                                    aria-expanded={isMonthPickerOpen}
                                    aria-haspopup="true"
                                    onClick={() => setIsMonthPickerOpen((isOpen) => !isOpen)}
                                >
                                    {monthNames[calMonth]}
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                                {isMonthPickerOpen && (
                                    <div className="calendar-month-options">
                                        {monthNames.map((month, index) => (
                                            <button
                                                type="button"
                                                key={month}
                                                className={index === calMonth ? 'selected' : ''}
                                                onClick={() => {
                                                    setCalMonth(index);
                                                    setIsMonthPickerOpen(false);
                                                }}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <select
                                aria-label="Select year"
                                className="calendar-year-select"
                                value={calYear}
                                onChange={(event) => {
                                    setCalYear(Number(event.target.value));
                                    setIsMonthPickerOpen(false);
                                }}
                            >
                                {yearsList.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="calendar-today-button"
                                onClick={goToCurrentMonth}
                            >
                                Today
                            </button>
                        </div>

                        <div className="calendar-weekdays" aria-hidden="true">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day}>{day}</div>
                            ))}
                        </div>

                        <div className="calendar-month-grid">
                            {Array.from({ length: calendarDayCount }, (_, index) => {
                                const thisDateObj = new Date(calYear, calMonth, index - firstDayIndex + 1);
                                const isCurrentMonth = thisDateObj.getMonth() === calMonth;
                                const isToday = thisDateObj.toDateString() === new Date().toDateString();
                                const dayEvents = calendarEvents.filter(
                                    (event) => event.date === thisDateObj.toDateString()
                                );
                                const dateLabel = thisDateObj.toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                });
                                const dayClasses = [
                                    'calendar-day',
                                    !isCurrentMonth && 'other-month',
                                    isToday && 'today',
                                    dayEvents.length > 0 && 'has-events'
                                ].filter(Boolean).join(' ');

                                return (
                                    <button
                                        type="button"
                                        key={thisDateObj.toISOString()}
                                        className={dayClasses}
                                        aria-label={`${dateLabel}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                                        onClick={() => {
                                            setIsMonthPickerOpen(false);
                                            if (!isCurrentMonth) {
                                                setCalMonth(thisDateObj.getMonth());
                                                setCalYear(thisDateObj.getFullYear());
                                            }
                                            setSelectedDate(thisDateObj);
                                            setIsDayDetailModalOpen(true);
                                        }}
                                    >
                                        <span className="calendar-day-number">{thisDateObj.getDate()}</span>
                                        <span className="calendar-event-dots" aria-hidden="true">
                                            {dayEvents.slice(0, 3).map((calendarEvent, eventIndex) => (
                                                <span
                                                    key={`${calendarEvent.type}-${eventIndex}`}
                                                    className={`calendar-event-dot ${calendarEvent.status.toLowerCase()}`}
                                                />
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <span className="calendar-more-events">+{dayEvents.length - 3}</span>
                                            )}
                                        </span>
                                        <span className="calendar-day-events">
                                            {dayEvents.slice(0, 2).map((calendarEvent, eventIndex) => (
                                                <span
                                                    key={`label-${calendarEvent.type}-${eventIndex}`}
                                                    className={`calendar-event-pill ${calendarEvent.status.toLowerCase()}`}
                                                >
                                                    {calendarEvent.title}
                                                </span>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span className="calendar-more-events">
                                                    +{dayEvents.length - 2} more
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <footer className="calendar-legend">
                            <span><i className="calendar-legend-dot upcoming"></i>Upcoming</span>
                            <span><i className="calendar-legend-dot completed"></i>Completed</span>
                            <span><i className="calendar-legend-dot overdue"></i>Cancelled / overdue</span>
                            <span><i className="calendar-legend-dot expiry"></i>Expiry</span>
                        </footer>
                    </section>
                </div>
            )}

            {/* DAY DETAIL MODAL */}
            {isDayDetailModalOpen && selectedDate && (
                <div
                    className="calendar-detail-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsDayDetailModalOpen(false);
                        }
                    }}
                >
                    <section
                        className="calendar-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="calendar-detail-title"
                    >
                        <header className="calendar-detail-header">
                            <h3 id="calendar-detail-title">
                                {selectedDate.toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </h3>
                            <button
                                type="button"
                                className="calendar-close-button"
                                aria-label="Close day details"
                                onClick={() => setIsDayDetailModalOpen(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </header>
                        <div className="calendar-event-list">
                            {calendarEvents.filter(ev => ev.date === selectedDate.toDateString()).length > 0 ? (
                                calendarEvents.filter(ev => ev.date === selectedDate.toDateString()).map((ev, i) => {
                                    return (
                                        <article key={i} className="calendar-event-card">
                                            <div className="calendar-event-card-heading">
                                                <strong>{ev.title}</strong>
                                                <span className={`calendar-event-status ${ev.status.toLowerCase()}`}>
                                                    {ev.status}
                                                </span>
                                            </div>
                                            <p>{ev.desc}</p>
                                        </article>
                                    );
                                })
                            ) : (
                                <p className="calendar-empty-day">No events or schedules for this date.</p>
                            )}
                        </div>
                        <footer className="calendar-detail-actions">
                            <button
                                type="button"
                                onClick={() => setIsDayDetailModalOpen(false)}
                            >
                                Done
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}