
import React from "react";
import "./Modal.css";

export default function Modal({
    isOpen,
    title,
    message,
    children,
    onClose,
    onConfirm,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default"
}) {
    if (!isOpen) return null;

    return (
        <div className="vs-modal-overlay" onClick={onClose}>
            <div
                className="vs-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="vs-modal-title"
            >
                <div className="vs-modal-header">
                    <h2 id="vs-modal-title">{title}</h2>
                    <button
                        className="vs-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                <div className="vs-modal-body">
                    {message && <p>{message}</p>}
                    {children}
                </div>

                <div className="vs-modal-actions">
                    <button
                        className="vs-modal-cancel"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>

                    {onConfirm && (
                        <button
                            className={`vs-modal-confirm ${variant}`}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
