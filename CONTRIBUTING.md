# Contributing to NEXORA

Thank you for your interest in contributing to **NEXORA**!

## Development Setup

1. Fork the repository and clone your fork locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local dev server:
   ```bash
   npm run dev
   ```

## Before Opening a Pull Request

Run both local verification checks and confirm they pass with zero errors:

```bash
npm run lint
npm run build
```

If your changes touch Capacitor plugins, native permissions, or mobile platform adapters, also run:

```bash
npm run cap:sync
```

## Pull Request Guidelines

- Keep pull requests focused on a single feature, bug fix, or improvement.
- Follow the existing TypeScript, React, and Tailwind CSS conventions.
- Never commit secrets, `.env` files, `android/keystore.properties`, or `.jks`/`.keystore` signing keys.
- Never commit compiled `.zip` or `.apk` binaries directly into Git history—GitHub Actions builds and publishes release binaries automatically.

## Reporting Issues

Use the provided **Bug Report** or **Feature Request** templates under the **Issues** tab and specify whether you encountered the issue on Web, PWA, or Android APK.
