import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, Send, X, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StudentLeave = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [summary, setSummary] = useState({ total: 0, approved: 0, pendingStaff: 0, pendingAdmin: 0 });
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
            const sorted = (userRequests || []).reverse();
            setRequests(sorted);

            let appCount = 0;
            let pStaff = 0;
            let pAdmin = 0;

            sorted.forEach(r => {
                const st = (r.status || 'pending').toLowerCase();
                if (st === 'approved') appCount++;
                else if (st === 'pending_admin') pAdmin++;
                else if (st === 'pending_staff' || st === 'pending') pStaff++;
            });

            setSummary({
                total: sorted.length,
                approved: appCount,
                pendingStaff: pStaff,
                pendingAdmin: pAdmin
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
            const dept = user.department || user.details?.department || 'General';
            const newRequest = {
                id: 'leave_' + Date.now(),
                userId: user.id,
                studentId: user.details?.studentId || user.id,
                studentName: user.name,
                department: dept,
                leaveType: form.leaveType,
                startDate: form.startDate,
                endDate: form.endDate,
                daysCount: days,
                reason: form.reason.trim(),
                status: 'pending_staff',
                staffStatus: 'pending',
                adminStatus: 'pending',
                submittedAt: new Date().toISOString()
            };

            await api.createLeaveRequest(newRequest);

            await api.createAuditLog({
                eventType: 'LEAVE_SUBMITTED',
                performedBy: user.name,
                userId: user.id,
                details: `Student ${user.name} submitted ${days}-day ${form.leaveType} request for ${dept} Department.`
            });

            alert("Leave request submitted successfully! Your department faculty will review it first, followed by final administrator approval.");
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

    const getStatusDisplay = (req) => {
        const st = (req.status || 'pending').toLowerCase();
        if (st === 'approved') {
            return {
                label: 'Approved & Marked in Attendance',
                badgeBg: '#d1fae5',
                badgeColor: '#065f46',
                iconColor: '#059669',
                iconBg: '#ecfdf5',
                desc: `Endorsed by ${req.staffApprovedBy || 'Staff'} and approved by ${req.adminReviewedBy || 'Admin'}.`
            };
        }
        if (st === 'pending_admin') {
            return {
                label: 'Staff Endorsed • Awaiting Admin',
                badgeBg: '#e0e7ff',
                badgeColor: '#3730a3',
                iconColor: '#4f46e5',
                iconBg: '#eef2ff',
                desc: `Approved by Department Faculty (${req.staffApprovedBy || 'Staff'}). Waiting for final Admin approval.`
            };
        }
        if (st === 'pending_staff' || st === 'pending') {
            return {
                label: 'Awaiting Dept Staff Review',
                badgeBg: '#fef3c7',
                badgeColor: '#92400e',
                iconColor: '#d97706',
                iconBg: '#fffbeb',
                desc: 'Waiting for review and approval by your Department Staff.'
            };
        }
        if (st === 'rejected') {
            return {
                label: 'Rejected',
                badgeBg: '#fee2e2',
                badgeColor: '#991b1b',
                iconColor: '#dc2626',
                iconBg: '#fef2f2',
                desc: req.adminStatus === 'rejected' ? 'Rejected by Administrator.' : 'Rejected by Department Faculty.'
            };
        }
        return {
            label: 'Cancelled',
            badgeBg: '#f1f5f9',
            badgeColor: '#475569',
            iconColor: '#64748b',
            iconBg: '#f1f5f9',
            desc: 'Cancelled by student.'
        };
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
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leave Applications</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Students can apply for leave anytime. Multi-stage approval: Department Staff review followed by Administrator approval.
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

            {/* Leave Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Applications</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{summary.total}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Approved Leaves</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{summary.approved}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Awaiting Staff Review</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{summary.pendingStaff}</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>Awaiting Admin Approval</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>{summary.pendingAdmin}</div>
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
                    You have not submitted any leave requests yet. You can apply anytime above.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {requests.map(req => {
                        const statusInfo = getStatusDisplay(req);
                        const isPendingAny = (req.status || 'pending').toLowerCase().includes('pending');
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
                                        background: statusInfo.iconBg,
                                        color: statusInfo.iconColor,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <CalendarCheck size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                {req.leaveType}
                                            </span>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: statusInfo.badgeBg,
                                                color: statusInfo.badgeColor
                                            }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                                            {req.startDate} to {req.endDate} ({req.daysCount || 1} day{req.daysCount > 1 ? 's' : ''})
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                            Reason: "{req.reason}"
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '2px', fontWeight: 600 }}>
                                            {statusInfo.desc}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {isPendingAny && (
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
