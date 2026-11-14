import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Check, X, Filter, Search, Clock, CheckCircle2, XCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LeaveManagement = () => {
    const { user: currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDept, setFilterDept] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isActioning, setIsActioning] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [leaveData, deptsData] = await Promise.all([
                api.getLeaveRequests(),
                api.getDepartments()
            ]);
            setRequests(leaveData.reverse());
            setDepartments(deptsData);
        } catch (err) {
            console.error("Failed to load leave requests", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAction = async (id, actionStatus, req) => {
        setIsActioning(true);
        try {
            if (actionStatus === 'approved') {
                await api.updateLeaveRequest(id, {
                    status: 'approved',
                    adminStatus: 'approved',
                    reviewedBy: currentUser?.name || 'Administrator',
                    reviewedAt: new Date().toISOString()
                });

                // AUTOMATICALLY MARK ATTENDANCE AS 'Leave' FOR ALL DATES IN RANGE
                if (req?.startDate && req?.endDate && req?.userId) {
                    try {
                        const start = new Date(req.startDate);
                        const end = new Date(req.endDate);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            const dateStr = d.toISOString().split('T')[0];
                            await api.saveAttendance(dateStr, { [req.userId]: 'Leave' }, true);
                        }
                    } catch (attErr) {
                        console.error("Auto attendance mark failed:", attErr);
                    }
                }
            } else {
                await api.updateLeaveRequest(id, {
                    status: 'rejected',
                    adminStatus: 'rejected',
                    reviewedBy: currentUser?.name || 'Administrator',
                    reviewedAt: new Date().toISOString()
                });
            }

            await api.createAuditLog({
                eventType: `LEAVE_${actionStatus.toUpperCase()}`,
                performedBy: currentUser?.name || 'Administrator',
                details: `Admin ${actionStatus} leave request for student "${req.studentName}". Attendance marked as Leave.`
            });

            await loadData();
        } catch (err) {
            alert(`Failed to ${actionStatus} leave request.`);
        } finally {
            setIsActioning(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const st = (r.status || 'pending').toLowerCase();
        const matchesStatus = filterStatus === 'All' || 
            (filterStatus === 'pending_admin' && st === 'pending_admin') ||
            (filterStatus === 'pending_staff' && (st === 'pending_staff' || st === 'pending')) ||
            (filterStatus === 'approved' && st === 'approved') ||
            (filterStatus === 'rejected' && st === 'rejected');

        const matchesDept = filterDept === 'All' || r.department === filterDept;
        const matchesSearch =
            (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesDept && matchesSearch;
    });

    const pendingAdminCount = requests.filter(r => (r.status || '').toLowerCase() === 'pending_admin').length;
    const pendingStaffCount = requests.filter(r => (r.status || 'pending').toLowerCase() === 'pending_staff' || (r.status || '').toLowerCase() === 'pending').length;
    const approvedCount = requests.filter(r => (r.status || '').toLowerCase() === 'approved').length;
    const rejectedCount = requests.filter(r => (r.status || '').toLowerCase() === 'rejected').length;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leave Management</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Two-stage approval: Endorsed by Department Faculty and finalized by Administration. Upon final approval, student attendance is automatically marked as Leave.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Requests</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{requests.length}</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>Staff Endorsed (Needs Admin)</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>{pendingAdminCount}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Needs Faculty Endorsement</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{pendingStaffCount}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Approved & Attendance Marked</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{approvedCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-with-icon">
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search student, ID, reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="pending_admin">Staff Endorsed (Needs Admin) ({pendingAdminCount})</option>
                        <option value="pending_staff">Needs Faculty Review ({pendingStaffCount})</option>
                        <option value="approved">Approved & Marked ({approvedCount})</option>
                        <option value="rejected">Rejected ({rejectedCount})</option>
                    </select>
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Requests List */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading leave requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                    No leave requests found matching filters.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredRequests.map(req => {
                        const status = (req.status || 'pending').toLowerCase();
                        return (
                            <div
                                key={req.id}
                                className="card"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: status === 'approved' ? '#ecfdf5' : status === 'rejected' ? '#fef2f2' : '#fffbeb',
                                        color: status === 'approved' ? '#059669' : status === 'rejected' ? '#dc2626' : '#d97706',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <CalendarCheck size={24} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                                                {req.studentName}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                ID: {req.studentId || req.userId}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                {req.department || 'General'}
                                            </span>
                                            {status === 'approved' ? (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: '#d1fae5', color: '#065f46' }}>
                                                    ✓ Final Approved & Attendance Marked
                                                </span>
                                            ) : status === 'pending_admin' ? (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3' }}>
                                                    ★ Staff Endorsed • Awaiting Admin
                                                </span>
                                            ) : status === 'pending_staff' || status === 'pending' ? (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#92400e' }}>
                                                    Pending Faculty Endorsement
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b' }}>
                                                    Rejected
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '0.4rem', fontSize: '0.88rem', color: '#334155' }}>
                                            <strong>{req.leaveType || 'General Leave'}</strong>: {req.startDate} to {req.endDate} ({req.daysCount || 1} day{req.daysCount > 1 ? 's' : ''})
                                        </div>

                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                            Reason: "{req.reason}"
                                        </p>

                                        {req.staffApprovedBy && (
                                            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>
                                                Endorsed by Department Faculty: {req.staffApprovedBy} on {new Date(req.staffApprovedAt || Date.now()).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {status !== 'approved' && status !== 'rejected' && status !== 'cancelled' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(req.id, 'approved', req)}
                                                className="btn btn-sm"
                                                style={{ background: '#059669', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                                disabled={isActioning}
                                                title="Approve leave and automatically mark attendance as Leave"
                                            >
                                                <Check size={16} /> Approve & Mark Attendance
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'rejected', req)}
                                                className="btn btn-sm"
                                                style={{ background: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                                disabled={isActioning}
                                            >
                                                <X size={16} /> Reject
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                                            Reviewed by {req.reviewedBy || 'Admin'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LeaveManagement;
