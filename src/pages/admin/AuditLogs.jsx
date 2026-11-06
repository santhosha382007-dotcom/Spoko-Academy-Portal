import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, History, Shield, Search, Filter, Download, 
    Calendar, User, AlertTriangle, CheckCircle, RefreshCw, Loader 
} from 'lucide-react';
import { api } from '../../services/api';
import * as XLSX from 'xlsx';

const AuditLogs = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [securityLogs, setSecurityLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'security'

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [aLogs, sLogs] = await Promise.all([
                api.getAuditLogs(),
                api.getSecurityLogs()
            ]);
            setAuditLogs(aLogs.reverse());
            setSecurityLogs(sLogs.reverse());
        } catch (err) {
            console.error("Failed to load audit logs", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const exportLogsToExcel = () => {
        const dataToExport = activeTab === 'audit' ? auditLogs : securityLogs;
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'audit' ? "AuditLogs" : "SecurityLogs");
        XLSX.writeFile(wb, `Spoko_Logs_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredAuditLogs = auditLogs.filter(log => {
        const matchesCategory = filterCategory === 'All' || (log.eventType || '').toLowerCase().includes(filterCategory.toLowerCase());
        const matchesSearch =
            (log.eventType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.performedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredSecurityLogs = securityLogs.filter(log => {
        const matchesCategory = filterCategory === 'All' || (log.eventType || '').toLowerCase().includes(filterCategory.toLowerCase());
        const matchesSearch =
            (log.eventType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.userId || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>System Audit & Security Logs</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Permanent, tamper-evident audit trail of administrative modifications, bulk imports, and security events.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={loadData} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={exportLogsToExcel} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed' }}>
                        <Download size={14} /> Export Logs
                    </button>
                </div>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={{
                        padding: '0.65rem 1.25rem',
                        border: 'none',
                        background: activeTab === 'audit' ? '#7c3aed' : 'transparent',
                        color: activeTab === 'audit' ? 'white' : '#64748b',
                        fontWeight: 700,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem'
                    }}
                >
                    <History size={16} /> Administrative Audit Logs ({auditLogs.length})
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    style={{
                        padding: '0.65rem 1.25rem',
                        border: 'none',
                        background: activeTab === 'security' ? '#7c3aed' : 'transparent',
                        color: activeTab === 'security' ? 'white' : '#64748b',
                        fontWeight: 700,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem'
                    }}
                >
                    <Shield size={16} /> Proctor & Security Violations ({securityLogs.length})
                </button>
            </div>

            {/* Search and Category Filter */}
            <div className="toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-with-icon">
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search logs by keyword, action, user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Categories</option>
                        {activeTab === 'audit' ? (
                            <>
                                <option value="IMPORT">Bulk Import</option>
                                <option value="PASSWORD">Password Actions</option>
                                <option value="ATTENDANCE">Attendance Modifications</option>
                                <option value="LEAVE">Leave Workflow</option>
                                <option value="STUDENT">Student Management</option>
                                <option value="DEPARTMENT">Department Updates</option>
                            </>
                        ) : (
                            <>
                                <option value="LOGIN">Login & Authentication</option>
                                <option value="ASSESSMENT">Assessment Proctoring</option>
                                <option value="FULLSCREEN">Fullscreen Events</option>
                                <option value="TAB">Tab Visibility Events</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading audit trail...</p>
                </div>
            ) : (activeTab === 'audit' ? filteredAuditLogs : filteredSecurityLogs).length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                    No log entries found matching criteria.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Event Type</th>
                                <th>Performed By / User</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'audit' ? filteredAuditLogs : filteredSecurityLogs).map((entry, idx) => {
                                const event = entry.eventType || 'EVENT';
                                const isCritical = event.includes('BLOCKED') || event.includes('VIOLATION') || event.includes('TERMINATED') || event.includes('DELETED');
                                const isSuccess = event.includes('SUCCESS') || event.includes('APPROVED') || event.includes('CREATED') || event.includes('IMPORT');

                                return (
                                    <tr key={entry.id || idx}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#64748b' }}>
                                            {new Date(entry.timestamp).toLocaleString()}
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: isCritical ? '#fee2e2' : isSuccess ? '#d1fae5' : '#f1f5f9',
                                                color: isCritical ? '#991b1b' : isSuccess ? '#065f46' : '#334155',
                                                display: 'inline-block'
                                            }}>
                                                {event}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                            {entry.performedBy || entry.userName || entry.userId || 'System'}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#334155' }}>
                                            {entry.details || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
