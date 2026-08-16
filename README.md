# Audiobook Reader

A local-first Android audiobook application skeleton built with Kotlin, Jetpack Compose, Room, DataStore, Media3, and Android TTS abstraction.

## Current status

This project establishes the baseline Android app structure and architecture required for the requested audiobook workflow:

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
