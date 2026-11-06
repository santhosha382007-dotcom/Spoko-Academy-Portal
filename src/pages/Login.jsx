import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, 
  ShieldCheck, AlertCircle, KeyRound, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import logo from '../assets/logo.png';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForgotPass, setShowForgotPass] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');
    setIsLoading(true);
    try {
      await login(identifier, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err === 'Invalid') {
        setErrorMessage('Invalid credentials. Check your User ID / Mobile and password.');
      } else if (err === 'Blocked') {
        setErrorMessage('Account is restricted or disabled. Please contact the administrator.');
      } else if (err === 'UnauthorizedDevice') {
        setErrorMessage('Security Violation: Unauthorized device. Access rejected.');
      } else {
        setErrorMessage('Authentication error. Please verify your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const usersDb = await api.getUsers();
      const targetUser = usersDb.find(u => u.phone === resetPhone || u.id === resetPhone);

      if (targetUser) {
        await api.createAuditLog({
          eventType: 'PASSWORD_RESET_REQUESTED',
          userId: targetUser.id,
          userName: targetUser.name,
          details: `Student ${targetUser.name} requested password reset from Administrator.`
        });
        alert(`Password reset request sent to the Administrator. The Administrator will reset your credentials with a temporary password.`);
        setShowForgotPass(false);
        setResetPhone('');
      } else {
        alert('No registered account found with this Phone Number or Student ID.');
      }
    } catch (e) {
      console.error(e);
      alert('Server connection failed.');
    }
  };

  return (
    <div className="login-page-root">
      {/* Top back navigation */}
      <div className="login-top-bar">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Portal Home</span>
        </Link>
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Branding Section */}
          <div className="branding-section">
            <div className="logo-wrapper">
              <img src={logo} alt="Spoko Academy" className="login-logo-img" />
            </div>

            <div className="portal-kicker">
              <ShieldCheck size={13} />
              <span>SECURE GATEWAY</span>
            </div>

            <h1 className="academy-name">Spoko Academy</h1>
            <p className="login-subtitle">Enter your registered credentials to sign in</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="error-alert">
              <AlertCircle size={16} className="error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-identifier">User ID / Mobile Number / Email</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="login-identifier"
                  type="text"
                  placeholder="e.g. Spoko or Mobile Number"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-link">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPass(true)}
                  className="forgot-link-btn"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="password-toggle-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Security Indicator */}
            <div className="security-notice">
              <CheckCircle2 size={15} className="text-emerald" />
              <span>Session integrity protected & device verified</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn-login-submit ${isLoading ? 'btn-loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-sm"></div>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Card Help Footer */}
          <div className="card-help-footer">
            <p>Admin Login: <code>Spoko</code> / <code>Spoko@123</code></p>
            <p className="help-text">Need assistance? Contact Academic Administration.</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPass && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-icon-badge">
                <KeyRound size={22} />
              </div>
              <div>
                <h2>Reset Credentials</h2>
                <p>Provide your registered identifier to request an admin reset</p>
              </div>
            </div>

            <form onSubmit={handleForgotPassword} className="modal-form">
              <div className="form-group">
                <label>Phone Number or Student ID</label>
                <input
                  type="text"
                  placeholder="Enter registered mobile or ID"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  className="modal-input"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPass(false)} 
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-submit"
                >
                  Send Reset Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .login-page-root {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          padding: 1.5rem;
          position: relative;
        }

        .login-top-bar {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
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

        .login-container {
          width: 100%;
          max-width: 440px;
          margin: 1.5rem 0;
          z-index: 10;
        }

        .login-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 2.5rem 2.25rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
        }

        .branding-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-wrapper {
          width: 68px;
          height: 68px;
          background: #ffffff;
          border-radius: 16px;
          padding: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .portal-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: 1px solid #c7d2fe;
          letter-spacing: 0.5px;
          margin-bottom: 0.6rem;
        }

        .academy-name {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
          letter-spacing: -0.02em;
        }

        .login-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }

        .error-alert {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.85rem;
          font-weight: 500;
          line-height: 1.4;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .label-with-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-link-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .forgot-link-btn:hover {
          color: #4338ca;
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

        .input-with-icon input {
          width: 100%;
          height: 44px;
          padding: 0 2.75rem 0 2.75rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.92rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }

        .input-with-icon input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
        }

        .input-with-icon input::placeholder {
          color: #94a3b8;
        }

        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
        }

        .password-toggle-btn:hover {
          color: #475569;
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 500;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
        }

        .text-emerald {
          color: #059669;
          flex-shrink: 0;
        }

        .btn-login-submit {
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

        .btn-login-submit:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
        }

        .btn-login-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-login-submit:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .spinner-sm {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .card-help-footer {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid #f1f5f9;
          text-align: center;
        }

        .card-help-footer p {
          margin: 0;
          font-size: 0.8rem;
          color: #475569;
        }

        .card-help-footer code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #334155;
          font-weight: 600;
        }

        .help-text {
          margin-top: 0.4rem !important;
          font-size: 0.75rem !important;
          color: #94a3b8 !important;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 1000;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 2rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .modal-icon-badge {
          width: 42px;
          height: 42px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-header h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
        }

        .modal-header p {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .modal-input {
          width: 100%;
          height: 42px;
          padding: 0 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
        }

        .modal-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-modal-cancel {
          flex: 1;
          height: 40px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-modal-cancel:hover {
          background: #e2e8f0;
        }

        .btn-modal-submit {
          flex: 1.5;
          height: 40px;
          background: #4f46e5;
          border: none;
          color: #ffffff;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-modal-submit:hover {
          background: #4338ca;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2rem 1.25rem;
          }
          .login-top-bar {
            position: static;
            width: 100%;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
