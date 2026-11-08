import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Check, X, Search, Calendar, ArrowLeft, Building2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

const Attendance = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: 'Present' | 'Absent' | 'Leave' }
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [departmentList, setDepartmentList] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Students and Departments
            const [allUsers, depts] = await Promise.all([
                api.getUsers(),
                api.getDepartments()
            ]);
            const studentUsers = allUsers.filter(u => u.role === 'student');
            setStudents(studentUsers);
            setDepartmentList(depts);

            // Load Attendance for selected date
            const allAttendance = await api.getAttendance();
            const todaysRecord = allAttendance[date] || {};
            setAttendanceData(todaysRecord);
        } catch (e) {
            console.error("Failed to load attendance data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (studentId, status) => {
        const updated = { ...attendanceData, [studentId]: status };
        setAttendanceData(updated);
    };

    const markAll = (status) => {
        const updated = { ...attendanceData };
        filteredStudents.forEach(s => {
            updated[s.id] = status;
        });
        setAttendanceData(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.saveAttendance(date, attendanceData);
            await api.createAuditLog({
                eventType: 'ATTENDANCE_CORRECTION',
                performedBy: user?.name || 'Administrator',
                details: `Admin updated attendance records for date ${date}. Total students marked: ${Object.keys(attendanceData).length}.`
            });
            alert(`Attendance for ${date} saved successfully!`);
        } catch (e) {
            console.error("Failed to save attendance", e);
            alert(`Failed to save attendance: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Filter students for UI display
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.phone && s.phone.includes(searchTerm));
        const matchesDept = filterDepartment === 'All' || s.department === filterDepartment || s.details?.department === filterDepartment;
        return matchesSearch && matchesDept;
    });

    if (loading) return <div className="p-4">Loading Attendance Data...</div>;

    return (
        <div className="attendance-page-root fade-in">
            {/* Header section with responsive layout */}
            <header className="attendance-page-header">
                <div className="attendance-header-title-wrap">
                    <Link to="/" className="btn-icon attendance-back-btn">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="attendance-main-title">Attendance Management</h1>
                        <p className="attendance-sub-title">Spoko Academy Daily Student Attendance Roster</p>
                    </div>
                </div>

                <div className="attendance-header-date-wrap">
                    <div className="input-with-icon attendance-date-box">
                        <Calendar size={18} className="input-icon" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="attendance-date-input"
                        />
                    </div>
                </div>
            </header>

            {/* Individual Department Quick Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px', flexShrink: 0 }}>
                    Departments:
                </span>
                <button
                    type="button"
                    onClick={() => setFilterDepartment('All')}
                    style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid ' + (filterDepartment === 'All' ? '#7c3aed' : '#e2e8f0'),
                        background: filterDepartment === 'All' ? '#f5f3ff' : 'white',
                        color: filterDepartment === 'All' ? '#7c3aed' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    All Departments ({students.length})
                </button>
                {departmentList.map(dept => {
                    const count = students.filter(s => s.department === dept.name || s.details?.department === dept.name).length;
                    const isSelected = filterDepartment === dept.name;
                    return (
                        <button
                            key={dept.id}
                            type="button"
                            onClick={() => setFilterDepartment(dept.name)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0.45rem 0.9rem',
                                borderRadius: '10px',
                                border: '1px solid ' + (isSelected ? '#7c3aed' : '#e2e8f0'),
                                background: isSelected ? '#f5f3ff' : 'white',
                                color: isSelected ? '#7c3aed' : '#475569',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Building2 size={13} />
                            {dept.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Department Focus Banner */}
            {filterDepartment !== 'All' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={18} color="#7c3aed" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                            Marking Attendance for <strong>{filterDepartment} Department</strong> ({filteredStudents.length} Students)
                        </span>
                    </div>
                    <Link
                        to={`/admin/department/${encodeURIComponent(filterDepartment)}?tab=attendance`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#7c3aed',
                            textDecoration: 'none'
                        }}
                    >
                        Open Dedicated {filterDepartment} Workspace <ExternalLink size={14} />
                    </Link>
                </div>
            )}

            {/* DAILY ATTENDANCE SHEET */}
            <div className="card glass-panel attendance-content-card">
                {/* Search & Filters Toolbar */}
                <div className="attendance-toolbar-box">
                    <div className="attendance-filters-row">
                        <div className="input-with-icon attendance-search-field">
                            <Search size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Search student or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="select-input attendance-dept-select"
                            style={{ color: '#0f172a', backgroundColor: '#ffffff', WebkitTextFillColor: '#0f172a' }}
                        >
                            <option value="All" style={{ color: '#0f172a', backgroundColor: '#ffffff', WebkitTextFillColor: '#0f172a' }}>All Departments</option>
                            {departmentList.map(d => (
                                <option key={d.id} value={d.name} style={{ color: '#0f172a', backgroundColor: '#ffffff', WebkitTextFillColor: '#0f172a' }}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="attendance-actions-row">
                        <div className="quick-mark-group">
                            <span className="quick-mark-label">Quick:</span>
                            <button type="button" onClick={() => markAll('Present')} className="btn-qk qk-p">All P</button>
                            <button type="button" onClick={() => markAll('Absent')} className="btn-qk qk-a">All A</button>
                            <button type="button" onClick={() => markAll('Leave')} className="btn-qk qk-l">All L</button>
                        </div>
                        <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-save-sheet">
                            {isSaving ? 'Saving...' : 'Save Sheet'}
                        </button>
                    </div>
                </div>

                {/* Desktop View Table (Screens > 640px) */}
                <div className="attendance-desktop-view">
                    <div className="table-responsive">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Student Name</th>
                                    <th style={{ textAlign: 'left' }}>Phone / User ID</th>
                                    <th style={{ textAlign: 'left' }}>Department</th>
                                    <th style={{ textAlign: 'center' }}>Attendance Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="empty-table-cell">
                                            No students found matching current filters.
                                        </td>
                                    </tr>
                                ) : filteredStudents.map(student => (
                                    <tr key={student.id}>
                                        <td className="cell-name">{student.name}</td>
                                        <td className="cell-phone">{student.phone}</td>
                                        <td>
                                            <span className="badge badge-dept">
                                                {student.details?.department || student.department || 'General'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="table-punch-btn-group">
                                                {['Present', 'Absent', 'Leave'].map(st => (
                                                    <button
                                                        key={st}
                                                        type="button"
                                                        onClick={() => handleAttendanceChange(student.id, st)}
                                                        className={`table-punch-btn ${attendanceData[student.id] === st ? `active-${st.toLowerCase()}` : ''}`}
                                                    >
                                                        {st === 'Present' ? 'P' : st === 'Absent' ? 'A' : 'L'}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View Cards (Screens <= 640px) */}
                <div className="attendance-mobile-cards-view">
                    {filteredStudents.length === 0 ? (
                        <div className="mobile-empty-state">
                            No students found.
                        </div>
                    ) : filteredStudents.map(student => {
                        const current = attendanceData[student.id];
                        return (
                            <div key={student.id} className="mobile-student-card">
                                <div className="mobile-student-header">
                                    <div className="mobile-student-meta">
                                        <div className="mobile-student-name">{student.name}</div>
                                        <div className="mobile-student-phone">{student.phone}</div>
                                    </div>
                                    <span className="badge badge-dept">
                                        {student.details?.department || student.department || 'General'}
                                    </span>
                                </div>
                                <div className="mobile-student-punch-grid">
                                    <button
                                        type="button"
                                        onClick={() => handleAttendanceChange(student.id, 'Present')}
                                        className={`mobile-punch-choice btn-p ${current === 'Present' ? 'selected' : ''}`}
                                    >
                                        <Check size={16} />
                                        <span>Present</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAttendanceChange(student.id, 'Absent')}
                                        className={`mobile-punch-choice btn-a ${current === 'Absent' ? 'selected' : ''}`}
                                    >
                                        <X size={16} />
                                        <span>Absent</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAttendanceChange(student.id, 'Leave')}
                                        className={`mobile-punch-choice btn-l ${current === 'Leave' ? 'selected' : ''}`}
                                    >
                                        <span>Leave</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                .attendance-page-root {
                    width: 100%;
                    max-width: 100%;
                    overflow-x: hidden;
                }

                .attendance-page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                }

                .attendance-header-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }

                .attendance-back-btn {
                    background: white;
                    border: 1px solid var(--color-border);
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                }

                .attendance-main-title {
                    margin: 0;
                    font-size: 1.45rem;
                    font-weight: 800;
                    color: var(--slate-900);
                }

                .attendance-sub-title {
                    margin: 0;
                    font-size: 0.82rem;
                    color: var(--slate-500);
                }

                .attendance-header-date-wrap {
                    display: flex;
                    align-items: center;
                }

                .attendance-date-box {
                    width: auto;
                    min-width: 170px;
                }

                .attendance-date-input {
                    padding-left: 2.5rem !important;
                    font-size: 0.9rem;
                    border-radius: 10px;
                }

                /* Toolbar */
                .attendance-toolbar-box {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                    gap: 0.85rem;
                }

                .attendance-filters-row {
                    display: flex;
                    gap: 0.75rem;
                    flex: 1;
                    min-width: 260px;
                }

                .attendance-search-field {
                    flex: 1;
                    min-width: 140px;
                }

                .attendance-dept-select {
                    padding: 0.55rem 0.85rem;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    color: #0f172a !important;
                    -webkit-text-fill-color: #0f172a !important;
                    font-size: 0.88rem;
                    min-width: 140px;
                }
                .attendance-dept-select option {
                    color: #0f172a !important;
                    background: #ffffff !important;
                    -webkit-text-fill-color: #0f172a !important;
                }

                .attendance-actions-row {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .quick-mark-group {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }

                .quick-mark-label {
                    font-size: 0.82rem;
                    color: #64748b;
                    font-weight: 600;
                }

                .btn-qk {
                    padding: 0.35rem 0.65rem;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    background: transparent;
                    border: 1px solid;
                }

                .qk-p { color: #166534; border-color: #86efac; background: #f0fdf4; }
                .qk-a { color: #991b1b; border-color: #fca5a5; background: #fef2f2; }
                .qk-l { color: #92400e; border-color: #fde68a; background: #fffbeb; }

                .btn-save-sheet {
                    padding: 0.55rem 1.1rem !important;
                    font-size: 0.85rem !important;
                    border-radius: 10px !important;
                    font-weight: 700 !important;
                }

                /* Table styles */
                .attendance-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .attendance-table th {
                    padding: 0.9rem 1rem;
                    border-bottom: 2px solid #e2e8f0;
                    font-size: 0.82rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #64748b;
                }

                .attendance-table td {
                    padding: 0.9rem 1rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .cell-name {
                    font-weight: 600;
                    color: #1e293b;
                }

                .cell-phone {
                    color: #64748b;
                    font-size: 0.88rem;
                }

                .badge-dept {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 0.8rem;
                    font-weight: 600;
                    padding: 0.25rem 0.6rem;
                    border-radius: 6px;
                }

                .table-punch-btn-group {
                    display: inline-flex;
                    gap: 0.35rem;
                }

                .table-punch-btn {
                    padding: 0.4rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    font-weight: 700;
                    font-size: 0.82rem;
                    cursor: pointer;
                    background: white;
                    color: #64748b;
                    transition: all 0.15s ease;
                }

                .table-punch-btn.active-present { background: #10b981; color: white; border-color: #10b981; }
                .table-punch-btn.active-absent { background: #ef4444; color: white; border-color: #ef4444; }
                .table-punch-btn.active-leave { background: #f59e0b; color: white; border-color: #f59e0b; }

                /* Mobile Card View (hidden on desktop) */
                .attendance-mobile-cards-view {
                    display: none;
                }

                .mobile-student-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 1rem;
                    margin-bottom: 0.85rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                }

                .mobile-student-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.85rem;
                }

                .mobile-student-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #0f172a;
                }

                .mobile-student-phone {
                    font-size: 0.82rem;
                    color: #64748b;
                    margin-top: 0.15rem;
                }

                .mobile-student-punch-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                }

                .mobile-punch-choice {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.3rem;
                    padding: 0.65rem 0.5rem;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 0.88rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .mobile-punch-choice.btn-p.selected {
                    background: #10b981;
                    color: #ffffff;
                    border-color: #10b981;
                    box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
                }

                .mobile-punch-choice.btn-a.selected {
                    background: #ef4444;
                    color: #ffffff;
                    border-color: #ef4444;
                    box-shadow: 0 3px 8px rgba(239, 68, 68, 0.3);
                }

                .mobile-punch-choice.btn-l.selected {
                    background: #f59e0b;
                    color: #ffffff;
                    border-color: #f59e0b;
                    box-shadow: 0 3px 8px rgba(245, 158, 11, 0.3);
                }

                .empty-table-cell, .mobile-empty-state {
                    text-align: center;
                    padding: 2.5rem 1rem;
                    color: #64748b;
                    font-size: 0.9rem;
                }

                /* Responsive Breakpoints */
                @media (max-width: 640px) {
                    .attendance-desktop-view {
                        display: none;
                    }
                    .attendance-mobile-cards-view {
                        display: block;
                    }
                    .attendance-page-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.75rem;
                    }
                    .attendance-header-date-wrap {
                        width: 100%;
                    }
                    .attendance-date-box {
                        width: 100%;
                    }
                    .attendance-date-input {
                        width: 100%;
                    }
                    .attendance-filters-row {
                        flex-direction: column;
                        min-width: 100%;
                    }
                    .attendance-search-field, .attendance-dept-select {
                        width: 100%;
                    }
                    .attendance-actions-row {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .quick-mark-group {
                        flex: 1;
                        justify-content: space-between;
                    }
                    .btn-save-sheet {
                        width: 100%;
                        margin-top: 0.4rem;
                        padding: 0.75rem !important;
                        font-size: 0.95rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Attendance;
