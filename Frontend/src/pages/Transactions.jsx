import React, { useState, useEffect, useCallback } from 'react';
import './Transactions.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newItemId, setNewItemId] = useState('');
  const [newType, setNewType] = useState('IN');
  const [newQuantity, setNewQuantity] = useState('');
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [newBatchId, setNewBatchId] = useState('');

  const token = localStorage.getItem('token');

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch(
        'http://localhost:3001/api/stock-transactions/batches',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setBatches(data.data);
      } else {
        console.error('Failed to fetch batches:', data.message);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/stock-transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        const sortedTransactions = [...data.data].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });

        setTransactions(sortedTransactions);
      } else {
        setError(data.message || 'Failed to load transactions.');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchInventoryItems = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInventoryItems(data.data);
      }
    } catch (err) {
      console.error('Error fetching inventory items:', err);
    }
  }, [token]);

  useEffect(() => {
  fetchBatches();
  fetchTransactions();
  fetchInventoryItems();
}, [fetchBatches, fetchTransactions, fetchInventoryItems]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!newItemId || !newType || !newQuantity) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/api/stock-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: newItemId,
          batch_id: newBatchId,
          transaction_type: newType,
          quantity: Number(newQuantity),
          reason: newReason
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Transaction successfully recorded!');
        setShowModal(false);
        setNewItemId('');
        setNewBatchId('');
        setNewType('IN');
        setNewQuantity('');
        setNewReason('');
        fetchTransactions();
      } else {
        alert(data.message || 'Failed to save transaction.');
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert('An error occurred on the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const medicineName = tx.inventory_items?.item_name || '';
    const staffName = tx.users ? `${tx.users.first_name} ${tx.users.last_name}` : 'Admin User';
    const txId = tx.transaction_id || '';

    const matchesSearch =
      txId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === '' || tx.transaction_type === filterType;

    return matchesSearch && matchesType;
  });

  const totalStockIn = transactions
    .filter(t => t.transaction_type === 'IN')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const totalStockOut = transactions
    .filter(t => t.transaction_type === 'OUT')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="transactions-page">
      {/* Page Header */}
      <div className="transactions-header">
        <div>
          <h2>Stock Transactions</h2>
          <p>Monitor all stock movements, entries, and exits across the system in real-time.</p>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus"></i> New Transaction
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="transactions-stats">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fa-solid fa-right-left"></i></div>
          <div>
            <h3>{transactions.length}</h3>
            <p>Total Transactions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="fa-solid fa-arrow-trend-up"></i></div>
          <div>
            <h3>{totalStockIn}</h3>
            <p>Total Stock In</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="fa-solid fa-arrow-trend-down"></i></div>
          <div>
            <h3>{totalStockOut}</h3>
            <p>Total Stock Out</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="transactions-toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            style={{ backgroundColor: '#ffff', color: '#000000' }}
            placeholder="Search transactions, medicine, or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Transaction Types</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p>Loading transactions from database...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
            <p>{error}</p>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Medicine / Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const formattedDate = new Date(tx.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const staffName = tx.users ? `${tx.users.first_name} ${tx.users.last_name}` : 'System Admin';
                  const badgeClass = tx.transaction_type === 'IN' ? 'stock-in' : tx.transaction_type === 'OUT' ? 'stock-out' : 'adjustment';

                  return (
                    <tr key={tx.transaction_id}>
                      <td><span className="item-id">#{tx.transaction_id.substring(0, 8)}</span></td>
                      <td>{formattedDate}</td>
                      <td><strong>{tx.inventory_items?.item_name || 'Unknown Item'}</strong></td>
                      <td>
                        <span className={`status-badge ${badgeClass}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td>{tx.quantity}</td>
                      <td>{staffName}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">No transactions found in database.</td>
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
              <h3>Record New Stock Transaction</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateTransaction}>
              {/* SELECT MEDICINE / ITEM */}
              <div className="form-group">
                <label>Select Medicine / Item</label>
                <select
                  value={newItemId}
                  onChange={(e) => {
                    setNewItemId(e.target.value);
                    setNewBatchId('');
                  }}
                  required
                >
                  <option value="">-- Choose an Item --</option>

                  {inventoryItems.map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.item_name} (Stock: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* SELECT BATCH — ADD THIS HERE */}
              <div className="form-group">
                <label>Select Batch *</label>

                <select
                  value={newBatchId}
                  onChange={(e) => setNewBatchId(e.target.value)}
                  required
                >
                  <option value="">-- Choose a Batch --</option>

                  {batches
                    .filter(batch => batch.item_id === newItemId)
                    .filter(batch => batch.quantity > 0)
                    .map(batch => (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.batch_number || batch.batch_id}
                        {' | Stock: '}
                        {batch.quantity}
                        {batch.expiration_date
                          ? ` | Expires: ${batch.expiration_date}`
                          : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* TRANSACTION TYPE — KEEP YOUR EXISTING FIELD BELOW */}
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  required
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity..."
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Resupply, Patient use..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}