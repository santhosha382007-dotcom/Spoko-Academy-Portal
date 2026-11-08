import React from 'react';
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Spoko Portal ErrorBoundary caught an unhandled error]:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    handleLogout = () => {
        try {
            localStorage.removeItem('spoko_user');
            localStorage.removeItem('spoko_session_id');
        } catch (e) {
            console.error('Logout cleanup failed:', e);
        }
        window.location.href = '/login';
    };

    render() {
        if (this.state.hasError) {
            const errorMsg = this.state.error?.message || String(this.state.error) || 'An unexpected runtime error occurred.';
            const isStaffError = errorMsg.toLowerCase().includes('staff') || errorMsg.toLowerCase().includes('role');

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    color: '#1e293b'
                }}>
                    <div style={{
                        maxWidth: '560px',
                        width: '100%',
                        background: '#ffffff',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        padding: '2.5rem 2rem',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: '#fee2e2',
                            color: '#ef4444',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem'
                        }}>
                            <AlertTriangle size={32} />
                        </div>

                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
                            Portal View Encountered an Issue
                        </h1>
                        <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                            The application recovered safely instead of blanking out. You can reload the page or return to the main dashboard.
                        </p>

                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1rem',
                            textAlign: 'left',
                            marginBottom: '1.75rem',
                            fontSize: '0.82rem',
                            fontFamily: 'monospace',
                            color: '#b91c1c',
                            maxHeight: '140px',
                            overflowY: 'auto',
                            wordBreak: 'break-word'
                        }}>
                            <strong>Error:</strong> {errorMsg}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button
                                    onClick={this.handleReload}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '0.8rem 1rem',
                                        background: '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={16} /> Reload App
                                </button>
                                <button
                                    onClick={this.handleGoHome}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '0.8rem 1rem',
                                        background: '#0ea5e9',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Home size={16} /> Dashboard
                                </button>
                            </div>

                            <button
                                onClick={this.handleLogout}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '0.75rem 1rem',
                                    background: 'transparent',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <LogOut size={15} /> Sign Out & Clear Session
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
