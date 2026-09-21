import { useEffect, useState } from "react";

function Transactions() {

    // ================= TRANSACTIONS LOGIC =================

    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All Transaction Types");

    const [showModal, setShowModal] = useState(false);

    const [inventoryItems, setInventoryItems] = useState([]);

    const [formData, setFormData] = useState({
        item_id: "",
        transaction_type: "IN",
        quantity: "",
        reason: ""
    });

    // GET TRANSACTIONS FROM BACKEND
    async function loadTransactions() {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:3001/api/stock-transactions",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    "Failed to load transactions:",
                    data.message
                );
                return;
            }

            setTransactions(data.data);

        } catch (error) {
            console.error(
                "Load transactions error:",
                error
            );
        }
    }

    // LOAD TRANSACTIONS WHEN PAGE OPENS
    // ================= LOAD INVENTORY ITEMS =================

    async function loadInventoryItems() {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:3001/api/inventory",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    "Failed to load inventory items:",
                    data.message
                );
                return;
            }

            setInventoryItems(data.data);

        } catch (error) {
            console.error(
                "Load inventory items error:",
                error
            );
        }
    }


    // ================= CREATE TRANSACTION =================

    async function handleCreateTransaction(event) {
        event.preventDefault();

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:3001/api/stock-transactions",
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
                alert(
                    data.message ||
                    "Failed to record transaction."
                );
                return;
            }

            alert("Transaction recorded successfully.");

            setShowModal(false);

            setFormData({
                item_id: "",
                transaction_type: "IN",
                quantity: "",
                reason: ""
            });

            await loadTransactions();

        } catch (error) {
            console.error(
                "Create transaction error:",
                error
            );

            alert("Unable to connect to the server.");
        }
    }


    // LOAD TRANSACTIONS WHEN PAGE OPENS

    useEffect(() => {
        loadTransactions();
        loadInventoryItems();
    }, []);

    // SEARCH AND FILTER
    const filteredTransactions = transactions.filter(
        (transaction) => {

            const medicineName =
                transaction.inventory_items?.item_name || "";

            const staffName = `
                ${transaction.users?.first_name || ""}
                ${transaction.users?.last_name || ""}
            `;

            const matchesSearch =
                `${transaction.transaction_id}
                ${medicineName}
                ${staffName}
                ${transaction.transaction_type}`
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesType =
                typeFilter === "All Transaction Types" ||
                (typeFilter === "Stock In" &&
                    transaction.transaction_type === "IN") ||
                (typeFilter === "Stock Out" &&
                    transaction.transaction_type === "OUT");

            return matchesSearch && matchesType;
        }
    );

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Stock Transactions</h2>

                    <p>
                        Monitor all stock movements
                    </p>
                </div>

                <button
                    className="primary-btn"
                    onClick={() => setShowModal(true)}
                >
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; New Transaction
                </button>
            </div>

            {showModal && (
                <div className="modal-overlay">

                    <div className="inventory-modal">

                        <div className="modal-header">

                            <h2>New Transaction</h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>

                        <form onSubmit={handleCreateTransaction}>

                            <div className="modal-body">

                                <label>Medicine</label>

                                <select
                                    value={formData.item_id}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            item_id: event.target.value
                                        })
                                    }
                                    required
                                >
                                    <option value="">
                                        Select medicine
                                    </option>

                                    {inventoryItems.map((item) => (
                                        <option
                                            key={item.item_id}
                                            value={item.item_id}
                                        >
                                            {item.item_name}
                                        </option>
                                    ))}
                                </select>


                                <label>Transaction Type</label>

                                <select
                                    value={formData.transaction_type}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            transaction_type:
                                                event.target.value
                                        })
                                    }
                                    required
                                >
                                    <option value="IN">
                                        Stock In
                                    </option>

                                    <option value="OUT">
                                        Stock Out
                                    </option>
                                </select>


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
                                    min="1"
                                    required
                                />


                                <label>Reason</label>

                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            reason: event.target.value
                                        })
                                    }
                                    placeholder="e.g. New delivery, medicine used"
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
                                    <i className="fa-solid fa-plus"></i>
                                    &nbsp; Record Transaction
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                />

                <select
                    value={typeFilter}
                    onChange={(event) =>
                        setTypeFilter(event.target.value)
                    }
                >
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

                            {filteredTransactions.map((transaction) => (

                                <tr key={transaction.transaction_id}>

                                    <td>
                                         {transaction.transaction_code}
                                    </td>

                                    <td>
                                        {new Date(
                                            transaction.created_at
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "2-digit",
                                            year: "numeric"
                                        })}
                                    </td>

                                    <td>
                                        {transaction.inventory_items?.item_name}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                transaction.transaction_type === "IN"
                                                    ? "stock-in"
                                                    : "stock-out"
                                            }
                                        >
                                            {transaction.transaction_type === "IN"
                                                ? "Stock In"
                                                : "Stock Out"}
                                        </span>

                                    </td>

                                    <td>
                                        {transaction.quantity}
                                    </td>

                                    <td>
                                        {transaction.users?.first_name}{" "}
                                        {transaction.users?.last_name}
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


/* ================= HEALTH RECORDS ================= */

export default Transactions;
