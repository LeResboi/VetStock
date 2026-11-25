import React, { useState, useEffect, useCallback } from 'react';
import Notification from '../components/Notification';
import './HealthRecords.css';

export default function HealthRecords() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(true);

  const canViewPage = [
    'Administrator',
    'Clinic Manager',
    'Veterinarian'
  ].includes(userRole);

  const canManageRecords = [
    'Administrator',
    'Veterinarian'
  ].includes(userRole);

  const canDeleteRecords = userRole === 'Administrator';



  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Custom notification
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Custom delete confirmation
  const [confirmation, setConfirmation] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State para sa Add Record
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Follow-up appointment states
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState('');

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpNotes, setNewFollowUpNotes] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch logged-in user's role for RBAC
  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetch(
        'https://vetstock-backend.onrender.com/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to verify user role.');
      }

      const user = data.user || data.data?.user || data.data || data;

      setUserRole(user.role || user.role_name || '');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('');
    } finally {
      setRoleLoading(false);
    }
  }, [token]);

  // 1. Fetch Health Records from Backend/Supabase
  const fetchHealthRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://vetstock-backend.onrender.com/api/health-records',
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
        'https://vetstock-backend.onrender.com/api/patients',
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

  // Fetch follow-up appointments for a health record
  const fetchFollowUps = useCallback(async (recordId) => {
    if (!recordId) return;

    setFollowUpsLoading(true);
    setFollowUpsError('');

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/health-records/${recordId}/followups`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load follow-up appointments.'
        );
      }

      setFollowUps(Array.isArray(data.data) ? data.data : []);

    } catch (err) {
      console.error('Error fetching follow-up appointments:', err);
      setFollowUpsError(err.message || 'Unable to load appointments.');
    } finally {
      setFollowUpsLoading(false);
    }
  }, [token]);

  // Add a new follow-up appointment
  const handleAddFollowUp = async (e) => {
    e.preventDefault();

    if (!canManageRecords) {
      showNotification(
        'You do not have permission to manage follow-up appointments.',
        'error'
      );
      return;
    }

    if (!newFollowUpDate) {
      showNotification('Please select a follow-up date.', 'error');
      return;
    }

    setFollowUpSubmitting(true);

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/health-records/${viewingRecord.record_id}/followups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            follow_up_date: newFollowUpDate,
            notes: newFollowUpNotes
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add follow-up appointment.');
      }

      showNotification('Follow-up appointment successfully scheduled!', 'success');

      setNewFollowUpDate('');
      setNewFollowUpNotes('');
      setShowFollowUpForm(false);

      await fetchFollowUps(viewingRecord.record_id);

    } catch (err) {
      console.error('Error adding follow-up:', err);
      showNotification(
        err.message || 'Unable to schedule follow-up appointment.',
        'error'
      );
    } finally {
      // Reset the scheduling button after success or failure
      setFollowUpSubmitting(false);
    }
  };



  // Update the status of an existing follow-up appointment
  const handleUpdateFollowUpStatus = async (followupId, status) => {
    if (!canManageRecords) {
      showNotification(
        'You do not have permission to manage follow-up appointments.',
        'error'
      );
      return;
    }

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/health-records/${viewingRecord.record_id}/followups/${followupId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update appointment status.');
      }

      await fetchFollowUps(viewingRecord.record_id);
      showNotification('Follow-up appointment status successfully updated!', 'success');

    } catch (err) {
      console.error('Error updating follow-up status:', err);
      showNotification(
        err.message || 'Unable to update appointment status.',
        'error'
      );
    }
  };

  // Fetch data after verifying the user's role
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  useEffect(() => {
    if (roleLoading) return;

    if (canViewPage) {
      fetchHealthRecords();
    }

    if (canManageRecords) {
      fetchPatients();
    }
  }, [
    roleLoading,
    canViewPage,
    canManageRecords,
    fetchHealthRecords,
    fetchPatients
  ]);

  // Fetch follow-up appointments when viewing a health record
  useEffect(() => {
    if (viewingRecord?.record_id) {
      fetchFollowUps(viewingRecord.record_id);
    } else {
      setFollowUps([]);
      setFollowUpsError('');
      setShowFollowUpForm(false);
      setNewFollowUpDate('');
      setNewFollowUpNotes('');
    }
  }, [viewingRecord, fetchFollowUps]);

  // 2. Handle Submit para sa Bagong Health Record
  const handleSaveRecord = async (e) => {
    if (!canManageRecords) {
      showNotification('You do not have permission to manage health records.', 'error');
      return;
    }
    e.preventDefault();

    if (!patientId) {
      showNotification('Please select a patient.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const isEditing = Boolean(editingRecord);

      const response = await fetch(
        isEditing
          ? `https://vetstock-backend.onrender.com/api/health-records/${editingRecord.record_id}`
          : 'https://vetstock-backend.onrender.com/api/health-records',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            patient_id: patientId,
            diagnosis,
            symptoms,
            treatment,
            follow_up_date: followUpDate || null,
            notes
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(
          isEditing
            ? 'Health record successfully updated!'
            : 'Health record successfully added!',
          'success'
        );

        closeRecordModal();
        await fetchHealthRecords();
      } else {
        showNotification(
          data.message || 'Failed to save health record.',
          'error'
        );
      }
    } catch (err) {
      console.error('Error saving health record:', err);
      showNotification('An error occurred on the server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeRecordModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setPatientId('');
    setDiagnosis('');
    setSymptoms('');
    setTreatment('');
    setFollowUpDate('');
    setNotes('');
  };

  const openAddModal = () => {
    if (!canManageRecords) return;

    closeRecordModal();
    setShowModal(true);
  };

  const openEditModal = (rec) => {
    if (!canManageRecords) return;

    setEditingRecord(rec);
    setPatientId(rec.patient_id || '');
    setDiagnosis(rec.diagnosis || '');
    setSymptoms(
      Array.isArray(rec.symptoms)
        ? rec.symptoms.join(', ')
        : (rec.symptoms || '')
    );
    setTreatment(rec.treatment_notes || '');
    setFollowUpDate(
      rec.follow_up_date
        ? rec.follow_up_date.substring(0, 10)
        : ''
    );
    setNotes(rec.notes || '');
    setShowModal(true);
  };

  const handleDeleteRecord = async (recordId) => {
    if (!canDeleteRecords) {
      showNotification('You do not have permission to delete health records.', 'error');
      return;
    }

    setConfirmation({
      message: 'Are you sure you want to delete this health record? This action cannot be undone.',
      onConfirm: async () => {
        setConfirming(true);

        try {
          const response = await fetch(
            `https://vetstock-backend.onrender.com/api/health-records/${recordId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const data = await response.json();

          if (response.ok && data.success) {
            showNotification('Health record successfully deleted!', 'success');
            setViewingRecord(null);
            await fetchHealthRecords();
          } else {
            showNotification(
              data.message || 'Failed to delete health record.',
              'error'
            );
          }
        } catch (err) {
          console.error('Error deleting health record:', err);
          showNotification(
            'An error occurred while deleting the health record.',
            'error'
          );
        } finally {
          setConfirming(false);
          setConfirmation(null);
        }
      }
    });
  };


  const getFollowUpStatus = (date, appointmentStatus) => {
    const status = appointmentStatus?.toLowerCase();

    // Preserve the actual appointment status.
    if (status === 'completed') return 'Completed';
    if (status === 'missed') return 'Missed';
    if (status === 'cancelled') return 'Cancelled';

    if (!date) return 'Not Scheduled';

    // Compare dates using the clinic's Manila timezone.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const followUpDate = date.substring(0, 10);

    if (followUpDate < today) return 'Overdue';

    return 'Upcoming';
  };



  const followUpCounts = records.reduce(
    (counts, record) => {
      const status = getFollowUpStatus(
        record.follow_up_date,
        record.follow_up_status
      );

      if (status === 'Upcoming') {
        counts.upcoming++;
      } else if (status === 'Overdue') {
        counts.overdue++;
      } else if (status === 'Not Scheduled') {
        counts.notScheduled++;
      }

      return counts;
    },
    {
      upcoming: 0,
      overdue: 0,
      notScheduled: 0
    }
  );


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

  // Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / pageSize)
  );

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedRecords = filteredRecords.slice(
    startIndex,
    startIndex + pageSize
  );

  // Reset to page 1 when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  if (roleLoading) {
    return (
      <div className="health-records-page">
        <p>Verifying access...</p>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="health-records-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to access Health Records.</p>
      </div>
    );
  }

  return (
    <div className="health-records-page">
      {/* CUSTOM NOTIFICATION */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Page Header */}
      <div className="health-records-header">
        <div>
          <h2>Health Records</h2>
          <p>Manage patient health records, diagnoses, and treatments efficiently in real-time.</p>
        </div>
        {canManageRecords && (
          <button className="add-btn" onClick={openAddModal}>
            <i className="fa-solid fa-plus"></i> Add Record
          </button>
        )}
      </div>

      <div className="health-records-mobile-overview">
        {/* Quick Stats Cards */}
        <div className="health-records-stats">
          <div className="stat-card">
            <div className="stat-icon blue">
              <i className="fa-solid fa-file-medical"></i>
            </div>
            <div>
              <h3>{records.length}</h3>
              <p>Total Records</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon teal">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <h3>{followUpCounts.upcoming}</h3>
              <p>Upcoming</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <h3>{followUpCounts.overdue}</h3>
              <p>Overdue</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon gray">
              <i className="fa-solid fa-calendar-xmark"></i>
            </div>
            <div>
              <h3>{followUpCounts.notScheduled}</h3>
              <p>Not Scheduled</p>
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
      </div>

      {/* Modern Table Container */}
      <div className="table-container">
        <div className="health-records-table-scroll">
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
                <th className="diagnosis-column">Diagnosis</th>
                <th className="symptoms-column">Symptoms</th>
                <th className="treatment-column">Treatment</th>
                <th>Record Date</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec) => {
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
                  const followUpStatus = getFollowUpStatus(
                    rec.follow_up_date,
                    rec.follow_up_status
                  );

                  const formattedFollowUpDate = rec.follow_up_date
                    ? new Date(`${rec.follow_up_date.substring(0, 10)}T00:00:00`)
                      .toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={rec.record_id}
                      className="clickable-record-row"
                      onClick={() => setViewingRecord(rec)}
                      title="Click to view health record details"
                    >
                      <td><span className="item-id">#{rec.record_id.substring(0, 8)}</span></td>
                      <td>{mrnDisplay}</td>
                      <td className="diagnosis-column">
                        <div
                          className="diagnosis-text"
                          title={rec.diagnosis || 'General Checkup'}
                        >
                          <strong>{rec.diagnosis || 'General Checkup'}</strong>
                        </div>
                      </td>                      <td className="symptoms-column">
                        <div className="symptoms-text" title={symptomsDisplay}>
                          {symptomsDisplay}
                        </div>
                      </td>
                      <td className="treatment-column">
                        <div
                          className="treatment-text"
                          title={rec.treatment_notes || 'N/A'}
                        >
                          {rec.treatment_notes || 'N/A'}
                        </div>
                      </td>
                      <td>{formattedDate}</td>
                      <td>
                        <div>{formattedFollowUpDate}</div>
                        <span className={`follow-up-status ${followUpStatus === 'Overdue'
                          ? 'overdue'
                          : followUpStatus === 'Upcoming'
                            ? 'upcoming'
                            : followUpStatus === 'Completed'
                              ? 'completed'
                              : followUpStatus === 'Missed'
                                ? 'missed'
                                : followUpStatus === 'Cancelled'
                                  ? 'cancelled'
                                  : 'not-scheduled'
                          }`}>
                          {followUpStatus}
                        </span>
                      </td>

                      <td>
                        <div
                          className="hr-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManageRecords && (
                            <button
                              type="button"
                              className="edit-patient-btn"
                              onClick={() => openEditModal(rec)}
                              title="Edit Health Record"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          )}

                          {canDeleteRecords && (
                            <button
                              type="button"
                              className="delete-patient-btn"
                              onClick={() => handleDeleteRecord(rec.record_id)}
                              title="Delete Health Record"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No health records found in database.</td>
                </tr>
              )}
            </tbody>
            </table>

          )
          }
        </div>
        {/* Health Records Pagination */}
        <div className="health-pagination">

          <div className="health-pagination-size">
            <span>Rows per page:</span>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <span>
            Showing {filteredRecords.length === 0 ? 0 : startIndex + 1}
            –{Math.min(startIndex + pageSize, filteredRecords.length)}
            {' '}of {filteredRecords.length} records
          </span>

          <div className="health-pagination-controls">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>


      {showModal && (
        <div
          className="modal-overlay"
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
            zIndex: 1000
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
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
                {editingRecord ? 'Edit Health Record' : 'Add New Health Record'}
              </h3>

              <button
                className="close-btn"
                type="button"
                onClick={closeRecordModal}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRecord}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Patient Record Number *
                </label>

                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  disabled={patientsLoading}
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
                  <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                    {patientsError}
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="e.g., Infection, Fever..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Symptoms
                </label>
                <input
                  type="text"
                  placeholder="e.g., Bruises, Cough..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Treatment Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., Medication, Rest..."
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Follow-up Check-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <small>
                  Select a date if the patient needs another check-up.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div
                className="modal-actions"
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px'
                }}
              >
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeRecordModal}
                  style={{
                    padding: '8px 16px',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {submitting
                    ? 'Saving...'
                    : editingRecord
                      ? 'Update Record'
                      : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* VIEW HEALTH RECORD DETAILS MODAL */}
      {viewingRecord && (
        <div
          className="modal-overlay"
          onClick={() => setViewingRecord(null)}
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
                  Health Record Details
                </h3>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                  Complete patient health record information
                </p>
              </div>
            </div>

            {/* Record Summary */}
            <div
              style={{
                background: '#f0fdfa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <h2 style={{ margin: '0 0 6px', color: '#0f766e' }}>
                {viewingRecord.diagnosis || 'General Checkup'}
              </h2>
              <p style={{ margin: 0, color: '#475569' }}>
                Patient Record Number:{' '}
                {viewingRecord.mrn_number || 'N/A'}
              </p>
            </div>

            {/* Health Record Information */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px'
              }}
            >
              {[
                {
                  label: 'Record ID',
                  value: viewingRecord.record_id
                },
                {
                  label: 'Patient Record Number',
                  value: viewingRecord.mrn_number
                },
                {
                  label: 'Diagnosis',
                  value: viewingRecord.diagnosis
                },
                {
                  label: 'Treatment',
                  value: viewingRecord.treatment_notes
                },
                {
                  label: 'Follow-up Date',
                  value: viewingRecord.follow_up_date
                    ? new Date(
                      `${viewingRecord.follow_up_date.substring(0, 10)}T00:00:00`
                    ).toLocaleDateString('en-US')
                    : 'Not scheduled'
                },
                {
                  label: 'Follow-up Status',
                  value: getFollowUpStatus(
                    viewingRecord.follow_up_date,
                    viewingRecord.follow_up_status
                  )
                },
                {
                  label: 'Additional Notes',
                  value: viewingRecord.notes
                },
                {
                  label: 'Record Date',
                  value: viewingRecord.record_date
                    ? new Date(viewingRecord.record_date).toLocaleString('en-US')
                    : 'N/A'
                }
              ].map((field, index) => (
                <div
                  key={index}
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
                    {field.label}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#0f172a',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {field.value === null ||
                      field.value === undefined ||
                      field.value === ''
                      ? 'N/A'
                      : field.value}
                  </p>

                </div>
              ))}
              {/* Symptoms - Full Width */}
              <div
                style={{
                  gridColumn: '1 / -1',
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
                  Symptoms
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#0f172a',
                    lineHeight: '1.5',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {Array.isArray(viewingRecord.symptoms)
                    ? viewingRecord.symptoms.join(', ')
                    : viewingRecord.symptoms || 'N/A'}
                </p>
              </div>
            </div>

            {/* FOLLOW-UP APPOINTMENT HISTORY */}
            <div className="followup-history-panel">
              <div className="followup-history-header">
                <h3 className="followup-history-title">
                  Follow-up Appointment History
                </h3>


                {canManageRecords && (
                  <button
                    type="button"
                    onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                    disabled={
                      viewingRecord.status === 'recovered' ||
                      viewingRecord.status === 'cancelled'
                    }
                    className="followup-schedule-btn"
                  >
                    + Schedule Follow-up
                  </button>
                )}
              </div>

              {followUpsLoading ? (
                <p>Loading follow-up appointments...</p>
              ) : followUpsError ? (
                <p style={{ color: '#dc2626' }}>{followUpsError}</p>
              ) : followUps.length === 0 ? (
                <p style={{ color: '#64748b' }}>
                  No follow-up appointments have been scheduled.
                </p>
              ) : (
                followUps.map((appointment) => (
                  <div
                    key={appointment.followup_id}
                    style={{
                      padding: '12px',
                      marginBottom: '10px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <strong style={{ color: '#0f172a' }}>
                        {new Date(
                          `${appointment.follow_up_date}T00:00:00`
                        ).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </strong>

                      <span
                        style={{
                          padding: '4px 9px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background:
                            appointment.status === 'completed'
                              ? '#dcfce7'
                              : appointment.status === 'missed'
                                ? '#fee2e2'
                                : appointment.status === 'cancelled'
                                  ? '#e2e8f0'
                                  : '#dbeafe',
                          color:
                            appointment.status === 'completed'
                              ? '#166534'
                              : appointment.status === 'missed'
                                ? '#991b1b'
                                : appointment.status === 'cancelled'
                                  ? '#475569'
                                  : '#1d4ed8'
                        }}
                      >
                        {appointment.status.toUpperCase()}
                      </span>
                    </div>

                    {appointment.notes && (
                      <p style={{
                        margin: '8px 0',
                        color: '#475569',
                        fontSize: '13px'
                      }}>
                        Notes: {appointment.notes}
                      </p>
                    )}

                    {canManageRecords && appointment.status === 'scheduled' && (
                      <div className="followup-action-buttons">
                        <button
                          type="button"
                          className="followup-btn followup-complete-btn"
                          onClick={() => handleUpdateFollowUpStatus(
                            appointment.followup_id,
                            'completed'
                          )}
                        >
                          <i className="fa-solid fa-check"></i>
                          Mark Completed
                        </button>

                        <button
                          type="button"
                          className="followup-btn followup-missed-btn"
                          onClick={() => handleUpdateFollowUpStatus(
                            appointment.followup_id,
                            'missed'
                          )}
                        >
                          <i className="fa-solid fa-clock"></i>
                          Mark Missed
                        </button>

                        <button
                          type="button"
                          className="followup-btn followup-cancel-btn"
                          onClick={() => handleUpdateFollowUpStatus(
                            appointment.followup_id,
                            'cancelled'
                          )}
                        >
                          <i className="fa-solid fa-xmark"></i>
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* NEW FOLLOW-UP FORM */}
              {canManageRecords && showFollowUpForm && (
                <form
                  className="followup-form"
                  onSubmit={handleAddFollowUp}
                >
                  <h4 className="followup-form-title">
                    Schedule Another Check-up
                  </h4>

                  <label className="followup-form-label">
                    Follow-up Date *
                  </label>

                  <input
                    type="date"
                    className="followup-date-input"
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                    required
                  />

                  <label className="followup-form-label">
                    Appointment Notes (Optional)
                  </label>

                  <textarea
                    value={newFollowUpNotes}
                    onChange={(e) => setNewFollowUpNotes(e.target.value)}
                    placeholder="Enter instructions or check-up details..."
                    rows="3"
                    className="followup-notes-input"
                  />

                  <div className="followup-form-actions">
                    <button
                      type="button"
                      onClick={() => setShowFollowUpForm(false)}
                      className="followup-form-cancel-btn"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={followUpSubmitting}
                      className="followup-form-save-btn"
                    >
                      {followUpSubmitting ? 'Scheduling...' : 'Save Appointment'}
                    </button>
                  </div>
                </form>
              )}
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
              {canManageRecords && (
                <button
                  type="button"
                  onClick={() => {
                    const record = viewingRecord;
                    setViewingRecord(null);
                    openEditModal(record);
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
                  <i className="fa-solid fa-pen"></i> Edit Record
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewingRecord(null)}
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
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmation && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '10px',
              width: '400px',
              maxWidth: '90%'
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>
              Confirm Deletion
            </h3>

            <p style={{ color: '#475569', lineHeight: '1.5' }}>
              {confirmation.message}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px'
              }}
            >
              {/* CANCEL BUTTON */}
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={confirming}
                style={{
                  padding: '9px 16px',
                  background: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: confirming ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>

              {/* DELETE BUTTON */}
              <button
                type="button"
                onClick={confirmation.onConfirm}
                disabled={confirming}
                style={{
                  padding: '9px 16px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  opacity: confirming ? 0.7 : 1
                }}
              >
                {confirming ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


