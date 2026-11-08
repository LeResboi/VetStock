import React, { useState, useEffect } from 'react';
import './Inventory.css';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [refreshInventory, setRefreshInventory] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

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

  async function handleAddInventory(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setAddError('');

    try {
      const response = await fetch(
        'http://localhost:3001/api/inventory',
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

      alert('Inventory item added successfully!');

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

  useEffect(() => {
    fetch('http://localhost:3001/api/inventory', {
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
          id: item.item_id || item.id,
          name: item.item_name || item.name,
          category: item.category || 'General',
          quantity: item.total_quantity !== undefined ? item.total_quantity : (item.quantity || 0),
          price: item.unit_price !== undefined ? item.unit_price : 0,
          minStock: item.reorder_point !== undefined ? item.reorder_point : 10
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
    const minStock = Number(i.minStock ?? 10);

    return quantity > 0 && quantity <= minStock;
  }).length;

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h2>Inventory Management</h2>
          <p>Real-time tracking of veterinary medicines, supplies, and stock levels from Supabase.</p>
        </div>
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
      </div>

      {showAddModal && (
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

      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fa-solid fa-boxes-stacked"></i></div>
          <div>
            <h3>{totalItems}</h3>
            <p>Total Inventory Items</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            <h3>{lowStockItems}</h3>
            <p>Low Stock Alerts</p>
          </div>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            placeholder="Search medicine name, ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Medicine">Medicine</option>
            <option value="Vaccine">Vaccine</option>
            <option value="Supplies">Supplies</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="no-data">Loading inventory from database...</td>
              </tr>
            ) : filteredInventory.length > 0 ?
              (paginatedInventory.map((item, index) => {
                const quantity = Number(item.quantity) || 0;
                const minStock = Number(item.minStock ?? 10);

                const stockStatus = quantity <= 0
                  ? 'No Stock'
                  : quantity <= minStock
                    ? 'Low Stock'
                    : 'In Stock';

                const statusClass = quantity <= 0
                  ? 'no-stock'
                  : quantity <= minStock
                    ? 'low-stock'
                    : 'in-stock';
                return (
                  <tr key={index}>
                    <td><span className="item-id">{String(item.id).substring(0, 8)}</span></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.price ? Number(item.price).toFixed(2) : '0.00'}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {stockStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">No inventory items found from database.</td>
                </tr>
              )}
          </tbody>
        </table>

        {/* PAGINATION FOOTER */}
        <div className="inventory-pagination">

          <div className="inventory-pagination-info">
            <label htmlFor="inventory-page-size">
              Rows per page:
            </label>

            <select
              id="inventory-page-size"
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <span className="inventory-page-range">
            Showing {filteredInventory.length === 0
              ? "0–0"
              : `${startIndex + 1}–${Math.min(
                startIndex + pageSize,
                filteredInventory.length
              )}`} of {filteredInventory.length} items
          </span>

          <div className="inventory-pagination-controls">

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage(prev => Math.max(1, prev - 1))
              }
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage(prev =>
                  Math.min(totalPages, prev + 1)
                )
              }
            >
              Next
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}