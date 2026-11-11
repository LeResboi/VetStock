import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Notifications.css';
import notificationSound from '../assets/sounds/Notification.wav';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const audioRef = useRef(null);
  const knownAlertIds = useRef(new Set());
  const hasFetchedAlerts = useRef(false);

  const token = localStorage.getItem('token');

  // Initialize notification sound.
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const incomingAlerts = Array.isArray(data.data) ? data.data : [];

        // Detect newly received unread notifications.
        const newAlerts = hasFetchedAlerts.current
          ? incomingAlerts.filter(alert =>
            !knownAlertIds.current.has(alert.alert_id) && !alert.is_read
          )
          : [];

        // Play sound when new notifications arrive.
        if (newAlerts.length > 0 && audioRef.current) {
          audioRef.current.currentTime = 0;

          audioRef.current.play().catch(err => {
            console.warn('Notification sound could not play:', err);
          });
        }

        // Remember the alert IDs.
        knownAlertIds.current = new Set(
          incomingAlerts.map(alert => alert.alert_id)
        );

        hasFetchedAlerts.current = true;

        const formattedAlerts = incomingAlerts.map(alert => ({
          id: alert.alert_id,
          type: alert.alert_type === 'LOW_STOCK'
            ? 'Low Stock Alert'
            : 'Expiration Warning',
          title: alert.alert_type === 'LOW_STOCK'
            ? 'Stock Warning'
            : 'Expiration Alert',
          message: alert.message,
          date: alert.created_at
            ? new Date(alert.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
            : 'N/A',
          read: alert.is_read,
          category: alert.alert_type === 'LOW_STOCK'
            ? 'stock'
            : 'expiration'
        }));

        setNotifications(formattedAlerts);
        setError(null);
      } else {
        setError(data.message || 'Failed to load alerts.');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();

    // Check for new notifications every 60 seconds.
    const interval = setInterval(() => {
      fetchAlerts();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const markAllAsRead = async () => {
    try {
      const unreadAlerts = notifications.filter(n => !n.read);
      for (const notif of unreadAlerts) {
        await fetch(`http://localhost:3001/api/alerts/${notif.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error resolving all alerts:', err);
      alert('May naganap na error sa pag-update ng mga alerto.');
    }
  };

  const toggleRead = async (id, currentReadStatus) => {
    if (currentReadStatus) return;

    try {
      const response = await fetch(`http://localhost:3001/api/alerts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'stock') return n.category === 'stock';
    if (filter === 'expiration') return n.category === 'expiration';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      {/* Page Header */}
      <div className="notifications-header">
        <div>
          <h2>System Notifications</h2>
          <p>Real-time alerts, low stock warnings, and expiration trackers from Supabase.</p>
        </div>
        <button className="mark-all-btn" onClick={markAllAsRead}>
          <i className="fa-solid fa-check-double"></i> Mark all as read
        </button>
      </div>

      {/* Quick Stats & Filters */}
      <div className="notification-controls">
        <div className="filter-tabs">
          <button
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts <span className="badge-count">{notifications.length}</span>
          </button>
          <button
            className={`tab-btn ${filter === 'stock' ? 'active' : ''}`}
            onClick={() => setFilter('stock')}
          >
            Low Stock <span className="badge-count">{notifications.filter(n => n.category === 'stock').length}</span>
          </button>
          <button
            className={`tab-btn ${filter === 'expiration' ? 'active' : ''}`}
            onClick={() => setFilter('expiration')}
          >
            Expirations <span className="badge-count">{notifications.filter(n => n.category === 'expiration').length}</span>
          </button>
        </div>
        <div className="unread-status">
          <i className="fa-solid fa-bell"></i> {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Notifications List Container */}
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
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-card ${notif.read ? 'read' : 'unread'} ${notif.category}`}
              onClick={() => toggleRead(notif.id, notif.read)}
            >
              <div className="notif-icon-wrapper">
                {notif.category === 'stock' ? (
                  <i className="fa-solid fa-triangle-exclamation"></i>
                ) : (
                  <i className="fa-solid fa-clock-rotate-left"></i>
                )}
              </div>
              <div className="notif-content">
                <div className="notif-top-row">
                  <span className={`notif-type-tag ${notif.category}`}>
                    {notif.type}
                  </span>
                  <span className="notif-date">{notif.date}</span>
                </div>
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
              </div>
              <div className="notif-action-indicator">
                {!notif.read && <span className="unread-dot" title="Unread"></span>}
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
    </div>
  );
}