import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Shield, AlertTriangle, AlertCircle, Maximize2, Clock, CheckCircle2, ChevronLeft, ChevronRight, Check, XCircle, RotateCcw, Lock } from 'lucide-react';

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
        <div className="secure-exam-view">
            {/* Screenshot/Print Media Protection & Responsive Exam Styles */}
            <style>{`
                @media print {
                    body { display: none !important; }
                }
                .secure-exam-view {
                    user-select: none;
                    -webkit-user-select: none;
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 1rem 0.85rem;
                    box-sizing: border-box;
                    padding-bottom: calc(85px + env(safe-area-inset-bottom, 0px));
                }

                @media (min-width: 768px) {
                    .secure-exam-view {
                        padding: 1.5rem 1.5rem;
                        padding-bottom: 3.5rem;
                    }
                }

                /* Top Exam Status Bar */
                .exam-status-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 0.85rem 1.25rem;
                    margin-bottom: 1.25rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .exam-status-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex: 1;
                    min-width: 200px;
                }

                .exam-mode-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    background: #e0e7ff;
                    color: #4338ca;
                    padding: 0.35rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .exam-title-display {
                    font-size: 0.88rem;
                    color: #334155;
                    font-weight: 600;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 250px;
                }

                .exam-status-right {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    flex-wrap: wrap;
                }

                .exam-violation-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.82rem;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .exam-timer-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #ffffff;
                    padding: 0.4rem 1rem;
                    border-radius: 10px;
                    white-space: nowrap;
                    letter-spacing: 0.5px;
                }

                .btn-submit-action {
                    padding: 0.55rem 1.25rem;
                    font-weight: 700;
                    font-size: 0.88rem;
                    border-radius: 10px;
                    white-space: nowrap;
                }

                /* Responsive Main Content Grid */
                .exam-main-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 280px;
                    gap: 1.5rem;
                    align-items: start;
                }

                .exam-question-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.75rem;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
                    box-sizing: border-box;
                    width: 100%;
                }

                .question-meta-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                }

                .question-counter-tag {
                    background: #f1f5f9;
                    color: #1e293b;
                    padding: 0.35rem 0.85rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .question-status-tag {
                    font-size: 0.82rem;
                    font-weight: 600;
                }

                .question-title-text {
                    font-size: 1.18rem;
                    line-height: 1.6;
                    color: #0f172a;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    word-break: break-word;
                }

                /* MCQ Options List */
                .exam-mcq-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                    margin-bottom: 2rem;
                    width: 100%;
                }

                .exam-option-item {
                    display: flex;
                    align-items: center;
                    gap: 0.95rem;
                    padding: 1rem 1.25rem;
                    border-radius: 14px;
                    border: 2px solid #e2e8f0;
                    background: #ffffff;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    width: 100%;
                    box-sizing: border-box;
                }

                .exam-option-item:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }

                .exam-option-item.selected {
                    border-color: var(--color-primary);
                    background: #f5f3ff;
                }

                .option-indicator-circle {
                    width: 22px;
                    height: 22px;
                    min-width: 22px;
                    border-radius: 50%;
                    border: 2px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                }

                .exam-option-item.selected .option-indicator-circle {
                    border-color: var(--color-primary);
                    background: var(--color-primary);
                }

                .option-text-wrap {
                    font-size: 0.98rem;
                    color: #0f172a !important;
                    -webkit-text-fill-color: #0f172a !important;
                    line-height: 1.45;
                    font-weight: 500;
                    flex: 1;
                    word-break: break-word;
                }

                .option-prefix-label {
                    font-weight: 800;
                    color: var(--color-primary);
                    margin-right: 0.35rem;
                }

                /* Navigation row */
                .exam-question-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1.5rem;
                    border-top: 1px solid #f1f5f9;
                    gap: 0.75rem;
                }

                .btn-exam-nav {
                    min-height: 44px;
                    padding: 0.65rem 1.35rem;
                    font-weight: 700;
                    font-size: 0.92rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    border-radius: 10px;
                }

                /* Palette Sidebar */
                .exam-palette-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
                    box-sizing: border-box;
                    width: 100%;
                }

                .palette-header-title {
                    margin: 0 0 1rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #0f172a;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .palette-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                    margin-bottom: 1.25rem;
                }

                .palette-btn {
                    padding: 0.65rem 0;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 38px;
                    transition: all 0.15s ease;
                }

                .palette-legend {
                    font-size: 0.78rem;
                    display: grid;
                    gap: 0.45rem;
                    color: #475569;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 1rem;
                }

                /* Mobile Adaptations (<= 768px) */
                @media (max-width: 768px) {
                    .exam-status-card {
                        flex-direction: column;
                        align-items: stretch;
                        padding: 0.85rem 1rem;
                        gap: 0.75rem;
                    }

                    .exam-status-left {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .exam-status-right {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .exam-title-display {
                        max-width: 180px;
                        font-size: 0.82rem;
                    }

                    .exam-main-layout {
                        display: flex;
                        flex-direction: column;
                        gap: 1.25rem;
                    }

                    .exam-question-card {
                        padding: 1.25rem 1rem;
                    }

                    .question-title-text {
                        font-size: 1.05rem;
                        margin-bottom: 1.25rem;
                    }

                    .exam-option-item {
                        padding: 0.85rem 1rem;
                        gap: 0.75rem;
                    }

                    .option-text-wrap {
                        font-size: 0.92rem;
                    }

                    .exam-palette-card {
                        padding: 1.25rem 1rem;
                    }

                    .palette-grid {
                        grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
                    }
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
                        <h2 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Submit Assessment?</h2>
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

            {/* Top Bar: Assessment Status & Timer */}
            <div className="exam-status-card">
                <div className="exam-status-left">
                    <div className="exam-mode-badge">
                        <Lock size={13} />
                        <span>Secure Mode</span>
                    </div>
                    <span className="exam-title-display" title={exam.title}>
                        {exam.title}
                    </span>
                </div>

                <div className="exam-status-right">
                    <div className="exam-violation-badge" style={{ color: violations > 0 ? '#ef4444' : '#10b981' }}>
                        <Shield size={15} />
                        <span>Violations: {violations}/{maxViolations}</span>
                    </div>

                    <div className="exam-timer-chip" style={{ background: timerColor }}>
                        <Clock size={16} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>

                    <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="btn btn-primary btn-submit-action"
                    >
                        Submit
                    </button>
                </div>
            </div>

            {/* Assessment Question View & Question Navigation */}
            <div className="exam-main-layout">
                {currentQ && (
                    <div className="exam-question-card">
                        <div className="question-meta-row">
                            <span className="question-counter-tag">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                            <span
                                className="question-status-tag"
                                style={{ color: answers[currentQ.id] !== undefined ? '#166534' : '#64748b' }}
                            >
                                {answers[currentQ.id] !== undefined ? '● Answered' : '○ Not Answered'}
                            </span>
                        </div>

                        <h3 className="question-title-text">
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
                            <div className="exam-mcq-list">
                                {currentQ.options && currentQ.options.map((opt, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleAnswerChange(currentQ.id, i)}
                                        className={`exam-option-item ${answers[currentQ.id] === i ? 'selected' : ''}`}
                                    >
                                        <div className="option-indicator-circle">
                                            {answers[currentQ.id] === i && <Check size={14} color="white" />}
                                        </div>
                                        <div className="option-text-wrap">
                                            <span className="option-prefix-label">{String.fromCharCode(65 + i)}.</span>
                                            {opt}
                                        </div>
                                    </div>
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
                                        border: '2px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.95rem',
                                        color: '#0f172a', backgroundColor: '#ffffff'
                                    }}
                                />
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="exam-question-nav">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="btn btn-outline btn-exam-nav"
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="btn btn-primary btn-exam-nav"
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowConfirmSubmit(true)}
                                    className="btn btn-primary btn-exam-nav"
                                    style={{ background: '#10b981' }}
                                >
                                    Finish & Submit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Question Palette Sidebar */}
                <div className="exam-palette-card">
                    <div className="palette-header-title">
                        <span>Question Palette</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            {answeredCount}/{questions.length} Answered
                        </span>
                    </div>

                    <div className="palette-grid">
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isCurrent = idx === currentQuestionIndex;
                            let bg = '#f8fafc';
                            let color = '#475569';
                            let border = '1px solid #e2e8f0';

                            if (isCurrent) {
                                bg = 'var(--color-primary)';
                                color = '#ffffff';
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
                                    className="palette-btn"
                                    style={{
                                        background: bg,
                                        color: color,
                                        border: border
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="palette-legend">
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
