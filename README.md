# Latent

> Privacy-first, on-device conversation intelligence for real-time tactical guidance.

Latent is a React Native app that helps you during high-stakes conversations (interviews, sales calls, investor discussions, salary negotiations) by transcribing speech locally, detecting negotiation signals, and surfacing tactical suggestions in real time.

---

## What Latent does

- Captures live microphone audio
- Transcribes speech on-device
- Detects persuasion/negotiation patterns
- Shows in-session tactical counter-strategies
- Stores session history locally for replay and analysis

No cloud inference is required for core runtime behavior.

---

## Current AI Runtime Stack

Latent has been migrated to an SDK-independent local inference stack:

- **STT:** `whisper.rn` (whisper.cpp)
- **LLM runtime:** `llama.rn` (llama.cpp)

### Models currently wired

- **Whisper STT model:** `ggml-tiny.en.bin`
- **LLM model:** `LFM2-350M-Q8_0.gguf`

### Notes

- Whisper context is initialized in `ModelService.tsx` and injected into `SpeechService.ts`.
- Audio is chunked (5s), converted to WAV snapshots, and transcribed via Whisper context.
- Silence tokens are stripped and transcript text is forwarded into existing analysis engines.
- TTS model loading is intentionally out of the critical path for now (placeholder/TODO remains).

---

## Architecture Overview

High-level flow:

1. `SpeechService.ts`
   - Live audio capture
   - 5-second chunking
   - WAV snapshot temp file creation
   - Whisper transcription with domain prompt bias
2. `SessionEngine.ts`
   - Receives transcript chunks
   - Runs classifier/analyzer pipeline
   - Produces tactical detections and suggestions
3. `ModelService.tsx`
   - Downloads model files
   - Initializes Whisper/Llama contexts
   - Tracks model readiness/progress
4. Local storage services
   - Persist settings, sessions, and replay data

All existing analytical logic in `src/ai/*` remains algorithmic and local.

---

## Key Project Files

- `src/services/SpeechService.ts`  
  On-device STT bridge using `whisper.rn`, chunking, transcript emission.
- `src/services/ModelService.tsx`  
  Model download/init lifecycle with `whisper.rn` + `llama.rn`.
- `src/services/SessionEngine.ts`  
  Live orchestration and analysis pipeline.
- `src/ai/*`  
  Pattern/intent/scoring/replay engines.

---

## Privacy Model

- Inference runs on-device
- Audio is processed locally
- Transcripts/sessions are stored locally
- No mandatory cloud API for core session flow

---

## Requirements

- Node.js 18+
- React Native 0.83.1 toolchain
- Android Studio / Xcode setup per standard RN environment
- Physical device recommended for realistic audio + model performance

---

## Setup

```bash
npm install
```

### iOS

```bash
cd ios
pod install
cd ..
```

Then run:

```bash
npx react-native run-ios
```

### Android

```bash
npx react-native run-android
```

---

## Development

Start Metro:

```bash
npm start -- --reset-cache
```

---

## Migration Summary (completed)

- Removed previous SDK package dependency lock-in
- Replaced STT runtime with `whisper.rn`
- Replaced LLM runtime with `llama.rn`
- Updated model lifecycle to direct file download/init flow
- Preserved app logic/UI/session behavior while modernizing runtime layer

---

## Troubleshooting

### iOS pods not installed
Run:

```bash
cd ios && pod install
```

### Model not ready in live session
- Ensure model download finished in app flow
- Confirm storage permissions/device storage availability
- Retry model load from session entry path

### Slow transcription
- Use a physical device
- Ensure no heavy background workloads
- Keep device thermals under control (charging + heat can throttle CPU)

---

## Roadmap

- Reintroduce local TTS runtime backend
- Add richer model management (variants, switching)
- Improve multilingual STT support
- Expand LLM-powered tactical generation pathways

---

## License

Internal/proprietary project context unless specified otherwise.