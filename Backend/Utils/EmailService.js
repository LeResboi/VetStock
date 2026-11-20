import "dotenv/config";
import nodemailer from "nodemailer";

// ============================================================
// VETSTOCK EMAIL SERVICE
// PURPOSE: Send password reset and registration emails
// ============================================================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// ============================================================
// ESCAPE HTML CONTENT
// Prevent user-provided text from being interpreted as HTML
// ============================================================

const escapeHtml = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
};

// ============================================================
// SEND PASSWORD RESET EMAIL
// ============================================================

export const sendPasswordResetEmail = async (email, resetLink) => {
    const mailOptions = {
        from: `"VetStock System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "VetStock - Password Reset Request",

        text: `
Hello,

We received a request to reset your VetStock password.

Click the link below to create a new password:

${resetLink}

This link expires in 15 minutes and can only be used once.

If you did not request a password reset, you can ignore this email.

VetStock System
        `,

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                <h2 style="color: #00796b;">VetStock Password Reset</h2>
                <p>Hello,</p>
                <p>We received a request to reset your VetStock password.</p>
                <p>Click the button below to create a new password:</p>
                <a href="${resetLink}"
                   style="display:inline-block;background-color:#00796b;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;">
                    Reset Password
                </a>
                <p>This link expires in <strong>15 minutes</strong> and can only be used once.</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>
                <hr />
                <p style="color:gray;font-size:12px;">
                    VetStock Veterinary Inventory Management System
                </p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

// ============================================================
// SEND REGISTRATION REJECTION EMAIL
// ============================================================

export const sendRegistrationRejectionEmail = async (
    email,
    firstName,
    rejectionReason
) => {
    const safeName = escapeHtml(firstName);
    const safeReason = escapeHtml(
        rejectionReason || "No specific reason was provided."
    );

    const mailOptions = {
        from: `"VetStock System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "VetStock - Registration Request Update",

        text: `
Hello ${firstName},

Unfortunately, your VetStock registration request has been rejected.

Reason for rejection:
${rejectionReason || "No specific reason was provided."}

If you believe this decision was made in error, please contact your clinic administrator.

Thank you,
VetStock Administration
        `,

        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;">

                <h2 style="color:#00796b;">VetStock</h2>

                <h3>Registration Request Update</h3>

                <p>Hello ${safeName},</p>

                <p>
                    Unfortunately, your VetStock registration request
                    has been rejected.
                </p>

                <div style="
                    background-color:#fff3f3;
                    border-left:4px solid #dc3545;
                    padding:15px;
                    margin:20px 0;
                    border-radius:4px;
                ">
                    <strong style="color:#dc3545;">
                        Reason for rejection:
                    </strong>

                    <p style="margin-bottom:0;white-space:pre-wrap;">
                        ${safeReason}
                    </p>
                </div>

                <p>
                    If you believe this decision was made in error,
                    please contact your clinic administrator.
                </p>

                <hr />

                <p style="color:gray;font-size:12px;">
                    VetStock Veterinary Inventory Management System
                </p>

            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

// ============================================================
// SEND REGISTRATION APPROVAL EMAIL
// ============================================================

export const sendRegistrationApprovalEmail = async (
    email,
    firstName,
    assignedRole
) => {
    const safeName = escapeHtml(firstName);
    const safeRole = escapeHtml(assignedRole);
    const loginLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`;

    const mailOptions = {
        from: `"VetStock System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "VetStock - Registration Request Approved!",

        text: `
Hello ${firstName},

Good news! Your VetStock registration request has been approved by the administrator.

Your assigned role: ${assignedRole}

You can now log in to your account using the link below:
${loginLink}

Welcome to VetStock!

VetStock Administration
        `,

        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;">

                <h2 style="color:#00796b;">VetStock</h2>

                <h3>Registration Request Approved!</h3>

                <p>Hello ${safeName},</p>

                <p>
                    Good news! Your VetStock registration request has been approved by the administrator.
                </p>

                <div style="
                    background-color:#e6f4ea;
                    border-left:4px solid #137333;
                    padding:15px;
                    margin:20px 0;
                    border-radius:4px;
                ">
                    <strong style="color:#137333;">
                        Assigned Role:
                    </strong>
                    <p style="margin-bottom:0;">
                        ${safeRole}
                    </p>
                </div>

                <p>
                    You can now log in and start using your account:
                </p>

                <a href="${loginLink}"
                   style="display:inline-block;background-color:#00796b;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 0;">
                    Log In Now
                </a>

                <hr style="margin-top:20px;" />

                <p style="color:gray;font-size:12px;">
                    VetStock Veterinary Inventory Management System
                </p>

            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};