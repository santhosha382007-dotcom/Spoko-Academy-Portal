import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';

// Core Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './pages/student/ProfileSettings';
import Schedule from './pages/Schedule';

// Admin Pages
import UsersList from './pages/admin/UsersList';
import Departments from './pages/admin/Departments';
import DepartmentDetails from './pages/admin/DepartmentDetails';
import Attendance from './pages/admin/Attendance';
import LeaveManagement from './pages/admin/LeaveManagement';
import CreateExam from './pages/admin/CreateExam';
import QuestionBank from './pages/admin/QuestionBank';
import PDFImport from './pages/admin/PDFImport';
import ResultsAnalysis from './pages/admin/ResultsAnalysis';
import ReportsOverview from './pages/admin/ReportsOverview';
import StudentReport from './pages/admin/StudentReport';
import AuditLogs from './pages/admin/AuditLogs';
import Activity from './pages/admin/Activity';

// Student Pages
import StudentAttendance from './pages/student/StudentAttendance';
import StudentLeave from './pages/student/StudentLeave';
import ExamHub from './pages/student/ExamHub';
import ExamTaker from './pages/student/ExamTaker';
import StudentResults from './pages/student/StudentResults';
import AIAssistant from './pages/student/AIAssistant';

// Staff Pages
import DepartmentStudents from './pages/staff/DepartmentStudents';

// Protected Route Component (supports admin, student, and staff/faculty roles)
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const rawRole = String(user.role || '').toLowerCase().trim();
    const effectiveRole = rawRole === 'faculty' ? 'staff' : (rawRole || 'student');
    const normalizedAllowed = allowedRoles?.map(r => String(r).toLowerCase().trim()) || [];

    if (allowedRoles && !normalizedAllowed.includes(effectiveRole)) {
        return (
            <Layout>
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ maxWidth: '480px', margin: '0 auto', background: 'white', padding: '2.5rem 2rem', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Access Restricted</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Your account ({user.name || user.id} • {effectiveRole.toUpperCase()}) does not have permission to view this section.
                        </p>
                        <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            Return to Dashboard
                        </a>
                    </div>
                </div>
            </Layout>
        );
    }

    return <Layout>{children}</Layout>;
};

function App() {
    const { user } = useAuth();

    return (
        <div className="app-container">
            <Routes>
                {/* 
                  The root route (/) is our "Front Page".
                  If logged in, user sees Dashboard.
                  If not, LandingPage with Sign In is shown.
                */}
                <Route path="/" element={
                    user ? (
                        <ProtectedRoute allowedRoles={['admin', 'student', 'staff']}>
                            <Dashboard />
                        </ProtectedRoute>
                    ) : (
                        <LandingPage />
                    )
                } />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Register />
                    </ProtectedRoute>
                } />

                {/* ------------------------------------------------------------- */}
                {/* ADMIN ROUTES (Strictly ADMIN only, per Section 1 & 14)        */}
                {/* ------------------------------------------------------------- */}
                <Route path="/admin/users" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <UsersList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/create-student" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <UsersList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/departments" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Departments />
                    </ProtectedRoute>
                } />
                <Route path="/admin/department/:deptName" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <DepartmentDetails />
                    </ProtectedRoute>
                } />
                <Route path="/admin/attendance" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Attendance />
                    </ProtectedRoute>
                } />
                <Route path="/admin/leave" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <LeaveManagement />
                    </ProtectedRoute>
                } />
                <Route path="/admin/create-exam" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <CreateExam />
                    </ProtectedRoute>
                } />
                <Route path="/admin/questions" element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <QuestionBank />
                    </ProtectedRoute>
                } />
                <Route path="/admin/pdf-import" element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <PDFImport />
                    </ProtectedRoute>
                } />
                <Route path="/admin/results" element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <ResultsAnalysis />
                    </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <ReportsOverview />
                    </ProtectedRoute>
                } />
                <Route path="/admin/reports/:userId" element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <StudentReport />
                    </ProtectedRoute>
                } />
                <Route path="/admin/audit-logs" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AuditLogs />
                    </ProtectedRoute>
                } />
                <Route path="/admin/activity" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AuditLogs />
                    </ProtectedRoute>
                } />

                {/* ------------------------------------------------------------- */}
                {/* STUDENT ROUTES                                                */}
                {/* ------------------------------------------------------------- */}
                <Route path="/my-attendance" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <StudentAttendance />
                    </ProtectedRoute>
                } />
                <Route path="/leave" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <StudentLeave />
                    </ProtectedRoute>
                } />
                <Route path="/exam-hub" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <ExamHub />
                    </ProtectedRoute>
                } />
                <Route path="/exam/:examId" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <ExamTaker />
                    </ProtectedRoute>
                } />
                <Route path="/history" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <StudentResults />
                    </ProtectedRoute>
                } />
                <Route path="/ai-assistant" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <AIAssistant />
                    </ProtectedRoute>
                } />

                {/* ------------------------------------------------------------- */}
                {/* STAFF ROUTES (Department Faculty with isolated department)    */}
                {/* ------------------------------------------------------------- */}
                <Route path="/staff/students" element={
                    <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <DepartmentStudents />
                    </ProtectedRoute>
                } />
                <Route path="/staff/import-questions" element={
                    <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <PDFImport />
                    </ProtectedRoute>
                } />
                <Route path="/staff/questions" element={
                    <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <QuestionBank />
                    </ProtectedRoute>
                } />
                <Route path="/staff/results" element={
                    <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <ResultsAnalysis />
                    </ProtectedRoute>
                } />

                {/* Shared authenticated routes */}
                <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={['student', 'admin', 'staff']}>
                        <ProfileSettings />
                    </ProtectedRoute>
                } />
                <Route path="/schedule" element={
                    <ProtectedRoute allowedRoles={['student', 'admin', 'staff']}>
                        <Schedule />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

const AppWrapper = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default AppWrapper;
