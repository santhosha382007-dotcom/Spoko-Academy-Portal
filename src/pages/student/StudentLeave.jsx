import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, Send, X, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StudentLeave = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [balance, setBalance] = useState({ total: 12, used: 0, pending: 0, remaining: 12 });
    const [isLoading, setIsLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        leaveType: 'Casual Leave',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });

    const loadData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userRequests = await api.getLeaveRequestsByUserId(user.id);
            setRequests(userRequests.reverse());

            // Compute balance: 12 standard annual leave days
            let approvedDays = 0;
            let pendingDays = 0;
            userRequests.forEach(r => {
                const days = r.daysCount || 1;
                if ((r.status || '').toLowerCase() === 'approved') approvedDays += days;
                if ((r.status || '').toLowerCase() === 'pending') pendingDays += days;
            });

            setBalance({
                total: 12,
                used: approvedDays,
                pending: pendingDays,
                remaining: Math.max(0, 12 - approvedDays)
            });
        } catch (err) {
            console.error("Failed to load student leave requests", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const calculateDays = (start, end) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 1;
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (!form.reason.trim()) {
            alert("Please provide a reason for your leave request.");
            return;
        }

        const days = calculateDays(form.startDate, form.endDate);
        setIsSubmitting(true);
        try {
            const newRequest = {
                id: 'leave_' + Date.now(),
                userId: user.id,
                studentId: user.details?.studentId || user.id,
                studentName: user.name,
                department: user.details?.department || 'General',
                leaveType: form.leaveType,
                startDate: form.startDate,
                endDate: form.endDate,
                daysCount: days,
                reason: form.reason.trim(),
                status: 'pending',
                submittedAt: new Date().toISOString()
            };

            await api.createLeaveRequest(newRequest);

            await api.createAuditLog({
                eventType: 'LEAVE_SUBMITTED',
                performedBy: user.name,
                userId: user.id,
                details: `Student ${user.name} submitted ${days}-day ${form.leaveType} request.`
            });

            alert("Leave request submitted successfully. Waiting for Administrator review.");
            setShowApplyModal(false);
            setForm({
                leaveType: 'Casual Leave',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });
            await loadData();
        } catch (err) {
            alert("Failed to submit leave request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (confirm("Are you sure you want to cancel this pending leave request?")) {
            try {
                await api.updateLeaveRequest(id, { status: 'cancelled' });
                await loadData();
            } catch (err) {
                alert("Failed to cancel request.");
            }
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leave Portal</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Submit absence requests directly to the Administrator and track balances.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowApplyModal(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', fontWeight: 700 }}
                >
                    <Plus size={18} /> Apply for Leave
                </button>
            </div>

            {/* Leave Balance Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Allocated</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{balance.total} Days</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Available Balance</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{balance.remaining} Days</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Approved Leaves</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#475569', marginTop: '4px' }}>{balance.used} Days</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Pending Review</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{balance.pending} Days</div>
                </div>
            </div>

            {/* Request History */}
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>My Leave History</h2>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading your requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                    You have not submitted any leave requests yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {requests.map(req => {
                        const status = (req.status || 'pending').toLowerCase();
                        return (
                            <div
                                key={req.id}
                                className="card"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.25rem 1.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '12px',
                                        background: status === 'approved' ? '#ecfdf5' : status === 'rejected' ? '#fef2f2' : status === 'cancelled' ? '#f1f5f9' : '#fffbeb',
                                        color: status === 'approved' ? '#059669' : status === 'rejected' ? '#dc2626' : status === 'cancelled' ? '#64748b' : '#d97706',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <CalendarCheck size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                {req.leaveType}
                                            </span>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: status === 'approved' ? '#d1fae5' : status === 'rejected' ? '#fee2e2' : status === 'cancelled' ? '#f1f5f9' : '#fef3c7',
                                                color: status === 'approved' ? '#065f46' : status === 'rejected' ? '#991b1b' : status === 'cancelled' ? '#475569' : '#92400e'
                                            }}>
                                                {status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                                            {req.startDate} to {req.endDate} ({req.daysCount || 1} day{req.daysCount > 1 ? 's' : ''})
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                            Reason: "{req.reason}"
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {status === 'pending' && (
                                        <button
                                            onClick={() => handleCancel(req.id)}
                                            className="btn btn-outline btn-sm"
                                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                        >
                                            Cancel Request
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Apply for Leave */}
            {showApplyModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '480px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Submit Leave Request</h2>
                            <button
                                type="button"
                                onClick={() => setShowApplyModal(false)}
                                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Leave Type</label>
                                <select
                                    value={form.leaveType}
                                    onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                >
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick / Medical Leave">Sick / Medical Leave</option>
                                    <option value="Exam / Academic Leave">Exam / Academic Preparation</option>
                                    <option value="Emergency Leave">Family / Emergency Leave</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>From Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>To Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Reason for Absence *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Explain your reason for leave..."
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowApplyModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#7c3aed' }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentLeave;
