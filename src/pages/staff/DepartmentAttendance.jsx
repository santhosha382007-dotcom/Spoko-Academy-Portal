import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    Calendar, Check, X, Search, Building2, Users, CheckCircle, 
    XCircle, AlertCircle, ArrowLeft, Save, RefreshCw, Filter, 
    ChevronRight, CalendarDays, UserCheck, ShieldCheck, History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const DepartmentAttendance = ({ forcedDepartment = null, embedded = false }) => {
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Determine role and department context
    const rawRole = String(currentUser?.role || '').toLowerCase().trim();
    const isAdmin = rawRole === 'admin';
    const isStaff = rawRole === 'staff' || rawRole === 'faculty';

    // If a department is forced (e.g. from props or query param), use it; otherwise fallback to user's assigned department
    const initialDept = forcedDepartment 
        || searchParams.get('dept') 
        || currentUser?.department 
        || currentUser?.details?.department 
        || 'Railway';

    const [selectedDepartment, setSelectedDepartment] = useState(initialDept);
    const [departments, setDepartments] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // { [studentId]: 'Present' | 'Absent' | 'Leave' }
    const [rawAttendanceHistory, setRawAttendanceHistory] = useState({});
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // All, Present, Absent, Leave, Unmarked
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(null); // { type: 'success' | 'error', message: string }
    const [remarks, setRemarks] = useState({}); // { [studentId]: string }
    const [viewMode, setViewMode] = useState('roster'); // 'roster' | 'history'

    // Update selected department when prop changes
    useEffect(() => {
        if (forcedDepartment) {
            setSelectedDepartment(forcedDepartment);
        }
    }, [forcedDepartment]);

    // Load departments, students, and attendance data
    useEffect(() => {
        loadInitialData();
    }, []);

    // Reload attendance when date changes
    useEffect(() => {
        loadAttendanceForDate(date);
    }, [date]);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);
            const [deptsData, usersData, allAttendance] = await Promise.all([
                api.getDepartments().catch(() => []),
                api.getUsers().catch(() => []),
                api.getAttendance().catch(() => ({}))
            ]);

            setDepartments(deptsData || []);
            const studentUsers = (usersData || []).filter(u => u.role === 'student');
            setAllStudents(studentUsers);
            setRawAttendanceHistory(allAttendance || {});

            const dateRecord = (allAttendance && allAttendance[date]) || {};
            setAttendanceData(dateRecord);
        } catch (err) {
            console.error("Failed to load initial department attendance data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAttendanceForDate = async (targetDate) => {
        try {
            const allAttendance = await api.getAttendance().catch(() => ({}));
            setRawAttendanceHistory(allAttendance || {});
            const dateRecord = (allAttendance && allAttendance[targetDate]) || {};
            setAttendanceData(dateRecord);
            setSaveFeedback(null);
        } catch (err) {
            console.error("Failed to load attendance for date:", targetDate, err);
        }
    };

    // Filter students specifically belonging to selected department
    const departmentStudents = useMemo(() => {
        const cleanDept = String(selectedDepartment || '').toLowerCase().trim().replace(/s$/, '');
        return allStudents.filter(u => {
            const uDept = String(u.department || u.details?.department || '').toLowerCase().trim().replace(/s$/, '');
            return uDept === cleanDept || 
                   (cleanDept === 'gd' && uDept.includes('gd')) || 
                   (cleanDept.includes('gd') && uDept === 'gd') ||
                   (uDept && uDept === String(selectedDepartment).toLowerCase().trim());
        });
    }, [allStudents, selectedDepartment]);

    // Student stats calculation (historical attendance percentage)
    const studentHistoryMap = useMemo(() => {
        const stats = {};
        departmentStudents.forEach(st => {
            let presentCount = 0;
            let totalMarkedDays = 0;
            Object.values(rawAttendanceHistory).forEach(dayRecord => {
                if (dayRecord && dayRecord[st.id]) {
                    totalMarkedDays++;
                    const stVal = String(dayRecord[st.id]).toLowerCase();
                    if (stVal === 'present') {
                        presentCount++;
                    }
                }
            });
            const rate = totalMarkedDays > 0 ? Math.round((presentCount / totalMarkedDays) * 100) : 100;
            stats[st.id] = { rate, totalMarkedDays, presentCount };
        });
        return stats;
    }, [departmentStudents, rawAttendanceHistory]);

    // Compute today's counts for this department
    const metrics = useMemo(() => {
        let present = 0;
        let absent = 0;
        let leave = 0;
        let unmarked = 0;

        departmentStudents.forEach(st => {
            const status = attendanceData[st.id];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
            else unmarked++;
        });

        const total = departmentStudents.length;
        const totalMarked = present + absent + leave;
        const rate = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

        return { total, present, absent, leave, unmarked, rate, totalMarked };
    }, [departmentStudents, attendanceData]);

    // Filtered students for display based on search and status
    const displayedStudents = useMemo(() => {
        return departmentStudents.filter(s => {
            const matchesSearch = 
                (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(s.phone || '').includes(searchTerm) ||
                String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

            const status = attendanceData[s.id];
            let matchesStatus = true;
            if (statusFilter === 'Present') matchesStatus = status === 'Present';
            else if (statusFilter === 'Absent') matchesStatus = status === 'Absent';
            else if (statusFilter === 'Leave') matchesStatus = status === 'Leave';
            else if (statusFilter === 'Unmarked') matchesStatus = !status;

            return matchesSearch && matchesStatus;
        });
    }, [departmentStudents, searchTerm, statusFilter, attendanceData]);

    // Handlers
    const handleStatusChange = (studentId, status) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleMarkAll = (status) => {
        const updated = { ...attendanceData };
        displayedStudents.forEach(s => {
            updated[s.id] = status;
        });
        setAttendanceData(updated);
    };

    const handleClearAll = () => {
        const updated = { ...attendanceData };
        displayedStudents.forEach(s => {
            delete updated[s.id];
        });
        setAttendanceData(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveFeedback(null);
        try {
            // Extract only this department's student records
            const deptRecords = {};
            departmentStudents.forEach(s => {
                if (attendanceData[s.id]) {
                    deptRecords[s.id] = attendanceData[s.id];
                }
            });

            // Save attendance merging with existing date records in database
            await api.saveAttendance(date, deptRecords, true);

            // Audit log
            try {
                await api.createAuditLog({
                    eventType: 'DEPARTMENT_ATTENDANCE_MARKED',
                    performedBy: currentUser?.name || `${selectedDepartment} Faculty`,
                    details: `Saved attendance for ${selectedDepartment} department on ${date}. ` +
                             `Total Students: ${departmentStudents.length}, Present: ${metrics.present}, Absent: ${metrics.absent}, Leave: ${metrics.leave}.`
                });
            } catch (_) {}

            setSaveFeedback({
                type: 'success',
                message: `Attendance for ${selectedDepartment} Department on ${date} saved successfully! (${metrics.present} Present, ${metrics.absent} Absent, ${metrics.leave} Leave)`
            });

            // Refresh raw attendance history so student percentages update
            const freshHistory = await api.getAttendance().catch(() => ({}));
            setRawAttendanceHistory(freshHistory || {});

            setTimeout(() => {
                setSaveFeedback(null);
            }, 6000);
        } catch (err) {
            console.error("Save department attendance error", err);
            setSaveFeedback({
                type: 'error',
                message: `Failed to save attendance: ${err.message || 'Server connection error'}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Quick date selectors
    const setToday = () => setDate(new Date().toISOString().split('T')[0]);
    const setYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().split('T')[0]);
    };

    // Format date for readable display
    const formattedDate = useMemo(() => {
        try {
            const [y, m, d] = date.split('-');
            const dt = new Date(y, m - 1, d);
            return dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return date;
        }
    }, [date]);

    // Recent department attendance dates for history view
    const departmentHistoryList = useMemo(() => {
        const dateEntries = Object.keys(rawAttendanceHistory).sort().reverse();
        return dateEntries.map(dStr => {
            const dayRecords = rawAttendanceHistory[dStr] || {};
            let p = 0, a = 0, l = 0, totalDept = 0;
            departmentStudents.forEach(st => {
                const stStatus = dayRecords[st.id];
                if (stStatus) {
                    totalDept++;
                    const low = String(stStatus).toLowerCase();
                    if (low === 'present') p++;
                    else if (low === 'absent') a++;
                    else if (low === 'leave') l++;
                }
            });
            const rate = totalDept > 0 ? Math.round((p / totalDept) * 100) : 0;
            return {
                date: dStr,
                markedCount: totalDept,
                present: p,
                absent: a,
                leave: l,
                rate,
                isToday: dStr === new Date().toISOString().split('T')[0]
            };
        }).filter(item => item.markedCount > 0);
    }, [rawAttendanceHistory, departmentStudents]);

    if (isLoading) {
        return (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <RefreshCw size={36} className="spin" style={{ color: '#7c3aed', margin: '0 auto 1rem' }} />
                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading Department Attendance Roster...</p>
            </div>
        );
    }

    return (
        <div className="dept-attendance-root fade-in">
            {/* Header: Title, Department Badge, Date Picker */}
            {!embedded && (
                <header className="dept-attendance-header">
                    <div className="dept-header-left">
                        <Link to={isAdmin ? "/admin/departments" : "/"} className="btn-icon header-back-btn">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="dept-badge-row">
                                <span className="dept-name-badge">
                                    <Building2 size={15} />
                                    {selectedDepartment} Department
                                </span>
                                <span className="dept-role-badge">
                                    <UserCheck size={14} />
                                    {isStaff ? `${currentUser?.name} (Faculty)` : 'Institutional Admin'}
                                </span>
                            </div>
                            <h1 className="dept-page-title">Department Attendance System</h1>
                            <p className="dept-page-subtitle">
                                Mark and monitor daily attendance specifically for {selectedDepartment} students
                            </p>
                        </div>
                    </div>

                    <div className="dept-header-right">
                        {/* If Admin, allow switching department dynamically */}
                        {isAdmin && !forcedDepartment && (
                            <div className="dept-switch-selector">
                                <label className="dept-switch-label">Switch Department:</label>
                                <select 
                                    value={selectedDepartment}
                                    onChange={(e) => {
                                        setSelectedDepartment(e.target.value);
                                        setSearchParams({ dept: e.target.value });
                                    }}
                                    className="dept-select-box"
                                >
                                    {departments.map(d => (
                                        <option key={d.id} value={d.name}>{d.name} Department</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date Controls */}
                        <div className="dept-date-control-card">
                            <div className="dept-date-quick-btns">
                                <button 
                                    type="button" 
                                    onClick={setToday}
                                    className={`date-quick-btn ${date === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
                                >
                                    Today
                                </button>
                                <button 
                                    type="button" 
                                    onClick={setYesterday}
                                    className="date-quick-btn"
                                >
                                    Yesterday
                                </button>
                            </div>
                            <div className="input-with-icon dept-date-picker">
                                <Calendar size={17} className="input-icon" />
                                <input 
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="dept-date-input"
                                />
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Embedded mini-header if inside DepartmentDetails tab */}
            {embedded && (
                <div className="embedded-date-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div className="input-with-icon" style={{ minWidth: '180px' }}>
                            <Calendar size={17} className="input-icon" />
                            <input 
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="dept-date-input"
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={setToday}
                            className={`date-quick-btn ${date === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
                        >
                            Today
                        </button>
                        <button 
                            type="button" 
                            onClick={setYesterday}
                            className="date-quick-btn"
                        >
                            Yesterday
                        </button>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 700 }}>
                        {formattedDate}
                    </div>
                </div>
            )}

            {/* Attendance Status Feedback Notification */}
            {saveFeedback && (
                <div className={`dept-alert-banner ${saveFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {saveFeedback.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span>{saveFeedback.message}</span>
                </div>
            )}

            {/* Department Real-Time Metrics Cards */}
            <div className="dept-metrics-grid">
                <div className="dept-metric-card metric-total">
                    <div className="metric-icon-wrap icon-total">
                        <Users size={22} />
                    </div>
                    <div className="metric-details">
                        <span className="metric-label">Enrolled Students</span>
                        <span className="metric-value">{metrics.total}</span>
                        <span className="metric-sub">{selectedDepartment} Department</span>
                    </div>
                </div>

                <div className="dept-metric-card metric-present">
                    <div className="metric-icon-wrap icon-present">
                        <CheckCircle size={22} />
                    </div>
                    <div className="metric-details">
                        <span className="metric-label">Present Today</span>
                        <span className="metric-value">{metrics.present}</span>
                        <span className="metric-sub text-emerald">
                            {metrics.total > 0 ? Math.round((metrics.present / metrics.total) * 100) : 0}% of department
                        </span>
                    </div>
                </div>

                <div className="dept-metric-card metric-absent">
                    <div className="metric-icon-wrap icon-absent">
                        <XCircle size={22} />
                    </div>
                    <div className="metric-details">
                        <span className="metric-label">Absent Today</span>
                        <span className="metric-value">{metrics.absent}</span>
                        <span className="metric-sub text-rose">
                            {metrics.absent > 0 ? `${metrics.absent} student(s) absent` : 'No absentees'}
                        </span>
                    </div>
                </div>

                <div className="dept-metric-card metric-rate">
                    <div className="metric-icon-wrap icon-rate">
                        <CalendarDays size={22} />
                    </div>
                    <div className="metric-details">
                        <span className="metric-label">Attendance Rate</span>
                        <span className="metric-value">{metrics.rate}%</span>
                        <span className="metric-sub">
                            {metrics.unmarked > 0 ? `${metrics.unmarked} unmarked` : 'All marked'}
                        </span>
                    </div>
                </div>
            </div>

            {/* View Switcher Tabs: Active Sheet vs Past History */}
            <div className="dept-tabs-bar">
                <button 
                    type="button"
                    onClick={() => setViewMode('roster')}
                    className={`dept-tab-btn ${viewMode === 'roster' ? 'active' : ''}`}
                >
                    <UserCheck size={16} />
                    Mark Roster for {formattedDate}
                </button>
                <button 
                    type="button"
                    onClick={() => setViewMode('history')}
                    className={`dept-tab-btn ${viewMode === 'history' ? 'active' : ''}`}
                >
                    <History size={16} />
                    Department Attendance History ({departmentHistoryList.length} days)
                </button>
            </div>

            {viewMode === 'roster' ? (
                /* MAIN ATTENDANCE ROSTER SHEET */
                <div className="card glass-panel dept-roster-card">
                    {/* Toolbar: Search, Filters, Quick Bulk Mark, Save */}
                    <div className="dept-roster-toolbar">
                        <div className="toolbar-left-group">
                            <div className="input-with-icon dept-search-input">
                                <Search size={17} className="input-icon" />
                                <input 
                                    type="text"
                                    placeholder="Search student by name, phone or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="dept-filter-select"
                            >
                                <option value="All">All Statuses ({departmentStudents.length})</option>
                                <option value="Present">Present ({metrics.present})</option>
                                <option value="Absent">Absent ({metrics.absent})</option>
                                <option value="Leave">Leave ({metrics.leave})</option>
                                <option value="Unmarked">Unmarked ({metrics.unmarked})</option>
                            </select>
                        </div>

                        <div className="toolbar-right-group">
                            <div className="bulk-mark-btn-group">
                                <span className="bulk-mark-title">Quick Mark:</span>
                                <button 
                                    type="button" 
                                    onClick={() => handleMarkAll('Present')}
                                    className="bulk-btn bulk-p"
                                    title="Mark all filtered students as Present"
                                >
                                    All Present
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handleMarkAll('Absent')}
                                    className="bulk-btn bulk-a"
                                    title="Mark all filtered students as Absent"
                                >
                                    All Absent
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handleMarkAll('Leave')}
                                    className="bulk-btn bulk-l"
                                    title="Mark all filtered students as Leave"
                                >
                                    All Leave
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleClearAll}
                                    className="bulk-btn bulk-clear"
                                    title="Reset markings for current filter"
                                >
                                    Reset
                                </button>
                            </div>

                            <button 
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || departmentStudents.length === 0}
                                className="btn btn-primary dept-save-btn"
                            >
                                <Save size={17} />
                                {isSaving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>

                    {/* Department Roster Table (Desktop) */}
                    <div className="dept-table-container hide-mobile">
                        <table className="dept-attendance-table">
                            <thead>
                                <tr>
                                    <th>Student Roster</th>
                                    <th>Student ID / Phone</th>
                                    <th>Batch</th>
                                    <th>Historical Rate</th>
                                    <th style={{ textAlign: 'center' }}>Attendance Marking</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="dept-table-empty">
                                            <div className="empty-message-wrap">
                                                <Users size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                                                <p>No students found for {selectedDepartment} Department matching current filter.</p>
                                                {departmentStudents.length === 0 && (
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                        No students are currently enrolled under "{selectedDepartment}". You can assign students from Student Directory.
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedStudents.map((st) => {
                                        const currentStatus = attendanceData[st.id];
                                        const hist = studentHistoryMap[st.id] || { rate: 100 };
                                        return (
                                            <tr key={st.id} className={`roster-row ${currentStatus ? `row-${currentStatus.toLowerCase()}` : ''}`}>
                                                <td>
                                                    <div className="student-profile-cell">
                                                        <div className="student-avatar-badge">
                                                            {(st.name?.[0] || 'S').toUpperCase()}
                                                        </div>
                                                        <div className="student-name-block">
                                                            <span className="student-fullname">{st.name}</span>
                                                            <span className="student-email">{st.email || 'Student Account'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="student-id-block">
                                                        <span className="id-tag">ID: {st.id}</span>
                                                        <span className="phone-tag">{st.phone}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="batch-pill">
                                                        {st.details?.batch || st.batch || 'Regular'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="history-rate-cell">
                                                        <div className="rate-mini-bar">
                                                            <div 
                                                                className="rate-fill" 
                                                                style={{ 
                                                                    width: `${hist.rate}%`,
                                                                    background: hist.rate >= 80 ? '#10b981' : (hist.rate >= 60 ? '#f59e0b' : '#ef4444')
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="rate-text" style={{
                                                            color: hist.rate >= 80 ? '#059669' : (hist.rate >= 60 ? '#d97706' : '#dc2626')
                                                        }}>
                                                            {hist.rate}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="punch-btn-group">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleStatusChange(st.id, 'Present')}
                                                            className={`punch-btn punch-present ${currentStatus === 'Present' ? 'active' : ''}`}
                                                            title="Mark Present"
                                                        >
                                                            <Check size={14} />
                                                            <span>Present</span>
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleStatusChange(st.id, 'Absent')}
                                                            className={`punch-btn punch-absent ${currentStatus === 'Absent' ? 'active' : ''}`}
                                                            title="Mark Absent"
                                                        >
                                                            <X size={14} />
                                                            <span>Absent</span>
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleStatusChange(st.id, 'Leave')}
                                                            className={`punch-btn punch-leave ${currentStatus === 'Leave' ? 'active' : ''}`}
                                                            title="Mark Leave"
                                                        >
                                                            <span>Leave</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {currentStatus ? (
                                                        <span className={`status-pill pill-${currentStatus.toLowerCase()}`}>
                                                            {currentStatus}
                                                        </span>
                                                    ) : (
                                                        <span className="status-pill pill-unmarked">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Department Roster Mobile Cards (Screens <= 768px) */}
                    <div className="dept-mobile-cards show-mobile">
                        {displayedStudents.length === 0 ? (
                            <div className="mobile-empty-banner">
                                No students found for {selectedDepartment} Department.
                            </div>
                        ) : (
                            displayedStudents.map((st) => {
                                const currentStatus = attendanceData[st.id];
                                const hist = studentHistoryMap[st.id] || { rate: 100 };
                                return (
                                    <div key={st.id} className={`dept-mobile-card ${currentStatus ? `card-${currentStatus.toLowerCase()}` : ''}`}>
                                        <div className="mobile-card-top">
                                            <div className="student-avatar-badge">
                                                {(st.name?.[0] || 'S').toUpperCase()}
                                            </div>
                                            <div className="mobile-card-meta">
                                                <span className="mobile-card-name">{st.name}</span>
                                                <span className="mobile-card-sub">ID: {st.id} • {st.phone}</span>
                                            </div>
                                            {currentStatus ? (
                                                <span className={`status-pill pill-${currentStatus.toLowerCase()}`}>
                                                    {currentStatus}
                                                </span>
                                            ) : (
                                                <span className="status-pill pill-unmarked">
                                                    Pending
                                                </span>
                                            )}
                                        </div>

                                        <div className="mobile-card-rate-row">
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Overall Attendance:</span>
                                            <span style={{ 
                                                fontSize: '0.82rem', 
                                                fontWeight: 800,
                                                color: hist.rate >= 80 ? '#059669' : (hist.rate >= 60 ? '#d97706' : '#dc2626')
                                            }}>
                                                {hist.rate}%
                                            </span>
                                        </div>

                                        <div className="mobile-card-buttons">
                                            <button 
                                                type="button"
                                                onClick={() => handleStatusChange(st.id, 'Present')}
                                                className={`mobile-punch-btn btn-p ${currentStatus === 'Present' ? 'selected' : ''}`}
                                            >
                                                <Check size={16} /> Present
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleStatusChange(st.id, 'Absent')}
                                                className={`mobile-punch-btn btn-a ${currentStatus === 'Absent' ? 'selected' : ''}`}
                                            >
                                                <X size={16} /> Absent
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleStatusChange(st.id, 'Leave')}
                                                className={`mobile-punch-btn btn-l ${currentStatus === 'Leave' ? 'selected' : ''}`}
                                            >
                                                Leave
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom Save Bar for Mobile */}
                    <div className="mobile-sticky-save show-mobile">
                        <button 
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || departmentStudents.length === 0}
                            className="btn btn-primary btn-save-mobile"
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : `Save ${selectedDepartment} Attendance`}
                        </button>
                    </div>
                </div>
            ) : (
                /* DEPARTMENT ATTENDANCE HISTORY LIST */
                <div className="card glass-panel dept-history-card">
                    <div className="history-header-box">
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                                {selectedDepartment} Attendance Log Archive
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                Previous attendance sessions recorded for {selectedDepartment} students
                            </p>
                        </div>
                    </div>

                    {departmentHistoryList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                            <CalendarDays size={42} style={{ opacity: 0.25, margin: '0 auto 1rem' }} />
                            <h4 style={{ color: '#1e293b', fontWeight: 700, margin: '0 0 0.5rem' }}>No Historical Records Yet</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                                When you mark and save attendance for {selectedDepartment} students, past dates will be archived here for auditing and reporting.
                            </p>
                        </div>
                    ) : (
                        <div className="history-list-grid">
                            {departmentHistoryList.map(hItem => (
                                <div 
                                    key={hItem.date} 
                                    className={`history-card-item ${hItem.date === date ? 'active-history-date' : ''}`}
                                    onClick={() => {
                                        setDate(hItem.date);
                                        setViewMode('roster');
                                    }}
                                    title="Click to load and view this date's roster"
                                >
                                    <div className="history-card-top">
                                        <div className="history-date-badge">
                                            <Calendar size={15} />
                                            <span>{hItem.date}</span>
                                            {hItem.isToday && <span className="today-chip">Today</span>}
                                        </div>
                                        <span className="history-rate-chip" style={{
                                            background: hItem.rate >= 80 ? '#ecfdf5' : '#fef2f2',
                                            color: hItem.rate >= 80 ? '#059669' : '#dc2626'
                                        }}>
                                            {hItem.rate}% Present
                                        </span>
                                    </div>

                                    <div className="history-counts-row">
                                        <div className="count-chip chip-p">
                                            <span>P:</span> <strong>{hItem.present}</strong>
                                        </div>
                                        <div className="count-chip chip-a">
                                            <span>A:</span> <strong>{hItem.absent}</strong>
                                        </div>
                                        <div className="count-chip chip-l">
                                            <span>L:</span> <strong>{hItem.leave}</strong>
                                        </div>
                                        <div className="count-chip chip-tot">
                                            <span>Total:</span> <strong>{hItem.markedCount}</strong>
                                        </div>
                                    </div>

                                    <div className="history-card-footer">
                                        <span className="load-action-text">Click to inspect / edit roster</span>
                                        <ChevronRight size={15} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .dept-attendance-root {
                    width: 100%;
                    max-width: 1280px;
                    margin: 0 auto;
                    padding-bottom: 3.5rem;
                }

                .dept-attendance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .dept-header-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }

                .header-back-btn {
                    background: white;
                    border: 1px solid #e2e8f0;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #475569;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }

                .header-back-btn:hover {
                    background: #f8fafc;
                    color: #0f172a;
                    border-color: #cbd5e1;
                }

                .dept-badge-row {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    margin-bottom: 0.4rem;
                    flex-wrap: wrap;
                }

                .dept-name-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f5f3ff;
                    color: #7c3aed;
                    font-size: 0.78rem;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 8px;
                    border: 1px solid #ede9fe;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .dept-role-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 8px;
                }

                .dept-page-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.5px;
                }

                .dept-page-subtitle {
                    font-size: 0.88rem;
                    color: #64748b;
                    margin: 0.25rem 0 0;
                }

                .dept-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .dept-switch-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }

                .dept-switch-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                }

                .dept-select-box {
                    padding: 0.65rem 1rem;
                    border-radius: 12px;
                    border: 1.5px solid #cbd5e1;
                    background: white;
                    font-weight: 700;
                    font-size: 0.88rem;
                    color: #0f172a;
                    outline: none;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                }

                .dept-select-box:focus {
                    border-color: #7c3aed;
                }

                .dept-date-control-card {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    background: white;
                    padding: 0.4rem 0.6rem;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }

                .dept-date-quick-btns {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .date-quick-btn {
                    padding: 0.45rem 0.75rem;
                    border-radius: 8px;
                    border: none;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 0.78rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .date-quick-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .date-quick-btn.active {
                    background: #7c3aed;
                    color: white;
                }

                .dept-date-picker {
                    max-width: 170px;
                }

                .dept-date-input {
                    padding-left: 2.3rem !important;
                    font-size: 0.88rem !important;
                    font-weight: 600;
                    border-radius: 8px !important;
                    border: 1px solid #e2e8f0 !important;
                    background: #f8fafc !important;
                }

                .embedded-date-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                    background: #f8fafc;
                    padding: 0.75rem 1rem;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                }

                /* Alert */
                .dept-alert-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.9rem 1.25rem;
                    border-radius: 12px;
                    margin-bottom: 1.25rem;
                    font-size: 0.9rem;
                    font-weight: 700;
                    animation: slideDown 0.3s ease;
                }

                .alert-success {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }

                .alert-error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Metrics Grid */
                .dept-metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .dept-metric-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .dept-metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.04);
                }

                .metric-icon-wrap {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .icon-total { background: #ede9fe; color: #7c3aed; }
                .icon-present { background: #dcfce7; color: #16a34a; }
                .icon-absent { background: #fee2e2; color: #dc2626; }
                .icon-rate { background: #e0f2fe; color: #0284c7; }

                .metric-details {
                    display: flex;
                    flex-direction: column;
                }

                .metric-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .metric-value {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                    margin: 0.1rem 0;
                }

                .metric-sub {
                    font-size: 0.78rem;
                    color: #64748b;
                    font-weight: 600;
                }

                .text-emerald { color: #059669; }
                .text-rose { color: #e11d48; }

                /* Tabs Bar */
                .dept-tabs-bar {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.25rem;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 0.5rem;
                }

                .dept-tab-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0.65rem 1.25rem;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .dept-tab-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }

                .dept-tab-btn.active {
                    background: #f5f3ff;
                    color: #7c3aed;
                    font-weight: 800;
                }

                /* Roster Card */
                .dept-roster-card {
                    padding: 1.25rem;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                }

                .dept-roster-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                }

                .toolbar-left-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex: 1;
                    min-width: 280px;
                }

                .dept-search-input {
                    flex: 1;
                    max-width: 360px;
                }

                .dept-filter-select {
                    padding: 0.65rem 0.9rem;
                    border-radius: 10px;
                    border: 1.5px solid #cbd5e1;
                    background: white;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #0f172a;
                    outline: none;
                }

                .toolbar-right-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .bulk-mark-btn-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #f8fafc;
                    padding: 4px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .bulk-mark-title {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #64748b;
                    padding: 0 6px;
                    text-transform: uppercase;
                }

                .bulk-btn {
                    padding: 0.4rem 0.7rem;
                    border-radius: 8px;
                    border: none;
                    font-size: 0.78rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .bulk-p { background: #dcfce7; color: #15803d; }
                .bulk-p:hover { background: #bbf7d0; }

                .bulk-a { background: #fee2e2; color: #b91c1c; }
                .bulk-a:hover { background: #fecaca; }

                .bulk-l { background: #fef3c7; color: #b45309; }
                .bulk-l:hover { background: #fde68a; }

                .bulk-clear { background: #f1f5f9; color: #64748b; }
                .bulk-clear:hover { background: #e2e8f0; color: #0f172a; }

                .dept-save-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0.65rem 1.4rem;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 0.9rem;
                    background: #7c3aed;
                    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
                }

                .dept-save-btn:hover {
                    background: #6d28d9;
                }

                /* Table Styling */
                .dept-table-container {
                    overflow-x: auto;
                    border: 1px solid #f1f5f9;
                    border-radius: 14px;
                }

                .dept-attendance-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .dept-attendance-table th {
                    background: #f8fafc;
                    padding: 0.9rem 1rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1.5px solid #e2e8f0;
                    text-align: left;
                }

                .dept-attendance-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .roster-row:hover {
                    background: #faf5ff;
                }

                .student-profile-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .student-avatar-badge {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    color: white;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.95rem;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(124, 58, 237, 0.2);
                }

                .student-name-block {
                    display: flex;
                    flex-direction: column;
                }

                .student-fullname {
                    font-weight: 800;
                    color: #0f172a;
                    font-size: 0.92rem;
                }

                .student-email {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .student-id-block {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .id-tag {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: #1e293b;
                    background: #f1f5f9;
                    padding: 2px 6px;
                    border-radius: 4px;
                    display: inline-block;
                    width: fit-content;
                }

                .phone-tag {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .batch-pill {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                    background: #f8fafc;
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                }

                .history-rate-cell {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 110px;
                }

                .rate-mini-bar {
                    flex: 1;
                    height: 6px;
                    background: #e2e8f0;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .rate-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.3s;
                }

                .rate-text {
                    font-size: 0.8rem;
                    font-weight: 800;
                    min-width: 35px;
                }

                /* Punch Buttons */
                .punch-btn-group {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: #f8fafc;
                    padding: 4px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }

                .punch-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0.45rem 0.8rem;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .punch-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .punch-present.active {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }

                .punch-absent.active {
                    background: #ef4444;
                    color: white;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                }

                .punch-leave.active {
                    background: #f59e0b;
                    color: white;
                    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
                }

                /* Status Pills */
                .status-pill {
                    display: inline-block;
                    font-size: 0.75rem;
                    font-weight: 800;
                    padding: 3px 10px;
                    border-radius: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }

                .pill-present { background: #dcfce7; color: #15803d; }
                .pill-absent { background: #fee2e2; color: #b91c1c; }
                .pill-leave { background: #fef3c7; color: #b45309; }
                .pill-unmarked { background: #f1f5f9; color: #94a3b8; }

                .dept-table-empty {
                    padding: 4rem 1rem !important;
                    text-align: center;
                }

                .empty-message-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: #64748b;
                    font-size: 0.95rem;
                    font-weight: 600;
                }

                /* Mobile Card Styles */
                .dept-mobile-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                }

                .dept-mobile-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 1rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }

                .mobile-card-top {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }

                .mobile-card-meta {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .mobile-card-name {
                    font-weight: 800;
                    font-size: 0.95rem;
                    color: #0f172a;
                }

                .mobile-card-sub {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .mobile-card-rate-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0.75rem;
                    background: #f8fafc;
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                }

                .mobile-card-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 0.5rem;
                }

                .mobile-punch-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 0.65rem 0.4rem;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .mobile-punch-btn.selected.btn-p {
                    background: #10b981;
                    color: white;
                    border-color: #10b981;
                }

                .mobile-punch-btn.selected.btn-a {
                    background: #ef4444;
                    color: white;
                    border-color: #ef4444;
                }

                .mobile-punch-btn.selected.btn-l {
                    background: #f59e0b;
                    color: white;
                    border-color: #f59e0b;
                }

                .mobile-sticky-save {
                    margin-top: 1rem;
                }

                .btn-save-mobile {
                    width: 100%;
                    padding: 0.85rem;
                    font-size: 0.95rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border-radius: 12px;
                }

                /* History View */
                .dept-history-card {
                    padding: 1.5rem;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                }

                .history-header-box {
                    margin-bottom: 1.5rem;
                }

                .history-list-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                }

                .history-card-item {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 1.15rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .history-card-item:hover {
                    background: #f5f3ff;
                    border-color: #c4b5fd;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(124, 58, 237, 0.08);
                }

                .active-history-date {
                    border-color: #7c3aed;
                    background: #f5f3ff;
                }

                .history-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .history-date-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 800;
                    font-size: 0.9rem;
                    color: #0f172a;
                }

                .today-chip {
                    background: #7c3aed;
                    color: white;
                    font-size: 0.68rem;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 6px;
                    text-transform: uppercase;
                }

                .history-rate-chip {
                    font-size: 0.78rem;
                    font-weight: 800;
                    padding: 3px 8px;
                    border-radius: 6px;
                }

                .history-counts-row {
                    display: flex;
                    gap: 0.5rem;
                }

                .count-chip {
                    flex: 1;
                    padding: 0.4rem;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    text-align: center;
                    background: white;
                    border: 1px solid #e2e8f0;
                }

                .chip-p { color: #15803d; }
                .chip-a { color: #b91c1c; }
                .chip-l { color: #b45309; }
                .chip-tot { color: #475569; }

                .history-card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #7c3aed;
                    border-top: 1px dashed #e2e8f0;
                    padding-top: 0.5rem;
                    margin-top: 0.25rem;
                }

                /* Responsive Visibility */
                .show-mobile { display: none; }
                .hide-mobile { display: block; }

                @media (max-width: 768px) {
                    .show-mobile { display: block; }
                    .hide-mobile { display: none; }
                    .dept-attendance-header {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .dept-header-right {
                        justify-content: space-between;
                    }
                    .dept-date-control-card {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .dept-metrics-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    .toolbar-right-group {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .bulk-mark-btn-group {
                        overflow-x: auto;
                        width: 100%;
                    }
                    .dept-save-btn {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default DepartmentAttendance;
