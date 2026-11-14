import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Calendar, Download, CheckCircle2, XCircle, Printer, X, Check, HelpCircle, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import logo from '../../assets/logo.png';

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
                        {/* SCREEN-ONLY VIEW */}
                        <div className="no-print">
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
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                                    >
                                        <Printer size={15} /> Print Official Report
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

                        {/* OFFICIAL INSTITUTIONAL PERFORMANCE REPORT (PRINT-ONLY DOSSIER) */}
                        <div className="official-institutional-dossier">
                            {/* Official Institutional Header */}
                            <div className="inst-header">
                                <div className="inst-header-left">
                                    <img src={logo} alt="Spoko Academy" className="inst-logo" />
                                    <div className="inst-title-block">
                                        <h1 className="inst-name">SPOKO ACADEMY OF COMPETITIVE EXAMINATIONS</h1>
                                        <h2 className="inst-subname">CENTRAL CONTROLLER OF EXAMINATIONS & STUDENT EVALUATION</h2>
                                        <p className="inst-address">Premier Competitive Examination Training Center • ISO 9001:2015 Certified Portal</p>
                                    </div>
                                </div>
                                <div className="inst-header-right">
                                    <div className="inst-ref-box">
                                        <span className="inst-ref-label">DOSSIER REF NO.</span>
                                        <span className="inst-ref-val">SA-EXM-{selectedResult.id || Date.now().toString().slice(-6)}</span>
                                    </div>
                                    <div className="inst-issue-date">
                                        <span>Issue Date: </span>
                                        <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="inst-divider-double"></div>

                            {/* Dossier Title Banner */}
                            <div className="inst-dossier-banner">
                                OFFICIAL CANDIDATE PERFORMANCE DOSSIER & TRANSCRIPT
                            </div>

                            {/* Candidate & Assessment Particulars */}
                            <table className="inst-particulars-table">
                                <tbody>
                                    <tr>
                                        <td className="inst-cell-lbl">Candidate Name:</td>
                                        <td className="inst-cell-val"><strong>{selectedResult.studentName || user?.name || 'Student Candidate'}</strong></td>
                                        <td className="inst-cell-lbl">Enrollment / Reg ID:</td>
                                        <td className="inst-cell-val"><strong>{selectedResult.userId || user?.phone || user?.id || 'N/A'}</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="inst-cell-lbl">Academic Stream / Dept:</td>
                                        <td className="inst-cell-val">{selectedResult.studentDepartment || selectedResult.department || user?.department || user?.details?.department || 'General'}</td>
                                        <td className="inst-cell-lbl">Examination Code:</td>
                                        <td className="inst-cell-val">{selectedResult.examId ? `EX-${selectedResult.examId}` : 'EX-STD-01'}</td>
                                    </tr>
                                    <tr>
                                        <td className="inst-cell-lbl">Assessment Title:</td>
                                        <td className="inst-cell-val" colSpan={3}><strong>{selectedResult.examTitle}</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="inst-cell-lbl">Examination Date:</td>
                                        <td className="inst-cell-val">
                                            {new Date(selectedResult.date || selectedResult.submittedAt || selectedResult.timestamp || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedResult.date || selectedResult.submittedAt || selectedResult.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="inst-cell-lbl">Evaluation Standard:</td>
                                        <td className="inst-cell-val">Minimum Passing Threshold: 50%</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Score & Result Summary Matrix */}
                            <div className="inst-section-title">I. OFFICIAL EVALUATION SUMMARY & GRADE CLASSIFICATION</div>
                            <table className="inst-score-table">
                                <thead>
                                    <tr>
                                        <th>Total Questions</th>
                                        <th>Attempted</th>
                                        <th>Correct Answers</th>
                                        <th>Incorrect Answers</th>
                                        <th>Unattempted</th>
                                        <th>Score Achieved</th>
                                        <th>Grade Classification</th>
                                        <th>Final Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>{selectedResult.totalQuestions || reviewQuestions.length || 0}</strong></td>
                                        <td>
                                            {(selectedResult.correctAnswers ?? 0) + (selectedResult.incorrectAnswers ?? (selectedResult.wrongAnswers || 0))}
                                        </td>
                                        <td className="inst-correct-text"><strong>{selectedResult.correctAnswers ?? 0}</strong></td>
                                        <td className="inst-wrong-text"><strong>{selectedResult.incorrectAnswers ?? (selectedResult.wrongAnswers || 0)}</strong></td>
                                        <td>
                                            {Math.max(0, (selectedResult.totalQuestions || reviewQuestions.length || 0) - (selectedResult.correctAnswers ?? 0) - (selectedResult.incorrectAnswers ?? (selectedResult.wrongAnswers || 0)))}
                                        </td>
                                        <td>
                                            <strong style={{ fontSize: '1.25rem', color: selectedResult.score >= 50 ? '#166534' : '#991b1b' }}>
                                                {selectedResult.score}%
                                            </strong>
                                        </td>
                                        <td>
                                            <strong>
                                                {selectedResult.score >= 90 ? 'Grade A+ (Distinction)' : selectedResult.score >= 75 ? 'Grade A (Exemplary)' : selectedResult.score >= 60 ? 'Grade B (Proficient)' : selectedResult.score >= 50 ? 'Grade C (Satisfactory)' : 'Grade F (Needs Revision)'}
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={`inst-result-badge ${selectedResult.score >= 50 ? 'inst-pass' : 'inst-fail'}`}>
                                                {selectedResult.score >= 50 ? 'QUALIFIED / PASS' : 'NEEDS REVISION'}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Itemized Question Performance Evaluation Sheet */}
                            {reviewQuestions && reviewQuestions.length > 0 && (
                                <>
                                    <div className="inst-section-title" style={{ marginTop: '1.25rem' }}>II. ITEMIZED QUESTION RESPONSE & KEY EVALUATION</div>
                                    <table className="inst-breakdown-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '38px', textAlign: 'center' }}>Q#</th>
                                                <th>Question Statement</th>
                                                <th style={{ width: '150px' }}>Candidate Response</th>
                                                <th style={{ width: '150px' }}>Official Answer Key</th>
                                                <th style={{ width: '90px', textAlign: 'center' }}>Evaluation</th>
                                                <th style={{ width: '55px', textAlign: 'center' }}>Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reviewQuestions.map((q, idx) => {
                                                const userChoice = q.userAnswer !== null && q.userAnswer !== undefined && q.options && q.options[q.userAnswer]
                                                    ? `(${String.fromCharCode(65 + q.userAnswer)}) ${q.options[q.userAnswer]}`
                                                    : (q.isAttempted ? 'Attempted' : 'Not Attempted');
                                                const correctChoice = q.correctAnswer !== null && q.correctAnswer !== undefined && q.options && q.options[q.correctAnswer]
                                                    ? `(${String.fromCharCode(65 + q.correctAnswer)}) ${q.options[q.correctAnswer]}`
                                                    : 'N/A';
                                                
                                                return (
                                                    <tr key={idx} className={q.isCorrect ? 'inst-row-correct' : q.isAttempted ? 'inst-row-incorrect' : 'inst-row-skipped'}>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{q.questionIndex || idx + 1}</td>
                                                        <td>
                                                            <div className="inst-q-text">{q.question}</div>
                                                            {q.explanation && (
                                                                <div className="inst-q-explanation">
                                                                    <em>Note: {q.explanation}</em>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ fontSize: '0.8rem' }}>
                                                            <span style={{ color: q.isCorrect ? '#166534' : q.isAttempted ? '#991b1b' : '#64748b' }}>
                                                                {userChoice}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                                                            {correctChoice}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={`inst-item-badge ${q.isCorrect ? 'item-pass' : q.isAttempted ? 'item-fail' : 'item-skip'}`}>
                                                                {q.isCorrect ? 'Correct' : q.isAttempted ? 'Incorrect' : 'Skipped'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                            {q.isCorrect ? '+1.0' : '0.0'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Verification, Signatures & Seal */}
                            <div className="inst-footer-block">
                                <div className="inst-signature-group">
                                    <div className="inst-sig-box">
                                        <div className="inst-sig-line"></div>
                                        <span className="inst-sig-title">Faculty In-Charge / Evaluator</span>
                                        <span className="inst-sig-subtitle">Department of {selectedResult.studentDepartment || selectedResult.department || user?.department || 'Assessment'}</span>
                                    </div>

                                    <div className="inst-seal-box">
                                        <div className="inst-seal-circle">
                                            <span className="seal-top">SPOKO ACADEMY</span>
                                            <span className="seal-center">OFFICIAL<br/>SEAL</span>
                                            <span className="seal-bottom">CERTIFIED</span>
                                        </div>
                                        <div className="inst-seal-caption">Institutional Authentication</div>
                                    </div>

                                    <div className="inst-sig-box">
                                        <div className="inst-sig-line"></div>
                                        <span className="inst-sig-title">Controller of Examinations</span>
                                        <span className="inst-sig-subtitle">Spoko Academy of Competitive Exams</span>
                                    </div>
                                </div>

                                <div className="inst-disclaimer">
                                    NOTICE: This document is an official academic transcript generated under institutional supervision.
                                    Any unauthorized alteration, erasure, or duplication renders this evaluation null and void.
                                    Official electronic records are archived in Spoko Academy Central Repository.
                                </div>
                            </div>
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

                /* Hidden on screen, visible only during print */
                .official-institutional-dossier {
                    display: none;
                }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                    }
                    body, html {
                        background: #ffffff !important;
                        color: #0f172a !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide web app navigation, sidebars, buttons and screen lists */
                    .app-sidebar,
                    .app-topbar,
                    .app-bottom-bar,
                    .no-print,
                    .results-list,
                    .container > div:first-child,
                    .modal-header,
                    .modal-body-scrollable {
                        display: none !important;
                    }
                    .container {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                    }
                    .modal-backdrop {
                        position: static !important;
                        background: none !important;
                        padding: 0 !important;
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                    }
                    .modal-content-card {
                        max-width: 100% !important;
                        max-height: none !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    /* SHOW OFFICIAL INSTITUTIONAL PERFORMANCE REPORT */
                    .official-institutional-dossier {
                        display: block !important;
                        width: 100% !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                    }
                    .inst-header {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        padding-bottom: 0.75rem !important;
                    }
                    .inst-header-left {
                        display: flex !important;
                        align-items: center !important;
                        gap: 1rem !important;
                    }
                    .inst-logo {
                        width: 65px !important;
                        height: 65px !important;
                        object-fit: contain !important;
                    }
                    .inst-title-block .inst-name {
                        font-size: 1.15rem !important;
                        font-weight: 900 !important;
                        color: #0f172a !important;
                        margin: 0 !important;
                        letter-spacing: 0.5px !important;
                    }
                    .inst-title-block .inst-subname {
                        font-size: 0.78rem !important;
                        font-weight: 700 !important;
                        color: #334155 !important;
                        margin: 2px 0 0 !important;
                        text-transform: uppercase !important;
                    }
                    .inst-title-block .inst-address {
                        font-size: 0.7rem !important;
                        color: #64748b !important;
                        margin: 2px 0 0 !important;
                    }
                    .inst-header-right {
                        text-align: right !important;
                    }
                    .inst-ref-box {
                        border: 1.5px solid #0f172a !important;
                        padding: 3px 8px !important;
                        border-radius: 4px !important;
                        display: inline-block !important;
                        text-align: right !important;
                    }
                    .inst-ref-label {
                        display: block !important;
                        font-size: 0.62rem !important;
                        font-weight: 800 !important;
                        color: #475569 !important;
                    }
                    .inst-ref-val {
                        font-size: 0.78rem !important;
                        font-weight: 800 !important;
                        color: #0f172a !important;
                    }
                    .inst-issue-date {
                        font-size: 0.7rem !important;
                        color: #475569 !important;
                        margin-top: 4px !important;
                    }
                    .inst-divider-double {
                        border-top: 2px solid #0f172a !important;
                        border-bottom: 1px solid #0f172a !important;
                        height: 3px !important;
                        margin: 0.6rem 0 !important;
                    }
                    .inst-dossier-banner {
                        background: #0f172a !important;
                        color: #ffffff !important;
                        text-align: center !important;
                        font-size: 0.88rem !important;
                        font-weight: 800 !important;
                        letter-spacing: 1px !important;
                        padding: 5px 0 !important;
                        text-transform: uppercase !important;
                        margin-bottom: 0.75rem !important;
                    }
                    .inst-particulars-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    .inst-particulars-table td {
                        padding: 6px 10px !important;
                        font-size: 0.8rem !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    .inst-cell-lbl {
                        background: #f8fafc !important;
                        color: #475569 !important;
                        font-weight: 700 !important;
                        width: 18% !important;
                    }
                    .inst-cell-val {
                        color: #0f172a !important;
                        width: 32% !important;
                    }
                    .inst-section-title {
                        font-size: 0.78rem !important;
                        font-weight: 800 !important;
                        color: #0f172a !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        margin-bottom: 0.4rem !important;
                    }
                    .inst-score-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem !important;
                        border: 1.5px solid #0f172a !important;
                        text-align: center !important;
                    }
                    .inst-score-table th {
                        background: #f1f5f9 !important;
                        color: #0f172a !important;
                        font-size: 0.72rem !important;
                        font-weight: 800 !important;
                        padding: 6px 4px !important;
                        border: 1px solid #cbd5e1 !important;
                        text-transform: uppercase !important;
                    }
                    .inst-score-table td {
                        padding: 8px 6px !important;
                        font-size: 0.82rem !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    .inst-result-badge {
                        display: inline-block !important;
                        padding: 3px 8px !important;
                        border-radius: 4px !important;
                        font-size: 0.75rem !important;
                        font-weight: 800 !important;
                    }
                    .inst-pass {
                        background: #dcfce7 !important;
                        color: #166534 !important;
                        border: 1px solid #86efac !important;
                    }
                    .inst-fail {
                        background: #fee2e2 !important;
                        color: #991b1b !important;
                        border: 1px solid #fca5a5 !important;
                    }
                    .inst-correct-text { color: #166534 !important; font-weight: 800 !important; }
                    .inst-wrong-text { color: #991b1b !important; font-weight: 800 !important; }

                    .inst-breakdown-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    .inst-breakdown-table th {
                        background: #f8fafc !important;
                        color: #334155 !important;
                        font-size: 0.72rem !important;
                        font-weight: 800 !important;
                        padding: 6px 8px !important;
                        border: 1px solid #cbd5e1 !important;
                        text-transform: uppercase !important;
                    }
                    .inst-breakdown-table td {
                        padding: 5px 8px !important;
                        font-size: 0.78rem !important;
                        border: 1px solid #e2e8f0 !important;
                        vertical-align: top !important;
                    }
                    .inst-breakdown-table tr {
                        page-break-inside: avoid !important;
                    }
                    .inst-q-text {
                        font-weight: 600 !important;
                        color: #0f172a !important;
                        line-height: 1.25 !important;
                    }
                    .inst-q-explanation {
                        font-size: 0.7rem !important;
                        color: #475569 !important;
                        margin-top: 2px !important;
                    }
                    .inst-item-badge {
                        font-size: 0.68rem !important;
                        font-weight: 800 !important;
                        padding: 2px 6px !important;
                        border-radius: 4px !important;
                        display: inline-block !important;
                    }
                    .item-pass { background: #dcfce7 !important; color: #166534 !important; }
                    .item-fail { background: #fee2e2 !important; color: #991b1b !important; }
                    .item-skip { background: #f1f5f9 !important; color: #475569 !important; }

                    .inst-footer-block {
                        margin-top: 2rem !important;
                        page-break-inside: avoid !important;
                    }
                    .inst-signature-group {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        padding: 1.5rem 1rem 0 !important;
                    }
                    .inst-sig-box {
                        text-align: center !important;
                        width: 180px !important;
                    }
                    .inst-sig-line {
                        border-bottom: 1.5px solid #0f172a !important;
                        margin-bottom: 6px !important;
                        height: 25px !important;
                    }
                    .inst-sig-title {
                        display: block !important;
                        font-size: 0.75rem !important;
                        font-weight: 800 !important;
                        color: #0f172a !important;
                    }
                    .inst-sig-subtitle {
                        display: block !important;
                        font-size: 0.65rem !important;
                        color: #64748b !important;
                    }
                    .inst-seal-box {
                        text-align: center !important;
                    }
                    .inst-seal-circle {
                        width: 85px !important;
                        height: 85px !important;
                        border: 2px dashed #0f172a !important;
                        border-radius: 50% !important;
                        margin: 0 auto !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        color: #0f172a !important;
                        padding: 4px !important;
                        box-sizing: border-box !important;
                    }
                    .seal-top {
                        font-size: 0.5rem !important;
                        font-weight: 800 !important;
                        letter-spacing: 0.5px !important;
                    }
                    .seal-center {
                        font-size: 0.65rem !important;
                        font-weight: 900 !important;
                        line-height: 1 !important;
                        margin: 2px 0 !important;
                    }
                    .seal-bottom {
                        font-size: 0.48rem !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.5px !important;
                    }
                    .inst-seal-caption {
                        font-size: 0.62rem !important;
                        font-weight: 700 !important;
                        color: #475569 !important;
                        margin-top: 4px !important;
                        text-transform: uppercase !important;
                    }
                    .inst-disclaimer {
                        margin-top: 1.25rem !important;
                        padding-top: 0.5rem !important;
                        border-top: 1px solid #cbd5e1 !important;
                        font-size: 0.65rem !important;
                        color: #64748b !important;
                        text-align: center !important;
                        line-height: 1.3 !important;
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
