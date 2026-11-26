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
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (parsed && parsed.role) {
                const r = String(parsed.role).toLowerCase().trim();
                parsed.role = (r === 'faculty') ? 'staff' : r;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    });

    const [loading, setLoading] = useState(false);

    // Validate active session against backend via signed token
    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem('spoko_token');
            if (token) {
                try {
                    const res = await api.getMe();
                    if (res && res.user) {
                        setUser(res.user);
                        localStorage.setItem('spoko_user', JSON.stringify(res.user));
                    } else {
                        logout();
                    }
                } catch (e) {
                    // Invalidate if 401 Unauthorized or expired
                    logout();
                }
            } else if (user) {
                logout();
            }
        };
        validateSession();
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
     * Authenticates ADMIN, STAFF or STUDENT using Mobile number or Student ID / Identifier.
     * Enforces secure server-side verification and short-lived signed tokens.
     */
    const login = async (identifier, password) => {
        try {
            console.log(`[AUTH] Initiating security validation for: "${identifier}"`);
            const res = await api.login(identifier, password);
            if (!res || !res.token || !res.user) {
                throw new Error("Authentication failed");
            }

            const token = res.token;
            const authenticatedUser = res.user;

            localStorage.setItem('spoko_token', token);
            localStorage.setItem('spoko_user', JSON.stringify(authenticatedUser));
            setUser(authenticatedUser);

            return authenticatedUser;
        } catch (e) {
            console.error("Login Error", e);
            const msg = String(e.message || e).toLowerCase();
            if (msg.includes('restricted') || msg.includes('disabled') || msg.includes('blocked')) {
                throw 'Blocked';
            } else if (msg.includes('invalid') || msg.includes('not found') || msg.includes('incorrect') || msg.includes('password')) {
                throw 'Invalid';
            } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('abort') || msg.includes('timeout')) {
                throw 'NetworkError';
            }
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

        await api.changePassword(newPassword);

        // Update local session
        const updatedUser = {
            ...user,
            firstLoginPasswordChange: false
        };
        setUser(updatedUser);
        localStorage.setItem('spoko_user', JSON.stringify(updatedUser));
        return true;
    };

    /**
     * ADMIN Password Reset for a Student
     * Generates or assigns a temporary password, hashes it on server, and re-enforces first-login password change.
     */
    const adminResetPassword = async (studentId, customTempPassword = null) => {
        const tempPassword = customTempPassword || generateTemporaryPassword();
        const policyCheck = validatePasswordPolicy(tempPassword);
        if (!policyCheck.valid) {
            throw new Error(policyCheck.message);
        }

        await api.adminResetPassword(studentId, tempPassword, true);
        return tempPassword;
    };

    const register = async (details) => {
        const usersDb = await api.getUsers();
        const cleanId = String(details.studentId || '').toLowerCase().trim();
        const cleanPhone = String(details.phone || '').trim();
        const targetDept = String(details.department || 'General').toLowerCase().trim();

        const existingWithId = usersDb.filter(u => 
            u.role === 'student' && (
                String(u.id).toLowerCase().trim() === cleanId ||
                String(u.details?.studentId || u.studentId || '').toLowerCase().trim() === cleanId ||
                String(u.id).toLowerCase().trim().split('_')[0] === cleanId
            )
        );

        if (existingWithId.length >= 2) {
            alert('This Student ID is already enrolled in 2 departments (maximum 2 departments allowed).');
            throw 'Exists';
        }

        const sameDeptMatch = existingWithId.find(u => 
            String(u.department || u.details?.department || '').toLowerCase().trim() === targetDept
        );
        if (sameDeptMatch) {
            alert(`A student is already registered with Student ID "${details.studentId}" in the ${details.department} department.`);
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

    const updateUserProfile = async (profileData) => {
        if (!user?.id) throw new Error("No active session");
        const updatePayload = {
            name: profileData.name || user.name,
            phone: profileData.phone || user.phone,
            avatar: profileData.avatar || user.avatar,
            details: {
                ...(user.details || {}),
                email: profileData.email || user.details?.email || user.email,
                avatar: profileData.avatar || user.details?.avatar || user.avatar
            }
        };
        if (profileData.email) {
            updatePayload.email = profileData.email;
        }

        await api.updateUser(user.id, updatePayload);

        const updatedUser = {
            ...user,
            ...updatePayload,
            details: {
                ...(user.details || {}),
                ...updatePayload.details
            }
        };

        setUser(updatedUser);
        localStorage.setItem('spoko_user', JSON.stringify(updatedUser));
        return updatedUser;
    };

    const changePassword = async (newPassword) => {
        if (!user?.id) throw new Error("No active session");
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

        if (user.details) {
            updatePayload.details = {
                ...user.details,
                firstLoginPasswordChange: false,
                passwordChangedAt: new Date().toISOString()
            };
        }

        await api.updateUser(user.id, updatePayload);

        try {
            await api.createSecurityLog({
                userId: user.id,
                eventType: 'PASSWORD_CHANGED',
                status: 'SUCCESS',
                details: 'User updated account password from Profile Settings',
                userAgent: navigator.userAgent
            });
        } catch (_) {}

        const updatedUser = {
            ...user,
            password: hashed,
            firstLoginPasswordChange: false
        };
        setUser(updatedUser);
        localStorage.setItem('spoko_user', JSON.stringify(updatedUser));
        return true;
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
        adminResetPassword,
        updateUserProfile,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
