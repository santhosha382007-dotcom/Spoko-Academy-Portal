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

    const handleAction = async (id, status, studentName) => {
        setIsActioning(true);
        try {
            await api.updateLeaveRequest(id, {
                status,
                reviewedBy: currentUser?.name || 'Administrator',
                reviewedAt: new Date().toISOString()
            });

            await api.createAuditLog({
                eventType: `LEAVE_${status.toUpperCase()}`,
                performedBy: currentUser?.name || 'Administrator',
                details: `Admin ${status} leave request for student "${studentName}".`
            });

            await loadData();
        } catch (err) {
            alert(`Failed to ${status} leave request.`);
        } finally {
            setIsActioning(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesStatus = filterStatus === 'All' || (r.status || 'pending').toLowerCase() === filterStatus.toLowerCase();
        const matchesDept = filterDept === 'All' || r.department === filterDept;
        const matchesSearch =
            (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesDept && matchesSearch;
    });

    const pendingCount = requests.filter(r => (r.status || 'pending').toLowerCase() === 'pending').length;
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
                            Direct administrative review and approval of student leave requests. No teacher stage required.
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
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Pending Review</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{pendingCount}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Approved</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{approvedCount}</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Rejected</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{rejectedCount}</div>
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
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
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
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: status === 'approved' ? '#d1fae5' : status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                                color: status === 'approved' ? '#065f46' : status === 'rejected' ? '#991b1b' : '#92400e'
                                            }}>
                                                {status}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: '0.4rem', fontSize: '0.88rem', color: '#334155' }}>
                                            <strong>{req.leaveType || 'General Leave'}</strong>: {req.startDate} to {req.endDate} ({req.daysCount || 1} day{req.daysCount > 1 ? 's' : ''})
                                        </div>

                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                            Reason: "{req.reason}"
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(req.id, 'approved', req.studentName)}
                                                className="btn btn-sm"
                                                style={{ background: '#059669', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                                disabled={isActioning}
                                            >
                                                <Check size={16} /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'rejected', req.studentName)}
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
