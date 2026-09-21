import { useEffect, useState } from "react";

function Inventory() {

    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [statusFilter, setStatusFilter] = useState("All Status");
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
                "http://localhost:3001/api/inventory",
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

            await loadInventory();

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

    async function loadInventory() {
        try {
            const token = localStorage.getItem("token");

            console.log("Token:", token);

            const response = await fetch(
                "http://localhost:3001/api/inventory",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            console.log("GET inventory status:", response.status);

            const data = await response.json();

            console.log("GET inventory response:", data);

            if (!response.ok) {
                console.error(
                    "Failed to load inventory:",
                    data.message
                );
                return;
            }

            console.log("Inventory records:", data.data);

            setMedicines(data.data);

        } catch (error) {
            console.error(
                "Load inventory error:",
                error
            );
        }
    }

    useEffect(() => {
        loadInventory();
    }, []);

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

                <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                >
                    <option>All Categories</option>
                    <option>Medicine</option>
                    <option>Antibiotic</option>
                    <option>Vaccine</option>
                    <option>Supplement</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(event.target.value)
                    }
                >
                    <option>All Status</option>
                    <option>Good</option>
                    <option>Low Stock</option>
                    <option>Critical</option>
                    <option>Expiring Soon</option>
                    <option>Expired</option>
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


                            {medicines
                                .filter((medicine) => {

                                    // Search filter
                                    const matchesSearch = Object.values(medicine)
                                        .join(" ")
                                        .toLowerCase()
                                        .includes(search.toLowerCase());

                                    // Category filter
                                    const matchesCategory =
                                        categoryFilter === "All Categories" ||
                                        medicine.category === categoryFilter;

                                    // Get current quantity
                                    const quantity =
                                        medicine.inventory_batches?.[0]?.quantity ?? 0;

                                    // Get minimum stock
                                    const minimum =
                                        medicine.min_stock_level ?? 0;

                                    // Get expiration date
                                    const expirationDate =
                                        medicine.inventory_batches?.[0]?.expiration_date;

                                    // Get today's date
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    // Determine status
                                    let status = "Good";

                                    if (expirationDate) {

                                        const expiration =
                                            new Date(`${expirationDate}T00:00:00`);

                                        // Already expired
                                        if (expiration <= today) {
                                            status = "Expired";

                                            // Expires within 30 days
                                        } else {

                                            const daysUntilExpiration =
                                                Math.ceil(
                                                    (
                                                        expiration - today
                                                    ) /
                                                    (1000 * 60 * 60 * 24)
                                                );

                                            if (daysUntilExpiration <= 30) {
                                                status = "Expiring Soon";
                                            }
                                        }
                                    }

                                    // Stock conditions
                                    if (status !== "Expired" && quantity === 0) {
                                        status = "Critical";
                                    }

                                    if (
                                        status !== "Expired" &&
                                        status !== "Critical" &&
                                        quantity <= minimum
                                    ) {
                                        status = "Low Stock";
                                    }

                                    // Status filter
                                    const matchesStatus =
                                        statusFilter === "All Status" ||
                                        status === statusFilter;

                                    return (
                                        matchesSearch &&
                                        matchesCategory &&
                                        matchesStatus
                                    );
                                })
                                .map((medicine) => (

                                    <tr key={medicine.item_id}>

                                        <td>
                                            {medicine.item_code}
                                        </td>

                                        <td>
                                            <strong>
                                                {medicine.item_name}
                                            </strong>
                                        </td>

                                        <td>
                                            {medicine.category || "-"}
                                        </td>

                                        <td>
                                            {medicine.inventory_batches?.[0]?.quantity ?? 0}
                                        </td>

                                        <td>
                                            {medicine.min_stock_level}
                                        </td>

                                        <td>
                                            {medicine.inventory_batches?.[0]?.expiration_date || "-"}
                                        </td>

                                        <td>

                                            {(() => {

                                                const quantity =
                                                    medicine.inventory_batches?.[0]?.quantity ?? 0;

                                                const minimum =
                                                    medicine.min_stock_level ?? 0;

                                                const expirationDate =
                                                    medicine.inventory_batches?.[0]?.expiration_date;

                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);

                                                let status = "Good";

                                                if (expirationDate) {

                                                    const expiration =
                                                        new Date(`${expirationDate}T00:00:00`);

                                                    if (expiration <= today) {

                                                        status = "Expired";

                                                    } else {

                                                        const daysUntilExpiration =
                                                            Math.ceil(
                                                                (
                                                                    expiration - today
                                                                ) /
                                                                (1000 * 60 * 60 * 24)
                                                            );

                                                        if (daysUntilExpiration <= 30) {
                                                            status = "Expiring Soon";
                                                        }
                                                    }
                                                }

                                                if (
                                                    status !== "Expired" &&
                                                    quantity === 0
                                                ) {
                                                    status = "Critical";
                                                }

                                                if (
                                                    status !== "Expired" &&
                                                    status !== "Critical" &&
                                                    quantity <= minimum
                                                ) {
                                                    status = "Low Stock";
                                                }

                                                let badgeClass = "success-badge";

                                                if (status === "Expired") {
                                                    badgeClass = "danger-badge";
                                                } else if (status === "Critical") {
                                                    badgeClass = "danger-badge";
                                                } else if (
                                                    status === "Low Stock" ||
                                                    status === "Expiring Soon"
                                                ) {
                                                    badgeClass = "warning-badge";
                                                }

                                                return (
                                                    <span className={`badge ${badgeClass}`}>
                                                        {status}
                                                    </span>
                                                );

                                            })()}

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
