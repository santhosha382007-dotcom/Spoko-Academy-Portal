import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import logo from '../assets/logo.png';

const ForcePasswordChangeModal = () => {
    const { user, changeFirstLoginPassword, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!user || user.role !== 'student' || !user.firstLoginPasswordChange) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.trim().length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match. Please re-enter.');
            return;
        }

        setIsLoading(true);
        try {
            await changeFirstLoginPassword(newPassword);
        } catch (err) {
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="force-password-overlay animate-fade-in">
            <div className="force-password-card">
                <div className="force-password-header">
                    <div className="logo-wrapper">
                        <img src={logo} alt="Spoko Logo" className="modal-logo" />
                    </div>
                    <div className="shield-badge">
                        <ShieldCheck size={16} color="#10b981" />
                        <span>Security Checkpoint</span>
                    </div>
                    <h2>First-Login Password Setup</h2>
                    <p>
                        Welcome, <strong>{user.name}</strong>! Your account was initialized with a temporary default password. 
                        For academy security, you must create a new personal password before accessing the dashboard.
                    </p>
                </div>

                {error && (
                    <div className="error-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="force-password-form">
                    <div className="form-group">
                        <label>New Password (min. 6 characters)</label>
                        <div className="input-box">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showNew ? 'text' : 'password'}
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                required
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowNew(!showNew)}
                                aria-label="Toggle password visibility"
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <div className="input-box">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Re-type new password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                required
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowConfirm(!showConfirm)}
                                aria-label="Toggle password visibility"
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="password-policy-checklist">
                        <div className={`policy-item ${newPassword.length >= 6 ? 'met' : ''}`}>
                            <CheckCircle size={14} /> At least 6 characters
                        </div>
                        <div className={`policy-item ${newPassword && newPassword === confirmPassword ? 'met' : ''}`}>
                            <CheckCircle size={14} /> Passwords match
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                    >
                        {isLoading ? 'Saving Secure Password...' : 'Save Password & Continue to Dashboard'}
                    </button>

                    <button
                        type="button"
                        onClick={logout}
                        className="btn-logout"
                    >
                        <LogOut size={16} /> Log Out
                    </button>
                </form>
            </div>

            <style>{`
                .force-password-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                    font-family: 'Outfit', sans-serif;
                }

                .force-password-card {
                    background: white;
                    border-radius: 24px;
                    padding: 2.5rem;
                    max-width: 480px;
                    width: 100%;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    border: 1px solid #e2e8f0;
                }

                .force-password-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .logo-wrapper {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 1rem;
                    border-radius: 20px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }

                .modal-logo {
                    width: 54px;
                    height: 54px;
                    object-fit: contain;
                }

                .shield-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                    padding: 4px 12px;
                    border-radius: 100px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    text-transform: uppercase;
                }

                .force-password-header h2 {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 0.5rem;
                }

                .force-password-header p {
                    font-size: 0.88rem;
                    color: #64748b;
                    line-height: 1.5;
                    margin: 0;
                }

                .error-alert {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #b91c1c;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    margin-bottom: 1.25rem;
                }

                .form-group {
                    margin-bottom: 1.25rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 0.5rem;
                }

                .input-box {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    color: #94a3b8;
                }

                .input-box input {
                    width: 100%;
                    padding: 0.85rem 2.8rem 0.85rem 2.8rem;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 14px;
                    font-size: 0.95rem;
                    background: #f8fafc;
                    outline: none;
                    transition: all 0.2s;
                }

                .input-box input:focus {
                    background: white;
                    border-color: #7c3aed;
                    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
                }

                .eye-btn {
                    position: absolute;
                    right: 14px;
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 0;
                }

                .eye-btn:hover { color: #475569; }

                .password-policy-checklist {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .policy-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .policy-item.met {
                    color: #10b981;
                }

                .btn-submit {
                    width: 100%;
                    padding: 1rem;
                    background: #7c3aed;
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
                }

                .btn-submit:hover:not(:disabled) {
                    background: #6d28d9;
                    transform: translateY(-1px);
                }

                .btn-submit:disabled {
                    background: #cbd5e1;
                    box-shadow: none;
                    cursor: not-allowed;
                }

                .btn-logout {
                    width: 100%;
                    margin-top: 0.75rem;
                    padding: 0.65rem;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    cursor: pointer;
                }

                .btn-logout:hover {
                    color: #ef4444;
                    background: #fef2f2;
                }
            `}</style>
        </div>
    );
};

export default ForcePasswordChangeModal;
