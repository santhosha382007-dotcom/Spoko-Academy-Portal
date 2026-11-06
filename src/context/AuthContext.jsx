import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { verifyPassword, hashPassword, validatePasswordPolicy, generateTemporaryPassword } from '../utils/security';
import { isWindowsPlatform } from '../utils/platform';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // 1. Instant Load from LocalStorage
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('spoko_user');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    });

    const [loading, setLoading] = useState(false);

    // Background check to seed placeholder admin if empty, and validate existing session
    useEffect(() => {
        const checkAndValidate = async () => {
            try {
                const users = await api.getUsers();
                if (users.length === 0) {
                    const placeholderAdmin = {
                        id: 'admin',
                        name: 'Administrator',
                        phone: 'admin',
                        password: hashPassword('admin'),
                        role: 'admin',
                        status: 'active',
                        avatar: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff',
                        details: {}
                    };
                    await api.createUser(placeholderAdmin);
                } else if (user) {
                    // Invalidate stale local storage sessions if user was removed
                    const exists = users.find(u => String(u.id) === String(user.id) || String(u.phone) === String(user.phone));
                    if (!exists) {
                        logout();
                    } else if (exists.status !== user.status || exists.firstLoginPasswordChange !== user.firstLoginPasswordChange) {
                        // Keep user state in sync with database updates
                        const updated = { ...user, status: exists.status, firstLoginPasswordChange: exists.firstLoginPasswordChange };
                        setUser(updated);
                        localStorage.setItem('spoko_user', JSON.stringify(updated));
                    }
                }
            } catch (e) {
                console.error("Auth check error", e);
            }
        };
        checkAndValidate();
    }, []);

    // Generate or retrieve persistent device fingerprint
    const getDeviceId = () => {
        let devId = localStorage.getItem('spoko_device_id');
        if (!devId) {
            devId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
            localStorage.setItem('spoko_device_id', devId);
        }
        return devId;
    };

    /**
     * Authenticates ADMIN or STUDENT using Mobile number or Student ID / Identifier.
     * Enforces secure bcrypt verification and first-login password-change detection.
     */
    const login = async (identifier, password) => {
        try {
            console.log(`[AUTH] Initiating security validation for: "${identifier}"`);
            let users;
            try {
                users = await api.getUsers();
            } catch (connErr) {
                console.error("[AUTH] Database Connection Failure:", connErr);
                alert(`Cloud Connection Issue!\n\nUnable to reach the Spoko Academy Cloud API:\n${connErr?.url || 'https://spoko-academy-portal.onrender.com'}\n\nPlease check your internet connection or wait a few moments if the server is waking up.`);
                throw connErr;
            }

            if (!users || users.length === 0) {
                alert("Database is empty. Please contact the administrator.");
                throw "EmptyDB";
            }

            // 1. Identify User by Student ID, Phone / Mobile Number, Email, or Full Name
            const inputClean = String(identifier).trim().toLowerCase();
            const candidate = users.find(u => {
                const uId = String(u.id || '').trim().toLowerCase();
                const uPhone = String(u.phone || '').trim().toLowerCase();
                const uEmail = String(u.details?.email || u.email || '').trim().toLowerCase();
                const uName = String(u.name || '').trim().toLowerCase();
                return uId === inputClean || uPhone === inputClean || uEmail === inputClean || uName === inputClean;
            });

            if (!candidate) {
                await api.createSecurityLog({
                    userId: identifier,
                    eventType: 'LOGIN_FAILURE',
                    status: 'FAILED',
                    details: 'User account not found',
                    userAgent: navigator.userAgent
                });
                throw 'Invalid';
            }

            // 2. Validate Password securely via bcrypt hash comparison
            const inputPass = String(password).trim();
            const storedPass = String(candidate.password || '').trim();
            const isValid = verifyPassword(inputPass, storedPass);

            if (!isValid) {
                await api.createSecurityLog({
                    userId: candidate.id,
                    eventType: 'LOGIN_FAILURE',
                    status: 'FAILED',
                    details: 'Incorrect password entered',
                    userAgent: navigator.userAgent
                });
                throw 'Invalid';
            }

            // Optional: If stored password was plain text legacy, silently upgrade to bcrypt hash
            if (!storedPass.startsWith('$2a$') && !storedPass.startsWith('$2b$')) {
                const secureHash = hashPassword(inputPass);
                api.updateUser(candidate.id, { password: secureHash }).catch(() => {});
            }

            // 3. Validate Account Status
            const status = String(candidate.status || 'active').toLowerCase();
            if (status === 'blocked' || status === 'disabled' || status === 'suspended' || status === 'permanent_blocked' || status === 'left') {
                const reason = candidate.blockReason || 'Account is currently disabled. Please contact the portal administrator.';
                await api.createSecurityLog({
                    userId: candidate.id,
                    eventType: 'LOGIN_BLOCKED',
                    status: 'BLOCKED',
                    details: `Account access rejected due to status: ${status}. Reason: ${reason}`,
                    userAgent: navigator.userAgent
                });
                throw 'Blocked';
            }

            // 4. Device Validation & Tracking (Enforced for Mobile; Bypassed on Windows per policy)
            const currentDeviceId = getDeviceId();
            if (!isWindowsPlatform() && candidate.registeredDeviceId && candidate.registeredDeviceId !== currentDeviceId && candidate.role === 'student' && candidate.restrictToSingleDevice) {
                await api.createSecurityLog({
                    userId: candidate.id,
                    eventType: 'UNAUTHORIZED_DEVICE',
                    status: 'BLOCKED',
                    details: `Attempted login from unregistered device: ${currentDeviceId}`,
                    userAgent: navigator.userAgent
                });
                throw 'UnauthorizedDevice';
            }

            // 5. Create Secure Session in Backend
            const sessionToken = 'spoko_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            const sessionData = {
                id: 'sess_' + Date.now(),
                userId: candidate.id,
                userRole: candidate.role,
                userName: candidate.name,
                token: sessionToken,
                deviceId: currentDeviceId,
                userAgent: navigator.userAgent,
                ip: '127.0.0.1'
            };

            const createdSession = await api.createSession(sessionData).catch(() => null);
            if (createdSession?.id) {
                localStorage.setItem('spoko_session_id', createdSession.id);
            }

            // 6. Security Event Logging
            await api.createSecurityLog({
                userId: candidate.id,
                eventType: 'LOGIN_SUCCESS',
                status: 'ALLOWED',
                details: `User successfully authenticated as ${candidate.role.toUpperCase()}`,
                deviceId: currentDeviceId,
                userAgent: navigator.userAgent
            });

            // 7. Update Session State
            // Check if must change password on first login
            const mustChange = candidate.role === 'student' && (
                candidate.firstLoginPasswordChange === true || 
                candidate.details?.firstLoginPasswordChange === true
            );

            const sessionUser = {
                ...candidate,
                firstLoginPasswordChange: mustChange
            };

            setUser(sessionUser);
            localStorage.setItem('spoko_user', JSON.stringify(sessionUser));
            return sessionUser;
        } catch (e) {
            console.error("Login Error", e);
            throw e;
        }
    };

    /**
     * Mandatory First-Login Password Change for Students
     */
    const changeFirstLoginPassword = async (newPassword) => {
        if (!user) throw new Error("No authenticated session.");
        
        const policyCheck = validatePasswordPolicy(newPassword);
        if (!policyCheck.valid) {
            throw new Error(policyCheck.message);
        }

        const hashed = hashPassword(newPassword);
        const updatePayload = {
            password: hashed,
            firstLoginPasswordChange: false,
            passwordChangedAt: new Date().toISOString()
        };

        // Also update nested details if present
        if (user.details) {
            updatePayload.details = {
                ...user.details,
                firstLoginPasswordChange: false,
                passwordChangedAt: new Date().toISOString()
            };
        }

        await api.updateUser(user.id, updatePayload);

        // Audit Log
        await api.createAuditLog({
            eventType: 'FIRST_LOGIN_PASSWORD_CHANGE',
            userId: user.id,
            userName: user.name,
            role: user.role,
            details: `Student completed mandatory initial password change on first login.`
        });

        await api.createSecurityLog({
            userId: user.id,
            eventType: 'PASSWORD_CHANGED',
            status: 'SUCCESS',
            details: 'First-login password change completed successfully',
            userAgent: navigator.userAgent
        });

        // Update local session
        const updatedUser = {
            ...user,
            password: hashed,
            firstLoginPasswordChange: false
        };
        setUser(updatedUser);
        localStorage.setItem('spoko_user', JSON.stringify(updatedUser));
        return true;
    };

    /**
     * ADMIN Password Reset for a Student
     * Generates or assigns a temporary password, hashes it, and re-enforces first-login password change.
     */
    const adminResetPassword = async (studentId, customTempPassword = null) => {
        const tempPassword = customTempPassword || generateTemporaryPassword();
        const policyCheck = validatePasswordPolicy(tempPassword);
        if (!policyCheck.valid) {
            throw new Error(policyCheck.message);
        }

        const hashed = hashPassword(tempPassword);
        const updatePayload = {
            password: hashed,
            firstLoginPasswordChange: true,
            passwordResetAt: new Date().toISOString()
        };

        const targetUser = await api.getUserById(studentId);
        if (targetUser?.details) {
            updatePayload.details = {
                ...targetUser.details,
                firstLoginPasswordChange: true,
                passwordResetAt: new Date().toISOString()
            };
        }

        await api.updateUser(studentId, updatePayload);

        // Audit Log
        await api.createAuditLog({
            eventType: 'ADMIN_PASSWORD_RESET',
            performedBy: user?.name || 'Administrator',
            userId: studentId,
            studentName: targetUser?.name || studentId,
            details: `Admin reset password and re-enabled first-login password-change requirement.`
        });

        await api.createSecurityLog({
            userId: studentId,
            eventType: 'ADMIN_PASSWORD_RESET',
            status: 'SUCCESS',
            details: `Password reset by Admin (${user?.name || 'admin'}). First login change required.`,
            userAgent: navigator.userAgent
        });

        return tempPassword;
    };

    const register = async (details) => {
        const usersDb = await api.getUsers();
        if (usersDb.find(u => u.phone === details.phone || u.id === details.studentId)) {
            alert('User already exists with this phone number or Student ID!');
            throw 'Exists';
        }

        const cleanPassword = details.password || generateTemporaryPassword();
        const hashedPassword = hashPassword(cleanPassword);

        const newUser = {
            id: details.studentId || Date.now().toString(),
            name: details.fullName,
            phone: details.phone,
            password: hashedPassword,
            role: 'student',
            status: 'active',
            firstLoginPasswordChange: true,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(details.fullName)}&background=random`,
            registeredDeviceId: getDeviceId(),
            details: {
                ...details,
                password: hashedPassword,
                firstLoginPasswordChange: true
            }
        };

        await api.createUser(newUser);
        
        await api.createAuditLog({
            eventType: 'STUDENT_CREATED',
            performedBy: user?.name || 'Administrator',
            userId: newUser.id,
            userName: newUser.name,
            details: `Student account created by Admin with mandatory first-login password change.`
        });

        return newUser;
    };

    const logout = async () => {
        try {
            const sessionId = localStorage.getItem('spoko_session_id');
            if (sessionId) {
                await api.deleteSession(sessionId).catch(() => {});
                localStorage.removeItem('spoko_session_id');
            }
            if (user?.id) {
                await api.createSecurityLog({
                    userId: user.id,
                    eventType: 'LOGOUT',
                    status: 'SUCCESS',
                    details: 'User logged out securely',
                    userAgent: navigator.userAgent
                });
            }
        } catch (err) {
            console.warn("Logout error:", err);
        } finally {
            setUser(null);
            localStorage.removeItem('spoko_user');
            localStorage.removeItem('spoko_session_id');
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        getDeviceId,
        changeFirstLoginPassword,
        adminResetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
