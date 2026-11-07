import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Users, Search, Filter, ArrowLeft, Award, Calendar, 
    CheckCircle, FileText, ChevronRight, AlertCircle, RefreshCw,
    UserCheck, BookOpen, Building2, Phone, Mail, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const DepartmentStudents = () => {
    const { user: currentUser } = useAuth();
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
            const deptStudents = (allUsers || []).filter(u => {
                if (u.role !== 'student') return false;
                const studentDept = u.department || u.details?.department;
                return studentDept && studentDept.toLowerCase() === departmentName.toLowerCase();
            });

            setStudents(deptStudents);
            setAttendanceData(allAttendance || []);
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
        attendanceData.forEach(att => {
            if (att.records && att.records[student.id]) {
                totalMarkedDays++;
                if (att.records[student.id].status === 'present') {
                    presentDays++;
                }
            } else if (att.studentId === student.id || att.userId === student.id) {
                totalMarkedDays++;
                if (att.status === 'present') presentDays++;
            }
        });

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

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                    <div className="table-responsive">
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STUDENT</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>CONTACT</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>BATCH</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ATTENDANCE</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>EXAMS TAKEN</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>AVG SCORE</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STATUS</th>
                                    <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>ACTION</th>
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
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <Link
                                                    to={`/admin/reports/${student.id}`}
                                                    className="btn btn-outline btn-sm"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                                                >
                                                    <Eye size={13} /> View Report
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
        </div>
    );
};

export default DepartmentStudents;
