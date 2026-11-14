import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const StudentAttendance = () => {
    const { user } = useAuth();
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const [todayMarked, setTodayMarked] = useState(false);
    const [todayRecord, setTodayRecord] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allAttendance = await api.getAttendance();
            const myRecords = [];
            let p = 0, a = 0, l = 0;

            Object.keys(allAttendance).sort().reverse().forEach(date => {
                const status = allAttendance[date]?.[user.id];
                if (status) {
                    myRecords.push({ date, status });
                    if (status.toLowerCase() === 'present') p++;
                    else if (status.toLowerCase() === 'absent') a++;
                    else if (status.toLowerCase() === 'leave') l++;
                }
            });

            setAttendanceRecords(myRecords);
            setStats({ present: p, absent: a, leave: l, total: myRecords.length });

            // Check if already marked today
            if (allAttendance[todayStr] && allAttendance[todayStr][user.id]) {
                setTodayMarked(true);
                setTodayRecord(allAttendance[todayStr][user.id]);
            } else {
                setTodayMarked(false);
                setTodayRecord(null);
            }
        } catch (e) {
            console.error("Load attendance error:", e);
        } finally {
            setLoading(false);
        }
    };

    const percentage = stats.total === 0 ? 100 : Math.round((stats.present / stats.total) * 100);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 style={{ margin: 0 }}>My Attendance</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        Official Institutional Daily Attendance Roster
                    </p>
                </div>
            </div>

            {/* OFFICIAL ATTENDANCE OVERSIGHT CARD */}
            <div className="card glass-panel" style={{
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid #e0e7ff',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                            <Calendar size={22} color="var(--color-primary)" />
                            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1e293b' }}>Today's Attendance Status</h2>
                        </div>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    <div style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '25px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        background: todayRecord?.toLowerCase() === 'present' ? '#dcfce7' : todayRecord?.toLowerCase() === 'leave' ? '#fef3c7' : todayRecord?.toLowerCase() === 'absent' ? '#fee2e2' : '#f1f5f9',
                        color: todayRecord?.toLowerCase() === 'present' ? '#166534' : todayRecord?.toLowerCase() === 'leave' ? '#92400e' : todayRecord?.toLowerCase() === 'absent' ? '#991b1b' : '#475569',
                        border: `1px solid ${todayRecord?.toLowerCase() === 'present' ? '#86efac' : todayRecord?.toLowerCase() === 'leave' ? '#fde68a' : todayRecord?.toLowerCase() === 'absent' ? '#fca5a5' : '#cbd5e1'}`
                    }}>
                        Status: {todayRecord ? todayRecord : 'Not Marked Yet'}
                    </div>
                </div>

                <div style={{
                    padding: '1rem 1.25rem',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: '#334155',
                    fontSize: '0.88rem'
                }}>
                    <ShieldCheck size={22} color="#4f46e5" style={{ flexShrink: 0 }} />
                    <div>
                        <strong>Institutional Attendance Policy:</strong> Attendance is officially marked and verified by your Department Faculty and Academic Administration. Students cannot mark attendance themselves.
                    </div>
                </div>
            </div>

            {/* Attendance Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                    <div className="stat-info">
                        <h3>{percentage}%</h3>
                        <p style={{ opacity: 0.9 }}>Attendance Rate</p>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><CheckCircle /></div>
                    <div className="stat-info">
                        <h3>{stats.present}</h3>
                        <p className="text-muted">Present Days</p>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}><XCircle /></div>
                    <div className="stat-info">
                        <h3>{stats.absent}</h3>
                        <p className="text-muted">Absent Days</p>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}><Calendar /></div>
                    <div className="stat-info">
                        <h3>{stats.leave}</h3>
                        <p className="text-muted">Approved Leaves</p>
                    </div>
                </div>
            </div>

            {/* Attendance Log Table */}
            <div className="card glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#1e293b' }}>Attendance History</h3>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                                        No attendance records found yet. Attendance will appear here once recorded by your department.
                                    </td>
                                </tr>
                            ) : attendanceRecords.map((record, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} className="text-muted" />
                                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge status-${record.status.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .status-present { background: #dcfce7; color: #166534; padding: 0.35rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
                .status-absent { background: #fee2e2; color: #991b1b; padding: 0.35rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
                .status-leave { background: #fef3c7; color: #92400e; padding: 0.35rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
            `}</style>
        </div>
    );
};

export default StudentAttendance;
