import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import App from './pages/App.jsx';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import HealthRecords from './pages/HealthRecords';
import Forecast from './pages/Forecast';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Patient from './pages/Patient';


function Routing() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Transactions" element={<Transactions />} />
        <Route path="/HealthRecords" element={<HealthRecords />} />
        <Route path="/Forecast" element={<Forecast />} />
        <Route path="/Patient" element={<Patient />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Notifications" element={<Notifications />} />
      </Routes>
    </Router>
  );
}

export default Routing;