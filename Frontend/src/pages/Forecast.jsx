
function Forecast() {

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Demand Forecast</h2>

                    <p>
                        Predict future medicine demand
                    </p>
                </div>

                <button className="primary-btn">
                    <i className="fa-solid fa-rotate"></i>
                    &nbsp; Generate Forecast
                </button>

            </div>


            <div className="forecast-card">

                <div className="forecast-placeholder">

                    <i className="fa-solid fa-chart-column"></i>

                    <h3>
                        Demand Forecast
                    </h3>

                    <p>
                        Forecast results will appear here.
                    </p>

                </div>

            </div>

        </div>
    );
}


/* ================= REPORTS ================= */

export default Forecast;
