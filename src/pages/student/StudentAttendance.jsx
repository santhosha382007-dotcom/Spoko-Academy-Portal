import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, XCircle, AlertCircle, MapPin, Navigation, ShieldCheck, Building, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { isWindowsPlatform } from '../../utils/platform';

const StudentAttendance = () => {
    const { user } = useAuth();
    const isWindows = isWindowsPlatform();
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, total: 0 });
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    // Punch state
    const [isPunching, setIsPunching] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
    const [todayMarked, setTodayMarked] = useState(false);
    const [todayRecord, setTodayRecord] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    // If running on Windows PC, attendance system is disabled for students
    if (isWindows) {
        return (
            <div className="attendance-page-container" style={{ padding: '2rem 1rem' }}>
                <div className="card" style={{ maxWidth: '620px', margin: '3rem auto', textAlign: 'center', padding: '3rem 2rem', borderRadius: '24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08)' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.15)' }}>
                        <Smartphone size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>
                        Attendance Restricted to Mobile Application
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                        Per institution security policy, student attendance marking requires verified GPS geofencing and hardware SIM card validation.
                    </p>
                    <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <ShieldCheck size={18} color="#10b981" /> Mobile Hardware Required:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
                            <li>Windows PC attendance punch is disabled to prevent proxy attendance.</li>
                            <li>Please use the <strong>Spoko Academy Mobile APK</strong> with your verified SIM card.</li>
                        </ul>
                    </div>
                    <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}>
                        <ArrowLeft size={16} /> Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load Multiple Campus Branches
            const branchList = await api.getLocationSettings();
            const safeList = Array.isArray(branchList) ? branchList : [branchList];
            setBranches(safeList);

            // Pre-select user's assigned branch or default
            const userAssigned = user?.details?.assignedBranchId || user?.assignedBranchId;
            if (userAssigned && safeList.some(b => b.id === userAssigned || b.branchCode === userAssigned)) {
                setSelectedBranchId(userAssigned);
            } else if (safeList.length > 0) {
                const defaultBranch = safeList.find(b => b.isDefault) || safeList[0];
                setSelectedBranchId(defaultBranch.id);
            }

            // Load Attendance Records
            const allAttendance = await api.getAttendance();
            const myRecords = [];
            let p = 0, a = 0, l = 0;

            Object.keys(allAttendance).sort().reverse().forEach(date => {
                const status = allAttendance[date][user.id];
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
            }
        } catch (e) {
            console.error("Load attendance error:", e);
        }
    };

    const activeBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

    const handleMarkAttendance = () => {
        if (!navigator.geolocation) {
            setPunchStatus({
                type: 'error',
                message: "Geolocation is not supported by your browser."
            });
            return;
        }

        setIsPunching(true);
        setPunchStatus({
            type: 'info',
            message: `Acquiring GPS coordinates for ${activeBranch?.orgName || 'Campus'}...`
        });

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    setPunchStatus({
                        type: 'info',
                        message: "Verifying coordinates with Spoko Academy server..."
                    });

                    // 1. Backend Haversine Verification with Multi-Campus Support
                    const verifyResult = await api.verifyAttendanceLocation({
                        latitude,
                        longitude,
                        userId: user.id,
                        branchId: selectedBranchId
                    });

                    const distanceMeters = verifyResult.distanceMeters;
                    const isValid = verifyResult.valid;
                    const radius = verifyResult.allowedRadiusMeters;
                    const matchedCampusName = verifyResult.matchedBranch?.orgName || activeBranch?.orgName || 'Main Campus';

                    const nowTime = new Date().toLocaleTimeString();

                    if (isValid) {
                        // 2. Record detailed log
                        await api.recordAttendanceLog({
                            userId: user.id,
                            userName: user.name,
                            branchId: selectedBranchId,
                            branchName: matchedCampusName,
                            date: todayStr,
                            time: nowTime,
                            latitude,
                            longitude,
                            distanceMeters,
                            allowedRadiusMeters: radius,
                            status: 'Present',
                            verificationResult: 'VALID',
                            deviceInfo: navigator.userAgent
                        });

                        // 3. Update active day's attendance
                        const allAttendance = await api.getAttendance();
                        const existingDay = allAttendance[todayStr] || {};
                        await api.saveAttendance(todayStr, {
                            ...existingDay,
                            [user.id]: 'Present'
                        });

                        // 4. Security Audit Log
                        await api.createSecurityLog({
                            userId: user.id,
                            eventType: 'ATTENDANCE_PUNCH_VALID',
                            status: 'SUCCESS',
                            details: `Geo-attendance marked at ${matchedCampusName}. Distance: ${distanceMeters}m (Allowed: ${radius}m)`,
                            userAgent: navigator.userAgent
                        });

                        setTodayMarked(true);
                        setTodayRecord('Present');
                        setPunchStatus({
                            type: 'success',
                            message: `Attendance marked successfully at ${matchedCampusName}! You are within the registered campus boundary.`,
                            distance: distanceMeters,
                            radius: radius
                        });

                        await loadData();
                    } else {
                        // Record rejected punch
                        await api.recordAttendanceLog({
                            userId: user.id,
                            userName: user.name,
                            branchId: selectedBranchId,
                            branchName: matchedCampusName,
                            date: todayStr,
                            time: nowTime,
                            latitude,
                            longitude,
                            distanceMeters,
                            allowedRadiusMeters: radius,
                            status: 'Rejected',
                            verificationResult: 'OUT_OF_BOUNDS',
                            deviceInfo: navigator.userAgent
                        });

                        await api.createSecurityLog({
                            userId: user.id,
                            eventType: 'ATTENDANCE_PUNCH_REJECTED',
                            status: 'REJECTED',
                            details: `Attendance rejected out of bounds at ${matchedCampusName}: ${distanceMeters}m away (Allowed: ${radius}m)`,
                            userAgent: navigator.userAgent
                        });

                        setPunchStatus({
                            type: 'error',
                            message: `You are outside the permitted attendance zone for ${matchedCampusName} (${distanceMeters}m away, allowed radius is ${radius}m).`,
                            distance: distanceMeters,
                            radius: radius
                        });
                    }
                } catch (err) {
                    console.error("Attendance verification error:", err);
                    setPunchStatus({
                        type: 'error',
                        message: "Server verification failed. Please verify that the database server is running."
                    });
                } finally {
                    setIsPunching(false);
                }
            },
            (geoError) => {
                setIsPunching(false);
                let msg = "Could not capture device location.";
                if (geoError.code === 1) msg = "Location permission denied. Please allow location access in your browser settings.";
                else if (geoError.code === 2) msg = "Position unavailable. Please check your device GPS / Network.";
                else if (geoError.code === 3) msg = "Location request timed out. Please retry.";
                setPunchStatus({ type: 'error', message: msg });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const percentage = stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 style={{ margin: 0 }}>My Attendance</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        Multi-Campus Geo-Fenced Attendance System
                    </p>
                </div>
            </div>

            {/* GPS ATTENDANCE PUNCH CARD WITH BRANCH SELECTION */}
            <div className="card glass-panel" style={{
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid #e0e7ff',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, #ffffff, #f5f3ff)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Building size={22} color="var(--color-primary)" />
                            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1e293b' }}>Mark Daily Attendance</h2>
                        </div>

                        {/* Multi-Campus Branch Selector */}
                        <div style={{ marginTop: '0.75rem', maxWidth: '380px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                Select Campus Branch:
                            </label>
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                disabled={todayMarked}
                                style={{
                                    width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px',
                                    border: '1px solid #cbd5e1', background: 'white', fontWeight: 600,
                                    fontSize: '0.9rem', color: '#1e293b'
                                }}
                            >
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.orgName} ({branch.allowedRadiusMeters}m Radius)
                                    </option>
                                ))}
                            </select>
                            {activeBranch && (
                                <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Target GPS: {parseFloat(activeBranch.latitude).toFixed(4)}, {parseFloat(activeBranch.longitude).toFixed(4)} • Radius: {activeBranch.allowedRadiusMeters}m
                                </p>
                            )}
                        </div>
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
                        Today ({todayStr}): {todayMarked ? `Marked (${todayRecord})` : 'Pending Punch'}
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
                        background: punchStatus.type === 'success' ? '#ecfdf5' : punchStatus.type === 'error' ? '#fef2f2' : '#eff6ff',
                        color: punchStatus.type === 'success' ? '#065f46' : punchStatus.type === 'error' ? '#991b1b' : '#1e40af',
                        border: `1px solid ${punchStatus.type === 'success' ? '#a7f3d0' : punchStatus.type === 'error' ? '#fecaca' : '#bfdbfe'}`
                    }}>
                        {punchStatus.type === 'success' ? <CheckCircle size={20} color="#10b981" /> :
                            punchStatus.type === 'error' ? <AlertCircle size={20} color="#ef4444" /> :
                                <Navigation size={20} color="#3b82f6" className="animate-spin" />}
                        <div>
                            <div>{punchStatus.message}</div>
                            {punchStatus.distance !== undefined && punchStatus.distance !== null && (
                                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', opacity: 0.85 }}>
                                    Measured Distance: {punchStatus.distance}m • Permitted Radius: {punchStatus.radius}m
                                </div>
                            )}
                        </div>
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
                        <Navigation size={18} />
                        {isPunching ? 'Verifying Coordinates...' : todayMarked ? 'Attendance Marked for Today' : 'Punch Attendance via GPS'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
                        <ShieldCheck size={16} color="#10b981" />
                        <span>Validated against {activeBranch?.orgName || 'Branch'} Coordinates</span>
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
                        <p className="text-muted">Present</p>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}><XCircle /></div>
                    <div className="stat-info">
                        <h3>{stats.absent}</h3>
                        <p className="text-muted">Absent</p>
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
                                        No attendance records found. Use the GPS button above to punch today's attendance.
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
                .status-rejected { background: #fef2f2; color: #b91c1c; padding: 0.35rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
            `}</style>
        </div>
    );
};

export default StudentAttendance;
