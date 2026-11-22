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
    title: 'Expiration Warning',
    category: 'expiration'
  },
  EXPIRED: {
    type: 'Expired Item Alert',
    title: 'Expired Medicine Disposal',
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
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';
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

  // Modern Detail Modal State
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const audioRef = useRef(null);
  const token = localStorage.getItem('token');

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
  // FETCH ALERTS & INVENTORY EXPIRATION CHECK
  // ============================================================

  const fetchAlerts = useCallback(async () => {
    try {
      setRefreshing(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Kunin ang mga alerts galing sa backend
      const response = await fetch('https://vetstock-backend.onrender.com/api/alerts', { headers });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load alerts.');
      }

      const incomingAlerts = Array.isArray(data.data) ? data.data : [];

      // I-check ang inventory batches para sa mga totoong expired na
      let inventoryExpiredAlerts = [];
      try {
        const invRes = await fetch('https://vetstock-backend.onrender.com/api/inventory', { headers });
        const invData = await invRes.json();
        const inventoryItems = Array.isArray(invData.data) ? invData.data : (Array.isArray(invData) ? invData : []);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        inventoryItems.forEach(item => {
          if (item.inventory_batches && Array.isArray(item.inventory_batches)) {
            item.inventory_batches.forEach(batch => {
              if (batch.expiration_date) {
                const expDate = new Date(batch.expiration_date);
                expDate.setHours(0, 0, 0, 0);

                if (expDate < today && Number(batch.quantity || 0) > 0) {
                  inventoryExpiredAlerts.push({
                    alert_id: `exp-batch-${batch.batch_id || batch.id}`,
                    alert_type: 'EXPIRED',
                    message: `CRITICAL: Batch ${batch.batch_number || 'N/A'} of ${item.item_name || item.name} expired on ${batch.expiration_date}. Quantity to dispose: ${batch.quantity} units.`,
                    created_at: batch.expiration_date,
                    is_read: false,
                    severity: 'high',
                    item_id: item.item_id || item.id,
                    batch_id: batch.batch_id || batch.id,
                    quantity: batch.quantity
                  });
                }
              }
            });
          }
        });
      } catch (invErr) {
        console.error('Error checking inventory expirations:', invErr);
      }

      const combinedAlerts = [...incomingAlerts, ...inventoryExpiredAlerts];

      // Basahin ang nakaraang read status sa localStorage para sa virtual batches
      const readBatches = JSON.parse(localStorage.getItem('read_exp_batches') || '[]');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const formattedAlerts = combinedAlerts.map(alert => {
        let alertType = alert.alert_type;

        if (alertType && alertType.startsWith('APPOINTMENT')) {
          // Panatilihin ang appointment type
        } else if (alert.message && alert.message.includes('December 16, 2026')) {
          alertType = 'EXPIRATION';
        } else if (alert.created_at && alertType === 'EXPIRATION') {
          const expDate = new Date(alert.created_at);
          expDate.setHours(0, 0, 0, 0);
          
          if (expDate < today) {
            alertType = 'EXPIRED';
          } else {
            alertType = 'EXPIRATION';
          }
        }

        const config = ALERT_CONFIG[alertType] || ALERT_CONFIG[alert.alert_type] || {
          type: 'System Alert',
          title: 'System Notification',
          category: 'other'
        };

        // Suriin kung nabasa na ang virtual batch sa localStorage
        const isReadStatus = readBatches.includes(alert.alert_id) ? true : alert.is_read;

        return {
          id: alert.alert_id,
          type: alertType === 'EXPIRED' ? 'Expired Item Alert' : config.type,
          title: alertType === 'EXPIRED' ? 'Expired Medicine Disposal' : config.title,
          message: alert.message,
          date: formatAlertDate(alert.created_at),
          read: isReadStatus,
          category: config.category,
          severity: alertType === 'EXPIRED' ? 'high' : alert.severity,
          alertType: alertType,
          raw: alert
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

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60 * 1000);
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
      
      // I-save lahat ng virtual unread ID sa localStorage
      const readBatches = JSON.parse(localStorage.getItem('read_exp_batches') || '[]');
      unreadAlerts.forEach(notif => {
        if (String(notif.id).startsWith('exp-batch-') && !readBatches.includes(notif.id)) {
          readBatches.push(notif.id);
        }
      });
      localStorage.setItem('read_exp_batches', JSON.stringify(readBatches));

      // I-update ang mga database alerts
      await Promise.all(
        unreadAlerts.map(async notif => {
          if (!String(notif.id).startsWith('exp-batch-')) {
            try {
              await fetch(`https://vetstock-backend.onrender.com/api/alerts/${notif.id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (e) {
              console.error(e);
            }
          }
        })
      );

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleRead = async (id, currentReadStatus) => {
    if (!currentReadStatus) {
      // Agad nating i-update sa UI state
      setNotifications(prev =>
        prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
      );

      // Kung virtual expired batch, i-save sa localStorage para hindi mag-unread pagka-refresh
      if (String(id).startsWith('exp-batch-')) {
        const readBatches = JSON.parse(localStorage.getItem('read_exp_batches') || '[]');
        if (!readBatches.includes(id)) {
          readBatches.push(id);
          localStorage.setItem('read_exp_batches', JSON.stringify(readBatches));
        }
      } else {
        // Kung galing sa database alerts table
        try {
          await fetch(`https://vetstock-backend.onrender.com/api/alerts/${id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Error updating read status:', err);
        }
      }
    }
  };

  // ============================================================
  // FILTER NOTIFICATIONS
  // ============================================================

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'stock') return notif.category === 'stock';
    if (filter === 'batch') return notif.category === 'batch';
    if (filter === 'expiration') return notif.category === 'expiration';
    if (filter === 'appointment') return notif.category === 'appointment';
    return true;
  });

  // ============================================================
  // PROCESS DISPOSAL & STOCK-OUT
  // ============================================================

  const handleResolveAlert = async () => {
    if (!alertToResolve) return;

    try {
      setResolvingId(alertToResolve.id);
      setShowResolveModal(false);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      if (alertToResolve.raw && alertToResolve.raw.item_id && Number(alertToResolve.raw.quantity) > 0) {
        const stockOutPayload = {
          item_id: alertToResolve.raw.item_id,
          batch_id: alertToResolve.raw.batch_id,
          quantity: Number(alertToResolve.raw.quantity),
          transaction_type: 'OUT',
          notes: `Disposal of expired medicine. Note: ${resolveNote.trim() || 'Expired items quarantined and removed.'}`
        };

        const txRes = await fetch('https://vetstock-backend.onrender.com/api/stock-transactions', {
          method: 'POST',
          headers,
          body: JSON.stringify(stockOutPayload)
        });

        const txData = await txRes.json();
        if (!txRes.ok || (txData.success === false)) {
          throw new Error(txData.message || 'Failed to process stock-out disposal.');
        }
      }

      if (!String(alertToResolve.id).startsWith('exp-batch-')) {
        await fetch(`https://vetstock-backend.onrender.com/api/alerts/${alertToResolve.id}/resolve`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            resolution_notes: resolveNote.trim() || 'Disposed due to expiration.'
          })
        });
      }

      setToastMessage('Expired medicine successfully disposed and removed from inventory!');
      setToastType('success');
      
      setResolveNote('');
      setAlertToResolve(null);
      await fetchAlerts();

    } catch (err) {
      console.error('Error resolving disposal:', err);
      setToastMessage(err.message || 'Unable to process disposal.');
      setToastType('error');
    } finally {
      setResolvingId(null);
    }
  };

  const unreadCount = notifications.filter(notif => !notif.read).length;
  const stockCount = notifications.filter(notif => notif.category === 'stock').length;
  const batchCount = notifications.filter(notif => notif.category === 'batch').length;
  const expirationCount = notifications.filter(notif => notif.category === 'expiration').length;
  const appointmentCount = notifications.filter(notif => notif.category === 'appointment').length;

  return (
    <div className="notifications-page">
      <Notification
        message={toastMessage}
        type={toastType}
        onClose={closeToast}
        duration={5000}
      />

      <div className="notifications-header">
        <div>
          <h2>System Notifications</h2>
          <p>Real-time alerts, low stock warnings, expiration trackers, and automated disposal queues.</p>
        </div>

        <div className="notification-header-actions">
          <button className="mark-all-btn" onClick={fetchAlerts} disabled={refreshing}>
            <i className={`fa-solid fa-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button className="mark-all-btn" onClick={markAllAsRead} disabled={unreadCount === 0 || markingAll}>
            <i className="fa-solid fa-check-double"></i>
            {markingAll ? 'Updating...' : 'Mark all as read'}
          </button>
        </div>
      </div>

      <div className="notification-controls">
        <div className="filter-tabs">
          <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All Alerts <span className="badge-count">{notifications.length}</span>
          </button>
          <button className={`tab-btn ${filter === 'stock' ? 'active' : ''}`} onClick={() => setFilter('stock')}>
            Low Stock <span className="badge-count">{stockCount}</span>
          </button>
          <button className={`tab-btn ${filter === 'expiration' ? 'active' : ''}`} onClick={() => setFilter('expiration')}>
            Expirations & Expired <span className="badge-count">{expirationCount}</span>
          </button>
          <button className={`tab-btn ${filter === 'appointment' ? 'active' : ''}`} onClick={() => setFilter('appointment')}>
            Appointments <span className="badge-count">{appointmentCount}</span>
          </button>
          <button className={`tab-btn ${filter === 'batch' ? 'active' : ''}`} onClick={() => setFilter('batch')}>
            New Batches <span className="badge-count">{batchCount}</span>
          </button>
        </div>

        <div className="unread-status">
          <i className="fa-solid fa-bell"></i> {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p>Loading alerts and checking inventory expirations...</p>
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
              onClick={() => {
                toggleRead(notif.id, notif.read);
                setSelectedNotification(notif);
                setShowDetailModal(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="notif-icon-wrapper">
                {notif.category === 'stock' ? (
                  <i className="fa-solid fa-triangle-exclamation"></i>
                ) : notif.category === 'expiration' ? (
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: notif.alertType === 'EXPIRED' ? '#dc2626' : 'inherit' }}></i>
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
                  <span className={`notif-type-tag ${notif.category}`} style={notif.alertType === 'EXPIRED' ? { background: '#fee2e2', color: '#991b1b' } : {}}>
                    {notif.alertType === 'EXPIRED' ? 'Expired & Quarantined' : notif.type}
                  </span>
                  <span className="notif-date">{notif.date}</span>
                </div>

                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
              </div>

              <div className="notif-action-indicator" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!notif.read && <span className="unread-dot" title="Unread"></span>}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlertToResolve(notif); 
                    setShowResolveModal(true);
                  }}
                  disabled={resolvingId === notif.id}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: notif.alertType === 'EXPIRED' ? '#fee2e2' : '#dcfce7',
                    color: notif.alertType === 'EXPIRED' ? '#991b1b' : '#166534',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: resolvingId === notif.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resolvingId === notif.id ? 'Processing...' : (notif.alertType === 'EXPIRED' ? 'Dispose / Stock Out' : 'Resolve')}
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

      {/* DETAIL MODAL */}
      {showDetailModal && selectedNotification && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'left', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                <i className="fa-solid fa-circle-info"></i>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Notification Details</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Complete information regarding this alert</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', color: '#374151' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Alert Type</span>
                <span style={{ fontWeight: '600', color: selectedNotification.alertType === 'EXPIRED' ? '#991b1b' : '#0d9488', background: selectedNotification.alertType === 'EXPIRED' ? '#fee2e2' : '#f0fdfa', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  {selectedNotification.alertType === 'EXPIRED' ? 'Expired & Quarantined' : selectedNotification.type}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Category / Title</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{selectedNotification.title}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Full Message / Information</span>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334151', lineHeight: '1.5', fontSize: '13px' }}>
                  {selectedNotification.message}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Date Generated</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{selectedNotification.date}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Status</span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: selectedNotification.read ? '#dcfce7' : '#fee2e2', color: selectedNotification.read ? '#166534' : '#991b1b' }}>
                    {selectedNotification.read ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDetailModal(false)}
                style={{ background: '#0d9488', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        
      {/* DISPOSAL / RESOLVE MODAL */}
      {showResolveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '18px', fontWeight: '700' }}>Process Item Disposal</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>
              This will automatically deduct the expired batch from active inventory stocks and log a disposal transaction. Enter optional notes:
            </p>
            
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="E.g., Quarantined and prepared for safe incineration..."
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowResolveModal(false)}
                style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#334155' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResolveAlert}
                style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#fff' }}
              >
                Confirm & Remove from Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}