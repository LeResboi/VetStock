import React, { useState, useEffect, useCallback } from 'react';
import './HealthRecords.css';

export default function HealthRecords() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State para sa Add Record
  const [showModal, setShowModal] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  // 1. Fetch Health Records from Backend/Supabase
  const fetchHealthRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'http://localhost:3001/api/health-records',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setRecords(Array.isArray(data.data) ? data.data : []);
      } else {
        setError(data.message || 'Failed to load health records.');
      }
    } catch (err) {
      console.error('Error fetching health records:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 2. Fetch patients for the Patient Record Number dropdown
  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError('');

    try {
      const response = await fetch(
        'http://localhost:3001/api/patients',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load patients.');
      }

      setPatients(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setPatientsError(err.message || 'Unable to load patients.');
    } finally {
      setPatientsLoading(false);
    }
  }, [token]);

  // Fetch both when the component loads
  useEffect(() => {
    fetchHealthRecords();
    fetchPatients();
  }, [fetchHealthRecords, fetchPatients]);
  //nf asbfasbfasmf

  // 2. Handle Submit para sa Bagong Health Record
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!patientId) {
      alert('Please select a patient.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/api/health-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          diagnosis,
          symptoms,
          treatment,
          notes
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Health record successfully added!');
        setShowModal(false);
        setPatientId('');
        setDiagnosis('');
        setSymptoms('');
        setTreatment('');
        setNotes('');
        fetchHealthRecords(); // Refresh table
      } else {
        alert(data.message || 'Failed to save health record.');
      }
    } catch (err) {
      console.error('Error creating health record:', err);
      alert('An error occurred on the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter(rec => {
    const recordId = rec.record_id || ''; const mrn = rec.mrn_number
      ? String(rec.mrn_number).padStart(3, '0')
      : '';
    const diag = rec.diagnosis || '';

    return (
      recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diag.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="health-records-page">
      {/* Page Header */}
      <div className="health-records-header">
        <div>
          <h2>Health Records</h2>
          <p>Manage patient health records, diagnoses, and treatments efficiently in real-time.</p>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus"></i> Add Record
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="health-records-stats">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fa-solid fa-file-medical"></i></div>
          <div>
            <h3>{records.length}</h3>
            <p>Total Records</p>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="health-records-toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            placeholder="Search patient, ID, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p>Loading health records from database...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
            <p>{error}</p>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Patient Record Number</th>
                <th>Diagnosis</th>
                <th>Symptoms</th>
                <th>Treatment</th>
                <th>Record Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  const formattedDate = rec.record_date
                    ? new Date(rec.record_date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })
                    : 'N/A';
                  const mrnDisplay = rec.mrn_number
                    ? String(rec.mrn_number).padStart(3, '0')
                    : 'N/A';
                  const symptomsDisplay = Array.isArray(rec.symptoms)
                    ? rec.symptoms.join(', ')
                    : (rec.symptoms || 'N/A');

                  return (
                    <tr key={rec.record_id}>
                      <td><span className="item-id">#{rec.record_id.substring(0, 8)}</span></td>
                      <td>{mrnDisplay}</td>
                      <td><strong>{rec.diagnosis || 'General Checkup'}</strong></td>
                      <td>{symptomsDisplay}</td>
                      <td>{rec.treatment_notes || 'N/A'}</td>
                      <td>{formattedDate}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">No health records found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Health Record</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateRecord}>
              <div className="form-group">
                <label>Patient Record Number</label>

                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  disabled={patientsLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#000000'
                  }}
                >
                  <option value="">
                    {patientsLoading ? 'Loading patients...' : 'Select Patient'}
                  </option>

                  {patients.map((patient) => (
                    <option
                      key={patient.patient_id}
                      value={patient.patient_id}
                    >
                      {patient.mrn_number != null
                        ? String(patient.mrn_number).padStart(3, '0')
                        : 'N/A'}
                      {' — '}
                      {patient.patient_name}
                    </option>
                  ))}
                </select>

                {patientsError && (
                  <p style={{ color: '#dc2626', fontSize: '12px' }}>
                    {patientsError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g., Infection, Fever..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g., Bruises, Cough..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Treatment Notes</label>
                <input
                  type="text"
                  placeholder="e.g., Medication, Rest..."
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}