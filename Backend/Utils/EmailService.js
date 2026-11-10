
import "dotenv/config";
import nodemailer from "nodemailer";

// ============================================================
// VETSTOCK EMAIL SERVICE
// PURPOSE: Send password reset emails
// ============================================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

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

                <p>
                    We received a request to reset your VetStock password.
                </p>

                <p>
                    Click the button below to create a new password:
                </p>

                <a href="${resetLink}"
                   style="
                       display: inline-block;
                       background-color: #00796b;
                       color: white;
                       padding: 12px 24px;
                       text-decoration: none;
                       border-radius: 5px;
                   ">
                    Reset Password
                </a>

                <p>
                    This link expires in <strong>15 minutes</strong>
                    and can only be used once.
                </p>

                <p>
                    If you did not request a password reset,
                    you can safely ignore this email.
                </p>

                <hr />

                <p style="color: gray; font-size: 12px;">
                    VetStock Veterinary Inventory Management System
                </p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};
