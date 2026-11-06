import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, Lock, ArrowRight, ArrowLeft, BookOpen, 
    GraduationCap, Calendar, Phone, Mail, ShieldCheck, Check
} from 'lucide-react';
import logo from '../assets/logo.png';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        email: '',
        dob: '',
        gender: 'select',
        collegeName: '',
        degreeCompleted: '',
        cgpa: '',
        hseSchool: '',
        hsePercentage: '',
        sslcSchool: '',
        sslcPercentage: '',
        department: 'select'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (formData.phone.length < 10) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await register(formData);
            alert(`Student account for "${formData.fullName}" created successfully!`);
            navigate('/admin/users');
        } catch (err) {
            console.error(err);
            let msg = err.message || "Unknown Error";
            if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
                msg = "Connection Refused. Please check the cloud server connectivity.";
            }
            alert(`Student Creation Failed: ${msg}`);
        }
    };

    return (
        <div className="register-page-root">
            <div className="register-top-bar">
                <Link to="/admin/users" className="back-link">
                    <ArrowLeft size={16} />
                    <span>Back to Student Management</span>
                </Link>
            </div>

            <div className="register-container">
                <div className="register-card">
                    {/* Header */}
                    <div className="register-branding">
                        <div className="logo-box">
                            <img src={logo} alt="Spoko Academy" className="logo-img" />
                        </div>
                        <div className="kicker-pill">
                            <ShieldCheck size={13} />
                            <span>ADMINISTRATION ONBOARDING</span>
                        </div>
                        <h1 className="register-title">Register New Student</h1>
                        <p className="register-subtitle">Spoko Academy Institutional Enrollment</p>

                        {/* Step Progress Pills */}
                        <div className="stepper-row">
                            <div className={`step-pill ${step >= 1 ? 'step-active' : ''}`}>
                                <span className="step-num">{step > 1 ? <Check size={14} /> : '1'}</span>
                                <span className="step-label">Personal Information</span>
                            </div>
                            <div className="step-line"></div>
                            <div className={`step-pill ${step === 2 ? 'step-active' : ''}`}>
                                <span className="step-num">2</span>
                                <span className="step-label">Academics & Department</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={step === 1 ? handleNext : handleSubmit} className="register-form">
                        {step === 1 && (
                            <div className="step-content">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <div className="input-with-icon">
                                        <User size={18} className="input-icon" />
                                        <input 
                                            type="text" 
                                            name="fullName" 
                                            placeholder="e.g. Aravind Kumar" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.fullName} 
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Registered Phone Number</label>
                                    <div className="input-with-icon">
                                        <Phone size={18} className="input-icon" />
                                        <input 
                                            type="tel" 
                                            name="phone" 
                                            placeholder="10-digit mobile number" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.phone} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-with-icon">
                                        <Mail size={18} className="input-icon" />
                                        <input 
                                            type="email" 
                                            name="email" 
                                            placeholder="student@example.com" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.email} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Temporary Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} className="input-icon" />
                                        <input 
                                            type="password" 
                                            name="password" 
                                            placeholder="••••••••" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.password} 
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Date of Birth</label>
                                        <div className="input-with-icon">
                                            <Calendar size={18} className="input-icon" />
                                            <input 
                                                type="date" 
                                                name="dob" 
                                                required 
                                                onChange={handleChange} 
                                                value={formData.dob} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Gender</label>
                                        <select 
                                            name="gender" 
                                            className="form-select" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.gender}
                                        >
                                            <option value="select" disabled>Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" className="btn-register-primary">
                                    <span>Proceed to Academic Information</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="step-content">
                                <div className="form-group">
                                    <label>College / Institution Name</label>
                                    <div className="input-with-icon">
                                        <GraduationCap size={18} className="input-icon" />
                                        <input 
                                            type="text" 
                                            name="collegeName" 
                                            placeholder="Institution Name" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.collegeName} 
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Degree Completed</label>
                                        <div className="input-with-icon">
                                            <BookOpen size={18} className="input-icon" />
                                            <input 
                                                type="text" 
                                                name="degreeCompleted" 
                                                placeholder="B.E / B.Sc / Diploma" 
                                                required 
                                                onChange={handleChange} 
                                                value={formData.degreeCompleted} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>CGPA / Percentage</label>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0" 
                                            max="100" 
                                            className="form-input-clean" 
                                            name="cgpa" 
                                            placeholder="e.g. 8.5" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.cgpa} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>HSE (12th Grade) Details</label>
                                    <div className="split-fields">
                                        <input 
                                            type="text" 
                                            className="form-input-clean" 
                                            name="hseSchool" 
                                            placeholder="Higher Secondary School Name" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.hseSchool} 
                                            style={{ flex: 2 }}
                                        />
                                        <input 
                                            type="number" 
                                            className="form-input-clean" 
                                            name="hsePercentage" 
                                            placeholder="Score %" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.hsePercentage} 
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>SSLC (10th Grade) Details</label>
                                    <div className="split-fields">
                                        <input 
                                            type="text" 
                                            className="form-input-clean" 
                                            name="sslcSchool" 
                                            placeholder="Secondary School Name" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.sslcSchool} 
                                            style={{ flex: 2 }}
                                        />
                                        <input 
                                            type="number" 
                                            className="form-input-clean" 
                                            name="sslcPercentage" 
                                            placeholder="Score %" 
                                            required 
                                            onChange={handleChange} 
                                            value={formData.sslcPercentage} 
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Assigned Department</label>
                                    <select 
                                        name="department" 
                                        className="form-select" 
                                        required 
                                        onChange={handleChange} 
                                        value={formData.department}
                                    >
                                        <option value="select" disabled>Select Department</option>
                                        <option value="Railways">Railways</option>
                                        <option value="Agnipath">Agnipath</option>
                                        <option value="TNUSRB">TNUSRB</option>
                                        <option value="TNPSC">TNPSC</option>
                                        <option value="SSC GD">SSC GD</option>
                                    </select>
                                </div>

                                <div className="dual-action-buttons">
                                    <button 
                                        type="button" 
                                        onClick={() => setStep(1)} 
                                        className="btn-register-secondary"
                                    >
                                        Back to Step 1
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-register-primary"
                                    >
                                        Create Student Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <style>{`
                .register-page-root {
                    min-height: 100vh;
                    width: 100%;
                    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #0f172a;
                    padding: 2rem 1rem;
                    position: relative;
                }

                .register-top-bar {
                    width: 100%;
                    max-width: 540px;
                    margin-bottom: 1rem;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #475569;
                    font-size: 0.88rem;
                    font-weight: 600;
                    text-decoration: none;
                    padding: 0.45rem 0.85rem;
                    border-radius: 8px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                }

                .back-link:hover {
                    color: #0f172a;
                    border-color: #cbd5e1;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                }

                .register-container {
                    width: 100%;
                    max-width: 540px;
                }

                .register-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 2.5rem 2.25rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
                }

                .register-branding {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    margin-bottom: 1.75rem;
                }

                .logo-box {
                    width: 60px;
                    height: 60px;
                    background: #ffffff;
                    border-radius: 14px;
                    padding: 6px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
                    margin-bottom: 0.85rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .logo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .kicker-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    background: #eef2ff;
                    color: #4338ca;
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 0.2rem 0.6rem;
                    border-radius: 9999px;
                    border: 1px solid #c7d2fe;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5rem;
                }

                .register-title {
                    font-size: 1.65rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 0.25rem 0;
                    letter-spacing: -0.02em;
                }

                .register-subtitle {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0 0 1.25rem 0;
                }

                /* Stepper */
                .stepper-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    width: 100%;
                    padding-top: 0.75rem;
                    border-top: 1px solid #f1f5f9;
                }

                .step-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .step-active {
                    color: #4f46e5;
                }

                .step-num {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 700;
                }

                .step-active .step-num {
                    background: #4f46e5;
                    color: #ffffff;
                }

                .step-line {
                    width: 28px;
                    height: 2px;
                    background: #e2e8f0;
                }

                .register-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .step-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }

                .form-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #334155;
                }

                .form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .split-fields {
                    display: flex;
                    gap: 0.75rem;
                }

                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .input-with-icon input,
                .form-input-clean,
                .form-select {
                    width: 100%;
                    height: 44px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    font-size: 0.9rem;
                    color: #0f172a;
                    outline: none;
                    transition: all 0.2s ease;
                }

                .input-with-icon input {
                    padding: 0 1rem 0 2.75rem;
                }

                .form-input-clean {
                    padding: 0 1rem;
                }

                .form-select {
                    padding: 0 1rem;
                    cursor: pointer;
                }

                .input-with-icon input:focus,
                .form-input-clean:focus,
                .form-select:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
                }

                .btn-register-primary {
                    width: 100%;
                    height: 46px;
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
                    transition: all 0.2s ease;
                    margin-top: 0.5rem;
                }

                .btn-register-primary:hover {
                    background: #4338ca;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
                }

                .dual-action-buttons {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }

                .btn-register-secondary {
                    flex: 1;
                    height: 46px;
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.92rem;
                    cursor: pointer;
                    transition: background 0.15s;
                }

                .btn-register-secondary:hover {
                    background: #e2e8f0;
                }

                @media (max-width: 480px) {
                    .register-card {
                        padding: 1.75rem 1.25rem;
                    }
                    .form-grid-2 {
                        grid-template-columns: 1fr;
                    }
                    .split-fields {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default Register;
