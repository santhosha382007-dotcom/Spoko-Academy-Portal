import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, Trash2, Save, X, FileText, Loader, Edit2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import ImageCropper from '../../components/ImageCropper';

// Initialize PDF.js worker - Using stable version 4.4.168
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;

const QuestionBank = () => {
    const { user: currentUser } = useAuth();
    const isStaff = currentUser?.role === 'staff';
    const staffDept = currentUser?.department || currentUser?.details?.department || 'General';

    const [questions, setQuestions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // New Question Form State
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        type: 'MCQ',
        image: null,
        subject: isStaff ? staffDept : 'General',
        department: isStaff ? staffDept : 'General'
    });

    const [imageToCrop, setImageToCrop] = useState(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            try {
                const data = await api.getQuestions();
                setQuestions(data);
            } catch (err) {
                console.error("Failed to fetch questions", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuestions();
    }, []);

    // Real Document Upload & Processing
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
            // or use common patterns to extract Q&A.
            // For Tamil support, we look for '?' and common keywords.
            const sentences = text.split(/[.!?\n]/).filter(s => s.trim().length > 20);
            const extractedQuestions = [];

            // Pattern Matcher for Questions
            sentences.forEach((sentence, index) => {
                const cleanText = sentence.trim();
                if (extractedQuestions.length >= 10) return;

                // Basic heuristic: Sentence ending in ? or containing "what/how/who" or Tamil equivalents
                if (cleanText.includes('?') || cleanText.includes('யார்') || cleanText.includes('எது') || cleanText.length > 50) {
                    extractedQuestions.push({
                        text: cleanText,
                        options: [
                            'Option A (Based on text)',
                            'Option B (Based on text)',
                            'Option C (Based on text)',
                            'Option D (Based on text)'
                        ],
                        correctAnswer: 0,
                        subject: 'General'
                    });
                }
            });

            if (extractedQuestions.length === 0) {
                // Fallback if no questions found
                extractedQuestions.push({
                    text: `Extracted summary from ${fileName}: ${text.substring(0, 100)}...`,
                    options: ['True', 'False', 'Not Mentioned', 'None'],
                    correctAnswer: 0,
                    subject: 'General'
                });
            }

            // Save to DB
            for (const q of extractedQuestions) {
                await api.createQuestion({ ...q, id: Date.now() + Math.random() });
            }

            const updated = await api.getQuestions();
            setQuestions(updated);
            alert(`Successfully processed "${fileName}" and extracted ${extractedQuestions.length} questions.`);
        } catch (err) {
            console.error("Extraction Error:", err);
            alert("Failed to process document: " + err.message);
        } finally {
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const [editingId, setEditingId] = useState(null);

    const handleEdit = (question) => {
        setNewQuestion(question);
        setEditingId(question.id);
        setShowForm(true);
    };

    const handleSaveQuestion = async (e) => {
        e.preventDefault();

        try {
            const finalSubject = isStaff ? staffDept : (newQuestion.subject || 'General');
            const finalDept = isStaff ? staffDept : (newQuestion.department || newQuestion.subject || 'General');
            const payload = {
                ...newQuestion,
                subject: finalSubject,
                department: finalDept
            };

            if (editingId) {
                await api.updateQuestion(editingId, { ...payload, id: editingId });
            } else {
                await api.createQuestion({ ...payload, id: Date.now() });
            }
            const updated = await api.getQuestions();
            setQuestions(updated);
            setShowForm(false);
            setEditingId(null);
            setNewQuestion({ 
                text: '', 
                options: ['', '', '', ''], 
                correctAnswer: 0, 
                type: 'MCQ', 
                image: null, 
                subject: isStaff ? staffDept : 'General',
                department: isStaff ? staffDept : 'General'
            });
        } catch (err) {
            alert("Failed to save question. Is the server running?");
        }
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

    const handleDelete = async (id) => {
        if (confirm('Delete this question?')) {
            try {
                await api.deleteQuestion(id);
                setQuestions(questions.filter(q => q.id !== id));
            } catch (err) {
                alert("Failed to delete question.");
            }
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...newQuestion.options];
        newOptions[index] = value;
        setNewQuestion({ ...newQuestion, options: newOptions });
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1>{isStaff ? `${staffDept} Question Bank` : 'Question Bank'}</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link to={isStaff ? "/staff/import-questions" : "/admin/pdf-import"} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                        <Upload size={16} /> Bulk Import PDF
                    </Link>

                    <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ background: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> Add Question
                    </button>
                </div>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
                <div className="processing-status card glass-panel animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="spinner"></div>
                        <div>
                            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>AI Document Analysis in Progress...</h3>
                            <p className="text-muted">Extracting concepts and generating multiple choice questions...</p>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>Add New Question</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-icon"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveQuestion}>
                            
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
                                    rows="3"
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

                            <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Subject / Department</label>
                                    {isStaff ? (
                                        <div style={{ padding: '0.6rem 0.8rem', background: '#f1f5f9', borderRadius: '8px', fontWeight: 700, color: '#4338ca' }}>
                                            {staffDept} (Department Locked)
                                        </div>
                                    ) : (
                                        <select
                                            className="input-field"
                                            value={newQuestion.subject}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                                        >
                                            <option>General</option>
                                            <option>Railway</option>
                                            <option>SSC</option>
                                            <option>GD</option>
                                            <option>TNPSC</option>
                                            <option>TNUSRB</option>
                                            <option>Math</option>
                                            <option>Physics</option>
                                            <option>Chemistry</option>
                                            <option>History</option>
                                            <option>Biology</option>
                                            <option>Literature</option>
                                        </select>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
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
                            </div>

                            {(!newQuestion.type || newQuestion.type === 'MCQ') ? (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Options (Select correct one)</label>
                                    <div className="options-grid">
                                        {newQuestion.options.map((opt, idx) => (
                                            <div key={idx} className="option-input-group">
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    required
                                                    checked={newQuestion.correctAnswer === idx}
                                                    onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: idx })}
                                                />
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    placeholder={`Option ${idx + 1}`}
                                                    required={(!newQuestion.type || newQuestion.type === 'MCQ')}
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Correct Answer (Exact match required for grading)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. 42 or Paris"
                                        required
                                        value={typeof newQuestion.correctAnswer === 'string' ? newQuestion.correctAnswer : ''}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                                    />
                                    <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>Students will see a text box to type their answer.</small>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary full-width">
                                {editingId ? 'Update Question' : 'Save Question'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {(() => {
                const displayQuestions = isStaff
                    ? questions.filter(q => 
                        (q.department && q.department.toLowerCase() === staffDept.toLowerCase()) || 
                        (q.subject && q.subject.toLowerCase() === staffDept.toLowerCase())
                    )
                    : questions;

                return (
                    <div className="questions-list">
                        {displayQuestions.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                                <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}><FileText size={48} /></div>
                                <h3>{isStaff ? `No Questions in ${staffDept} Question Bank` : 'Question Bank is Empty'}</h3>
                                <p className="text-muted">
                                    {isStaff 
                                        ? `Upload a PDF exam sheet using Bulk Import to add questions for the ${staffDept} department.`
                                        : 'Upload a course document (PDF/Word) to auto-generate questions or add them manually.'}
                                </p>
                            </div>
                        ) : displayQuestions.map((q) => (
                            <div key={q.id} className="card question-card animate-fade-in">
                                <div className="q-header">
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span className="badge badge-primary">{q.subject}</span>
                                        {q.department && q.department !== q.subject && (
                                            <span className="badge badge-secondary">{q.department}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(q)} className="btn-icon-sm" title="Edit" style={{ color: 'var(--color-primary)' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(q.id)} className="btn-icon-sm text-danger" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3>{q.text}</h3>
                                {q.image && (
                                    <img src={q.image} alt="Question" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', margin: '0.5rem 0' }} />
                                )}
                                <div className="options-preview">
                                    {(!q.type || q.type === 'MCQ') ? (
                                        q.options.map((opt, idx) => (
                                            <span key={idx} className={`opt-pill ${q.correctAnswer === idx ? 'correct' : ''}`}>
                                                {opt}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="opt-pill correct">Answer: {q.correctAnswer}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 90%;
                    max-width: 600px;
                    background: white;
                    padding: 2rem;
                    border-radius: var(--radius-lg);
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .input-field {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    margin-top: 0.5rem;
                }
                .options-grid {
                    display: grid;
                    gap: 1rem;
                }
                .option-input-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .question-card {
                    margin-bottom: 1rem;
                }
                .q-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }
                .options-preview {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                .opt-pill {
                    padding: 0.25rem 0.75rem;
                    background: #f3f4f6;
                    border-radius: 99px;
                    font-size: 0.85rem;
                }
                .opt-pill.correct {
                    background: #dcfce7;
                    color: #166534;
                    border: 1px solid #86efac;
                }
                .text-danger { color: #ef4444; }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(99, 102, 241, 0.3);
                    border-radius: 50%;
                    border-top-color: var(--color-primary);
                    animation: spin 1s ease-in-out infinite;
                }
                .btn.disabled {
                    opacity: 0.7;
                    pointer-events: none;
                }
                @media (max-width: 768px) {
                    .container > div:first-child {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 1.5rem;
                    }
                    .container > div:first-child > div:last-child {
                        width: 100%;
                        flex-direction: column;
                        align-items: stretch !important;
                    }
                    .container > div:first-child > div:last-child > div,
                    .container > div:first-child > div:last-child > button {
                        width: 100%;
                    }
                    .container > div:first-child > div:last-child label {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default QuestionBank;
