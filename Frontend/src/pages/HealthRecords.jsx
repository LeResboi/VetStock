

function HealthRecords() {

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Health Records</h2>

                    <p>
                        Manage veterinary health records
                    </p>
                </div>

                <button className="primary-btn">
                    <i className="fa-solid fa-plus"></i>
                    &nbsp; Add Record
                </button>

            </div>


            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search patient or owner..."
                />

            </div>


            <div className="card table-card">

                <div className="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Record ID</th>
                                <th>Patient</th>
                                <th>Species</th>
                                <th>Owner</th>
                                <th>Diagnosis</th>
                                <th>Veterinarian</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>REC-001</td>
                                <td>Max</td>
                                <td>Dog</td>
                                <td>Juan Dela Cruz</td>
                                <td>Skin Allergy</td>
                                <td>Dr. Santos</td>
                            </tr>

                            <tr>
                                <td>REC-002</td>
                                <td>Luna</td>
                                <td>Cat</td>
                                <td>Maria Reyes</td>
                                <td>Fever</td>
                                <td>Dr. Reyes</td>
                            </tr>

                            <tr>
                                <td>REC-003</td>
                                <td>Buddy</td>
                                <td>Dog</td>
                                <td>Pedro Garcia</td>
                                <td>Vaccination</td>
                                <td>Dr. Santos</td>
                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}


/* ================= FORECAST ================= */

export default HealthRecords;
