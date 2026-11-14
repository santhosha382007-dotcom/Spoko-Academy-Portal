import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Check, X, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, Loader, ShieldCheck, User } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DepartmentLeave = () => {
    const { user: currentUser } = useAuth();
    const departmentName = currentUser?.department || currentUser?.details?.department || 'General';

    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isActioning, setIsActioning] = useState(false);

    const normalizeDept = (dept) => String(dept || '').toLowerCase().trim().replace(/s$/, '');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const allRequests = await api.getLeaveRequests();
            const deptClean = normalizeDept(departmentName);

            // Filter requests strictly to students of this department
            const deptRequests = (allRequests || []).filter(r => {
                const rDept = normalizeDept(r.department || r.studentDepartment);
                return rDept === deptClean ||
                       (deptClean === 'gd' && rDept.includes('gd')) ||
                       (deptClean.includes('gd') && rDept === 'gd') ||
                       (rDept && rDept === String(departmentName).toLowerCase().trim());
            });

            setRequests(deptRequests.reverse());
        } catch (err) {
            console.error("Failed to load department leave requests", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [departmentName]);

    const handleStaffAction = async (id, action, studentName) => {
        setIsActioning(true);
        try {
            if (action === 'approve') {
                await api.updateLeaveRequest(id, {
                    status: 'pending_admin',
                    staffStatus: 'approved',
                    staffApprovedBy: currentUser?.name || 'Department Faculty',
                    staffApprovedAt: new Date().toISOString()
                });

                await api.createAuditLog({
                    eventType: 'LEAVE_STAFF_APPROVED',
                    performedBy: currentUser?.name || 'Department Faculty',
                    details: `Faculty endorsed leave request for student "${studentName}". Sent to Administrator for final approval.`
                });
            } else if (action === 'reject') {
                await api.updateLeaveRequest(id, {
                    status: 'rejected',
                    staffStatus: 'rejected',
                    staffApprovedBy: currentUser?.name || 'Department Faculty',
                    staffApprovedAt: new Date().toISOString()
                });

                await api.createAuditLog({
                    eventType: 'LEAVE_STAFF_REJECTED',
                    performedBy: currentUser?.name || 'Department Faculty',
                    details: `Faculty rejected leave request for student "${studentName}".`
                });
            }

            await loadData();
        } catch (err) {
            alert(`Failed to ${action} leave request.`);
        } finally {
            setIsActioning(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesStatus = statusFilter === 'All' || 
            (statusFilter === 'pending_staff' && (r.status === 'pending_staff' || r.status === 'pending')) ||
            (statusFilter === 'pending_admin' && r.status === 'pending_admin') ||
            (statusFilter === 'approved' && r.status === 'approved') ||
            (statusFilter === 'rejected' && r.status === 'rejected');

        const matchesSearch =
            (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.leaveType || '').toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const pendingStaffCount = requests.filter(r => (r.status || 'pending').toLowerCase() === 'pending_staff' || (r.status || '').toLowerCase() === 'pending').length;
    const pendingAdminCount = requests.filter(r => (r.status || '').toLowerCase() === 'pending_admin').length;
    const approvedCount = requests.filter(r => (r.status || '').toLowerCase() === 'approved').length;

    return (
        <div style={{ paddingBottom: '3.5rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                            {departmentName} Department Leave Approvals
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Step 1 Department Review: Endorse student leave requests to Administrator for final approval and automatic attendance logging.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Department Requests</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{requests.length}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Needs Faculty Review</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{pendingStaffCount}</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>Sent to Admin</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>{pendingAdminCount}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Final Approved & Logged</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{approvedCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="input-with-icon" style={{ flex: 1, minWidth: '240px' }}>
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search student, ID, reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '180px' }}
                >
                    <option value="All">All Requests</option>
                    <option value="pending_staff">Needs Faculty Endorsement ({pendingStaffCount})</option>
                    <option value="pending_admin">Awaiting Admin Approval ({pendingAdminCount})</option>
                    <option value="approved">Final Approved ({approvedCount})</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading department leave requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                    No leave requests found for {departmentName} department.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STUDENT</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>LEAVE TYPE</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>DATES & DURATION</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>REASON</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>APPROVAL STAGE</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>FACULTY ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map(req => {
                                    const st = (req.status || 'pending').toLowerCase();
                                    const isPendingStaff = st === 'pending_staff' || st === 'pending';

                                    return (
                                        <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{req.studentName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {req.studentId || req.userId}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#334155' }}>
                                                {req.leaveType}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                    {req.startDate} to {req.endDate}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {req.daysCount || 1} day{(req.daysCount || 1) > 1 ? 's' : ''}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569', maxWidth: '240px' }}>
                                                "{req.reason}"
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                {st === 'approved' ? (
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: '#d1fae5', color: '#065f46' }}>
                                                        ✓ Final Approved
                                                    </span>
                                                ) : st === 'pending_admin' ? (
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3' }}>
                                                        ⏳ Endorsed • Awaiting Admin
                                                    </span>
                                                ) : isPendingStaff ? (
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: '#fef3c7', color: '#92400e' }}>
                                                        Needs Faculty Endorsement
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b' }}>
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                {isPendingStaff ? (
                                                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleStaffAction(req.id, 'approve', req.studentName)}
                                                            disabled={isActioning}
                                                            className="btn btn-sm btn-primary"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#10b981', borderColor: '#10b981' }}
                                                        >
                                                            <Check size={14} /> Endorse to Admin
                                                        </button>
                                                        <button
                                                            onClick={() => handleStaffAction(req.id, 'reject', req.studentName)}
                                                            disabled={isActioning}
                                                            className="btn btn-sm btn-outline"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: '#fca5a5' }}
                                                        >
                                                            <X size={14} /> Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentLeave;