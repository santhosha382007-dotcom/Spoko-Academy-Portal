import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    LogOut, LayoutDashboard, PlusCircle, CheckCircle, Menu, X, Users, Calendar, 
    TrendingUp, BarChart2, Bell, Settings, ClipboardList,
    Building2, FileUp, CalendarCheck, ShieldCheck, History, Award, User as UserIcon,
    ChevronRight, ChevronLeft, Wifi
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import ForcePasswordChangeModal from './ForcePasswordChangeModal';
import SimVerificationModal from './SimVerificationModal';
import { isWindowsPlatform, isMobilePlatform } from '../utils/platform';

const getPageTitle = (pathname) => {
    switch (pathname) {
        case '/':
            return { title: 'Dashboard Overview', subtitle: 'Academic & Institutional Command Center' };
        case '/admin/users':
            return { title: 'Student Directory', subtitle: 'Student enrollment and credentials management' };
        case '/admin/departments':
            return { title: 'Academic Departments', subtitle: 'Institutional courses, sections, and subjects' };
        case '/admin/attendance':
            return { title: 'Attendance Oversight', subtitle: 'Multi-campus attendance and geofence tracking' };
        case '/admin/leave':
            return { title: 'Leave Management', subtitle: 'Student leave applications and approvals' };
        case '/admin/create-exam':
            return { title: 'Assessment Manager', subtitle: 'Author exams, schedules, and duration' };
        case '/admin/questions':
            return { title: 'Question Bank', subtitle: 'Curated question repository and categories' };
        case '/admin/pdf-import':
            return { title: 'PDF Question Import', subtitle: 'Automated AI/OCR question ingestion' };
        case '/admin/results':
            return { title: 'Performance Analytics', subtitle: 'Score breakdowns and class metrics' };
        case '/admin/reports':
            return { title: 'Institutional Reports', subtitle: 'Exportable academic and compliance dossiers' };
        case '/admin/audit-logs':
            return { title: 'Security & Audit Logs', subtitle: 'Authentication trail and device event history' };
        case '/my-attendance':
            return { title: 'My Daily Attendance', subtitle: 'Verified clock-in and attendance history' };
        case '/leave':
            return { title: 'Leave Applications', subtitle: 'Request leaves and track status' };
        case '/exam-hub':
            return { title: 'Assessment Hub', subtitle: 'Live exams and departmental tests' };
        case '/history':
            return { title: 'My Test Results', subtitle: 'Exam scorecards and detailed feedback' };
        case '/settings':
            return { title: 'Profile & Settings', subtitle: 'Account preferences and security config' };
        default:
            return { title: 'Portal Management', subtitle: 'Spoko Academy Institutional Portal' };
    }
};

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = user?.role === 'admin';
    const isStudent = user?.role === 'student';
    const isWindows = isWindowsPlatform();
    const isMobile = isMobilePlatform();

    const [showSimModal, setShowSimModal] = useState(false);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;
    const pageMeta = getPageTitle(location.pathname);

    return (
        <div className="layout-root">
            {/* Mandatory First-Login Password Change Modal */}
            <ForcePasswordChangeModal />

            {/* Mobile-Only SIM Card Security Verification for Students */}
            {showSimModal && (
                <SimVerificationModal 
                    user={user} 
                    onVerified={() => setShowSimModal(false)}
                    onCancel={() => {
                        logout();
                        navigate('/');
                    }}
                />
            )}

            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-backdrop"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
                <div className="sidebar-brand-wrapper">
                    <div className="brand-identity">
                        <img src={logo} alt="Spoko Logo" className="brand-logo" />
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <div className="brand-text-block">
                                <span className="brand-title">Spoko Academy</span>
                                <span className="brand-badge">Academic Cloud</span>
                            </div>
                        )}
                    </div>
                    {isMobileMenuOpen ? (
                        <button 
                            className="sidebar-close-btn"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label="Close navigation"
                        >
                            <X size={20} />
                        </button>
                    ) : (
                        <button 
                            className="sidebar-collapse-btn hide-on-mobile"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    )}
                </div>

                <nav className="sidebar-menu-scrollable">
                    <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'General' : '•'}</div>
                    <Link to="/" className={`sidebar-nav-item ${isActive('/') ? 'active' : ''}`} title="Dashboard">
                        <LayoutDashboard size={19} className="nav-item-icon" />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Dashboard</span>}
                    </Link>

                    {isAdmin && (
                        <>
                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'Administration' : '•'}</div>
                            <Link to="/admin/users" className={`sidebar-nav-item ${isActive('/admin/users') ? 'active' : ''}`} title="Students">
                                <Users size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Students Directory</span>}
                            </Link>
                            <Link to="/admin/departments" className={`sidebar-nav-item ${isActive('/admin/departments') ? 'active' : ''}`} title="Departments">
                                <Building2 size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Departments</span>}
                            </Link>
                            <Link to="/admin/attendance" className={`sidebar-nav-item ${isActive('/admin/attendance') ? 'active' : ''}`} title="Attendance">
                                <Calendar size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Attendance Tracking</span>}
                            </Link>
                            <Link to="/admin/leave" className={`sidebar-nav-item ${isActive('/admin/leave') ? 'active' : ''}`} title="Leave Management">
                                <CalendarCheck size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Leave Requests</span>}
                            </Link>

                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'Assessments & Tests' : '•'}</div>
                            <Link to="/admin/create-exam" className={`sidebar-nav-item ${isActive('/admin/create-exam') ? 'active' : ''}`} title="Manage Exams">
                                <PlusCircle size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Create & Manage Exams</span>}
                            </Link>
                            <Link to="/admin/questions" className={`sidebar-nav-item ${isActive('/admin/questions') ? 'active' : ''}`} title="Question Bank">
                                <ClipboardList size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Question Bank</span>}
                            </Link>
                            <Link to="/admin/pdf-import" className={`sidebar-nav-item ${isActive('/admin/pdf-import') ? 'active' : ''}`} title="PDF Import">
                                <FileUp size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">PDF Question Ingest</span>}
                            </Link>
                            <Link to="/admin/results" className={`sidebar-nav-item ${isActive('/admin/results') ? 'active' : ''}`} title="Results">
                                <BarChart2 size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Analytics & Results</span>}
                            </Link>
                            <Link to="/admin/reports" className={`sidebar-nav-item ${isActive('/admin/reports') ? 'active' : ''}`} title="Reports">
                                <TrendingUp size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Official Reports</span>}
                            </Link>

                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'System' : '•'}</div>
                            <Link to="/admin/audit-logs" className={`sidebar-nav-item ${isActive('/admin/audit-logs') ? 'active' : ''}`} title="Audit Logs">
                                <History size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Security & Audit</span>}
                            </Link>
                            <Link to="/settings" className={`sidebar-nav-item ${isActive('/settings') ? 'active' : ''}`} title="Settings">
                                <Settings size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">System Settings</span>}
                            </Link>
                        </>
                    )}

                    {isStudent && (
                        <>
                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'Academics' : '•'}</div>
                            <Link to="/exam-hub" className={`sidebar-nav-item ${isActive('/exam-hub') ? 'active' : ''}`} title="Exam Hub">
                                <ClipboardList size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Assessments & Exams</span>}
                            </Link>
                            <Link to="/history" className={`sidebar-nav-item ${isActive('/history') ? 'active' : ''}`} title="Results">
                                <CheckCircle size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">My Exam Results</span>}
                            </Link>

                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'Attendance & Leave' : '•'}</div>
                            {!isWindows && (
                                <Link to="/my-attendance" className={`sidebar-nav-item ${isActive('/my-attendance') ? 'active' : ''}`} title="Attendance">
                                    <Calendar size={19} className="nav-item-icon" />
                                    {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Daily Attendance</span>}
                                </Link>
                            )}
                            <Link to="/leave" className={`sidebar-nav-item ${isActive('/leave') ? 'active' : ''}`} title="Leave">
                                <CalendarCheck size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Leave Applications</span>}
                            </Link>

                            <div className="nav-group-label">{(!isCollapsed || isMobileMenuOpen) ? 'Account' : '•'}</div>
                            <Link to="/settings" className={`sidebar-nav-item ${isActive('/settings') ? 'active' : ''}`} title="Profile">
                                <UserIcon size={19} className="nav-item-icon" />
                                {(!isCollapsed || isMobileMenuOpen) && <span className="nav-item-text">Profile & Security</span>}
                            </Link>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user-compact">
                        <img src={user?.avatar || logo} alt={user?.name} className="sidebar-avatar" />
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <div className="sidebar-user-meta">
                                <span className="meta-name">{user?.name}</span>
                                <span className="meta-role">{user?.role}</span>
                            </div>
                        )}
                        <button 
                            onClick={handleLogout}
                            className="sidebar-logout-icon"
                            title="Sign out of portal"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Application Container */}
            <div className="app-main-viewport">
                {/* Header Navbar */}
                <header className="app-topbar">
                    <div className="topbar-left">
                        <button 
                            className="mobile-menu-trigger" 
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Open navigation drawer"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="page-breadcrumb-block">
                            <h1 className="topbar-heading">{pageMeta.title}</h1>
                            <p className="topbar-subheading hide-on-mobile">{pageMeta.subtitle}</p>
                        </div>
                    </div>

                    <div className="topbar-right">
                        <div className="cloud-status-pill hide-on-mobile">
                            <span className="live-dot" />
                            <Wifi size={13} />
                            <span>Cloud Live</span>
                        </div>

                        {/* User Profile Menu */}
                        <div className="user-profile-menu-container" ref={menuRef}>
                            <button 
                                className="profile-pill-button"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                aria-label="Toggle user options"
                            >
                                <img src={user?.avatar || logo} alt={user?.name} className="profile-pill-avatar" />
                                <div className="profile-pill-text hide-on-mobile">
                                    <span className="profile-pill-name">{user?.name}</span>
                                    <span className="profile-pill-role">{user?.role}</span>
                                </div>
                            </button>

                            {showUserMenu && (
                                <div className="profile-dropdown-card animate-fade-in">
                                    <div className="dropdown-user-header">
                                        <p className="dropdown-name">{user?.name}</p>
                                        <p className="dropdown-email">{user?.details?.email || `${user?.id}@spokoacademy.edu`}</p>
                                        <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-success'}`}>
                                            {user?.role}
                                        </span>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <Link to="/settings" className="dropdown-link-item" onClick={() => setShowUserMenu(false)}>
                                        <Settings size={16} />
                                        <span>Account Settings</span>
                                    </Link>
                                    <div className="dropdown-divider" />
                                    <button onClick={handleLogout} className="dropdown-logout-item">
                                        <LogOut size={16} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Primary Page Canvas */}
                <main className="app-canvas-container">
                    {children}
                </main>

                {/* Mobile Bottom Navigation Bar */}
                <nav className="mobile-bottom-bar hide-on-desktop">
                    <Link to="/" className={`bottom-bar-link ${isActive('/') ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Home</span>
                    </Link>
                    {isAdmin ? (
                        <>
                            <Link to="/admin/users" className={`bottom-bar-link ${isActive('/admin/users') ? 'active' : ''}`}>
                                <Users size={20} />
                                <span>Students</span>
                            </Link>
                            <Link to="/admin/attendance" className={`bottom-bar-link ${isActive('/admin/attendance') ? 'active' : ''}`}>
                                <Calendar size={20} />
                                <span>Attendance</span>
                            </Link>
                            <Link to="/admin/create-exam" className={`bottom-bar-link ${isActive('/admin/create-exam') ? 'active' : ''}`}>
                                <PlusCircle size={20} />
                                <span>Exams</span>
                            </Link>
                            <button 
                                className="bottom-bar-link"
                                onClick={() => setIsMobileMenuOpen(true)}
                                type="button"
                            >
                                <Menu size={20} />
                                <span>Menu</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/exam-hub" className={`bottom-bar-link ${isActive('/exam-hub') ? 'active' : ''}`}>
                                <ClipboardList size={20} />
                                <span>Exams</span>
                            </Link>
                            {!isWindows ? (
                                <Link to="/my-attendance" className={`bottom-bar-link ${isActive('/my-attendance') ? 'active' : ''}`}>
                                    <Calendar size={20} />
                                    <span>Attendance</span>
                                </Link>
                            ) : (
                                <Link to="/history" className={`bottom-bar-link ${isActive('/history') ? 'active' : ''}`}>
                                    <CheckCircle size={20} />
                                    <span>Results</span>
                                </Link>
                            )}
                            <Link to="/leave" className={`bottom-bar-link ${isActive('/leave') ? 'active' : ''}`}>
                                <CalendarCheck size={20} />
                                <span>Leave</span>
                            </Link>
                            <Link to="/settings" className={`bottom-bar-link ${isActive('/settings') ? 'active' : ''}`}>
                                <UserIcon size={20} />
                                <span>Profile</span>
                            </Link>
                        </>
                    )}
                </nav>
            </div>

            {/* Layout Specific Styles */}
            <style>{`
                .layout-root {
                    display: flex;
                    min-height: 100vh;
                    background-color: var(--bg-app);
                    color: var(--text-body);
                }

                /* Sidebar */
                .app-sidebar {
                    width: var(--sidebar-width);
                    background-color: #ffffff;
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    z-index: 100;
                    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                }

                .app-sidebar.collapsed {
                    width: var(--sidebar-collapsed-width);
                }

                .sidebar-brand-wrapper {
                    height: var(--header-height);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 1.25rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .brand-identity {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    overflow: hidden;
                }

                .brand-logo {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-sm);
                    object-fit: cover;
                    flex-shrink: 0;
                }

                .brand-text-block {
                    display: flex;
                    flex-direction: column;
                    white-space: nowrap;
                }

                .brand-title {
                    font-size: 1rem;
                    font-weight: 800;
                    color: var(--text-main);
                    line-height: 1.2;
                    letter-spacing: -0.02em;
                }

                .brand-badge {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--color-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .sidebar-collapse-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--slate-400);
                    background-color: var(--slate-100);
                    transition: all 0.15s ease;
                }

                .sidebar-collapse-btn:hover {
                    background-color: var(--slate-200);
                    color: var(--slate-700);
                }

                .sidebar-close-btn {
                    padding: 0.25rem;
                    color: var(--slate-500);
                }

                /* Sidebar Navigation List */
                .sidebar-menu-scrollable {
                    flex: 1;
                    padding: 1rem 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .nav-group-label {
                    font-size: 0.68rem;
                    font-weight: 750;
                    color: var(--slate-400);
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    padding: 0.75rem 0.65rem 0.35rem;
                }

                .sidebar-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    padding: 0.6rem 0.85rem;
                    border-radius: var(--radius-md);
                    color: var(--slate-600);
                    font-weight: 600;
                    font-size: 0.88rem;
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }

                .sidebar-nav-item:hover {
                    background-color: var(--slate-100);
                    color: var(--slate-900);
                }

                .sidebar-nav-item.active {
                    background-color: var(--color-primary-subtle);
                    color: var(--color-primary);
                    font-weight: 700;
                }

                .sidebar-nav-item.active .nav-item-icon {
                    color: var(--color-primary);
                }

                .nav-item-icon {
                    flex-shrink: 0;
                    color: var(--slate-400);
                }

                .nav-item-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Sidebar Footer */
                .sidebar-footer {
                    padding: 0.85rem 1rem;
                    border-top: 1px solid var(--border-color);
                    background-color: var(--slate-50);
                }

                .sidebar-user-compact {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                }

                .sidebar-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-full);
                    object-fit: cover;
                    flex-shrink: 0;
                    border: 1px solid var(--border-color);
                }

                .sidebar-user-meta {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    white-space: nowrap;
                }

                .meta-name {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--text-main);
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .meta-role {
                    font-size: 0.68rem;
                    color: var(--slate-500);
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .sidebar-logout-icon {
                    padding: 0.4rem;
                    border-radius: var(--radius-sm);
                    color: var(--slate-400);
                    transition: all 0.15s ease;
                }

                .sidebar-logout-icon:hover {
                    background-color: var(--danger-bg);
                    color: var(--danger-solid);
                }

                /* Viewport & Header */
                .app-main-viewport {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    min-height: 100vh;
                }

                .app-topbar {
                    min-height: var(--header-height);
                    height: auto;
                    background-color: #ffffff;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: env(safe-area-inset-top, 0px) 2rem 0;
                    position: sticky;
                    top: 0;
                    z-index: 90;
                }

                .topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .mobile-menu-trigger {
                    display: none;
                    width: 38px;
                    height: 38px;
                    border-radius: var(--radius-md);
                    background-color: var(--slate-100);
                    color: var(--slate-700);
                    align-items: center;
                    justify-content: center;
                }

                .page-breadcrumb-block {
                    display: flex;
                    flex-direction: column;
                }

                .topbar-heading {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--text-main);
                    line-height: 1.2;
                }

                .topbar-subheading {
                    font-size: 0.78rem;
                    color: var(--slate-500);
                    margin: 0;
                }

                .topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }

                .cloud-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.35rem 0.75rem;
                    background-color: var(--success-bg);
                    border: 1px solid var(--success-border);
                    border-radius: var(--radius-full);
                    color: var(--success-text);
                    font-size: 0.75rem;
                    font-weight: 700;
                }

                .live-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background-color: var(--success-solid);
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
                }

                /* Profile Pill Button */
                .user-profile-menu-container {
                    position: relative;
                }

                .profile-pill-button {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.35rem 0.85rem 0.35rem 0.45rem;
                    background-color: var(--slate-50);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-full);
                    transition: all 0.15s ease;
                }

                .profile-pill-button:hover {
                    background-color: var(--slate-100);
                    border-color: var(--slate-300);
                }

                .profile-pill-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-full);
                    object-fit: cover;
                }

                .profile-pill-text {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                }

                .profile-pill-name {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.2;
                }

                .profile-pill-role {
                    font-size: 0.68rem;
                    font-weight: 600;
                    color: var(--slate-500);
                    text-transform: uppercase;
                }

                /* Dropdown Menu */
                .profile-dropdown-card {
                    position: absolute;
                    right: 0;
                    top: calc(100% + 8px);
                    width: 230px;
                    background-color: #ffffff;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    padding: 0.75rem;
                    z-index: 1000;
                }

                .dropdown-user-header {
                    padding: 0.5rem 0.5rem 0.75rem;
                }

                .dropdown-name {
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: var(--text-main);
                    margin-bottom: 0.15rem;
                }

                .dropdown-email {
                    font-size: 0.75rem;
                    color: var(--slate-500);
                    margin-bottom: 0.5rem;
                    word-break: break-all;
                }

                .dropdown-divider {
                    height: 1px;
                    background-color: var(--border-color-light);
                    margin: 0.35rem 0;
                }

                .dropdown-link-item, .dropdown-logout-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.6rem 0.75rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--slate-700);
                    transition: all 0.15s ease;
                }

                .dropdown-link-item:hover {
                    background-color: var(--slate-100);
                    color: var(--text-main);
                }

                .dropdown-logout-item {
                    color: var(--danger-solid);
                }

                .dropdown-logout-item:hover {
                    background-color: var(--danger-bg);
                }

                /* Canvas Area */
                .app-canvas-container {
                    flex: 1;
                    padding: 2rem 2.5rem 4rem;
                    max-width: 1440px;
                    width: 100%;
                    margin: 0 auto;
                }

                /* Mobile Bottom Bar */
                .mobile-bottom-bar {
                    display: none;
                }

                .mobile-backdrop {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(2px);
                    z-index: 999;
                }

                /* Responsive Breakpoints */
                @media (max-width: 1024px) {
                    .app-canvas-container {
                        padding: 1.5rem 1.5rem 4rem;
                    }
                }

                @media (max-width: 768px) {
                    .mobile-menu-trigger {
                        display: flex;
                    }

                    .hide-on-mobile {
                        display: none !important;
                    }

                    .app-topbar {
                        padding-top: max(8px, env(safe-area-inset-top, 0px));
                        padding-bottom: 8px;
                        padding-left: max(1rem, env(safe-area-inset-left, 0px));
                        padding-right: max(1rem, env(safe-area-inset-right, 0px));
                        min-height: calc(var(--header-height) + env(safe-area-inset-top, 0px));
                    }

                    .app-sidebar {
                        position: fixed;
                        left: -280px;
                        width: 280px;
                        z-index: 1000;
                        transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .app-sidebar.mobile-active {
                        left: 0;
                    }

                    .app-canvas-container {
                        padding: 1.25rem 1rem calc(80px + env(safe-area-inset-bottom, 0px));
                        max-width: 100vw;
                        overflow-x: hidden;
                    }

                    .mobile-bottom-bar {
                        display: flex;
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: calc(64px + env(safe-area-inset-bottom, 0px));
                        padding-bottom: env(safe-area-inset-bottom, 0px);
                        background-color: #ffffff;
                        border-top: 1px solid var(--border-color);
                        justify-content: space-around;
                        align-items: center;
                        z-index: 900;
                        box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.04);
                    }

                    .bottom-bar-link {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                        color: var(--slate-500);
                        font-size: 0.7rem;
                        font-weight: 600;
                        flex: 1;
                        height: 100%;
                    }

                    .bottom-bar-link.active {
                        color: var(--color-primary);
                        font-weight: 700;
                    }
                }
            `}</style>
        </div>
    );
};

export default Layout;
