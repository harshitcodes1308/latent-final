# Latent Architecture Flow

> End-to-end architecture and runtime flow for **Latent** (React Native 0.83.1 + TypeScript), with fully on-device STT/LLM execution.

---

## 1) High-Level System View

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  LATENT APP                                 │
│                    (React Native UI + Local AI Runtime)                     │
└──────────────────────────────────────────────────────────────────────────────┘

    User Speech
        │
        ▼
┌──────────────────────┐
│ Device Microphone    │
└─────────┬────────────┘
          │ PCM stream
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SpeechService.ts                                   │
│  - live audio capture                                                       │
│  - 5-second chunking                                                        │
│  - temp WAV snapshot generation                                             │
│  - whisper context transcription via whisper.rn                             │
│  - silence token stripping                                                  │
└─────────┬────────────────────────────────────────────────────────────────────┘
          │ transcript chunks
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SessionEngine.ts                                  │
│  - orchestrates live session lifecycle                                      │
│  - receives transcript chunks                                               │
│  - sends text to analyzer stack                                             │
│  - emits UI-ready state updates                                             │
└─────────┬────────────────────────────────────────────────────────────────────┘
          │
          ├───────────────────────────────┐
          │                               │
          ▼                               ▼
┌──────────────────────────────┐   ┌─────────────────────────────────────────┐
│ AI Engines (src/ai/*)        │   │ LocalStorageService.ts                 │
│ - intentClassifier           │   │ - session persistence                  │
│ - patternLibrary            │   │ - settings persistence                 │
│ - scoringEngine             │   │ - replay data                          │
│ - WhisperAutoCorrector      │   └─────────────────────────────────────────┘
│ - BehavioralAnalyticsEngine │
│ - OutcomeReplayEngine       │
└─────────┬────────────────────┘
          │ detected patterns + tactics
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          UI Layer (screens/hooks/components)                │
│  - LiveSessionScreen                                                       │
│  - useLiveSession                                                          │
│  - transcript cards, tactic cards, metrics                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2) Model Lifecycle Flow

`ModelService.tsx` owns download/load/injection lifecycle for on-device models.

```text
App Boot
  │
  ▼
ModelServiceProvider mounts
  │
  ├─ Ensure local model directory exists
  │
  ├─ STT path:
  │    Download whisper model file (if missing)
  │    └─ ggml-tiny.en.bin
  │
  ├─ LLM path:
  │    Download GGUF model file (if missing)
  │    └─ LFM2-350M-Q8_0.gguf
  │
  ├─ initWhisper({ filePath })
  │    └─ creates WhisperContext
  │
  ├─ SpeechService.setWhisperContext(whisperCtx)
  │
  ├─ initLlama({ model })
  │    └─ creates LlamaContext
  │
  └─ Publish readiness state to UI/hooks
       (isSTTLoaded, isLLMLoaded, progress, errors)
```

---

## 3) Live Session Flow (Detailed)

```text
User taps "Start Session"
  │
  ▼
useLiveSession.startSession(mode)
  │
  ▼
SessionEngine.startSession(mode)
  │
  ▼
SpeechService.startRecording(...)
  │
  ├─ requests mic permission (Android)
  ├─ starts live audio stream
  └─ starts periodic chunk processing timer
       (target: 5s audio windows)
  │
  ▼
Every chunk:
  │
  ├─ aggregate PCM bytes
  ├─ build WAV snapshot in temp cache
  ├─ whisperContext.transcribe(tempWav, { language: 'en', prompt: DOMAIN_PROMPT })
  ├─ sanitize transcript
  │    - remove [BLANK_AUDIO], [Pause], etc.
  └─ emit transcript chunk callback
  │
  ▼
SessionEngine.onTranscription(...)
  │
  ├─ optional transcript cleanup / correction path
  ├─ analyzer pass (pattern + confidence)
  ├─ counter-strategy selection
  └─ update LiveSessionState
  │
  ▼
Hook + reducer dispatch state to UI
  │
  ▼
Live transcript + tactical suggestion cards update in real time
```

---

## 4) Post-Session / Replay Flow

```text
User stops session
  │
  ▼
SessionEngine.stopSession()
  │
  ├─ finalizes recording/transcription
  ├─ computes summary + metrics
  ├─ persists session locally
  └─ returns session metadata
  │
  ▼
Outcome replay screens load session
  │
  ├─ BehavioralAnalyticsEngine
  ├─ OutcomeReplayEngine
  └─ rendered insights, leverage points, missed opportunities
```

---

## 5) Privacy Boundaries

```text
[Device Microphone] -> [SpeechService] -> [Local Models] -> [Local Storage/UI]

No required cloud inference path.
No transcript/audio dependency on remote AI services for core flow.
Model download is the only network-required phase (one-time/update-time).
```

---

## 6) Component Responsibility Map

| Layer | Primary Files | Responsibility |
|---|---|---|
| Audio/STT | `src/services/SpeechService.ts` | Capture audio, chunking, whisper transcription, transcript emission |
| Model Runtime | `src/services/ModelService.tsx` | Download/init of Whisper + Llama contexts, readiness/progress state |
| Session Orchestration | `src/services/SessionEngine.ts` | Session lifecycle, analyzer integration, state updates |
| AI Logic | `src/ai/*` | Pattern detection, scoring, correction, behavioral/replay analysis |
| Persistence | `src/services/LocalStorageService.ts` | Local data storage and retrieval |
| UI/State Hooks | `src/screens/*`, `src/hooks/*`, `src/components/*` | Render transcript/tactics/insights, handle user interactions |

---

## 7) Future Extension Points

- Replace TTS placeholder path with a local TTS runtime integration.
- Add multilingual STT model switching in `ModelService.tsx`.
- Add model profile switching (fast/accurate presets).
- Optional hybrid mode: local-first + cloud fallback (feature flag controlled).

---

## 8) Quick Legend

- **STT**: Speech-to-Text
- **LLM**: Large Language Model
- **PCM**: Pulse-code modulation audio bytes
- **WAV snapshot**: temporary chunk file used for transcription
- **GGUF**: model format used by llama.cpp ecosystem

---

This document is intended to give developers a single source of truth for how audio, models, analysis, and UI state flow through Latent.