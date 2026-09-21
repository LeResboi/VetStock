import { useEffect, useState } from "react";

function Patient() {

    const [patients, setPatients] = useState([]);

    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        patient_name: "",
        species: "",
        owner_name: "",
        owner_phone: "",
        owner_email: "",

        appointment_date: "",
        appointment_time: "",
        appointment_veterinarian_name: "",
        appointment_reason: "",
        appointment_status: "scheduled"
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    // ======================================================
    // GET ALL PATIENTS
    // ======================================================

    const loadPatients = async () => {

        try {

            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");

            if (!token) {
                setError("You are not logged in.");
                return;
            }

            const response = await fetch(
                "http://localhost:3001/api/patients",
                {
                    method: "GET",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = await response.json();

            console.log("GET patients:", result);

            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Failed to load patients."
                );

            }

            setPatients(result.data || []);

        } catch (error) {

            console.error("Load patients error:", error);

            setError(error.message);

        } finally {

            setLoading(false);

        }

    };


    // Load patients when page opens
    useEffect(() => {

        loadPatients();

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
    // ADD PATIENT
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


            // ==================================================
            // REQUIRED PATIENT FIELDS
            // ==================================================

            if (!formData.patient_name.trim()) {

                throw new Error(
                    "Patient name is required."
                );

            }


            if (!formData.species.trim()) {

                throw new Error(
                    "Species is required."
                );

            }


            if (!formData.owner_name.trim()) {

                throw new Error(
                    "Owner name is required."
                );

            }


            // ==================================================
            // SEND PATIENT + APPOINTMENT
            // ==================================================

            const response = await fetch(
                "http://localhost:3001/api/patients",
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        // Patient
                        patient_name: formData.patient_name,
                        species: formData.species,
                        owner_name: formData.owner_name,
                        owner_phone: formData.owner_phone || null,
                        owner_email: formData.owner_email || null,

                        // Appointment
                        appointment_date:
                            formData.appointment_date || null,

                        appointment_time:
                            formData.appointment_time || null,

                        appointment_veterinarian_name:
                            formData.appointment_veterinarian_name || null,

                        appointment_reason:
                            formData.appointment_reason || null,

                        appointment_status:
                            formData.appointment_status || "scheduled"

                    })
                }
            );


            const result = await response.json();

            console.log("POST patient:", result);


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    result.error ||
                    "Failed to add patient."
                );

            }


            // ==================================================
            // SUCCESS
            // ==================================================

            setSuccess(
                "Patient and appointment added successfully."
            );


            // ==================================================
            // CLEAR FORM
            // ==================================================

            setFormData({
                patient_name: "",
                species: "",
                owner_name: "",
                owner_phone: "",
                owner_email: "",
                appointment_date: "",
                appointment_time: "",
                appointment_veterinarian_name: "",
                appointment_reason: "",
                appointment_status: "scheduled"
            });


            // Close form
            setShowForm(false);


            // Reload patients
            await loadPatients();


        } catch (error) {

            console.error(
                "Add patient error:",
                error
            );

            setError(error.message);

        } finally {

            setSaving(false);

        }

    };


    return (

        <div className="page active-page">


            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="section-header">

                <div>

                    <h2>Patients</h2>

                    <p>
                        Manage veterinary patients and appointments
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

                    &nbsp; Add Patient

                </button>

            </div>


            {/* ==================================================
                SUCCESS MESSAGE
            ================================================== */}

            {success && (

                <div>
                    {success}
                </div>

            )}


            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}

            {error && (

                <div>
                    {error}
                </div>

            )}


            {/* ==================================================
                ADD PATIENT FORM
            ================================================== */}

            {showForm && (

                <div className="card">

                    <h3>Add Patient</h3>


                    <form onSubmit={handleSubmit}>


                        {/* ==================================================
                            PATIENT INFORMATION
                        ================================================== */}

                        <h4>Patient Information</h4>


                        {/* PATIENT NAME */}

                        <div>

                            <label>Patient Name</label>

                            <input
                                type="text"
                                name="patient_name"
                                value={formData.patient_name}
                                onChange={handleChange}
                                placeholder=""
                                required
                            />

                        </div>


                        {/* SPECIES */}

                        <div>

                            <label>Species</label>

                            <input
                                type="text"
                                name="species"
                                value={formData.species}
                                onChange={handleChange}
                                placeholder=""
                                required
                            />

                        </div>


                        {/* OWNER */}

                        <div>

                            <label>Name of the Owner</label>

                            <input
                                type="text"
                                name="owner_name"
                                value={formData.owner_name}
                                onChange={handleChange}
                                placeholder=""
                                required
                            />

                        </div>

                        {/* OWNER PHONE */}

                        <div>

                            <label>Owner Phone</label>

                            <input
                                type="tel"
                                name="owner_phone"
                                value={formData.owner_phone}
                                onChange={handleChange}
                                placeholder="Contact number"
                            />

                        </div>


                        {/* OWNER EMAIL */}

                        <div>

                            <label>Owner Email</label>

                            <input
                                type="email"
                                name="owner_email"
                                value={formData.owner_email}
                                onChange={handleChange}
                                placeholder="Email address"
                            />

                        </div>


                        {/* ==================================================
                            APPOINTMENT INFORMATION
                        ================================================== */}

                        <h4>Appointment Information</h4>


                        {/* APPOINTMENT DATE */}

                        <div>

                            <label>Appointment Date</label>

                            <input
                                type="date"
                                name="appointment_date"
                                value={formData.appointment_date}
                                onChange={handleChange}
                            />

                        </div>


                        {/* APPOINTMENT TIME */}

                        <div>

                            <label>Appointment Time</label>

                            <input
                                type="time"
                                name="appointment_time"
                                value={formData.appointment_time}
                                onChange={handleChange}
                            />

                        </div>


                        {/* VETERINARIAN NAME */}

                        <div>

                            <label>Veterinarian</label>

                            <input
                                type="text"
                                name="appointment_veterinarian_name"
                                value={formData.appointment_veterinarian_name}
                                onChange={handleChange}
                                placeholder="Enter veterinarian name"
                            />


                        </div>


                        {/* REASON */}

                        <div>

                            <label>Appointment Reason</label>

                            <input
                                type="text"
                                name="appointment_reason"
                                value={formData.appointment_reason}
                                onChange={handleChange}
                                placeholder="Reason for the appointment"
                            />

                        </div>


                        {/* STATUS */}

                        <div>

                            <label>Appointment Status</label>

                            <select
                                name="appointment_status"
                                value={formData.appointment_status}
                                onChange={handleChange}
                            >

                                <option value="scheduled">
                                    Scheduled
                                </option>

                                <option value="confirmed">
                                    Confirmed
                                </option>

                                <option value="completed">
                                    Completed
                                </option>

                                <option value="cancelled">
                                    Cancelled
                                </option>

                                <option value="no_show">
                                    No Show
                                </option>

                            </select>

                        </div>


                        {/* ==================================================
                            BUTTONS
                        ================================================== */}

                        <div>

                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={saving}
                            >

                                {saving
                                    ? ""
                                    : "Confirm"
                                }

                            </button>


                            <button
                                type="button"
                                onClick={() => {

                                    setShowForm(false);
                                    setError("");
                                    setSuccess("");

                                }}
                            >

                                Cancel

                            </button>

                        </div>

                    </form>

                </div>

            )}


            {/* ==================================================
                PATIENT TABLE
            ================================================== */}

            <div className="card table-card">

                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Patient ID</th>

                                <th>Patient</th>

                                <th>Species</th>

                                <th>Owner</th>

                                <th>Appointment</th>

                                <th>Time</th>

                                <th>Status</th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>

                                    <td colSpan="7">
                                        Loading patients...
                                    </td>

                                </tr>

                            ) : patients.length === 0 ? (

                                <tr>

                                    <td colSpan="7">
                                        No patients found.
                                    </td>

                                </tr>

                            ) : (

                                patients.map((patient) => (

                                    <tr
                                        key={patient.patient_id}
                                    >

                                        <td>
                                            MRN-{String(patient.mrn_number).padStart(5, "0")}-A
                                        </td>


                                        <td>
                                            {patient.patient_name}
                                        </td>


                                        <td>
                                            {patient.species || "-"}
                                        </td>


                                        <td>
                                            {patient.owner_name || "-"}
                                        </td>


                                        <td>
                                            {patient.appointment_date
                                                ? new Date(
                                                    `${patient.appointment_date}T00:00:00`
                                                ).toLocaleDateString()
                                                : "-"
                                            }
                                        </td>


                                        <td>
                                            {patient.appointment_time || "-"}
                                        </td>


                                        <td>
                                            {patient.appointment_status || "-"}
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


export default Patient;