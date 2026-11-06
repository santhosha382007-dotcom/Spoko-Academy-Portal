import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Check, X, Search, Calendar, Filter, ArrowLeft, MapPin, Navigation, Settings, ShieldCheck, ListFilter, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

const Attendance = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'geofence' | 'logs'

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: 'Present' | 'Absent' | 'Leave' }
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('All');

    // Geo Settings State
    const [geoSettings, setGeoSettings] = useState({
        id: 'branch-main',
        orgName: 'Spoko Academy Main Campus',
        branchCode: 'MAIN',
        latitude: 11.3410,
        longitude: 77.7172,
        allowedRadiusMeters: 500,
        address: ''
    });
    const [isSavingGeo, setIsSavingGeo] = useState(false);
    const [geoMsg, setGeoMsg] = useState('');

    // Multi-Campus Branches State
    const [branchList, setBranchList] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    const [newBranchData, setNewBranchData] = useState({
        orgName: '',
        branchCode: '',
        latitude: '',
        longitude: '',
        allowedRadiusMeters: 500,
        address: ''
    });

    // Geo Logs State
    const [geoLogs, setGeoLogs] = useState([]);
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

            // Load Attendance
            const allAttendance = await api.getAttendance();
            const todaysRecord = allAttendance[date] || {};
            setAttendanceData(todaysRecord);

            // Load All Geo Branches
            const settings = await api.getLocationSettings();
            const list = Array.isArray(settings) ? settings : [settings];
            setBranchList(list);
            if (list.length > 0) {
                const active = list.find(b => b.id === selectedBranchId) || list[0];
                setSelectedBranchId(active.id);
                setGeoSettings(active);
            }

            // Load Geo Logs
            const logs = await api.getAttendanceRecords();
            setGeoLogs(logs.reverse());
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
            alert(`Attendance for ${date} saved and audited successfully!`);
        } catch (e) {
            console.error("Failed to save attendance", e);
            alert(`Failed to save attendance: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBranchSelect = (branch) => {
        setSelectedBranchId(branch.id);
        setGeoSettings(branch);
        setGeoMsg('');
    };

    const handleSaveGeoSettings = async (e) => {
        e.preventDefault();
        setIsSavingGeo(true);
        setGeoMsg('');
        try {
            const targetId = geoSettings.id || selectedBranchId || 'branch-main';
            const payload = {
                ...geoSettings,
                latitude: parseFloat(geoSettings.latitude),
                longitude: parseFloat(geoSettings.longitude),
                allowedRadiusMeters: parseInt(geoSettings.allowedRadiusMeters, 10)
            };
            await api.updateLocationBranch(targetId, payload);
            setGeoMsg(`Campus branch "${payload.orgName}" saved successfully!`);
            setBranchList(prev => prev.map(b => b.id === targetId ? { ...b, ...payload } : b));
            await api.createSecurityLog({
                userId: user.id,
                eventType: 'GEOFENCE_SETTINGS_UPDATED',
                status: 'SUCCESS',
                details: `Admin updated campus ${payload.orgName} (${targetId}) to ${payload.latitude}, ${payload.longitude} with radius ${payload.allowedRadiusMeters}m`,
                userAgent: navigator.userAgent
            });
        } catch (err) {
            setGeoMsg('Failed to update location settings.');
        } finally {
            setIsSavingGeo(false);
        }
    };

    const handleCreateBranch = async (e) => {
        e.preventDefault();
        if (!newBranchData.orgName || !newBranchData.latitude || !newBranchData.longitude) {
            alert('Please fill all required branch fields.');
            return;
        }
        setIsSavingGeo(true);
        try {
            const newBranch = {
                id: `branch-${Date.now()}`,
                orgName: newBranchData.orgName,
                branchCode: newBranchData.branchCode || newBranchData.orgName.toUpperCase().slice(0, 4),
                latitude: parseFloat(newBranchData.latitude),
                longitude: parseFloat(newBranchData.longitude),
                allowedRadiusMeters: parseInt(newBranchData.allowedRadiusMeters, 10) || 500,
                address: newBranchData.address || '',
                isDefault: false
            };
            await api.createLocationBranch(newBranch);
            setBranchList(prev => [...prev, newBranch]);
            setSelectedBranchId(newBranch.id);
            setGeoSettings(newBranch);
            setShowAddBranchModal(false);
            setNewBranchData({
                orgName: '',
                branchCode: '',
                latitude: '',
                longitude: '',
                allowedRadiusMeters: 500,
                address: ''
            });
            setGeoMsg(`Campus branch "${newBranch.orgName}" created successfully!`);
            await api.createSecurityLog({
                userId: user.id,
                eventType: 'GEOFENCE_BRANCH_CREATED',
                status: 'SUCCESS',
                details: `Admin added campus branch ${newBranch.orgName} at ${newBranch.latitude}, ${newBranch.longitude}`,
                userAgent: navigator.userAgent
            });
        } catch (err) {
            alert(`Failed to add branch: ${err.message}`);
        } finally {
            setIsSavingGeo(false);
        }
    };

    const handleDeleteBranch = async (branchId) => {
        if (branchList.length <= 1) {
            alert('At least one campus branch must remain in the system.');
            return;
        }
        const branchToDelete = branchList.find(b => b.id === branchId);
        if (!window.confirm(`Are you sure you want to delete "${branchToDelete?.orgName || branchId}"?`)) return;
        try {
            await api.deleteLocationBranch(branchId);
            const remaining = branchList.filter(b => b.id !== branchId);
            setBranchList(remaining);
            setSelectedBranchId(remaining[0].id);
            setGeoSettings(remaining[0]);
            setGeoMsg(`Campus branch "${branchToDelete?.orgName || branchId}" deleted successfully.`);
            await api.createSecurityLog({
                userId: user.id,
                eventType: 'GEOFENCE_BRANCH_DELETED',
                status: 'SUCCESS',
                details: `Admin deleted campus branch ${branchToDelete?.orgName || branchId}`,
                userAgent: navigator.userAgent
            });
        } catch (err) {
            alert(`Failed to delete branch: ${err.message}`);
        }
    };

    const handleDetectCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported by this browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGeoSettings(prev => ({
                    ...prev,
                    latitude: parseFloat(pos.coords.latitude.toFixed(6)),
                    longitude: parseFloat(pos.coords.longitude.toFixed(6))
                }));
                alert(`Detected coordinates: Lat ${pos.coords.latitude.toFixed(6)}, Lon ${pos.coords.longitude.toFixed(6)}`);
            },
            (err) => {
                alert(`Could not detect location: ${err.message}`);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleDetectNewBranchLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported by this browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewBranchData(prev => ({
                    ...prev,
                    latitude: parseFloat(pos.coords.latitude.toFixed(6)),
                    longitude: parseFloat(pos.coords.longitude.toFixed(6))
                }));
                alert(`Detected coordinates: Lat ${pos.coords.latitude.toFixed(6)}, Lon ${pos.coords.longitude.toFixed(6)}`);
            },
            (err) => {
                alert(`Could not detect location: ${err.message}`);
            },
            { enableHighAccuracy: true }
        );
    };

    // Filter students for UI display
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm);
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
                        <p className="attendance-sub-title">Spoko Academy Attendance & Location Verification System</p>
                    </div>
                </div>

                <div className="attendance-header-date-wrap">
                    {activeTab === 'sheet' && (
                        <div className="input-with-icon attendance-date-box">
                            <Calendar size={18} className="input-icon" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="attendance-date-input"
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Navigation Tabs - Horizontally scrollable on mobile */}
            <div className="attendance-tabs-container">
                <button
                    type="button"
                    onClick={() => setActiveTab('sheet')}
                    className={`attendance-tab-btn ${activeTab === 'sheet' ? 'active' : ''}`}
                >
                    <Calendar size={16} />
                    <span>Daily Attendance Sheet</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('geofence')}
                    className={`attendance-tab-btn ${activeTab === 'geofence' ? 'active' : ''}`}
                >
                    <MapPin size={16} />
                    <span>Campus Geo-Fencing ({branchList.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className={`attendance-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                >
                    <ShieldCheck size={16} />
                    <span>Live Geo-Punches Audit ({geoLogs.length})</span>
                </button>
            </div>

            {/* TAB 1: DAILY ATTENDANCE SHEET */}
            {activeTab === 'sheet' && (
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
                            >
                                <option value="All">All Departments</option>
                                {departmentList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
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
            )}

            {/* TAB 2: MULTI-CAMPUS GEO-FENCING SETTINGS */}
            {activeTab === 'geofence' && (
                <div className="geofence-layout-container">
                    {/* Branch List Sidebar */}
                    <div className="card glass-panel geofence-branch-sidebar">
                        <div className="geofence-sidebar-header">
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Campus Branches</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddBranchModal(true)}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            >
                                <Plus size={14} /> Add Branch
                            </button>
                        </div>

                        <div className="geofence-branch-list">
                            {branchList.map(branch => {
                                const isSelected = (geoSettings.id === branch.id) || (selectedBranchId === branch.id);
                                return (
                                    <div
                                        key={branch.id}
                                        onClick={() => handleBranchSelect(branch)}
                                        className={`branch-list-item ${isSelected ? 'selected' : ''}`}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="branch-item-title">
                                                {branch.orgName}
                                            </div>
                                            <div className="branch-item-radius">
                                                Radius: {branch.allowedRadiusMeters}m {branch.branchCode ? `• Code: ${branch.branchCode}` : ''}
                                            </div>
                                            <div className="branch-item-coords">
                                                {branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}
                                            </div>
                                        </div>

                                        {branchList.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBranch(branch.id);
                                                }}
                                                className="btn-delete-branch"
                                                title="Delete branch"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Branch Editor Panel */}
                    <div className="card glass-panel geofence-editor-panel">
                        <div className="geofence-editor-header">
                            <MapPin size={28} color="var(--color-primary)" className="editor-pin-icon" />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit: {geoSettings.orgName || 'Campus Branch'}</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                    Define official GPS coordinates and allowed radius. Students outside this radius will be rejected during punch-in.
                                </p>
                            </div>
                        </div>

                        {geoMsg && (
                            <div className={`geo-alert-msg ${geoMsg.includes('success') ? 'alert-success' : 'alert-danger'}`}>
                                {geoMsg}
                            </div>
                        )}

                        <form onSubmit={handleSaveGeoSettings}>
                            <div className="geofence-form-row">
                                <div className="form-group">
                                    <label>Campus / Branch Name</label>
                                    <input
                                        type="text"
                                        value={geoSettings.orgName || ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, orgName: e.target.value })}
                                        required
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Branch Code / Tag</label>
                                    <input
                                        type="text"
                                        value={geoSettings.branchCode || ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, branchCode: e.target.value })}
                                        placeholder="e.g. MAIN, CITY"
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            <div className="geofence-form-row">
                                <div className="form-group">
                                    <label>Official Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={geoSettings.latitude !== undefined ? geoSettings.latitude : ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, latitude: e.target.value })}
                                        required
                                        className="form-control"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Official Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={geoSettings.longitude !== undefined ? geoSettings.longitude : ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, longitude: e.target.value })}
                                        required
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label>Allowed Attendance Radius (in meters)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="50000"
                                    value={geoSettings.allowedRadiusMeters || 500}
                                    onChange={(e) => setGeoSettings({ ...geoSettings, allowedRadiusMeters: e.target.value })}
                                    required
                                    className="form-control"
                                />
                                <small style={{ color: '#64748b', display: 'block', marginTop: '0.3rem' }}>
                                    Students within this radius from the campus GPS will be accepted (Default: 500m).
                                </small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Physical Address (Optional)</label>
                                <input
                                    type="text"
                                    value={geoSettings.address || ''}
                                    onChange={(e) => setGeoSettings({ ...geoSettings, address: e.target.value })}
                                    placeholder="e.g. Campus Road, Chennai"
                                    className="form-control"
                                />
                            </div>

                            <div className="geofence-form-actions">
                                <button
                                    type="button"
                                    onClick={handleDetectCurrentLocation}
                                    className="btn btn-outline btn-sm"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                    <Navigation size={14} /> Detect Current Device GPS
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingGeo}
                                    className="btn btn-primary btn-sm"
                                >
                                    {isSavingGeo ? 'Saving...' : 'Update Campus Branch'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Add Branch Modal */}
                    {showAddBranchModal && (
                        <div className="modal-backdrop">
                            <div className="modal-card-box">
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Add New Campus Branch</h3>
                                <form onSubmit={handleCreateBranch}>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Campus / Branch Name *</label>
                                        <input
                                            type="text"
                                            value={newBranchData.orgName}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, orgName: e.target.value })}
                                            placeholder="e.g. Spoko Academy - North Branch"
                                            required
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Branch Code (Optional)</label>
                                        <input
                                            type="text"
                                            value={newBranchData.branchCode}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, branchCode: e.target.value })}
                                            placeholder="e.g. METRO"
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="geofence-form-row" style={{ marginBottom: '1rem' }}>
                                        <div className="form-group">
                                            <label>Latitude *</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={newBranchData.latitude}
                                                onChange={(e) => setNewBranchData({ ...newBranchData, latitude: e.target.value })}
                                                placeholder="e.g. 11.3410"
                                                required
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Longitude *</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={newBranchData.longitude}
                                                onChange={(e) => setNewBranchData({ ...newBranchData, longitude: e.target.value })}
                                                placeholder="e.g. 77.7172"
                                                required
                                                className="form-control"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Allowed Radius (meters) *</label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="50000"
                                            value={newBranchData.allowedRadiusMeters}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, allowedRadiusMeters: e.target.value })}
                                            required
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Address (Optional)</label>
                                        <input
                                            type="text"
                                            value={newBranchData.address}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, address: e.target.value })}
                                            placeholder="Physical address"
                                            className="form-control"
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={handleDetectNewBranchLocation}
                                            className="btn btn-outline btn-sm"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            <Navigation size={14} /> My GPS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddBranchModal(false)}
                                            className="btn btn-outline btn-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingGeo}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {isSavingGeo ? 'Creating...' : 'Create Campus Branch'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: LIVE GEO-PUNCHES AUDIT */}
            {activeTab === 'logs' && (
                <div className="card glass-panel attendance-content-card">
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Geo-Attendance Punch Audit Log</h3>
                    <div className="table-responsive">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Student</th>
                                    <th style={{ textAlign: 'left' }}>Date & Time</th>
                                    <th style={{ textAlign: 'left' }}>Coordinates</th>
                                    <th style={{ textAlign: 'left' }}>Distance from Campus</th>
                                    <th style={{ textAlign: 'left' }}>Verification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {geoLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-table-cell">
                                            No GPS punch logs recorded yet. When students mark attendance via GPS, their location and Haversine distance will appear here.
                                        </td>
                                    </tr>
                                ) : geoLogs.map(log => (
                                    <tr key={log.id || log.createdAt}>
                                        <td className="cell-name">{log.userName || log.userId}</td>
                                        <td className="cell-phone">{log.date} {log.time}</td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}
                                        </td>
                                        <td>
                                            <strong>{log.distanceMeters !== undefined ? `${log.distanceMeters} m` : 'N/A'}</strong>
                                        </td>
                                        <td>
                                            <span className={`badge-pill ${log.verificationResult === 'VALID' ? 'badge-valid' : 'badge-invalid'}`}>
                                                {log.verificationResult || log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

                /* Horizontally Scrollable Tabs Navigation */
                .attendance-tabs-container {
                    display: flex;
                    gap: 0.6rem;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    padding-bottom: 0.4rem;
                    margin-bottom: 1.25rem;
                    border-bottom: 2px solid #e2e8f0;
                }

                .attendance-tabs-container::-webkit-scrollbar {
                    display: none;
                }

                .attendance-tab-btn {
                    white-space: nowrap;
                    flex-shrink: 0;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.6rem 1rem;
                    border-radius: 10px;
                    font-size: 0.88rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    background: transparent;
                    color: #64748b;
                    transition: all 0.2s ease;
                }

                .attendance-tab-btn.active {
                    background: var(--color-primary);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
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
                    font-size: 0.88rem;
                    min-width: 140px;
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

                /* Geo-Fencing Styles */
                .geofence-layout-container {
                    display: grid;
                    grid-template-columns: minmax(280px, 340px) 1fr;
                    gap: 1.5rem;
                    align-items: start;
                }

                .geofence-branch-sidebar {
                    padding: 1.25rem;
                }

                .geofence-sidebar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                }

                .geofence-branch-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .branch-list-item {
                    padding: 0.9rem;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                    background: #ffffff;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s ease;
                }

                .branch-list-item.selected {
                    border-color: var(--color-primary);
                    background: rgba(79, 70, 229, 0.05);
                }

                .branch-item-title {
                    font-weight: 700;
                    font-size: 0.92rem;
                    color: #1e293b;
                }

                .branch-item-radius {
                    font-size: 0.8rem;
                    color: #64748b;
                    margin-top: 0.15rem;
                }

                .branch-item-coords {
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                .btn-delete-branch {
                    color: #ef4444;
                    background: #fee2e2;
                    border-radius: 6px;
                    padding: 0.35rem;
                    border: none;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .geofence-editor-panel {
                    padding: 1.75rem;
                }

                .geofence-editor-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .editor-pin-icon {
                    flex-shrink: 0;
                }

                .geo-alert-msg {
                    padding: 0.85rem 1rem;
                    border-radius: 10px;
                    margin-bottom: 1.5rem;
                    font-size: 0.88rem;
                }

                .alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
                .alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

                .geofence-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                }

                .form-control {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 0.9rem;
                    box-sizing: border-box;
                }

                .geofence-form-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }

                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .modal-card-box {
                    background: white;
                    padding: 1.75rem;
                    border-radius: 16px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .badge-pill {
                    padding: 0.3rem 0.75rem;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .badge-valid { background: #dcfce7; color: #166534; }
                .badge-invalid { background: #fee2e2; color: #991b1b; }

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
                    .geofence-layout-container {
                        grid-template-columns: 1fr;
                    }
                    .geofence-form-row {
                        grid-template-columns: 1fr;
                    }
                    .geofence-editor-panel {
                        padding: 1.25rem;
                    }
                    .geofence-form-actions {
                        flex-direction: column;
                    }
                    .geofence-form-actions button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default Attendance;
