# NEXORA

**Architectural focus timer, daily time-block planner, and local-first productivity workspace for Web, PWA, and Android.**

![License: MIT](https://img.shields.io/badge/License-MIT-8B5CF6.svg?style=flat-square)
![Platform: Web | PWA | Android](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Android-06B6D4.svg?style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=070B19)
![Capacitor 8](https://img.shields.io/badge/Capacitor-8-119EFF.svg?style=flat-square&logo=capacitor&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)

<!--
  After pushing to GitHub, replace YOUR_USERNAME/YOUR_REPO below to activate live CI & Release badges:
  [![Web CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/web-ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/web-ci.yml)
  [![Android APK Build](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-android-apk.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-android-apk.yml)
  [![Latest Release](https://img.shields.io/github/v/release/YOUR_USERNAME/YOUR_REPO?label=Android%20APK&color=8B5CF6&style=flat-square)](https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest)
-->

---

## Download Android APK

Every push to `main` and every version tag (`v*`) automatically compiles and publishes installable Android builds via GitHub Actions:

1. Open the **[Releases](../../releases)** tab in this repository.
2. Under **Latest Release** (`latest-apk` or the newest `v*` tag), download **`nexora-v1.0.0-debug.apk`** (or **`nexora-v1.0.0-release-signed.apk`** when release signing secrets are configured).
3. Tap the downloaded `.apk` on your Android phone and allow installation from your browser/files app.

> Want to build locally in Android Studio or configure Google Play Store `.aab` signing? See **[ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)**.

---

## Core Features

- **Dashboard & Daily Command Center:** Real-time daily execution overview, priority tasks, active goals, focus momentum, and one-click starter data cleanup.
- **Tasks & Subtasks:** Priority tiers, due dates, tags, filtering, and instant completion feedback.
- **Calendar & Time-Blocking:** Architectural daily/weekly time blocks synced seamlessly with your focus workflow.
- **Goals & Milestones:** Long-term goal tracking with milestone breakdowns and progress rings.
- **Focus Pomodoro Timer:** Deep-work focus sessions, break intervals, session history, tactile native haptics, and Android local notifications.
- **Notes Workspace:** Fast structured note-taking with search and tagging.
- **Analytics & History:** Focus velocity, completion streaks, and historical productivity insights.
- **Offline-First + Cloud Recovery:** Powered by local IndexedDB persistence, full PWA offline caching, JSON import/export, and optional Google Drive Cloud Backup & Recovery.
- **Native Android Integration (Capacitor 8):** Adaptive launcher icons, Material You monochrome icon, Android 12+ SplashScreen branding, Android 13+ notification permissions, native haptics, status bar theming, keyboard resize, and native preferences storage.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Motion, Lucide Icons |
| Persistence | Local-first IndexedDB, Capacitor Preferences, Firebase Auth & Google Drive Backup |
| PWA | `vite-plugin-pwa` (Workbox offline precaching & installable manifest) |
| Android Native | Capacitor 8 (`app.nexora.productivity`), Android SDK 36 (minSdk 24), Gradle 8.14 |
| Automation | GitHub Actions (Web CI + Android Debug APK, Release APK & Play Store AAB Releases) |

---

## Quick Start

### Prerequisites
- **Node.js 20+** and **npm**
- *(Optional, for local Android builds)* **JDK 21** and **Android Studio** with Android SDK 36

### Run Web App Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Verify TypeScript & Production Build
```bash
npm run lint
npm run build
```

### Build Android APK Locally
```bash
# Sync web build into native android/ project
npm run cap:sync

# Compile installable Debug APK
npm run android:apk:debug

# Or open in Android Studio
npm run cap:open:android
```

---

## Automated GitHub Workflows

| Workflow | Trigger | Output |
| --- | --- | --- |
| **Web CI** | Push to `main`/`master`, Pull Requests | Verifies `tsc --noEmit` and production Vite + PWA build |
| **Build NEXORA Android APK & AAB** | Push to `main`/`master`, Tags (`v*`), Manual Dispatch | Compiles Debug APK, Release APK, and Play Store AAB; uploads Artifacts and publishes directly to **GitHub Releases** |

### Enabling Signed Release APKs & Play Store AABs in CI
Add these four secrets under **Repository Settings → Secrets and variables → Actions**:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Full step-by-step instructions are documented in **[ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)**.

---

## Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** before opening a pull request.

## License

Released under the **[MIT License](./LICENSE)**.
