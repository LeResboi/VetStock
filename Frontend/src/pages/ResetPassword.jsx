
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import '../App.css';
import './Auth.css';
import illustrationImg from '../assets/Icon.png';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage('');
        setError('');

        if (!token) {
            setError('Invalid password reset link. Please request a new one.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                'https://vetstock-backend.onrender.com/api/auth/reset-password',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token,
                        newPassword: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to reset password.'
                );
            }

            setMessage(data.message);
            setPassword('');
            setConfirmPassword('');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">

                <div className="auth-left">
                    <div className="illustration-box">
                        <img
                            src={illustrationImg}
                            alt="VetStock Illustration"
                        />
                    </div>

                    <h2>VetStock System</h2>

                    <p>
                        Manage your inventory and records easily and efficiently.
                    </p>
                </div>

                <div className="auth-right">
                    <h2>Reset Password</h2>

                    <p className="auth-subtitle">
                        Enter and confirm your new password.
                    </p>

                    {message && (
                        <div className="success-msg">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="error-msg">
                            {error}
                        </div>
                    )}

                    {!message && (
                        <form onSubmit={handleSubmit}>
                            <div className="input-group password-group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />

                                <i
                                    className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? 'Hide Password' : 'Show Password'}
                                ></i>
                            </div>

                            <div className="input-group password-group">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />

                                <i
                                    className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                                ></i>
                            </div>

                            <button
                                type="submit"
                                className="auth-btn"
                                disabled={loading || !token}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <div className="auth-switch">
                        <p>
                            <span onClick={() => navigate('/')}>
                                Back to Login
                            </span>
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
