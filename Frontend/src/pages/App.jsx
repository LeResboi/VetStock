import { useState, useEffect } from "react";

import Dashboard from "./Dashboard";
import Inventory from "./Inventory";
import Transactions from "./Transactions";
import HealthRecords from "./HealthRecords";
import Forecast from "./Forecast";
import Reports from "./Reports";
import Notifications from "./Notifications";
import Patient from "./Patient";
import "../App.css";


function App() {
    const [loggedIn, setLoggedIn] = useState(false);

    const [email, setEmail] = useState("");
    // change for const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const [showCreateAccount, setShowCreateAccount] = useState(false);

    const [registerData, setRegisterData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        role: "",
        password: "",
        confirm_password: ""
    });

    const [registerError, setRegisterError] = useState("");
    const [registerSuccess, setRegisterSuccess] = useState("");
    const [registerSaving, setRegisterSaving] = useState(false);


    const [activePage, setActivePage] = useState("dashboard");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [notificationCount, setNotificationCount] = useState(0);

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("user")
            ) || null;
        } catch (error) {
            return null;
        }
    });

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
                { id: "patients", icon: "fa-solid fa-paw", label: "Patients" },
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
        patients: {
            title: "Patients",
            subtitle: "Manage veterinary patient records",
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

    // ================= LOAD NOTIFICATION COUNT =================

    async function loadNotificationCount() {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                setNotificationCount(0);
                return;
            }

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
                    "Failed to load notification count:",
                    data.message
                );
                return;
            }

            setNotificationCount(
                Array.isArray(data.data)
                    ? data.data.length
                    : 0
            );

        } catch (error) {
            console.error(
                "Notification count error:",
                error
            );
        }
    }

    useEffect(() => {

        if (!loggedIn) {
            return;
        }

        loadNotificationCount();

        const interval = setInterval(
            loadNotificationCount,
            30000
        );

        return () => {
            clearInterval(interval);
        };

    }, [loggedIn]);

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

            setCurrentUser(data.user);

            setLoggedIn(true);
            setLoginError("");

        } catch (error) {
            console.error("Login error:", error);

            setLoginError(
                "Unable to connect to the server."
            );
        }
    }

    // ================= CREATE ACCOUNT INPUT CHANGE =================

    function handleRegisterChange(event) {
        const { name, value } = event.target;

        setRegisterData({
            ...registerData,
            [name]: value
        });
    }

    // ================= CREATE ACCOUNT SUBMIT =================

    async function handleRegister(event) {

        event.preventDefault();

        setRegisterError("");
        setRegisterSuccess("");
        setRegisterSaving(true);

        try {

            // ================= REQUIRED FIELDS =================

            if (!registerData.first_name.trim()) {
                throw new Error("First name is required.");
            }

            if (!registerData.last_name.trim()) {
                throw new Error("Last name is required.");
            }

            if (!registerData.email.trim()) {
                throw new Error("Email is required.");
            }

            if (!registerData.role) {
                throw new Error("Please select a role.");
            }

            if (!registerData.password) {
                throw new Error("Password is required.");
            }

            if (registerData.password.length < 8) {
                throw new Error(
                    "Password must be at least 8 characters."
                );
            }

            if (
                registerData.password !==
                registerData.confirm_password
            ) {
                throw new Error(
                    "Passwords do not match."
                );
            }


            // ================= SEND TO BACKEND =================

            const response = await fetch(
                "http://localhost:3001/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        first_name:
                            registerData.first_name.trim(),

                        last_name:
                            registerData.last_name.trim(),

                        email:
                            registerData.email.trim(),

                        role:
                            registerData.role,

                        password:
                            registerData.password

                    })
                }
            );


            const data = await response.json();

            console.log(
                "Registration response:",
                data
            );


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Registration failed."
                );

            }


            // ================= SUCCESS =================

            setRegisterSuccess(
                "Account registration submitted successfully. Please wait for administrator approval."
            );


            // ================= CLEAR FORM =================

            setRegisterData({
                first_name: "",
                last_name: "",
                email: "",
                role: "",
                password: "",
                confirm_password: ""
            });


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            setRegisterError(
                error.message
            );

        } finally {

            setRegisterSaving(false);

        }

    }

    function handleLogout() {
        setLoggedIn(false);
        setEmail("");
        setPassword("");
        setLoginError("");

        setCurrentUser(null);
        setNotificationCount(0);

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

    // ================= CURRENT USER DISPLAY =================

    const displayName =
        currentUser
            ? [
                currentUser.first_name,
                currentUser.last_name
            ]
                .filter(Boolean)
                .join(" ")
            : "";

    const userName =
        displayName ||
        currentUser?.email ||
        "User";

    const userRole =
        currentUser?.role ||
        currentUser?.role_name ||
        "User";

    const userInitials =
        displayName
            ? displayName
                .split(" ")
                .filter(Boolean)
                .map((name) => name[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "U";


    if (!loggedIn) {

        // ======================================================
        // CREATE ACCOUNT PAGE
        // ======================================================

        if (showCreateAccount) {

            return (
                <div className="login-page">

                    <form
                        className="login-box"
                        onSubmit={handleRegister}
                    >

                        <div className="login-logo">
                            <i className="fa-solid fa-paw"></i>
                        </div>

                        <h1>Create Account</h1>

                        <p>
                            Create a new VetStock account
                        </p>


                        {/* FIRST NAME */}

                        <div className="login-input">

                            <i className="fa-solid fa-user"></i>

                            <input
                                type="text"
                                name="first_name"
                                placeholder="First Name"
                                value={registerData.first_name}
                                onChange={handleRegisterChange}
                                required
                            />

                        </div>


                        {/* LAST NAME */}

                        <div className="login-input">

                            <i className="fa-solid fa-user"></i>

                            <input
                                type="text"
                                name="last_name"
                                placeholder="Last Name"
                                value={registerData.last_name}
                                onChange={handleRegisterChange}
                                required
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="login-input">

                            <i className="fa-solid fa-envelope"></i>

                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={registerData.email}
                                onChange={handleRegisterChange}
                                required
                            />

                        </div>


                        {/* ROLE */}

                        <div className="login-input">

                            <i className="fa-solid fa-user-shield"></i>

                            <select
                                name="role"
                                value={registerData.role}
                                onChange={handleRegisterChange}
                                required
                            >

                                <option value="">
                                    Select Role
                                </option>

                                <option value="Administrator">
                                    Administrator
                                </option>

                                <option value="Clinic Manager">
                                    Clinic Manager
                                </option>

                                <option value="Inventory Staff">
                                    Inventory Staff
                                </option>

                                <option value="Veterinarian">
                                    Veterinarian
                                </option>

                            </select>

                        </div>


                        {/* PASSWORD */}

                        <div className="login-input">

                            <i className="fa-solid fa-lock"></i>

                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={registerData.password}
                                onChange={handleRegisterChange}
                                required
                            />

                        </div>


                        {/* CONFIRM PASSWORD */}

                        <div className="login-input">

                            <i className="fa-solid fa-lock"></i>

                            <input
                                type="password"
                                name="confirm_password"
                                placeholder="Confirm Password"
                                value={registerData.confirm_password}
                                onChange={handleRegisterChange}
                                required
                            />

                        </div>


                        {/* ERROR */}

                        {registerError && (
                            <p
                                className="login-error"
                                style={{ display: "block" }}
                            >
                                {registerError}
                            </p>
                        )}


                        {/* SUCCESS */}

                        {registerSuccess && (
                            <p>
                                {registerSuccess}
                            </p>
                        )}


                        {/* CREATE ACCOUNT */}

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={registerSaving}
                        >

                            {registerSaving
                                ? "Creating Account..."
                                : "Create Account"
                            }

                        </button>


                        {/* BACK TO LOGIN */}

                        <button
                            type="button"
                            className="login-btn"
                            onClick={() => {

                                setShowCreateAccount(false);
                                setRegisterError("");
                                setRegisterSuccess("");

                            }}
                        >
                            Back to Login
                        </button>

                    </form>

                </div>
            );

        }


        // ======================================================
        // LOGIN PAGE
        // ======================================================

        return (
            <div className="login-page">

                <form
                    className="login-box"
                    onSubmit={handleLogin}
                >

                    <div className="login-logo">
                        <i className="fa-solid fa-paw"></i>
                    </div>

                    <h1>VetStock</h1>

                    <p>
                        Veterinary Inventory Management System
                    </p>


                    {/* EMAIL */}

                    <div className="login-input">

                        <i className="fa-solid fa-user"></i>

                        <input
                            type="text"
                            placeholder="Email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                        />

                    </div>


                    {/* PASSWORD */}

                    <div className="login-input">

                        <i className="fa-solid fa-lock"></i>

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                        />

                    </div>


                    {/* LOGIN */}

                    <button
                        type="submit"
                        className="login-btn"
                    >
                        Login
                    </button>


                    {/* CREATE ACCOUNT */}

                    <button
                        type="button"
                        className="login-btn"
                        onClick={() => {

                            setShowCreateAccount(true);
                            setLoginError("");

                        }}
                    >
                        Create Account
                    </button>


                    {/* LOGIN ERROR */}

                    {loginError && (
                        <p
                            className="login-error"
                            style={{ display: "block" }}
                        >
                            {loginError}
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
                className={`sidebar ${sidebarCollapsed ? "collapsed" : ""
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
                                    className={`menu-item ${activePage === item.id
                                        ? "active"
                                        : ""
                                        }`}
                                    onClick={() => showPage(item.id)}
                                >
                                    <i className={item.icon}></i>

                                    <span>{item.label}</span>

                                    {item.id === "notifications" &&
                                        notificationCount > 0 && (
                                            <span className="notification-count">
                                                {notificationCount}
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
                            {userInitials}
                        </div>

                        <div>
                            <strong>{userName}</strong>
                            <small>{userRole}</small>
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
                className={`main ${sidebarCollapsed ? "expanded" : ""
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

                            {notificationCount > 0 && (
                                <span>
                                    {notificationCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="top-user">

                        <div className="avatar">
                            {userInitials}
                        </div>

                        <div>
                            <strong>{userName}</strong>
                            <small>{userRole}</small>
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

                    {activePage === "patients" && (
                        <Patient />
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
                        <Notifications
                            onAlertCountChange={setNotificationCount}
                        />
                    )}

                </div>

            </main>

        </div>
    );
}

export default App;