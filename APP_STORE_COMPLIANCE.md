# APPLE APP STORE COMPLIANCE & READINESS AUDIT

## 1. Executive Summary
This audit evaluates the **Spoko Academy Portal** against the latest **Apple App Review Guidelines** for submission to the Apple App Store.

- **Current iOS Target Status:** **NOT INITIALIZED / BLOCKED**
- **Hardware Requirement:** macOS environment with Xcode 15/16 is required to compile, sign, and validate an iOS archive (`.ipa`).
- **Capacitor Status:** The current repository only contains the `android/` native platform. To target iOS, `npx cap add ios` must be executed within an Apple macOS developer environment.

---

## 2. Apple App Review Guidelines Assessment

### Guideline 2.1: App Completeness
- **Policy:**
  Submissions containing placeholder content, broken links, non-functional buttons, or dead routes are rejected immediately under Guideline 2.1.
- **Findings & Status:**
  - Route mismatch on `/admin/activity` (which was rendering `<AuditLogs />`) has been **remediated**.
  - Maintenance scripts and question parser bugs have been **remediated**.
  - Notification toggles in `ProfileSettings.jsx` currently only manipulate local component state and do not persist to the cloud backend. This must be connected to user profile settings or marked as local device preferences to prevent reviewer rejection.

---

### Guideline 5.1.1: Data Collection & Storage (Privacy Policy)
- **Policy:**
  All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app itself in an easily accessible manner.
- **Status:** **REMEDIATED IN-APP / ACTION REQUIRED IN CONNECT**
  - Added in-app `PrivacyPolicy.jsx` route accessible at `/privacy-policy`.
  - Added Privacy Policy links on the Landing Page, Login, and Profile Settings screens.
  - **Action Required:** Provide the hosted URL in the "Privacy Policy URL" field in App Store Connect.

---

### Guideline 5.1.1(v): In-App Account Deletion
- **Policy:**
  Apps that support account creation must also offer account deletion within the app. The deletion option must be easy to locate.
- **Status:** **REMEDIATED**
  - Integrated an in-app "Request Account Deletion" workflow in `ProfileSettings.jsx` under the Security tab.

---

### Guideline 5.1.2: Privacy Manifests & Required Reason APIs (2024 Requirement)
- **Policy:**
  Apple mandates that apps and common third-party SDKs bundle a `PrivacyInfo.xcprivacy` manifest declaring the usage of Required Reason APIs (e.g., File timestamp APIs, System boot time, Disk space, User defaults).
- **Finding:** **ACTION REQUIRED UPON IOS INITIALIZATION**
  When initializing the iOS project via `npx cap add ios`, ensure `ios/App/App/PrivacyInfo.xcprivacy` is generated and declares:
  - `NSPrivacyAccessedAPITypes` for `UserDefaults` (used by Capacitor plugins).
  - Accurate data collection categories corresponding to Student Contact Info, User ID, and Performance Data.

---

### Guideline 4.8: Sign in with Apple
- **Policy:**
  Apps that use a third-party or social login service (such as Google Sign-In, Facebook Login, or Apple ID) must offer Sign in with Apple as an equivalent option.
- **Finding:** **NOT APPLICABLE / COMPLIANT**
  Spoko Academy Portal exclusively utilizes institutional Student ID / Mobile and password authentication. No third-party social logins are integrated, exempting the application from mandatory Sign in with Apple.

---

### Guideline 3.1.1: In-App Purchase (IAP)
- **Policy:**
  Digital goods, subscriptions, and educational course unlocking must use Apple In-App Purchase unless the app qualifies as a multiplatform service or reader app where digital content is purchased outside the app (e.g. enterprise university tuition).
- **Finding:** **COMPLIANT**
  The portal does not sell digital goods, courses, or exam attempts. It functions strictly as an enterprise institutional portal for registered academy students.

---

## 3. Platform Limitations & iOS Architectural Distinctions

### Fullscreen & Proctoring Restrictions on iOS (WebKit / Safari)
- **Technical Restriction:**
  On iOS, Apple’s WebKit engine does not support `document.documentElement.requestFullscreen()` on iPhones in standard browser/WebView contexts. Fullscreen API is only supported for iPad or HTML5 video elements.
- **Impact on ExamTaker:**
  In `src/pages/student/ExamTaker.jsx`, calling `requestFullscreen()` on iPhone devices will fail silently or throw a handled error.
- **Distinction:**
  This is an inherent platform architectural constraint of iOS WebKit, not an application code bug. The `try/catch` block in `ExamTaker.jsx` correctly catches and prevents runtime crashes, allowing the exam to proceed.

---

## 4. Next Steps for iOS Release
1. Transfer codebase to a macOS machine with Xcode 15/16 installed.
2. Run `npm run build && npx cap add ios`.
3. Open `ios/App/App.xcworkspace` in Xcode.
4. Configure App Signing & Capabilities (select development team and bundle identifier).
5. Add `PrivacyInfo.xcprivacy` manifest.
6. Create an archive via `Product > Archive` and upload to TestFlight for beta verification.
