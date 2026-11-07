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

    // Punch state
    const [isPunching, setIsPunching] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
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

    const handleMarkAttendance = async () => {
        setIsPunching(true);
        setPunchStatus(null);
        try {
            const allAttendance = await api.getAttendance();
            const existingDay = allAttendance[todayStr] || {};
            await api.saveAttendance(todayStr, {
                ...existingDay,
                [user.id]: 'Present'
            });

            try {
                await api.createSecurityLog?.({
                    userId: user.id,
                    eventType: 'ATTENDANCE_MARKED',
                    status: 'SUCCESS',
                    details: `Student marked attendance for ${todayStr}`,
                    userAgent: navigator.userAgent
                });
            } catch (_) {}

            setTodayMarked(true);
            setTodayRecord('Present');
            setPunchStatus({
                type: 'success',
                message: 'Attendance marked successfully for today!'
            });

            await loadData();
        } catch (err) {
            console.error("Attendance marking error:", err);
            setPunchStatus({
                type: 'error',
                message: 'Failed to record attendance. Please check network connection.'
            });
        } finally {
            setIsPunching(false);
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
                        Daily Attendance & Academic Record
                    </p>
                </div>
            </div>

            {/* DAILY ATTENDANCE MARKING CARD */}
            <div className="card glass-panel" style={{
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid #e0e7ff',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, #ffffff, #f5f3ff)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Calendar size={22} color="var(--color-primary)" />
                            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1e293b' }}>Mark Daily Attendance</h2>
                        </div>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Record your presence for today ({new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })})
                        </p>
                    </div>

                    <div style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        background: todayMarked ? '#dcfce7' : '#fef3c7',
                        color: todayMarked ? '#166534' : '#92400e',
                        border: `1px solid ${todayMarked ? '#86efac' : '#fde68a'}`
                    }}>
                        Today ({todayStr}): {todayMarked ? `Marked (${todayRecord})` : 'Pending Check-In'}
                    </div>
                </div>

                {/* Status Feedback Notification */}
                {punchStatus && (
                    <div style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        background: punchStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: punchStatus.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${punchStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                    }}>
                        {punchStatus.type === 'success' ? <CheckCircle size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
                        <div>{punchStatus.message}</div>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleMarkAttendance}
                        disabled={isPunching || todayMarked}
                        className={`btn btn-primary ${isPunching ? 'loading' : ''}`}
                        style={{
                            padding: '0.9rem 2.2rem',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            background: todayMarked ? '#94a3b8' : 'var(--color-primary)'
                        }}
                    >
                        <CheckCircle size={18} />
                        {isPunching ? 'Recording Attendance...' : todayMarked ? 'Attendance Marked for Today' : 'Mark Present for Today'}
                    </button>

                    {todayMarked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                            <ShieldCheck size={16} color="#10b981" />
                            <span>Verified in Institutional Record</span>
                        </div>
                    )}
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
                                        No attendance records found. Click the button above to mark today's attendance.
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
