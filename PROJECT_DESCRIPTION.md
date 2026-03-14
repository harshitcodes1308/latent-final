# Latent — On-Device Conversation Intelligence Engine

> **Privacy-first, real-time negotiation strategist powered entirely by on-device AI. Zero cloud. Zero data leaks. Zero latency.**

---

## 1. What is Latent?

Latent is a mobile application that listens to live conversations — job interviews, sales calls, investor pitches, salary negotiations — and provides **real-time tactical suggestions** directly on the user's screen. It detects psychological persuasion patterns (anchoring, budget objections, authority pressure) and instantly surfaces counter-strategies.

Every single computation — from speech recognition to intent classification to counter-strategy generation — runs **100% on-device**. No audio, text, or metadata is ever transmitted to any server.

---

## 2. Core Features

### 2.1 Live Tactical Mode (Real-Time Analysis)
- Captures microphone audio in real-time.
- Transcribes speech locally using a Whisper STT model.
- Detects **9 negotiation patterns** (Anchoring, Budget Objection, Authority Pressure, Time Pressure, Deflection, Positive Signal, Negative Signal, Commitment Language, Strength Signal).
- Surfaces **1 highest-confidence counter-strategy** per analysis tick.
- Supports **7 conversation modes**, each with tuned detection weights:

| Mode | Use Case |
|---|---|
| Job Interview | Navigating salary, role, and offer discussions |
| Sales Call | Handling objections, pricing, and closing |
| Startup Pitch | Valuation, runway, and investor skepticism |
| Salary Raise | Internal promotion and compensation negotiation |
| Investor Meeting | Funding round, traction, and burn rate conversations |
| Client Negotiation | Retainer fees, scope creep, and contract terms |
| Custom Scenario | General-purpose fallback |

### 2.2 Pre-Session Strategic Preparation
- Before a live session, the user fills out a **mode-specific adaptive form** (e.g., "Role applying for", "Expected salary", "Company type" for Job Interview mode).
- Latent generates a **10-point personalized strategic plan** entirely offline using deterministic rule engines (no LLM required).
- Users can also **skip this step** and jump straight into the live session.

### 2.3 Strategic Outcome Replay™ (Post-Session Analysis)
- After a session, the user can replay the full transcript.
- The **BehavioralAnalyticsEngine** calculates:
  - Filler word count (um, uh, like, basically)
  - Hesitation markers (I think maybe, if possible, sort of)
  - Behavioral archetype classification (e.g., "Defensive Under Pressure", "Strong Frame Control")
  - Leverage capture score and objection handling score
- The **OutcomeReplayEngine** generates:
  - Counterfactual reframing (what the user *should* have said)
  - Persuasion scoring
  - Alternative response suggestions

### 2.4 Debug / Demo Mode
- A toggle in Settings injects **mode-specific hardcoded transcripts** every 7 seconds.
- Each of the 7 modes has its own unique set of realistic mock dialogues for demonstration and testing purposes.

---

## 3. Complete Tech Stack

### 3.1 Application Layer

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.83.1 | Cross-platform mobile framework |
| TypeScript | 5.9.2 | Type-safe application logic |
| React Navigation (Stack) | 7.x | Screen routing with iOS-style transitions |
| AsyncStorage | 2.2.0 | On-device persistent storage for sessions and settings |
| react-native-linear-gradient | 2.8.3 | Premium UI gradients |
| react-native-svg | 15.x | Circular score visualizations |
| react-native-gesture-handler | 2.30.0 | Touch gesture support |
| react-native-live-audio-stream | 1.1.1 | Real-time microphone capture |
| react-native-fs | 2.20.0 | File system access for model management |
| react-native-sound | 0.13.0 | Audio playback |

### 3.2 On-Device AI Layer (RunAnywhere SDK)

| SDK Module | Version | Purpose |
|---|---|---|
| `@runanywhere/core` | 0.18.1 | Core bridging layer between React Native JS and native C++ |
| `@runanywhere/onnx` | 0.18.1 | ONNX Runtime backend — powers STT (Whisper) and TTS (Piper) |
| `@runanywhere/llamacpp` | 0.18.1 | Llama.cpp backend — powers on-device LLM inference |
| `react-native-nitro-modules` | 0.31.10 | High-performance native module system used by RunAnywhere |

### 3.3 AI Models

| Model | Type | Format | Size | Purpose |
|---|---|---|---|---|
| Whisper Tiny (English) | STT | ONNX | ~75 MB | Speech-to-Text transcription |
| Piper Lessac Medium | TTS | ONNX | ~63 MB | Text-to-Speech synthesis |
| LFM2 350M Q8 | LLM | GGUF | ~350 MB | On-device text generation |

---

## 4. Application Architecture

### 4.1 File Structure Overview

```
src/
├── ai/                          # AI & NLP Engines (all offline)
│   ├── patternLibrary.ts        # 9 negotiation pattern definitions with structural regex
│   ├── intentClassifier.ts      # Universal Scoring Engine (structure + topic + number + negative rules)
│   ├── scoringEngine.ts         # Cognitive metrics calculator
│   ├── WhisperAutoCorrector.ts  # Levenshtein distance fuzzy matcher for STT corrections
│   ├── StrategicPreparationEngine.ts  # 10-point pre-session plan generator
│   ├── BehavioralAnalyticsEngine.ts   # Filler words, hesitation, archetype profiling
│   └── OutcomeReplayEngine.ts   # Counterfactual simulation & persuasion scoring
│
├── services/                    # Core Service Layer
│   ├── SessionEngine.ts         # Master orchestrator (recording ↔ transcription ↔ analysis ↔ auto-save)
│   ├── SpeechService.ts         # Microphone capture + RunAnywhere STT bridge
│   ├── ModelService.tsx         # Model download, loading, and lifecycle management (React Context)
│   ├── NegotiationAnalyzer.ts   # Bridges IntentClassifier output to UI-ready detected patterns
│   ├── CounterStrategyEngine.ts # Rule-based tactic → counter-strategy mapping
│   └── LocalStorageService.ts   # AsyncStorage CRUD for sessions
│
├── screens/                     # UI Screens
│   ├── DisclaimerScreen.tsx     # Ethics gate with AsyncStorage lock
│   ├── HomeScreen.tsx           # 3-category dashboard (Live, Replay, Practice)
│   ├── PreSessionFormScreen.tsx # Adaptive strategic input form (7 modes)
│   ├── PreSessionStrategyScreen.tsx  # 10-point plan display
│   ├── LiveSessionScreen.tsx    # Real-time transcription + suggestion cards
│   ├── OutcomeReplayScreen.tsx  # Post-session analysis dashboard
│   ├── InsightsScreen.tsx       # Session insights viewer
│   └── SettingsScreen.tsx       # Debug toggle, model management
│
├── hooks/                       # React Hooks
│   ├── useLiveSession.ts        # Master hook connecting SessionEngine → React state
│   ├── useCounterStrategy.ts    # Counter-strategy display logic
│   ├── useLiveTranscription.ts  # Transcription state management
│   └── useSessionAnalyzer.ts    # Analysis trigger hook
│
├── components/                  # Reusable UI Components
│   ├── LiveTranscript.tsx       # Scrolling transcript bubble list
│   ├── SuggestionCard.tsx       # Tactic detection card
│   ├── CounterStrategyCard.tsx  # Counter-strategy display
│   ├── CircularScore.tsx        # SVG circular score gauge
│   ├── CognitiveMeter.tsx       # Focus/cognitive metrics display
│   └── SessionSummaryCard.tsx   # Post-session summary card
│
├── state/
│   └── sessionReducer.ts        # Redux-like state reducer for live session
│
├── types/
│   └── session.ts               # All TypeScript interfaces and enums
│
└── theme/
    └── colors.ts                # Design system color tokens
```

### 4.2 Data Flow (End-to-End)

```
┌─────────────┐    Float32 PCM     ┌──────────────────┐   WAV Snapshot    ┌───────────────────────┐
│  Microphone  │ ──────────────────→│  SpeechService   │ ────────────────→ │  RunAnywhere ONNX C++ │
│  (Hardware)  │    (Local RAM)     │  (chunk timer)   │   (Local File)   │  Whisper Tiny Engine   │
└─────────────┘                    └──────────────────┘                   └───────────┬───────────┘
                                                                                      │ Raw Text
                                                                                      ▼
                                   ┌──────────────────┐                   ┌───────────────────────┐
                                   │  SessionEngine   │ ◄──────────────── │ WhisperAutoCorrector  │
                                   │  (Orchestrator)  │   Corrected Text  │ (Levenshtein Fuzzy)   │
                                   └────────┬─────────┘                   └───────────────────────┘
                                            │
                              ┌─────────────┼──────────────┐
                              ▼             ▼              ▼
                   ┌───────────────┐ ┌────────────┐ ┌──────────────┐
                   │ IntentClassif │ │ Transcript │ │  AsyncStorage │
                   │ (Pattern NLP) │ │ State UI   │ │  (Auto-Save)  │
                   └───────┬───────┘ └────────────┘ └──────────────┘
                           │
                           ▼
                   ┌───────────────────┐          ┌──────────────────┐
                   │ CounterStrategy   │ ────────→│  React Native UI │
                   │ Engine            │  Cards   │  (Live Screen)   │
                   └───────────────────┘          └──────────────────┘
```

**Key principle:** At no point in this pipeline does data leave the device. Every arrow represents an in-memory or local-filesystem data transfer.

---

## 5. How the AI Pipeline Works

### 5.1 Speech-to-Text (STT)

1. **Audio Capture:** `SpeechService.ts` uses `NativeAudioModule.startRecording()` to capture microphone input.
2. **Chunking:** Every **5 seconds**, a WAV snapshot of the most recent audio is extracted via `NativeAudioModule.getRecentAudioSnapshot()`.
3. **Inference:** The snapshot is passed to `RunAnywhere.transcribeFile(path, { initialPrompt: DOMAIN_PROMPT })` which runs the Whisper Tiny ONNX model on the device CPU.
4. **Domain Bias:** A hardcoded `initialPrompt` string containing domain-specific vocabulary (salary, fresher, offer, budget, negotiation, compensation, etc.) is injected to bias the decoder toward expected words.
5. **Post-Processing:**
   - Whisper silence tokens (`[BLANK_AUDIO]`, `[Pause]`) are stripped.
   - The `WhisperAutoCorrector` fuzzy-matches misheard words against the active mode's vocabulary using Levenshtein Distance (threshold: 1 error for 4-5 char words, 2 errors for 6+ char words).

### 5.2 Intent Classification

1. The corrected transcript text is fed into `classifyIntent()` in `intentClassifier.ts`.
2. Each of the 9 `NegotiationPattern` definitions is scored using a **4-factor scoring model**:
   - **Structural Score:** Does the text match a regex pattern? (e.g., `'we .* offer'` for Anchoring)
   - **Topic Score:** Does the text contain relevant keywords? (e.g., "salary", "budget")
   - **Number Bonus:** Does the text contain numeric values? (required for Anchoring)
   - **Negative Penalty:** Are softening words present? (e.g., "maybe", "if possible")
3. The **Mode Intelligence Filter Matrix** adjusts weights per mode (e.g., Anchoring is weighted 1.4x in Job Interview, but only 0.6x in Startup Pitch).
4. Only the **single highest-scoring pattern** above the 60% confidence threshold is surfaced per tick.

### 5.3 Counter-Strategy Generation

- The `CounterStrategyEngine.ts` maintains a complete static `Record<NegotiationPattern, CounterStrategyDefinition>` mapping.
- When a pattern is detected, 3 actionable counter-suggestions and a tactical explanation are returned instantly.
- A **cooldown mechanism** prevents the same tactic from being re-surfaced too frequently.

---

## 6. Limitations & Why They Exist

### 6.1 STT Accuracy (Whisper Tiny)

| Limitation | Root Cause |
|---|---|
| Misrecognizes domain-specific words (e.g., "fresher" → "pressure", "salary" → "celery") | Whisper Tiny has only 39M parameters; its vocabulary is general-purpose and not fine-tuned for business/negotiation vocabulary. |
| Cannot pass `initialPrompt` natively through the RunAnywhere SDK TypeScript types | The `STTOptions` interface in the SDK only exposes `language` and `sampleRate`. The `initialPrompt` parameter must be cast via `as any` to reach the underlying C++ Sherpa bridge. There is no guarantee the native layer processes it. |
| Short audio chunks (5s) limit contextual understanding | Whisper performs best on longer audio segments (30s+). Chunking to 5s is necessary for real-time feedback but reduces the decoder's contextual window. |

**Mitigations applied:**
- Domain Prompt Bias injection via `initialPrompt` cast.
- Levenshtein Distance auto-corrector matching misheard words to mode-specific vocabulary.
- Extended pause threshold to 10 seconds to allow fuller sentences before splitting.

### 6.2 Model Download Failures

| Limitation | Root Cause |
|---|---|
| DNS resolution failures (`unable to resolve host`) | The user's Android device/network blocks GitHub CDN (`github.com`), GitHub proxy mirrors (`mirror.ghproxy.com`), and other common hosting domains. |
| Large model file sizes (~75-350 MB) over mobile data | Models must be downloaded in full before inference can begin. There is no streaming or progressive loading. |

**Mitigations applied:**
- Download URLs switched to Hugging Face (`huggingface.co`) which resolved the DNS block.
- Internet permission verified in `AndroidManifest.xml`.

### 6.3 Intent Classification Accuracy

| Limitation | Root Cause |
|---|---|
| Rule-based NLP cannot understand nuanced context | The classifier uses regex structural patterns and keyword matching, not a neural language model. It cannot understand sarcasm, implicit meaning, or complex multi-sentence arguments. |
| False positives on common phrases | Phrases like "let me think about it" can trigger Deflection even in casual conversation. The structural patterns are broad to maximize recall. |
| Single-speaker only | The system cannot distinguish between the user's speech and the counterparty's speech. All transcribed audio is treated as a single stream. |

**Mitigations applied:**
- Mode Intelligence Filter Matrix suppresses irrelevant patterns per mode.
- Negative signal penalties reduce false positive confidence.
- Confidence threshold set at 60% minimum.
- Only 1 winner per tick to prevent noisy multi-detection.

### 6.4 On-Device Processing Constraints

| Limitation | Root Cause |
|---|---|
| Whisper Base (74M params) crashes on some devices | Insufficient RAM/CPU for the larger model on mid-range Android phones. The ONNX runtime requires contiguous memory allocation. |
| Processing latency on older devices | Whisper Tiny inference takes ~1-3 seconds per 5-second chunk on modern phones, but can take 5-8 seconds on older hardware, causing UI lag. |
| No GPU acceleration on all devices | The ONNX backend falls back to CPU on devices without supported GPU compute (Vulkan/OpenCL). |

**Mitigations applied:**
- Downgraded to Whisper Tiny (39M params) for maximum device compatibility.
- Audio processing runs off the main UI thread.
- Analysis is debounced to prevent overwhelming the render pipeline.

### 6.5 SDK & Platform Constraints

| Limitation | Root Cause |
|---|---|
| RunAnywhere SDK `podspecPath` warnings on iOS | The SDK's React Native config includes iOS-specific keys that are not valid under the current RN CLI schema. This is a cosmetic warning and does not affect Android builds. |
| `react-native-screens` compatibility | New Architecture (Fabric) causes `setColor` crashes with native stack navigator. Mitigated by using JS-based `createStackNavigator` instead of `createNativeStackNavigator`. |
| TypeScript `node_modules` type conflicts | React Native's global type declarations conflict with `lib.dom.d.ts` on WebSocket, URL, and FileReader interfaces. These are upstream issues and do not affect runtime behavior. |

---

## 7. Privacy & Security Model

| Principle | Implementation |
|---|---|
| **Zero Cloud Policy** | No HTTP requests for any AI inference. All STT, intent classification, and strategy generation run locally. |
| **No Audio Transmission** | Microphone audio stays in local RAM and temporary WAV files. Files are cleaned up after transcription. |
| **No Transcript Exfiltration** | Transcripts are stored only in AsyncStorage on the device's local flash. |
| **Ethics Gate** | A mandatory `DisclaimerScreen` requires explicit user acknowledgment before first use. The acceptance is stored in AsyncStorage and cannot be bypassed. |
| **Network Usage** | The only network requests are: (1) one-time model downloads from Hugging Face, (2) SDK device registration (non-blocking, best-effort). No user data is included. |

---

## 8. Build & Run

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start -- --reset-cache

# Deploy to connected Android device
npx react-native run-android --device <DEVICE_ID>

# Check connected devices
adb devices
```

**Requirements:**
- Node.js ≥ 18
- Android SDK with API Level 24+
- Physical Android device recommended (emulator lacks microphone + sufficient RAM for ONNX inference)

---

## 9. Screen Flow

```
Disclaimer Screen (Ethics Gate)
        │
        ▼
   Home Screen
   ├── Live Tactical Mode ─→ Mode Selector ─→ Pre-Session Form ─→ Strategy Plan ─→ Live Session
   │                                              └── [Skip] ────────────────────→ Live Session
   ├── Strategic Outcome Replay™ ─→ Outcome Replay Screen
   └── Settings ─→ Debug Mode Toggle, Model Management
```

---

## 10. Future Scope

- **Multi-speaker diarization** — Distinguish user vs. counterparty speech.
- **Whisper Base/Small upgrade** — When RunAnywhere SDK supports memory-efficient streaming inference.
- **On-device LLM-powered suggestions** — Replace rule-based counter-strategies with LFM2-generated contextual responses.
- **Practice Mode** — AI-simulated negotiation partner for offline rehearsal.
- **iOS deployment** — Currently Android-first; iOS requires resolving Fabric + native screen compatibility.
