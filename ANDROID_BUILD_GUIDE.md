# NEXORA Android APK & Play Store Build Guide (A to Z)

This project is pre-configured with **Capacitor 8**, a complete native **`android/` Gradle project**, adaptive launcher icons, Android 12+ splash branding, Android 13+ notification permissions, native haptics/storage/status-bar/keyboard plugins, and an **automated GitHub Actions Cloud APK builder**.

- **Application ID:** `app.nexora.productivity`
- **App Name:** `NEXORA`
- **Target / Compile SDK:** Android 16 (API 36), Minimum SDK: Android 7.0 (API 24)
- **Bundled Native Plugins:** `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/local-notifications`, `@capacitor/preferences`, `@capacitor/splash-screen`, `@capacitor/status-bar`

---

## Path A: Cloud APK Build via GitHub Actions & Direct GitHub Releases (No Android Studio Needed)

Get a direct clickable `.apk` from GitHub's cloud servers in ~3 minutes:

1. **Push this repository to GitHub** (via AI Studio's **GitHub** export button or `git push -u origin main`).
2. **Wait ~3 minutes** for the automatic **`Build NEXORA Android APK & AAB`** workflow in the **Actions** tab to complete with a green checkmark.
3. **Download your APK directly from GitHub Releases** (no unzipping required!):
   - Open the **Releases** tab on the right side of your GitHub repository.
   - Click **`nexora-v1.0.0-debug.apk`** under **Latest Release (`latest-apk`)** to download the raw `.apk` straight onto your Android phone.
   - *(The same Debug APK, Release APK, and Play Store `.aab` are also uploaded under **Actions → Artifacts**.)*
4. **Install on your Android phone**:
   - Tap the downloaded `nexora-v1.0.0-debug.apk`, allow **Install unknown apps** if prompted, and tap **Install**.

---

## Path B: Build Locally with Android Studio or Gradle CLI

### Prerequisites
- **Node.js 20+**
- **JDK 21 (Temurin / OpenJDK 21)**
- **Android Studio (Ladybug or newer)** with Android SDK Platform 36 installed

### Step-by-Step Commands
```bash
# 1. Install web + Capacitor dependencies
npm install

# 2. Build the production web app and sync assets into android/
npm run cap:sync

# 3A. Build an installable Debug APK directly from CLI
npm run android:apk:debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# 3B. Or open the native project in Android Studio
npm run cap:open:android
```

Inside Android Studio, you can also run **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** or click **Run** on a connected USB Android device / emulator.

---

## Path C: Signed Release APK & Google Play Store AAB

To publish on Google Play or distribute a signed Release APK, generate your private signing keystore once and keep it safe forever.

### 1. Generate a Release Keystore
```bash
keytool -genkey -v \
  -keystore android/nexora-release.jks \
  -alias nexora \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 2A. Local Release Build (`android/keystore.properties`)
Copy `android/keystore.properties.example` to `android/keystore.properties` (automatically gitignored) and fill in your passwords:
```properties
storeFile=../nexora-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=nexora
keyPassword=YOUR_KEY_PASSWORD
```
Then build your signed Release APK and Play Store AAB:
```bash
npm run android:apk:release
# Output: android/app/build/outputs/apk/release/app-release.apk

npm run android:aab:release
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 2B. Automated Signed Builds in GitHub Actions
Convert your keystore to base64:
```bash
base64 -w 0 android/nexora-release.jks
```
In your GitHub repository, go to **Settings -> Secrets and variables -> Actions -> New repository secret** and add these 4 secrets:
- `ANDROID_KEYSTORE_BASE64`: the base64 output from above
- `ANDROID_KEYSTORE_PASSWORD`: your keystore password
- `ANDROID_KEY_ALIAS`: `nexora`
- `ANDROID_KEY_PASSWORD`: your key password

Every future push to `main` or git tag (`git tag v1.0.0 && git push origin v1.0.0`) will automatically produce a signed `nexora-v1.0.0-release-signed.apk` and Play Store `nexora-v1.0.0-release.aab`!

---

## Optional: Firebase & Google Drive Cloud Sync in Signed APKs
- All local workspace features (Tasks, Goals, Calendar, Notes, Focus Pomodoro, Analytics, IndexedDB offline storage, local JSON export/import, native haptics & notifications) work **100% offline** in the APK out of the box.
- If you enable Firebase Auth / Google Drive Backup inside your signed Android APK, add your release keystore's SHA-1 fingerprint to your Firebase / Google Cloud OAuth Android client (`app.nexora.productivity`):
  ```bash
  keytool -list -v -keystore android/nexora-release.jks -alias nexora
  ```
