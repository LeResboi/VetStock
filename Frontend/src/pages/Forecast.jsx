import React, { useState, useEffect, useCallback } from 'react';
import './Forecast.css';

export default function Forecast() {
  const [aiReport, setAiReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemForecasts, setItemForecasts] = useState([]);

  const [generatedAt, setGeneratedAt] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  const [userRole, setUserRole] = useState('');
  const [userRoleLoading, setUserRoleLoading] = useState(true);

  const canGenerateForecast = [
    'Administrator',
    'Clinic Manager'
  ].includes(userRole);

  const formatQuantity = (value) => {
    if (value === null || value === undefined) {
      return 'Insufficient data';
    }

    return Number(value).toFixed(2).replace(/\.?0+$/, '');
  };

  const fetchAiForecast = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    setRetryAfter(null);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        refresh
          ? 'https://vetstock-backend.onrender.com/api/forecast-ai/refresh'
          : 'https://vetstock-backend.onrender.com/api/forecast-ai',
        {
          method: refresh ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const requestError = new Error(
          data.message || 'Failed to fetch AI insights.'
        );

        requestError.retryAfterSeconds =
          data.retry_after_seconds ?? null;

        throw requestError;
      }

      if (data.success) {
        setAiReport(data.forecast || '');

        setItemForecasts(
          Array.isArray(data.item_forecasts)
            ? data.item_forecasts
            : []
        );

        setGeneratedAt(data.generated_at || null);
      } else {
        throw new Error(
          data.message || 'Failed to fetch AI insights.'
        );
      }

    } catch (err) {
      console.error('Error fetching AI forecast:', err);

      setError(
        err.message || 'Cannot connect to backend server.'
      );

      setRetryAfter(err.retryAfterSeconds ?? null);

    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {

    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');

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
        console.error('Fetch user role error:', error);
        setUserRole('');

      } finally {
        setUserRoleLoading(false);
      }
    };

    fetchUserRole();
    fetchAiForecast();

  }, [fetchAiForecast]);

  const hasForecastData =
    Boolean(aiReport) || itemForecasts.length > 0;


  const parseAiReportToCards = (text) => {
    if (!text) return null;

    const sections = text.split(/\n##+\s+/).filter(Boolean);
    const parsedSections = sections.map((section, index) => {
      const lines = section.trim().split('\n');
      let title = lines[0].replace(/[*#]/g, '').trim();
      if (!title) {
        title = "VetStock Insight";
      }

      const contentLines = lines.slice(1).filter(
        line => line.trim() !== ''
      );

      let icon = 'fa-solid fa-chart-line';

      if (index === 0 || title.toLowerCase().includes('demand')) {
        icon = 'fa-solid fa-binoculars';
      } else if (index === 1 || title.toLowerCase().includes('restock')) {
        icon = 'fa-solid fa-truck-medical';
      } else {
        icon = 'fa-solid fa-lightbulb';
      }

      const processedContent = contentLines.map((line, i) => {
        let cleanLine = line.trim();

        cleanLine = cleanLine
          .replace(/^[-*•]\s*/, '')
          .replace(/^\d+\.\s*/, '');

        if (!cleanLine) return null;

        return (
          <li key={i}>{cleanLine}</li>
        );
      }).filter(Boolean);

      return (
        <div key={index} className="ai-insight-card">
          <div className="card-icon-header">
            <i className={icon}></i>
            <h3>{title.replace(/^\d+\.\s*/, '')}</h3>
          </div>

          <div className="card-content">
            <ul>{processedContent}</ul>
          </div>
        </div>
      );
    });

    return (
      <div className="ai-cards-grid">
        {parsedSections}
      </div>
    );
  };

  return (
    <div className="forecast-page">
      {/* Header */}
      <div className="forecast-header">
        <div>
          <h2>VetStock AI Intelligence</h2>
          <p>Smart inventory analytics and restocking recommendations powered by Open AI.</p>
        </div>
        {!userRoleLoading && canGenerateForecast && (
          <button
            className="refresh-btn"
            onClick={() => fetchAiForecast(true)}
            disabled={loading}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="forecast-main-wrapper">
        {loading && !hasForecastData ? (
          <div className="forecast-loading-state">
            <i className="fa-solid fa-brain fa-spin fa-3x"></i>
            <h3>AI Vet is processing data...</h3>
            <p>
              Analyzing historical trends and predicting future VetStock needs.
            </p>
          </div>
        ) : !hasForecastData && error ? (
          <div className="forecast-error-state">
            <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
            <h3>Analysis Failed</h3>
            <p>{error}</p>

            {retryAfter !== null && (
              <p>
                OpenAI indicated a retry delay of {retryAfter} seconds.
              </p>
            )}

            {canGenerateForecast && (
              <button
                className="retry-btn"
                onClick={() => fetchAiForecast(true)}
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <>
            {loading && (
              <p className="forecast-section-description">
                <i className="fa-solid fa-spinner fa-spin"></i>
                {' '}Refreshing AI analysis...
              </p>
            )}

            {error && (
              <div className="forecast-error-state">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <h3>Refresh Failed</h3>
                <p>{error}</p>

                {retryAfter !== null && (
                  <p>
                    OpenAI indicated a retry delay of {retryAfter} seconds.
                  </p>
                )}

                {canGenerateForecast && (
                  <button
                    className="retry-btn"
                    onClick={() => fetchAiForecast(true)}
                    disabled={loading}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            <div className="forecast-numeric-section">
              <h3>30-Day Demand Forecast</h3>

              {generatedAt && (
                <p className="forecast-section-description">
                  Last generated: {new Date(generatedAt).toLocaleString()}
                </p>
              )}

              <p className="forecast-section-description">
                Estimated medicine usage based on recorded stock-outs
                during the previous 60 days.
              </p>

              {itemForecasts.length === 0 ? (
                <p>No inventory forecast data is available.</p>
              ) : (
                <div className="forecast-table-scroll">
                  <table className="forecast-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Current Stock</th>
                        <th>Estimated Demand (30 Days)</th>
                        <th>Days Until Stock-Out</th>
                        <th>Potential Shortfall</th>
                        <th>Risk Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {itemForecasts.map((item) => (
                        <tr key={item.item_id}>
                          <td>{item.name}</td>

                          <td>
                            {formatQuantity(item.current_stock)}
                          </td>

                          <td>
                            {formatQuantity(
                              item.estimated_demand_next_30_days
                            )}
                          </td>

                          <td>
                            {item.estimated_days_until_stockout == null
                              ? '—'
                              : `${formatQuantity(
                                item.estimated_days_until_stockout
                              )} days`}
                          </td>

                          <td>
                            {formatQuantity(
                              item.potential_shortfall_next_30_days
                            )}
                          </td>

                          <td>
                            <span
                              className={`forecast-risk-badge ${item.risk_status === 'No Stock'
                                ? 'no-stock'
                                : item.risk_status.includes('Shortage') ||
                                  item.risk_status.includes('Threshold')
                                  ? 'warning'
                                  : item.risk_status.includes('Insufficient')
                                    ? 'unknown'
                                    : 'normal'
                                }`}
                            >
                              {item.risk_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="forecast-backtest-heading">
                Preliminary Forecast Validation
              </h3>

              <p className="forecast-section-description">
                Compares a prediction based on the previous 60 days
                with the actual recorded stock-outs in the most recent
                30 days. Lower absolute error is better.
              </p>

              <div className="forecast-table-scroll">
                <table className="forecast-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Predicted Demand</th>
                      <th>Actual Demand</th>
                      <th>Absolute Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {itemForecasts.map((item) => (
                      <tr key={`${item.item_id}-backtest`}>
                        <td>{item.name}</td>
                        <td>
                          {formatQuantity(
                            item.backtest?.predicted_demand_last_30_days
                          )}
                        </td>
                        <td>
                          {formatQuantity(
                            item.backtest?.actual_demand_last_30_days
                          )}
                        </td>
                        <td>
                          {formatQuantity(
                            item.backtest?.absolute_error_units
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ai-reports-container">
              {parseAiReportToCards(aiReport)}
            </div>

          </>
        )}
      </div>
    </div >
  );
}