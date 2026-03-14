# Latent — On-Device Conversation Intelligence Engine

> **Privacy-first, real-time conversation strategy assistant powered entirely by on-device AI. Zero cloud inference. Zero data exfiltration.**

---

## 1) What is Latent?

Latent is a React Native mobile application that listens to live conversations (interviews, sales calls, investor discussions, compensation talks) and provides **real-time tactical guidance** on-device.

It detects negotiation and persuasion signals from speech, classifies intent patterns, and surfaces counter-strategies in real time — all without sending user audio/transcripts to external inference services.

---

## 2) What changed in this migration

This project has been migrated away from the previous SDK-coupled inference stack to an SDK-independent, open ecosystem using native React Native bindings for `whisper.cpp` and `llama.cpp`.

### ✅ Migration outcomes

- Removed prior SDK package dependency lock-in
- Speech-to-text now runs through **`whisper.rn`** (`whisper.cpp`)
- LLM runtime now uses **`llama.rn`** (`llama.cpp`)
- Model loading/downloading is managed directly in app services
- Whisper model format moved from ONNX references to local model-file flow suitable for `whisper.rn`
- Existing app session logic, UI flow, and analytical engines remain intact

---

## 3) Core features

### 3.1 Live Tactical Mode (real-time analysis)

- Captures microphone audio in real time
- Performs on-device transcription via Whisper runtime
- Detects negotiation patterns and tactical signals
- Surfaces the highest-confidence strategy suggestions in-session
- Supports multiple conversation modes with mode-specific weighting/tuning

### 3.2 Pre-session strategic preparation

- User completes a mode-aware intake form
- Generates a personalized strategic plan using local rule/analysis engines
- Can be skipped for immediate session start

### 3.3 Post-session replay and analysis

- Replays transcript with behavioral and tactical analysis
- Computes metrics such as objection handling, leverage capture, and confidence trends
- Provides counterfactual alternatives and response suggestions

### 3.4 Debug/demo mode

- Supports deterministic transcript injection for testing/demo
- Enables end-to-end UI and analyzer validation without live audio

---

## 4) Tech stack (current)

### 4.1 App layer

| Technology | Version | Purpose |
|---|---:|---|
| React Native | 0.83.1 | Cross-platform mobile runtime |
| TypeScript | 5.9.x | Type-safe app logic |
| React Navigation (Stack) | 7.x | Navigation/routing |
| AsyncStorage | 2.x | Local persistence |
| react-native-live-audio-stream | 1.1.1 | Live microphone PCM capture |
| react-native-fs | 2.20.0 | Model and temp file IO |
| react-native-sound | 0.13.0 | Audio playback |
| react-native-svg | 15.x | Data visualizations |
| react-native-linear-gradient | 2.8.x | UI styling |

### 4.2 On-device AI runtimes

| Runtime | Package | Purpose |
|---|---|---|
| Whisper runtime | `whisper.rn` | On-device speech-to-text |
| Llama runtime | `llama.rn` | On-device LLM inference |

### 4.3 Model files

| Model | Runtime | Format | Purpose |
|---|---|---|---|
| `ggml-tiny.en.bin` (Whisper tiny English) | whisper.cpp via `whisper.rn` | native whisper model file | Low-latency English STT |
| `LFM2-350M-Q8_0.gguf` | llama.cpp via `llama.rn` | GGUF | On-device LLM generation |

> TTS model loading was intentionally removed from the critical path in this migration and left as a TODO for a future local TTS backend integration.

---

## 5) Architecture overview

```text
Microphone
  └─> SpeechService
       ├─ live audio stream capture (PCM)
       ├─ 5s chunking
       ├─ WAV snapshot assembly
       └─ whisper context transcribe (prompt-biased)
             └─ transcript sanitization + autocorrect
                   └─ SessionEngine
                         ├─ pattern classification
                         ├─ strategy generation
                         ├─ UI state updates
                         └─ local persistence
```

### Key service roles

- **`SpeechService.ts`**
  - Streaming audio capture
  - Chunk extraction and temporary WAV generation
  - Whisper transcription invocation
  - Silence-token stripping and transcript chunk emission

- **`ModelService.tsx`**
  - Model file download and progress tracking
  - Whisper context initialization (`initWhisper`)
  - Llama context initialization (`initLlama`)
  - Context lifecycle and readiness state
  - Injects whisper context into `SpeechService`

- **AI engines (`src/ai/*`)**
  - Pattern detection, scoring, behavioral analysis, replay logic
  - Remain algorithmic and independent from runtime migration details

---

## 6) STT pipeline details (current)

1. Start recording via live audio stream
2. Buffer incoming PCM frames
3. Every ~5 seconds, build a WAV snapshot in temp storage
4. Transcribe snapshot with whisper context:
   - language: English
   - domain prompt bias enabled for negotiation vocabulary
5. Strip silence markers and pause tokens
6. Emit sanitized transcript chunk into session analysis flow

---

## 7) Privacy and security model

| Principle | Implementation |
|---|---|
| On-device inference | STT/LLM execution happens locally on device |
| No cloud audio upload | Audio/transcripts are not sent to remote inference APIs |
| Local persistence only | Session data stored in local app storage |
| Controlled model fetch | Model files downloaded directly and stored locally |
| Temporary artifact hygiene | Chunk files managed in cache/temp paths and cleaned |

---

## 8) Android/iOS integration notes

### Android

- ABI filters configured for native runtime compatibility:
  - `arm64-v8a`
  - `x86_64`
- Packaging conflict handling retained via `pickFirst` rules where needed

### iOS

- Prior runtime-specific pod references removed
- Native runtime modules rely on standard React Native autolinking + CocoaPods flow
- Run `pod install` after dependency changes in iOS environments

---

## 9) Current constraints and TODOs

- TTS loading is currently a placeholder in model lifecycle (non-critical path)
- Multi-language STT model management remains future work
- Further quality improvements can come from larger whisper models when device constraints permit
- LLM inference wiring can be expanded to deeper strategy generation use-cases

---

## 10) Why this migration matters

- **No backend lock-in**: direct control over local AI stack
- **Model portability**: easier model swaps and experimentation
- **Better maintainability**: simpler, explicit model lifecycle ownership
- **Future-ready**: straightforward extension to hybrid local/remote architectures if needed

---

## 11) Build and run (quick)

```bash
npm install
npm start -- --reset-cache
npx react-native run-android
# iOS:
# cd ios && pod install && cd ..
# npx react-native run-ios
```

---

## 12) Summary

Latent now uses a modern, open on-device inference stack:

- **Speech**: `whisper.rn` + whisper.cpp
- **LLM**: `llama.rn` + llama.cpp

The migration preserves application behavior and analysis workflows while removing prior SDK coupling, making the codebase significantly more flexible for future model and runtime experimentation.