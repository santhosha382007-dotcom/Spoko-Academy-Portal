# SPOKO ACADEMY PORTAL – AUTHENTICATION & ACCESS CONTROL TEST REPORT

**Report Date:** November 2026  
**Test Harness:** Node.js Native Test Runner (`node --test`), Vite Production Bundler, Gradle Android Test Runner  
**Environment:** Node v24.13.0, OpenJDK 17.0.20, Windows x64  
**Total Tests Executed:** 45 Automated Tests + Production Build Scan + Android Gradle Unit Tests + ESLint  
**Total Tests Passed:** 100% (45 Passed, 0 Failures, 0 Skipped)  

---

## 1. TEST SUITE SUMMARY

| Test Suite | File | Tests Run | Passed | Failed | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Suite 1: Security Utilities** | `tests/audit.test.mjs` | 5 | 5 | 0 | 6,161 ms |
| **Suite 2: JWT Cryptography** | `tests/audit.test.mjs` | 5 | 5 | 0 | 15 ms |
| **Suite 3: Question Parser** | `tests/audit.test.mjs` | 2 | 2 | 0 | 14 ms |
| **Suite 4: Repository Integrity** | `tests/audit.test.mjs` | 2 | 2 | 0 | 5 ms |
| **Suite 5: Backend Auth & RBAC Integration** | `tests/api-integration.test.mjs` | 31 | 31 | 0 | 12,230 ms |
| **Build & Secret Scan** | `vite build` + AST Scanner | 2 | 2 | 0 | 38,400 ms |
| **Android Platform Unit Tests** | `gradlew.bat test` | 106 tasks | 106 | 0 | 81,000 ms |
| **Static Code Linter** | `npm run lint` (ESLint) | Full Repo | 0 errors | 0 | 42,000 ms |

---

## 2. INTEGRATION TEST CASES & EVIDENCE

### Core Authentication Tests
1. **Health Check (`GET /health`):** HTTP 200, status `online`, database `connected` without headers (21.1 ms).
2. **Admin Login (`POST /api/auth/login`):** Valid credentials authenticated on server, returned signed JWT and sanitized profile without password (317.9 ms).
3. **Password Mismatch:** Rejected with HTTP 401 Unauthorized, server logged password mismatch (1578.5 ms).
4. **Non-Existent User:** Rejected with HTTP 401 Unauthorized (12.8 ms).
5. **Session Validation (`GET /api/auth/me`):** Active session validated via Bearer token, returned live sanitized profile (22.6 ms).
6. **Forged / Missing Token:** Rejected with HTTP 401 Unauthorized (13.6 ms).
7. **Direct Database Browsing:** Unauthenticated `GET /users` blocked with HTTP 401 Unauthorized (7.1 ms).

### Staff Role & Negative Authorization Tests
8. **Staff User Listing (`GET /users`):** Scoped exclusively to students in staff member's department; passwords stripped (15.9 ms).
9. **Staff Audit Log Restriction (`GET /audit_logs`):** Blocked with HTTP 403 Forbidden (6.4 ms).
10. **Staff Exam Deletion Restriction (`DELETE /exams/999`):** Blocked with HTTP 403 Forbidden (10.1 ms).
11. **Staff Admin Modification Restriction (`PATCH /users/admin`):** Blocked with HTTP 403 Forbidden (8.9 ms).
12. **Staff Privilege Escalation Restriction (`PATCH /users/12234` with `{ role: 'admin' }`):** Blocked with HTTP 403 Forbidden (12.3 ms).

### Student Role, Negative Authorization & IDOR Tests
13. **Student User Directory Browsing (`GET /users`):** Blocked with HTTP 403 Forbidden (9.4 ms).
14. **Student Account Creation (`POST /users`):** Blocked with HTTP 403 Forbidden (10.6 ms).
15. **Student Audit Log Access (`GET /audit_logs`):** Blocked with HTTP 403 Forbidden (7.4 ms).
16. **Student Exam Creation (`POST /exams`):** Blocked with HTTP 403 Forbidden (6.8 ms).
17. **Student Exam Deletion (`DELETE /exams/1`):** Blocked with HTTP 403 Forbidden (5.7 ms).
18. **Student Direct Result Forgery (`POST /results`):** Blocked with HTTP 403 Forbidden (8.3 ms).
19. **Student Profile IDOR (`PATCH /users/other_student_id_999`):** Blocked with HTTP 403 Forbidden (9.6 ms).
20. **Student Self-Escalation (`PATCH /users/12234` with `{ role: 'admin' }`):** Role field stripped; user verified to remain `student` (37.1 ms).
21. **Student Attendance IDOR (`POST /attendance` with `{ userId: 'other_user' }`):** Blocked with HTTP 403 Forbidden (5.4 ms).
22. **Student Leave Approval (`PUT /leaves/1`):** Blocked with HTTP 403 Forbidden (7.6 ms).
23. **Student Announcements (`POST /announcements`):** Blocked with HTTP 403 Forbidden (5.0 ms).
24. **Student Settings Mutation (`PUT /settings`):** Blocked with HTTP 403 Forbidden (7.0 ms).

### Platform Client Separation Tests
25. **Web Browser Flow:** `POST /api/auth/login` and `GET /api/auth/me` with browser Origin and User-Agent headers authenticated cleanly (310.0 ms).
26. **Android Mobile Flow:** `POST /api/auth/login` and `GET /api/auth/me` with `Origin: capacitor://localhost` and Android Capacitor User-Agent authenticated cleanly (326.5 ms).
27. **Desktop Electron Flow:** `POST /api/auth/login` and `GET /api/auth/me` with Electron Desktop headers authenticated cleanly (306.9 ms).

### Infrastructure, CORS & Secret Scanning Tests
28. **Admin User Listing (`GET /users`):** All users returned, 100% verified to have no password fields (31.1 ms).
29. **CORS Untrusted Origin Rejection:** Rejected with HTTP 403 Forbidden (9.2 ms).
30. **CORS Trusted Origin Acceptance:** Returned HTTP 200 with credentials (6.1 ms).
31. **Source Code Secret Scan:** Recursive AST inspection across `src/` confirmed zero occurrences of legacy master token (60.2 ms).

---

## 3. UNIT TESTS & CRYPTOGRAPHY

* **Bcrypt Password Hashing:** Verified bcrypt hash generation and salted rounds.
* **Password Verification:** Verified matching password validation and case tolerance.
* **Length Validation:** Minimum 6-character length policy enforced.
* **RFC 7519 JWT Signing:** Generated 3-part base64url encoded tokens.
* **JWT Decoding:** Decoded claims accurately (`sub`, `role`, `department`, `exp`).
* **Tampering Detection:** Mutating any signature or payload byte resulted in verification rejection.
* **Expiration Handling:** Tokens with past timestamps rejected.
* **User Sanitization:** Stripped `password` and `oldPassword` from JSON records.
* **Question Parser:** Numbered questions with lettered options parsed accurately.
* **Git Exclusions:** Verified `.gitignore` excludes `db.json` and `backend/db.json`.

---

## 4. PLATFORM BUILDS & LINT VERIFICATION

* **Frontend Build (`npm run build`):** 2,653 modules transformed; output generated in `dist/` in 38.37s.
* **Production Secret Scan:** Clean; 0 hardcoded master tokens in `dist/assets/*.js`.
* **Android Gradle Tests (`gradlew.bat test`):** 106 tasks executed; `BUILD SUCCESSFUL in 1m 21s`.
* **Linter (`npm run lint`):** ESLint passed with 0 errors and 0 warnings (`--max-warnings 0`).

---

## 5. VERIFICATION CONCLUSION

The authentication and authorization architecture has been thoroughly verified through 45 automated tests, proving the elimination of client-side password verification, master token reliance, and unrestricted user database access.
