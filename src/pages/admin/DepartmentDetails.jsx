import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, Award, Search, Filter, Loader, Users, CalendarCheck } from 'lucide-react';
import { api } from '../../services/api';
import DepartmentAttendance from '../staff/DepartmentAttendance';

const DepartmentDetails = () => {
    const { deptName } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const activeTab = searchParams.get('tab') === 'attendance' ? 'attendance' : 'students';

    const setActiveTab = (tab) => {
        setSearchParams(tab === 'attendance' ? { tab: 'attendance' } : {});
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allUsers, allResults, allAttendance] = await Promise.all([
                    api.getUsers(),
                    api.getResults(),
                    api.getAttendance()
                ]);

                // Filter students for this department
                const cleanDeptName = decodeURIComponent(deptName || '').toLowerCase().trim().replace(/s$/, '');
                const deptStudents = allUsers.filter(u => {
                    if (u.role !== 'student') return false;
                    const uDept = String(u.department || u.details?.department || '').toLowerCase().trim().replace(/s$/, '');
                    return uDept === cleanDeptName || (cleanDeptName && (uDept.includes(cleanDeptName) || cleanDeptName.includes(uDept)));
                });

                // Process data for each student
                const processedStudents = deptStudents.map(student => {
                    // Calculate attendance
                    let presentCount = 0;
                    let totalDays = 0;

                    // allAttendance is an object: { "date": { "studentId": "status" } }
                    Object.values(allAttendance).forEach(records => {
                        if (records && records[student.id]) {
                            totalDays++;
                            if (records[student.id] === 'Present' || records[student.id] === 'present') {
                                presentCount++;
                            }
                        }
                    });

                    const attendancePercent = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

                    // Calculate marks
                    const studentResults = allResults.filter(r => r.userId === student.id || r.userId === String(student.id));
                    const avgMarks = studentResults.length > 0
                        ? Math.round(studentResults.reduce((acc, curr) => acc + curr.score, 0) / studentResults.length)
                        : 0;

                    return {
                        ...student,
                        attendancePercent,
                        avgMarks,
                        totalExams: studentResults.length
                    };
                });

                setStudents(processedStudents);
            } catch (err) {
                console.error("Error fetching department details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [deptName]);

    const filteredStudents = (students || []).filter(s =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.phone || '').includes(searchTerm) ||
        String(s.id || '').includes(searchTerm)
    );

    if (loading) return (
        <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '1rem' }}>
            <Loader className="spin" size={40} color="var(--color-primary)" />
            <p className="text-muted">Analyzing Department Data...</p>
        </div>
    );

    return (
        <div className="dept-details-container animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link to="/admin/departments" className="btn-icon" style={{ background: 'white' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontWeight: 800 }}>{deptName} Department</h1>
                        <p className="text-muted">Overview of all active students and performance metrics</p>
                    </div>
                </div>
                <div className="dept-stats-pills" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="stat-pill">
                        <span className="label">Total Students</span>
                        <span className="value">{students.length}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="label">Avg. Attendance</span>
                        <span className="value">
                            {students.length > 0
                                ? Math.round(students.reduce((acc, s) => acc + s.attendancePercent, 0) / students.length)
                                : 0}%
                        </span>
                    </div>
                </div>
            </header>

            {/* Department Feature Tabs */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.75rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'students' ? '#f5f3ff' : 'transparent',
                        color: activeTab === 'students' ? '#7c3aed' : '#64748b',
                        fontWeight: activeTab === 'students' ? 800 : 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={18} />
                    Students Directory ({students.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'attendance' ? '#f5f3ff' : 'transparent',
                        color: activeTab === 'attendance' ? '#7c3aed' : '#64748b',
                        fontWeight: activeTab === 'attendance' ? 800 : 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <CalendarCheck size={18} />
                    Mark Department Attendance
                </button>
            </div>

            {activeTab === 'attendance' ? (
                <DepartmentAttendance forcedDepartment={deptName} embedded={true} />
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="card toolbar-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <div className="input-with-icon" style={{ maxWidth: '400px' }}>
                            <Search size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Search student by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Student List Table */}
                    <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="dept-data-table">
                                <thead>
                                    <tr>
                                        <th>Student Details</th>
                                        <th>Mobile Number</th>
                                        <th>Attendance %</th>
                                        <th>Overall Marks %</th>
                                        <th>Performance</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '4rem' }}>
                                                <div className="empty-state">
                                                    <User size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                    <p className="text-muted">No students found matching your search.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div className="avatar-sm" style={{
                                                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                            color: 'white',
                                                            fontWeight: 700
                                                        }}>
                                                            {(student.name?.[0] || 'S').toUpperCase()}
                                                        </div>
                                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{student.name}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                        <Phone size={14} />
                                                        {student.phone}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="percentage-cell">
                                                        <div className="progress-bg">
                                                            <div className="progress-fill" style={{
                                                                width: `${student.attendancePercent}%`,
                                                                background: student.attendancePercent >= 75 ? '#10b981' : '#f59e0b'
                                                            }}></div>
                                                        </div>
                                                        <span style={{ fontWeight: 800 }}>{student.attendancePercent}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="percentage-cell">
                                                        <div className="progress-bg">
                                                            <div className="progress-fill" style={{
                                                                width: `${student.avgMarks}%`,
                                                                background: student.avgMarks >= 80 ? '#7c3aed' : (student.avgMarks >= 50 ? '#6366f1' : '#ef4444')
                                                            }}></div>
                                                        </div>
                                                        <span style={{ fontWeight: 800 }}>{student.avgMarks}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{
                                                        background: student.avgMarks >= 80 ? '#f5f3ff' : (student.avgMarks >= 50 ? '#eef2ff' : '#fef2f2'),
                                                        color: student.avgMarks >= 80 ? '#7c3aed' : (student.avgMarks >= 50 ? '#6366f1' : '#ef4444'),
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800
                                                    }}>
                                                        {student.avgMarks >= 80 ? 'Excellent' : (student.avgMarks >= 50 ? 'Good' : 'Needs Focus')}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <Link to={`/admin/reports/${student.id}`} className="btn-view-report">
                                                        View Report
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .dept-details-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .stat-pill {
                    background: white;
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    border: 1px solid #f1f5f9;
                }

                .stat-pill .label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 0.5px;
                }

                .stat-pill .value {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #1e293b;
                }

                .dept-data-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .dept-data-table th {
                    text-align: left;
                    padding: 1.25rem;
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #f1f5f9;
                }

                .dept-data-table td {
                    padding: 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .dept-data-table tr:last-child td {
                    border-bottom: none;
                }

                .percentage-cell {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    min-width: 150px;
                }

                .progress-bg {
                    flex: 1;
                    height: 8px;
                    background: #f1f5f9;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .btn-view-report {
                    padding: 0.5rem 1rem;
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .btn-view-report:hover {
                    background: #7c3aed;
                    color: white;
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
                }

                .avatar-sm {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .percentage-cell {
                        min-width: 100px;
                    }
                    .percentage-cell .progress-bg {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default DepartmentDetails;
