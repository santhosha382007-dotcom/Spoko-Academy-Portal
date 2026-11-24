# END-TO-END SOFTWARE QA, SECURITY AUDIT & COMPLIANCE REPORT

**Project:** Spoko Academy Portal  
**Application ID:** `com.spoko.portal`  
**Audit Type:** End-to-End Functional, Automated Testing, Security, MASTG, and App Store Compliance Audit  
**Auditor:** Senior Software QA Engineer, Security Auditor & App Store Compliance Specialist  
**Date:** November 2026  
**Repository Working Directory:** `e:\Spoko Portal`  

---

## A. Project Architecture Overview

The Spoko Academy Portal is a multi-platform institutional learning and examination management system designed for web browsers, desktop PCs, and mobile devices:

1. **Frontend Architecture:**
   - **Framework:** React 18.2 with Vite 5.4.
   - **Routing:** React Router DOM 6.22 with role-based route protection (`admin`, `staff`, `student`).
   - **State Management:** React Context API (`AuthContext`) backed by `localStorage`.
   - **Document Parsing & Charts:** Mammoth (DOCX), PDF.js (PDF exam imports), and Recharts (data visualizations).

2. **Backend Architecture:**
   - **Server Runtime:** Node.js Express server wrapping `json-server` (0.17.4).
   - **Security Layer:** Custom Express middleware (`security-middleware.cjs`) providing request token validation (`X-Spoko-Auth`), proctoring session checks, answer persistence, and server-side exam scoring.
   - **Database Architecture:** Flat JSON file database (`db.json` and `backend/db.json`).

3. **Multi-Platform Deployment Targets:**
   - **Mobile (Android):** Capacitor 8.5.2 native Android wrapper (`com.spoko.portal`) targeting API 36, compiled via Gradle 8.14 and Java 17.
   - **Desktop (Windows):** Electron 44.7 wrapper with custom local HTTP static server and preload bridge.
   - **Cloud API:** Render web service deployment configuration (`render.yaml`).

---

## B. Total Test Cases Executed
A total of **42 test cases** were planned and evaluated across functional, integration, anti-cheating, security, and release build suites:
- **Total Test Cases Executed:** 42

---

## C. Passed Test Cases
- **Passed Test Cases Count:** 36
- Automated Node.js test suite (`npm test`): **16 / 16 passed** across 4 test suites:
  - Security utilities (bcrypt hashing, verification, policy validation, password generator): 5/5 passed.
  - Document parser (question numbering, option extraction, auto-key detection): 2/2 passed.
  - Database schema integrity (collection validation, user roles): 3/3 passed.
  - Backend API integration (health check, token access, preflight CORS, exam checks): 6/6 passed.
- Native Android JUnit test suite (`gradlew test`): **Passed (106 tasks executed)**.
- Frontend production bundle build (`npm run build`): **Passed**.
- Native Android debug APK build (`gradlew assembleDebug`): **Passed (`Spoko_Academy_Portal.apk`, 8.28 MB)**.

---

## D. Failed Test Cases
- **Failed Test Cases Count:** 4
  - **TC-EXAM-08 (Question Parser Truncation):** Consecutive questions 2-4 swallowed into Question 1. *(Resolved and verified)*.
  - **TC-ADMIN-06 (Routing Dead Page):** `/admin/activity` rendered `AuditLogs` instead of `Activity`. *(Resolved and verified)*.
  - **TC-SEC-03 (Token Hardcoding):** Master private access token embedded in frontend bundle. *(Documented architectural fix)*.
  - **TC-SEC-04 (Client-Side Auth):** User database downloaded to browser for client-side password verification. *(Documented architectural fix)*.

---

## E. Blocked or Untested Cases
- **Blocked Cases Count:** 2
  - **TC-BUILD-06 (iOS Archive Build):** Blocked due to Windows host operating system. Generating `.xcarchive` and `.ipa` requires macOS with Xcode 15/16.
  - **TC-BUILD-07 (Apple Developer Provisioning):** Blocked due to absence of Apple Developer account credentials and uninitialized iOS directory in Capacitor.

---

## F. Critical Bugs

### Finding CRIT-01: Client-Side Authentication & Database Credential Exposure
- **Severity:** **CRITICAL**
- **Affected File:** `src/context/AuthContext.jsx` (Lines 33, 92), `src/pages/Login.jsx` (Line 50)
- **Reproduction Steps:**
  1. Open the portal in any web browser without logging in.
  2. Open Developer Tools (Network Tab).
  3. Enter any text into the User ID field and click Login or "Forgot Password".
  4. Inspect the outgoing request to `GET /users`.
- **Root Cause:**
  The frontend directly queries the backend `json-server` endpoint `/users` to retrieve all registered accounts, comparing bcrypt password hashes in client-side JavaScript.
- **Recommended Fix:**
  Implement a dedicated server-side endpoint `POST /api/auth/login` that verifies credentials against the database on the server and issues a signed, role-bound JWT token.
- **Verification Status:** Architectural Remediation Specified.

---

### Finding CRIT-02: Hardcoded Master Access Token in Frontend Bundle
- **Severity:** **CRITICAL**
- **Affected File:** `src/services/api.js` (Line 15), `backend/security-middleware.cjs` (Line 50)
- **Reproduction Steps:**
  1. Inspect `src/services/api.js` line 15 or search the built bundle in `dist/assets/index-*.js` for `spoko_academy_private_access_token_8899`.
  2. Send an HTTP request with header `X-Spoko-Auth: spoko_academy_private_access_token_8899` to any REST endpoint (e.g. `PATCH /users/admin` or `DELETE /results/1`).
- **Root Cause:**
  A shared static secret string is compiled into the client-side JavaScript bundle and validated as the sole access control mechanism by the backend middleware.
- **Recommended Fix:**
  Remove the static shared key and enforce user session tokens (JWT or HTTP-only cookies) verified on each request.
- **Verification Status:** Architectural Remediation Specified.

---

## G. Security Vulnerabilities

### Finding SEC-01: Insecure CORS Reflection Allowing Credentials
- **Severity:** **HIGH**
- **Affected File:** `backend/server.js` (Lines 22-32)
- **Root Cause:**
  `Access-Control-Allow-Origin: req.headers.origin` combined with `Access-Control-Allow-Credentials: true` reflects arbitrary origins and allows credentials, enabling cross-origin data extraction.
- **Recommended Fix:** Whitelist specific trusted origins (`https://spoko-academy.edu`, `capacitor://localhost`, etc.).
- **Verification Status:** Documented in `SECURITY_AUDIT.md`.

---

### Finding SEC-02: Insecure Electron Renderer Isolation
- **Severity:** **HIGH**
- **Affected File:** `electron/main.cjs` (Line 108)
- **Root Cause:** `contextIsolation: false` allowed renderer window scripts to access Electron internals.
- **Recommended Fix:** Set `contextIsolation: true` and expose APIs via `contextBridge.exposeInMainWorld`.
- **Verification Status:** **FIXED & VERIFIED**.

---

### Finding SEC-03: Cleartext HTTP Allowed on Android Native App
- **Severity:** **HIGH**
- **Affected File:** `android/app/src/main/AndroidManifest.xml` (Line 10), `capacitor.config.json` (Line 7)
- **Root Cause:** `android:usesCleartextTraffic="true"` and `"cleartext": true` permitted unencrypted HTTP traffic.
- **Recommended Fix:** Enforce `usesCleartextTraffic="false"` and `"cleartext": false`.
- **Verification Status:** **FIXED & VERIFIED**.

---

## H. Performance Issues

### Finding PERF-01: Monolithic 2.5 MB JavaScript Initial Bundle
- **Severity:** **LOW / PERFORMANCE RISK**
- **Affected File:** `vite.config.js`, `src/App.jsx`
- **Root Cause:**
  All application modules (Recharts, Mammoth, PDF.js worker, Admin and Student pages) are bundled into a single initial JavaScript bundle (`dist/assets/index-*.js`, 2,506 kB), triggering Vite chunk size warnings.
- **Impact:** Slow initial page load, increased Time to Interactive (TTI), and Largest Contentful Paint (LCP) delays on mobile connections.
- **Recommended Fix:**
  Implement route-based lazy loading with `React.lazy` and `React.Suspense` in `App.jsx`, and configure Rollup `manualChunks` in `vite.config.js`.

---

### Finding PERF-02: Base64 Inline Images in Exams & Avatars
- **Severity:** **MEDIUM**
- **Affected File:** `src/pages/admin/CreateExam.jsx` (Line 173), `src/pages/student/ProfileSettings.jsx` (Line 66)
- **Root Cause:**
  Cropped question images and student profile pictures are saved as inline base64 strings directly in `db.json`.
- **Impact:**
  Causes massive database file bloat (e.g. 50 MB payloads), slowing down all JSON read/write operations and creating memory pressure on low-end Android devices.
- **Recommended Fix:** Store images in an object storage bucket (e.g. Cloud Storage, AWS S3, or local static uploads folder) and reference the URL.

---

## I. UI/UX Issues

### Finding UI-01: Timezone Shift in Leave Approval
- **Severity:** **MEDIUM**
- **Affected File:** `src/pages/admin/LeaveManagement.jsx` (Line 54)
- **Root Cause:**
  Using `d.toISOString().split('T')[0]` converted midnight local timestamps to the previous day in UTC+ timezones.
- **Recommended Fix:** Use local date construction (`getFullYear`, `getMonth`, `getDate`).
- **Verification Status:** **FIXED & VERIFIED**.

---

### Finding UI-02: Question Parser Truncation on Numbered Questions
- **Severity:** **HIGH**
- **Affected File:** `src/utils/questionParser.js` (Line 87)
- **Root Cause:**
  The regex `/^[1-4][\.\)]/` misclassified questions numbered 2, 3, or 4 as options belonging to Question 1.
- **Recommended Fix:** Added state tracking (`hasFinishedOptions` and `usesNumericOptions`).
- **Verification Status:** **FIXED & VERIFIED (Automated test passed)**.

---

## J. Google Play Compliance Findings

1. **Target SDK Level (API 36 Blocker):**
   - `android/variables.gradle` sets `targetSdkVersion = 36`. Play Console rejects developer preview SDKs for production releases.
   - **Required Action:** Set `targetSdkVersion = 35` and `compileSdkVersion = 35`.
2. **Cleartext Traffic (Remediated):**
   - Cleartext HTTP disabled in both `AndroidManifest.xml` and `capacitor.config.json`.
3. **Privacy Policy (Remediated In-App):**
   - Added in-app Privacy Policy route `/privacy-policy` and component `PrivacyPolicy.jsx`.
   - **Required Action:** Host on public URL and paste into Play Console metadata.
4. **Account Deletion (Remediated In-App):**
   - Integrated account deletion request flow in `ProfileSettings.jsx`.
5. **App Bundle & Signing (Action Required):**
   - Must generate release AAB (`gradlew bundleRelease`) with production upload keystore.

---

## K. Apple App Store Compliance Findings

1. **Platform Readiness:**
   - Capacitor iOS platform not initialized. Requires macOS with Xcode 15/16. Run `npm run build && npx cap add ios`.
2. **App Completeness (Guideline 2.1):**
   - Dead route on `/admin/activity` resolved.
3. **In-App Account Deletion (Guideline 5.1.1(v)):**
   - Implemented in `ProfileSettings.jsx`.
4. **Privacy Manifest (`PrivacyInfo.xcprivacy`):**
   - Must declare Required Reason APIs for `UserDefaults` upon iOS project generation.
5. **Sign in with Apple (Guideline 4.8):**
   - Not required because no social logins are used.

---

## L. Fixed Issues
1. **BUG-003:** Question Parser truncated questions 2-4 into Question 1 (`src/utils/questionParser.js`). Fixed & unit tested.
2. **BUG-004:** Route `/admin/activity` rendered `AuditLogs` instead of `Activity` (`src/App.jsx`). Fixed.
3. **BUG-005:** Electron BrowserWindow `contextIsolation: false` (`electron/main.cjs`). Hardened to `true`.
4. **BUG-006:** Cleartext traffic allowed on Android (`AndroidManifest.xml`, `capacitor.config.json`). Disabled.
5. **BUG-008:** Missing in-app Privacy Policy. Created `src/pages/PrivacyPolicy.jsx` and added route.
6. **BUG-009:** Missing account deletion mechanism. Created in-app deletion request in `ProfileSettings.jsx`.
7. **BUG-010:** Timezone date shift in Leave Management auto-attendance (`LeaveManagement.jsx`). Fixed.
8. **BUG-011:** Hardcoded phone number and leaked OTP in `SimVerificationModal.jsx`. Sanitized.
9. **BUG-012:** Missing ESLint configuration and missing test script in `package.json`. Added `.eslintrc.cjs` and `"test": "node --test tests/*.test.mjs"`.
10. **BUG-013:** Maintenance scripts path resolution in `scripts/clear_db.cjs` and `clear_announcements.cjs`. Fixed.

---

## M. Remaining Issues
1. **CRIT-01 & CRIT-02 (Backend Authentication & Access Control):**
   Migrate client-side authentication and static master key to server-side JWT authentication endpoint.
2. **SEC-01 (CORS Origin Restriction):**
   Replace origin reflection with an explicit whitelist in `backend/server.js`.
3. **SEC-06 (Database in Git History):**
   Scrub historical git commits containing `db.json` snapshots and add `db.json` to `.gitignore`.
4. **PERF-01 (Code Splitting):**
   Introduce `React.lazy` for admin and student sub-routes to split the 2.5 MB monolithic bundle.
5. **STORE-01 (Play Store Target SDK):**
   Change `targetSdkVersion` from 36 to 35 in `android/variables.gradle` prior to Play Console upload.

---

## N. Build and Release Validation
- **Vite Web Production Build:**
  - Command: `npm run build`
  - Result: **SUCCESSFUL (built in 38.3s, 2,653 modules transformed)**.
- **Node.js Automated Test Suite:**
  - Command: `npm test`
  - Result: **SUCCESSFUL (16 passed, 0 failed across 4 test suites)**.
- **Android Gradle Unit Tests:**
  - Command: `cd android && .\gradlew.bat test`
  - Result: **SUCCESSFUL (106 actionable tasks executed)**.
- **Capacitor Android Synchronization:**
  - Command: `npx cap sync android`
  - Result: **SUCCESSFUL (synced assets in 1.2s)**.
- **Native Android APK Build:**
  - Command: `cd android && .\gradlew.bat assembleDebug`
  - Result: **SUCCESSFUL (`Spoko_Academy_Portal.apk`, 8,284,199 bytes)**.

---

## O. Recommended Next Steps
1. **Deploy Server-Side Auth API:** Replace `json-server` client-side authentication with a secure Express/Node authentication route (`/api/auth/login`) that returns signed HTTP-only JWT cookies.
2. **Target SDK Adjustment:** Update `targetSdkVersion = 35` in `android/variables.gradle` for production Google Play submission.
3. **Generate Production Android App Bundle (AAB):**
   Generate a release keystore and execute `cd android && .\gradlew.bat bundleRelease` to create the production AAB.
4. **Publish Privacy Policy URL:** Deploy `PrivacyPolicy.jsx` to a publicly accessible HTTPS URL and register it in Google Play Console and App Store Connect.
5. **iOS Platform Build on macOS:** Clone the repository to a macOS machine with Xcode 15/16, execute `npx cap add ios`, configure signing certificates, and upload an archive to TestFlight.
