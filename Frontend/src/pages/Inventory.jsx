import { useState } from "react";

function Inventory() {

    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        item_name: "",
        category: "",
        unit_of_measure: "",
        unit_price: "",
        cost_price: "",
        quantity: "",
        min_stock_level: "",
        max_stock_level: "",
        reorder_point: "",
        expiration_date: "",
        storage_conditions: ""
    });

    async function handleAddInventory(event) {
        event.preventDefault();

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/inventory",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to add inventory.");
                return;
            }

            alert("Inventory item added successfully.");

            setShowModal(false);

            setFormData({
                item_name: "",
                category: "",
                unit_of_measure: "",
                unit_price: "",
                cost_price: "",
                quantity: "",
                min_stock_level: "",
                max_stock_level: "",
                reorder_point: "",
                expiration_date: "",
                storage_conditions: ""
            });

        } catch (error) {
            console.error("Add inventory error:", error);
            alert("Unable to connect to the server.");
        }
    }
    
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

                <button
                    className="primary-btn"
                    onClick={() => setShowModal(true)}
                >
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; Add Inventory
                </button>

            </div>
            {showModal && (
                <div className="modal-overlay">

                    <div className="inventory-modal">

                        <div className="modal-header">

                            <h2>Add Inventory</h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>


                        <form onSubmit={handleAddInventory}>

                            <div className="modal-body">

                                <label>Medicine Name</label>
                                <input
                                    type="text"
                                    value={formData.item_name}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            item_name: event.target.value
                                        })
                                    }
                                    placeholder="Enter medicine name"
                                    required
                                />


                                <label>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            category: event.target.value
                                        })
                                    }
                                    required
                                >
                                    <option value="">Select category</option>
                                    <option value="Medicine">Medicine</option>
                                    <option value="Antibiotic">Antibiotic</option>
                                    <option value="Vaccine">Vaccine</option>
                                    <option value="Supplement">Supplement</option>
                                </select>


                                <label>Unit of Measure</label>
                                <input
                                    type="text"
                                    value={formData.unit_of_measure}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            unit_of_measure: event.target.value
                                        })
                                    }
                                    placeholder="e.g. tablet, bottle"
                                />


                                <label>Unit Price</label>
                                <input
                                    type="number"
                                    value={formData.unit_price}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            unit_price: event.target.value
                                        })
                                    }
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />


                                <label>Cost Price</label>
                                <input
                                    type="number"
                                    value={formData.cost_price}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            cost_price: event.target.value
                                        })
                                    }
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />


                                <label>Quantity</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            quantity: event.target.value
                                        })
                                    }
                                    placeholder="Enter quantity"
                                    min="0"
                                    required
                                />


                                <label>Minimum Stock Level</label>
                                <input
                                    type="number"
                                    value={formData.min_stock_level}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            min_stock_level: event.target.value
                                        })
                                    }
                                    placeholder="Enter minimum stock"
                                    min="0"
                                />


                                <label>Maximum Stock Level</label>
                                <input
                                    type="number"
                                    value={formData.max_stock_level}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            max_stock_level: event.target.value
                                        })
                                    }
                                    placeholder="Enter maximum stock"
                                    min="0"
                                />


                                <label>Reorder Point</label>
                                <input
                                    type="number"
                                    value={formData.reorder_point}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            reorder_point: event.target.value
                                        })
                                    }
                                    placeholder="Enter reorder point"
                                    min="0"
                                />


                                <label>Expiration Date</label>
                                <input
                                    type="date"
                                    value={formData.expiration_date}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            expiration_date: event.target.value
                                        })
                                    }
                                />


                                <label>Storage Conditions</label>
                                <input
                                    type="text"
                                    value={formData.storage_conditions}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            storage_conditions: event.target.value
                                        })
                                    }
                                    placeholder="e.g. Store in a cool, dry place"
                                />

                            </div>


                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-btn"
                                >
                                    Add Item
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


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
                                            className={`badge ${medicine[6] === "Good"
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
