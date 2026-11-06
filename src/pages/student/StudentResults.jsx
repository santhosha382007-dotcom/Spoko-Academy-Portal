import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Calendar, Download, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const StudentResults = () => {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const allResults = (await api.getResults()) || [];
                const myResults = allResults.filter(r => r.userId === user.id || r.studentName === user.name);
                setResults(myResults.reverse());
            } catch (e) {
                console.error("Failed to load results", e);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchResults();
    }, [user]);

    const getGradeColor = (score) => {
        if (score >= 90) return '#10b981';
        if (score >= 70) return '#6366f1';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const downloadReport = (resultId) => {
        alert(`Initializing PDF download for report #${resultId}...`);
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1>Reports & Performance</h1>
                </div>
            </div>

            <div className="results-list">
                {results.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <Award size={64} className="text-muted" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                        <h2 style={{ fontWeight: 800 }}>No Performance Records</h2>
                        <p className="text-muted" style={{ maxWidth: '400px', margin: '0.5rem auto 2rem' }}>Complete your first assessment to unlock detailed performance analytics and downloadable reports.</p>
                        <Link to="/exam-hub" className="btn btn-primary">Start First Exam</Link>
                    </div>
                ) : results.map((result) => {
                    const chartData = [
                        { name: 'Correct', value: result.correctAnswers, color: '#10b981' },
                        { name: 'Wrong', value: (result.totalQuestions || 0) - (result.correctAnswers || 0), color: '#ef4444' }
                    ];

                    return (
                        <div key={result.id} className="report-card card animate-fade-in">
                            <div className="report-main">
                                <div className="report-header">
                                    <div className="title-group">
                                        <div className="exam-category-badge">{result.category || 'Railways'}</div>
                                        <h3>{result.examTitle}</h3>
                                        <div className="report-meta">
                                            <Calendar size={14} /> {new Date(result.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="score-container">
                                        <div className="score-radial" style={{ '--score-color': getGradeColor(result.score) }}>
                                            <span className="score-val">{result.score}%</span>
                                            <span className="score-lbl">Score</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="analytics-section">
                                    <div className="chart-box">
                                        <div style={{ width: '120px', height: '120px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        innerRadius={35}
                                                        outerRadius={50}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="chart-legend">
                                            <div className="legend-item"><span className="dot" style={{ background: '#10b981' }}></span> {result.correctAnswers} Correct</div>
                                            <div className="legend-item"><span className="dot" style={{ background: '#ef4444' }}></span> {chartData[1].value} Wrong</div>
                                        </div>
                                    </div>

                                    <div className="quick-stats">
                                        <div className="q-stat">
                                            <CheckCircle2 size={16} color="#10b981" />
                                            <span>Accuracy: <strong>{result.score}%</strong></span>
                                        </div>
                                        <div className="q-stat">
                                            <XCircle size={16} color="#ef4444" />
                                            <span>Focus Area: <strong>Arithematic</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="report-actions">
                                    <button className="btn btn-primary btn-sm">View Detailed Report</button>
                                    <button onClick={() => downloadReport(result.id)} className="btn btn-outline btn-sm">
                                        <Download size={16} /> PDF Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .results-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 2rem; }
                .report-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
                .report-main { padding: 1.5rem; }
                
                .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
                .exam-category-badge { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #6366f1; background: #eef2ff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 0.5rem; }
                .report-header h3 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; }
                .report-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #64748b; font-weight: 600; }

                .score-radial { width: 80px; height: 80px; border-radius: 50%; border: 6px solid #f1f5f9; border-top-color: var(--score-color); display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-45deg); }
                .score-val { font-size: 1.25rem; font-weight: 900; color: #0f172a; transform: rotate(45deg); display: block; line-height: 1; }
                .score-lbl { font-size: 0.6rem; font-weight: 700; color: #64748b; text-transform: uppercase; transform: rotate(45deg); margin-top: 2px; }

                .analytics-section { display: flex; gap: 2rem; padding: 1.5rem 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; margin-bottom: 1.5rem; }
                .chart-box { display: flex; align-items: center; gap: 1rem; }
                .chart-legend { display: flex; flex-direction: column; gap: 0.5rem; }
                .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: #475569; }
                .legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }

                .quick-stats { display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }
                .q-stat { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #475569; font-weight: 500; }
                
                .report-actions { display: flex; gap: 1rem; }
                .report-actions button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

                @media (max-width: 600px) {
                    .results-list { grid-template-columns: 1fr; }
                    .analytics-section { flex-direction: column; gap: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default StudentResults;
