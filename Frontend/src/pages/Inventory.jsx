import { useState } from "react";

function Inventory() {

    const [search, setSearch] = useState("");

    const medicines = [
        ["MED-001", "Amoxicillin 500mg", "Antibiotic", "50", "20", "2027-05-10", "Good"],
        ["MED-002", "Rabies Vaccine", "Vaccine", "30", "10", "2027-01-15", "Good"],
        ["MED-003", "Vitamin B Complex", "Supplement", "18", "20", "2026-12-05", "Low Stock"],
        ["MED-004", "Paracetamol", "Medicine", "8", "15", "2028-03-20", "Low Stock"],
        ["MED-005", "Deworming Tablet", "Medicine", "75", "25", "2027-08-12", "Good"],
    ];

    const filteredMedicines = medicines.filter((medicine) =>
        medicine.join(" ").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Inventory</h2>
                    <p>
                        Manage medicines and veterinary supplies
                    </p>
                </div>

                <button className="primary-btn">
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; Add Inventory
                </button>

            </div>


            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search inventory..."
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                />

                <select>
                    <option>All Categories</option>
                    <option>Medicine</option>
                    <option>Antibiotic</option>
                    <option>Vaccine</option>
                    <option>Supplement</option>
                </select>

                <select>
                    <option>All Status</option>
                    <option>Good</option>
                    <option>Low Stock</option>
                </select>

            </div>


            <div className="card table-card">

                <div className="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Item ID</th>
                                <th>Medicine</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Minimum</th>
                                <th>Expiration</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {filteredMedicines.map((medicine) => (

                                <tr key={medicine[0]}>

                                    <td>{medicine[0]}</td>

                                    <td>
                                        <strong>{medicine[1]}</strong>
                                    </td>

                                    <td>{medicine[2]}</td>

                                    <td>{medicine[3]}</td>

                                    <td>{medicine[4]}</td>

                                    <td>{medicine[5]}</td>

                                    <td>

                                        <span
                                            className={`badge ${
                                                medicine[6] === "Good"
                                                    ? "success-badge"
                                                    : "warning-badge"
                                            }`}
                                        >
                                            {medicine[6]}
                                        </span>

                                    </td>

                                    <td>

                                        <button className="action-btn">
                                            <i className="fa-solid fa-pen"></i>
                                        </button>

                                        <button className="action-btn">
                                            <i className="fa-solid fa-trash"></i>
                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}


/* ================= TRANSACTIONS ================= */

export default Inventory;
