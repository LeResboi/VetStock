import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001/api/health-records";

function HealthRecords() {

    const [records, setRecords] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        patient_id: "",
        diagnosis: "",
        symptoms: "",
        treatment: "",
        notes: ""
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");



    // ======================================================
    // GET HEALTH RECORDS
    // ======================================================

    const loadRecords = async () => {

        try {

            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");

            if (!token) {
                setError("You are not logged in.");
                return;
            }

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            console.log("GET health records:", result);

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to load health records."
                );
            }

            setRecords(result.data || []);

        } catch (error) {

            console.error("Health records error:", error);

            setError(error.message);

        } finally {

            setLoading(false);

        }
    };



    // Load records when page opens
    useEffect(() => {
        loadRecords();
    }, []);



    // ======================================================
    // HANDLE INPUT
    // ======================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value
        });

    };



    // ======================================================
    // ADD HEALTH RECORD
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {

            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("You are not logged in.");
            }

            if (!formData.patient_id.trim()) {
                throw new Error("Patient ID is required.");
            }


            const response = await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    patient_id: formData.patient_id,
                    diagnosis: formData.diagnosis,
                    symptoms: formData.symptoms,
                    treatment: formData.treatment,
                    notes: formData.notes
                })

            });


            const result = await response.json();

            console.log("POST health record:", result);


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    result.error ||
                    "Failed to create health record."
                );

            }


            // Successful insert
            setSuccess("Health record added successfully.");


            // Clear form
            setFormData({
                patient_id: "",
                diagnosis: "",
                symptoms: "",
                treatment: "",
                notes: ""
            });


            // Close form
            setShowForm(false);


            // Reload records from Supabase
            await loadRecords();


        } catch (error) {

            console.error("Add health record error:", error);

            setError(error.message);

        } finally {

            setSaving(false);

        }

    };



    return (

        <div className="page active-page">

            <div className="section-header">

                <div>

                    <h2>Health Records</h2>

                    <p>
                        Manage veterinary health records
                    </p>

                </div>


                <button
                    className="primary-btn"
                    onClick={() => {
                        setShowForm(true);
                        setError("");
                        setSuccess("");
                    }}
                >

                    <i className="fa-solid fa-plus"></i>

                    &nbsp; Add Record

                </button>

            </div>



            {/* SUCCESS MESSAGE */}

            {success && (
                <div>
                    {success}
                </div>
            )}



            {/* ERROR MESSAGE */}

            {error && (
                <div>
                    {error}
                </div>
            )}



            {/* ======================================================
                ADD HEALTH RECORD FORM
            ====================================================== */}

            {showForm && (

                <div className="card">

                    <h3>Add Health Record</h3>


                    <form onSubmit={handleSubmit}>

                        <div>

                            <label>Patient ID</label>

                            <input
                                type="text"
                                name="patient_id"
                                value={formData.patient_id}
                                onChange={handleChange}
                                placeholder="Enter patient ID"
                                required
                            />

                        </div>


                        <div>

                            <label>Diagnosis</label>

                            <input
                                type="text"
                                name="diagnosis"
                                value={formData.diagnosis}
                                onChange={handleChange}
                                placeholder="Enter diagnosis"
                            />

                        </div>


                        <div>

                            <label>Symptoms</label>

                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleChange}
                                placeholder="Enter symptoms"
                            />

                        </div>


                        <div>

                            <label>Treatment</label>

                            <textarea
                                name="treatment"
                                value={formData.treatment}
                                onChange={handleChange}
                                placeholder="Enter treatment"
                            />

                        </div>


                        <div>

                            <label>Notes</label>

                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Enter notes"
                            />

                        </div>


                        <div>

                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={saving}
                            >

                                {saving
                                    ? "Saving..."
                                    : "Save Record"
                                }

                            </button>


                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                            >

                                Cancel

                            </button>

                        </div>

                    </form>

                </div>

            )}



            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search patient or owner..."
                />

            </div>



            {/* ======================================================
                HEALTH RECORDS TABLE
            ====================================================== */}

            <div className="card table-card">

                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Record ID</th>

                                <th>Patient ID</th>

                                <th>Diagnosis</th>

                                <th>Symptoms</th>

                                <th>Treatment</th>

                                <th>Record Date</th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>

                                    <td colSpan="6">
                                        Loading health records...
                                    </td>

                                </tr>

                            ) : records.length === 0 ? (

                                <tr>

                                    <td colSpan="6">
                                        No health records found.
                                    </td>

                                </tr>

                            ) : (

                                records.map((record) => (

                                    <tr key={record.record_id}>

                                        <td>
                                            HR-{record.record_id?.slice(0, 8).toUpperCase()}-A
                                        </td>

                                        <td>
                                            MRN-{String(record.mrn_number).padStart(5, "0")}-A
                                        </td>

                                        <td>
                                            {record.diagnosis || "-"}
                                        </td>

                                        <td>
                                            {record.symptoms || "-"}
                                        </td>

                                        <td>
                                            {record.treatment_notes || "-"}
                                        </td>

                                        <td>
                                            {record.record_date
                                                ? new Date(
                                                    record.record_date
                                                ).toLocaleString()
                                                : "-"
                                            }
                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );
}


export default HealthRecords;