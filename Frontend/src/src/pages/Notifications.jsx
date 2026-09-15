import { useState } from "react";

function Notifications() {

    return (
        <div className="page active-page">

            <div className="section-header">

                <div>
                    <h2>Notifications</h2>

                    <p>
                        System alerts and notifications
                    </p>
                </div>

            </div>


            <div className="notification-list">

                <div className="notification danger">

                    <i className="fa-solid fa-circle-exclamation"></i>

                    <div>

                        <strong>
                            Low Stock Alert
                        </strong>

                        <p>
                            Amoxicillin 500mg is below
                            the minimum stock level.
                        </p>

                        <small>
                            Today
                        </small>

                    </div>

                </div>


                <div className="notification warning">

                    <i className="fa-solid fa-triangle-exclamation"></i>

                    <div>

                        <strong>
                            Expiration Warning
                        </strong>

                        <p>
                            Several medicine batches
                            are approaching expiration.
                        </p>

                        <small>
                            Today
                        </small>

                    </div>

                </div>


                <div className="notification">

                    <i className="fa-solid fa-circle-info"></i>

                    <div>

                        <strong>
                            Stock Update
                        </strong>

                        <p>
                            Rabies Vaccine stock has
                            been successfully added.
                        </p>

                        <small>
                            Yesterday
                        </small>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Notifications;
