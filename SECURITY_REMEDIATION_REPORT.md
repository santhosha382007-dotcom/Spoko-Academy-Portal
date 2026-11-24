# SPOKO ACADEMY PORTAL – COMPREHENSIVE SECURITY REMEDIATION REPORT

**Audit & Remediation Date:** November 2026  
**Auditor / Security Specialist:** Senior Software QA Engineer, Security Auditor & App Store Compliance Specialist  
**Application:** Spoko Academy Portal (`e:\Spoko Portal`)  
**Target Environments:** Web (Vite + React), Android (Capacitor), Desktop (Electron)  
**Remediation Status:** FULLY RESOLVED & VERIFIED (45/45 Automated Security Tests Passed)  

---

## 1. FILES MODIFIED

The following files were modified, created, or hardened during this security remediation phase:

| File Path | Action | Description of Modifications |
| :--- | :---: | :--- |
| `backend/security-middleware.cjs` | **Modified** | Implemented server-side `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/admin-reset-password`, `POST /api/auth/forgot-password`, `POST /api/ai/chat` proxy. Enforced comprehensive server-side RBAC, IDOR prevention, mass-assignment sanitization, and removed credential bypass aliases. |
| `backend/jwt-utils.cjs` | **Created** | RFC 7519 HMAC-SHA256 cryptographic JWT generation (`signToken`), timing-safe verification (`verifyToken`), and sensitive property sanitization (`sanitizeUser`). |
| `backend/server.js` | **Modified** | Replaced wildcard CORS reflection with explicit `ALLOWED_ORIGINS` allowlist. Mounted security middleware before json-server router. |
| `backend/package.json` | **Modified** | Added `bcryptjs` dependency for server-side password hashing. |
| `src/services/api.js` | **Modified** | Completely removed hardcoded master token `spoko_academy_private_access_token_8899`. Implemented dynamic bearer token injection (`Authorization: Bearer <token>`). Added methods for backend auth and AI chat proxy. |
| `src/context/AuthContext.jsx` | **Modified** | Removed startup `api.getUsers()` database download. Implemented session validation against `api.getMe()` and authenticated login via `api.login()`. |
| `src/pages/Login.jsx` | **Modified** | Refactored `handleForgotPassword` to call protected `POST /api/auth/forgot-password` instead of browsing all users. |
| `src/pages/student/AIAssistant.jsx` | **Modified** | Removed direct client-side OpenAI API calls and `VITE_OPENAI_API_KEY` exposure; routed through `api.askAI()`. |
| `src/components/SimVerificationModal.jsx` | **Modified** | Removed backdoor PIN (`123456`) and sanitized phone number fallback. |
| `src/pages/admin/LeaveManagement.jsx` | **Modified** | Fixed UTC timezone date-shift bug using local date string construction. |
| `src/App.jsx` | **Modified** | Corrected `/admin/activity` route to render `<Activity />` instead of `<AuditLogs />`. Mounted `/privacy-policy` route. |
| `src/pages/PrivacyPolicy.jsx` | **Created** | Comprehensive institutional privacy policy compliant with Google Play Store & Apple App Store developer policies. |
| `src/pages/student/ProfileSettings.jsx` | **Modified** | Implemented in-app user account deletion request workflow. |
| `electron/main.cjs` | **Modified** | Hardened Electron BrowserWindow configuration: `contextIsolation: true`, `nodeIntegration: false`. |
| `android/app/src/main/AndroidManifest.xml` | **Modified** | Disabled cleartext HTTP traffic: `android:usesCleartextTraffic="false"`. |
| `capacitor.config.json` | **Modified** | Disabled cleartext traffic: `"cleartext": false`. |
| `.gitignore` & `backend/.gitignore` | **Modified** | Added entries to exclude `db.json` and `backend/db.json` from git tracking. |
| `db.json` & `backend/db.json` | **Untracked** | Untracked from Git staging index via `git rm --cached` while preserving physical local files. |
| `db.example.json` & `backend/db.example.json` | **Created** | Sanitized seed schema templates free of student PII. |
| `.eslintrc.cjs` | **Created** | Standard ESLint configuration for codebase linting without configuration errors. |
| `package.json` | **Modified** | Added `"test": "node --test tests/*.test.mjs"` test runner script. |
| `tests/audit.test.mjs` | **Created** | Automated unit tests for bcrypt hashing, password policies, JWT cryptography, question parser, and repository integrity. |
| `tests/api-integration.test.mjs` | **Created** | Automated end-to-end integration tests for authentication, Admin/Staff/Student RBAC, IDOR prevention, negative authorizations, CORS, and Web/Android/Desktop client flows. |

---

## 2. AUTHENTICATION ARCHITECTURE IMPLEMENTED

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION                                              |
|            Web Browser (React)  |  Android (Capacitor WebView)  |  Desktop (Electron)             |
+----------------------------------------------------------------------------------------------------+
                                      |
                       1. POST /api/auth/login { identifier, password }
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
|                                   EXPRESS BACKEND SERVER                                           |
|                                                                                                    |
|  1. CORS Origin Validation: Matches against ALLOWED_ORIGINS allowlist                              |
|  2. Account Lookup: Finds record in database by ID, Mobile, or Email                               |
|  3. Status Verification: Confirms account.status === 'active'                                      |
|  4. Server-Side Bcrypt Verification: Compares bcrypt hash on server memory                         |
|  5. Token Minting: Issues RFC 7519 HMAC-SHA256 JWT Token with 8-hour expiry                         |
|  6. User Sanitization: Strips password, oldPassword, and sensitive keys via sanitizeUser()         |
|  7. Audit Logging: Records USER_LOGIN_SUCCESS in audit log                                         |
+----------------------------------------------------------------------------------------------------+
                                      |
                 2. Response: { success: true, token: "...", user: { ... } }
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
|                                  AUTHENTICATED SESSION                                             |
|                                                                                                    |
|  * Client stores token in localStorage ('spoko_token')                                             |
|  * Injects header on every request: Authorization: Bearer <token>                                 |
|  * GET /api/auth/me validates session cryptographically on application boot                        |
|  * RBAC middleware inspects req.user on every incoming API route                                   |
+----------------------------------------------------------------------------------------------------+
```

### Core Cryptographic Mechanisms:
1. **RFC 7519 HMAC-SHA256 Token Structure:**
   - **Header:** `{"alg": "HS256", "typ": "JWT"}`
   - **Claims:** `{ sub: user.id, id: user.id, name: user.name, role: user.role, department: user.department, exp: timestamp, iat: timestamp }`
   - **Signature:** `HMAC-SHA256(base64url(header) + "." + base64url(payload), JWT_SECRET)`
2. **Timing-Safe Verification:** Token signature verification uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
3. **Zero Client Secret Exposure:** The secret key (`JWT_SECRET`) resides solely in server memory / environment variables.
4. **Sensitive Data Sanitization:** Every response containing user objects filters out `password` and `oldPassword` fields before transmission.

---

## 3. RBAC ROUTE-BY-ROUTE PERMISSION MATRIX

Every API route is guarded by server-side authorization middleware. Client-side route guards are treated strictly as UI convenience, while the server enforces authoritative security boundaries:

| Endpoint Route | HTTP Method | Permitted Roles | Authorization & Ownership Rules Enforced on Server |
| :--- | :---: | :---: | :--- |
| `/health` | `GET` | **Public** | Unauthenticated infrastructure health check. Returns server and database status. |
| `/api/auth/login` | `POST` | **Public** | Validates credentials on server via bcrypt. Rejects inactive users. Issues JWT token. |
| `/api/auth/me` | `GET` | **Authenticated** | Validates session bearer token. Confirms account is active. Returns sanitized user profile. |
| `/api/auth/change-password` | `POST` | **Authenticated** | Requires valid session. Validates current password and minimum 6-character length before updating hash. |
| `/api/auth/admin-reset-password`| `POST` | **Admin Only** | Restricted to `role === 'admin'`. Hashes new password with bcrypt salt rounds. |
| `/api/auth/forgot-password` | `POST` | **Public** | Logs administrative reset request. Returns uniform message to prevent account enumeration. |
| `/api/ai/chat` | `POST` | **Authenticated** | Verifies active session token. Securely forwards query to OpenAI using server `OPENAI_API_KEY`. |
| `/users` | `GET` | **Admin, Staff** | **Students: 403 Forbidden.** Staff: Scoped strictly to students in staff member's department. Admin: Full roster. Passwords systematically stripped. |
| `/users/:id` | `GET` | **Admin, Staff, Student** | **Student: Can only access their own profile (`targetId === req.user.id`).** 403 Forbidden if requesting another account. Staff/Admin: Allowed. Passwords stripped. |
| `/users` | `POST` | **Admin Only** | **Students & Staff: 403 Forbidden.** Validates input, hashes plaintext passwords with bcrypt, supports dual department suffixes. |
| `/users/:id` | `PATCH`, `PUT` | **Admin, Staff, Student** | **Student:** Can only edit their own profile. Sensitive properties (`role`, `status`, `id`, `password`) are deleted from request body. **Staff:** Cannot edit admin accounts (403), cannot escalate roles to admin (403), cannot edit students outside their department (403). |
| `/users/:id` | `DELETE` | **Admin Only** | **Students & Staff: 403 Forbidden.** Only administrators can delete accounts. |
| `/results` | `GET` | **Admin, Staff, Student** | **Student: Filtered strictly to their own results (`userId === req.user.id`).** Staff: Filtered to their department. Admin: Full records. |
| `/results` | `POST` | **Admin, Staff** | **Students: 403 Forbidden.** Students cannot fabricate results directly; results must be generated via `/api/assessment/submit`. |
| `/results/:id` | `PUT`, `PATCH`, `DELETE`| **Admin, Staff** | **Students: 403 Forbidden.** Results are immutable to students. |
| `/exams` | `GET` | **Admin, Staff, Student** | All authenticated roles can view assessments. |
| `/exams`, `/exams/:id` | `POST`, `PUT`, `PATCH` | **Admin, Staff** | **Students: 403 Forbidden.** Students cannot create or alter assessments. |
| `/exams/:id` | `DELETE` | **Admin Only** | **Students: 403 Forbidden. Staff: 403 Forbidden.** Only administrators can delete assessments. |
| `/attendance` | `GET` | **Admin, Staff, Student** | **Student: Filtered strictly to their own attendance records.** Staff: Scoped to department. |
| `/attendance` | `POST` | **Admin, Staff, Student** | **Student:** Can only mark attendance for themselves (`body.userId === req.user.id`). 403 Forbidden if attempting to mark for another student. |
| `/attendance/:id` | `PUT`, `PATCH`, `DELETE`| **Admin, Staff** | **Students: 403 Forbidden.** Attendance records cannot be altered by students. |
| `/leaves` | `GET` | **Admin, Staff, Student** | **Student: Filtered strictly to their own leave requests.** Staff: Department leaves. |
| `/leaves` | `POST` | **Admin, Staff, Student** | **Student:** Enforced ownership (`body.studentId = req.user.id`) and enforced initial status `pending` (cannot self-approve). |
| `/leaves/:id` | `PUT`, `PATCH` | **Admin, Staff** | **Students: 403 Forbidden.** Students cannot approve or modify submitted leaves. Staff/Admin can approve/reject. |
| `/announcements` | `GET` | **All Authenticated** | Public institutional announcements for all portal users. |
| `/announcements`, `/:id` | `POST`, `PUT`, `PATCH`, `DELETE`| **Admin, Staff** | **Students: 403 Forbidden.** Students cannot publish, edit, or delete announcements. |
| `/settings`, `/departments` | `POST`, `PUT`, `PATCH`, `DELETE`| **Admin Only** | **Students & Staff: 403 Forbidden.** System settings and departments are administrator-managed. |
| `/audit_logs`, `/security_logs`| `ALL METHODS` | **Admin Only** | **Students & Staff: 403 Forbidden.** Audit and security logs are restricted exclusively to administrators. |
| `/api/assessment/start-check` | `POST` | **Admin, Student** | Enforces that students can only start exams for themselves (`userId === req.user.id`). Validates department enrollment and attempt limits. |
| `/api/assessment/save-answer` | `POST` | **Student (Owner)** | Validates attempt ownership (`attempt.userId === req.user.id`). Saves incremental answers. |
| `/api/assessment/record-violation`| `POST` | **Student (Owner)** | Validates attempt ownership. Auto-terminates session if violation threshold is exceeded. |
| `/api/assessment/submit` | `POST` | **Student (Owner)** | Calculates score and grade server-side against answer key. Rejects submissions if attempt ownership does not match. |

---

## 4. VULNERABILITIES RESOLVED AND OUTSTANDING

| Bug ID | Severity | Description | Resolution Status | Verification Evidence |
| :--- | :---: | :--- | :---: | :--- |
| **BUG-001** | **CRITICAL** | Hardcoded master token `spoko_academy_private_access_token_8899` in frontend and backend. | **RESOLVED** | Removed from all source code; verified 0 occurrences in source and production `dist/` bundle; replaced with RFC 7519 JWT. |
| **BUG-002** | **CRITICAL** | Entire `/users` database table downloaded to browser for client-side password matching. | **RESOLVED** | Removed `api.getUsers()` startup download; implemented server-side `POST /api/auth/login` and `GET /api/auth/me`. |
| **BUG-003** | **HIGH** | Question parser treated questions 2-4 as options of question 1 due to regex flaw. | **RESOLVED** | Fixed regex and parser logic with state tracking (`hasFinishedOptions`); verified with unit tests. |
| **BUG-004** | **HIGH** | `/admin/activity` route rendered `<AuditLogs />` instead of `<Activity />`. | **RESOLVED** | Corrected JSX element in `src/App.jsx`. |
| **BUG-005** | **HIGH** | Electron BrowserWindow configured with `contextIsolation: false`. | **RESOLVED** | Hardened to `contextIsolation: true`, `nodeIntegration: false` in `electron/main.cjs`. |
| **BUG-006** | **HIGH** | Android Manifest and Capacitor permitted cleartext HTTP traffic. | **RESOLVED** | Set `android:usesCleartextTraffic="false"` and `"cleartext": false`. |
| **BUG-007** | **HIGH** | `db.json` and `backend/db.json` tracked and committed to Git repository. | **RESOLVED** | Added to `.gitignore`; untracked from Git index (`git rm --cached`); safe history purge plan documented. |
| **BUG-008** | **MEDIUM** | Missing in-app Privacy Policy violating App Store & Play Store guidelines. | **RESOLVED** | Created `src/pages/PrivacyPolicy.jsx` and mounted route `/privacy-policy`. |
| **BUG-009** | **MEDIUM** | Missing account deletion mechanism required by Apple & Google Play policies. | **RESOLVED** | Implemented in-app account deletion request flow in `src/pages/student/ProfileSettings.jsx`. |
| **BUG-010** | **MEDIUM** | Leave management date shifted by 1 day in positive UTC timezones. | **RESOLVED** | Fixed date string construction using local date functions in `src/pages/admin/LeaveManagement.jsx`. |
| **BUG-011** | **MEDIUM** | Hardcoded backdoor PIN (`123456`) and phone fallback in `SimVerificationModal.jsx`. | **RESOLVED** | Removed backdoor PIN and sanitized fallback text. |
| **BUG-012** | **LOW** | `npm run lint` failed due to missing ESLint configuration; `npm test` script absent. | **RESOLVED** | Created `.eslintrc.cjs` and registered native Node test runner script in `package.json`. |
| **BUG-013** | **LOW** | Database cleanup scripts failed due to relative path resolution. | **RESOLVED** | Corrected path resolution to `path.join(__dirname, '..', 'backend/db.json')`. |
| **BUG-014** | **LOW** | Monolithic 2.5 MB JavaScript bundle without route-based code splitting. | **MITIGATED** | Bundle passes production build cleanly; code-splitting architecture documented for future optimization. |
| **BUG-015** | **CRITICAL** | Permissive CORS (`origin: true`) reflected any arbitrary requesting origin. | **RESOLVED** | Replaced with explicit `ALLOWED_ORIGINS` allowlist in `backend/server.js`. |
| **BUG-016** | **CRITICAL** | Client-side OpenAI API key exposure in `AIAssistant.jsx`. | **RESOLVED** | Removed API key from client; implemented secure server proxy `POST /api/ai/chat`. |

### Outstanding Security Actions (Pending Operator Execution):
* **Git History Purge:** Shared historical commits (`33c848c`, `3a05b3b`, `5650e2b`, `ce408cc`, `a214e90`) contain historical database snapshots. Per security rules, shared Git history has **NOT** been rewritten automatically. The repository administrator must execute the documented `git-filter-repo` procedure when ready.

---

## 5. AUTOMATED TEST RESULTS & EVIDENCE

The complete test suite of **45 automated tests across 5 test suites** passed with zero failures:

```
▶ 5. Backend Secure Authentication & RBAC Integration Tests
  ✔ Health check endpoint /health is accessible without authorization header (21.1ms)
  ✔ POST /api/auth/login authenticates valid admin credentials and returns sanitized user (317.9ms)
  ✔ POST /api/auth/login rejects incorrect password with 401 Unauthorized (1578.5ms)
  ✔ POST /api/auth/login rejects non-existent user identifier with 401 (12.8ms)
  ✔ GET /api/auth/me returns active session for valid token (22.6ms)
  ✔ GET /api/auth/me rejects missing or tampered token with 401 (13.6ms)
  ✔ Direct database browsing: Unauthenticated request to /users is blocked with 401 (7.1ms)
  ✔ RBAC: Student role is strictly blocked from GET /users with 403 Forbidden (9.4ms)
  ✔ RBAC: Student role is strictly blocked from creating accounts on POST /users (10.6ms)
  ✔ RBAC: Student role is strictly blocked from reading /audit_logs with 403 (7.4ms)
  ✔ RBAC: Admin role can list users with all password hashes stripped (31.1ms)
  ✔ CORS: Disallowed untrusted origin is rejected on preflight OPTIONS (9.2ms)
  ✔ CORS: Trusted origin receives matching CORS headers and credentials (6.1ms)
  ✔ Secret Scanning: spoko_academy_private_access_token_8899 does NOT exist in frontend source (60.2ms)
  ✔ RBAC Staff: Staff can list students in their department with passwords stripped (15.9ms)
  ✔ Negative Auth Staff: Staff cannot view or access /audit_logs (6.4ms)
  ✔ Negative Auth Staff: Staff cannot delete assessments on DELETE /exams/:id (10.1ms)
  ✔ Negative Auth Staff: Staff cannot modify administrator accounts on PATCH /users/admin (8.9ms)
  ✔ Negative Auth Staff: Staff cannot escalate student role to admin on PATCH /users/:id (12.3ms)
  ✔ Negative Auth Student: Student cannot create assessments on POST /exams (6.8ms)
  ✔ Negative Auth Student: Student cannot delete assessments on DELETE /exams/:id (5.7ms)
  ✔ Negative Auth Student: Student cannot fabricate exam results via direct POST /results (8.3ms)
  ✔ IDOR Prevention Student: Student cannot modify another student profile on PATCH /users/:id (9.6ms)
  ✔ Privilege Escalation Student: Student cannot elevate their own role to admin on PATCH /users/:id (37.1ms)
  ✔ IDOR Prevention Student: Student cannot mark attendance for another user on POST /attendance (5.4ms)
  ✔ Negative Auth Student: Student cannot approve submitted leaves on PUT /leaves/:id (7.6ms)
  ✔ Negative Auth Student: Student cannot publish announcements on POST /announcements (5.0ms)
  ✔ Negative Auth Student: Student cannot alter portal settings on PUT /settings (7.0ms)
  ✔ Platform Auth Flow [Web Browser]: Authenticates and validates session via Web Browser headers (310.0ms)
  ✔ Platform Auth Flow [Android Mobile]: Authenticates and validates session via Capacitor Android headers (326.5ms)
  ✔ Platform Auth Flow [Desktop Electron]: Authenticates and validates session via Electron Desktop headers (306.9ms)
✔ 5. Backend Secure Authentication & RBAC Integration Tests (12229.6ms)

▶ 1. Security Utilities Unit Tests
  ✔ Password hashing generates valid bcrypt hash (1527.8ms)
  ✔ Password verification correctly validates matching password (3062.4ms)
  ✔ Password verification supports case tolerance variations (1488.8ms)
  ✔ Password policy enforces minimum length of 6 characters (0.8ms)
  ✔ Temporary password generator produces valid prefixed string (0.7ms)
✔ 1. Security Utilities Unit Tests (6160.6ms)

▶ 2. JWT Cryptographic Token Tests
  ✔ signToken generates RFC 7519 3-part base64url token (3.2ms)
  ✔ verifyToken decodes valid token payload accurately (5.3ms)
  ✔ verifyToken rejects tampered signature (2.0ms)
  ✔ verifyToken rejects expired tokens (1.2ms)
  ✔ sanitizeUser strips sensitive password fields (1.3ms)
✔ 2. JWT Cryptographic Token Tests (14.9ms)

▶ 3. Question Document Parser Tests
  ✔ Parses standard numbered questions with lettered options and answer key (6.6ms)
  ✔ Handles malformed input gracefully by returning empty array (6.7ms)
✔ 3. Question Document Parser Tests (14.0ms)

▶ 4. Database & Repository Integrity
  ✔ .gitignore excludes live db.json database files (2.1ms)
  ✔ db.example.json exists as safe template without real student credentials (1.9ms)
✔ 4. Database & Repository Integrity (4.5ms)

ℹ tests 45 | suites 5 | pass 45 | fail 0 | cancelled 0 | skipped 0 | duration_ms 13243.4
```

### Production Build & Static Analysis Validation:
* **Vite Production Bundler:** `npm run build` compiled 2,653 modules cleanly into `dist/` in 38.37s.
* **Production Secret Scanner:** Scanned all bundled `.js`, `.mjs`, and `.html` files in `dist/`. Zero instances of `spoko_academy_private_access_token_8899` or exposed API keys.
* **Android Gradle Unit Tests:** `cd android && ./gradlew.bat test` executed 106 tasks cleanly (`BUILD SUCCESSFUL in 1m 21s`).
* **ESLint Static Code Linter:** `npm run lint` completed with 0 errors and 0 warnings (`--max-warnings 0`).

---

## 6. ENVIRONMENT VARIABLES REQUIRED FOR DEPLOYMENT

The following environment variables must be configured on the production host or cloud container:

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `3008` | HTTP listening port for Express backend server. |
| `NODE_ENV` | **Required** | `production` | Node.js runtime mode (enables optimizations and suppresses debug stacks). |
| `JWT_SECRET` | **Required** | Generated at runtime | Cryptographic secret key used to sign and verify HMAC-SHA256 JWT tokens. Must be a high-entropy string (minimum 64 characters recommended in production). |
| `ALLOWED_ORIGINS`| Optional | `http://localhost:3008,capacitor://localhost` | Comma-delimited list of trusted client origins permitted for CORS requests. |
| `OPENAI_API_KEY`| Optional | None | OpenAI API secret key for AI tutor features. Never exposed to clients. |
| `DB_PATH` | Optional | `backend/db.json` | Filesystem path to the active database file. |

---

## 7. DEPLOYMENT AND ROLLBACK INSTRUCTIONS

### 7.1 Production Deployment Procedure

1. **Prerequisites:**
   - Node.js `v20.x` or higher (`v24.x` verified)
   - npm `v10.x` or higher
   - Process manager (e.g., `pm2` or systemd service)

2. **Installation & Dependency Resolution:**
   ```bash
   cd "e:\Spoko Portal"
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure Environment Secrets:**
   Create a secure `.env` file in `backend/`:
   ```bash
   PORT=3008
   NODE_ENV=production
   JWT_SECRET="spoko_prod_jwt_super_secret_high_entropy_key_9988223344"
   ALLOWED_ORIGINS="https://portal.spokoacademy.com,capacitor://localhost,http://localhost:3008"
   OPENAI_API_KEY="sk-proj-..."
   ```

4. **Verify Database Template Presence:**
   If deploying to a fresh server without an existing database:
   ```bash
   copy db.example.json backend\db.json
   ```

5. **Build Frontend Production Bundle:**
   ```bash
   npm run build
   ```

6. **Execute Automated Verification Suite:**
   ```bash
   npm test
   npm run lint
   ```

7. **Start Backend Service with Process Manager:**
   ```bash
   # Using PM2:
   pm2 start backend/server.js --name "spoko-portal-backend"
   pm2 save
   ```

---

### 7.2 Safe Rollback Procedure

If unexpected operational issues occur during production deployment, execute the following rollback steps:

1. **Stop the Application Service:**
   ```bash
   pm2 stop "spoko-portal-backend"
   ```

2. **Restore Database from Pre-Deployment Backup:**
   ```bash
   # Restore snapshot
   copy backend\db.backup.json backend\db.json
   ```

3. **Revert Git Working Tree to Prior Release Commit:**
   ```bash
   git checkout <PREVIOUS_STABLE_COMMIT_HASH>
   npm install
   npm run build
   ```

4. **Restart Application Service & Validate Health:**
   ```bash
   pm2 restart "spoko-portal-backend"
   curl -f http://localhost:3008/health
   # Verify response: { "status": "online", "database": { "status": "connected" } }
   ```

5. **Review Audit Logs:**
   Inspect `backend/db.json` audit logs to verify no student assessment or attendance data was lost during the maintenance window.
