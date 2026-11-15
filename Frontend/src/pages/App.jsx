import React, { useState, useEffect } from 'react';
import {
    useNavigate,
    useLocation,
    Outlet,
    Navigate
} from 'react-router-dom';

import '../App.css';
import './Auth.css';
import illustrationImg from '../assets/Icon.png';
import Notification from '../components/Notification';

// ============================================================
// 1. LOGIN / REGISTER COMPONENT
// ============================================================

export default function AuthApp() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const savedNotification = sessionStorage.getItem('authNotification');

        if (savedNotification) {
            sessionStorage.removeItem('authNotification');

            try {
                setNotification(JSON.parse(savedNotification));
            } catch (error) {
                console.error('Error reading saved notification:', error);
            }
        }
    }, []);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');

        if (isRegister && password !== confirmPassword) {
            setError('Passwords do not match!');
            return;
        }

        const endpoint = isRegister
            ? 'https://vetstock-backend.onrender.com/api/auth/register'
            : 'https://vetstock-backend.onrender.com/api/auth/login';

        const payload = isRegister
            ? {
                first_name: firstName,
                last_name: lastName,
                email,
                role,
                password
            }
            : {
                email,
                password
            };

        try {
            const response = await fetch(endpoint, {
                method: 'POST', headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'An error occurred'
                );
            }

            if (isRegister) {
                setNotification({
                    message:
                        data.message ||
                        'Registration request submitted. Please wait for Administrator approval.',
                    type: 'success'
                });

                setIsRegister(false);
                setFirstName('');
                setLastName('');
                setEmail('');
                setRole('');
                setPassword('');
                setConfirmPassword('');
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem(
                    'user',
                    JSON.stringify(data.user)
                );

                navigate('/Dashboard');
            }

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">

                <div className="auth-left">
                    <div className="illustration-box">
                        <img
                            src={illustrationImg}
                            alt="VetStock Illustration"
                        />
                    </div>

                    <h2>VetStock System</h2>

                    <p>
                        Manage your inventory and records easily and efficiently.
                    </p>
                </div>

                <div className="auth-right">
                    <h2>
                        {isRegister ? 'Create Account' : 'Login'}
                    </h2>

                    <p className="auth-subtitle">
                        {isRegister
                            ? 'Create a new VetStock account'
                            : 'Enter your details to sign in'}
                    </p>

                    {notification && (
                        <Notification
                            message={notification.message}
                            type={notification.type}
                            onClose={() => setNotification(null)}
                        />
                    )}

                    {error && (
                        <div className="error-msg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuth}>
                        {isRegister && (
                            <>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) =>
                                            setFirstName(e.target.value)
                                        }
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) =>
                                            setLastName(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="input-group">
                            <input
                                type="email"
                                placeholder="Email ID"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />
                        </div>

                        {isRegister && (
                            <div className="input-group">
                                <select
                                    value={role}
                                    onChange={(e) =>
                                        setRole(e.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Select Role
                                    </option>
                                    <option value="Inventory Staff">
                                        Inventory Staff
                                    </option>
                                    <option value="Veterinarian">
                                        Veterinarian
                                    </option>
                                    <option value="Clinic Manager">
                                        Clinic Manager
                                    </option>
                                </select>
                            </div>
                        )}

                        <div className="input-group password-group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <i
                                className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide Password' : 'Show Password'}
                            ></i>
                        </div>

                        {isRegister && (
                            <div className="input-group password-group">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />

                                <i
                                    className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                                ></i>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-btn"
                        >
                            {isRegister
                                ? 'Create Account'
                                : 'Login'}
                        </button>
                    </form>

                    <div className="auth-links-row">
                        {!isRegister ? (
                            <>
                                <span onClick={() => setIsRegister(true)}>
                                    Create an Account.
                                </span>

                                <span onClick={() => navigate('/forgot-password')}>
                                    Forgot Password?
                                </span>
                            </>
                        ) : (
                            <p>
                                Already have an account?{' '}
                                <span onClick={() => setIsRegister(false)}>
                                    Login
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// 2. MAIN DASHBOARD LAYOUT
// ============================================================

export function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const currentPath = location.pathname.toLowerCase();

    const [userName, setUserName] = useState('Admin User');

    const [userRole, setUserRole] = useState(() => {
        try {
            const storedUser = JSON.parse(
                localStorage.getItem('user') || '{}'
            );

            return (
                storedUser.roles?.role_name ||
                storedUser.role ||
                storedUser.role_name ||
                ''
            );
        } catch {
            return '';
        }
    });

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);

                const first =
                    parsedUser.first_name ||
                    parsedUser.firstName ||
                    '';

                const last =
                    parsedUser.last_name ||
                    parsedUser.lastName ||
                    '';

                const fullName =
                    parsedUser.name ||
                    `${first} ${last}`.trim() ||
                    parsedUser.username ||
                    parsedUser.email;

                if (fullName) {
                    setUserName(fullName);
                }

                const roleName =
                    parsedUser.roles?.role_name ||
                    parsedUser.role ||
                    parsedUser.role_name;

                if (roleName) {
                    setUserRole(roleName);
                }
            }
        } catch (error) {
            console.error(
                'Error reading user from localStorage',
                error
            );
        }
    }, []);

    const userInitial = userName
        ? userName.charAt(0).toUpperCase()
        : 'A';

    // Return to login if there is no saved token.
    if (!localStorage.getItem('token')) {
        return <Navigate to="/" replace />;
    }

    const handleLogout = async () => {
        const token = localStorage.getItem('token');

        try {
            if (token) {
                const response = await fetch(
                    'https://vetstock-backend.onrender.com/api/auth/logout',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || 'Failed to record logout.'
                    );
                }
            }

        } catch (error) {
            console.error('Logout audit error:', error);

            sessionStorage.setItem(
                'authNotification',
                JSON.stringify({
                    message: 'You have been logged out, but the logout activity could not be recorded.',
                    type: 'error'
                })
            );
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            navigate('/');
        }
    };

    return (
        <div className="app">

            <aside
                className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''
                    }`}
            >
                <div className="sidebar-header">
                    <div className="sidebar-logo-icon">
                        <img
                            src={illustrationImg}
                            alt="VetStock Logo"
                            className="logo-img"
                        />
                    </div>

                    <div className="sidebar-brand-text">
                        <h2>VetStock</h2>
                        <span>Inventory System</span>
                    </div>
                </div>

                <div className="sidebar-menu">
                    <div className="sidebar-section">
                        <div className="sidebar-title">
                            Menu
                        </div>

                        <button
                            className={`sidebar-menu-item ${currentPath === '/dashboard'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Dashboard')}
                        >
                            <i className="fa-solid fa-chart-pie"></i>
                            <span className="menu-label">
                                Dashboard
                            </span>
                        </button>

                        <button
                            className={`sidebar-menu-item ${currentPath === '/inventory'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Inventory')}
                        >
                            <i className="fa-solid fa-boxes-stacked"></i>
                            <span className="menu-label">
                                Inventory
                            </span>
                        </button>

                        <button
                            className={`sidebar-menu-item ${currentPath === '/transactions'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Transactions')}
                        >
                            <i className="fa-solid fa-right-left"></i>
                            <span className="menu-label">
                                Transactions
                            </span>
                        </button>

                        <button
                            className={`sidebar-menu-item ${currentPath === '/patient'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Patient')}
                        >
                            <i className="fa-solid fa-hospital-user"></i>
                            <span className="menu-label">
                                Patient
                            </span>
                        </button>


                        {/* HEALTH RECORDS - HIDDEN FOR INVENTORY STAFF */}
                        {['administrator', 'clinic manager', 'veterinarian'].includes(
                            userRole?.trim().toLowerCase()
                        ) && (
                                <button
                                    className={`sidebar-menu-item ${currentPath === '/healthrecords'
                                        ? 'active'
                                        : ''
                                        }`}
                                    onClick={() => navigate('/HealthRecords')}
                                >
                                    <i className="fa-solid fa-file-medical"></i>
                                    <span className="menu-label">
                                        Health Records
                                    </span>
                                </button>
                            )}

                        <button
                            className={`sidebar-menu-item ${currentPath === '/forecast'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Forecast')}
                        >
                            <i className="fa-solid fa-chart-line"></i>
                            <span className="menu-label">
                                Forecast
                            </span>
                        </button>

                        {/* USER MANAGEMENT - ADMINISTRATOR ONLY */}
                        {userRole?.trim().toLowerCase() === 'administrator' && (
                            <button
                                className={`sidebar-menu-item ${currentPath === '/usermanagement' ? 'active' : ''
                                    }`}
                                onClick={() => navigate('/UserManagement')}
                            >
                                <i className="fa-solid fa-users-gear"></i>

                                <span className="menu-label">
                                    User Management
                                </span>
                            </button>
                        )}

                        {userRole?.trim().toLowerCase() === 'administrator' && (
                            <button
                                className={`sidebar-menu-item ${currentPath === '/audit_logs' ? 'active' : ''
                                    }`}
                                onClick={() => navigate('/Audit_Logs')}
                            >
                                <i className="fa-solid fa-clipboard-list"></i>

                                <span className="menu-label">
                                    Audit Logs
                                </span>
                            </button>
                        )}

                        <button
                            className={`sidebar-menu-item ${currentPath === '/reports'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Reports')}
                        >
                            <i className="fa-solid fa-file-lines"></i>
                            <span className="menu-label">
                                Reports
                            </span>
                        </button>

                        <button
                            className={`sidebar-menu-item ${currentPath === '/notifications'
                                ? 'active'
                                : ''
                                }`}
                            onClick={() => navigate('/Notifications')}
                        >
                            <i className="fa-solid fa-bell"></i>
                            <span className="menu-label">
                                Notifications
                            </span>
                        </button>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <div className="sidebar-user-card">
                        <div className="avatar">
                            {userInitial}
                        </div>

                        <div className="sidebar-user-info">
                            <strong>{userName}</strong>
                            <small>{userRole}</small>
                        </div>
                    </div>

                    <button
                        className="sidebar-logout-btn"
                        onClick={handleLogout}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main
                className={`main ${sidebarCollapsed ? 'expanded' : ''
                    }`}
            >
                <header className="topbar">
                    <button
                        className="sidebar-toggle"
                        onClick={() =>
                            setSidebarCollapsed(!sidebarCollapsed)
                        }
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>

                    <div className="page-title">
                        <h1
                            style={{
                                fontSize: '25px',
                                fontWeight: 'bold',
                                spacing: '10px',
                                color: '#000000'
                            }}
                        >
                            VetStock Dashboard
                        </h1>
                    </div>

                    <div className="top-actions">
                        <div
                            className="top-user"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <div
                                className="avatar"
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {userInitial}
                            </div>

                            <strong style={{ fontSize: '13px' }}>
                                {userName}
                            </strong>
                        </div>
                    </div>
                </header>

                <div className="content">
                    {(
                        currentPath === '/audit_logs' ||
                        currentPath === '/usermanagement'
                    ) &&
                        userRole?.trim().toLowerCase() !== 'administrator' ? (
                        <Navigate to="/Dashboard" replace />
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>
        </div>
    );
}