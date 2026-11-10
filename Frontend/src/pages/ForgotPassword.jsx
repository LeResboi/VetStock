
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../App.css';
import './Auth.css';
import illustrationImg from '../assets/Icon.png';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage('');
        setError('');
        setLoading(true);

        try {
            const response = await fetch(
                'http://localhost:3001/api/auth/forgot-password',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to process your request.'
                );
            }

            setMessage(data.message);

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
                    <h2>Forgot Password?</h2>

                    <p className="auth-subtitle">
                        Enter your registered email address to receive a password reset link.
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

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input
                                type="email"
                                placeholder="Email ID"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-btn"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="auth-switch">
                        <p>
                            Remember your password?{' '}
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
