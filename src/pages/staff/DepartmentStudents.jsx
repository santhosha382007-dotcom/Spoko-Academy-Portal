import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Users, Search, Filter, ArrowLeft, Award, Calendar, 
    CheckCircle, FileText, ChevronRight, AlertCircle, RefreshCw,
    UserCheck, BookOpen, Building2, Phone, Mail, Eye, KeyRound, Ban, Trash2, Copy, Check, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { generateTemporaryPassword } from '../../utils/security';

const DepartmentStudents = () => {
    const { user: currentUser, adminResetPassword } = useAuth();
    const departmentName = currentUser?.department || currentUser?.details?.department || 'General';

    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [resultsData, setResultsData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [batchFilter, setBatchFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 10;

    // Password reset modal states
    const [resettingUser, setResettingUser] = useState(null);
    const [tempPassword, setTempPassword] = useState('');
    const [copiedPass, setCopiedPass] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [departmentName]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [allUsers, allAttendance, allResults] = await Promise.all([
                api.getUsers(),
                api.getAttendance().catch(() => []),
                api.getResults().catch(() => [])
            ]);

            // STRICT ISOLATION: Department staff only sees students in their own department
            const deptClean = String(departmentName || '').toLowerCase().trim().replace(/s$/, '');
            const deptStudents = (allUsers || []).filter(u => {
                if (u.role !== 'student') return false;
                const studentDept = String(u.department || u.details?.department || '').toLowerCase().trim().replace(/s$/, '');
                const studentDepts = Array.isArray(u.departments) ? u.departments.map(d => String(d).toLowerCase().trim().replace(/s$/, '')) : [];
                return studentDept === deptClean || 
                       studentDepts.includes(deptClean) ||
                       (deptClean === 'gd' && studentDept.includes('gd')) || 
                       (deptClean.includes('gd') && studentDept === 'gd') ||
                       (studentDept && studentDept === String(departmentName).toLowerCase().trim());
            });

            setStudents(deptStudents);
            setAttendanceData(allAttendance || {});
            setResultsData(allResults || []);
        } catch (err) {
            console.error("Error loading department students:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate student statistics
    const getStudentStats = (student) => {
        const studentResults = resultsData.filter(r => 
            String(r.userId) === String(student.id) || 
            String(r.studentId) === String(student.id) ||
            r.phone === student.phone
        );
        
        const completedCount = studentResults.length;
        const avgScore = completedCount > 0 
            ? Math.round(studentResults.reduce((acc, r) => acc + (Number(r.percentage) || (Number(r.score) / (Number(r.totalMarks) || 100)) * 100 || 0), 0) / completedCount)
            : 0;

        // Attendance stats
        let presentDays = 0;
        let totalMarkedDays = 0;
        if (attendanceData && typeof attendanceData === 'object') {
            const days = Array.isArray(attendanceData) ? attendanceData : Object.values(attendanceData);
            days.forEach(day => {
                if (day && typeof day === 'object') {
                    const records = day.records || day;
                    if (records && typeof records === 'object') {
                        const statusVal = records[student.id];
                        if (statusVal) {
                            totalMarkedDays++;
                            const statusStr = String(statusVal?.status || statusVal).toLowerCase();
                            if (statusStr === 'present') {
                                presentDays++;
                            }
                        }
                    } else if (day.studentId === student.id || day.userId === student.id) {
                        totalMarkedDays++;
                        if (String(day.status).toLowerCase() === 'present') presentDays++;
                    }
                }
            });
        }

        const attendanceRate = totalMarkedDays > 0 
            ? Math.round((presentDays / totalMarkedDays) * 100)
            : (student.attendanceRate !== undefined ? student.attendanceRate : 100);

        return { completedCount, avgScore, attendanceRate, totalMarkedDays };
    };

    // Filter students
    const filteredStudents = students.filter(s => {
        const matchesSearch = 
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(s.phone || '').includes(searchTerm) ||
            String(s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(s.details?.batch || s.batch || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || 
            (s.status || 'Active').toLowerCase() === statusFilter.toLowerCase();

        const studentBatch = s.details?.batch || s.batch || 'Default';
        const matchesBatch = batchFilter === 'All' || studentBatch === batchFilter;

        return matchesSearch && matchesStatus && matchesBatch;
    });

    // Action Handlers
    const initiatePasswordReset = (student) => {
        setResettingUser(student);
        setTempPassword(generateTemporaryPassword());
        setCopiedPass(false);
    };

    const handleConfirmPasswordReset = async () => {
        if (!resettingUser) return;
        setIsSubmitting(true);
        try {
            await adminResetPassword(resettingUser.id, tempPassword);
            alert(`Password for student "${resettingUser.name}" successfully reset to:\n\n${tempPassword}\n\nThe student will be prompted to change their password on next login.`);
            setResettingUser(null);
            await loadData();
        } catch (err) {
            console.error("Password reset error:", err);
            alert(`Failed to reset password: ${err.message || 'Server error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (student) => {
        const currentStatus = (student.status || 'Active').toLowerCase();
        const newStatus = currentStatus === 'blocked' || currentStatus === 'inactive' ? 'Active' : 'Blocked';
        if (!confirm(`Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'block / deactivate'} student "${student.name}"?`)) return;

        try {
            await api.updateUser(student.id, {
                status: newStatus,
                details: { ...(student.details || {}), status: newStatus }
            });
            await api.createAuditLog({
                eventType: newStatus === 'Blocked' ? 'STUDENT_BLOCKED' : 'STUDENT_ACTIVATED',
                performedBy: currentUser?.name || `${departmentName} Staff`,
                userId: student.id,
                details: `${departmentName} faculty changed student status to ${newStatus}.`
            });
            await loadData();
        } catch (e) {
            alert("Failed to update student account status.");
        }
    };

    const handleDeleteStudent = async (student) => {
        if (!confirm(`Are you sure you want to PERMANENTLY remove student "${student.name}" (${student.id}) from ${departmentName} Department?\n\nThis action cannot be undone.`)) return;
        try {
            await api.deleteUser(student.id);
            await api.createAuditLog({
                eventType: 'STUDENT_DELETED',
                performedBy: currentUser?.name || `${departmentName} Staff`,
                userId: student.id,
                details: `${departmentName} faculty removed student ${student.name} (${student.id}).`
            });
            await loadData();
        } catch (e) {
            alert("Failed to delete student account.");
        }
    };

    // Pagination
    const indexOfLast = currentPage * studentsPerPage;
    const indexOfFirst = indexOfLast - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;

    // Unique batches for filter
    const batches = Array.from(new Set(students.map(s => s.details?.batch || s.batch).filter(Boolean)));

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                                {departmentName} Students
                            </h1>
                            <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                                {departmentName} Department
                            </span>
                        </div>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Roster and academic performance overview for students in your assigned department.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link 
                        to="/staff/attendance" 
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#059669', borderColor: '#059669' }}
                    >
                        <Calendar size={14} /> Mark Attendance
                    </Link>
                    <button 
                        onClick={loadData}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Roster
                    </button>
                    <Link 
                        to="/staff/import-questions" 
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <BookOpen size={14} /> Import Dept Questions
                    </Link>
                </div>
            </div>

            {/* Department Summary Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                borderRadius: '16px',
                padding: '1.5rem 2rem',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.25)'
            }}>
                <div>
                    <div style={{ fontSize: '0.85rem', color: '#e0e7ff', fontWeight: 600 }}>Assigned Department</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{departmentName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#c7d2fe', marginTop: '4px' }}>Isolated Staff Access</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.85rem', color: '#e0e7ff', fontWeight: 600 }}>Total Department Students</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{students.length}</div>
                    <div style={{ fontSize: '0.75rem', color: '#c7d2fe', marginTop: '4px' }}>Enrolled & Active</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.85rem', color: '#e0e7ff', fontWeight: 600 }}>Department Filter Active</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>100% Locked</div>
                    <div style={{ fontSize: '0.75rem', color: '#c7d2fe', marginTop: '4px' }}>Other department students hidden</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by student name, ID, phone..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem', width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="input-field"
                            style={{ width: '100%' }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active Only</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        {batches.length > 0 && (
                            <select
                                value={batchFilter}
                                onChange={(e) => {
                                    setBatchFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="input-field"
                                style={{ width: '100%' }}
                            >
                                <option value="All">All Batches</option>
                                {batches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="card table-responsive-wrapper" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                        <RefreshCw size={36} className="animate-spin" style={{ color: '#6366f1', margin: '0 auto 1rem' }} />
                        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading {departmentName} students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <Users size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                            {searchTerm ? 'No Matching Students Found' : `No Students Enrolled in ${departmentName}`}
                        </h3>
                        <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
                            {searchTerm 
                                ? 'Try clearing your search term or filters.' 
                                : `Students registered with the ${departmentName} department will automatically appear here.`}
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="mobile-scroll-hint" style={{ padding: '0.6rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>👉</span>
                            <span>Swipe horizontally to view full table, Change Password, Block, Delete, and View Report.</span>
                        </div>
                        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STUDENT</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>CONTACT</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>BATCH</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ATTENDANCE</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>EXAMS TAKEN</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>AVG SCORE</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STATUS</th>
                                        <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right', minWidth: '150px' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentStudents.map(student => {
                                        const stats = getStudentStats(student);
                                        return (
                                            <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <img
                                                            src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=e2e8f0&color=475569`}
                                                            alt={student.name}
                                                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{student.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {student.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>{student.phone || '—'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{student.email || student.details?.email || '—'}</div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                                    {student.details?.batch || student.batch || '2026-A'}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ 
                                                            fontWeight: 700, 
                                                            fontSize: '0.88rem',
                                                            color: stats.attendanceRate >= 75 ? '#16a34a' : stats.attendanceRate >= 50 ? '#ca8a04' : '#dc2626'
                                                        }}>
                                                            {stats.attendanceRate}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                                                    {stats.completedCount}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span className={`badge ${stats.avgScore >= 75 ? 'badge-success' : stats.avgScore >= 50 ? 'badge-warning' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                                                        {stats.avgScore}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span className={`badge ${(student.status || 'Active').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                                                        {student.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => initiatePasswordReset(student)}
                                                            className="btn-icon-sm"
                                                            title="Reset Password"
                                                            style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', cursor: 'pointer' }}
                                                        >
                                                            <KeyRound size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(student)}
                                                            className="btn-icon-sm"
                                                            title={(student.status || 'Active').toLowerCase() === 'blocked' ? "Activate Student" : "Block / Deactivate"}
                                                            style={{ color: (student.status || 'Active').toLowerCase() === 'blocked' ? '#10b981' : '#f59e0b', background: '#fffbeb', border: '1px solid #fef3c7', cursor: 'pointer' }}
                                                        >
                                                            <Ban size={15} />
                                                        </button>
                                                        <Link
                                                            to={`/admin/reports/${student.id}`}
                                                            className="btn-icon-sm"
                                                            title="View Academic Report"
                                                            style={{ color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Eye size={15} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteStudent(student)}
                                                            className="btn-icon-sm"
                                                            title="Delete Student"
                                                            style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredStudents.length > studentsPerPage && (
                    <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredStudents.length)} of {filteredStudents.length} students
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn btn-outline btn-sm"
                            >
                                Previous
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn btn-outline btn-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Password Reset Modal for Staff */}
            {resettingUser && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <KeyRound size={20} color="#7c3aed" />
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Reset Student Password</h3>
                            </div>
                            <button onClick={() => setResettingUser(null)} className="btn-icon" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem' }}>
                            Resetting credentials for <strong>{resettingUser.name}</strong> (ID: {resettingUser.id}).
                        </p>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Temporary Password</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={tempPassword}
                                    onChange={(e) => setTempPassword(e.target.value)}
                                    style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(tempPassword);
                                        setCopiedPass(true);
                                        setTimeout(() => setCopiedPass(false), 2000);
                                    }}
                                    className="btn btn-outline"
                                    style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {copiedPass ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                                    {copiedPass ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <small style={{ color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                                The student will be prompted to set a new password on their next login.
                            </small>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="button" onClick={() => setResettingUser(null)} className="btn btn-outline" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPasswordReset}
                                className="btn btn-primary"
                                style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed' }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Updating...' : 'Confirm Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentStudents;
