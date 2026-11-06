import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Shield, AlertTriangle, Maximize2, Clock, CheckCircle2, ChevronLeft, ChevronRight, Check, XCircle, RotateCcw, Lock } from 'lucide-react';

const ExamTaker = () => {
    const { user } = useAuth();
    const { examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);

    // Stages: 'instructions' | 'in_progress' | 'submitted'
    const [examStage, setExamStage] = useState('instructions');
    const [calculatedResult, setCalculatedResult] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Anti-Cheating & Security States
    const [violations, setViolations] = useState(0);
    const [maxViolations, setMaxViolations] = useState(3);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const [isCheckingStart, setIsCheckingStart] = useState(false);

    const isTerminatedRef = useRef(false);
    const violationCountRef = useRef(0);
    const answersRef = useRef({});

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        const loadExam = async () => {
            setIsLoading(true);
            try {
                const foundExam = await api.getExamById(examId);
                if (foundExam) {
                    setExam(foundExam);
                    setTimeLeft(foundExam.duration * 60);
                    setQuestions(foundExam.questions || []);
                    setMaxViolations(foundExam.max_security_violations || 3);
                } else {
                    setError("Assessment not found or has been archived.");
                }
            } catch (err) {
                console.error("Failed to load assessment", err);
                setError("Could not connect to database server. Please check your network.");
            } finally {
                setIsLoading(false);
            }
        };
        loadExam();
    }, [examId]);

    // Timer Logic
    useEffect(() => {
        if (!exam || examStage !== 'in_progress' || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleFinalSubmit('time_expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, examStage, exam]);

    // Anti-Cheating Event Listeners during Active Test
    useEffect(() => {
        if (examStage !== 'in_progress') return;

        const triggerViolation = async (violationType, details) => {
            if (isTerminatedRef.current) return;

            violationCountRef.current += 1;
            const currentCount = violationCountRef.current;
            setViolations(currentCount);

            // Record violation to server
            if (attemptId && user?.id) {
                try {
                    const res = await api.recordAssessmentViolation({
                        userId: user.id,
                        attemptId,
                        examId: exam.id,
                        violationType,
                        details
                    });
                    if (res?.isTerminated) {
                        isTerminatedRef.current = true;
                        setShowWarningModal(false);
                        alert(`SECURITY TERMINATION: You have reached the maximum allowed violations (${maxViolations}). The assessment is being automatically submitted.`);
                        handleFinalSubmit('violation_limit_reached');
                        return;
                    }
                } catch (e) {
                    console.warn("Violation record warning:", e);
                }
            }

            if (currentCount >= maxViolations) {
                isTerminatedRef.current = true;
                setShowWarningModal(false);
                alert(`SECURITY TERMINATION: You have reached the maximum allowed violations (${maxViolations}). The assessment is being automatically submitted.`);
                handleFinalSubmit('violation_limit_reached');
            } else {
                setWarningMessage(`Warning: Leaving the assessment window has been detected (${details}).`);
                setShowWarningModal(true);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                triggerViolation('TAB_SWITCH', 'Browser tab switched or window minimized');
            }
        };

        const handleBlur = () => {
            // Check if focus lost
            if (!document.fullscreenElement) {
                triggerViolation('WINDOW_BLUR', 'Assessment window lost focus');
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && examStage === 'in_progress' && !isTerminatedRef.current) {
                triggerViolation('FULLSCREEN_EXIT', 'Exited full-screen examination mode');
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
        };

        const handleKeyDown = (e) => {
            // Block Ctrl+C, Ctrl+V, Ctrl+P, PrintScreen, F12
            if (
                (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'u')) ||
                e.key === 'PrintScreen' ||
                e.key === 'F12'
            ) {
                e.preventDefault();
                triggerViolation('KEYBOARD_SHORTCUT', `Prohibited key detected: ${e.key}`);
            }
        };

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = 'Assessment is in progress. Leaving will record a security violation.';
            return e.returnValue;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [examStage, exam, user, attemptId, maxViolations]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Incremental answer saving with server persistence and local recovery
    const handleAnswerChange = async (qId, optionIndex) => {
        const updatedAnswers = { ...answers, [qId]: optionIndex };
        setAnswers(updatedAnswers);

        // Local state backup for instant recovery
        try {
            localStorage.setItem(`spoko_answers_${examId}_${user?.id}`, JSON.stringify(updatedAnswers));
        } catch (e) { }

        // Server-side answer persistence
        if (attemptId && user?.id) {
            api.saveAssessmentAnswer({
                userId: user.id,
                attemptId,
                questionId: qId,
                selectedOption: optionIndex
            });
        }
    };

    // PRE-ASSESSMENT SECURITY CHECK & START
    const handleStartTest = async () => {
        if (!user) {
            alert("Authentication Error: Please sign in again.");
            navigate('/login');
            return;
        }

        setIsCheckingStart(true);
        try {
            // 1. Call Backend Pre-Assessment Validation API
            const validation = await api.checkAndStartAssessment({
                userId: user.id,
                examId: exam.id
            });

            if (!validation.allowed) {
                alert(`ACCESS DENIED: ${validation.message || 'You cannot start this assessment.'}`);
                return;
            }

            const currentAttempt = validation.attempt;
            setAttemptId(currentAttempt.id);
            setMaxViolations(validation.maxViolations || exam.max_security_violations || 3);
            setTimeLeft(validation.remainingSeconds || exam.duration * 60);

            // Recover state if resuming
            if (currentAttempt.answers && Object.keys(currentAttempt.answers).length > 0) {
                setAnswers(currentAttempt.answers);
            } else {
                try {
                    const localSaved = localStorage.getItem(`spoko_answers_${examId}_${user.id}`);
                    if (localSaved) setAnswers(JSON.parse(localSaved));
                } catch (e) { }
            }

            if (currentAttempt.violationsCount) {
                setViolations(currentAttempt.violationsCount);
                violationCountRef.current = currentAttempt.violationsCount;
            }

            // 2. Request Fullscreen Mode
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (fsErr) {
                console.warn("Fullscreen notice:", fsErr);
            }

            setExamStage('in_progress');
        } catch (err) {
            console.error("Start check error:", err);
            alert("Pre-assessment security check failed. Verify server connection.");
        } finally {
            setIsCheckingStart(false);
        }
    };

    // BACKEND ASSESSMENT SUBMISSION & SCORE CALCULATION
    const handleFinalSubmit = async (submissionType = 'manual') => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setShowConfirmSubmit(false);

        // Exit full-screen if active
        if (document.fullscreenElement) {
            try { await document.exitFullscreen(); } catch (e) { }
        }

        try {
            // Call Backend Submission API: Server validates timer & computes final score
            const submitPayload = {
                userId: user.id,
                attemptId: attemptId || 'manual_' + Date.now(),
                answers: answersRef.current,
                submissionType
            };

            const response = await api.submitAssessmentBackend(submitPayload);
            if (response.success && response.result) {
                setCalculatedResult(response.result);
                setExamStage('submitted');
                // Clean up local recovery backup
                try {
                    localStorage.removeItem(`spoko_answers_${examId}_${user.id}`);
                } catch (e) { }
            } else {
                throw new Error(response.message || "Calculation failed on server.");
            }
        } catch (err) {
            console.error("Backend submission error:", err);
            alert(`Submission Error: ${err.message}. A safety report has been logged.`);
            // Fallback safe display
            setCalculatedResult({
                examTitle: exam.title,
                score: 0,
                totalQuestions: questions.length,
                submissionType: submissionType,
                unverified: true
            });
            setExamStage('submitted');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return (
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
            <p className="animate-pulse">Loading Assessment Environment...</p>
        </div>
    );

    if (error) return (
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
            <div className="card glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>Assessment Unavailable</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
                <Link to="/exam-hub" className="btn btn-primary">Back to Assessment Center</Link>
            </div>
        </div>
    );

    if (!exam) return null;

    // -------------------------------------------------------------
    // STAGE 1: ASSESSMENT INSTRUCTIONS PAGE
    // -------------------------------------------------------------
    if (examStage === 'instructions') {
        return (
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3.5rem' }}>
                <div className="card glass-panel animate-fade-in" style={{
                    maxWidth: '820px', margin: '0 auto', padding: '2.5rem',
                    borderRadius: '20px', border: '1px solid #e0e7ff', background: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
                        <div style={{ background: '#eef2ff', padding: '0.85rem', borderRadius: '14px', color: '#4f46e5' }}>
                            <Shield size={32} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                                {exam.category || 'Examination'} • {exam.department} Department
                            </span>
                            <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', color: '#1e293b' }}>{exam.title}</h1>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Time Allowed</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', marginTop: '0.2rem' }}>{exam.duration} Minutes</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Questions</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', marginTop: '0.2rem' }}>{questions.length} Items</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Allowed Violations</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>{maxViolations} Warnings</div>
                        </div>
                    </div>

                    <div style={{
                        background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '16px',
                        padding: '1.75rem', marginBottom: '2.5rem'
                    }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6b21a8', marginTop: 0, marginBottom: '1rem' }}>
                            ASSESSMENT INSTRUCTIONS
                        </h2>
                        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#581c87', fontSize: '0.95rem', lineHeight: '1.8' }}>
                            <li>The assessment must be completed within the specified time of <strong>{exam.duration} minutes</strong>.</li>
                            <li><strong>Full-screen mode</strong> will be enabled where supported.</li>
                            <li><strong>Do not switch browser tabs</strong> or applications during the assessment.</li>
                            <li><strong>Do not attempt to take screenshots</strong> or record the screen.</li>
                            <li>Leaving the assessment window may be recorded as a <strong>security violation</strong>.</li>
                            <li>The assessment may be <strong>automatically submitted</strong> after the allowed violation limit ({maxViolations}) is exceeded.</li>
                            <li>The assessment will <strong>automatically submit</strong> when the timer reaches zero.</li>
                            <li>Ensure a stable internet connection before starting.</li>
                        </ol>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <Link to="/exam-hub" className="btn btn-outline" style={{ padding: '0.85rem 2rem' }}>
                            CANCEL
                        </Link>
                        <button
                            onClick={handleStartTest}
                            disabled={isCheckingStart}
                            className="btn btn-primary"
                            style={{
                                padding: '0.85rem 2.5rem',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem'
                            }}
                        >
                            <Maximize2 size={18} />
                            {isCheckingStart ? 'Validating Session...' : 'START TEST'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // STAGE 2: SUBMITTED / RESULT SCREEN
    // -------------------------------------------------------------
    if (examStage === 'submitted') {
        const isTerminated = calculatedResult?.submissionType === 'violation_limit_reached';
        const isTimeOut = calculatedResult?.submissionType === 'time_expired';

        return (
            <div className="container" style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem', textAlign: 'center' }}>
                <div className="card glass-panel animate-fade-in" style={{
                    maxWidth: '680px', margin: '0 auto', padding: '2.5rem',
                    borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white'
                }}>
                    {isTerminated ? (
                        <div style={{ marginBottom: '1.5rem', color: '#dc2626' }}>
                            <AlertTriangle size={56} style={{ margin: '0 auto' }} />
                            <h1 style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '1.8rem' }}>Assessment Terminated</h1>
                            <p style={{ color: '#7f1d1d' }}>Terminated automatically due to exceeding maximum allowed security violations ({violations}/{maxViolations}).</p>
                        </div>
                    ) : isTimeOut ? (
                        <div style={{ marginBottom: '1.5rem', color: '#f59e0b' }}>
                            <Clock size={56} style={{ margin: '0 auto' }} />
                            <h1 style={{ color: '#b45309', marginTop: '0.5rem', fontSize: '1.8rem' }}>Time Expired — Auto-Submitted</h1>
                            <p style={{ color: '#78350f' }}>Your allocated test duration ended. Answers were automatically submitted and calculated.</p>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto' }} />
                            <h1 style={{ color: 'var(--color-primary-dark)', marginTop: '0.5rem', fontSize: '1.8rem' }}>Assessment Submitted!</h1>
                            <p className="text-muted">You have successfully completed <b>{exam.title}</b>.</p>
                        </div>
                    )}

                    {/* Official Backend Score */}
                    <div className="score-circle" style={{
                        width: '140px', height: '140px', borderRadius: '50%',
                        background: '#f8fafc', margin: '0 auto 1.5rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: `5px solid ${calculatedResult?.score >= 50 ? '#10b981' : '#ef4444'}`
                    }}>
                        <span style={{ fontSize: '2.75rem', fontWeight: 900, color: calculatedResult?.score >= 50 ? '#10b981' : '#ef4444', lineHeight: 1 }}>
                            {calculatedResult?.score ?? 0}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', textTransform: 'uppercase', fontWeight: 700 }}>
                            Score
                        </span>
                    </div>

                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem',
                        marginBottom: '2rem', textAlign: 'left'
                    }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Questions</span>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>{calculatedResult?.totalQuestions || questions.length}</div>
                        </div>
                        <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                            <span style={{ fontSize: '0.75rem', color: '#065f46' }}>Correct Answers</span>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#166534' }}>{calculatedResult?.correctAnswers ?? 0}</div>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <span style={{ fontSize: '0.75rem', color: '#991b1b' }}>Incorrect</span>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#b91c1c' }}>{calculatedResult?.incorrectAnswers ?? 0}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unanswered</span>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#475569' }}>{calculatedResult?.unansweredQuestions ?? 0}</div>
                        </div>
                    </div>

                    <div style={{
                        padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '10px',
                        fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem'
                    }}>
                        Verified on Server • Violations Recorded: <strong>{violations}</strong> • Submission Type: <strong>{calculatedResult?.submissionType || 'manual'}</strong>
                    </div>

                    <Link to="/exam-hub" className="btn btn-primary full-width" style={{ padding: '0.9rem' }}>
                        Return to Assessment Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // STAGE 3: ACTIVE SECURE EXAMINATION MODE
    // -------------------------------------------------------------
    const currentQ = questions[currentQuestionIndex];
    const timerColor = timeLeft < 300 ? '#ef4444' : 'var(--color-primary-dark)';
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="secure-exam-view" style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem 2rem' }}>
            {/* Screenshot/Print Media Protection Style */}
            <style>{`
                @media print {
                    body { display: none !important; }
                }
                .secure-exam-view {
                    user-select: none;
                    -webkit-user-select: none;
                }
            `}</style>

            {/* Violation Alert Modal */}
            {showWarningModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999
                }}>
                    <div style={{
                        background: 'white', padding: '2rem', borderRadius: '16px',
                        maxWidth: '520px', width: '90%', textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <AlertTriangle size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
                        <h2 style={{ color: '#dc2626', margin: '0 0 0.5rem' }}>Security Violation Warning</h2>
                        <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            {warningMessage}
                        </p>
                        <div style={{
                            background: '#fef2f2', padding: '0.75rem 1rem', borderRadius: '10px',
                            marginBottom: '1.5rem', fontSize: '0.9rem', color: '#991b1b', fontWeight: 600
                        }}>
                            Security Violations: {violations} / {maxViolations}
                            <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>
                                Reaching {maxViolations} violations will trigger automated test termination.
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                setShowWarningModal(false);
                                if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                                    try { await document.documentElement.requestFullscreen(); } catch (e) { }
                                }
                            }}
                            className="btn btn-primary full-width"
                        >
                            Return to Assessment
                        </button>
                    </div>
                </div>
            )}

            {/* Submission Confirmation Modal */}
            {showConfirmSubmit && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white', padding: '2rem', borderRadius: '16px',
                        maxWidth: '460px', width: '90%', textAlign: 'center'
                    }}>
                        <CheckCircle2 size={44} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
                        <h2 style={{ margin: '0 0 0.5rem' }}>Submit Assessment?</h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                            You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                            Once confirmed, your answers will be finalized and evaluated.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowConfirmSubmit(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                CANCEL
                            </button>
                            <button onClick={() => handleFinalSubmit('manual')} disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
                                {isSubmitting ? 'Calculating...' : 'CONFIRM SUBMISSION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar: Section 18 UI Security Indicators */}
            <div className="card glass-panel" style={{
                position: 'sticky', top: '1rem', zIndex: 100,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1.5rem', marginBottom: '1.5rem', borderRadius: '14px',
                border: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: '#e0e7ff', color: '#4338ca', padding: '0.35rem 0.75rem',
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700
                    }}>
                        <Lock size={14} />
                        <span>🔒 Secure Assessment Mode</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {exam.title}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        fontSize: '0.85rem', fontWeight: 700,
                        color: violations > 0 ? '#ef4444' : '#10b981'
                    }}>
                        <Shield size={16} />
                        <span>Security Violations: {violations} / {maxViolations}</span>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '1.2rem', fontWeight: 800,
                        background: timerColor, color: 'white',
                        padding: '0.4rem 1.1rem', borderRadius: '10px'
                    }}>
                        <Clock size={18} />
                        <span>Timer: {formatTime(timeLeft)}</span>
                    </div>

                    <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.5rem 1.25rem', fontWeight: 700 }}
                    >
                        Submit Assessment
                    </button>
                </div>
            </div>

            {/* Assessment Question View & Question Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1.5rem' }}>
                {currentQ && (
                    <div className="card glass-panel" style={{ padding: '2rem', borderRadius: '16px', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{
                                background: '#f1f5f9', color: '#334155',
                                padding: '0.3rem 0.8rem', borderRadius: '8px',
                                fontSize: '0.85rem', fontWeight: 700
                            }}>
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: answers[currentQ.id] !== undefined ? '#166534' : '#64748b', fontWeight: 600 }}>
                                {answers[currentQ.id] !== undefined ? '● Answered' : '○ Not Answered'}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '1.5rem', color: '#1e293b' }}>
                            {currentQ.text}
                        </h3>

                        {currentQ.image && (
                            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                <img
                                    src={currentQ.image}
                                    alt="Question Illustration"
                                    style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                />
                            </div>
                        )}

                        {(!currentQ.type || currentQ.type === 'MCQ') ? (
                            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                                {currentQ.options && currentQ.options.map((opt, i) => (
                                    <label
                                        key={i}
                                        onClick={() => handleAnswerChange(currentQ.id, i)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            padding: '1rem 1.25rem', borderRadius: '12px',
                                            border: `2px solid ${answers[currentQ.id] === i ? 'var(--color-primary)' : '#e2e8f0'}`,
                                            background: answers[currentQ.id] === i ? '#f5f3ff' : 'white',
                                            cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{
                                            width: '22px', height: '22px', borderRadius: '50%',
                                            border: `2px solid ${answers[currentQ.id] === i ? 'var(--color-primary)' : '#cbd5e1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: answers[currentQ.id] === i ? 'var(--color-primary)' : 'transparent',
                                            flexShrink: 0
                                        }}>
                                            {answers[currentQ.id] === i && <Check size={14} color="white" />}
                                        </div>
                                        <span style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                                            <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{ marginBottom: '2rem' }}>
                                <textarea
                                    rows="5"
                                    placeholder="Type your answer here..."
                                    value={answers[currentQ.id] || ''}
                                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '12px',
                                        border: '2px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.95rem'
                                    }}
                                />
                            </div>
                        )}

                        {/* Navigation Buttons: Section 10 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="btn btn-outline"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowConfirmSubmit(true)}
                                    className="btn btn-primary"
                                    style={{ background: '#10b981' }}
                                >
                                    Finish & Submit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Question Palette Sidebar */}
                <div className="card glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', height: 'fit-content', background: 'white' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#1e293b' }}>Question Palette</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isCurrent = idx === currentQuestionIndex;
                            let bg = '#f8fafc';
                            let color = '#475569';
                            let border = '1px solid #e2e8f0';

                            if (isCurrent) {
                                bg = 'var(--color-primary)';
                                color = 'white';
                                border = '2px solid var(--color-primary-dark)';
                            } else if (isAnswered) {
                                bg = '#ecfdf5';
                                color = '#065f46';
                                border = '1px solid #10b981';
                            }

                            return (
                                <button
                                    key={q.id || idx}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    style={{
                                        padding: '0.6rem 0', borderRadius: '8px',
                                        background: bg, color: color, border: border,
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ fontSize: '0.75rem', display: 'grid', gap: '0.4rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ecfdf5', border: '1px solid #10b981' }}></span>
                            <span>Answered ({answeredCount})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-primary)' }}></span>
                            <span>Current Question</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #e2e8f0' }}></span>
                            <span>Unanswered ({questions.length - answeredCount})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamTaker;
