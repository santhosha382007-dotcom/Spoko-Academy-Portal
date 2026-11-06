import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ArrowLeft, Settings, X, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AIAssistant = () => {
    const { user } = useAuth();
    const aiName = user?.details?.gender === 'female' ? 'Friday' : 'Jarvis';

    const [messages, setMessages] = useState([
        { id: 1, text: `Hi! I'm ${aiName}, your AI Study Assistant. I can help you prepare for exams or review your past mistakes. What would you like to do?`, sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const GLOBAL_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || GLOBAL_KEY);
    const messagesEndRef = useRef(null);

    const quickActions = [
        { label: "Explain last mistakes", icon: "❌" },
        { label: "Generate practice test", icon: "📝" },
        { label: "Study tips", icon: "💡" }
    ];

    const chatHistory = [
        "Math Prep - 12 Feb",
        "Chapter 4 Review",
        "Practice Test #1"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const saveApiKey = (e) => {
        e.preventDefault();
        localStorage.setItem('openai_api_key', apiKey);
        setShowConfig(false);
        alert('OpenAI API Key saved successfully! ChatGPT Mode is now active.');
    };

    const handleSend = async (e, customText = null) => {
        if (e) e.preventDefault();
        const textToSend = customText || input;
        if (!textToSend.trim()) return;

        const userMsg = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        if (apiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: `You are ${aiName}, a helpful AI study assistant for Spoko Academy. 
                                The student's name is ${user?.name} and they are in the ${user?.details?.department || 'Railways'} department.
                                Always be encouraging and provide study advice specific to their department when possible.`
                            },
                            { role: "user", content: textToSend }
                        ]
                    })
                });

                const data = await response.json();
                if (response.ok && data.choices && data.choices[0]) {
                    const botMsg = { id: Date.now() + 1, text: data.choices[0].message.content, sender: 'bot' };
                    setMessages(prev => [...prev, botMsg]);
                } else {
                    const errorDetail = data?.error?.message || response.statusText || 'Unknown Error';
                    throw new Error(errorDetail);
                }
            } catch (err) {
                console.error("OpenAI API Error:", err);
                const errorMsg = {
                    id: Date.now() + 1,
                    text: `AI Sync Error: "${err.message}". \n\nPlease verify your OpenAI account billing status or API key validity in settings.`,
                    sender: 'bot'
                };
                setMessages(prev => [...prev, errorMsg]);
            } finally {
                setIsTyping(false);
            }
        } else {
            // Fallback to Mock AI Response
            setTimeout(() => {
                const botResponseText = getMockAIResponse(textToSend);
                const botMsg = { id: Date.now() + 1, text: botResponseText, sender: 'bot' };
                setMessages(prev => [...prev, botMsg]);
                setIsTyping(false);
            }, 1200);
        }
    };

    const getMockAIResponse = (query) => {
        const lowerQ = query.toLowerCase();
        const dept = user?.details?.department || 'Railways';

        if (lowerQ.includes('hello') || lowerQ.includes('hi') || lowerQ.includes('hey')) {
            return `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm ${aiName}, your specialized AI for ${dept}. How can I assist your study session today?`;
        }

        if (lowerQ.includes('mistake') || lowerQ.includes('wrong') || lowerQ.includes('last exam')) {
            return `I've analyzed your recent ${dept} mock results. You're strong in General Knowledge, but you consistently lose marks on 'Timed Arithmetic'. Let's focus on speed drills today!`;
        }

        if (lowerQ.includes('generate') || lowerQ.includes('test') || lowerQ.includes('exam') || lowerQ.includes('practice')) {
            return `I'll prepare a dynamic ${dept} practice set for you. Would you prefer a 'Quick 10-Question Sprint' or a 'Full Mock Simulation'?`;
        }

        if (lowerQ.includes('tip') || lowerQ.includes('how to study') || lowerQ.includes('help')) {
            return `For the ${dept} syllabus, I recommend the '2-3-5-7 Revision Rule'. It ensures you remember 80% more than standard reading. Would you like me to set a schedule?`;
        }
        return "That's a great question! Connect my OpenAI brain in settings to get real-time advanced answers. For now, I can help with Exam Strategy, Doubt Clearing, or generating a targeted Mock Test.";
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1>AI Assistant - <span style={{ color: 'var(--color-primary)' }}>{aiName}</span></h1>
                </div>
                <button onClick={() => setShowConfig(true)} className="btn btn-outline btn-sm" style={{ gap: '0.5rem' }}>
                    <Settings size={16} /> {apiKey === GLOBAL_KEY ? 'Academy AI Active' : apiKey ? 'Personal AI Active' : 'Setup AI'}
                </button>
            </div>

            <div className="ai-layout">
                <aside className="chat-history-sidebar glass-panel hide-on-mobile">
                    <div className="sidebar-header">
                        <h3 style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Chat History</h3>
                    </div>
                    <div className="history-list">
                        {chatHistory.map((h, i) => (
                            <div key={i} className="history-item">
                                <span style={{ fontSize: '0.85rem' }}>💬 {h}</span>
                            </div>
                        ))}
                    </div>
                    {apiKey && (
                        <div style={{ marginTop: 'auto', padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                                <Zap size={14} /> POWERED BY OPENAI
                            </div>
                        </div>
                    )}
                </aside>

                <div className="chat-main-container glass-panel">
                    <div className="messages-area">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.sender}`}>
                                <div className="message-avatar">
                                    {msg.sender === 'bot' ? <Bot size={20} /> : <User size={20} />}
                                </div>
                                <div className="message-bubble animate-fade-in">
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message bot">
                                <div className="message-avatar"><Bot size={20} /></div>
                                <div className="message-bubble typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="quick-action-bar">
                        {quickActions.map((action, i) => (
                            <button key={i} onClick={() => handleSend(null, action.label)} className="action-btn">
                                {action.icon} {action.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="input-area">
                        <button type="button" className="voice-btn" title="Voice Input (Future Upgrade)">
                            <span style={{ fontSize: '1.4rem' }}>🎙️</span>
                        </button>
                        <input
                            type="text"
                            placeholder={`Message ${aiName}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button type="submit" className="btn btn-primary send-btn" disabled={!input.trim() || isTyping}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            {showConfig && (
                <div className="modal-overlay">
                    <div className="config-modal animate-fade-in">
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ShieldCheck className="text-primary" />
                                <h3 style={{ margin: 0 }}>AI Configuration</h3>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="btn-icon"><X /></button>
                        </div>
                        <form onSubmit={saveApiKey} className="modal-body">
                            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                To enable the full ChatGPT experience in Spoko Portal, please enter your OpenAI API key below. Your key is stored locally on your device.
                            </p>
                            <div className="input-group-premium" style={{ marginBottom: '1.5rem' }}>
                                <label>OpenAI API Key</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Enable ChatGPT</button>
                                {apiKey && (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => { setApiKey(''); localStorage.removeItem('openai_api_key'); }}
                                    >
                                        Clear Key
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .ai-layout { 
                    display: grid; 
                    grid-template-columns: 260px 1fr; 
                    gap: 1.5rem; 
                    height: calc(100vh - 12rem);
                    background: #f8fafc; 
                }
                
                @media (max-width: 768px) {
                    .ai-layout {
                        grid-template-columns: 1fr;
                        height: calc(100vh - 14rem);
                    }
                    .hide-on-mobile {
                        display: none;
                    }
                    .messages-area {
                        padding: 1.5rem 1rem;
                    }
                    .chat-main-container {
                        border-radius: 1rem;
                    }
                }

                .chat-history-sidebar { background: white !important; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
                .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
                .history-item { padding: 0.75rem 1rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .history-item:hover { background: #f5f3ff; border-color: #ddd6fe; color: #7c3aed; }
                .chat-main-container { flex: 1; display: flex; flex-direction: column; border-radius: var(--radius-xl); overflow: hidden; background: white !important; }
                .messages-area { flex: 1; padding: 2rem; overflow-y: auto; background: #fcfcfc; }

                .quick-action-bar { padding: 0.75rem 1.5rem; display: flex; gap: 0.75rem; overflow-x: auto; background: #fff; border-top: 1px solid #f1f5f9; }
                .action-btn { padding: 0.6rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.8rem; font-weight: 600; color: #475569; white-space: nowrap; transition: all 0.2s; }
                .action-btn:hover { background: #f5f3ff; border-color: #7c3aed; color: #7c3aed; }

                .message { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-end; }
                .message.user { flex-direction: row-reverse; }
                .message-avatar { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: var(--color-primary); }
                .message.user .message-avatar { background: var(--color-primary); color: white; }
                .message-bubble { padding: 1rem 1.25rem; border-radius: 1.25rem; max-width: 75%; line-height: 1.5; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); white-space: pre-wrap; }
                .message.bot .message-bubble { background: white; border: 1px solid #f1f5f9; border-bottom-left-radius: 4px; color: #1e293b; }
                .message.user .message-bubble { background: var(--color-primary); color: white; border-bottom-right-radius: 4px; }

                .input-area { padding: 1.25rem 1.5rem; background: white; display: flex; gap: 1rem; border-top: 1px solid #f1f5f9; align-items: center; }
                .voice-btn { width: 45px; height: 45px; border-radius: 12px; background: #f8fafc; transition: all 0.2s; border: none; cursor: pointer; }
                .voice-btn:hover { background: #f1f5f9; transform: scale(1.05); }
                .input-area input { flex: 1; padding: 0.85rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; outline: none; font-size: 0.95rem; }
                .send-btn { width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
                .config-modal { background: white; width: 100%; max-width: 450px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; }
                .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .modal-body { padding: 2rem; }
                
                .input-group-premium label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
                .input-group-premium input { width: 100%; padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; outline: none; transition: all 0.2s; }
                .input-group-premium input:focus { border-color: #7c3aed; background: white; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1); }

                .typing-indicator span { display: inline-block; width: 6px; height: 6px; background: #cbd5e1; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out both; }
                .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default AIAssistant;
