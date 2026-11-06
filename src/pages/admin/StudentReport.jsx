import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, BookOpen, Award, BarChart2, TrendingUp, Clock, GraduationCap } from 'lucide-react';
import { api } from '../../services/api';

const StudentReport = () => {
    const { userId } = useParams();
    const [student, setStudent] = useState(null);
    const [results, setResults] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            try {
                // Optimized fetching: only get what we need
                const [studentData, studentResults, allAttendance] = await Promise.all([
                    api.getUserById(userId),
                    api.getResultsByUserId(userId),
                    api.getAttendance()
                ]);

                setStudent(studentData);
                setResults(studentResults);

                // Calculate attendance percentage
                let presentCount = 0;
                let totalDays = 0;
                Object.values(allAttendance).forEach(records => {
                    if (records && records[userId]) {
                        totalDays++;
                        if (records[userId] === 'present') presentCount++;
                    }
                });

                setAttendance({
                    present: presentCount,
                    total: totalDays,
                    percentage: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0
                });

            } catch (err) {
                console.error("Error fetching report data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, [userId]);

    if (loading) return <div className="flex-center" style={{ height: '80vh' }}><span className="spinner"></span></div>;
    if (!student) return <div className="text-center p-5">Student not found.</div>;

    const avgScore = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
        : 0;

    const highestScore = results.length > 0
        ? Math.max(...results.map(r => r.score))
        : 0;

    return (
        <div className="report-container animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Link to="/admin/users" className="btn-icon" style={{ background: 'white' }}>
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Personal Performance Report</h1>
                    <p className="text-muted">Detailed overview for {student.name}</p>
                </div>
            </header>

            <div className="report-grid">
                {/* Profile Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card profile-card">
                        <div className="profile-header text-center">
                            <img src={student.avatar} alt={student.name} className="avatar-lg" />
                            <h2>{student.name}</h2>
                            <span className="badge badge-student">{student.department || student.details?.department || 'General'} Student</span>
                        </div>

                        <div className="profile-details">
                            <div className="detail-item">
                                <Phone size={18} />
                                <span>{student.phone}</span>
                            </div>
                            <div className="detail-item">
                                <User size={18} />
                                <span>ID: {student.id}</span>
                            </div>
                            <div className="detail-item">
                                <Calendar size={18} />
                                <span>Joined: {new Date(parseInt(student.id) || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Education Card */}
                    <div className="card profile-card">
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GraduationCap size={20} color="var(--color-primary)" /> Education
                        </h3>
                        <div className="profile-details" style={{ border: 'none', paddingTop: 0 }}>
                            <div className="education-block">
                                <div className="edu-main">{student.details?.degreeCompleted || 'Degree N/A'}</div>
                                <div className="edu-sub">{student.details?.collegeName || 'College N/A'}</div>
                                <div className="edu-stat">CGPA: <strong>{student.details?.cgpa || '-'}</strong></div>
                            </div>

                            <div className="education-divider"></div>

                            <div className="grid-cols-2">
                                <div className="education-block">
                                    <div className="edu-label">HSE (12th)</div>
                                    <div className="edu-main" style={{ fontSize: '0.9rem' }}>{student.details?.hsePercentage || '0'}%</div>
                                    <div className="edu-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.details?.hseSchool || '-'}</div>
                                </div>
                                <div className="education-block">
                                    <div className="edu-label">SSLC (10th)</div>
                                    <div className="edu-main" style={{ fontSize: '0.9rem' }}>{student.details?.sslcPercentage || '0'}%</div>
                                    <div className="edu-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.details?.sslcSchool || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="stats-section">
                    <div className="grid-cols-3">
                        <div className="card stat-card glow-primary">
                            <div className="stat-icon"><Award size={24} /></div>
                            <div className="stat-info">
                                <h3>{avgScore}%</h3>
                                <p>Average Score</p>
                            </div>
                        </div>
                        <div className="card stat-card glow-secondary">
                            <div className="stat-icon"><TrendingUp size={24} /></div>
                            <div className="stat-info">
                                <h3>{results.length}</h3>
                                <p>Exams Taken</p>
                            </div>
                        </div>
                        <div className="card stat-card glow-success">
                            <div className="stat-icon"><Calendar size={24} /></div>
                            <div className="stat-info">
                                <h3>{attendance.percentage}%</h3>
                                <p>Attendance</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Exam History */}
                    <div className="card mt-4" style={{ padding: '1.5rem' }}>
                        <div className="flex-between mb-4">
                            <h3 className="flex-center gap-2"><Clock size={20} /> Recent Exam Attempts</h3>
                        </div>
                        {results.length === 0 ? (
                            <div className="text-center p-4 text-muted">No exams taken yet.</div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Exam Name</th>
                                        <th>Date</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...results].reverse().map((res, i) => (
                                        <tr key={i}>
                                            <td>{res.examTitle}</td>
                                            <td>{new Date(res.timestamp).toLocaleDateString()}</td>
                                            <td>
                                                <div className="flex-center gap-2">
                                                    <span className="progress-bg" style={{ width: '60px' }}>
                                                        <span className="progress-fill" style={{ width: `${res.score}%`, background: res.score >= 50 ? '#10b981' : '#ef4444' }}></span>
                                                    </span>
                                                    <span style={{ fontWeight: 600 }}>{res.score}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${res.score >= 50 ? 'badge-success' : 'badge-danger'}`}>
                                                    {res.score >= 50 ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .report-grid {
                    display: grid;
                    grid-template-columns: 320px 1fr;
                    gap: 2rem;
                }

                .profile-card {
                    height: fit-content;
                    padding: 2rem;
                }

                .avatar-lg {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    margin-bottom: 1.5rem;
                    border: 4px solid var(--color-primary-light);
                    box-shadow: var(--shadow-glow);
                }

                .profile-details {
                    margin-top: 2rem;
                    border-top: 1px solid var(--color-border);
                    padding-top: 1.5rem;
                }

                .education-block {
                    margin-bottom: 1rem;
                }
                .edu-label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--color-text-muted);
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                .edu-main {
                    font-weight: 700;
                    color: var(--color-text-main);
                    font-size: 1.1rem;
                }
                .edu-sub {
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                }
                .edu-stat {
                    font-size: 0.85rem;
                    margin-top: 0.25rem;
                    color: var(--color-text-main);
                }
                .education-divider {
                    height: 1px;
                    background: var(--color-border);
                    margin: 1.5rem 0;
                }
                .grid-cols-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .detail-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    color: var(--color-text-main);
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .stat-card:hover { transform: translateY(-5px); }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(var(--color-primary-rgb), 0.1);
                    color: var(--color-primary);
                }

                .glow-primary .stat-icon { background: #e0e7ff; color: #4338ca; }
                .glow-secondary .stat-icon { background: #fce7f3; color: #be185d; }
                .glow-success .stat-icon { background: #d1fae5; color: #059669; }

                .stat-info h3 { font-size: 1.5rem; margin-bottom: 0.2rem; }
                .stat-info p { color: var(--color-text-muted); font-size: 0.85rem; }

                .grid-cols-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }

                .badge-success { background: #d1fae5; color: #065f46; }
                .badge-danger { background: #fee2e2; color: #991b1b; }

                @media (max-width: 992px) {
                    .report-grid { grid-template-columns: 1fr; }
                    .grid-cols-3 { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default StudentReport;
