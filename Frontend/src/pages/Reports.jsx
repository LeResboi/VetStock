import React, { useState } from 'react';
import './Reports.css';

export default function Reports() {
  const [reportType, setReportType] = useState(null); 
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  const handleGenerateReport = async (type) => {
    setReportType(type);
    setLoading(true);
    setError(null);
    setReportData([]);

    let endpoint = '';
    if (type === 'inventory') endpoint = 'http://localhost:3001/api/reports/inventory-summary';
    else if (type === 'transactions') endpoint = 'http://localhost:3001/api/reports/recent-transactions';
    else if (type === 'health') endpoint = 'http://localhost:3001/api/reports/health-summary';
    else if (type === 'expiry') endpoint = 'http://localhost:3001/api/reports/expiring?days=90';

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.message || 'Failed to generate report.');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div className="reports-header" style={{ marginBottom: '24px' }}>
        <h2>Reports</h2>
        <p>Generate real-time system reports directly from your Supabase database.</p>
      </div>

      {!reportType ? (
        /* Report Selection Cards / List */
        <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Inventory Report Card */}
          <div className="report-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #0d9488' }}>
            <h3>Inventory Report</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '12px 0' }}>View current inventory levels and stock status.</p>
            <button 
              className="generate-btn" 
              onClick={() => handleGenerateReport('inventory')}
              style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              Generate
            </button>
          </div>

          {/* Transaction Report Card */}
          <div className="report-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #0d9488' }}>
            <h3>Transaction Report</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '12px 0' }}>View stock in and stock out transactions.</p>
            <button 
              className="generate-btn" 
              onClick={() => handleGenerateReport('transactions')}
              style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              Generate
            </button>
          </div>

          {/* Patient Health Report Card */}
          <div className="report-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #0d9488' }}>
            <h3>Patient Health Report</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '12px 0' }}>View patient health records and medical history.</p>
            <button 
              className="generate-btn" 
              onClick={() => handleGenerateReport('health')}
              style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              Generate
            </button>
          </div>

          {/* Expiry Report Card */}
          <div className="report-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #0d9488' }}>
            <h3>Expiry Report</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '12px 0' }}>View medicines that are nearing expiration.</p>
            <button 
              className="generate-btn" 
              onClick={() => handleGenerateReport('expiry')}
              style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              Generate
            </button>
          </div>

        </div>
      ) : (
        <div className="report-result-container" style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{reportType} Report Results</h3>
            <button 
              onClick={() => setReportType(null)}
              style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              &larr; Back to Reports
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
              <p>Generating report from database...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
              <p>{error}</p>
            </div>
          ) : reportData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>No records found for this report.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    {reportType === 'inventory' && (
                      <>
                        <th style={{ padding: '12px' }}>Item Name</th>
                        <th style={{ padding: '12px' }}>Total Quantity</th>
                        <th style={{ padding: '12px' }}>Inventory Value</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </>
                    )}
                    {reportType === 'transactions' && (
                      <>
                        <th style={{ padding: '12px' }}>Transaction ID</th>
                        <th style={{ padding: '12px' }}>Item Name</th>
                        <th style={{ padding: '12px' }}>Type</th>
                        <th style={{ padding: '12px' }}>Quantity</th>
                        <th style={{ padding: '12px' }}>Date</th>
                      </>
                    )}
                    {reportType === 'health' && (
                      <>
                        <th style={{ padding: '12px' }}>Patient MRN</th>
                        <th style={{ padding: '12px' }}>Diagnosis</th>
                        <th style={{ padding: '12px' }}>Symptoms</th>
                        <th style={{ padding: '12px' }}>Treatment</th>
                        <th style={{ padding: '12px' }}>Date</th>
                      </>
                    )}
                    {reportType === 'expiry' && (
                      <>
                        <th style={{ padding: '12px' }}>Item Name</th>
                        <th style={{ padding: '12px' }}>Batch Number</th>
                        <th style={{ padding: '12px' }}>Quantity</th>
                        <th style={{ padding: '12px' }}>Expiration Date</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {reportType === 'inventory' && (
                        <>
                          <td style={{ padding: '12px' }}><strong>{row.item_name}</strong></td>
                          <td style={{ padding: '12px' }}>{row.total_quantity}</td>
                          <td style={{ padding: '12px' }}>₱{Number(row.inventory_value).toFixed(2)}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: row.low_stock ? '#fee2e2' : '#dcfce7', color: row.low_stock ? '#991b1b' : '#166534' }}>
                              {row.low_stock ? 'Low Stock' : 'Normal'}
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === 'transactions' && (
                        <>
                          <td style={{ padding: '12px' }}>#{row.transaction_id?.substring(0, 8)}</td>
                          <td style={{ padding: '12px' }}><strong>{row.inventory_items?.item_name || 'N/A'}</strong></td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: row.transaction_type === 'IN' ? '#dcfce7' : '#fee2e2', color: row.transaction_type === 'IN' ? '#166534' : '#991b1b' }}>
                              {row.transaction_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{row.quantity}</td>
                          <td style={{ padding: '12px' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                        </>
                      )}
                      {reportType === 'health' && (
                        <>
                          <td style={{ padding: '12px' }}>MRN-{row.mrn_number}-A</td>
                          <td style={{ padding: '12px' }}><strong>{row.diagnosis || 'N/A'}</strong></td>
                          <td style={{ padding: '12px' }}>{Array.isArray(row.symptoms) ? row.symptoms.join(', ') : (row.symptoms || 'N/A')}</td>
                          <td style={{ padding: '12px' }}>{row.treatment_notes || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{new Date(row.record_date).toLocaleDateString()}</td>
                        </>
                      )}
                      {reportType === 'expiry' && (
                        <>
                          <td style={{ padding: '12px' }}><strong>{row.item_name}</strong></td>
                          <td style={{ padding: '12px' }}>{row.batch_number}</td>
                          <td style={{ padding: '12px' }}>{row.quantity}</td>
                          <td style={{ padding: '12px', color: '#dc2626', fontWeight: 'bold' }}>{row.expiration_date}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}