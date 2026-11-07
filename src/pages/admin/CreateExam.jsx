import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Plus, Trash2, X, Loader, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import ImageCropper from '../../components/ImageCropper';

// Initialize PDF.js worker - Using stable version 4.4.168
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;

const CreateExam = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [examData, setExamData] = useState({
        title: '',
        duration: 60,
        department: 'Generic',
        category: 'Assessment',
        max_attempts: 3,
        max_security_violations: 3,
        description: '',
        questions: [] // Will store full question objects now
    });

    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        api.getDepartments().then(setDepartments).catch(() => {});
    }, []);

    // Upload/Form States
    const [isProcessing, setIsProcessing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        type: 'MCQ',
        image: null,
        subject: 'General'
    });

    const [imageToCrop, setImageToCrop] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const fileName = file.name;

        try {
            let text = "";
            if (file.type === "application/pdf") {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(" ") + "\n";
                }
                text = fullText;
            } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else {
                throw new Error("Unsupported file type. Please upload PDF or DOCX.");
            }

            // Simple AI Logic: Split text into sentences and find those that look like questions
            const sentences = text.split(/[.!?\n]/).filter(s => s.trim().length > 20);
            const extractedQuestions = [];

            sentences.forEach((sentence, index) => {
                const cleanText = sentence.trim();
                // We'll limit to 50 questions for a new exam
                if (extractedQuestions.length >= 50) return;

                if (cleanText.includes('?') || cleanText.includes('யார்') || cleanText.includes('எது') || cleanText.length > 50) {
                    extractedQuestions.push({
                        id: Date.now() + Math.random(),
                        text: cleanText,
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correctAnswer: 0,
                        subject: 'General'
                    });
                }
            });

            if (extractedQuestions.length === 0) {
                extractedQuestions.push({
                    id: Date.now(),
                    text: `Content extracted from ${fileName}: ${text.substring(0, 100)}...`,
                    options: ['True', 'False', 'Not Mentioned', 'None'],
                    correctAnswer: 0,
                    subject: 'General'
                });
            }

            setExamData(prev => ({
                ...prev,
                questions: [...prev.questions, ...extractedQuestions]
            }));

            alert(`Successfully processed "${fileName}" and added ${extractedQuestions.length} questions to your exam.`);
        } catch (err) {
            console.error("Extraction Error:", err);
            alert("Failed to process document: " + err.message);
        } finally {
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const handleAddManual = (e) => {
        e.preventDefault();
        const q = { ...newQuestion, id: Date.now() };
        setExamData(prev => ({
            ...prev,
            questions: [...prev.questions, q]
        }));
        setShowForm(false);
        setNewQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0, type: 'MCQ', image: null, subject: 'General' });
    };

    const handleSingleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageToCrop(e.target.result);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const onCropComplete = (croppedImageBase64) => {
        setNewQuestion(prev => {
            const isEmptyOptions = prev.options.every(opt => opt.trim() === '');
            return {
                ...prev,
                image: croppedImageBase64,
                options: isEmptyOptions ? ['A', 'B', 'C', 'D'] : prev.options
            };
        });
        setImageToCrop(null);
    };

    const handleDeleteQuestion = (id) => {
        setExamData(prev => ({
            ...prev,
            questions: prev.questions.filter(q => q.id !== id)
        }));
    };

    const handleSave = async () => {
        if (!confirm('Are you sure you want to publish this exam? This will make it visible to students.')) return;

        const newExam = {
            id: Date.now(),
            ...examData,
            status: 'Active',
            createdAt: new Date().toISOString()
        };

        try {
            await api.createExam(newExam);
            await api.createAuditLog({
                eventType: 'EXAM_CREATED',
                performedBy: 'Administrator',
                details: `Admin created assessment "${newExam.title}" (${newExam.questions.length} questions) for department: ${newExam.department}.`
            });
            alert('Exam Created Successfully!');
            navigate('/');
        } catch (e) {
            console.error(e);
            alert('Failed to save exam. Ensure server is running.');
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...newQuestion.options];
        newOptions[index] = value;
        setNewQuestion({ ...newQuestion, options: newOptions });
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                    <ArrowLeft size={20} />
                </Link>
                <h1>Create New Exam</h1>
            </div>

            <div className="card glass-panel animate-fade-in">
                {step === 1 && (
                    <div className="step-content">
                        <h2>Step 1: Exam Details</h2>
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                className="input-field"
                                value={examData.category}
                                onChange={(e) => setExamData({ ...examData, category: e.target.value })}
                            >
                                <option value="Mock Test">Mock Test</option>
                                <option value="Assessment">Assessment</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Target Audience (Department)</label>
                            <select
                                className="input-field"
                                value={examData.department}
                                onChange={(e) => setExamData({ ...examData, department: e.target.value })}
                            >
                                <option value="Generic">Generic / All</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Exam Title *</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Cyber Security Fundamentals"
                                value={examData.title}
                                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Duration (minutes) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    className="input-field"
                                    value={examData.duration}
                                    onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) || 1 })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Allowed Attempts Limit *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="input-field"
                                    value={examData.max_attempts}
                                    onChange={(e) => setExamData({ ...examData, max_attempts: parseInt(e.target.value) || 1 })}
                                />
                                <small style={{ color: '#64748b' }}>Default: 3 attempts</small>
                            </div>

                            <div className="form-group">
                                <label>Max Violations Allowed *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="input-field"
                                    value={examData.max_security_violations}
                                    onChange={(e) => setExamData({ ...examData, max_security_violations: parseInt(e.target.value) || 1 })}
                                />
                                <small style={{ color: '#64748b' }}>Exceeding submits exam</small>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.5rem' }}>
                            <label>Assessment Description & Instructions (Optional)</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                placeholder="Instructions visible to student before starting (e.g. Complete all questions, full-screen required)..."
                                value={examData.description}
                                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setStep(2)}
                                disabled={!examData.title}
                            >
                                Next: Add Questions
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>Step 2: Add Questions</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        id="exam-doc-upload"
                                        style={{ display: 'none' }}
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="exam-doc-upload" className={`btn btn-outline ${isProcessing ? 'disabled' : ''}`} style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                        {isProcessing ? <Loader className="spin" size={16} /> : <Upload size={16} />}
                                        {isProcessing ? ' Analyzing...' : ' Upload Doc'}
                                    </label>
                                </div>
                                <button className="btn btn-outline" onClick={() => setShowForm(true)} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                    <Plus size={16} /> Add Manual
                                </button>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="questions-selection-list">
                            {examData.questions.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <p>No questions added yet.</p>
                                    <p style={{ fontSize: '0.9rem' }}>Upload a document or add questions manually to populate this exam.</p>
                                </div>
                            ) : examData.questions.map((q, idx) => (
                                <div key={q.id} className="question-item icon-hover-container">
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                            <span className="badge" style={{ marginRight: '0.5rem', fontSize: '0.75rem' }}>Q{idx + 1}</span>
                                            {q.text}
                                        </div>
                                        {q.image && (
                                            <img src={q.image} alt="Question" style={{ maxHeight: '60px', borderRadius: '4px', display: 'block', margin: '0.25rem 0' }} />
                                        )}
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {(!q.type || q.type === 'MCQ') ? 
                                                `Options: ${q.options.join(', ')} (Ans: ${q.options[q.correctAnswer]})`
                                                : 
                                                `Short Answer (Ans: ${q.correctAnswer})`
                                            }
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteQuestion(q.id)} className="btn-icon-sm text-danger">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                            <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={examData.questions.length === 0}
                            >
                                <Save size={18} /> Publish Exam ({examData.questions.length} Qs)
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Add Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>Add Single Question</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-icon"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddManual}>
                            {imageToCrop && (
                                <ImageCropper 
                                    imageSrc={imageToCrop} 
                                    onComplete={onCropComplete} 
                                    onCancel={() => setImageToCrop(null)} 
                                />
                            )}

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Question Text</label>
                                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', padding: '0.25rem 0.75rem' }}>
                                        <ImageIcon size={14} style={{ marginRight: '0.25rem' }} /> Insert Image (PNG/JPG)
                                        <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleSingleImageUpload} />
                                    </label>
                                </div>
                                <textarea
                                    className="input-field"
                                    rows="2"
                                    required={!newQuestion.image}
                                    value={newQuestion.text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                    placeholder={newQuestion.image ? "Optional if image is provided" : ""}
                                ></textarea>
                            </div>

                            {newQuestion.image && (
                                <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
                                    <img src={newQuestion.image} alt="Question Attachment" style={{ maxHeight: '150px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                                    <button type="button" onClick={() => setNewQuestion({...newQuestion, image: null})} className="btn-icon-sm" style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'white', border: '1px solid #ddd', color: 'red' }}><X size={14}/></button>
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label>Question Type</label>
                                <select
                                    className="input-field"
                                    value={newQuestion.type || 'MCQ'}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                >
                                    <option value="MCQ">Multiple Choice</option>
                                    <option value="ShortAnswer">Short Answer</option>
                                </select>
                            </div>

                            {(!newQuestion.type || newQuestion.type === 'MCQ') ? (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Options (Select correct radio)</label>
                                    {newQuestion.options.map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                            <input type="radio" name="correct" required checked={newQuestion.correctAnswer === idx} onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: idx })} />
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.5rem' }}
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                required={(!newQuestion.type || newQuestion.type === 'MCQ')}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Correct Answer (Exact match required)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. 42 or Paris"
                                        required
                                        value={typeof newQuestion.correctAnswer === 'string' ? newQuestion.correctAnswer : ''}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary full-width">Add to Exam</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    margin-top: 0.5rem;
                }
                .questions-selection-list {
                    height: 400px;
                    overflow-y: auto;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    background: rgba(255,255,255,0.5);
                }
                .question-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                    border-bottom: 1px solid var(--color-border);
                }
                .question-item:last-child {
                    border-bottom: none;
                }
                .text-danger { color: #ef4444; }
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 90%; max-width: 500px;
                    background: white; padding: 2rem;
                    border-radius: var(--radius-lg);
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CreateExam;
