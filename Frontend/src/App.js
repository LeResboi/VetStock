import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import AuthApp, { MainLayout } from './pages/App.jsx';

import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import HealthRecords from './pages/HealthRecords';
import Forecast from './pages/Forecast';
import Reports from './pages/Reports';
import AuditLogs from './pages/Audit_Logs';
import Notifications from './pages/Notifications';
import Patient from './pages/Patient';
import UserManagement from "./pages/UserManagement";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';


function DashboardRoute() {
    const navigate = useNavigate();

    return (
        <Dashboard
            showPage={(page) => navigate(`/${page}`)}
        />
    );
}

function Routing() {
    return (
        <Router>
            <Routes>
                {/* Login and registration */}
                <Route path="/" element={<AuthApp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* All application pages share the navbar */}
                <Route element={<MainLayout />}>
                    <Route
                        path="/Dashboard"
                        element={<DashboardRoute />}
                    />
                    <Route path="/Inventory" element={<Inventory />} />
                    <Route path="/Transactions" element={<Transactions />} />
                    <Route path="/HealthRecords" element={<HealthRecords />} />
                    <Route path="/Forecast" element={<Forecast />} />
                    <Route path="/Patient" element={<Patient />} />
                    <Route path="/Audit_Logs" element={<AuditLogs />} />
                    <Route path="/Reports" element={<Reports />} />
                    <Route path="/Notifications" element={<Notifications />} />
                    <Route path="/UserManagement" element={<UserManagement />} />
                </Route>

                {/* Unknown route */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </Router>
    );
}

export default Routing;