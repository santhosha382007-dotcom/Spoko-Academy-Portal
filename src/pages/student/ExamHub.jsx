import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, Calendar, Shield, Clock, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const ExamHub = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [results, setResults] = useState([]);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialCategory = queryParams.get('category') || 'All';
    const [activeTab, setActiveTab] = useState(initialCategory);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [examsData, attemptsData, resultsData] = await Promise.all([
                    api.getExams(),
                    user ? api.getAssessmentAttempts(user.id) : Promise.resolve([]),
                    user ? api.getResultsByUserId(user.id) : Promise.resolve([])
                ]);
                setExams(examsData || []);
                setAttempts(attemptsData || []);
                setResults(resultsData || []);
            } catch (err) {
                console.error("Failed to fetch assessment hub data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user?.id]);

    const userDept = user?.details?.department || 'General';

    // Show exams relevant to student or generic
    const assignedExams = exams.filter(exam => {
        if (!exam.department || exam.department === 'Generic' || exam.department === 'All') return true;
        if (exam.department === userDept) return true;
        if (user?.role === 'admin') return true;
        return false;
    });

    const filteredExams = activeTab === 'All'
        ? assignedExams
        : assignedExams.filter(exam => (exam.category || 'Mock Test') === activeTab);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0 }}>Assessment Center</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                            Secure Examination Portal • Department: <strong>{userDept}</strong>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e0e7ff', color: '#4338ca', padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Shield size={16} />
                    <span>Proctored Assessment Environment</span>
                </div>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                {['All', 'Mock Test', 'Assessment'].map(tab => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '99px',
                            border: 'none',
                            background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === tab ? 'white' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {tab === 'All' ? 'All Assessments' : tab}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <p className="animate-pulse">Loading assigned assessments...</p>
                </div>
            ) : (
                <div className="exam-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredExams.length === 0 ? (
                        <div className="card glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
                            <BookOpen size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ color: '#475569' }}>No Assessments Found</h3>
                            <p className="text-muted">There are currently no active assessments assigned to your category.</p>
                        </div>
                    ) : filteredExams.map((exam) => {
                        const examAttempts = attempts.filter(a => String(a.examId) === String(exam.id));
                        const activeAttempt = examAttempts.find(a => a.status === 'in_progress');
                        const completedAttempts = examAttempts.filter(a => a.status === 'completed' || a.status === 'violation_terminated' || a.status === 'time_expired');
                        const maxAttempts = exam.max_attempts || 3;
                        const isExhausted = completedAttempts.length >= maxAttempts && !activeAttempt && user?.role !== 'admin';
                        const examResult = results.find(r => String(r.examId) === String(exam.id));

                        return (
                            <div key={exam.id} className="card exam-card animate-fade-in" style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '1.75rem',
                                borderRadius: '16px',
                                border: '1px solid #e0e7ff',
                                background: 'white',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <span style={{
                                        background: exam.category === 'Assessment' ? '#ede9fe' : '#f1f5f9',
                                        color: exam.category === 'Assessment' ? '#6d28d9' : '#475569',
                                        fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px'
                                    }}>
                                        {exam.category || 'Mock Test'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {exam.department} Department
                                    </span>
                                </div>

                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#1e293b' }}>{exam.title}</h3>
                                {exam.description && (
                                    <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                                        {exam.description}
                                    </p>
                                )}

                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
                                    padding: '0.75rem', background: '#f8fafc', borderRadius: '10px',
                                    marginBottom: '1.25rem', textAlign: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Questions</div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{exam.questions?.length || 0}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Duration</div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{exam.duration}m</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Attempts</div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: isExhausted ? '#ef4444' : '#10b981' }}>
                                            {completedAttempts.length}/{maxAttempts}
                                        </div>
                                    </div>
                                </div>

                                {examResult && (
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '8px',
                                        marginBottom: '1rem', fontSize: '0.8rem', color: '#065f46'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Award size={14} /> Last Score:
                                        </span>
                                        <strong>{examResult.score}%</strong>
                                    </div>
                                )}

                                {activeAttempt ? (
                                    <Link
                                        to={`/exam/${exam.id}`}
                                        className="btn btn-primary full-width"
                                        style={{ marginTop: 'auto', background: '#f59e0b', borderColor: '#f59e0b', textAlign: 'center' }}
                                    >
                                        Resume Active Assessment
                                    </Link>
                                ) : isExhausted ? (
                                    <button
                                        disabled
                                        className="btn btn-outline full-width"
                                        style={{ marginTop: 'auto', opacity: 0.6, cursor: 'not-allowed', color: '#64748b', textAlign: 'center' }}
                                    >
                                        Attempts Exhausted ({completedAttempts.length}/{maxAttempts})
                                    </button>
                                ) : (
                                    <Link
                                        to={`/exam/${exam.id}`}
                                        className="btn btn-primary full-width"
                                        style={{ marginTop: 'auto', textAlign: 'center' }}
                                    >
                                        Start Assessment
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExamHub;
