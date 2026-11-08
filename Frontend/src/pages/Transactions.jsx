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
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [newItemId, setNewItemId] = useState('');
  const [newType, setNewType] = useState('IN');
  const [newQuantity, setNewQuantity] = useState('');
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [newBatchId, setNewBatchId] = useState('');

  // Stock In receiving options
  const [receiptMethod, setReceiptMethod] = useState('NEW_BATCH');
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');

  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Fetch one transaction for viewing
  const handleViewTransaction = async (transactionId) => {
    setDetailLoading(true);
    setDetailError('');
    setViewingTransaction(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/stock-transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load transaction details.');
      }

      setViewingTransaction(data.data);

    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setDetailError(err.message || 'Unable to load transaction details.');
    } finally {
      setDetailLoading(false);
    }
  };


  const handleCreateTransaction = async (e) => {
    e.preventDefault();

    if (!newItemId || !newType || !newQuantity) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate the selected batch for Stock Out.
    if (newType === 'OUT' && !newBatchId) {
      alert('Please select a batch for Stock Out.');
      return;
    }

    // Validate the batch for existing-batch Stock In.
    if (
      newType === 'IN' &&
      receiptMethod === 'EXISTING_BATCH' &&
      !newBatchId
    ) {
      alert('Please select an existing batch.');
      return;
    }

    // Validate the new batch number.
    if (
      newType === 'IN' &&
      receiptMethod === 'NEW_BATCH' &&
      !newBatchNumber.trim()
    ) {
      alert('Please enter a batch number.');
      return;
    }

    // Preserve the existing batch requirement for Adjustment.
    if (newType === 'ADJUSTMENT' && !newBatchId) {
      alert('Please select a batch for Adjustment.');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody = {
        item_id: newItemId,
        transaction_type: newType,
        quantity: Number(newQuantity),
        reason: newReason
      };

      // STOCK IN
      if (newType === 'IN') {
        requestBody.receipt_method = receiptMethod;

        if (receiptMethod === 'NEW_BATCH') {
          requestBody.batch_number = newBatchNumber.trim();
          requestBody.expiration_date = newExpirationDate || null;
        } else {
          requestBody.batch_id = newBatchId;
        }
      }

      // STOCK OUT AND ADJUSTMENT
      else {
        requestBody.batch_id = newBatchId;
      }

      const response = await fetch(
        'http://localhost:3001/api/stock-transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to save transaction.'
        );
      }

      alert('Transaction successfully recorded!');

      // Close modal
      setShowModal(false);

      // Reset form
      setNewItemId('');
      setNewBatchId('');
      setNewType('IN');
      setNewQuantity('');
      setNewReason('');
      setReceiptMethod('NEW_BATCH');
      setNewBatchNumber('');
      setNewExpirationDate('');

      // Refresh updated database information
      fetchTransactions();
      fetchBatches();
      fetchInventoryItems();

    } catch (err) {
      console.error('Error creating transaction:', err);
      alert(err.message || 'An error occurred on the server.');
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

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + pageSize
  );

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
                paginatedTransactions.map((tx) => {
                  const formattedDate = new Date(tx.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const staffName = tx.users ? `${tx.users.first_name} ${tx.users.last_name}` : 'System Admin';
                  const badgeClass = tx.transaction_type === 'IN' ? 'stock-in' : tx.transaction_type === 'OUT' ? 'stock-out' : 'adjustment';

                  return (
                    <tr
                      key={tx.transaction_id}
                      className="clickable-transaction-row"
                      onClick={() => handleViewTransaction(tx.transaction_id)}
                      title="Click to view transaction details"
                    >
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

      <div className="transactions-pagination">

        <div className="transactions-pagination-info">
          <label htmlFor="transactions-page-size">Rows per page:</label>

          <select
            id="transactions-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        <span className="transactions-page-range">
          Showing {filteredTransactions.length === 0
            ? "0–0"
            : `${startIndex + 1}–${Math.min(
              startIndex + pageSize,
              filteredTransactions.length
            )}`}
          {" "}of {filteredTransactions.length} transactions
        </span>

        <div className="transactions-pagination-controls">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
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


              {/* TRANSACTION TYPE */}
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    setNewType(e.target.value);
                    setNewBatchId('');
                    setNewBatchNumber('');
                    setNewExpirationDate('');
                  }}
                  required
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>

              {/* STOCK IN RECEIVING METHOD */}
              {newType === 'IN' && (
                <div className="form-group">
                  <label>Receiving Method</label>
                  <select
                    value={receiptMethod}
                    onChange={(e) => {
                      setReceiptMethod(e.target.value);
                      setNewBatchId('');
                      setNewBatchNumber('');
                      setNewExpirationDate('');
                    }}
                    required
                  >
                    <option value="NEW_BATCH">Create New Batch</option>
                    <option value="EXISTING_BATCH">Add to Existing Batch</option>
                  </select>
                </div>
              )}

              {/* CREATE NEW BATCH */}
              {newType === 'IN' &&
                receiptMethod === 'NEW_BATCH' && (
                  <>
                    <div className="form-group">
                      <label>Batch Number *</label>
                      <input
                        type="text"
                        placeholder="Enter supplier batch number..."
                        value={newBatchNumber}
                        onChange={(e) =>
                          setNewBatchNumber(e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Expiration Date (Optional)</label>
                      <input
                        type="date"
                        value={newExpirationDate}
                        onChange={(e) =>
                          setNewExpirationDate(e.target.value)
                        }
                      />
                    </div>
                  </>
                )}

              {/* SELECT EXISTING BATCH */}
              {(newType === 'OUT' ||
                newType === 'ADJUSTMENT' ||
                (newType === 'IN' &&
                  receiptMethod === 'EXISTING_BATCH')) && (
                  <div className="form-group">
                    <label>Select Batch *</label>
                    <select
                      value={newBatchId}
                      onChange={(e) =>
                        setNewBatchId(e.target.value)
                      }
                      required
                    >
                      <option value="">-- Choose a Batch --</option>

                      {batches
                        .filter(
                          batch => batch.item_id === newItemId
                        )
                        .filter(batch => {
                          if (
                            newType === 'IN' &&
                            receiptMethod === 'EXISTING_BATCH'
                          ) {
                            return true;
                          }

                          return Number(batch.quantity) > 0;
                        })
                        .map(batch => (
                          <option
                            key={batch.batch_id}
                            value={batch.batch_id}
                          >
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
                )}
              {/* QUANTITY */}
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

              {/* REASON / NOTES */}
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
      {/* VIEW TRANSACTION DETAILS MODAL */}
      {(detailLoading || detailError || viewingTransaction) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setViewingTransaction(null);
            setDetailError('');
          }}
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
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                marginBottom: '20px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>
                  Transaction Details
                </h3>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                  Complete stock transaction information
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingTransaction(null);
                  setDetailError('');
                }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '35px' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                <p>Loading transaction details...</p>
              </div>
            ) : detailError ? (
              <p style={{ color: '#dc2626', textAlign: 'center' }}>
                {detailError}
              </p>
            ) : viewingTransaction && (
              <>
                {/* Transaction Summary */}
                <div
                  style={{
                    background: '#f0fdfa',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}
                >
                  <h2 style={{ margin: '0 0 6px', color: '#0f766e' }}>
                    {viewingTransaction.inventory_items?.item_name || 'Unknown Item'}
                  </h2>

                  <p style={{ margin: 0, color: '#475569' }}>
                    Transaction ID: #
                    {viewingTransaction.transaction_id?.substring(0, 8)}
                  </p>
                </div>

                {/* Transaction Information */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px'
                  }}
                >
                  {[
                    {
                      label: 'Transaction ID',
                      value: viewingTransaction.transaction_id
                    },
                    {
                      label: 'Medicine / Item',
                      value: viewingTransaction.inventory_items?.item_name
                    },
                    {
                      label: 'Transaction Type',
                      value: viewingTransaction.transaction_type
                    },
                    {
                      label: 'Quantity',
                      value: viewingTransaction.quantity
                    },
                    {
                      label: 'Batch ID',
                      value: viewingTransaction.batch_id
                    },
                    {
                      label: 'Recorded By',
                      value: viewingTransaction.users
                        ? `${viewingTransaction.users.first_name || ''} ${viewingTransaction.users.last_name || ''}`.trim()
                        : 'Unknown User'
                    },
                    {
                      label: 'Transaction Date',
                      value: viewingTransaction.created_at
                        ? new Date(viewingTransaction.created_at).toLocaleString('en-US')
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
                        minWidth: 0,
                        gridColumn: field.label === 'Transaction Date' ? '1 / -1' : 'auto'
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

                  {/* Reason / Notes */}
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
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
                      Reason / Notes
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#0f172a',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {viewingTransaction.reason || 'No additional notes.'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '24px'
              }}
            >
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setViewingTransaction(null);
                  setDetailError('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}