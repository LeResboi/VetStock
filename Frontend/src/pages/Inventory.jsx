import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Notification from '../components/Notification';
import './Inventory.css';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Inventory Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Edit Inventory Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Action states
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Custom notification state
  const [notification, setNotification] = useState(null);

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
  }

  const [filterCategory, setFilterCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [refreshInventory, setRefreshInventory] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Print ref setup
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'VetStock_Inventory_Report',
  });

  const initialFormData = {
    item_name: '',
    category: 'Medicine',
    unit_of_measure: '',
    unit_price: '',
    cost_price: '',
    min_stock_level: '0',
    max_stock_level: '0',
    reorder_point: '0',
    storage_conditions: '',
    quantity: '0',
    expiration_date: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const token = localStorage.getItem('token');

  // ============================================================
  // USER ROLE AND INVENTORY PERMISSIONS
  // ============================================================

  const [userRole, setUserRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(true);

  const canManageInventory =
    ['Administrator', 'Inventory Staff'].includes(userRole);

  // Fetch current user's role
  useEffect(() => {
    const fetchUserRole = async () => {
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
          throw new Error(
            data.message || 'Unable to retrieve user role.'
          );
        }

        setUserRole(data.data?.role || '');

      } catch (error) {
        console.error('Fetch inventory user role error:', error);
        setUserRole('');

      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [token]);

  async function handleAddInventory(event) {
    event.preventDefault();
    if (!canManageInventory) return;
    if (saving) return;

    setSaving(true);
    setAddError('');

    try {
      const response = await fetch(
        'https://vetstock-backend.onrender.com/api/inventory',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            item_name: formData.item_name.trim(),
            category: formData.category || null,
            unit_of_measure: formData.unit_of_measure || null,
            unit_price: Number(formData.unit_price) || 0,
            cost_price: Number(formData.cost_price) || 0,
            min_stock_level: Number(formData.min_stock_level) || 0,
            max_stock_level: Number(formData.max_stock_level) || 0,
            reorder_point: Number(formData.reorder_point) || 0,
            storage_conditions: formData.storage_conditions || null,
            quantity: Number(formData.quantity) || 0,
            expiration_date: formData.expiration_date || null
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to create inventory item.'
        );
      }

      showNotification('Inventory item added successfully!', 'success');

      setShowAddModal(false);
      setFormData({ ...initialFormData });
      setAddError('');

      // Reload inventory from Supabase.
      setRefreshInventory(previous => previous + 1);

    } catch (error) {
      console.error('Add inventory error:', error);
      setAddError(error.message || 'Failed to add inventory item.');
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // EDIT INVENTORY ITEM
  // ============================================================

  async function handleUpdateInventory(event) {
    event.preventDefault();
    if (!canManageInventory) return;
    if (updating || !selectedItem) return;

    setUpdating(true);
    setActionError('');

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/inventory/${selectedItem.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            item_name: editFormData.item_name.trim(),
            category: editFormData.category,
            unit_of_measure: editFormData.unit_of_measure,
            unit_price: Number(editFormData.unit_price) || 0,
            cost_price: Number(editFormData.cost_price) || 0,
            min_stock_level: Number(editFormData.min_stock_level) || 0,
            max_stock_level: Number(editFormData.max_stock_level) || 0,
            reorder_point: Number(editFormData.reorder_point) || 0,
            storage_conditions: editFormData.storage_conditions
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update inventory item.');
      }

      showNotification('Inventory item updated successfully!', 'success');

      setShowEditModal(false);
      setShowDetailsModal(false);
      setSelectedItem(null);
      setEditFormData({});
      setRefreshInventory(previous => previous + 1);

    } catch (error) {
      console.error('Update inventory error:', error);
      setActionError(error.message || 'Failed to update inventory item.');
    } finally {
      setUpdating(false);
    }
  }

  // ============================================================
  // DELETE INVENTORY ITEM (SOFT DELETE)
  // ============================================================

  async function handleDeleteInventory() {
    if (!canManageInventory) return;
    if (deleting || !selectedItem) return;

    setDeleting(true);
    setActionError('');

    try {
      const response = await fetch(
        `https://vetstock-backend.onrender.com/api/inventory/${selectedItem.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete inventory item.');
      }

      showNotification('Inventory item deleted successfully!', 'success');

      setShowDeleteModal(false);
      setShowDetailsModal(false);
      setSelectedItem(null);
      setRefreshInventory(previous => previous + 1);

    } catch (error) {
      console.error('Delete inventory error:', error);
      setActionError(error.message || 'Failed to delete inventory item.');
    } finally {
      setDeleting(false);
    }
  }

  // ============================================================
  // OPEN EDIT INVENTORY MODAL
  // ============================================================

  function openEditModal(item) {
    if (!canManageInventory) return;
    setActionError('');

    setSelectedItem(item);

    setEditFormData({
      item_name: item.item_name || item.name || '',
      category: item.category || 'Medicine',
      unit_of_measure: item.unit_of_measure || '',
      unit_price: item.unit_price ?? 0,
      cost_price: item.cost_price ?? 0,
      min_stock_level: item.min_stock_level ?? 0,
      max_stock_level: item.max_stock_level ?? 0,
      reorder_point: item.reorder_point ?? 0,
      storage_conditions: item.storage_conditions || ''
    });

    setShowDetailsModal(false);
    setShowEditModal(true);
  }

  useEffect(() => {
    fetch('https://vetstock-backend.onrender.com/api/inventory', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        let rawItems = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data && Array.isArray(data.items)) {
          rawItems = data.items;
        }

        const formattedItems = rawItems.map(item => ({
          ...item,

          id: item.item_id || item.id,
          name: item.item_name || item.name,
          category: item.category || 'General',

          quantity:
            item.quantity !== undefined
              ? item.quantity
              : item.total_quantity || 0,

          price: item.unit_price !== undefined
            ? item.unit_price
            : 0,

          minStock: item.reorder_point !== undefined
            ? item.reorder_point
            : 10
        }));

        setInventory(formattedItems);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching inventory from database:', error);
        setInventory([]);
        setLoading(false);
      });
  }, [token, refreshInventory]);

  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const filteredInventory = safeInventory.filter(item => {
    const matchesSearch =
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.id && String(item.id).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === '' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInventory.length / pageSize)
  );

  const startIndex = (currentPage - 1) * pageSize;

  const paginatedInventory = filteredInventory.slice(
    startIndex,
    startIndex + pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, pageSize]);

  const totalItems = safeInventory.length;
  
  const lowStockItems = safeInventory.filter(i => {
    const quantity = Number(i.quantity) || 0;
    const minStock = Number(i.minStock ?? i.reorder_point ?? 10);

    return quantity <= minStock;
  }).length;

  return (
    <div className="inventory-page">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="inventory-header">
        <div>
          <h2>Inventory Management</h2>
          <p>Real-time tracking of veterinary medicines, supplies, and stock levels from Supabase.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              backgroundColor: '#0f766e',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-print"></i> Print / Save PDF
          </button>

          {!roleLoading && canManageInventory && (
            <button
              type="button"
              className="add-btn"
              onClick={() => {
                setAddError('');
                setShowAddModal(true);
              }}
            >
              <i className="fa-solid fa-plus"></i> Add New Item
            </button>
          )}
        </div>
      </div>

      {showAddModal && canManageInventory && (
        <div className="modal-overlay">
          <div className="inventory-modal">

            <div className="modal-header">
              <h2>Add New Inventory Item</h2>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddInventory}>
              <div className="modal-body">

                {addError && (
                  <p className="error-msg">{addError}</p>
                )}

                <label>Medicine Name *</label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      item_name: e.target.value
                    })
                  }
                  required
                />

                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      category: e.target.value
                    })
                  }
                >
                  <option value="Medicine">Medicine</option>
                  <option value="Vaccine">Vaccine</option>
                  <option value="Supplies">Supplies</option>
                </select>

                <label>Unit of Measure</label>
                <input
                  type="text"
                  placeholder="e.g. tablet, bottle, ml"
                  value={formData.unit_of_measure}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      unit_of_measure: e.target.value
                    })
                  }
                />

                <label>Unit Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      unit_price: e.target.value
                    })
                  }
                />

                <label>Cost Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      cost_price: e.target.value
                    })
                  }
                />

                <label>Initial Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      quantity: e.target.value
                    })
                  }
                  required
                />

                <label>Expiration Date</label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      expiration_date: e.target.value
                    })
                  }
                />

                <label>Minimum Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock_level}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      min_stock_level: e.target.value
                    })
                  }
                />

                <label>Maximum Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_stock_level}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      max_stock_level: e.target.value
                    })
                  }
                />

                <label>Reorder Point</label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorder_point}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      reorder_point: e.target.value
                    })
                  }
                />

                <label>Storage Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Keep in a cool place"
                  value={formData.storage_conditions}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      storage_conditions: e.target.value
                    })
                  }
                />

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Inventory Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY DETAILS MODAL */}

      {showDetailsModal && selectedItem && (
        <div
          className="modal-overlay inventory-details-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="inventory-modal inventory-details-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Inventory Item Details</h2>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">

              {actionError && (
                <p className="error-msg">{actionError}</p>
              )}

              <div className="inventory-detail-grid">

                <div className="inventory-detail-item">
                  <label>Item ID</label>
                  <p>{selectedItem.item_id || selectedItem.id}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Item Code</label>
                  <p>{selectedItem.item_code || 'Not assigned'}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Medicine Name</label>
                  <p>{selectedItem.item_name || selectedItem.name}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Category</label>
                  <p>{selectedItem.category || 'Not specified'}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Unit of Measure</label>
                  <p>{selectedItem.unit_of_measure || 'Not specified'}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Current Quantity</label>
                  <p>{selectedItem.quantity ?? 0}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Unit Price</label>
                  <p>₱{Number(selectedItem.unit_price || 0).toFixed(2)}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Cost Price</label>
                  <p>₱{Number(selectedItem.cost_price || 0).toFixed(2)}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Minimum Stock Level</label>
                  <p>{selectedItem.min_stock_level ?? 0}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Maximum Stock Level</label>
                  <p>{selectedItem.max_stock_level ?? 0}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Reorder Point</label>
                  <p>{selectedItem.reorder_point ?? 0}</p>
                </div>

                <div className="inventory-detail-item">
                  <label>Storage Conditions</label>
                  <p>{selectedItem.storage_conditions || 'Not specified'}</p>
                </div>

              </div>

              <div className="inventory-batch-section">
                <h3>Batch Information</h3>

                {Array.isArray(selectedItem.inventory_batches) &&
                  selectedItem.inventory_batches.length > 0 ? (
                  <div className="inventory-batch-list">
                    {selectedItem.inventory_batches.map(batch => (
                      <div
                        className="inventory-batch-card"
                        key={batch.batch_id}
                      >
                        <p>
                          <strong>Batch Number:</strong>{' '}
                          {batch.batch_number || 'Not assigned'}
                        </p>

                        <p>
                          <strong>Quantity:</strong>{' '}
                          {batch.quantity ?? 0}
                        </p>

                        <p>
                          <strong>Expiration Date:</strong>{' '}
                          {batch.expiration_date
                            ? new Date(batch.expiration_date).toLocaleDateString()
                            : 'No expiration date'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No batch information available.</p>
                )}
              </div>

            </div>


            <div className="modal-footer">
              {canManageInventory && (
                <>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => openEditModal(selectedItem)}
                  >
                    <i className="fa-solid fa-pen"></i> Edit Item
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: '1px solid #dc2626',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => {
                      setActionError('');
                      setShowDetailsModal(false);
                      setShowDeleteModal(true);
                    }}
                  >
                    <i className="fa-solid fa-trash"></i> Delete Item
                  </button>
                </>
              )}

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INVENTORY MODAL */}
      {showEditModal && selectedItem && canManageInventory && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!updating) setShowEditModal(false);
          }}
        >
          <div
            className="inventory-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="modal-header">
              <h2>Edit Inventory Item</h2>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                disabled={updating}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateInventory}>

              <div className="modal-body">

                {actionError && (
                  <p className="error-msg">{actionError}</p>
                )}

                <label>Medicine Name *</label>
                <input
                  type="text"
                  value={editFormData.item_name || ''}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      item_name: e.target.value
                    })
                  }
                  required
                />

                <label>Category</label>
                <select
                  value={editFormData.category || 'Medicine'}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      category: e.target.value
                    })
                  }
                >
                  <option value="Medicine">Medicine</option>
                  <option value="Vaccine">Vaccine</option>
                  <option value="Supplies">Supplies</option>
                </select>

                <label>Unit of Measure</label>
                <input
                  type="text"
                  value={editFormData.unit_of_measure || ''}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      unit_of_measure: e.target.value
                    })
                  }
                />

                <label>Unit Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.unit_price ?? 0}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      unit_price: e.target.value
                    })
                  }
                />

                <label>Cost Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.cost_price ?? 0}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      cost_price: e.target.value
                    })
                  }
                />

                <label>Minimum Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.min_stock_level ?? 0}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      min_stock_level: e.target.value
                    })
                  }
                />

                <label>Maximum Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.max_stock_level ?? 0}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      max_stock_level: e.target.value
                    })
                  }
                />

                <label>Reorder Point</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.reorder_point ?? 0}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      reorder_point: e.target.value
                    })
                  }
                />

                <label>Storage Conditions</label>
                <input
                  type="text"
                  value={editFormData.storage_conditions || ''}
                  onChange={e =>
                    setEditFormData({
                      ...editFormData,
                      storage_conditions: e.target.value
                    })
                  }
                />

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowEditModal(false)}
                  disabled={updating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE INVENTORY CONFIRMATION MODAL */}
      {showDeleteModal && selectedItem && canManageInventory && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="inventory-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="modal-header">
              <h2>Confirm Delete</h2>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">

              {actionError && (
                <p className="error-msg">{actionError}</p>
              )}

              <p>
                Are you sure you want to delete{' '}
                <strong>
                  {selectedItem.item_name || selectedItem.name}
                </strong>?
              </p>

              <p style={{ color: '#6b7280', fontSize: '13px' }}>
                This inventory item will be removed from the active inventory.
                Its historical records and transactions will be preserved.
              </p>

            </div>

            <div className="modal-footer">

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteInventory}
                className="delete-btn"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* SEARCH & FILTER BAR */}
      <div className="inventory-toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search medicine name, ID, or category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="Medicine">Medicine</option>
            <option value="Vaccine">Vaccine</option>
            <option value="Supplies">Supplies</option>
          </select>
        </div>
      </div>

      {/* STATS SUMMARY CARDS */}
      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <h3>{totalItems}</h3>
            <p>Total Inventory Items</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div>
            <h3>{lowStockItems}</h3>
            <p>Low Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* TABLE VIEW (Naka-wrap sa componentRef para ma-print nang maayos) */}
      <div className="table-container" ref={componentRef}>
        <div className="print-header" style={{ display: 'none' }}>
          <h2>VetStock Veterinary Clinic - Inventory Report</h2>
          <p>Generated on: {new Date().toLocaleDateString()}</p>
          <hr style={{ margin: '15px 0', border: '1px solid #ccc' }} />
        </div>

        <table className="modern-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Status</th>
              <th className="no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="no-data">Loading inventory...</td>
              </tr>
            ) : paginatedInventory.length > 0 ? (
              paginatedInventory.map(item => {
                const qty = Number(item.quantity) || 0;
                const min = Number(item.minStock ?? 10);
                
                let statusBadge = <span className="status-badge in-stock">IN STOCK</span>;
                if (qty === 0) {
                  statusBadge = <span className="status-badge no-stock">NO STOCK</span>;
                } else if (qty <= min) {
                  statusBadge = <span className="status-badge low-stock">LOW STOCK</span>;
                }

                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDetailsModal(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><span className="item-id">#{String(item.id).substring(0, 8)}</span></td>
                    <td><strong>{item.name}</strong></td>
                    <td><span className="category-tag">{item.category}</span></td>
                    <td>{qty}</td>
                    <td>₱{Number(item.price || 0).toFixed(2)}</td>
                    <td>{statusBadge}</td>
                    <td className="no-print">
                      <div className="action-buttons" onClick={e => e.stopPropagation()}>
                        {canManageInventory && (
                          <>
                            <button
                              type="button"
                              className="icon-btn edit"
                              onClick={() => openEditModal(item)}
                              title="Edit Item"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              type="button"
                              className="icon-btn delete"
                              onClick={() => {
                                setSelectedItem(item);
                                setActionError('');
                                setShowDeleteModal(true);
                              }}
                              title="Delete Item"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="no-data">No inventory items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="inventory-pagination">
        <div className="inventory-pagination-info">
          <label>Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div className="inventory-pagination-controls">
          <button
            type="button"
            disabled={currentPage === 1}
            onChange={() => {}}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}