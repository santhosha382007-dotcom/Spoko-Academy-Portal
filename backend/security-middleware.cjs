const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwtUtils = require('./jwt-utils.cjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'db.json');

// Helpers to read and safely write db.json
const getDb = () => {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        console.error('[DATABASE READ ERROR]', err);
        return {};
    }
};

const saveDb = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[DATABASE WRITE ERROR]', err);
        return false;
    }
};

// Helper to reliably parse JSON request body
const getRequestBody = (req) => {
    if (req.body && typeof req.body === 'object') {
        return Promise.resolve(req.body);
    }
    if (req.complete || req.readableEnded) {
        return Promise.resolve(req.body || {});
    }
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : (req.body || {}));
            } catch (e) {
                resolve(req.body || {});
            }
        });
        req.on('error', () => resolve(req.body || {}));
    });
};

// Safe server-side password verification
const verifyPassword = (plainPassword, storedHash) => {
    if (!plainPassword || !storedHash) return false;
    const cleanPlain = String(plainPassword).trim();
    const cleanStored = String(storedHash).trim();

    if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$') || cleanStored.startsWith('$2y$')) {
        try {
            if (bcrypt.compareSync(cleanPlain, cleanStored)) return true;
            if (bcrypt.compareSync(cleanPlain.toLowerCase(), cleanStored)) return true;
            const lowerFirst = cleanPlain.charAt(0).toLowerCase() + cleanPlain.slice(1);
            if (bcrypt.compareSync(lowerFirst, cleanStored)) return true;
            const upperFirst = cleanPlain.charAt(0).toUpperCase() + cleanPlain.slice(1);
            if (bcrypt.compareSync(upperFirst, cleanStored)) return true;

            return false;
        } catch (err) {
            console.error('[SECURITY ERROR] Bcrypt compare failed:', err);
            return false;
        }
    }

    return cleanPlain.toLowerCase() === cleanStored.toLowerCase();
};

// Extract token from request headers (Authorization: Bearer <token> or X-Spoko-Auth)
const extractToken = (req) => {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    return req.header('X-Spoko-Auth') || null;
};

module.exports = async (req, res, next) => {
    // 1. Allow preflight CORS
    if (req.method === 'OPTIONS') {
        return next();
    }

    // 2. Allow Render health checks and root status without auth token
    if (req.url === '/' || req.url === '/health' || req.path === '/' || req.path === '/health') {
        return next();
    }

    // -------------------------------------------------------------
    // 3. AUTHENTICATION ENDPOINT: POST /api/auth/login
    // Validates credentials completely on the server. Never exposes passwords.
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/auth/login') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { identifier, password } = body;

            if (!identifier || !password) {
                return res.status(400).jsonp({
                    success: false,
                    error: "Missing Credentials",
                    message: "User ID/Mobile and password are required."
                });
            }

            const db = getDb();
            const users = db.users || [];
            const cleanIdent = String(identifier).trim().toLowerCase();

            // Locate matching user
            const matchedUser = users.find(u => {
                const uId = String(u.id || '').trim().toLowerCase();
                const uPhone = String(u.phone || '').trim().toLowerCase();
                const uStudentId = String(u.details?.studentId || u.studentId || '').trim().toLowerCase();
                const uEmail = String(u.email || u.details?.email || '').trim().toLowerCase();
                const uBaseId = uId.split('_')[0];

                return uId === cleanIdent ||
                    uPhone === cleanIdent ||
                    uStudentId === cleanIdent ||
                    uBaseId === cleanIdent ||
                    uEmail === cleanIdent;
            });

            if (!matchedUser) {
                console.warn(`[AUTH] Failed login attempt: user not found (${cleanIdent})`);
                return res.status(401).jsonp({
                    success: false,
                    error: "Invalid Credentials",
                    message: "Invalid User ID / Mobile or password."
                });
            }

            // Check account status
            if (matchedUser.status && matchedUser.status !== 'active') {
                console.warn(`[AUTH] Login blocked: inactive account (${matchedUser.id}, status: ${matchedUser.status})`);
                return res.status(403).jsonp({
                    success: false,
                    error: "Account Restricted",
                    message: `Account is ${matchedUser.status}. Please contact the administrator.`
                });
            }

            // Verify password on server
            const isMatch = verifyPassword(password, matchedUser.password);
            if (!isMatch) {
                console.warn(`[AUTH] Failed login attempt: password mismatch for ${matchedUser.id}`);
                return res.status(401).jsonp({
                    success: false,
                    error: "Invalid Credentials",
                    message: "Invalid User ID / Mobile or password."
                });
            }

            // Normalize role
            const rawRole = String(matchedUser.role || '').toLowerCase().trim();
            const normalizedRole = rawRole === 'faculty' ? 'staff' : (rawRole || 'student');

            // Sign secure short-lived token
            const tokenPayload = {
                id: matchedUser.id,
                name: matchedUser.name || 'User',
                role: normalizedRole,
                department: matchedUser.department || matchedUser.details?.department || 'General',
                departments: matchedUser.departments || []
            };

            const token = jwtUtils.signToken(tokenPayload);

            // Audit log
            db.audit_logs = db.audit_logs || [];
            db.audit_logs.push({
                id: Date.now(),
                eventType: 'USER_LOGIN_SUCCESS',
                userId: matchedUser.id,
                userName: matchedUser.name,
                role: normalizedRole,
                timestamp: new Date().toISOString()
            });
            saveDb(db);

            console.log(`[AUTH] Successful login for user: ${matchedUser.id} (${normalizedRole.toUpperCase()})`);

            return res.jsonp({
                success: true,
                token,
                user: jwtUtils.sanitizeUser(matchedUser)
            });
        } catch (err) {
            console.error('[AUTH LOGIN ERROR]', err);
            return res.status(500).jsonp({ success: false, error: "Internal authentication error: " + err.message });
        }
    }

    // -------------------------------------------------------------
    // 4. SESSION VERIFICATION ENDPOINT: GET /api/auth/me
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/auth/me') && req.method === 'GET') {
        const token = extractToken(req);
        const decoded = jwtUtils.verifyToken(token);

        if (!decoded) {
            return res.status(401).jsonp({ success: false, error: "Session Expired", message: "Please log in again." });
        }

        const db = getDb();
        const user = (db.users || []).find(u => String(u.id).toLowerCase() === String(decoded.id).toLowerCase());

        if (!user || (user.status && user.status !== 'active')) {
            return res.status(401).jsonp({ success: false, error: "Account Inactive", message: "User account no longer active." });
        }

        return res.jsonp({
            success: true,
            user: jwtUtils.sanitizeUser(user)
        });
    }

    // -------------------------------------------------------------
    // 5. PASSWORD CHANGE ENDPOINT: POST /api/auth/change-password
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/auth/change-password') && req.method === 'POST') {
        const token = extractToken(req);
        const decoded = jwtUtils.verifyToken(token);

        if (!decoded) {
            return res.status(401).jsonp({ success: false, error: "Unauthorized" });
        }

        try {
            const body = await getRequestBody(req);
            const { newPassword } = body;

            if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
                return res.status(400).jsonp({ success: false, message: "Password must be at least 6 characters long." });
            }

            const db = getDb();
            const user = (db.users || []).find(u => String(u.id).toLowerCase() === String(decoded.id).toLowerCase());

            if (!user) {
                return res.status(404).jsonp({ success: false, message: "User account not found." });
            }

            const hashed = bcrypt.hashSync(newPassword.trim(), 10);
            user.password = hashed;
            user.firstLoginPasswordChange = false;

            db.audit_logs = db.audit_logs || [];
            db.audit_logs.push({
                id: Date.now(),
                eventType: 'PASSWORD_CHANGED',
                userId: user.id,
                userName: user.name,
                timestamp: new Date().toISOString()
            });

            saveDb(db);
            return res.jsonp({ success: true, message: "Password updated successfully." });
        } catch (err) {
            console.error('[CHANGE PASSWORD ERROR]', err);
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 6. ADMIN PASSWORD RESET ENDPOINT: POST /api/auth/admin-reset-password
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/auth/admin-reset-password') && req.method === 'POST') {
        const token = extractToken(req);
        const decoded = jwtUtils.verifyToken(token);

        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).jsonp({ success: false, error: "Forbidden", message: "Admin privileges required." });
        }

        try {
            const body = await getRequestBody(req);
            const { targetUserId, newPassword, enforceFirstChange } = body;

            if (!targetUserId || !newPassword) {
                return res.status(400).jsonp({ success: false, message: "Target user and new password are required." });
            }

            const db = getDb();
            const targetUser = (db.users || []).find(u => String(u.id).toLowerCase() === String(targetUserId).toLowerCase());

            if (!targetUser) {
                return res.status(404).jsonp({ success: false, message: "Target user not found." });
            }

            targetUser.password = bcrypt.hashSync(String(newPassword).trim(), 10);
            targetUser.firstLoginPasswordChange = enforceFirstChange !== undefined ? !!enforceFirstChange : true;

            db.audit_logs = db.audit_logs || [];
            db.audit_logs.push({
                id: Date.now(),
                eventType: 'ADMIN_RESET_PASSWORD',
                performedBy: decoded.name,
                userId: targetUser.id,
                userName: targetUser.name,
                timestamp: new Date().toISOString()
            });

            saveDb(db);
            return res.jsonp({ success: true, message: "Password reset successfully." });
        } catch (err) {
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 7. PASSWORD RESET REQUEST: POST /api/auth/forgot-password
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/auth/forgot-password') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { phoneOrId } = body;
            const db = getDb();

            const targetUser = (db.users || []).find(u => 
                String(u.phone).trim() === String(phoneOrId).trim() ||
                String(u.id).toLowerCase() === String(phoneOrId).toLowerCase()
            );

            if (targetUser) {
                db.audit_logs = db.audit_logs || [];
                db.audit_logs.push({
                    id: Date.now(),
                    eventType: 'PASSWORD_RESET_REQUESTED',
                    userId: targetUser.id,
                    userName: targetUser.name,
                    details: `Student ${targetUser.name} requested password reset from Administrator.`,
                    timestamp: new Date().toISOString()
                });
                saveDb(db);
            }

            // Always respond uniformly to prevent account enumeration
            return res.jsonp({
                success: true,
                message: "If a matching account exists, a reset request has been logged for the academy administrator."
            });
        } catch (err) {
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 8. PROTECTED AI CHAT PROXY: POST /api/ai/chat
    // Prevents exposing OpenAI API keys to the browser client
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/ai/chat') && req.method === 'POST') {
        const token = extractToken(req);
        const decoded = jwtUtils.verifyToken(token);

        if (!decoded) {
            return res.status(401).jsonp({ success: false, error: "Unauthorized" });
        }

        try {
            const body = await getRequestBody(req);
            const { messages = [] } = body;
            const apiKey = process.env.OPENAI_API_KEY;

            if (!apiKey) {
                // Helpful offline study response if no API key is configured
                const lastMsg = messages[messages.length - 1]?.content || '';
                return res.jsonp({
                    success: true,
                    reply: `[Spoko AI Tutor] I received your study question: "${lastMsg.substring(0, 80)}". To activate live ChatGPT responses, configure OPENAI_API_KEY on the academy server.`
                });
            }

            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are an educational assistant for Spoko Academy students.' },
                        ...messages
                    ]
                })
            });

            if (!aiResponse.ok) {
                return res.status(aiResponse.status).jsonp({ success: false, error: "AI service error" });
            }

            const aiData = await aiResponse.json();
            const reply = aiData.choices?.[0]?.message?.content || 'No response generated.';
            return res.jsonp({ success: true, reply });
        } catch (err) {
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 9. GENERAL AUTHENTICATION VALIDATION FOR ALL OTHER ENDPOINTS
    // -------------------------------------------------------------
    const token = extractToken(req);
    const currentUser = jwtUtils.verifyToken(token);

    if (!currentUser) {
        console.warn(`[SECURITY] Blocked unauthenticated ${req.method} ${req.url} from ${req.ip}`);
        return res.status(401).jsonp({
            error: "Access Denied",
            message: "Authentication required. Please log in to access Spoko Academy Portal."
        });
    }

    req.user = currentUser;

    // -------------------------------------------------------------
    // 10. SERVER-SIDE ROLE-BASED ACCESS CONTROL (RBAC) FOR /users
    // -------------------------------------------------------------
    if (req.url === '/users' || req.url.startsWith('/users?') || req.url.startsWith('/users/')) {
        const db = getDb();
        const users = db.users || [];

        // GET /users - List Users
        if (req.method === 'GET') {
            const urlPath = req.url.split('?')[0];

            if (urlPath === '/users') {
                // Students are STRICTLY FORBIDDEN from listing all users
                if (currentUser.role === 'student') {
                    console.warn(`[RBAC] Blocked student ${currentUser.id} from browsing /users`);
                    return res.status(403).jsonp({
                        error: "Forbidden",
                        message: "Students are not permitted to browse the institutional user directory."
                    });
                }

                // Staff: Filter users exclusively to students in their department
                if (currentUser.role === 'staff') {
                    const staffDept = String(currentUser.department || '').toLowerCase().trim();
                    const deptStudents = users.filter(u => {
                        if (u.role !== 'student') return false;
                        const uDept = String(u.department || u.details?.department || '').toLowerCase().trim();
                        return uDept === staffDept || (Array.isArray(u.departments) && u.departments.map(d => d.toLowerCase()).includes(staffDept));
                    });
                    return res.jsonp(deptStudents.map(jwtUtils.sanitizeUser));
                }

                // Admin: Full roster (passwords stripped)
                if (currentUser.role === 'admin') {
                    return res.jsonp(users.map(jwtUtils.sanitizeUser));
                }
            }

            // GET /users/:id - Single User Lookup
            const idMatch = urlPath.match(/^\/users\/([^\/\?]+)/);
            if (idMatch) {
                const targetId = decodeURIComponent(idMatch[1]);
                const targetUser = users.find(u => String(u.id).toLowerCase() === targetId.toLowerCase());

                if (!targetUser) {
                    return res.status(404).jsonp({ error: "User not found" });
                }

                // Student can only read their own profile
                if (currentUser.role === 'student' && String(targetUser.id).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                    return res.status(403).jsonp({ error: "Access Denied", message: "You can only view your own user profile." });
                }

                return res.jsonp(jwtUtils.sanitizeUser(targetUser));
            }
        }

        // POST /users - Create User (Admin Only)
        if (req.method === 'POST') {
            if (currentUser.role !== 'admin') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Only administrators can create user accounts." });
            }

            try {
                const body = await getRequestBody(req);
                const cleanId = String(body.id || body.studentId || '').trim();
                const targetDept = String(body.department || body.details?.department || 'General').trim();

                // Dual department enrollment handling
                if (body.role === 'student' && cleanId) {
                    const existingMatches = users.filter(u => 
                        u.role === 'student' && (
                            String(u.id).toLowerCase().trim() === cleanId.toLowerCase() ||
                            String(u.details?.studentId || u.studentId || '').toLowerCase().trim() === cleanId.toLowerCase() ||
                            String(u.id).toLowerCase().trim().split('_')[0] === cleanId.toLowerCase()
                        )
                    );

                    if (existingMatches.length === 1) {
                        const firstDept = String(existingMatches[0].department || existingMatches[0].details?.department || '').trim();
                        if (firstDept.toLowerCase() !== targetDept.toLowerCase()) {
                            const deptSuffix = targetDept.toLowerCase().replace(/[^a-z0-9]/g, '');
                            body.id = `${cleanId}_${deptSuffix}`;
                            body.studentId = cleanId;
                            if (body.details) body.details.studentId = cleanId;
                        }
                    } else if (existingMatches.length === 0) {
                        body.studentId = cleanId;
                        if (body.details) body.details.studentId = cleanId;
                    }
                }

                // Hash password if plain text
                if (body.password && !body.password.startsWith('$2a$') && !body.password.startsWith('$2b$')) {
                    body.password = bcrypt.hashSync(String(body.password).trim(), 10);
                }

                req.body = body;
            } catch (e) {
                console.error('[USER POST ERROR]', e);
            }
        }

        // PATCH / PUT /users/:id - Update User
        if (req.method === 'PATCH' || req.method === 'PUT') {
            const urlPath = req.url.split('?')[0];
            const idMatch = urlPath.match(/^\/users\/([^\/\?]+)/);
            if (idMatch) {
                const targetId = decodeURIComponent(idMatch[1]);

                // Students can only update their own profile, and CANNOT alter role, status, id, or password
                if (currentUser.role === 'student') {
                    if (String(targetId).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                        return res.status(403).jsonp({ error: "Forbidden", message: "Cannot modify other student accounts." });
                    }
                    const body = await getRequestBody(req);
                    delete body.role;
                    delete body.status;
                    delete body.id;
                    delete body.password;
                    delete body.studentId;
                    req.body = body;
                } else if (currentUser.role === 'staff') {
                    const targetUser = users.find(u => String(u.id).toLowerCase() === targetId.toLowerCase());
                    if (!targetUser) {
                        return res.status(404).jsonp({ error: "User not found" });
                    }
                    // Staff cannot modify admin accounts
                    if (targetUser.role === 'admin') {
                        return res.status(403).jsonp({ error: "Forbidden", message: "Staff cannot modify administrator accounts." });
                    }
                    const staffDept = String(currentUser.department || '').toLowerCase().trim();
                    const targetDept = String(targetUser.department || targetUser.details?.department || '').toLowerCase().trim();
                    // Staff can only modify students in their department
                    if (targetUser.role !== 'staff' && targetDept !== staffDept) {
                        return res.status(403).jsonp({ error: "Forbidden", message: "Staff can only manage students in their assigned department." });
                    }
                    const body = await getRequestBody(req);
                    // Prevent privilege escalation to admin
                    if (body.role && body.role === 'admin') {
                        return res.status(403).jsonp({ error: "Forbidden", message: "Cannot escalate privileges to administrator." });
                    }
                    delete body.password;
                    req.body = body;
                } else if (currentUser.role !== 'admin') {
                    return res.status(403).jsonp({ error: "Forbidden" });
                }
            }
        }

        // DELETE /users/:id - Delete User (Admin Only)
        if (req.method === 'DELETE') {
            if (currentUser.role !== 'admin') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Only administrators can delete user accounts." });
            }
        }
    }

    // -------------------------------------------------------------
    // 11. SERVER-SIDE RBAC & IDOR PROTECTION FOR /results
    // -------------------------------------------------------------
    if (req.url === '/results' || req.url.startsWith('/results?') || req.url.startsWith('/results/')) {
        const db = getDb();
        if (req.method === 'GET') {
            if (currentUser.role === 'student') {
                const studentId = String(currentUser.id).toLowerCase();
                const myResults = (db.results || []).filter(r => 
                    String(r.userId).toLowerCase() === studentId ||
                    String(r.studentId).toLowerCase() === studentId
                );
                return res.jsonp(myResults);
            } else if (currentUser.role === 'staff') {
                const staffDept = String(currentUser.department || '').toLowerCase().trim();
                const deptResults = (db.results || []).filter(r => {
                    const rDept = String(r.department || r.studentDepartment || r.examDepartment || '').toLowerCase().trim();
                    return rDept === staffDept || rDept === 'general' || rDept === '';
                });
                return res.jsonp(deptResults);
            }
        } else if (req.method === 'POST') {
            // Students cannot fabricate results directly; results must be generated via /api/assessment/submit
            if (currentUser.role === 'student') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot manually create exam results." });
            }
        } else if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            if (currentUser.role === 'student') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot modify or delete exam results." });
            }
        }
    }

    // -------------------------------------------------------------
    // 12. SERVER-SIDE RBAC FOR /exams
    // -------------------------------------------------------------
    if (req.url === '/exams' || req.url.startsWith('/exams?') || req.url.startsWith('/exams/')) {
        if (currentUser.role === 'student') {
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot create, edit, or delete assessments." });
            }
        } else if (currentUser.role === 'staff') {
            if (req.method === 'DELETE') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Staff cannot delete assessments. Contact administrator." });
            }
        }
    }

    // -------------------------------------------------------------
    // 13. SERVER-SIDE RBAC & IDOR PROTECTION FOR /attendance
    // -------------------------------------------------------------
    if (req.url === '/attendance' || req.url.startsWith('/attendance?') || req.url.startsWith('/attendance/')) {
        if (currentUser.role === 'student') {
            if (req.method === 'GET') {
                const db = getDb();
                const studentId = String(currentUser.id).toLowerCase();
                const myAttendance = (db.attendance || []).filter(a => 
                    String(a.userId).toLowerCase() === studentId ||
                    String(a.studentId).toLowerCase() === studentId
                );
                return res.jsonp(myAttendance);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const targetId = String(body.userId || body.studentId || '').toLowerCase();
                if (targetId && targetId !== String(currentUser.id).toLowerCase()) {
                    return res.status(403).jsonp({ error: "Forbidden", message: "Cannot mark attendance on behalf of another student." });
                }
                body.userId = currentUser.id;
                body.studentId = currentUser.id;
                req.body = body;
            }
            if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot modify or delete attendance records." });
            }
        }
    }

    // -------------------------------------------------------------
    // 14. SERVER-SIDE RBAC & IDOR PROTECTION FOR /leaves
    // -------------------------------------------------------------
    if (req.url === '/leaves' || req.url.startsWith('/leaves?') || req.url.startsWith('/leaves/')) {
        if (currentUser.role === 'student') {
            if (req.method === 'GET') {
                const db = getDb();
                const studentId = String(currentUser.id).toLowerCase();
                const myLeaves = (db.leaves || []).filter(l => 
                    String(l.studentId || l.userId).toLowerCase() === studentId
                );
                return res.jsonp(myLeaves);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                body.studentId = currentUser.id;
                body.userId = currentUser.id;
                body.status = 'pending';
                body.stage = 'stage1_pending';
                req.body = body;
            }
            if (req.method === 'PUT' || req.method === 'PATCH') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot approve or modify submitted leave requests." });
            }
        }
    }

    // -------------------------------------------------------------
    // 15. SERVER-SIDE RBAC FOR /announcements
    // -------------------------------------------------------------
    if (req.url === '/announcements' || req.url.startsWith('/announcements?') || req.url.startsWith('/announcements/')) {
        if (currentUser.role === 'student') {
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
                return res.status(403).jsonp({ error: "Forbidden", message: "Students cannot publish, edit, or delete announcements." });
            }
        }
    }

    // -------------------------------------------------------------
    // 16. SERVER-SIDE RBAC FOR /settings and /departments
    // -------------------------------------------------------------
    if (req.url === '/settings' || req.url.startsWith('/settings?') || req.url.startsWith('/settings/')) {
        if (currentUser.role !== 'admin' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
            return res.status(403).jsonp({ error: "Forbidden", message: "Only administrators can modify portal settings." });
        }
    }
    if (req.url === '/departments' || req.url.startsWith('/departments?') || req.url.startsWith('/departments/')) {
        if (currentUser.role !== 'admin' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
            return res.status(403).jsonp({ error: "Forbidden", message: "Only administrators can modify academic departments." });
        }
    }

    // -------------------------------------------------------------
    // 17. SERVER-SIDE RBAC FOR /audit_logs and /security_logs
    // Admin only
    // -------------------------------------------------------------
    if (req.url.startsWith('/audit_logs') || req.url.startsWith('/security_logs')) {
        if (currentUser.role !== 'admin') {
            return res.status(403).jsonp({ error: "Forbidden", message: "Audit logs are restricted to Administrators." });
        }
    }

    // -------------------------------------------------------------
    // 18. ATTENDANCE VERIFICATION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/attendance/verify-location') && req.method === 'POST') {
        return res.jsonp({
            success: true,
            valid: true,
            message: "Direct attendance enabled."
        });
    }

    // -------------------------------------------------------------
    // 14. ASSESSMENT PRE-FLIGHT CHECK & ATTEMPT INITIALIZATION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/start-check') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, examId } = body;

            // Enforce that student can only start test for themselves
            if (currentUser.role === 'student' && String(userId).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                return res.status(403).jsonp({ allowed: false, message: "Cannot start assessment on behalf of another student." });
            }

            const db = getDb();
            const user = (db.users || []).find(u => String(u.id).toLowerCase() === String(userId).toLowerCase());
            const exam = (db.exams || []).find(e => String(e.id) === String(examId));

            if (!user) {
                return res.status(404).jsonp({ allowed: false, message: "User account not found." });
            }
            if (user.status && user.status !== 'active') {
                return res.status(403).jsonp({ allowed: false, message: `Account is not active (${user.status}). Access denied.` });
            }
            if (!exam || (exam.status && exam.status.toLowerCase() !== 'active')) {
                return res.status(404).jsonp({ allowed: false, message: "Assessment does not exist or is currently inactive." });
            }

            // Department validation
            const cleanStudentBaseId = String(user.details?.studentId || user.studentId || user.id || '').split('_')[0].toLowerCase().trim();
            const studentDepts = (db.users || [])
                .filter(u => u.role === 'student' && (
                    String(u.id).toLowerCase().trim() === String(user.id).toLowerCase().trim() ||
                    String(u.id).toLowerCase().trim().split('_')[0] === cleanStudentBaseId ||
                    (user.phone && String(u.phone).trim() === String(user.phone).trim())
                ))
                .map(u => String(u.department || u.details?.department || 'General').toLowerCase().trim());

            if (user.department) studentDepts.push(String(user.department).toLowerCase().trim());
            if (user.details?.department) studentDepts.push(String(user.details.department).toLowerCase().trim());
            if (Array.isArray(user.departments)) {
                user.departments.forEach(d => studentDepts.push(String(d).toLowerCase().trim()));
            }

            const examDeptClean = String(exam.department || '').toLowerCase().trim();
            const isEnrolledInExamDept = examDeptClean === '' || 
                                         examDeptClean === 'generic' || 
                                         examDeptClean === 'all' || 
                                         studentDepts.includes(examDeptClean);

            if (!isEnrolledInExamDept && user.role !== 'admin') {
                return res.status(403).jsonp({ allowed: false, message: `This assessment is reserved for ${exam.department} Department students.` });
            }

            const attempts = db.assessment_attempts || [];
            const userExamAttempts = attempts.filter(a => String(a.userId).toLowerCase() === String(userId).toLowerCase() && String(a.examId) === String(examId));

            // Resume active attempt
            const activeAttempt = userExamAttempts.find(a => a.status === 'in_progress');
            if (activeAttempt) {
                const now = Date.now();
                const expectedEnd = new Date(activeAttempt.expected_end_at).getTime();
                const remainingSeconds = Math.max(0, Math.floor((expectedEnd - now) / 1000));

                if (remainingSeconds <= 0) {
                    activeAttempt.status = 'time_expired';
                    activeAttempt.submitted_at = new Date().toISOString();
                    saveDb(db);
                } else {
                    return res.jsonp({
                        allowed: true,
                        isResume: true,
                        attempt: activeAttempt,
                        remainingSeconds,
                        maxViolations: activeAttempt.max_security_violations || exam.max_security_violations || 3,
                        message: "Resuming active test session."
                    });
                }
            }

            // Attempt limits
            const completedAttemptsCount = userExamAttempts.filter(a => a.status === 'completed' || a.status === 'violation_terminated' || a.status === 'time_expired').length;
            const maxAttemptsAllowed = exam.max_attempts || 3;

            if (completedAttemptsCount >= maxAttemptsAllowed && user.role !== 'admin') {
                return res.status(403).jsonp({
                    allowed: false,
                    reason: 'ATTEMPT_LIMIT_EXCEEDED',
                    message: `You have reached the maximum attempt limit (${maxAttemptsAllowed}) for this assessment.`
                });
            }

            // Create new attempt
            const durationMinutes = exam.duration || 30;
            const startedAt = new Date();
            const expectedEndAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
            const maxViolations = exam.max_security_violations || 3;

            const newAttempt = {
                id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                userId: user.id,
                userName: user.name,
                examId: exam.id,
                examTitle: exam.title,
                totalQuestions: (exam.questions || []).length,
                started_at: startedAt.toISOString(),
                expected_end_at: expectedEndAt.toISOString(),
                status: 'in_progress',
                violationsCount: 0,
                max_security_violations: maxViolations,
                answers: {}
            };

            db.assessment_attempts = db.assessment_attempts || [];
            db.assessment_attempts.push(newAttempt);
            saveDb(db);

            return res.jsonp({
                allowed: true,
                isResume: false,
                attempt: newAttempt,
                remainingSeconds: durationMinutes * 60,
                maxViolations,
                message: "Assessment started successfully in secure mode."
            });
        } catch (err) {
            console.error('[ASSESSMENT START ERROR]', err);
            return res.status(500).jsonp({ allowed: false, message: "Internal assessment start error: " + err.message });
        }
    }

    // -------------------------------------------------------------
    // 15. INCREMENTAL ANSWER PERSISTENCE
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/save-answer') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, attemptId, questionId, selectedOption } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt) {
                return res.status(404).jsonp({ success: false, message: "Attempt not found." });
            }
            if (String(attempt.userId).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                return res.status(403).jsonp({ success: false, message: "Unauthorized attempt modification." });
            }
            if (attempt.status !== 'in_progress') {
                return res.status(400).jsonp({ success: false, message: "Attempt is already closed." });
            }

            attempt.answers = attempt.answers || {};
            attempt.answers[questionId] = selectedOption;
            attempt.lastSavedAt = new Date().toISOString();

            saveDb(db);
            return res.jsonp({ success: true, savedAnswersCount: Object.keys(attempt.answers).length });
        } catch (err) {
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 16. ASSESSMENT SECURITY VIOLATION RECORDING
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/record-violation') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, attemptId, examId, violationType, details } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt || String(attempt.userId).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                return res.status(403).jsonp({ success: false, message: "Unauthorized attempt access." });
            }

            attempt.violationsCount = (attempt.violationsCount || 0) + 1;
            const maxViolations = attempt.max_security_violations || 3;
            const isTerminated = attempt.violationsCount >= maxViolations;

            if (isTerminated) {
                attempt.status = 'violation_terminated';
                attempt.submitted_at = new Date().toISOString();
            }

            db.security_logs = db.security_logs || [];
            db.security_logs.push({
                id: Date.now(),
                userId: currentUser.id,
                assessmentId: examId,
                attemptId,
                eventType: violationType || 'SECURITY_VIOLATION',
                status: isTerminated ? 'TERMINATED' : 'VIOLATION',
                details: `${details || violationType} (Violation count: ${attempt.violationsCount}/${maxViolations})`,
                timestamp: new Date().toISOString()
            });

            saveDb(db);
            return res.jsonp({
                success: true,
                violationsCount: attempt.violationsCount,
                maxViolations,
                isTerminated,
                message: isTerminated ? "Max violations exceeded. Assessment auto-terminated." : "Violation recorded."
            });
        } catch (err) {
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 17. SERVER-SIDE RESULT CALCULATION & SUBMISSION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/submit') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { attemptId, answers = {}, submissionType = 'manual' } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt) {
                return res.status(404).jsonp({ success: false, message: "Attempt not found." });
            }
            if (String(attempt.userId).toLowerCase() !== String(currentUser.id).toLowerCase()) {
                return res.status(403).jsonp({ success: false, message: "Ownership validation failed: Attempt does not belong to user." });
            }

            const exam = (db.exams || []).find(e => String(e.id) === String(attempt.examId));
            if (!exam) {
                return res.status(404).jsonp({ success: false, message: "Associated assessment not found." });
            }

            const now = Date.now();
            const expectedEnd = new Date(attempt.expected_end_at).getTime();
            const isTimeExpired = now > (expectedEnd + 60000); // 60s buffer
            let finalSubmissionType = submissionType;
            if (isTimeExpired && finalSubmissionType !== 'violation_limit_reached') {
                finalSubmissionType = 'time_expired';
            }

            const mergedAnswers = { ...(attempt.answers || {}), ...answers };
            const questions = exam.questions || [];
            const totalQuestions = questions.length;
            let correctCount = 0;
            let attemptedCount = 0;

            questions.forEach(q => {
                const userAns = mergedAnswers[q.id];
                if (userAns !== undefined && userAns !== null && userAns !== '') {
                    attemptedCount++;
                    if (Number(userAns) === Number(q.correctAnswer)) {
                        correctCount++;
                    }
                }
            });

            const incorrectCount = attemptedCount - correctCount;
            const unansweredCount = totalQuestions - attemptedCount;
            const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

            const submittedAt = new Date().toISOString();
            attempt.status = finalSubmissionType === 'violation_limit_reached' ? 'violation_terminated' : 'completed';
            attempt.submitted_at = submittedAt;
            attempt.answers = mergedAnswers;
            attempt.score = scorePercentage;

            const questionReview = questions.map((q, idx) => {
                const userAns = mergedAnswers[q.id];
                const isAttempted = userAns !== undefined && userAns !== null && userAns !== '';
                const isCorrect = isAttempted && Number(userAns) === Number(q.correctAnswer);
                return {
                    id: q.id || (idx + 1),
                    questionIndex: idx + 1,
                    question: q.question || q.text,
                    options: q.options || [],
                    userAnswer: isAttempted ? Number(userAns) : null,
                    correctAnswer: Number(q.correctAnswer),
                    isCorrect,
                    isAttempted,
                    explanation: q.explanation || ''
                };
            });

            const user = (db.users || []).find(u => String(u.id).toLowerCase() === String(currentUser.id).toLowerCase());
            const passingScore = exam.passingMarks || 50;
            const studentDept = user?.department || user?.details?.department || (exam.department && exam.department !== 'Generic' && exam.department !== 'General' ? exam.department : 'General');

            const resultRecord = {
                id: Date.now(),
                attemptId: attempt.id,
                examId: exam.id,
                examTitle: exam.title,
                category: exam.category || exam.department || 'General',
                department: studentDept,
                studentDepartment: user?.department || user?.details?.department || studentDept,
                examDepartment: exam.department || 'General',
                userId: user?.id || currentUser.id,
                studentName: user?.name || currentUser.name || 'Student',
                studentPhone: user?.phone || '',
                score: scorePercentage,
                percentage: scorePercentage,
                totalQuestions,
                attemptedQuestions: attemptedCount,
                correctAnswers: correctCount,
                incorrectAnswers: incorrectCount,
                wrongAnswers: incorrectCount,
                unansweredQuestions: unansweredCount,
                answers: mergedAnswers,
                questionReview,
                passingScore,
                isPassed: scorePercentage >= passingScore,
                submissionType: finalSubmissionType,
                violationsCount: attempt.violationsCount || 0,
                durationMinutes: exam.duration || 0,
                submittedAt,
                date: submittedAt
            };

            db.results = db.results || [];
            db.results.push(resultRecord);
            saveDb(db);

            return res.jsonp({
                success: true,
                result: resultRecord
            });
        } catch (err) {
            console.error('[SUBMIT ERROR]', err);
            return res.status(500).jsonp({ success: false, message: "Submission calculation error: " + err.message });
        }
    }

    // Pass through to json-server router
    next();
};
