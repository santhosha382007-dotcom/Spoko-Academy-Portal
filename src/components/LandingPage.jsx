import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowRight, ShieldCheck, CheckCircle2, Award, 
    BookOpen, Users, Compass, Laptop, Smartphone, Database, Lock
} from 'lucide-react';
import logo from '../assets/logo.png';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page-root">
            {/* Top Institutional Header */}
            <header className="landing-header">
                <div className="header-container">
                    <div className="header-brand">
                        <img src={logo} alt="Spoko Academy" className="header-logo-img" />
                        <div className="header-brand-text">
                            <span className="header-title">Spoko Academy</span>
                            <span className="header-badge">Institutional Portal</span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <div className="system-status-indicator" title="Connected to Cloud API">
                            <span className="status-dot"></span>
                            <span className="status-label">Cloud Online</span>
                        </div>
                        <button
                            className="btn-header-signin"
                            onClick={() => navigate('/login')}
                        >
                            <span>Sign In</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Hero & Action Section */}
            <main className="landing-main">
                <div className="landing-hero-card">
                    {/* Academy Crest / Emblem */}
                    <div className="emblem-wrapper">
                        <div className="emblem-circle">
                            <img src={logo} alt="Spoko Academy Crest" className="emblem-img" />
                        </div>
                        <div className="emblem-ring"></div>
                    </div>

                    {/* Academy Title & Slogan */}
                    <div className="hero-text-block">
                        <div className="portal-kicker">
                            <ShieldCheck size={14} className="kicker-icon" />
                            <span>Enterprise Academic Management System</span>
                        </div>
                        <h1 className="hero-title">Spoko Academy</h1>
                        <p className="hero-motto">“Today's Seed, Tomorrow's Tree”</p>
                        <p className="hero-description">
                            Unified institutional platform for real-time academic assessments, 
                            geofenced attendance validation, batch curriculum management, and multi-factor student administration.
                        </p>
                    </div>

                    {/* Feature Highlights Grid */}
                    <div className="features-pill-grid">
                        <div className="feature-pill">
                            <CheckCircle2 size={16} className="pill-icon text-indigo" />
                            <span>Cloud-Synced Real-Time Database</span>
                        </div>
                        <div className="feature-pill">
                            <Lock size={16} className="pill-icon text-indigo" />
                            <span>Biometric & SIM Verification</span>
                        </div>
                        <div className="feature-pill">
                            <Compass size={16} className="pill-icon text-indigo" />
                            <span>Geofenced Campus Attendance</span>
                        </div>
                        <div className="feature-pill">
                            <Award size={16} className="pill-icon text-indigo" />
                            <span>Continuous Assessment Registry</span>
                        </div>
                    </div>

                    {/* Call To Action Primary Section */}
                    <div className="cta-container">
                        <button
                            className="btn-hero-primary"
                            onClick={() => navigate('/login')}
                            autoFocus
                        >
                            <span>Access Institutional Portal</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {/* Platform Support Pills */}
                    <div className="platform-badges-row">
                        <div className="platform-badge" title="Access via any modern browser">
                            <Laptop size={14} />
                            <span>Cloud Web</span>
                        </div>
                        <div className="platform-divider">•</div>
                        <div className="platform-badge" title="Windows 64-bit Desktop Application">
                            <Database size={14} />
                            <span>Windows Desktop App</span>
                        </div>
                        <div className="platform-divider">•</div>
                        <div className="platform-badge" title="Android Native APK with SIM Binding">
                            <Smartphone size={14} />
                            <span>Android Mobile APK</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Institutional Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <p>© 2026 Spoko Academy. All rights reserved. • Release v1.0.0 Production</p>
                    <p className="footer-sub">Protected under Institutional Device Integrity & Session Encryption Policies</p>
                </div>
            </footer>

            <style>{`
                .landing-page-root {
                    min-height: 100vh;
                    width: 100%;
                    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #0f172a;
                    position: relative;
                    overflow-x: hidden;
                }

                /* Header */
                .landing-header {
                    width: 100%;
                    background: #ffffff;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 0.85rem 1.5rem;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
                }

                .header-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .header-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .header-logo-img {
                    width: 38px;
                    height: 38px;
                    object-fit: contain;
                    border-radius: 8px;
                    background: #ffffff;
                    padding: 2px;
                    border: 1px solid #e2e8f0;
                }

                .header-brand-text {
                    display: flex;
                    flex-direction: column;
                }

                .header-title {
                    font-weight: 700;
                    font-size: 1.05rem;
                    color: #0f172a;
                    line-height: 1.2;
                }

                .header-badge {
                    font-size: 0.72rem;
                    color: #64748b;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }

                .system-status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    padding: 0.35rem 0.75rem;
                    border-radius: 9999px;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #16a34a;
                    border-radius: 50%;
                    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
                    animation: pulseDot 2s infinite ease-in-out;
                }

                @keyframes pulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.85); }
                }

                .status-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #166534;
                }

                .btn-header-signin {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #4f46e5;
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 0.88rem;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-header-signin:hover {
                    background: #4338ca;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
                }

                /* Main */
                .landing-main {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 1.5rem;
                }

                .landing-hero-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
                    max-width: 680px;
                    width: 100%;
                    padding: 3rem 2.5rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }

                .emblem-wrapper {
                    position: relative;
                    margin-bottom: 1.5rem;
                }

                .emblem-circle {
                    width: 88px;
                    height: 88px;
                    background: #ffffff;
                    border-radius: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);
                    position: relative;
                    z-index: 2;
                }

                .emblem-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .emblem-ring {
                    position: absolute;
                    inset: -6px;
                    border-radius: 26px;
                    background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(124, 58, 237, 0.05));
                    z-index: 1;
                }

                .portal-kicker {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: #eef2ff;
                    color: #4338ca;
                    font-size: 0.78rem;
                    font-weight: 600;
                    padding: 0.3rem 0.85rem;
                    border-radius: 9999px;
                    margin-bottom: 0.85rem;
                    border: 1px solid #c7d2fe;
                }

                .hero-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.03em;
                    line-height: 1.15;
                    margin: 0 0 0.5rem 0;
                }

                .hero-motto {
                    font-size: 1.15rem;
                    color: #4f46e5;
                    font-weight: 600;
                    font-style: italic;
                    margin: 0 0 1rem 0;
                }

                .hero-description {
                    font-size: 0.95rem;
                    color: #475569;
                    line-height: 1.6;
                    max-width: 520px;
                    margin: 0 auto 1.75rem auto;
                }

                .features-pill-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    width: 100%;
                    margin-bottom: 2rem;
                    text-align: left;
                }

                .feature-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 0.65rem 0.85rem;
                    border-radius: 10px;
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: #334155;
                }

                .pill-icon {
                    flex-shrink: 0;
                }

                .text-indigo {
                    color: #4f46e5;
                }

                .cta-container {
                    width: 100%;
                    max-width: 380px;
                    margin-bottom: 1.75rem;
                }

                .btn-hero-primary {
                    width: 100%;
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 12px;
                    padding: 0.95rem 1.5rem;
                    font-size: 1.05rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.35);
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .btn-hero-primary:hover {
                    background: #4338ca;
                    transform: translateY(-2px);
                    box-shadow: 0 14px 24px -5px rgba(79, 70, 229, 0.45);
                }

                .btn-hero-primary:active {
                    transform: translateY(0);
                }

                .platform-badges-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    padding-top: 1.25rem;
                    border-top: 1px solid #f1f5f9;
                    width: 100%;
                }

                .platform-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.78rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .platform-divider {
                    color: #cbd5e1;
                    font-size: 0.8rem;
                }

                /* Footer */
                .landing-footer {
                    background: #ffffff;
                    border-top: 1px solid #e2e8f0;
                    padding: 1.25rem 1.5rem;
                    text-align: center;
                }

                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .footer-content p {
                    margin: 0;
                    font-size: 0.82rem;
                    color: #64748b;
                }

                .footer-sub {
                    margin-top: 0.3rem !important;
                    font-size: 0.75rem !important;
                    color: #94a3b8 !important;
                }

                @media (max-width: 640px) {
                    .landing-hero-card {
                        padding: 2rem 1.25rem;
                    }
                    .hero-title {
                        font-size: 1.85rem;
                    }
                    .features-pill-grid {
                        grid-template-columns: 1fr;
                    }
                    .system-status-indicator {
                        display: none;
                    }
                    .platform-badges-row {
                        gap: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
