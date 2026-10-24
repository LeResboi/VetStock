import React, { useState, useEffect, useCallback } from 'react';
import './Patient.css';

export default function Patient() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Modal State para sa Add Patient
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [species, setSpecies] = useState('');
  const [gender, setGender] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [veterinarians, setVeterinarians] = useState([]);
  const [vetId, setVetId] = useState('');
  const [veterinarianLoading, setVeterinarianLoading] = useState(false);
  const [veterinarianError, setVeterinarianError] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const token = localStorage.getItem('token');

  // 1. Fetch Patients from the backend Backend/Supabase
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPatients(data.data);
      } else {
        setError(data.message || 'Failed to load patients.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch active veterinarians from the backend
  const fetchVeterinarians = useCallback(async () => {
    setVeterinarianLoading(true);
    setVeterinarianError('');

    try {
      const response = await fetch(
        'http://localhost:3001/api/patients/veterinarians',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load veterinarians.'
        );
      }

      setVeterinarians(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Error fetching veterinarians:', err);
      setVeterinarianError(
        err.message || 'Unable to load veterinarians.'
      );
    } finally {
      setVeterinarianLoading(false);
    }
  }, [token]);

  // Fetch patients when the component loads
  useEffect(() => {
    fetchPatients();
    fetchVeterinarians();
  }, [fetchPatients, fetchVeterinarians]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // 2. Handle Submit to new patients
  const resetPatientForm = () => {
    setPatientName('');
    setSpecies('');
    setGender('');
    setOwnerName('');
    setOwnerPhone('');
    setOwnerEmail('');
    setAppointmentDate('');
    setAppointmentTime('');
    setVetId('');
    setAppointmentReason('');
  };

  // Open the modal for adding a patient
  const openAddModal = () => {
    setEditingPatient(null);
    resetPatientForm();
    setShowModal(true);
  };

  // Open the modal for editing an existing patient
  const openEditModal = (pat) => {
    setEditingPatient(pat);

    setPatientName(pat.patient_name || '');
    setSpecies(pat.species || '');
    setGender(pat.gender || '');
    setOwnerName(pat.owner_name || '');
    setOwnerPhone(pat.owner_phone || '');
    setOwnerEmail(pat.owner_email || '');

    setAppointmentDate(
      pat.appointment_date
        ? String(pat.appointment_date).slice(0, 10)
        : ''
    );

    setAppointmentTime(
      pat.appointment_time
        ? String(pat.appointment_time).slice(0, 5)
        : ''
    );

    setVetId(pat.appointment_veterinarian_id || '');
    setAppointmentReason(pat.appointment_reason || '');

    setShowModal(true);
  };

  // Save a new patient or update an existing patient
  const handleSavePatient = async (e) => {
    e.preventDefault();

    if (
      !patientName.trim() ||
      !species.trim() ||
      !ownerName.trim()
    ) {
      alert('Please fill in Patient Name, Species, and Owner Name.');
      return;
    }

    setSubmitting(true);

    try {
      const isEditing = editingPatient !== null;

      const url = isEditing
        ? `http://localhost:3001/api/patients/${encodeURIComponent(
          editingPatient.patient_id
        )}`
        : 'http://localhost:3001/api/patients';

      const patientData = {
        patient_name: patientName.trim(),
        species: species.trim(),
        gender: gender || null,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
        appointment_date: appointmentDate || null,
        appointment_time: appointmentTime || null,
        appointment_veterinarian_id: vetId || null,
        appointment_reason: appointmentReason || null
      };

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(patientData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(
          isEditing
            ? 'Patient information successfully updated!'
            : 'Patient successfully added!'
        );

        setShowModal(false);
        setEditingPatient(null);
        resetPatientForm();

        await fetchPatients();
      } else {
        alert(
          data.message ||
          'Failed to save patient information.'
        );
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      alert('An error occurred. Please check the backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update appointment status to Completed or Cancelled
  const handleUpdateAppointmentStatus = async (pat, newStatus) => {
    if (!pat.appointment_date) {
      alert('This patient has no appointment to update.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ${pat.patient_name}'s appointment as ${newStatus}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/patients/${encodeURIComponent(pat.patient_id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            appointment_status: newStatus
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Appointment marked as ${newStatus}!`);
        await fetchPatients();
      } else {
        alert(data.message || 'Failed to update appointment status.');
      }
    } catch (err) {
      console.error('Error updating appointment status:', err);
      alert('Could not update the appointment. Check your backend server.');
    }
  };

  const filteredPatients = patients.filter(p => {

    const name = p.patient_name || '';
    const id = p.patient_id ? p.patient_id.toString() : '';
    const owner = p.owner_name || '';
    const sp = p.species || '';

    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getAppointmentStatus = (pat) => {
  const savedStatus = String(
    pat.appointment_status || 'Scheduled'
  ).trim().toLowerCase();

  // Completed: keep the existing green status
  if (savedStatus === 'completed') {
    return 'Completed';
  }

  // Cancelled: keep the existing red status
  if (
    savedStatus === 'cancelled' ||
    savedStatus === 'canceled'
  ) {
    return 'Cancelled';
  }

  // Nonappearance: gray status
  if (
    savedStatus === 'nonappearance' ||
    savedStatus === 'non-appearance'
  ) {
    return 'Nonappearance';
  }

  // Check whether a scheduled appointment has passed
  if (savedStatus === 'scheduled' && pat.appointment_date) {
    const date = String(pat.appointment_date).slice(0, 10);

    // If no time was entered, use the end of the appointment date
    const time = pat.appointment_time
      ? String(pat.appointment_time).slice(0, 8)
      : '23:59:59';

    const appointmentTimestamp = new Date(
      `${date}T${time}`
    ).getTime();

    if (
      Number.isFinite(appointmentTimestamp) &&
      appointmentTimestamp < currentTime
    ) {
      return 'Nonappearance';
    }
  }

  // Scheduled: keep the existing yellow status
  return 'Scheduled';
};

  // Count only appointments still scheduled
  const scheduledCount = patients.filter(
    p => getAppointmentStatus(p) === 'Scheduled'
  ).length;

  return (
    <div className="patient-page">
      {/* Page Header */}
      <div className="patient-header">
        <div>
          <h2>Patients & Appointments</h2>
          <p>Manage veterinary patients, species records, and upcoming schedules in real-time.</p>
        </div>
        <button className="add-btn" onClick={openAddModal}>
          <i className="fa-solid fa-paw"></i> Add Patient
        </button>
      </div>


      {/* Quick Stats */}
      <div className="patient-stats">
        <div className="stat-card">
          <div className="stat-icon purple"><i className="fa-solid fa-shield-dog"></i></div>
          <div>
            <h3>{patients.length}</h3>
            <p>Total Patients</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="fa-solid fa-calendar-check"></i></div>
          <div>
            <h3>{scheduledCount}</h3>
            <p>Active Appointments</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and View Toggle */}
      <div className="patient-toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            placeholder="Search patient name, species, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <i className="fa-solid fa-grip"></i>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <i className="fa-solid fa-table"></i>
          </button>
        </div>
      </div>

      {/* Unique Content View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p>Loading patients from database...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
          <p>{error}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="patient-grid">
          {filteredPatients.length > 0 ? (
            filteredPatients.map((pat) => {
              const status = getAppointmentStatus(pat);
              const appDate = pat.appointment_date ? new Date(pat.appointment_date).toLocaleDateString() : 'No Appointment';
              const appTime = pat.appointment_time || '';

              return (
                <div
                  className="patient-card"
                  key={pat.patient_id}
                  onClick={() => setSelectedPatient(pat)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="patient-card-header">
                    <div className="pet-avatar">
                      <i className="fa-solid fa-dog"></i>
                    </div>
                    <span className={`status-badge ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>
                  <div className="patient-card-body">
                    <h3>{pat.patient_name}</h3>
                    <span className="species-tag">{pat.species}</span>

                    <div className="patient-info-row">
                      <span>
                        <i className="fa-solid fa-id-card"></i>{' '}
                        #{pat.patient_id.substring(0, 8)}
                      </span>
                      <span>
                        <i className="fa-solid fa-user"></i> {pat.owner_name}
                      </span>
                    </div>

                    <div className="appointment-box">
                      <i className="fa-regular fa-calendar-days"></i>
                      <span>
                        {appDate} {appTime ? `at ${appTime}` : ''}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px'
                      }}
                    >
                      {/* Edit */}
                      <button
                        type="button"
                        title="Edit Patient"
                        aria-label="Edit Patient"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(pat);
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#0d9488',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>

                      {/* Complete */}
                      {pat.appointment_date && status === 'Scheduled' && (
                        <button
                          type="button"
                          title="Complete Appointment"
                          aria-label="Complete Appointment"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateAppointmentStatus(pat, 'Completed');
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-check"></i>
                        </button>
                      )}

                      {/* Cancel */}
                      {pat.appointment_date && status === 'Scheduled' && (
                        <button
                          type="button"
                          title="Cancel Appointment"
                          aria-label="Cancel Appointment"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateAppointmentStatus(pat, 'Cancelled');
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-data-grid">No patients found in database.</div>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Species</th>
                <th>Owner</th>
                <th>Appointment Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((pat) => {
                  const status = getAppointmentStatus(pat);
                  const appDate = pat.appointment_date ? new Date(pat.appointment_date).toLocaleDateString() : 'N/A';
                  const appTime = pat.appointment_time || 'N/A';

                  return (
                    <tr
                      key={pat.patient_id}
                      onClick={() => setSelectedPatient(pat)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view patient details"
                    >
                      <td><span className="item-id">#{pat.patient_id.substring(0, 8)}</span></td>
                      <td><strong>{pat.patient_name}</strong></td>
                      <td><span className="species-tag">{pat.species}</span></td>
                      <td>{pat.owner_name}</td>
                      <td>{appDate}</td>
                      <td>{appTime}</td>
                      <td>
                        <span className={`status-badge ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {/* Edit */}
                          <button
                            type="button"
                            title="Edit Patient"
                            aria-label="Edit Patient"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(pat);
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#0d9488',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>

                          {/* Complete */}
                          {pat.appointment_date && status === 'Scheduled' && (
                            <button
                              type="button"
                              title="Complete Appointment"
                              aria-label="Complete Appointment"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateAppointmentStatus(pat, 'Completed');
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                          )}

                          {/* Cancel */}
                          {pat.appointment_date && status === 'Scheduled' && (
                            <button
                              type="button"
                              title="Cancel Appointment"
                              aria-label="Cancel Appointment"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateAppointmentStatus(pat, 'Cancelled');
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">No patients found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
      }

      {/* Modal para sa Add Patient & Appointment (Translated to English) */}
      {
        showModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div
                className="modal-header"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  width: '100%',
                  minHeight: '42px',
                  marginBottom: '20px'
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {editingPatient
                    ? 'Edit Patient & Appointment'
                    : 'Add New Patient & Appointment'}
                </h3>
                <button className="close-btn" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleSavePatient}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Patient Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Shiro"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>


                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Species *</label>
                  <input
                    type="text"
                    placeholder="e.g., Dog, Cat..."
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Gender
                  </label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#000000'
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Owner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Allen"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Owner Phone</label>
                  <input
                    type="text"
                    placeholder="e.g., 09123456789"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Owner Email
                  </label>

                  <input
                    type="email"
                    placeholder="e.g., owner@example.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Appointment Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Appointment Time</label>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Veterinarian Name
                  </label>

                  <select
                    value={vetId}
                    onChange={(e) => setVetId(e.target.value)}
                    disabled={veterinarianLoading}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#000000'
                    }}
                  >
                    <option value="">
                      {veterinarianLoading
                        ? 'Loading veterinarians...'
                        : 'Select Veterinarian'}
                    </option>

                    {veterinarians.map((vet) => (
                      <option key={vet.user_id} value={vet.user_id}>
                        {vet.full_name}
                      </option>
                    ))}
                  </select>

                  {veterinarianError && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                      {veterinarianError}
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Appointment Reason</label>
                  <input
                    type="text"
                    placeholder="e.g., Checkup, Vaccine..."
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={submitting} style={{ padding: '8px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {submitting
                      ? 'Saving...'
                      : editingPatient
                        ? 'Save Changes'
                        : 'Save Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Patient Details Modal */}
      {
        selectedPatient && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedPatient(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1100
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '12px',
                width: '600px',
                maxWidth: '90%',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}
            >
              {/* Modal Header */}
              <div
                className="modal-header"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a' }}>
                    Patient Details
                  </h3>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                    Complete patient information
                  </p>
                </div>

              </div>
              {/* Patient Name */}
              <div
                style={{
                  background: '#f0fdfa',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}
              >
                <h2 style={{ margin: '0 0 6px', color: '#0f766e' }}>
                  {selectedPatient.patient_name || 'Unnamed Patient'}
                </h2>
                <p style={{ margin: 0, color: '#475569' }}>
                  {selectedPatient.species || 'Species not specified'}
                </p>
              </div>

              {/* All fields returned by the backend */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px'
                }}
              >
                {Object.entries(selectedPatient)
                  .filter(([key]) => ![
                    'patient_id',
                    'clinic_id',
                    'breed',
                    'date_of_birth',
                    'is_neutered',
                    'is_active',
                    'appointment_veterinarian_id'
                  ].includes(key))
                  .map(([key, value]) => {
                    const fieldLabels = {
                      patient_number: 'Patient ID',
                      mrn_number: 'Record Number',
                      appointment_veterinarian_name: 'Veterinarian Name',
                      created_at: 'Created At',
                      updated_at: 'Updated At'
                    };

                    const label = fieldLabels[key] ||
                      key.replace(/_/g, ' ')
                        .replace(/\b\w/g, char => char.toUpperCase());

                    let displayValue;

                    if (value === null || value === undefined || value === '') {
                      displayValue = 'N/A';
                    } else if (key === 'patient_number') {
                      displayValue = String(value).padStart(4, '0');
                    } else if (key === 'appointment_status') {
                      displayValue = getAppointmentStatus(selectedPatient);
                    } else if (key === 'created_at' || key === 'updated_at') {
                      const date = new Date(value);

                      displayValue = Number.isNaN(date.getTime())
                        ? String(value)
                        : `${date.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} ${date.toLocaleDateString('en-US')}`;
                    } else if (key === 'appointment_date') {
                      const dateString = String(value).slice(0, 10);
                      const date = new Date(`${dateString}T00:00:00`);

                      displayValue = Number.isNaN(date.getTime())
                        ? String(value)
                        : date.toLocaleDateString('en-US');
                    } else if (Array.isArray(value)) {
                      displayValue = value.length ? value.join(', ') : 'N/A';
                    } else if (typeof value === 'object') {
                      displayValue = JSON.stringify(value);
                    } else {
                      displayValue = String(value);
                    }

                    return (
                      <div
                        key={key}
                        style={{
                          padding: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          minWidth: 0
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '12px',
                            color: '#64748b',
                            fontWeight: '600'
                          }}
                        >
                          {label}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            color: '#0f172a',
                            overflowWrap: 'anywhere'
                          }}
                        >
                          {displayValue}
                        </p>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '24px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const patient = selectedPatient;
                    setSelectedPatient(null);
                    openEditModal(patient);
                  }}
                  style={{
                    padding: '9px 16px',
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-pen"></i> Edit Patient
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  style={{
                    padding: '9px 16px',
                    background: '#e2e8f0',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}