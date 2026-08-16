# Audiobook Reader

A local-first audiobook reader with a native Android client and a browser client.

## Web app

The web client lives in `web/`. It imports EPUB and text-based PDF files locally, stores the extracted library in IndexedDB, and narrates with voices installed in the browser. Book contents are not uploaded to a server.

Run it locally:

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

Create a production build with `npm.cmd run build`. The workflow in `.github/workflows/pages.yml` publishes `web/dist` to GitHub Pages. In the repository's **Settings → Pages**, the publishing source must be **GitHub Actions**.

Web limitations: scanned PDFs do not yet use OCR, browser background narration is less reliable than Android foreground playback, and the Web Speech API cannot synthesize reusable audio files.

## Current status

The Android project establishes the baseline app structure and architecture required for the requested audiobook workflow:

- Android project with Compose UI
- Material 3 theme
- Room database and data layer stubs
- local settings via DataStore
- domain models for Book, TTS, and content provider abstractions
- architecture documentation in ARCHITECTURE.md
- working Gradle debug build

## Main project files

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [app/build.gradle.kts](app/build.gradle.kts)
- [app/src/main/java/com/example/audiobookreader/MainActivity.kt](app/src/main/java/com/example/audiobookreader/MainActivity.kt)
- [app/src/main/java/com/example/audiobookreader/ui/library/LibraryScreen.kt](app/src/main/java/com/example/audiobookreader/ui/library/LibraryScreen.kt)

## Requirements fulfilled at this stage

- Android project scaffold created
- Kotlin + Compose foundation in place
- Local-only data model and storage abstractions
- Build verified with Gradle

## Known limitations

This is not yet a complete production audiobook reader implementing all EPUB/PDF parsing, OCR, playback queue, background playback, and resume logic from the master specification. Those features require further implementation across multiple phases and a broader development effort.

## Build instructions

1. Install JDK 17.
2. Install Android SDK with platform 36 and Build Tools 34+.
3. Ensure local.properties contains the correct paths:

```properties
org.gradle.java.home=C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot
sdk.dir=C:\Users\Dorota\AppData\Local\Android\Sdk
```

4. Run:

```bash
./gradlew assembleDebug
```

5. APK is generated under:

```text
app/build/outputs/apk/debug/
```

## License note

This project uses official Android libraries and standard open-source dependencies. A full license inventory should be generated during release preparation.
