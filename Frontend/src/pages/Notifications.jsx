
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Notification from '../components/Notification';
import './Notifications.css';
import notificationSound from '../assets/sounds/Notification.wav';

// ============================================================
// ALERT TYPE CONFIGURATION
// ============================================================

const ALERT_CONFIG = {
  LOW_STOCK: {
    type: 'Low Stock Alert',
    title: 'Stock Warning',
    category: 'stock'
  },
  EXPIRATION: {
    type: 'Expiration Warning',
    title: 'Expiration Alert',
    category: 'expiration'
  },
  APPOINTMENT_TOMORROW: {
    type: 'Appointment Reminder',
    title: 'Upcoming Appointment',
    category: 'appointment'
  },
  APPOINTMENT_TODAY: {
    type: 'Appointment Reminder',
    title: 'Appointment Today',
    category: 'appointment'
  },
  APPOINTMENT_OVERDUE: {
    type: 'Overdue Appointment',
    title: 'Appointment Overdue',
    category: 'appointment'
  },
  NEW_BATCH_CREATED: {
    type: 'New Batch Alert',
    title: 'New Batch Added',
    category: 'batch'
  }
};

function formatAlertDate(date) {
  if (!date) return 'N/A';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const [resolvingId, setResolvingId] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [alertToResolve, setAlertToResolve] = useState(null);

  const audioRef = useRef(null);

  // Store previously received alert information.
  const knownAlerts = useRef(new Map());
  const hasFetchedAlerts = useRef(false);

  const token = localStorage.getItem('token');

  // ============================================================
  // INITIALIZE NOTIFICATION SOUND
  // ============================================================

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const closeToast = useCallback(() => {
    setToastMessage('');
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // ============================================================
  // FETCH ALERTS
  // ============================================================

  const fetchAlerts = useCallback(async () => {
    try {
      setRefreshing(true);

      const response = await fetch('https://vetstock-backend.onrender.com/api/alerts', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load alerts.');
      }

      const incomingAlerts = Array.isArray(data.data)
        ? data.data
        : [];

      // --------------------------------------------------------
      // DETECT NEW OR UPDATED UNREAD ALERTS
      // --------------------------------------------------------

      const newAlerts = hasFetchedAlerts.current
        ? incomingAlerts.filter(alert => {
          const previous = knownAlerts.current.get(alert.alert_id);

          if (!alert.is_read) {
            // Newly received alert.
            if (!previous) return true;

            // Previously read alert became unread again.
            if (previous.is_read) return true;

            // Existing alert received an important update.
            if (
              previous.message !== alert.message ||
              previous.severity !== alert.severity
            ) {
              return true;
            }
          }

          return false;
        })
        : [];

      // Display popup and play sound for new alerts.
      if (newAlerts.length > 0) {
        const firstAlert = newAlerts[0];

        const config = ALERT_CONFIG[firstAlert.alert_type] || {
          title: 'System Notification'
        };

        setToastMessage(
          newAlerts.length === 1
            ? `${config.title}: ${firstAlert.message}`
            : `${newAlerts.length} new alerts. ${firstAlert.message}`
        );

        setToastType(
          firstAlert.severity === 'high' ? 'error' : 'info'
        );

        if (audioRef.current) {
          audioRef.current.currentTime = 0;

          audioRef.current.play().catch(err => {
            console.warn('Notification sound could not play:', err);
          });
        }
      }

      // Remember current alert information.
      knownAlerts.current = new Map(
        incomingAlerts.map(alert => [
          alert.alert_id,
          {
            is_read: alert.is_read,
            message: alert.message,
            severity: alert.severity
          }
        ])
      );

      hasFetchedAlerts.current = true;

      // --------------------------------------------------------
      // FORMAT ALERTS FOR DISPLAY
      // --------------------------------------------------------

      const formattedAlerts = incomingAlerts.map(alert => {
        const config = ALERT_CONFIG[alert.alert_type] || {
          type: 'System Alert',
          title: 'System Notification',
          category: 'other'
        };

        return {
          id: alert.alert_id,
          type: config.type,
          title: config.title,
          message: alert.message,
          date: formatAlertDate(alert.created_at),
          read: alert.is_read,
          category: config.category,
          severity: alert.severity,
          alertType: alert.alert_type
        };
      });

      setNotifications(formattedAlerts);
      setError(null);

    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Cannot connect to backend server.');

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // ============================================================
  // AUTOMATIC REFRESH
  // ============================================================

  useEffect(() => {
    fetchAlerts();

    // Check for notifications every 60 seconds.
    const interval = setInterval(() => {
      fetchAlerts();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = async () => {
    const unreadAlerts = notifications.filter(notif => !notif.read);

    if (unreadAlerts.length === 0 || markingAll) return;

    try {
      setMarkingAll(true);

      // Send requests and check each result individually.
      const results = await Promise.all(
        unreadAlerts.map(async notif => {
          try {
            const response = await fetch(
              `https://vetstock-backend.onrender.com/api/alerts/${notif.id}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );

            const data = await response.json();

            return response.ok && data.success
              ? notif.id
              : null;

          } catch (err) {
            console.error(`Failed to update alert ${notif.id}:`, err);
            return null;
          }
        })
      );

      const successfulIds = new Set(results.filter(Boolean));

      // Update only successfully processed notifications.
      setNotifications(prev =>
        prev.map(notif =>
          successfulIds.has(notif.id)
            ? { ...notif, read: true }
            : notif
        )
      );

      // Update remembered read status.
      successfulIds.forEach(id => {
        const previous = knownAlerts.current.get(id);

        if (previous) {
          knownAlerts.current.set(id, {
            ...previous,
            is_read: true
          });
        }
      });

      const failedCount = unreadAlerts.length - successfulIds.size;

      if (failedCount > 0) {
        alert(
          `${successfulIds.size} alert(s) marked as read. ` +
          `${failedCount} alert(s) could not be updated.`
        );
      }

    } catch (err) {
      console.error('Error marking all alerts as read:', err);
      alert('An error occurred while updating notifications.');

    } finally {
      setMarkingAll(false);
    }
  };

  // ============================================================
  // MARK INDIVIDUAL ALERT AS READ
  // ============================================================

  const toggleRead = async (id, currentReadStatus) => {
    if (currentReadStatus) return;

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/alerts/${id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update alert.');
      }

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id
            ? { ...notif, read: true }
            : notif
        )
      );

      const previous = knownAlerts.current.get(id);

      if (previous) {
        knownAlerts.current.set(id, {
          ...previous,
          is_read: true
        });
      }

    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  // ============================================================
  // FILTER NOTIFICATIONS
  // ============================================================

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'stock') {
      return notif.category === 'stock';
    }

    if (filter === 'batch') {
      return notif.category === 'batch';
    }

    if (filter === 'expiration') {
      return notif.category === 'expiration';
    }

    if (filter === 'appointment') {
      return notif.category === 'appointment';
    }

    return true;
  });

  // ============================================================
  // RESOLVE ALERT
  // ============================================================

   const handleResolveAlert = async () => {
    if (!alertToResolve) return;

    try {
      setResolvingId(alertToResolve);
      setShowResolveModal(false); // Close modal

      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/alerts/${alertToResolve}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            resolution_notes: resolveNote.trim() || 'No notes provided' // 🔥 SENDS THE NOTE
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resolve alert.');
      }

      setToastMessage('Alert resolved successfully.');
      setToastType('success');
      
      setResolveNote(''); // Clear the note
      setAlertToResolve(null);
      
      await fetchAlerts(); // Reload list

    } catch (err) {
      console.error('Error resolving alert:', err);
      setToastMessage(err.message || 'Unable to resolve alert.');
      setToastType('error');
    } finally {
      setResolvingId(null);
    }
  };

  // ============================================================
  // NOTIFICATION COUNTS
  // ============================================================

  const unreadCount = notifications.filter(
    notif => !notif.read
  ).length;

  const stockCount = notifications.filter(
    notif => notif.category === 'stock'
  ).length;

  const batchCount = notifications.filter(
    notif => notif.category === 'batch'
  ).length;

  const expirationCount = notifications.filter(
    notif => notif.category === 'expiration'
  ).length;

  const appointmentCount = notifications.filter(
    notif => notif.category === 'appointment'
  ).length;

  return (
    <div className="notifications-page">
      <Notification
        message={toastMessage}
        type={toastType}
        onClose={closeToast}
        duration={5000}
      />
      {/* PAGE HEADER */}

      <div className="notifications-header">
        <div>
          <h2>System Notifications</h2>
          <p>
            Real-time alerts, low stock warnings, expiration
            trackers, and appointment reminders from Supabase.
          </p>
        </div>

        <div className="notification-header-actions">

          <button
            className="mark-all-btn"
            onClick={fetchAlerts}
            disabled={refreshing}
          >
            <i className={`fa-solid fa-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            className="mark-all-btn"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
          >
            <i className="fa-solid fa-check-double"></i>
            {markingAll ? 'Updating...' : 'Mark all as read'}
          </button>

        </div>
      </div>

      {/* FILTERS */}

      <div className="notification-controls">

        <div className="filter-tabs">
          <button
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts
            <span className="badge-count">{notifications.length}</span>
          </button>

          <button
            className={`tab-btn ${filter === 'stock' ? 'active' : ''}`}
            onClick={() => setFilter('stock')}
          >
            Low Stock
            <span className="badge-count">{stockCount}</span>
          </button>

          <button
            className={`tab-btn ${filter === 'expiration' ? 'active' : ''}`}
            onClick={() => setFilter('expiration')}
          >
            Expirations
            <span className="badge-count">{expirationCount}</span>
          </button>

          <button
            className={`tab-btn ${filter === 'appointment' ? 'active' : ''}`}
            onClick={() => setFilter('appointment')}
          >
            Appointments
            <span className="badge-count">{appointmentCount}</span>
          </button>

          <button
            className={`tab-btn ${filter === 'batch' ? 'active' : ''}`}
            onClick={() => setFilter('batch')}
          >
            New Batches
            <span className="badge-count">{batchCount}</span>
          </button>


        </div>

        <div className="unread-status">
          <i className="fa-solid fa-bell"></i>
          {' '}{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </div>

      </div>

      {/* NOTIFICATIONS LIST */}

      <div className="notifications-list">

        {loading ? (

          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p>Loading alerts from database...</p>
          </div>

        ) : error ? (

          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
            <p>{error}</p>
          </div>

        ) : filteredNotifications.length > 0 ? (

          filteredNotifications.map(notif => (

            <div
              key={notif.id}
              className={`notification-card ${notif.read ? 'read' : 'unread'} ${notif.category}`}
              onClick={() => toggleRead(notif.id, notif.read)}
            >


              <div className="notif-icon-wrapper">
                {notif.category === 'stock' ? (
                  <i className="fa-solid fa-triangle-exclamation"></i>
                ) : notif.category === 'expiration' ? (
                  <i className="fa-solid fa-clock-rotate-left"></i>
                ) : notif.category === 'appointment' ? (
                  <i className="fa-solid fa-calendar-check"></i>
                ) : notif.category === 'batch' ? (
                  <i className="fa-solid fa-box-open"></i>
                ) : (
                  <i className="fa-solid fa-bell"></i>
                )}
              </div>


              <div className="notif-content">

                <div className="notif-top-row">

                  <span className={`notif-type-tag ${notif.category}`}>
                    {notif.type}
                  </span>

                  <span className="notif-date">
                    {notif.date}
                  </span>

                </div>

                <h4>{notif.title}</h4>
                <p>{notif.message}</p>

              </div>

              <div
                className="notif-action-indicator"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                {!notif.read && (
                  <span className="unread-dot" title="Unread"></span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 🔥 Open the modal and set the ID
                    setAlertToResolve(notif.id); 
                    setShowResolveModal(true);
                  }}
                  disabled={resolvingId !== null}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: resolvingId !== null ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resolvingId === notif.id ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </div>

          ))

        ) : (

          <div className="no-notifications">
            <i className="fa-regular fa-face-smile"></i>
            <p>No notifications found in this category.</p>
          </div>

        )}

      </div>
        
      {showResolveModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '15px' }}>Resolve Alert</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
              Please provide a brief note on how this issue was resolved (e.g., "Restocked 50 units").
            </p>
            
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Type your resolution notes here..."
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '20px', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowResolveModal(false)}
                style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#334155' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResolveAlert}
                style={{ padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#fff' }}
              >
                Submit & Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
