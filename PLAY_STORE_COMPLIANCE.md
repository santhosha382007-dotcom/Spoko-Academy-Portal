# GOOGLE PLAY STORE COMPLIANCE & READINESS AUDIT

## 1. Executive Summary
This audit evaluates the **Spoko Academy Portal** (`com.spoko.portal`) against current official **Google Play Developer Program Policies** and the **Android Core App Quality Guidelines**.

- **Compliance Status:** **SUBMISSION BLOCKED (Remediation Required Prior to Play Console Submission)**
- **Primary Blockers:** Target SDK configuration (API 36), missing release signing configuration, and missing production Privacy Policy URL on web.

---

## 2. Policy-by-Policy Compliance Audit

### 2.1 Target SDK Requirements
- **Play Policy:**
  Google Play requires that all new applications target Android 14 (API level 34) or higher (and Android 15 / API level 35 for upcoming deadlines). Submissions targeting unfinalized or developer preview API levels (API 36) are rejected by Google Play Console automated ingest.
- **Current Configuration:**
  In `android/variables.gradle`:
  ```groovy
  compileSdkVersion = 36
  targetSdkVersion = 36
  minSdkVersion = 24
  ```
- **Finding:** **HIGH RISK / BLOCKER**
  API 36 (Android 16 Developer Preview) is not accepted for production release distribution on Google Play Console.
- **Remediation:**
  Change `targetSdkVersion` and `compileSdkVersion` to `35` (or `34` for maximum compatibility):
  ```groovy
  compileSdkVersion = 35
  targetSdkVersion = 35
  minSdkVersion = 24
  ```

---

### 2.2 Android App Bundle (AAB) Release Readiness
- **Play Policy:**
  Google Play requires new apps to be published as an **Android App Bundle (.aab)** using Google Play App Signing, rather than a monolithic APK.
- **Current Configuration:**
  The project currently builds debug APKs via `gradlew.bat assembleDebug`.
- **Finding:** **ACTION REQUIRED**
  To generate the release AAB for Play Store upload, run:
  ```bash
  cd android && gradlew.bat bundleRelease
  ```

---

### 2.3 64-Bit & 16 KB Memory Page-Size Compatibility
- **Play Policy:**
  Apps utilizing native code (`.so` libraries) must include 64-bit architectures (`arm64-v8a`, `x86_64`) and comply with 16 KB page-size memory alignment introduced in Android 15+.
- **Current Configuration:**
  The project is a hybrid web application powered by Capacitor 8.5.2 running on the system Android System WebView.
- **Finding:** **COMPLIANT**
  No custom C/C++ native shared libraries (`.so`) are bundled in `app/src/main/jniLibs`. Capacitor utilizes system-provided WebView runtimes.

---

### 2.4 Permissions and Sensitive APIs
- **Declared Permissions in `AndroidManifest.xml`:**
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  ```
- **Finding:** **COMPLIANT**
  - No restricted permissions (`CALL_PHONE`, `READ_CALL_LOG`, `READ_SMS`, `ACCESS_FINE_LOCATION`, `MANAGE_EXTERNAL_STORAGE`, or Accessibility Services) are declared in the manifest.
  - Image cropping and avatar selection use the standard Android System Photo Picker (SAF), eliminating the need for broad storage permissions.
  - *Note on Voice Assistant:* If microphone voice recognition is enabled in `AIAssistant.jsx`, `<uses-permission android:name="android.permission.RECORD_AUDIO" />` must be declared and requested with a prominent runtime disclosure dialog.

---

### 2.5 Cleartext Network Traffic
- **Play Policy:**
  Google Play strongly discourages unencrypted HTTP traffic. Cleartext traffic enables man-in-the-middle attacks on public networks.
- **Status:** **REMEDIATED**
  - `android:usesCleartextTraffic="false"` set in `AndroidManifest.xml`.
  - `"cleartext": false` set in `capacitor.config.json`.
  - All API traffic routes over HTTPS (`https://spoko-academy-portal-2.onrender.com`).

---

### 2.6 Privacy Policy & Data Safety Declaration
- **Play Policy:**
  All applications handling personal user data (names, email addresses, phone numbers, student IDs, academic results) must provide:
  1. A valid Privacy Policy URL on the Google Play Store listing.
  2. A direct, accessible Privacy Policy link within the application.
  3. A completed, accurate Data Safety Declaration in Google Play Console.
- **Status:** **REMEDIATED IN-APP / ACTION REQUIRED ON CONSOLE**
  - Added in-app `PrivacyPolicy.jsx` route accessible at `/privacy-policy`.
  - Added Privacy Policy links on the Landing Page, Login, and Profile Settings screens.
  - **Action Required:** Host `PrivacyPolicy.jsx` on a publicly accessible web URL (e.g., `https://spoko-academy-portal-2.onrender.com/privacy-policy`) to submit into Google Play Console.

---

### 2.7 Account Deletion Requirement (Effective 2024 Policy)
- **Play Policy:**
  If an app allows users to create an account, it must provide a mechanism for users to request deletion of their account and data both:
  1. Within the mobile application.
  2. On a public web page accessible without opening the app.
- **Status:** **REMEDIATED IN-APP**
  - Added "Request Account Deletion" flow under `ProfileSettings.jsx` (Security Tab).
  - Outlined deletion procedure and administrative contact in `PrivacyPolicy.jsx`.

---

### 2.8 Deceptive Behavior & Mock SIM Verification
- **Play Policy:**
  Apps must not exhibit misleading behavior or claim device capabilities they do not possess.
- **Finding:** **REMEDIATED & ADVISORY**
  `SimVerificationModal.jsx` simulated mobile SIM carrier detection ("Airtel / Jio GSM Network") without actual telephony hardware bindings. This has been sanitized, but we recommend replacing it with standard SMS OTP or email verification to avoid policy flags.

---

### 2.9 App Signing & Release Configuration
- **Play Policy:**
  Release builds must be signed with a production keystore and protected with Proguard/R8 shrinking.
- **Current Configuration in `android/app/build.gradle`:**
  ```groovy
  buildTypes {
      release {
          minifyEnabled false
          proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      }
  }
  ```
- **Finding:** **ACTION REQUIRED PRIOR TO RELEASE**
  1. Generate a production upload keystore (`upload-keystore.jks`).
  2. Configure `signingConfigs` in `android/app/build.gradle`.
  3. Enable `minifyEnabled true` to strip unused code and obfuscate release binaries.
