
import React, { useEffect } from "react";
import "./Notification.css";

export default function Notification({
    message,
    type = "success",
    onClose,
    duration = 3500
}) {
    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    return (
        <div className={`vs-notification ${type}`}>
            <span className="vs-notification-icon">
                {type === "success" ? "✓" : type === "error" ? "!" : "i"}
            </span>

            <span className="vs-notification-message">
                {message}
            </span>

            <button onClick={onClose} aria-label="Close notification">
                &times;
            </button>
        </div>
    );
}
