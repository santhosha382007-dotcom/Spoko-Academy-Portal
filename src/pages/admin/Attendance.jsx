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
            // Audit Log per Section 7: Administrative attendance corrections must be audited
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
        <div className="fade-in">
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0 }}>Attendance Management</h1>
                        <p className="text-muted" style={{ margin: 0 }}>Unitedsoft Attendance & Location Verification System</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {activeTab === 'sheet' && (
                        <div className="input-with-icon" style={{ width: 'auto' }}>
                            <Calendar size={18} className="input-icon" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('sheet')}
                    className="btn"
                    style={{
                        background: activeTab === 'sheet' ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === 'sheet' ? 'white' : '#64748b',
                        fontWeight: 700, borderRadius: '8px'
                    }}
                >
                    <Calendar size={16} style={{ marginRight: '6px' }} />
                    Daily Attendance Sheet
                </button>

                <button
                    onClick={() => setActiveTab('geofence')}
                    className="btn"
                    style={{
                        background: activeTab === 'geofence' ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === 'geofence' ? 'white' : '#64748b',
                        fontWeight: 700, borderRadius: '8px'
                    }}
                >
                    <MapPin size={16} style={{ marginRight: '6px' }} />
                    Campus Geo-Fencing Settings ({branchList.length})
                </button>

                <button
                    onClick={() => setActiveTab('logs')}
                    className="btn"
                    style={{
                        background: activeTab === 'logs' ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === 'logs' ? 'white' : '#64748b',
                        fontWeight: 700, borderRadius: '8px'
                    }}
                >
                    <ShieldCheck size={16} style={{ marginRight: '6px' }} />
                    Live Geo-Punches Audit ({geoLogs.length})
                </button>
            </div>

            {/* TAB 1: DAILY ATTENDANCE SHEET */}
            {activeTab === 'sheet' && (
                <div className="card glass-panel">
                    <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                            <div className="input-with-icon" style={{ flex: 1, maxWidth: '300px' }}>
                                <Search size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="select-input"
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ddd' }}
                            >
                                <option value="All">All Departments</option>
                                {departmentList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Quick Mark:</span>
                            <button onClick={() => markAll('Present')} className="btn btn-outline btn-sm" style={{ color: '#166534', borderColor: '#86efac' }}>All P</button>
                            <button onClick={() => markAll('Absent')} className="btn btn-outline btn-sm" style={{ color: '#991b1b', borderColor: '#fca5a5' }}>All A</button>
                            <button onClick={() => markAll('Leave')} className="btn btn-outline btn-sm" style={{ color: '#92400e', borderColor: '#fde68a' }}>All L</button>
                            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm" style={{ marginLeft: '1rem' }}>
                                {isSaving ? 'Saving...' : 'Save Sheet'}
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Student Name</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Phone / User ID</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Department</th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            No students found.
                                        </td>
                                    </tr>
                                ) : filteredStudents.map(student => (
                                    <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                                        <td style={{ padding: '1rem', color: '#64748b' }}>{student.phone}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                                {student.details?.department || 'General'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                                {['Present', 'Absent', 'Leave'].map(st => (
                                                    <button
                                                        key={st}
                                                        onClick={() => handleAttendanceChange(student.id, st)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e2e8f0',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            background: attendanceData[student.id] === st
                                                                ? (st === 'Present' ? '#10b981' : st === 'Absent' ? '#ef4444' : '#f59e0b')
                                                                : 'white',
                                                            color: attendanceData[student.id] === st ? 'white' : '#64748b'
                                                        }}
                                                    >
                                                        {st[0]}
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
            )}

            {/* TAB 2: MULTI-CAMPUS GEO-FENCING SETTINGS */}
            {activeTab === 'geofence' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Branch List Sidebar */}
                    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {branchList.map(branch => {
                                const isSelected = (geoSettings.id === branch.id) || (selectedBranchId === branch.id);
                                return (
                                    <div
                                        key={branch.id}
                                        onClick={() => handleBranchSelect(branch)}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : '#e2e8f0'}`,
                                            background: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--color-primary)' : '#1e293b' }}>
                                                {branch.orgName}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                                                Radius: {branch.allowedRadiusMeters}m {branch.branchCode ? `• Code: ${branch.branchCode}` : ''}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
                                                className="btn-icon-sm"
                                                style={{ color: '#ef4444', background: '#fee2e2', borderRadius: '6px', padding: '0.35rem', border: 'none', cursor: 'pointer' }}
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
                    <div className="card glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <MapPin size={28} color="var(--color-primary)" />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Edit: {geoSettings.orgName || 'Campus Branch'}</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                    Define official GPS coordinates and allowed radius. Students outside this radius will be rejected during punch-in.
                                </p>
                            </div>
                        </div>

                        {geoMsg && (
                            <div style={{
                                padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem',
                                background: geoMsg.includes('success') ? '#ecfdf5' : '#fef2f2',
                                color: geoMsg.includes('success') ? '#065f46' : '#991b1b',
                                border: `1px solid ${geoMsg.includes('success') ? '#a7f3d0' : '#fecaca'}`
                            }}>
                                {geoMsg}
                            </div>
                        )}

                        <form onSubmit={handleSaveGeoSettings}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Campus / Branch Name</label>
                                    <input
                                        type="text"
                                        value={geoSettings.orgName || ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, orgName: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Branch Code / Tag</label>
                                    <input
                                        type="text"
                                        value={geoSettings.branchCode || ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, branchCode: e.target.value })}
                                        placeholder="e.g. MAIN, CITY"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Official Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={geoSettings.latitude !== undefined ? geoSettings.latitude : ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, latitude: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Official Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={geoSettings.longitude !== undefined ? geoSettings.longitude : ''}
                                        onChange={(e) => setGeoSettings({ ...geoSettings, longitude: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Allowed Attendance Radius (in meters)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="50000"
                                    value={geoSettings.allowedRadiusMeters || 500}
                                    onChange={(e) => setGeoSettings({ ...geoSettings, allowedRadiusMeters: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                                <small style={{ color: '#64748b' }}>Students within this radius from the campus GPS will be accepted (Default: 500m).</small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Campus Address / Landmark (Optional)</label>
                                <input
                                    type="text"
                                    value={geoSettings.address || ''}
                                    onChange={(e) => setGeoSettings({ ...geoSettings, address: e.target.value })}
                                    placeholder="e.g. 12/4 Academy Road, Salem Highway"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handleDetectCurrentLocation}
                                    className="btn btn-outline"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Navigation size={16} />
                                    Set to My Current GPS
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSavingGeo}
                                    className="btn btn-primary"
                                >
                                    {isSavingGeo ? 'Saving...' : 'Save Campus Branch'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Add Branch Modal */}
                    {showAddBranchModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 9999, padding: '1rem'
                        }}>
                            <div className="card glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Add New Campus Branch</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddBranchModal(false)}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateBranch}>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Campus / Branch Name *</label>
                                        <input
                                            type="text"
                                            value={newBranchData.orgName}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, orgName: e.target.value })}
                                            placeholder="e.g. Spoko Metro Campus"
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Branch Code / Tag</label>
                                        <input
                                            type="text"
                                            value={newBranchData.branchCode}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, branchCode: e.target.value })}
                                            placeholder="e.g. METRO"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Latitude *</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={newBranchData.latitude}
                                                onChange={(e) => setNewBranchData({ ...newBranchData, latitude: e.target.value })}
                                                placeholder="e.g. 11.3410"
                                                required
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Longitude *</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={newBranchData.longitude}
                                                onChange={(e) => setNewBranchData({ ...newBranchData, longitude: e.target.value })}
                                                placeholder="e.g. 77.7172"
                                                required
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Allowed Radius (meters) *</label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="50000"
                                            value={newBranchData.allowedRadiusMeters}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, allowedRadiusMeters: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>Address (Optional)</label>
                                        <input
                                            type="text"
                                            value={newBranchData.address}
                                            onChange={(e) => setNewBranchData({ ...newBranchData, address: e.target.value })}
                                            placeholder="Physical address"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
                <div className="card glass-panel">
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Geo-Attendance Punch Audit Log</h3>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Student</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Date & Time</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Coordinates</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Distance from Campus</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Verification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {geoLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                                            No GPS punch logs recorded yet. When students mark attendance via GPS, their location and Haversine distance will appear here.
                                        </td>
                                    </tr>
                                ) : geoLogs.map(log => (
                                    <tr key={log.id || log.createdAt} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{log.userName || log.userId}</td>
                                        <td style={{ padding: '1rem', color: '#64748b' }}>{log.date} {log.time}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <strong>{log.distanceMeters !== undefined ? `${log.distanceMeters} m` : 'N/A'}</strong>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.3rem 0.75rem', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 700,
                                                background: log.verificationResult === 'VALID' ? '#dcfce7' : '#fee2e2',
                                                color: log.verificationResult === 'VALID' ? '#166534' : '#991b1b'
                                            }}>
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
        </div>
    );
};

export default Attendance;
