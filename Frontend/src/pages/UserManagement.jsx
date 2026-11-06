
// FILE: Frontend/src/pages/UserManagement.jsx
// PURPOSE: Administrator registration request approval and user management

import React, {
    useState,
    useEffect,
    useCallback
} from "react";

import "./UserManagement.css";

const API_URL = "http://localhost:3001/api/auth";

const AVAILABLE_ROLES = [
    "Administrator",
    "Clinic Manager",
    "Inventory Staff",
    "Veterinarian"
];

export default function UserManagement() {
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [approvedRole, setApprovedRole] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // ========================================================
    // FETCH USERS AND PENDING REQUESTS
    // ========================================================

    const fetchData = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            setError("");

            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Please log in again.");
            }

            const headers = {
                Authorization: `Bearer ${token}`
            };

            const [requestResponse, userResponse] = await Promise.all([
                fetch(`${API_URL}/registration-requests`, {
                    headers
                }),
                fetch(`${API_URL}/users`, {
                    headers
                })
            ]);

            const requestResult = await requestResponse.json();
            const userResult = await userResponse.json();

            if (!requestResponse.ok) {
                throw new Error(
                    requestResult.message ||
                    "Failed to retrieve registration requests."
                );
            }

            if (!userResponse.ok) {
                throw new Error(
                    userResult.message ||
                    "Failed to retrieve registered users."
                );
            }

            setRequests(requestResult.data || []);
            setUsers(userResult.data || []);

        } catch (err) {
            console.error("User Management error:", err);
            setError(err.message || "Unable to load user information.");

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load and automatic refresh
    useEffect(() => {
        fetchData(true);

        const interval = setInterval(() => {
            fetchData(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchData]);

    // ========================================================
    // DATE FORMAT
    // ========================================================

    const formatDate = (date) => {
        if (!date) return "N/A";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "N/A";
        }

        return parsedDate.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // ========================================================
    // OPEN APPROVAL MODAL
    // ========================================================

    const openApproveModal = (request) => {
        setSelectedRequest(request);

        setApprovedRole(
            request.requested_role?.role_name || ""
        );

        setError("");
        setSuccess("");
        setShowApproveModal(true);
    };

    // ========================================================
    // APPROVE REGISTRATION REQUEST
    // ========================================================

    const handleApprove = async () => {
        if (!selectedRequest || !approvedRole) {
            setError("Please select the final assigned role.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_URL}/registration-requests/${selectedRequest.request_id}/approve`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        approved_role: approvedRole
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to approve registration request."
                );
            }

            setShowApproveModal(false);
            setSelectedRequest(null);

            setSuccess(
                `${result.message || "Registration request approved successfully."}`
            );

            await fetchData(false);

        } catch (err) {
            console.error("Approval error:", err);
            setError(err.message);

        } finally {
            setSubmitting(false);
        }
    };

    // ========================================================
    // OPEN REJECTION MODAL
    // ========================================================

    const openRejectModal = (request) => {
        setSelectedRequest(request);
        setRejectionReason("");

        setError("");
        setSuccess("");
        setShowRejectModal(true);
    };

    // ========================================================
    // REJECT REGISTRATION REQUEST
    // ========================================================

    const handleReject = async () => {
        if (!selectedRequest) return;

        try {
            setSubmitting(true);
            setError("");

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_URL}/registration-requests/${selectedRequest.request_id}/reject`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        reason: rejectionReason
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to reject registration request."
                );
            }

            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectionReason("");

            setSuccess(
                result.message || "Registration request rejected successfully."
            );

            await fetchData(false);

        } catch (err) {
            console.error("Rejection error:", err);
            setError(err.message);

        } finally {
            setSubmitting(false);
        }
    };

    // ========================================================
    // CLOSE MODALS
    // ========================================================

    const closeApproveModal = () => {
        if (submitting) return;

        setShowApproveModal(false);
        setSelectedRequest(null);
        setApprovedRole("");
    };

    const closeRejectModal = () => {
        if (submitting) return;

        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason("");
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="user-management-page">

            {/* PAGE HEADER */}

            <div className="user-management-header">
                <div>
                    <h1>User Management</h1>
                    <p>
                        Review registration requests and manage clinic accounts.
                    </p>
                </div>

                <button
                    type="button"
                    className="um-refresh-btn"
                    onClick={() => fetchData(false)}
                    disabled={refreshing || loading}
                >
                    <i className={`fa-solid fa-rotate ${refreshing ? "um-spinning" : ""
                        }`}></i>
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* ERROR MESSAGE */}

            {error && (
                <div className="um-message error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                </div>
            )}

            {/* SUCCESS MESSAGE */}

            {success && (
                <div className="um-message success">
                    <i className="fa-solid fa-circle-check"></i>
                    {success}
                </div>
            )}

            {/* SUMMARY CARDS */}

            <div className="um-stats">

                <div className="um-stat-card">
                    <span className="um-stat-icon pending">
                        <i className="fa-solid fa-user-clock"></i>
                    </span>

                    <div>
                        <p>Pending Requests</p>
                        <h2>{requests.length}</h2>
                    </div>
                </div>

                <div className="um-stat-card">
                    <span className="um-stat-icon registered">
                        <i className="fa-solid fa-users"></i>
                    </span>

                    <div>
                        <p>Registered Users</p>
                        <h2>{users.length}</h2>
                    </div>
                </div>

            </div>

            {/* PENDING REGISTRATION REQUESTS */}

            <div className="um-card">

                <div className="um-card-header">
                    <div>
                        <h2>Pending Registration Requests</h2>
                        <p>
                            Review applicants before granting access to VetStock.
                        </p>
                    </div>

                    <span className="um-pending-count">
                        {requests.length} Pending
                    </span>
                </div>

                <div className="um-table-container">

                    <table className="um-table">

                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Email</th>
                                <th>Requested Role</th>
                                <th>Date Submitted</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="um-empty">
                                        Loading registration requests...
                                    </td>
                                </tr>

                            ) : requests.length > 0 ? (
                                requests.map(request => (
                                    <tr key={request.request_id}>

                                        <td>
                                            <strong>
                                                {request.first_name} {request.last_name}
                                            </strong>
                                        </td>

                                        <td>{request.email}</td>

                                        <td>
                                            <span className="um-role">
                                                {request.requested_role?.role_name || "Unknown"}
                                            </span>
                                        </td>

                                        <td>
                                            {formatDate(request.created_at)}
                                        </td>

                                        <td>

                                            <div className="um-request-actions">

                                                <button
                                                    type="button"
                                                    className="um-review-btn"
                                                    onClick={() => openApproveModal(request)}
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                    Review
                                                </button>

                                                <button
                                                    type="button"
                                                    className="um-accept-btn"
                                                    onClick={() => openApproveModal(request)}
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                    Accept
                                                </button>

                                                <button
                                                    type="button"
                                                    className="um-reject-btn"
                                                    onClick={() => openRejectModal(request)}
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                    Reject
                                                </button>

                                            </div>

                                        </td>

                                    </tr>
                                ))

                            ) : (
                                <tr>
                                    <td colSpan="5" className="um-empty">
                                        <i className="fa-solid fa-inbox"></i>
                                        <p>No pending registration requests.</p>
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>
            </div>

            {/* REGISTERED USERS */}

            <div className="um-card">

                <div className="um-card-header">
                    <div>
                        <h2>Registered Users</h2>
                        <p>
                            Accounts registered under your clinic.
                        </p>
                    </div>

                    <span className="um-user-count">
                        {users.length} Users
                    </span>
                </div>

                <div className="um-table-container">

                    <table className="um-table">

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Account Status</th>
                                <th>Date Created</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="um-empty">
                                        Loading registered users...
                                    </td>
                                </tr>

                            ) : users.length > 0 ? (
                                users.map(user => (
                                    <tr key={user.user_id}>

                                        <td>
                                            <strong>
                                                {`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unnamed User"}
                                            </strong>
                                        </td>

                                        <td>{user.email}</td>

                                        <td>
                                            <span className="um-role">
                                                {user.roles?.role_name || "Unknown"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={`um-status ${user.is_active ? "active" : "inactive"
                                                }`}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        <td>
                                            {formatDate(user.created_at)}
                                        </td>

                                    </tr>
                                ))

                            ) : (
                                <tr>
                                    <td colSpan="5" className="um-empty">
                                        No registered users found.
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>
            </div>

            {/* APPROVE CONFIRMATION MODAL */}

            {showApproveModal && selectedRequest && (
                <div className="um-modal-overlay">

                    <div className="um-confirm-modal">

                        <div className="um-confirm-icon">
                            <i className="fa-solid fa-user-check"></i>
                        </div>

                        <h2>Approve Registration Request?</h2>

                        <p className="um-confirm-description">
                            Review the applicant's information and confirm
                            the role they will receive.
                        </p>

                        <div className="um-confirm-details">

                            <div>
                                <span>Applicant Name</span>
                                <strong>
                                    {selectedRequest.first_name}{" "}
                                    {selectedRequest.last_name}
                                </strong>
                            </div>

                            <div>
                                <span>Email Address</span>
                                <strong>{selectedRequest.email}</strong>
                            </div>

                            <div>
                                <span>Requested Role</span>
                                <strong>
                                    {selectedRequest.requested_role?.role_name || "Unknown"}
                                </strong>
                            </div>

                            <div>
                                <span>Final Assigned Role</span>

                                <select
                                    value={approvedRole}
                                    onChange={e => setApprovedRole(e.target.value)}
                                    disabled={submitting}
                                >
                                    <option value="">Select Role</option>

                                    {AVAILABLE_ROLES.map(role => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        <p className="um-role-warning">
                            Approving this request will create the applicant's
                            VetStock account. The assigned role determines
                            their system permissions.
                        </p>

                        <div className="um-confirm-actions">

                            <button
                                type="button"
                                className="um-cancel-btn"
                                onClick={closeApproveModal}
                                disabled={submitting}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="um-confirm-btn"
                                onClick={handleApprove}
                                disabled={submitting || !approvedRole}
                            >
                                {submitting
                                    ? "Approving..."
                                    : "Confirm & Approve"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* REJECT CONFIRMATION MODAL */}

            {showRejectModal && selectedRequest && (
                <div className="um-modal-overlay">

                    <div className="um-confirm-modal">

                        <div className="um-confirm-icon reject">
                            <i className="fa-solid fa-user-xmark"></i>
                        </div>

                        <h2>Reject Registration Request?</h2>

                        <p className="um-confirm-description">
                            You are about to reject the registration request
                            from{" "}
                            <strong>
                                {selectedRequest.first_name}{" "}
                                {selectedRequest.last_name}
                            </strong>.
                        </p>

                        <div className="um-input-group">
                            <label>Rejection Reason (Optional)</label>

                            <textarea
                                rows="3"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Enter the reason for rejecting this request..."
                                disabled={submitting}
                            />
                        </div>

                        <div className="um-confirm-actions">

                            <button
                                type="button"
                                className="um-cancel-btn"
                                onClick={closeRejectModal}
                                disabled={submitting}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="um-reject-confirm-btn"
                                onClick={handleReject}
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Rejecting..."
                                    : "Confirm Rejection"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}
