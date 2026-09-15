import { useState } from "react";

function Dashboard({ showPage }) {

    return (
        <div className="page active-page">

            <div className="welcome">

                <div>
                    <h2>Good day, Admin!</h2>

                    <p>
                        Here's what's happening with your
                        veterinary inventory today.
                    </p>
                </div>

                <button
                    className="primary-btn"
                    onClick={() => showPage("inventory")}
                >
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; Add Inventory
                </button>

            </div>


            <div className="stats-grid">

                <div className="stat-card">

                    <div className="stat-icon blue">
                        <i className="fa-solid fa-boxes-stacked"></i>
                    </div>

                    <div>
                        <span>Total Items</span>
                        <h2>248</h2>
                        <small>+12 this month</small>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon green">
                        <i className="fa-solid fa-box-open"></i>
                    </div>

                    <div>
                        <span>Stock In</span>
                        <h2>86</h2>
                        <small>This month</small>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon yellow">
                        <i className="fa-solid fa-arrow-up-from-bracket"></i>
                    </div>

                    <div>
                        <span>Stock Out</span>
                        <h2>54</h2>
                        <small>This month</small>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon red">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>
                        <span>Low Stock</span>
                        <h2>12</h2>
                        <small>Needs attention</small>
                    </div>

                </div>

            </div>


            <div className="dashboard-grid">

                {/* STOCK LEVEL */}
                <div className="card">

                    <div className="card-header">

                        <div>
                            <h3>Stock Level Overview</h3>

                            <p>
                                Current inventory status
                            </p>
                        </div>

                        <button
                            className="view-btn"
                            onClick={() =>
                                showPage("inventory")
                            }
                        >
                            View Inventory
                        </button>

                    </div>


                    <div className="progress-item">

                        <div>
                            <span>Medicines</span>
                            <strong>85%</strong>
                        </div>

                        <div className="progress">
                            <div
                                className="progress-bar green-bar"
                                style={{ width: "85%" }}
                            ></div>
                        </div>

                    </div>


                    <div className="progress-item">

                        <div>
                            <span>Vaccines</span>
                            <strong>65%</strong>
                        </div>

                        <div className="progress">
                            <div
                                className="progress-bar yellow-bar"
                                style={{ width: "65%" }}
                            ></div>
                        </div>

                    </div>


                    <div className="progress-item">

                        <div>
                            <span>Supplies</span>
                            <strong>42%</strong>
                        </div>

                        <div className="progress">
                            <div
                                className="progress-bar red-bar"
                                style={{ width: "42%" }}
                            ></div>
                        </div>

                    </div>

                </div>


                {/* ALERTS */}
                <div className="card">

                    <div className="card-header">

                        <div>
                            <h3>Inventory Alerts</h3>

                            <p>
                                Items that need attention
                            </p>
                        </div>

                        <button
                            className="view-btn"
                            onClick={() =>
                                showPage("notifications")
                            }
                        >
                            View All
                        </button>

                    </div>


                    <div className="alert-item danger">

                        <i className="fa-solid fa-circle-exclamation"></i>

                        <div>
                            <strong>Low Stock</strong>

                            <p>
                                Amoxicillin 500mg is below
                                minimum stock level.
                            </p>
                        </div>

                    </div>


                    <div className="alert-item warning">

                        <i className="fa-solid fa-triangle-exclamation"></i>

                        <div>
                            <strong>Expiring Soon</strong>

                            <p>
                                5 medicine batches will
                                expire soon.
                            </p>
                        </div>

                    </div>


                    <div className="alert-item info">

                        <i className="fa-solid fa-circle-info"></i>

                        <div>
                            <strong>Stock Update</strong>

                            <p>
                                New vaccine stock was
                                recently added.
                            </p>
                        </div>

                    </div>

                </div>

            </div>


            {/* RECENT TRANSACTIONS */}
            <div className="card table-card">

                <div className="card-header">

                    <div>
                        <h3>Recent Stock Transactions</h3>

                        <p>
                            Latest inventory movements
                        </p>
                    </div>

                    <button
                        className="view-btn"
                        onClick={() =>
                            showPage("transactions")
                        }
                    >
                        View All
                    </button>

                </div>


                <div className="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Medicine</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Staff</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
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


/* ================= INVENTORY ================= */

export default Dashboard;
