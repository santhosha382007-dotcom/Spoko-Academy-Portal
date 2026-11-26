import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 3199;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const SHARED_SECRET = 'test_jwt_secret_key_spoko_2026_audit_suite';

process.env.JWT_SECRET = SHARED_SECRET;
const jwtUtils = await import('../backend/jwt-utils.cjs');

let serverProcess;
let adminToken;
let studentToken;
let staffToken;

describe('5. Backend Secure Authentication & RBAC Integration Tests', () => {
    before(async () => {
        serverProcess = spawn('node', ['backend/server.js'], {
            cwd: rootDir,
            shell: true,
            env: {
                ...process.env,
                PORT: String(TEST_PORT),
                DB_PATH: path.join(rootDir, 'backend', 'db.json'),
                JWT_SECRET: SHARED_SECRET
            }
        });

        serverProcess.stdout.on('data', () => {});
        serverProcess.stderr.on('data', d => console.error('SERVER LOG:', d.toString()));

        // Poll until server is ready
        let ready = false;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 250));
            try {
                const res = await fetch(`${BASE_URL}/health`);
                if (res.ok) {
                    ready = true;
                    break;
                }
            } catch (e) {}
        }

        if (!ready) {
            throw new Error('Test server failed to start within timeout');
        }

        // 1. Authenticate real admin via POST /api/auth/login
        const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin', password: 'Spoko@123' })
        });
        const adminData = await adminLoginRes.json();
        adminToken = adminData.token;

        // 2. Authenticate real staff via POST /api/auth/login
        const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'staff', password: 'staff@123' })
        });
        const staffData = await staffLoginRes.json();
        staffToken = staffData.token;

        // 3. Authenticate real student via POST /api/auth/login
        const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: '12234', password: 'Spoko@123' })
        });
        const studentData = await studentLoginRes.json();
        studentToken = studentData.token;
    });

    after(() => {
        if (serverProcess) {
            try {
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
                } else {
                    serverProcess.kill('SIGTERM');
                }
            } catch (e) {}
        }
    });

    test('Health check endpoint /health is accessible without authorization header', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'online');
        assert.equal(data.database.status, 'connected');
    });

    test('POST /api/auth/login authenticates valid admin credentials and returns sanitized user', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin', password: 'Spoko@123' })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.token, 'Must return signed token');
        assert.ok(data.user, 'Must return user profile');
        assert.equal(data.user.id, 'admin');
        assert.equal(data.user.role, 'admin');
        assert.equal('password' in data.user, false, 'Password hash must NEVER be returned in response');
    });

    test('POST /api/auth/login rejects incorrect password with 401 Unauthorized', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin', password: 'WrongPassword999!' })
        });

        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('POST /api/auth/login rejects non-existent user identifier with 401', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'non_existent_user_9999', password: 'Password@123' })
        });

        assert.equal(res.status, 401);
    });

    test('GET /api/auth/me returns active session for valid token', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.user.id, 'admin');
        assert.equal('password' in data.user, false);
    });

    test('GET /api/auth/me rejects missing or tampered token with 401', async () => {
        const res1 = await fetch(`${BASE_URL}/api/auth/me`);
        assert.equal(res1.status, 401);

        const res2 = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': 'Bearer forged.invalid.token' }
        });
        assert.equal(res2.status, 401);
    });

    test('Direct database browsing: Unauthenticated request to /users is blocked with 401', async () => {
        const res = await fetch(`${BASE_URL}/users`);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.error, 'Access Denied');
    });

    test('RBAC: Student role is strictly blocked from GET /users with 403 Forbidden', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });

        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.error, 'Forbidden');
    });

    test('RBAC: Student role is strictly blocked from creating accounts on POST /users', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({
                id: 'attacker_admin',
                name: 'Attacker',
                role: 'admin'
            })
        });

        assert.equal(res.status, 403);
    });

    test('RBAC: Student role is strictly blocked from reading /audit_logs with 403', async () => {
        const res = await fetch(`${BASE_URL}/audit_logs`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });

        assert.equal(res.status, 403);
    });

    test('RBAC: Admin role can list users with all password hashes stripped', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        assert.equal(res.status, 200);
        const users = await res.json();
        assert.ok(Array.isArray(users));
        assert.ok(users.length > 0);
        for (const u of users) {
            assert.equal('password' in u, false, `Password exposed for user ${u.id}!`);
        }
    });

    test('CORS: Disallowed untrusted origin is rejected on preflight OPTIONS', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://malicious-attacker-site.com',
                'Access-Control-Request-Method': 'GET'
            }
        });

        assert.equal(res.status, 403);
    });

    test('CORS: Trusted origin receives matching CORS headers and credentials', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3008',
                'Access-Control-Request-Method': 'GET'
            }
        });

        assert.equal(res.status, 200);
        assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3008');
        assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });

    test('Secret Scanning: spoko_academy_private_access_token_8899 does NOT exist in frontend source', () => {
        const srcFiles = [];
        function scanDir(dir) {
            for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, file.name);
                if (file.isDirectory()) {
                    scanDir(full);
                } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
                    srcFiles.push(full);
                }
            }
        }
        scanDir(path.join(rootDir, 'src'));

        for (const file of srcFiles) {
            const content = fs.readFileSync(file, 'utf8');
            assert.equal(
                content.includes('spoko_academy_private_access_token_8899'),
                false,
                `Exposed secret token found in ${file}`
            );
        }
    });

    // -----------------------------------------------------------------
    // STAFF ROLE PERMISSIONS & NEGATIVE AUTHORIZATION TESTS
    // -----------------------------------------------------------------
    test('RBAC Staff: Staff can list students in their department with passwords stripped', async () => {
        const res = await fetch(`${BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${staffToken}` }
        });

        assert.equal(res.status, 200);
        const users = await res.json();
        assert.ok(Array.isArray(users));
        for (const u of users) {
            assert.equal(u.role, 'student', 'Staff user listing should only return students');
            assert.equal('password' in u, false, 'Password must not be returned');
        }
    });

    test('Negative Auth Staff: Staff cannot view or access /audit_logs', async () => {
        const res = await fetch(`${BASE_URL}/audit_logs`, {
            headers: { 'Authorization': `Bearer ${staffToken}` }
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Staff: Staff cannot delete assessments on DELETE /exams/:id', async () => {
        const res = await fetch(`${BASE_URL}/exams/999`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${staffToken}` }
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Staff: Staff cannot modify administrator accounts on PATCH /users/admin', async () => {
        const res = await fetch(`${BASE_URL}/users/admin`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${staffToken}`
            },
            body: JSON.stringify({ name: 'Tampered Admin Name' })
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Staff: Staff cannot escalate student role to admin on PATCH /users/:id', async () => {
        const res = await fetch(`${BASE_URL}/users/12234`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${staffToken}`
            },
            body: JSON.stringify({ role: 'admin' })
        });
        assert.equal(res.status, 403);
    });

    // -----------------------------------------------------------------
    // STUDENT ROLE NEGATIVE AUTHORIZATION & IDOR PREVENTION TESTS
    // -----------------------------------------------------------------
    test('Negative Auth Student: Student cannot create assessments on POST /exams', async () => {
        const res = await fetch(`${BASE_URL}/exams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ title: 'Rogue Student Exam' })
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Student: Student cannot delete assessments on DELETE /exams/:id', async () => {
        const res = await fetch(`${BASE_URL}/exams/1`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Student: Student cannot fabricate exam results via direct POST /results', async () => {
        const res = await fetch(`${BASE_URL}/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ score: 100, isPassed: true })
        });
        assert.equal(res.status, 403);
    });

    test('IDOR Prevention Student: Student cannot modify another student profile on PATCH /users/:id', async () => {
        const res = await fetch(`${BASE_URL}/users/other_student_id_999`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ name: 'Hacked Name' })
        });
        assert.equal(res.status, 403);
    });

    test('Privilege Escalation Student: Student cannot elevate their own role to admin on PATCH /users/:id', async () => {
        const res = await fetch(`${BASE_URL}/users/12234`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ role: 'admin', status: 'deactivated' })
        });
        assert.equal(res.status, 200);

        // Verify the database record did NOT elevate role
        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const meData = await meRes.json();
        assert.equal(meData.user.role, 'student', 'Student role must remain student despite attempted PATCH');
    });

    test('IDOR Prevention Student: Student cannot mark attendance for another user on POST /attendance', async () => {
        const res = await fetch(`${BASE_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ userId: 'different_victim_user', date: '2026-11-24', status: 'present' })
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Student: Student cannot approve submitted leaves on PUT /leaves/:id', async () => {
        const res = await fetch(`${BASE_URL}/leaves/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Student: Student cannot publish announcements on POST /announcements', async () => {
        const res = await fetch(`${BASE_URL}/announcements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ title: 'Fake Announcement' })
        });
        assert.equal(res.status, 403);
    });

    test('Negative Auth Student: Student cannot alter portal settings on PUT /settings', async () => {
        const res = await fetch(`${BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({ maintenanceMode: true })
        });
        assert.equal(res.status, 403);
    });

    // -----------------------------------------------------------------
    // SEPARATE CLIENT PLATFORM FLOW TESTS (WEB, ANDROID, DESKTOP)
    // -----------------------------------------------------------------
    test('Platform Auth Flow [Web Browser]: Authenticates and validates session via Web Browser headers', async () => {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3008',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ identifier: 'admin', password: 'Spoko@123' })
        });

        assert.equal(loginRes.status, 200);
        const loginData = await loginRes.json();
        assert.ok(loginData.token);

        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Origin': 'http://localhost:3008',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        assert.equal(meRes.status, 200);
        const meData = await meRes.json();
        assert.equal(meData.user.id, 'admin');
    });

    test('Platform Auth Flow [Android Mobile]: Authenticates and validates session via Capacitor Android headers', async () => {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'capacitor://localhost',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8; Mobile; Capacitor)'
            },
            body: JSON.stringify({ identifier: '12234', password: 'Spoko@123' })
        });

        assert.equal(loginRes.status, 200);
        const loginData = await loginRes.json();
        assert.ok(loginData.token);

        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Origin': 'capacitor://localhost',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8; Mobile; Capacitor)'
            }
        });
        assert.equal(meRes.status, 200);
        const meData = await meRes.json();
        assert.equal(meData.user.id, '12234');
    });

    test('Platform Auth Flow [Desktop Electron]: Authenticates and validates session via Electron Desktop headers', async () => {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3008',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/44.7.0 Chrome/120.0.0.0'
            },
            body: JSON.stringify({ identifier: 'staff', password: 'staff@123' })
        });

        assert.equal(loginRes.status, 200);
        const loginData = await loginRes.json();
        assert.ok(loginData.token);

        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Origin': 'http://localhost:3008',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/44.7.0 Chrome/120.0.0.0'
            }
        });
        assert.equal(meRes.status, 200);
        const meData = await meRes.json();
        assert.equal(meData.user.id, 'staff');
    });
});
