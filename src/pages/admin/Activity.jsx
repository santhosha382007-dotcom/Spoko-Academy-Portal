import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, UserMinus, ShieldAlert, History, MessageSquare, Save, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

const Activity = () => {
    const [tab, setTab] = useState('users'); // 'users' | 'security'
    const [users, setUsers] = useState([]);
    const [securityLogs, setSecurityLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [reason, setReason] = useState('');
    const [blockType, setBlockType] = useState('temp'); // temp, perm, left

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersData, logsData] = await Promise.all([
                api.getUsersByRole('student'),
                api.getSecurityLogs()
            ]);
            setUsers(usersData);
            setSecurityLogs(logsData.reverse());
        } catch (err) {
            console.error("Failed to load activity data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (user, type) => {
        if (type === 'left') {
            if (confirm(`Are you sure you want to mark ${user.name} as "Student Left"?`)) {
                try {
                    await api.updateUser(user.id, {
                        status: 'left',
                        activityLog: { type: 'left', date: new Date().toISOString() }
                    });
                    await api.createSecurityLog({
                        userId: user.id,
                        eventType: 'USER_MARKED_LEFT',
                        status: 'UPDATED',
                        details: `Student ${user.name} marked as Left by Admin`
                    });
                    fetchData();
                    alert("Status updated successfully.");
                } catch (e) { alert("Failed to update status."); }
            }
        } else {
            setSelectedUser(user);
            setBlockType(type);
            setReason('');
        }
    };

    const submitBlock = async () => {
        if (!reason.trim()) {
            alert("Please provide a reason.");
            return;
        }

        try {
            const status = blockType === 'temp' ? 'blocked' : 'permanent_blocked';
            await api.updateUser(selectedUser.id, {
                status: status,
                blockReason: reason,
                blockType: blockType,
                blockedAt: new Date().toISOString()
            });
            await api.createSecurityLog({
                userId: selectedUser.id,
                eventType: 'USER_ACCOUNT_BLOCKED',
                status: 'BLOCKED',
                details: `Student ${selectedUser.name} ${blockType === 'temp' ? 'temporarily' : 'permanently'} blocked: "${reason}"`
            });
            setSelectedUser(null);
            fetchData();
            alert(`Student has been ${blockType === 'temp' ? 'temporarily' : 'permanently'} blocked.`);
        } catch (e) {
            alert("Failed to block student.");
        }
    };

    const unblockStudent = async (user) => {
        if (confirm(`Are you sure you want to unblock ${user.name}?`)) {
            try {
                await api.updateUser(user.id, {
                    status: 'active',
                    blockReason: null,
                    blockType: null,
                    blockedAt: null
                });
                await api.createSecurityLog({
                    userId: user.id,
                    eventType: 'USER_ACCOUNT_UNBLOCKED',
                    status: 'ALLOWED',
                    details: `Student ${user.name} unblocked by Admin`
                });
                fetchData();
                alert("Student unblocked successfully.");
            } catch (e) { alert("Failed to unblock."); }
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        (u.details?.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLogs = securityLogs.filter(l =>
        (l.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.eventType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="activity-page animate-fade-in">
            <header style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0 }}>Activity & Security Center</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Unitedsoft System Management</p>
                    </div>
                </div>
                <div className="input-with-icon" style={{ width: '300px' }}>
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setTab('users')}
                    className="btn"
                    style={{
                        background: tab === 'users' ? 'var(--color-primary)' : 'transparent',
                        color: tab === 'users' ? 'white' : '#64748b',
                        fontWeight: 700, borderRadius: '8px'
                    }}
                >
                    <UserMinus size={16} style={{ marginRight: '6px' }} />
                    Student Status & Restrictions
                </button>

                <button
                    onClick={() => setTab('security')}
                    className="btn"
                    style={{
                        background: tab === 'security' ? 'var(--color-primary)' : 'transparent',
                        color: tab === 'security' ? 'white' : '#64748b',
                        fontWeight: 700, borderRadius: '8px'
                    }}
                >
                    <ShieldAlert size={16} style={{ marginRight: '6px' }} />
                    Security Event Audit Log ({securityLogs.length})
                </button>
            </div>

            {tab === 'users' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Department</th>
                                <th>Current Status</th>
                                <th>Block Reason</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>No students found.</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <img src={user.avatar} className="avatar-sm" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{user.name}</div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.details?.department || '-'}</td>
                                    <td>
                                        <span className={`status-pill ${user.status}`}>
                                            {user.status === 'permanent_blocked' ? 'Permanently Blocked' :
                                                user.status === 'blocked' ? 'Temp Blocked' :
                                                    user.status === 'left' ? 'Left' : 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                                        {user.blockReason ? (
                                            <div className="reason-text">"{user.blockReason}"</div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {user.status !== 'active' ? (
                                                <button onClick={() => unblockStudent(user)} className="btn btn-outline btn-sm" style={{ color: '#10b981' }}>Unblock Student</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleAction(user, 'temp')} className="btn btn-outline btn-sm" style={{ color: 'orange' }}>Temp Block</button>
                                                    <button onClick={() => handleAction(user, 'perm')} className="btn btn-outline btn-sm" style={{ color: 'red' }}>Perm Block</button>
                                                    <button onClick={() => handleAction(user, 'left')} className="btn btn-outline btn-sm text-muted">Left</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'security' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User ID</th>
                                <th>Event Type</th>
                                <th>Status</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>No security events recorded yet.</td></tr>
                            ) : filteredLogs.map((log, index) => (
                                <tr key={log.id || index}>
                                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{log.userId || 'System'}</td>
                                    <td>
                                        <span style={{
                                            fontFamily: 'monospace', fontSize: '0.78rem', padding: '0.2rem 0.5rem',
                                            borderRadius: '6px', background: '#f1f5f9', color: '#334155'
                                        }}>
                                            {log.eventType}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 700,
                                            background: log.status === 'ALLOWED' || log.status === 'SUCCESS' ? '#dcfce7' :
                                                log.status === 'VIOLATION' || log.status === 'BLOCKED' || log.status === 'TERMINATED' ? '#fee2e2' : '#fef3c7',
                                            color: log.status === 'ALLOWED' || log.status === 'SUCCESS' ? '#166534' :
                                                log.status === 'VIOLATION' || log.status === 'BLOCKED' || log.status === 'TERMINATED' ? '#991b1b' : '#92400e'
                                        }}>
                                            {log.status || 'LOGGED'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                                        {log.details || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal for Reason */}
            {selectedUser && (
                <div className="modal-overlay">
                    <div className="card modal-content animate-pop">
                        <h2>Reason for {blockType === 'temp' ? 'Temporary' : 'Permanent'} Block</h2>
                        <p className="text-muted">This message will be shown to {selectedUser.name} during login.</p>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <label>Reason / Message</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Unusual login activity, Fees pending, etc."
                                style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => setSelectedUser(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={submitBlock} className="btn btn-primary" style={{ flex: 1 }}>
                                <Save size={18} /> Confirm Block
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 1.25rem; text-align: left; border-bottom: 1px solid var(--color-border); }
                .data-table th { background: #f8fafc; color: var(--color-text-muted); font-size: 0.8rem; text-transform: uppercase; }
                
                .status-pill {
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-pill.active { background: #dcfce7; color: #166534; }
                .status-pill.blocked { background: #fef9c3; color: #854d0e; }
                .status-pill.permanent_blocked { background: #fee2e2; color: #991b1b; }
                .status-pill.left { background: #f1f5f9; color: #475569; }

                .reason-text { font-style: italic; color: #64748b; }
                
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .modal-content { width: 450px; padding: 2rem; }
                .btn-sm { padding: 0.4rem 0.6rem; font-size: 0.75rem; }
            `}</style>
        </div>
    );
};

export default Activity;
