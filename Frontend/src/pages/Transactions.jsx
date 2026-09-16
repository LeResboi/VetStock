
function Transactions() {

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Stock Transactions</h2>

                    <p>
                        Monitor all stock movements
                    </p>
                </div>

                <button className="primary-btn">
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; New Transaction
                </button>

            </div>


            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search transactions..."
                />

                <select>
                    <option>All Transaction Types</option>
                    <option>Stock In</option>
                    <option>Stock Out</option>
                </select>

            </div>


            <div className="card table-card">

                <div className="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Date</th>
                                <th>Medicine</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Staff</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>TRX-001</td>
                                <td>Sep 02, 2026</td>
                                <td>Amoxicillin 500mg</td>
                                <td>
                                    <span className="stock-in">
                                        Stock In
                                    </span>
                                </td>
                                <td>50</td>
                                <td>Admin</td>
                            </tr>

                            <tr>
                                <td>TRX-002</td>
                                <td>Sep 02, 2026</td>
                                <td>Vitamin B Complex</td>
                                <td>
                                    <span className="stock-out">
                                        Stock Out
                                    </span>
                                </td>
                                <td>10</td>
                                <td>Dr. Santos</td>
                            </tr>

                            <tr>
                                <td>TRX-003</td>
                                <td>Sep 01, 2026</td>
                                <td>Rabies Vaccine</td>
                                <td>
                                    <span className="stock-in">
                                        Stock In
                                    </span>
                                </td>
                                <td>30</td>
                                <td>Admin</td>
                            </tr>

                            <tr>
                                <td>TRX-004</td>
                                <td>Sep 01, 2026</td>
                                <td>Paracetamol</td>
                                <td>
                                    <span className="stock-out">
                                        Stock Out
                                    </span>
                                </td>
                                <td>8</td>
                                <td>Dr. Reyes</td>
                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}


/* ================= HEALTH RECORDS ================= */

export default Transactions;
