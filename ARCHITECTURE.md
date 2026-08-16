# Audiobook Reader Architecture

## Goals

This project implements a local Android audiobook app that imports EPUB/PDF books, extracts readable text, synthesizes audio locally with Android TTS, persists reading position and playback state, and continues playback in the background.

## High-level architecture

- App layer: Compose screens, navigation, view models, state holders.
- Domain layer: models, repositories, use cases, abstraction of TTS and book providers.
- Data layer: Room database, DataStore preferences, local file storage, importer, BookContentProvider implementations.
- Service layer: foreground playback service using Media3 and media session.

## Module structure

- app
  - src/main/java/com/example/audiobookreader
    - core
    - data
    - domain
    - service
    - ui

## Core principles

1. Local-first processing: all books and generated audio stay inside private app storage.
2. Source-of-truth persistence: Room stores durable book metadata, play position, and generated segments.
3. TTS abstraction: TtsEngine interface decouples the app from Android TTS implementation.
4. Format-specific content providers: EPUB and PDF follow the same shared content model.
5. Background playback service: playback continues when the app is not visible.

## Key interfaces

- BookContentProvider: unified extraction interface for EPUB and PDF.
- TtsEngine: abstraction for text-to-speech generation.
- AudioPlaybackService: foreground service that exposes the current book and playback state.

## Data flow

1. User selects a file using SAF.
2. File is copied to internal app storage.
3. Importer validates MIME and hash.
4. Book metadata is extracted and saved to Room.
5. Content provider builds chapter/segment structure.
6. Audio generation queue creates local files from text segments.
7. Reader/player maps the current audio position to text position and updates highlight.
8. Playback service manages session, notifications, audio focus, and persistence.

## Persistence

- Room database: books, chapters, text segments, audio segments, timings, playback positions.
- DataStore: settings, selected voice, playback speed, last known user preferences.
- App-private files: source book, cover art, extracted OCR/text cache, generated audio.

## Execution sequencing

The implementation follows the required order: foundation, EPUB, TTS, persistence, synchronization, background playback, audiobook UX, audio generation, search, PDF text, OCR, and hardening.
