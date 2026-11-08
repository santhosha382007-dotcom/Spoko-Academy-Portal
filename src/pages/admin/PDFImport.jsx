import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, FileUp, Upload, Check, Trash2, Plus, Edit2, 
    BookOpen, CheckCircle, AlertCircle, FileText, Loader, RefreshCw
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as pdfjs from 'pdfjs-dist';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Ensure PDF.js worker is properly configured
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;

const PDFImport = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const isStaff = currentUser?.role === 'staff';
    const staffDept = currentUser?.department || currentUser?.details?.department || 'General';

    // Stages: 'upload' | 'review' | 'success'
    const [stage, setStage] = useState('upload');
    const [fileName, setFileName] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(() => isStaff ? staffDept : 'General');
    const [isSaving, setIsSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        if (isStaff && staffDept) {
            setSelectedDepartment(staffDept);
        }
    }, [isStaff, staffDept]);

    // -------------------------------------------------------------
    // Smart Question Parser from Extracted PDF Text
    // -------------------------------------------------------------
    const parseQuestionsFromText = (rawText) => {
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const questions = [];
        let currentQ = null;

        // Regex patterns
        const questionStartRegex = /^(?:Q(?:uestion)?\s*\.?\s*\d+|^\d+[\.\)]|\(\d+\))\s*(.*)/i;
        const optionRegex = /^[A-Da-d][\.\)]\s*(.*)/;
        const answerRegex = /^(?:Ans(?:wer)?|Correct\s*(?:Option)?)\s*[:\-\=]\s*([A-Da-d1-4])/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match Question Start
            const qMatch = line.match(questionStartRegex);
            if (qMatch) {
                if (currentQ && currentQ.text) {
                    questions.push(finalizeQuestion(currentQ));
                }
                currentQ = {
                    text: qMatch[1] || '',
                    options: [],
                    correctAnswer: 0,
                    marks: 1,
                    type: 'MCQ'
                };
                continue;
            }

            // Match Answer Line
            const ansMatch = line.match(answerRegex);
            if (ansMatch && currentQ) {
                const ansChar = ansMatch[1].toUpperCase();
                if (ansChar === 'A' || ansChar === '1') currentQ.correctAnswer = 0;
                else if (ansChar === 'B' || ansChar === '2') currentQ.correctAnswer = 1;
                else if (ansChar === 'C' || ansChar === '3') currentQ.correctAnswer = 2;
                else if (ansChar === 'D' || ansChar === '4') currentQ.correctAnswer = 3;
                continue;
            }

            // Match Option Line
            const optMatch = line.match(optionRegex);
            if (optMatch && currentQ) {
                currentQ.options.push(optMatch[1] || line);
                continue;
            }

            // Append multiline question text or option text
            if (currentQ) {
                if (currentQ.options.length === 0) {
                    currentQ.text += (currentQ.text ? ' ' : '') + line;
                } else {
                    const lastIdx = currentQ.options.length - 1;
                    currentQ.options[lastIdx] += ' ' + line;
                }
            }
        }

        if (currentQ && currentQ.text) {
            questions.push(finalizeQuestion(currentQ));
        }

        // If standard regex didn't find enough formatted questions, fallback to sentence splitting
        if (questions.length === 0) {
            const sentences = rawText.split(/[.!?\n]/).filter(s => s.trim().length > 30);
            sentences.slice(0, 15).forEach((sentence, idx) => {
                questions.push({
                    id: Date.now() + idx,
                    text: sentence.trim(),
                    options: [
                        'Option A (Based on text)',
                        'Option B (Based on text)',
                        'Option C (Based on text)',
                        'Option D (Based on text)'
                    ],
                    correctAnswer: 0,
                    marks: 1,
                    type: 'MCQ'
                });
            });
        }

        return questions;
    };

    const finalizeQuestion = (q) => {
        // Ensure 4 options
        const opts = [...q.options];
        while (opts.length < 4) {
            opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        }
        return {
            id: Date.now() + Math.random().toString(36).substring(2, 7),
            text: q.text.trim(),
            options: opts.slice(0, 4),
            correctAnswer: q.correctAnswer || 0,
            marks: q.marks || 1,
            type: 'MCQ'
        };
    };

    // -------------------------------------------------------------
    // Extract PDF Text Page-by-Page
    // -------------------------------------------------------------
    const handlePdfFile = async (file) => {
        setFileName(file.name);
        setIsExtracting(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            let extractedText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                extractedText += pageText + "\n";
            }

            const parsed = parseQuestionsFromText(extractedText);
            if (parsed.length === 0) {
                alert("No readable question patterns found in this PDF. It may be scanned or empty.");
                setIsExtracting(false);
                return;
            }

            setExtractedQuestions(parsed);
            setStage('review');
        } catch (err) {
            console.error("PDF Extraction Error:", err);
            alert("Failed to process the PDF document. Please make sure the file is not password-protected.");
        } finally {
            setIsExtracting(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                handlePdfFile(acceptedFiles[0]);
            }
        },
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    // Edit Question in Review List
    const handleUpdateQuestion = (index, field, value) => {
        setExtractedQuestions(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleUpdateOption = (qIndex, optIndex, value) => {
        setExtractedQuestions(prev => {
            const updated = [...prev];
            const newOpts = [...updated[qIndex].options];
            newOpts[optIndex] = value;
            updated[qIndex].options = newOpts;
            return updated;
        });
    };

    const handleDeleteQuestion = (index) => {
        setExtractedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddManualQuestion = () => {
        const newQ = {
            id: Date.now() + Math.random().toString(36).substring(2, 7),
            text: 'New imported question prompt...',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            marks: 1,
            type: 'MCQ'
        };
        setExtractedQuestions(prev => [...prev, newQ]);
    };

    // -------------------------------------------------------------
    // Save Confirmed Questions to Global Question Bank
    // -------------------------------------------------------------
    const handleConfirmAndSave = async () => {
        if (extractedQuestions.length === 0) {
            alert("No questions to save.");
            return;
        }

        setIsSaving(true);
        try {
            const batchId = 'batch_' + Date.now();

            for (const q of extractedQuestions) {
                const questionPayload = {
                    id: Date.now() + Math.floor(Math.random() * 10000),
                    text: q.text,
                    options: q.options,
                    correctAnswer: Number(q.correctAnswer),
                    marks: Number(q.marks) || 1,
                    type: q.type || 'MCQ',
                    subject: selectedDepartment,
                    department: selectedDepartment,
                    source: `PDF Import: ${fileName}`,
                    batchId,
                    createdAt: new Date().toISOString()
                };
                await api.createQuestion(questionPayload);
            }

            // Track Batch
            await api.createQuestionImportBatch({
                id: batchId,
                fileName,
                department: selectedDepartment,
                questionCount: extractedQuestions.length,
                importedBy: currentUser?.name || 'Administrator',
                importedAt: new Date().toISOString()
            });

            // Audit Log
            await api.createAuditLog({
                eventType: 'PDF_QUESTION_IMPORT',
                performedBy: currentUser?.name || 'Administrator',
                details: `Imported and published ${extractedQuestions.length} verified questions from PDF "${fileName}" to Question Bank.`
            });

            setSavedCount(extractedQuestions.length);
            setStage('success');
        } catch (err) {
            console.error("Failed to commit questions", err);
            alert("Failed to save questions to question bank.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to={isStaff ? "/staff/questions" : "/admin/questions"} className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>PDF Bulk Question Import</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Upload PDF exam sheets, review extracted questions, edit marks/options, and publish to Question Bank.
                        </p>
                    </div>
                </div>
            </div>

            {/* STAGE 1: UPLOAD PDF */}
            {stage === 'upload' && (
                <div style={{ maxWidth: '680px', margin: '2rem auto' }}>
                    <div
                        {...getRootProps()}
                        style={{
                            border: '3px dashed #cbd5e1',
                            borderRadius: '24px',
                            padding: '3.5rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: isDragActive ? '#f5f3ff' : 'white',
                            borderColor: isDragActive ? '#7c3aed' : '#cbd5e1',
                            transition: 'all 0.2s',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.03)'
                        }}
                    >
                        <input {...getInputProps()} />
                        <div style={{ width: '72px', height: '72px', background: '#f5f3ff', color: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            {isExtracting ? <Loader className="spin" size={36} /> : <FileUp size={36} />}
                        </div>

                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                            {isExtracting ? 'Analyzing and Extracting Questions...' : 'Upload Question Paper PDF'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                            Drag and drop your examination PDF here, or click to browse. The system will extract text, parse MCQs, and load them into the verification stage.
                        </p>

                        <button 
                            type="button" 
                            onClick={open} 
                            className="btn btn-primary" 
                            style={{ background: '#7c3aed', padding: '0.75rem 2rem', fontWeight: 700 }} 
                            disabled={isExtracting}
                        >
                            {isExtracting ? 'Processing Pages...' : 'Select PDF File'}
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem' }}>
                            💡 PDF Formatting Tips:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.6 }}>
                            <li>Numbered questions (e.g. 1. What is... or Q1. What is...) are automatically detected.</li>
                            <li>Options labeled A), B), C), D) or A., B., C., D. are recognized as multiple choices.</li>
                            <li>Answer keys labeled "Ans: A" or "Answer: B" automatically set the correct answer.</li>
                            <li>You can review, modify options, fix OCR typos, and delete unwanted questions before publishing.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* STAGE 2: REVIEW & EDIT EXTRACTED QUESTIONS (Section 11) */}
            {stage === 'review' && (
                <div>
                    {/* Control Bar */}
                    <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Extracted From:</span>
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{fileName}</div>
                            </div>
                            <div style={{ height: '30px', width: '1px', background: '#e2e8f0' }}></div>
                            <div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Questions Detected:</span>
                                <div style={{ fontWeight: 800, color: '#7c3aed' }}>{extractedQuestions.length}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Target Department:</label>
                                {isStaff ? (
                                    <span className="badge badge-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                        {staffDept} (Department Locked)
                                    </span>
                                ) : (
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        style={{ padding: '0.45rem 0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}
                                    >
                                        <option value="General">General / All</option>
                                        <option value="Railway">Railway</option>
                                        <option value="SSC">SSC</option>
                                        <option value="GD">GD</option>
                                        <option value="TNPSC">TNPSC</option>
                                        <option value="TNUSRB">TNUSRB</option>
                                    </select>
                                )}
                            </div>

                            <button onClick={handleAddManualQuestion} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={14} /> Add Question
                            </button>

                            <button
                                onClick={handleConfirmAndSave}
                                className="btn btn-primary"
                                style={{ background: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                                disabled={isSaving || extractedQuestions.length === 0}
                            >
                                <Check size={16} /> {isSaving ? 'Publishing...' : `Confirm & Save All (${extractedQuestions.length})`}
                            </button>
                        </div>
                    </div>

                    {/* Questions Review Cards */}
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                        {extractedQuestions.map((q, qIndex) => (
                            <div
                                key={q.id || qIndex}
                                className="card"
                                style={{
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    padding: '1.5rem',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: '8px' }}>
                                        Question #{qIndex + 1}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteQuestion(qIndex)}
                                        className="btn-icon-sm"
                                        title="Delete Question"
                                        style={{ color: '#ef4444', background: '#fef2f2' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Question Text Edit */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                                        Question Text / Prompt
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={q.text}
                                        onChange={(e) => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', resize: 'vertical', fontSize: '0.92rem' }}
                                    />
                                </div>

                                {/* Options & Correct Answer Radio */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {q.options.map((opt, optIndex) => {
                                        const optLetter = String.fromCharCode(65 + optIndex);
                                        const isCorrect = Number(q.correctAnswer) === optIndex;
                                        return (
                                            <div
                                                key={optIndex}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '12px',
                                                    border: isCorrect ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                                                    background: isCorrect ? '#ecfdf5' : '#f8fafc'
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`correct_${q.id || qIndex}`}
                                                    checked={isCorrect}
                                                    onChange={() => handleUpdateQuestion(qIndex, 'correctAnswer', optIndex)}
                                                    style={{ cursor: 'pointer', accentColor: '#10b981' }}
                                                    title="Mark as correct answer"
                                                />
                                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isCorrect ? '#047857' : '#64748b' }}>
                                                    {optLetter}.
                                                </span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => handleUpdateOption(qIndex, optIndex, e.target.value)}
                                                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', fontWeight: 500 }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                    <div>
                                        Select the radio button on the correct answer option.
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <label style={{ fontWeight: 700 }}>Marks:</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={q.marks || 1}
                                            onChange={(e) => handleUpdateQuestion(qIndex, 'marks', e.target.value)}
                                            style={{ width: '60px', padding: '0.3rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={handleConfirmAndSave}
                            className="btn btn-primary"
                            style={{ background: '#7c3aed', padding: '1rem 3rem', fontSize: '1rem', fontWeight: 800 }}
                            disabled={isSaving || extractedQuestions.length === 0}
                        >
                            {isSaving ? 'Publishing to Question Bank...' : `Confirm & Save All ${extractedQuestions.length} Questions`}
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE 3: SUCCESS */}
            {stage === 'success' && (
                <div style={{ maxWidth: '520px', margin: '4rem auto', textAlign: 'center' }} className="card">
                    <div style={{ width: '64px', height: '64px', background: '#ecfdf5', color: '#059669', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                        <CheckCircle size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#0f172a' }}>Questions Published Successfully!</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
                        <strong>{savedCount}</strong> questions have been verified and added to the <strong>{selectedDepartment}</strong> Question Bank. They are now available to include in exams.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => {
                                setStage('upload');
                                setExtractedQuestions([]);
                            }}
                            className="btn btn-outline"
                            style={{ flex: 1 }}
                        >
                            Import Another PDF
                        </button>
                        <Link
                            to={isStaff ? "/staff/questions" : "/admin/questions"}
                            className="btn btn-primary"
                            style={{ flex: 1, background: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            View Question Bank
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFImport;
