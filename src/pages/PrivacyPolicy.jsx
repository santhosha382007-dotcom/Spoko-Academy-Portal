import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, Trash2, Mail, FileText } from 'lucide-react';
import logo from '../assets/logo.png';

const PrivacyPolicy = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc',
            fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '2.5rem 1rem'
        }}>
            <div style={{
                maxWidth: '840px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <Link to="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6366f1',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                    }}>
                        <ArrowLeft size={18} />
                        <span>Back to Portal</span>
                    </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <img src={logo} alt="Spoko Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Privacy Policy & Data Safety</h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                            Spoko Academy Portal • Last Updated: November 2026
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    marginBottom: '2rem'
                }}>
                    <ShieldCheck size={20} />
                    <span>Compliant with Google Play Data Safety & Apple App Store Privacy Guidelines</span>
                </div>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.75rem' }}>
                        1. Information We Collect
                    </h2>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        Spoko Academy collects academic and institutional data necessary to deliver learning management and assessment services:
                    </p>
                    <ul style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem', paddingLeft: '1.25rem' }}>
                        <li><strong>Personal Information:</strong> Student/Staff full name, mobile number, institutional email address, department, and roll/student ID.</li>
                        <li><strong>Academic & Assessment Records:</strong> Examination attempts, scores, answer submissions, question evaluations, and performance analytics.</li>
                        <li><strong>Attendance & Leave Data:</strong> Daily attendance records, leave requests, approval history, and date logs.</li>
                        <li><strong>Security & Audit Telemetry:</strong> Login timestamps, device identifier, and proctoring security events (e.g., test session window blur or fullscreen exit logs).</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.75rem' }}>
                        2. Purpose and Use of Data
                    </h2>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        Collected data is used solely for educational and administrative purposes:
                    </p>
                    <ul style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem', paddingLeft: '1.25rem' }}>
                        <li>Authenticating student and faculty access to courses and exams.</li>
                        <li>Grading assessments and generating official institutional performance reports.</li>
                        <li>Tracking student daily attendance and processing formal leave applications.</li>
                        <li>Ensuring examination integrity and preventing unauthorized access.</li>
                    </ul>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        We <strong>never</strong> sell, rent, or monetize user data with third-party advertisers or data brokers.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.75rem' }}>
                        3. Data Security & Encryption
                    </h2>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        All communication between the Spoko Academy client application and cloud services is transmitted over secure HTTPS (Transport Layer Security - TLS 1.3). Passwords are never stored in plain text and are hashed using industry-standard bcrypt algorithms.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.75rem' }}>
                        4. Account Deletion & Data Rights (Google Play & App Store Compliance)
                    </h2>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        Under Google Play and Apple App Store Developer policies, all users have the right to request deletion of their account and associated personal data:
                    </p>
                    <ul style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem', paddingLeft: '1.25rem' }}>
                        <li><strong>In-App Deletion Request:</strong> Navigate to <em>Profile & Settings &gt; Security &gt; Request Account Deletion</em> to submit a formal account purge request.</li>
                        <li><strong>Direct Administration Contact:</strong> Students and staff can contact the Spoko Academy Administrator or email the privacy desk to request complete removal of their personal profile and credentials.</li>
                        <li><strong>Data Deletion Scope:</strong> Upon approval, your account credentials, login credentials, and personal profile information will be purged from active databases within 30 days, subject to mandatory educational record retention regulations.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.75rem' }}>
                        5. Contacting the Administration
                    </h2>
                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        For questions regarding this privacy policy or to submit a data request, please contact the academy administration desk at <strong>support@spokoacademy.edu</strong> or via the portal administrative support channel.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
