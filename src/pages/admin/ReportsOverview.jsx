import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Search, Filter, Download, FileText, Award, Calendar, Loader } from 'lucide-react';
import { api } from '../../services/api';
import * as XLSX from 'xlsx';

const ReportsOverview = () => {
    const [students, setStudents] = useState([]);
    const [results, setResults] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            try {
                const [allUsers, allResults, allAttendance, depts] = await Promise.all([
                    api.getUsers(),
                    api.getResults(),
                    api.getAttendance(),
                    api.getDepartments()
                ]);

                const studentUsers = allUsers.filter(u => u.role === 'student');
                setStudents(studentUsers);
                setResults(allResults);
                setAttendance(allAttendance);
                setDepartments(depts);
            } catch (err) {
                console.error("Failed to load reports overview", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadAll();
    }, []);

    // Calculate metrics per student
    const studentMetrics = students.map(s => {
        const sResults = results.filter(r => String(r.userId) === String(s.id) || String(r.userId) === String(s.phone));
        const examCount = sResults.length;
        const avgScore = examCount > 0
            ? Math.round(sResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / examCount)
            : 0;

        let presentDays = 0;
        let totalDays = 0;
        Object.values(attendance).forEach(dateRecord => {
            if (dateRecord && dateRecord[s.id]) {
                totalDays++;
                const st = String(dateRecord[s.id]).toLowerCase();
                if (st === 'present' || st === 'p') presentDays++;
            }
        });

        const attPercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        return {
            ...s,
            examCount,
            avgScore,
            attPercentage,
            presentDays,
            totalDays
        };
    });

    const filtered = studentMetrics.filter(s => {
        const sDept = s.department || s.details?.department;
        const matchesDept = filterDept === 'All' || sDept === filterDept;
        const matchesSearch =
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(s.phone || '').includes(searchTerm);
        return matchesDept && matchesSearch;
    });

    const exportReportsToExcel = () => {
        const data = filtered.map(s => ({
            'Student ID': s.id,
            'Student Name': s.name,
            'Mobile': s.phone,
            'Department': s.details?.department || 'Unassigned',
            'Batch': s.details?.batch || '-',
            'Attendance Rate': `${s.attPercentage}% (${s.presentDays}/${s.totalDays} Days)`,
            'Assessments Taken': s.examCount,
            'Average Score': `${s.avgScore}%`,
            'Account Status': s.status || 'active'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "StudentReports");
        XLSX.writeFile(wb, `Spoko_Academy_Student_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Student Performance & Reports</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Comprehensive academy reports analyzing student exam competencies and attendance rates.
                        </p>
                    </div>
                </div>

                <button
                    onClick={exportReportsToExcel}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Download size={14} /> Export All Reports
                </button>
            </div>

            {/* Filters */}
            <div className="toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-with-icon">
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search by student name, ID, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reports Table */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Aggregating reports and metrics...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                    No student records found matching filters.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Department & Batch</th>
                                <th>Attendance Rate</th>
                                <th>Exams Taken</th>
                                <th>Avg. Score</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div className="avatar-sm" style={{ background: '#7c3aed', color: 'white', fontWeight: 700 }}>
                                                {s.name?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ID: {s.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{s.details?.department || 'Unassigned'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Batch: {s.details?.batch || '-'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ fontWeight: 800, color: s.attPercentage >= 75 ? '#059669' : '#d97706' }}>
                                                {s.attPercentage}%
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                ({s.presentDays}/{s.totalDays}d)
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: '#334155' }}>
                                            {s.examCount}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{
                                            fontWeight: 800,
                                            color: s.avgScore >= 60 ? '#059669' : s.avgScore > 0 ? '#d97706' : '#94a3b8'
                                        }}>
                                            {s.avgScore > 0 ? `${s.avgScore}%` : 'N/A'}
                                        </div>
                                    </td>
                                    <td>
                                        <Link
                                            to={`/admin/reports/${s.id}`}
                                            className="btn btn-outline btn-sm"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                        >
                                            <FileText size={14} /> Full Report
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReportsOverview;
