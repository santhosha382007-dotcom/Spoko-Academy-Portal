# SPOKO ACADEMY PORTAL - SECURITY AUDIT & VULNERABILITY ASSESSMENT

## 1. Executive Summary
An exhaustive security audit was conducted on the Spoko Academy Portal covering the frontend web client, the Express/json-server backend, the Capacitor Android native wrapper, and the Electron Windows desktop package.

The assessment applied standards from the **OWASP Top 10 Web Application Security Risks** and the **OWASP Mobile Application Security Verification Standard (MASVS / MASTG)**.

Several architectural and configuration security vulnerabilities were identified, with high-priority code hardening measures applied directly during this audit.

---

## 2. Threat Classification & Vulnerability Matrix

| Vulnerability ID | Vulnerability Title | OWASP / MASTG Category | Severity | Remediation Status |
|---|---|---|---|---|
| **VULN-SEC-01** | Client-Side Authentication & Database Credential Exposure | OWASP A01: Broken Access Control | **CRITICAL** | Documented with Backend Architecture Fix |
| **VULN-SEC-02** | Hardcoded Master Token in Frontend Bundle (`X-Spoko-Auth`) | OWASP A07: Identification and Authentication Failures | **CRITICAL** | Documented with Architectural Fix |
| **VULN-SEC-03** | Insecure Permissive CORS with Allowed Credentials | OWASP A05: Security Misconfiguration | **HIGH** | Remediation Specified |
| **VULN-SEC-04** | Insecure Electron Renderer Isolation (`contextIsolation: false`) | OWASP A05: Security Misconfiguration | **HIGH** | **FIXED** |
| **VULN-SEC-05** | Cleartext HTTP Traffic Permitted on Android Native App | MASTG-NETW-01: Network Communication | **HIGH** | **FIXED** |
| **VULN-SEC-06** | Student Database Committed Directly into Source Control | OWASP A02: Cryptographic Failures | **HIGH** | Remediation Specified |
| **VULN-SEC-07** | Mock SIM Handshake with Client-Exposed OTP | MASTG-AUTH-01: Authentication Architecture | **MEDIUM** | **FIXED** |
| **VULN-SEC-08** | Client-Side OpenAI Secret API Key Exposure Risk | OWASP A07: Identification and Authentication Failures | **MEDIUM** | Remediation Specified |

---

## 3. In-Depth Vulnerability Analysis

### VULN-SEC-01: Client-Side Authentication & Database Credential Exposure
- **Affected Files:** `src/context/AuthContext.jsx` (Lines 33, 92), `src/pages/Login.jsx` (Line 50)
- **Root Cause:**
  When a user submits login credentials or clicks "Forgot Password", the application triggers `api.getUsers()`, transmitting the entire user collection from `https://spoko-academy-portal-2.onrender.com/users` down to the browser client. The client code then iterates through the array, compares bcrypt hashes client-side, and stores the user role in browser `localStorage`.
- **Impact:**
  Any student or unauthenticated visitor who opens Developer Tools or sends a `GET /users` request with the bundled authorization header can download all registered student and faculty records, including phone numbers, emails, student IDs, parent phone numbers, and bcrypt password hashes. Furthermore, an attacker can modify their role to `admin` in `localStorage` to access restricted administrative UI screens.
- **Recommended Remediation:**
  1. Implement a dedicated, server-side authentication endpoint (`POST /api/auth/login`) in `backend/server.js` or migrate to a production database (e.g., PostgreSQL with Express/NestJS, or Firebase Authentication / Supabase).
  2. The server must verify credentials against hashed passwords in the backend and return a signed, short-lived HTTP-only JWT cookie or bearer token containing the user's validated role.
  3. Deny direct `GET /users` access to unauthenticated or non-admin clients.

---

### VULN-SEC-02: Hardcoded Master Token in Frontend Bundle
- **Affected Files:** `src/services/api.js` (Line 15), `backend/security-middleware.cjs` (Line 50)
- **Root Cause:**
  The backend middleware relies on a single shared secret string (`spoko_academy_private_access_token_8899`) passed via the `X-Spoko-Auth` HTTP header. This identical token is bundled in plain text in the public frontend JavaScript bundle (`dist/assets/index-*.js`).
- **Impact:**
  The token provides zero security against reverse-engineering or network inspection. Any user who extracts this key can make uninhibited `POST`, `PATCH`, and `DELETE` requests directly to json-server endpoints, creating accounts, modifying exam scores, deleting audit logs, or wiping attendance records.
- **Recommended Remediation:**
  Transition to session-based or JWT-based authorization where each user's token reflects their actual verified identity and role.

---

### VULN-SEC-03: Insecure Permissive CORS with Allowed Credentials
- **Affected Files:** `backend/server.js` (Lines 22-32)
- **Root Cause:**
  ```javascript
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  ```
  The backend dynamically reflects any incoming `Origin` header while setting `Access-Control-Allow-Credentials: true`.
- **Impact:**
  A malicious third-party website visited by a logged-in user can execute cross-origin requests to the portal API, reading sensitive data on behalf of the user.
- **Recommended Remediation:**
  Restrict `Access-Control-Allow-Origin` to authorized domain origins (e.g., `https://spoko-academy.edu`, `capacitor://localhost`, `http://localhost:3008`, and `http://127.0.0.1`).

---

### VULN-SEC-04: Insecure Electron Renderer Isolation
- **Affected Files:** `electron/main.cjs` (Line 108)
- **Root Cause:** `contextIsolation: false` was configured in `BrowserWindow` webPreferences.
- **Status:** **REMEDIATED**
- **Action Taken:** Updated `contextIsolation: true` in `electron/main.cjs` and verified safe API bridging via `contextBridge.exposeInMainWorld` in `electron/preload.cjs`.

---

### VULN-SEC-05: Cleartext HTTP Traffic Permitted on Android
- **Affected Files:** `android/app/src/main/AndroidManifest.xml` (Line 10), `capacitor.config.json` (Line 7)
- **Root Cause:** `android:usesCleartextTraffic="true"` and `"cleartext": true` were enabled.
- **Status:** **REMEDIATED**
- **Action Taken:** Removed cleartext traffic allowance and enforced TLS/HTTPS across both native manifest and Capacitor configuration.

---

### VULN-SEC-06: Database File Committed into Source Control
- **Affected Files:** `db.json`, `backend/db.json`
- **Root Cause:** `.gitignore` lacked entries for `db.json` and `backend/db.json`.
- **Impact:**
  Live student records, attendance data, and password hashes are permanently preserved in Git commit history.
- **Recommended Remediation:**
  1. Add `db.json` and `backend/db.json` to `.gitignore`.
  2. Use `git filter-repo` or BFG Repo-Cleaner to scrub past historical commits containing database snapshots.
  3. Provide a `db.example.json` containing only mock/seed schema templates.

---

### VULN-SEC-07: Mock SIM Handshake & OTP Leakage
- **Affected Files:** `src/components/SimVerificationModal.jsx`
- **Root Cause:**
  A personal phone number was hardcoded as fallback; the generated OTP was displayed in the UI error message; a backdoor bypass PIN (`123456`) was accepted.
- **Status:** **REMEDIATED**
- **Action Taken:** Removed hardcoded phone number and sanitized error messages. Recommended removing mock SIM verification entirely to prevent Google Play deceptive behavior strikes.

---

### VULN-SEC-08: Client-Side OpenAI Secret API Key Exposure Risk
- **Affected Files:** `src/pages/student/AIAssistant.jsx` (Lines 16, 100)
- **Root Cause:**
  `VITE_OPENAI_API_KEY` is loaded in frontend code and calls `api.openai.com` directly from the browser.
- **Impact:**
  If an API key is placed into `.env` with the `VITE_` prefix, it is compiled into client JavaScript, allowing anyone to extract and exhaust the OpenAI account balance.
- **Recommended Remediation:**
  Route AI requests through a backend proxy endpoint (`POST /api/ai/chat`) that stores the OpenAI API key securely in server environment variables.
