import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Calendar, Download, CheckCircle2, XCircle, Printer, X, Check, HelpCircle, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const StudentResults = () => {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalFilter, setModalFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unanswered'

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const allResults = (await api.getResults()) || [];
                const myResults = allResults.filter(r => 
                    String(r.userId) === String(user.id) || 
                    String(r.userId) === String(user.phone) || 
                    (r.studentName && r.studentName.toLowerCase() === user.name.toLowerCase())
                );
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

    const handleOpenDetailedReport = async (result) => {
        setModalLoading(true);
        setSelectedResult(result);
        setModalFilter('all');

        // If questionReview isn't saved in the record, try to load from exam
        if (!result.questionReview || result.questionReview.length === 0) {
            try {
                const exam = await api.getExamById(result.examId);
                if (exam && exam.questions) {
                    const answers = result.answers || {};
                    const review = exam.questions.map((q, idx) => {
                        const userAns = answers[q.id];
                        const isAttempted = userAns !== undefined && userAns !== null && userAns !== '';
                        const isCorrect = isAttempted && Number(userAns) === Number(q.correctAnswer);
                        return {
                            id: q.id || (idx + 1),
                            questionIndex: idx + 1,
                            question: q.question,
                            options: q.options || [],
                            userAnswer: isAttempted ? Number(userAns) : null,
                            correctAnswer: Number(q.correctAnswer),
                            isCorrect,
                            isAttempted,
                            explanation: q.explanation || ''
                        };
                    });
                    setSelectedResult(prev => ({ ...prev, questionReview: review }));
                }
            } catch (err) {
                console.error("Failed to load question details:", err);
            }
        }
        setModalLoading(false);
    };

    const handlePrintReport = (result) => {
        handleOpenDetailedReport(result).then(() => {
            setTimeout(() => {
                window.print();
            }, 300);
        });
    };

    const reviewQuestions = selectedResult?.questionReview || [];
    const filteredReview = reviewQuestions.filter(item => {
        if (modalFilter === 'correct') return item.isCorrect;
        if (modalFilter === 'incorrect') return item.isAttempted && !item.isCorrect;
        if (modalFilter === 'unanswered') return !item.isAttempted;
        return true;
    });

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0 }}>Reports & Performance</h1>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                            Official Examination Dossiers & Comprehensive Scorecards
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading Performance History...</div>
            ) : results.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Award size={64} className="text-muted" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                    <h2 style={{ fontWeight: 800 }}>No Performance Records Found</h2>
                    <p className="text-muted" style={{ maxWidth: '400px', margin: '0.5rem auto 2rem' }}>
                        Complete an assessment to unlock detailed performance analytics, question review, and downloadable reports.
                    </p>
                    <Link to="/exam-hub" className="btn btn-primary">Go to Assessment Hub</Link>
                </div>
            ) : (
                <div className="results-list">
                    {results.map((result) => {
                        const totalQ = result.totalQuestions || 0;
                        const correctQ = result.correctAnswers || 0;
                        const wrongQ = (result.incorrectAnswers !== undefined ? result.incorrectAnswers : (result.wrongAnswers || (totalQ - correctQ)));
                        const chartData = [
                            { name: 'Correct', value: correctQ, color: '#10b981' },
                            { name: 'Wrong', value: wrongQ, color: '#ef4444' }
                        ];

                        return (
                            <div key={result.id} className="report-card card animate-fade-in">
                                <div className="report-main">
                                    <div className="report-header">
                                        <div className="title-group">
                                            <div className="exam-category-badge">{result.category || result.department || 'General'}</div>
                                            <h3>{result.examTitle}</h3>
                                            <div className="report-meta">
                                                <Calendar size={14} /> {new Date(result.date || result.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
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
                                            <div style={{ width: '110px', height: '110px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={chartData}
                                                            innerRadius={30}
                                                            outerRadius={48}
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
                                                <div className="legend-item"><span className="dot" style={{ background: '#10b981' }}></span> {correctQ} Correct</div>
                                                <div className="legend-item"><span className="dot" style={{ background: '#ef4444' }}></span> {wrongQ} Wrong</div>
                                            </div>
                                        </div>

                                        <div className="quick-stats">
                                            <div className="q-stat">
                                                <CheckCircle2 size={16} color="#10b981" />
                                                <span>Accuracy: <strong>{result.score}%</strong></span>
                                            </div>
                                            <div className="q-stat">
                                                <Award size={16} color="#4f46e5" />
                                                <span>Status: <strong style={{ color: result.score >= 50 ? '#10b981' : '#ef4444' }}>{result.score >= 50 ? 'Passed' : 'Needs Revision'}</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="report-actions">
                                        <button 
                                            type="button" 
                                            onClick={() => handleOpenDetailedReport(result)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            View Detailed Report
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handlePrintReport(result)}
                                            className="btn btn-outline btn-sm"
                                        >
                                            <Printer size={15} /> Print / PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DETAILED REPORT MODAL */}
            {selectedResult && (
                <div className="modal-backdrop" onClick={() => setSelectedResult(null)}>
                    <div className="modal-content-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', background: '#eef2ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '4px' }}>
                                    {selectedResult.category || selectedResult.department || 'Assessment Report'}
                                </span>
                                <h2 style={{ margin: '0.35rem 0 0.15rem', fontSize: '1.35rem', color: '#0f172a' }}>
                                    {selectedResult.examTitle}
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                    Submitted on {new Date(selectedResult.date || selectedResult.submittedAt).toLocaleString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="btn btn-outline btn-sm no-print"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                >
                                    <Printer size={15} /> Print
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedResult(null)}
                                    className="btn-icon no-print"
                                    style={{ background: '#f1f5f9', border: 'none' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="modal-body-scrollable">
                            {/* KPI Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '0.85rem', borderRadius: '12px', background: selectedResult.score >= 50 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${selectedResult.score >= 50 ? '#a7f3d0' : '#fecaca'}`, textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: selectedResult.score >= 50 ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>Score</span>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: selectedResult.score >= 50 ? '#166534' : '#b91c1c' }}>{selectedResult.score}%</div>
                                </div>
                                <div style={{ padding: '0.85rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Questions</span>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{selectedResult.totalQuestions || 0}</div>
                                </div>
                                <div style={{ padding: '0.85rem', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Correct</span>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#166534' }}>{selectedResult.correctAnswers ?? 0}</div>
                                </div>
                                <div style={{ padding: '0.85rem', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Incorrect</span>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c' }}>{selectedResult.incorrectAnswers ?? (selectedResult.wrongAnswers || 0)}</div>
                                </div>
                            </div>

                            {/* Question-by-Question Section */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Question Breakdown</h3>
                                <div className="no-print" style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setModalFilter('all')}
                                        className={`btn-pill-filter ${modalFilter === 'all' ? 'active' : ''}`}
                                    >
                                        All ({reviewQuestions.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalFilter('correct')}
                                        className={`btn-pill-filter ${modalFilter === 'correct' ? 'active' : ''}`}
                                    >
                                        Correct
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalFilter('incorrect')}
                                        className={`btn-pill-filter ${modalFilter === 'incorrect' ? 'active' : ''}`}
                                    >
                                        Incorrect
                                    </button>
                                </div>
                            </div>

                            {modalLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading questions breakdown...</div>
                            ) : filteredReview.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                                    {reviewQuestions.length === 0 ? 'Question-level records not available for this session.' : `No questions match the "${modalFilter}" filter.`}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {filteredReview.map((item, idx) => {
                                        const isCorrect = item.isCorrect;
                                        const isAttempted = item.isAttempted;
                                        return (
                                            <div
                                                key={item.id || idx}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    border: `1px solid ${isCorrect ? '#86efac' : isAttempted ? '#fca5a5' : '#cbd5e1'}`,
                                                    background: isCorrect ? '#f0fdf4' : isAttempted ? '#fffbfa' : '#f8fafc'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <strong>Q{item.questionIndex || idx + 1}. {item.question}</strong>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        background: isCorrect ? '#dcfce7' : isAttempted ? '#fee2e2' : '#e2e8f0',
                                                        color: isCorrect ? '#166534' : isAttempted ? '#991b1b' : '#475569'
                                                    }}>
                                                        {isCorrect ? '✓ Correct' : isAttempted ? '✗ Incorrect' : '○ Skipped'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                    {(item.options || []).map((opt, optIdx) => {
                                                        const isUserChoice = item.userAnswer === optIdx;
                                                        const isCorrectChoice = item.correctAnswer === optIdx;
                                                        let bg = '#ffffff';
                                                        let bdr = '#e2e8f0';
                                                        let clr = '#334155';

                                                        if (isCorrectChoice) {
                                                            bg = '#dcfce7';
                                                            bdr = '#10b981';
                                                            clr = '#065f46';
                                                        } else if (isUserChoice) {
                                                            bg = '#fee2e2';
                                                            bdr = '#ef4444';
                                                            clr = '#991b1b';
                                                        }

                                                        return (
                                                            <div key={optIdx} style={{
                                                                padding: '0.45rem 0.65rem',
                                                                borderRadius: '8px',
                                                                background: bg,
                                                                border: `1px solid ${bdr}`,
                                                                color: clr,
                                                                fontSize: '0.8rem',
                                                                display: 'flex',
                                                                justifyContent: 'space-between'
                                                            }}>
                                                                <span><strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}</span>
                                                                {isCorrectChoice && <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>✓ Correct</span>}
                                                                {isUserChoice && !isCorrectChoice && <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>✗ Your Choice</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {item.explanation && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '8px', fontSize: '0.78rem', color: '#1e40af' }}>
                                                        <strong>Explanation:</strong> {item.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

                /* Modal Styles */
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .modal-content-card {
                    background: #ffffff;
                    width: 100%;
                    max-width: 800px;
                    max-height: 90vh;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .modal-header {
                    padding: 1.25rem 1.75rem;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-body-scrollable {
                    padding: 1.5rem 1.75rem;
                    overflow-y: auto;
                    flex: 1;
                }

                .btn-pill-filter {
                    padding: 0.35rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.75rem;
                    font-weight: 700;
                    background: #ffffff;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .btn-pill-filter.active {
                    background: #0f172a;
                    color: #ffffff;
                    border-color: #0f172a;
                }

                @media print {
                    .no-print, .results-list, .container > div:first-child {
                        display: none !important;
                    }
                    .modal-backdrop {
                        position: static !important;
                        background: none !important;
                        padding: 0 !important;
                    }
                    .modal-content-card {
                        max-width: 100% !important;
                        max-height: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .modal-body-scrollable {
                        overflow: visible !important;
                        padding: 0 !important;
                    }
                }

                @media (max-width: 600px) {
                    .results-list { grid-template-columns: 1fr; }
                    .analytics-section { flex-direction: column; gap: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default StudentResults;
