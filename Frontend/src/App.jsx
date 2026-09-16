import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Transactions from "./pages/Transactions";
import HealthRecords from "./pages/HealthRecords";
import Forecast from "./pages/Forecast";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import "./App.css";


function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [email, setEmail] = useState("");
    // change for const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [activePage, setActivePage] = useState("dashboard");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    
    const menuItems = [
        {
            title: "MAIN",
            items: [
                { id: "dashboard", icon: "fa-solid fa-chart-line", label: "Dashboard" },
                { id: "inventory", icon: "fa-solid fa-boxes-stacked", label: "Inventory" },
                { id: "transactions", icon: "fa-solid fa-right-left", label: "Stock Transactions" },
            ],
        },
        {
            title: "MANAGEMENT",
            items: [
                { id: "health-records", icon: "fa-solid fa-notes-medical", label: "Health Records" },
                { id: "forecast", icon: "fa-solid fa-chart-column", label: "Demand Forecast" },
                { id: "reports", icon: "fa-solid fa-file-lines", label: "Reports" },
                { id: "notifications", icon: "fa-solid fa-bell", label: "Notifications" },
            ],
        },
    ];

    const pageTitles = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Veterinary Inventory Management System",
        },
        inventory: {
            title: "Inventory",
            subtitle: "Manage medicines and veterinary supplies",
        },
        transactions: {
            title: "Stock Transactions",
            subtitle: "Monitor stock in and stock out transactions",
        },
        "health-records": {
            title: "Health Records",
            subtitle: "Manage veterinary health records",
        },
        forecast: {
            title: "Demand Forecast",
            subtitle: "Predict future medicine demand",
        },
        reports: {
            title: "Reports",
            subtitle: "Generate inventory and transaction reports",
        },
        notifications: {
            title: "Notifications",
            subtitle: "View system alerts and notifications",
        },
    };

   async function handleLogin(event) {
    event.preventDefault();

    setLoginError("");

    try {
        const response = await fetch(
            "http://localhost:3001/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setLoginError(data.message || "Login failed.");
            return;
        }

        // Save JWT token
        localStorage.setItem("token", data.token);

        // Save logged-in user information
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        setLoggedIn(true);
        setLoginError("");

    } catch (error) {
        console.error("Login error:", error);

        setLoginError(
            "Unable to connect to the server."
        );
    }
}

    function handleLogout() {
        setLoggedIn(false);
        setEmail("");
        setPassword("");
        setLoginError("");
    
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }

    function showPage(pageId) {
        setActivePage(pageId);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function toggleSidebar() {
        setSidebarCollapsed(!sidebarCollapsed);
    }

    if (!loggedIn) {
        return (
            <div className="login-page">
                <form className="login-box" onSubmit={handleLogin}>
                    <div className="login-logo">
                        <i className="fa-solid fa-paw"></i>
                    </div>

                    <h1>VetStock</h1>

                    <p>
                        Veterinary Inventory Management System
                    </p>

                    <div className="login-input">
                        <i className="fa-solid fa-user"></i>

                        <input
                            type="text"
                            placeholder="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="login-input">
                        <i className="fa-solid fa-lock"></i>

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>

                    <button type="submit" className="login-btn">
                        Login
                    </button>

                    {loginError && (
                        <p
                            className="login-error"
                            style={{ display: "block" }}
                        >
                            Invalid username or password.
                        </p>
                    )}
                </form>
            </div>
        );
    }

    return (
        <div className="app">

            {/* SIDEBAR */}
            <aside
                id="sidebar"
                className={`sidebar ${
                    sidebarCollapsed ? "collapsed" : ""
                }`}
            >
                <div className="logo">
                    <i className="fa-solid fa-paw"></i>

                    <div>
                        <h2>VetStock</h2>
                        <span>Veterinary System</span>
                    </div>
                </div>

                <div className="menu">

                    {menuItems.map((section) => (
                        <div key={section.title}>

                            <div className="menu-title">
                                {section.title}
                            </div>

                            {section.items.map((item) => (
                                <button
                                    key={item.id}
                                    className={`menu-item ${
                                        activePage === item.id
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => showPage(item.id)}
                                >
                                    <i className={item.icon}></i>

                                    <span>{item.label}</span>

                                    {item.id === "notifications" && (
                                        <span className="notification-count">
                                            3
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}

                </div>

                <div className="sidebar-bottom">

                    <div className="user-profile">

                        <div className="avatar">
                            AD
                        </div>

                        <div>
                            <strong>Admin</strong>
                            <small>Administrator</small>
                        </div>

                    </div>

                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                        &nbsp; Logout
                    </button>

                </div>
            </aside>


            {/* MAIN */}
            <main
                className={`main ${
                    sidebarCollapsed ? "expanded" : ""
                }`}
            >

                {/* TOPBAR */}
                <header className="topbar">

                    <button
                        className="sidebar-toggle"
                        onClick={toggleSidebar}
                    >
                        <i
                            className={
                                sidebarCollapsed
                                    ? "fa-solid fa-chevron-right"
                                    : "fa-solid fa-chevron-left"
                            }
                        ></i>
                    </button>

                    <div className="page-title">

                        <h1>
                            {pageTitles[activePage].title}
                        </h1>

                        <p>
                            {pageTitles[activePage].subtitle}
                        </p>

                    </div>

                    <div className="top-actions">

                        <button
                            className="icon-button"
                            onClick={() =>
                                showPage("notifications")
                            }
                        >
                            <i className="fa-solid fa-bell"></i>
                            <span>3</span>
                        </button>

                        <div className="top-user">

                            <div className="avatar">
                                AD
                            </div>

                            <div>
                                <strong>Admin</strong>
                                <small>Administrator</small>
                            </div>

                        </div>

                    </div>

                </header>


                {/* CONTENT */}
                <div className="content">

                    {activePage === "dashboard" && (
                        <Dashboard
                            showPage={showPage}
                        />
                    )}

                    {activePage === "inventory" && (
                        <Inventory />
                    )}

                    {activePage === "transactions" && (
                        <Transactions />
                    )}

                    {activePage === "health-records" && (
                        <HealthRecords />
                    )}

                    {activePage === "forecast" && (
                        <Forecast />
                    )}

                    {activePage === "reports" && (
                        <Reports />
                    )}

                    {activePage === "notifications" && (
                        <Notifications />
                    )}

                </div>

            </main>

        </div>
    );
}

export default App;

