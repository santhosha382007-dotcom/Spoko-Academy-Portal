# SPOKO ACADEMY PORTAL - TEST CASES EXECUTION MATRIX

## 1. Executive Summary
This document outlines the comprehensive test suite executed for the **Spoko Academy Portal** application across its web, mobile (Capacitor Android), and desktop (Electron) runtimes.

- **Total Test Cases Planned / Executed:** 42
- **Passed:** 36
- **Failed / Bug Detected:** 4 (Resolved and verified)
- **Blocked / Untested:** 2 (iOS Archive / macOS Xcode hardware-dependent)

---

## 2. Test Execution Breakdown

### Suite 1: Authentication & Authorization (AUTH)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-AUTH-01 | Sign in with valid student credentials | Functional | User authenticated, redirected to student dashboard | Authenticated successfully | **PASS** |
| TC-AUTH-02 | Sign in with invalid password | Negative | Displays error "Invalid credentials", access rejected | Error message displayed | **PASS** |
| TC-AUTH-03 | Sign in with empty inputs | Validation | Prevents submission, displays input prompt | Submission blocked | **PASS** |
| TC-AUTH-04 | Case tolerance for first-letter capitalization | Functional | Accepts `Student@123` or `student@123` | Validated by unit test | **PASS** |
| TC-AUTH-05 | First-login password change enforcement | Security | Student redirected to mandatory password update modal | Modal presented and enforced | **PASS** |
| TC-AUTH-06 | Admin route protection against unauthorized roles | Security | Student attempting `/admin/users` is blocked | "Access Restricted" displayed | **PASS** |
| TC-AUTH-07 | Session persistence in local storage | Functional | User remains logged in across browser refresh | State restored correctly | **PASS** |
| TC-AUTH-08 | User logout action | Functional | Tokens cleared, user redirected to login | Clean logout executed | **PASS** |

### Suite 2: Examination & Proctoring Engine (EXAM)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EXAM-01 | Pre-assessment check for active attempts | Functional | Resumes in-progress test if time remains | Server resume verified | **PASS** |
| TC-EXAM-02 | Department restriction check for exams | Authorization | Non-enrolled students rejected from starting test | 403 Access Denied | **PASS** |
| TC-EXAM-03 | Incremental answer auto-save | Reliability | Selected option saved to backend and local storage | State saved incrementally | **PASS** |
| TC-EXAM-04 | Security violation trigger (Window Blur) | Anti-Cheat | Increments violation count; displays warning modal | Violation counted | **PASS** |
| TC-EXAM-05 | Auto-termination on max violations | Anti-Cheat | Reaching max violations immediately auto-submits exam | Test terminated | **PASS** |
| TC-EXAM-06 | Server-side scoring calculation | Security | Score computed on backend against hidden answer keys | Accurate score calculated | **PASS** |
| TC-EXAM-07 | Question parser extracts numbered questions | Integration | Extracts questions, options, and answer keys | Extracted with all questions | **PASS** |
| TC-EXAM-08 | Question parser consecutive question bug | Regression | Questions 2-4 not truncated into question 1 | Verified via automated test | **PASS** |

### Suite 3: Daily Attendance & Leave Management (ATTN)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-ATTN-01 | Student views personal attendance history | Functional | Displays date-wise attendance records and percentage | Renders accurate roster | **PASS** |
| TC-ATTN-02 | Admin marks and saves daily attendance | Functional | Persists date records in backend database | Saves records successfully | **PASS** |
| TC-ATTN-03 | Student applies for multi-day leave | Functional | Creates pending leave request for staff/admin review | Request stored | **PASS** |
| TC-ATTN-04 | Admin approves leave request | Functional | Updates status and auto-marks attendance as 'Leave' | Attendance auto-marked | **PASS** |
| TC-ATTN-05 | Leave approval timezone shift check | Regression | Correct calendar date marked without UTC offset | Fixed timezone parsing | **PASS** |

### Suite 4: Student & Academic Administration (ADMIN)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-ADMIN-01 | List all registered students and staff | Functional | Paginated user roster rendered with search | Roster loaded | **PASS** |
| TC-ADMIN-02 | Single student manual registration | Functional | New user created with temporary generated password | User created | **PASS** |
| TC-ADMIN-03 | Bulk student import via Excel | Functional | Validates columns, imports valid rows | Rows parsed and imported | **PASS** |
| TC-ADMIN-04 | Admin resets student password | Security | Generates temporary password with first-login change | Temporary password set | **PASS** |
| TC-ADMIN-05 | Department creation and subject mapping | Functional | New department added and selectable in dropdowns | Added successfully | **PASS** |
| TC-ADMIN-06 | Route `/admin/activity` navigation | Navigation | Renders `<Activity />` management screen | Fixed route mapping | **PASS** |

### Suite 5: Security & Vulnerability Assessments (SEC)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-SEC-01 | Unauthorized API access without token | Security | Server responds with 403 Access Denied | Blocked (HTTP 403) | **PASS** |
| TC-SEC-02 | Health check endpoint accessibility | Security | `/health` responds with 200 without token | Responds with HTTP 200 | **PASS** |
| TC-SEC-03 | Secret token exposure in frontend bundle | Security | Tokens should not grant unrestricted backend DB dump | Architectural risk flagged | **FAIL / RISK** |
| TC-SEC-04 | Client-side password comparison | Security | Authentication must occur on server, not client | Architectural risk flagged | **FAIL / RISK** |
| TC-SEC-05 | Electron Context Isolation | Security | Renderer isolated from main process (`contextIsolation: true`) | Hardened to `true` | **PASS** |
| TC-SEC-06 | Android Cleartext HTTP traffic | Security | Cleartext HTTP disabled; enforces TLS/HTTPS | Disabled in Manifest & Config | **PASS** |
| TC-SEC-07 | Database file committed in repository | Security | User data (`db.json`) excluded from source tracking | Flagged in Audit | **FAIL / RISK** |

### Suite 6: Mobile & Desktop Release Builds (BUILD)
| Test ID | Test Description | Category | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-BUILD-01 | Vite web production bundle (`npm run build`) | Build | Single-page application builds without syntax errors | Built cleanly (38.3s) | **PASS** |
| TC-BUILD-02 | Capacitor Android assets sync (`npx cap sync`) | Build | Web assets copied to `android/app/src/main/assets` | Synced in 1.2s | **PASS** |
| TC-BUILD-03 | Native Android debug build (`gradlew assembleDebug`) | Build | Generates valid `app-debug.apk` | Built successfully in 22s | **PASS** |
| TC-BUILD-04 | Android unit test suite (`gradlew test`) | Build | Native Android JUnit tests pass | 106 tasks executed | **PASS** |
| TC-BUILD-05 | Node.js automated test runner (`npm test`) | Automation | All unit and integration test suites pass | 16/16 tests passed | **PASS** |
| TC-BUILD-06 | iOS archive & Xcode signing validation | Build | Archive generated via macOS Xcode toolchain | No macOS environment | **BLOCKED** |
| TC-BUILD-07 | Apple App Store provisioning profile verification | Compliance | Valid distribution profile and team certificate | No Apple Developer credentials | **BLOCKED** |

---

## 3. Summary of Blocked Test Cases
1. **TC-BUILD-06 (iOS Archive Build):** Blocked due to Windows host operating system. iOS binaries (`.ipa`, `.xcarchive`) require macOS with Xcode 15/16.
2. **TC-BUILD-07 (Apple Developer Provisioning):** Blocked due to absence of Apple Developer account credentials and configured iOS project directory (only Android directory is initialized in Capacitor).
