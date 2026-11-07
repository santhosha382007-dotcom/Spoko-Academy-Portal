import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Download, User, BookOpen, Calendar, Award, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const ResultsAnalysis = () => {
    const { user } = useAuth();
    const isStaff = user?.role === 'staff';
    const staffDept = user?.department || user?.details?.department || 'General';

    const [results, setResults] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState(() => isStaff ? staffDept : 'All');
    const [filterExam, setFilterExam] = useState('All');

    const DEPARTMENTS = ['Railway', 'Railways', 'SSC', 'SSC GD', 'GD', 'TNPSC', 'TNUSRB', 'Agnipath'];

    useEffect(() => {
        if (isStaff && staffDept) {
            setFilterDept(staffDept);
        }
    }, [isStaff, staffDept]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resultsData, examsData] = await Promise.all([
                api.getResults(),
                api.getExams()
            ]);
            setResults(resultsData.reverse());
            setExams(examsData);
        } catch (e) {
            console.error("Failed to load results", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredResults = results.filter(r => {
        const matchesSearch =
            (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.examTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

        const exam = exams.find(e => String(e.id) === String(r.examId));
        const examDept = String(exam?.department || r.department || '').toLowerCase().trim().replace(/s$/, '');
        const targetDept = String(filterDept || '').toLowerCase().trim().replace(/s$/, '');
        const matchesDept = filterDept === 'All' || examDept === targetDept || (targetDept && examDept.includes(targetDept));
        const matchesExam = filterExam === 'All' || String(r.examId) === String(filterExam);

        return matchesSearch && matchesDept && matchesExam;
    });

    // Chart Data Preparation
    const dataForStats = isStaff ? filteredResults : results;
    const trendData = dataForStats.slice(0, 7).reverse().map(r => ({
        date: r.date || r.timestamp ? new Date(r.date || r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent',
        score: Number(r.score) || 0
    }));

    const passRateData = [
        { name: 'Pass', value: dataForStats.filter(r => (Number(r.score) || 0) >= 50).length, color: '#10b981' },
        { name: 'Fail', value: dataForStats.filter(r => (Number(r.score) || 0) < 50).length, color: '#ef4444' }
    ];

    const departmentPerf = DEPARTMENTS.map(dept => {
        const deptExams = exams.filter(e => e.department === dept).map(e => e.id);
        const deptResults = results.filter(r => deptExams.includes(r.examId));
        const avg = deptResults.length > 0
            ? Math.round(deptResults.reduce((acc, curr) => acc + curr.score, 0) / deptResults.length)
            : 0;
        return { name: dept, avg };
    }).filter(d => d.avg > 0);

    const getGradeColor = (score) => {
        if (score >= 90) return '#10b981';
        if (score >= 70) return '#6366f1';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) return <div className="p-4">Loading Analysis Charts...</div>;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white' }}><ArrowLeft size={20} /></Link>
                    <h1>{isStaff ? `${staffDept} Results Analysis` : 'Results Analysis'}</h1>
                </div>
            </header>

            <div className="stats-grid" style={{ marginBottom: '3rem' }}>
                <div className="card stat-card">
                    <div className="stat-icon"><User size={24} /></div>
                    <div className="stat-info"><h3>{new Set(results.map(r => r.userId)).size}</h3><p className="text-muted">Total Students</p></div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}><Award size={24} /></div>
                    <div className="stat-info"><h3>{Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / (results.length || 1))}%</h3><p className="text-muted">Avg. Performance</p></div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ color: 'var(--color-secondary)', background: 'rgba(236,72,153,0.1)' }}><BookOpen size={24} /></div>
                    <div className="stat-info"><h3>{results.length}</h3><p className="text-muted">Submissions</p></div>
                </div>
            </div>

            <div className="grid-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card chart-card">
                    <h3 className="flex-center gap-2" style={{ marginBottom: '1.5rem' }}><TrendingUp size={20} /> Performance Trend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card chart-card">
                    <h3 className="flex-center gap-2" style={{ marginBottom: '1.5rem' }}><PieChartIcon size={20} /> Pass/Fail Ratio</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={passRateData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {passRateData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card chart-card" style={{ gridColumn: 'span 1' }}>
                    <h3 className="flex-center gap-2" style={{ marginBottom: '1.5rem' }}><BarChart3 size={20} /> Dept. Comparison (Avg. Score)</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departmentPerf}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="avg" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '0' }}>
                <div className="toolbar" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="input-with-icon" style={{ flex: 1 }}>
                        <Search size={18} className="input-icon" />
                        <input type="text" placeholder="Search student or exam..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {isStaff ? (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: '#f1f5f9', borderRadius: '10px', fontWeight: 700, color: '#4338ca', fontSize: '0.88rem' }}>
                            {staffDept} (Locked)
                        </div>
                    ) : (
                        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="btn btn-outline" style={{ width: '200px' }}>
                            <option value="All">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                </div>

                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                                <th style={{ padding: '1.25rem' }}>Student</th>
                                <th style={{ padding: '1.25rem' }}>Exam</th>
                                <th style={{ padding: '1.25rem' }}>Score</th>
                                <th style={{ padding: '1.25rem' }}>Breakdown</th>
                                <th style={{ padding: '1.25rem' }}>Violations</th>
                                <th style={{ padding: '1.25rem' }}>Submission Trigger</th>
                                <th style={{ padding: '1.25rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1.25rem', fontWeight: 600 }}>{r.studentName || r.userId}</td>
                                    <td style={{ padding: '1.25rem' }}>{r.examTitle}</td>
                                    <td style={{ padding: '1.25rem', fontWeight: 700, color: getGradeColor(r.score) }}>
                                        {r.score !== undefined ? `${r.score}%` : `${r.percentage || 0}%`}
                                    </td>
                                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                                        {r.correctAnswers !== undefined
                                            ? `${r.correctAnswers}✓ / ${r.incorrectAnswers ?? r.wrongAnswers ?? 0}✗ (${r.totalQuestions || 0} Qs)`
                                            : `${r.correct || 0} / ${r.total || 0}`}
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700,
                                            background: (r.violationsCount || 0) > 0 ? '#fee2e2' : '#f1f5f9',
                                            color: (r.violationsCount || 0) > 0 ? '#991b1b' : '#64748b'
                                        }}>
                                            {r.violationsCount || 0} violation{(r.violationsCount || 0) === 1 ? '' : 's'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem', fontSize: '0.85rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem',
                                            background: (r.submissionType === 'violation_limit_reached' || r.submissionReason === 'AUTO_SUBMIT_VIOLATIONS') ? '#fee2e2' :
                                                (r.submissionType === 'time_expired' || r.submissionReason === 'TIMER_EXPIRED') ? '#fef3c7' : '#ecfdf5',
                                            color: (r.submissionType === 'violation_limit_reached' || r.submissionReason === 'AUTO_SUBMIT_VIOLATIONS') ? '#991b1b' :
                                                (r.submissionType === 'time_expired' || r.submissionReason === 'TIMER_EXPIRED') ? '#92400e' : '#065f46',
                                            fontWeight: 600
                                        }}>
                                            {(r.submissionType === 'violation_limit_reached' || r.submissionReason === 'AUTO_SUBMIT_VIOLATIONS') ? 'Violations Exceeded' :
                                                (r.submissionType === 'time_expired' || r.submissionReason === 'TIMER_EXPIRED') ? 'Time Expired' : 'User Submitted'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <span className={`badge`} style={{ background: r.score >= 50 ? '#dcfce7' : '#fee2e2', color: r.score >= 50 ? '#166534' : '#991b1b' }}>
                                            {r.score >= 50 ? 'Passed' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                .chart-card { min-height: 350px; display: flex; flex-direction: column; }
                .table-responsive { overflow-x: auto; }
            `}</style>
        </div>
    );
};

export default ResultsAnalysis;
