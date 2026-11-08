import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Users, CheckCircle, Award, Calendar, Trash2, ClipboardList, Send, Bell, 
    UserCheck, Shield, Smartphone, PlusCircle, ArrowRight, BookOpen, TrendingUp,
    Building2, Activity, Clock, BarChart2, FileUp, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { isWindowsPlatform } from '../utils/platform';

const AcademyActionHub = ({ user }) => {
    const rawRole = String(user?.role || '').toLowerCase().trim();
    const isAdmin = rawRole === 'admin';
    const isStaff = rawRole === 'staff' || rawRole === 'faculty';
    const deptDisplay = user?.department || user?.details?.department || 'Department';

    return (
        <section className="dashboard-hero-section">
            <div className="hero-welcome-bar">
                <div className="welcome-text">
                    <h2 className="welcome-title">
                        Welcome back, <span>{user?.name}</span>
                    </h2>
                    <p className="welcome-subtitle">
                        Spoko Academy Institutional Command Portal • <strong className="role-tag">{isStaff ? `${deptDisplay} Faculty` : user?.role}</strong>
                    </p>
                </div>
                <div className="system-status-indicator">
                    <span className="pulse-indicator" />
                    <Shield size={14} className="shield-icon" />
                    <span>Academic Cloud Active</span>
                </div>
            </div>

            <div className="quick-action-tiles-grid">
                {isAdmin ? (
                    <>
                        <Link to="/admin/create-exam" className="action-tile">
                            <div className="tile-icon-box bg-indigo">
                                <PlusCircle size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Create Assessment</h4>
                                <p>Author new exam paper & time limits</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/admin/users" className="action-tile">
                            <div className="tile-icon-box bg-sky">
                                <Users size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Student Directory</h4>
                                <p>Manage student profiles & credentials</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/admin/attendance" className="action-tile">
                            <div className="tile-icon-box bg-emerald">
                                <Calendar size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Attendance Oversight</h4>
                                <p>Student attendance roster & records</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/admin/reports" className="action-tile">
                            <div className="tile-icon-box bg-violet">
                                <TrendingUp size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Performance Reports</h4>
                                <p>Dossiers, charts & exportable stats</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>
                    </>
                ) : isStaff ? (
                    <>
                        <Link to="/staff/students" className="action-tile">
                            <div className="tile-icon-box bg-sky">
                                <Users size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Department Students</h4>
                                <p>Roster of {user?.department || 'your'} students</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/staff/import-questions" className="action-tile">
                            <div className="tile-icon-box bg-indigo">
                                <FileUp size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Import Questions (PDF)</h4>
                                <p>Bulk import PDF questions for {user?.department}</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/staff/questions" className="action-tile">
                            <div className="tile-icon-box bg-violet">
                                <BookOpen size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Question Bank</h4>
                                <p>Manage {user?.department} curated questions</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/staff/results" className="action-tile">
                            <div className="tile-icon-box bg-emerald">
                                <TrendingUp size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Student Results</h4>
                                <p>Department scores and feedback</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/exam-hub" className="action-tile">
                            <div className="tile-icon-box bg-indigo">
                                <ClipboardList size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Assessment Hub</h4>
                                <p>Active departmental tests & mocks</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/history" className="action-tile">
                            <div className="tile-icon-box bg-emerald">
                                <CheckCircle size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Exam Results</h4>
                                <p>Scorecards, reviews & feedback</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/my-attendance" className="action-tile">
                            <div className="tile-icon-box bg-amber">
                                <Calendar size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Daily Attendance</h4>
                                <p>View status & mark attendance</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>

                        <Link to="/settings" className="action-tile">
                            <div className="tile-icon-box bg-violet">
                                <UserCheck size={24} />
                            </div>
                            <div className="tile-content">
                                <h4>Profile & Security</h4>
                                <p>Account password & SIM binding info</p>
                            </div>
                            <ArrowRight size={18} className="tile-arrow" />
                        </Link>
                    </>
                )}
            </div>
        </section>
    );
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const rawRole = String(user?.role || '').toLowerCase().trim();
    const isAdmin = rawRole === 'admin';
    const isStaff = rawRole === 'staff' || rawRole === 'faculty';
    const isStudent = !isAdmin && !isStaff;

    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resultsPromise = isStudent
                    ? api.getResultsByUserId(user?.id)
                    : api.getResults();

                const shouldFetchUsers = isAdmin || isStaff;

                const [examsData, resultsData, usersData, attendanceData, deptsData] = await Promise.all([
                    api.getExams().catch(() => []),
                    resultsPromise.catch(() => []),
                    shouldFetchUsers ? api.getUsers().catch(() => []) : Promise.resolve([]),
                    api.getAttendance().catch(() => ({})),
                    api.getDepartments().catch(() => [])
                ]);

                setExams(examsData || []);
                setResults(resultsData || []);
                setDepartments(deptsData || []);
                setAttendance(attendanceData || {});
                if (shouldFetchUsers) {
                    setUsersList(usersData || []);
                }

                const announcementsData = await api.getAnnouncements().catch(() => []);
                setAnnouncements(announcementsData || []);
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            }
        };
        fetchData();
    }, [user?.id, rawRole, isAdmin, isStaff, isStudent]);

    const deleteExam = async (id) => {
        if (confirm('Are you sure you want to delete this assessment?')) {
            try {
                await api.deleteExam(id);
                setExams(exams.filter(e => e.id !== id));
            } catch (e) {
                console.error("Delete failed", e);
            }
        }
    };

    return (
        <div className="dashboard-page-container animate-fade-in">
            <AcademyActionHub user={user} />

            {isAdmin && (
                <AdminView 
                    exams={exams} 
                    results={results} 
                    users={usersList} 
                    departments={departments}
                    attendance={attendance} 
                    onDelete={deleteExam} 
                    announcements={announcements} 
                    setAnnouncements={setAnnouncements} 
                />
            )}

            {isStaff && (
                <StaffView 
                    user={user}
                    users={usersList}
                    exams={exams}
                    results={results}
                    departments={departments}
                    announcements={announcements}
                    attendance={attendance}
                />
            )}

            {isStudent && (
                <StudentView 
                    exams={exams} 
                    results={results} 
                    user={user} 
                    announcements={announcements} 
                    attendance={attendance}
                />
            )}

            <style>{`
                .dashboard-page-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .dashboard-hero-section {
                    background-color: #ffffff;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.75rem 2rem;
                    box-shadow: var(--shadow-sm);
                }

                .hero-welcome-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid var(--border-color-light);
                }

                .welcome-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-main);
                    letter-spacing: -0.02em;
                    margin: 0;
                }

                .welcome-title span {
                    color: var(--color-primary);
                }

                .welcome-subtitle {
                    font-size: 0.85rem;
                    color: var(--slate-500);
                    margin: 0.25rem 0 0;
                }

                .role-tag {
                    color: var(--color-primary);
                    text-transform: uppercase;
                    font-weight: 700;
                }

                .system-status-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.4rem 0.85rem;
                    border-radius: var(--radius-full);
                    background-color: var(--success-bg);
                    border: 1px solid var(--success-border);
                    color: var(--success-text);
                    font-size: 0.78rem;
                    font-weight: 700;
                }

                .pulse-indicator {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background-color: var(--success-solid);
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
                }

                /* Quick Action Tiles */
                .quick-action-tiles-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                    gap: 1rem;
                }

                .action-tile {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.15rem 1.25rem;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    background-color: var(--slate-50);
                    text-decoration: none;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .action-tile:hover {
                    background-color: #ffffff;
                    border-color: var(--slate-300);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .tile-icon-box {
                    width: 46px;
                    height: 46px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .bg-indigo { background-color: #eef2ff; color: #4f46e5; }
                .bg-sky { background-color: #f0f9ff; color: #0284c7; }
                .bg-emerald { background-color: #ecfdf5; color: #059669; }
                .bg-violet { background-color: #f5f3ff; color: #7c3aed; }
                .bg-amber { background-color: #fffbeb; color: #d97706; }

                .tile-content {
                    flex: 1;
                    min-width: 0;
                }

                .tile-content h4 {
                    font-size: 0.95rem;
                    font-weight: 750;
                    color: var(--text-main);
                    margin: 0 0 0.15rem;
                }

                .tile-content p {
                    font-size: 0.78rem;
                    color: var(--slate-500);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .tile-arrow {
                    color: var(--slate-400);
                    transition: transform 0.15s ease;
                }

                .action-tile:hover .tile-arrow {
                    transform: translateX(3px);
                    color: var(--color-primary);
                }

                /* 2-Column Responsive Layout */
                .dashboard-content-columns {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 1.75rem;
                    align-items: start;
                }

                .feed-column-primary {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    min-width: 0;
                }

                .feed-column-aside {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                }

                .section-header-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                }

                .section-header-row h3 {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--text-main);
                    letter-spacing: -0.01em;
                }

                @media (max-width: 1080px) {
                    .dashboard-content-columns {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

const AdminView = ({ exams, results, users, departments = [], attendance, onDelete, announcements, setAnnouncements }) => {
    const totalStudents = users.filter(u => u.role === 'student').length;
    const avgScore = results.length > 0 ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length) : 0;
    const allAttendanceValues = Object.values(attendance).flatMap(dayRecords => Object.values(dayRecords));
    const presentCount = allAttendanceValues.filter(status => status && status.toLowerCase() === 'present').length;
    const attendancePercentage = allAttendanceValues.length > 0 ? Math.round((presentCount / allAttendanceValues.length) * 100) : 0;

    const [isSending, setIsSending] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({
        target: 'all',
        message: '',
        selectedStudent: ''
    });

    const handleSendAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementForm.message.trim()) return;

        setIsSending(true);
        try {
            const newAnnouncement = {
                id: Date.now(),
                sender: 'Administrator',
                target: announcementForm.target,
                targetId: announcementForm.target === 'selective' ? announcementForm.selectedStudent : null,
                message: announcementForm.message,
                timestamp: new Date().toISOString()
            };

            await api.createAnnouncement(newAnnouncement);
            setAnnouncements([...announcements, newAnnouncement]);
            setAnnouncementForm({ target: 'all', message: '', selectedStudent: '' });
            alert('Official announcement published to student feeds!');
        } catch (err) {
            alert('Failed to broadcast announcement. Please verify server connection.');
        } finally {
            setIsSending(false);
        }
    };

    const deptList = (departments && departments.length > 0)
        ? departments.map(d => d.name)
        : ['Railway', 'SSC', 'General'];

    const departmentData = deptList.map(dept => ({
        dept,
        count: users.filter(u => u.role === 'student' && (u.department === dept || u.details?.department === dept)).length
    }));

    return (
        <div className="admin-views-root">
            {/* KPI Summary Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{totalStudents}</h3>
                        <p>Total Students Enrolled</p>
                    </div>
                    <div className="stat-icon bg-indigo">
                        <Users size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{attendancePercentage}%</h3>
                        <p>Institution Attendance</p>
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${attendancePercentage}%`, backgroundColor: '#10b981' }} />
                        </div>
                    </div>
                    <div className="stat-icon bg-emerald">
                        <Calendar size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{exams.length}</h3>
                        <p>Active Assessments</p>
                    </div>
                    <div className="stat-icon bg-sky">
                        <ClipboardList size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{avgScore}%</h3>
                        <p>Class Average Score</p>
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${avgScore}%`, backgroundColor: '#4f46e5' }} />
                        </div>
                    </div>
                    <div className="stat-icon bg-violet">
                        <Award size={26} />
                    </div>
                </div>
            </div>

            <div className="dashboard-content-columns">
                <div className="feed-column-primary">
                    {/* Official Broadcast Form */}
                    <section className="card">
                        <div className="section-header-row">
                            <h3>📢 Publish Announcement</h3>
                            <span className="badge badge-primary">Institutional Broadcast</span>
                        </div>
                        <form onSubmit={handleSendAnnouncement}>
                            <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'all', label: 'All Members', icon: <Bell size={15} /> },
                                    { id: 'students', label: 'All Students', icon: <Users size={15} /> },
                                    { id: 'selective', label: 'Specific Student', icon: <UserCheck size={15} /> }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        className={`btn btn-sm ${announcementForm.target === opt.id ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setAnnouncementForm({ ...announcementForm, target: opt.id })}
                                    >
                                        {opt.icon}
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            {announcementForm.target === 'selective' && (
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Target Student</label>
                                    <select
                                        className="input-field"
                                        value={announcementForm.selectedStudent}
                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, selectedStudent: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a student...</option>
                                        {users.filter(u => u.role === 'student').map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.department || s.details?.department || 'General'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Announcement Message</label>
                                <textarea
                                    className="input-field"
                                    placeholder="Write formal notification message..."
                                    rows="3"
                                    value={announcementForm.message}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                    required
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={isSending}>
                                    <Send size={16} />
                                    <span>{isSending ? 'Transmitting...' : 'Broadcast Announcement'}</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Department Distribution Grid */}
                    <section>
                        <div className="section-header-row">
                            <h3>Academic Department Distribution</h3>
                            <Link to="/admin/users" className="btn btn-outline btn-sm">Manage Directory</Link>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            {departmentData.map((d, i) => (
                                <Link to={`/admin/department/${d.dept}`} key={i} className="card" style={{ textDecoration: 'none', transition: 'all 0.2s ease' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span className="badge badge-neutral">{d.dept}</span>
                                        <Building2 size={18} color="#64748b" />
                                    </div>
                                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.2rem', color: 'var(--text-main)' }}>
                                        {d.count}
                                    </h3>
                                    <p className="text-muted" style={{ margin: 0 }}>Active Students Enrolled</p>
                                    <div className="progress-bar-mini" style={{ marginTop: '0.75rem' }}>
                                        <div 
                                            className="progress-fill" 
                                            style={{ 
                                                width: `${totalStudents > 0 ? (d.count / totalStudents) * 100 : 0}%`, 
                                                backgroundColor: ['#4f46e5', '#059669', '#d97706', '#7c3aed'][i % 4] 
                                            }} 
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Recent Exam Feed */}
                    <section>
                        <div className="section-header-row">
                            <h3>Assessment Registry</h3>
                            <Link to="/admin/create-exam" className="btn btn-primary btn-sm">Author Exam</Link>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {exams.length === 0 ? (
                                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                                    <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontWeight: 600 }}>No assessment papers registered yet.</p>
                                </div>
                            ) : (
                                <div className="table-responsive-wrapper" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Exam Title</th>
                                                <th>Department</th>
                                                <th>Duration</th>
                                                <th>Questions</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exams.slice(0, 6).map((exam) => (
                                                <tr key={exam.id}>
                                                    <td>
                                                        <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{exam.title}</strong>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{exam.category}</div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-neutral">{exam.department}</span>
                                                    </td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                                                            <Clock size={14} color="#64748b" /> {exam.duration}m
                                                        </span>
                                                    </td>
                                                    <td>{exam.questions?.length || 0} items</td>
                                                    <td>
                                                        <button 
                                                            onClick={() => onDelete(exam.id)}
                                                            className="btn-icon-sm"
                                                            style={{ color: '#ef4444' }}
                                                            title="Delete assessment"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Aside Sidebar */}
                <div className="feed-column-aside">
                    <div className="card">
                        <div className="section-header-row" style={{ marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0 }}>System Health</h4>
                            <span className="badge badge-success">Optimal</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
                                    <span>Cloud API Latency</span>
                                    <span style={{ color: '#059669' }}>42ms (Render)</span>
                                </div>
                                <div className="progress-bar-mini">
                                    <div className="progress-fill" style={{ width: '92%', backgroundColor: '#059669' }} />
                                </div>
                            </div>

                            <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
                                    <span>Database Storage</span>
                                    <span style={{ color: '#4f46e5' }}>Active</span>
                                </div>
                                <div className="progress-bar-mini">
                                    <div className="progress-fill" style={{ width: '65%', backgroundColor: '#4f46e5' }} />
                                </div>
                            </div>
                        </div>

                        <Link to="/admin/audit-logs" className="btn btn-outline btn-sm full-width" style={{ marginTop: '1.25rem' }}>
                            View Security Audit Logs
                        </Link>
                    </div>

                    <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                            <Award size={20} color="#166534" />
                            <h4 style={{ margin: 0, color: '#166534', fontSize: '0.92rem' }}>Academic Directive</h4>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#15803d', margin: 0, lineHeight: 1.5 }}>
                            All departments are operating under the 2026 Academic Curriculum. Daily attendance records and academic progress are regularly updated.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentView = ({ exams, results, user, announcements, attendance = {} }) => {
    const myDept = user?.department || user?.details?.department || 'General';
    const recommended = exams.filter(e => !e.department || e.department === 'All' || e.department === myDept).slice(0, 4);
    const myResults = results.slice(0, 5);
    const completedCount = results.length;
    const avgScore = completedCount > 0 ? Math.round(results.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedCount) : 0;

    const myAttendanceDays = Object.values(attendance).map(day => day[user?.id]).filter(Boolean);
    const myPresentCount = myAttendanceDays.filter(st => st.toLowerCase() === 'present').length;
    const attendanceRate = myAttendanceDays.length > 0 ? Math.round((myPresentCount / myAttendanceDays.length) * 100) : 100;

    const myAnnouncements = announcements.filter(a =>
        a.target === 'all' ||
        a.target === 'students' ||
        (a.target === 'selective' && a.targetId === user?.id)
    );

    return (
        <div className="student-views-root">
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{myDept}</h3>
                        <p>Department Major</p>
                    </div>
                    <div className="stat-icon bg-indigo">
                        <Award size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{completedCount}</h3>
                        <p>Completed Tests</p>
                    </div>
                    <div className="stat-icon bg-emerald">
                        <CheckCircle size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{avgScore}%</h3>
                        <p>Average Exam Score</p>
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${avgScore}%`, backgroundColor: '#4f46e5' }} />
                        </div>
                    </div>
                    <div className="stat-icon bg-sky">
                        <BarChart2 size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{attendanceRate}%</h3>
                        <p>Attendance Rate</p>
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${attendanceRate}%`, backgroundColor: '#10b981' }} />
                        </div>
                    </div>
                    <div className="stat-icon bg-violet">
                        <Calendar size={26} />
                    </div>
                </div>
            </div>

            {/* Official Announcements */}
            {myAnnouncements.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #4f46e5' }}>
                    <div className="section-header-row" style={{ marginBottom: '0.75rem' }}>
                        <h3>🔔 Official Institutional Broadcasts</h3>
                        <span className="badge badge-primary">{myAnnouncements.length} New</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {myAnnouncements.slice().reverse().map(a => (
                            <div key={a.id} style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                                        {a.target === 'selective' ? 'Direct Notice' : 'Campus Bulletin'}
                                    </span>
                                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                        {new Date(a.timestamp || a.createdAt || Date.now()).toLocaleDateString()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: '#1e293b' }}>{a.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-content-columns">
                <div className="feed-column-primary">
                    <section>
                        <div className="section-header-row">
                            <h3>Scheduled Assessments for You</h3>
                            <Link to="/exam-hub" className="btn btn-primary btn-sm">Browse All Exams</Link>
                        </div>
                        {recommended.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                                <h4 style={{ margin: '0 0 0.35rem' }}>No pending exams found</h4>
                                <p className="text-muted" style={{ margin: 0 }}>You are all caught up on departmental tests.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {recommended.map(exam => (
                                    <div key={exam.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <span className="badge badge-neutral">{exam.department || 'General'}</span>
                                                <span className="text-muted" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock size={13} /> {exam.duration}m
                                                </span>
                                            </div>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                                                {exam.title}
                                            </h4>
                                            <p className="text-muted" style={{ margin: '0 0 1.25rem' }}>
                                                {exam.questions?.length || 0} Questions • {exam.category || 'Standard Test'}
                                            </p>
                                        </div>
                                        <Link to={`/exam/${exam.id}`} className="btn btn-primary btn-sm full-width">
                                            Start Assessment
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <div className="feed-column-aside">
                    <div className="card">
                        <div className="section-header-row" style={{ marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0 }}>Recent Scores</h4>
                            <Link to="/history" className="text-primary" style={{ fontSize: '0.78rem', fontWeight: 700 }}>View All</Link>
                        </div>
                        {myResults.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                                No completed exams yet.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {myResults.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                                            <strong style={{ fontSize: '0.85rem', color: '#1e293b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.examTitle || `Assessment #${r.examId}`}
                                            </strong>
                                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                {new Date(r.timestamp || r.date || Date.now()).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className={`badge ${r.score >= 50 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.82rem' }}>
                                            {r.score}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StaffView = ({ user, users = [], exams = [], results = [], departments = [], announcements = [], attendance = {} }) => {
    const myDept = user?.department || user?.details?.department || 'General';
    const deptClean = String(myDept || '').toLowerCase().trim().replace(/s$/, '');
    
    const safeUsers = Array.isArray(users) ? users : [];
    const deptStudents = safeUsers.filter(u => {
        if (!u || String(u.role).toLowerCase() !== 'student') return false;
        const studentDept = String(u.department || u.details?.department || '').toLowerCase().trim().replace(/s$/, '');
        return studentDept === deptClean || 
               (deptClean === 'gd' && studentDept.includes('gd')) || 
               (deptClean.includes('gd') && studentDept === 'gd') ||
               (studentDept && studentDept === String(myDept).toLowerCase().trim());
    });

    const [deptQuestionsCount, setDeptQuestionsCount] = useState(0);

    useEffect(() => {
        let isMounted = true;
        api.getQuestions().then(qs => {
            if (!isMounted) return;
            const list = Array.isArray(qs) ? qs : Array.isArray(qs?.questions) ? qs.questions : [];
            const count = list.filter(q => {
                if (!q) return false;
                const qDept = String(q.department || '').toLowerCase().trim().replace(/s$/, '');
                const qSub = String(q.subject || '').toLowerCase().trim().replace(/s$/, '');
                return qDept === deptClean || qSub === deptClean || (deptClean && (qDept.includes(deptClean) || qSub.includes(deptClean)));
            }).length;
            setDeptQuestionsCount(count);
        }).catch(() => {});
        return () => { isMounted = false; };
    }, [myDept, deptClean]);

    // Results of department students
    const deptStudentIds = new Set(deptStudents.map(s => String(s.id)));
    const safeResults = Array.isArray(results) ? results : [];
    const deptResults = safeResults.filter(r => r && (deptStudentIds.has(String(r.userId)) || deptStudentIds.has(String(r.studentId))));

    const deptAvgScore = deptResults.length > 0
        ? Math.round(deptResults.reduce((acc, r) => {
            const pct = Number(r.percentage);
            if (!isNaN(pct) && pct > 0) return acc + pct;
            const score = Number(r.score) || 0;
            const total = Number(r.totalMarks) || 100;
            return acc + (score / total) * 100;
        }, 0) / deptResults.length)
        : 0;

    const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
    const myAnnouncements = safeAnnouncements.filter(a =>
        a && (
            a.target === 'all' ||
            a.target === 'staff' ||
            String(a.department || '').toLowerCase() === String(myDept || '').toLowerCase()
        )
    );

    return (
        <div className="student-views-root">
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{myDept}</h3>
                        <p>Assigned Department</p>
                    </div>
                    <div className="stat-icon bg-indigo">
                        <Building2 size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{deptStudents.length}</h3>
                        <p>My Department Students</p>
                    </div>
                    <div className="stat-icon bg-sky">
                        <Users size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{deptQuestionsCount}</h3>
                        <p>Questions in Bank</p>
                    </div>
                    <div className="stat-icon bg-violet">
                        <BookOpen size={26} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{deptAvgScore}%</h3>
                        <p>Dept Average Score</p>
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${deptAvgScore}%`, backgroundColor: '#10b981' }} />
                        </div>
                    </div>
                    <div className="stat-icon bg-emerald">
                        <TrendingUp size={26} />
                    </div>
                </div>
            </div>

            {/* Official Announcements */}
            {myAnnouncements.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #4f46e5' }}>
                    <div className="section-header-row" style={{ marginBottom: '0.75rem' }}>
                        <h3>🔔 Department & Institutional Broadcasts</h3>
                        <span className="badge badge-primary">{myAnnouncements.length} New</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {myAnnouncements.map((ann, idx) => (
                            <div key={idx} style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>{ann.title || ann.message || 'Department Broadcast'}</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(ann.date || ann.createdAt || ann.timestamp || Date.now()).toLocaleDateString()}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>{ann.content || ann.message || ''}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Department Students Roster Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>My Department Students ({deptStudents.length})</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Students enrolled in {myDept} Department</p>
                    </div>
                    <Link to="/staff/students" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        View All Students <ArrowRight size={14} />
                    </Link>
                </div>

                {deptStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                        <p style={{ color: '#64748b', margin: 0 }}>No students registered under {myDept} Department yet.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STUDENT</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>CONTACT</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>BATCH</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>STATUS</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deptStudents.slice(0, 5).map(student => (
                                    <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <img
                                                    src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=e2e8f0&color=475569`}
                                                    alt={student.name}
                                                    style={{ width: '34px', height: '34px', borderRadius: '50%' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {student.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#334155' }}>{student.phone || '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{student.email || student.details?.email || '—'}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                            {student.details?.batch || student.batch || '2026-A'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span className={`badge ${(student.status || 'Active').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                                                {student.status || 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <Link
                                                to={`/admin/reports/${student.id}`}
                                                className="btn btn-outline btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                                            >
                                                <Eye size={13} /> View Report
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Question Import Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
                borderRadius: '16px',
                padding: '1.75rem 2rem',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>{myDept} Question Portal</span>
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>Import Question Bank Papers</h2>
                    <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.9rem', maxWidth: '500px' }}>
                        Upload PDF exam question sheets directly into the {myDept} Question Bank with automatic question & option detection.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to="/staff/questions" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                        <BookOpen size={16} /> Open Question Bank
                    </Link>
                    <Link to="/staff/import-questions" className="btn btn-primary" style={{ background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileUp size={16} /> Import PDF Questions
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
