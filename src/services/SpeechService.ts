/**
 * 🔒 PRIVACY NOTICE
 * All speech processing runs locally on device using whisper.rn (whisper.cpp).
 * Audio is processed on device and transcribed locally.
 * No audio data is sent to external servers.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import AudioRecord from 'react-native-live-audio-stream';
import { initWhisper, WhisperContext } from 'whisper.rn';

const DOMAIN_PROMPT =
  'This conversation includes words like salary, fresher, offer, budget, negotiation, interview, compensation, package, client, proposal, anchor, objection, startup, candidate.';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const CHUNK_MS = 5000;
const SILENCE_TOKEN_REGEX = /\[BLANK_AUDIO\]|\[Pause\]|\[ Pause \]|\(Pause\)/gi;

let whisperContext: WhisperContext | null = null;
let whisperContextPath: string | null = null;

export const checkSTTModelReady = async (): Promise<boolean> => {
  return whisperContext !== null;
};

export interface TranscriptionCallback {
  (text: string, timestamp: number): void;
}

export interface AudioLevelCallback {
  (level: number): void;
}

const decodeBase64 = (input: string): Uint8Array => {
  const normalized = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];

  let i = 0;
  while (i < normalized.length) {
    const c1 = chars.indexOf(normalized[i] ?? 'A');
    const c2 = chars.indexOf(normalized[i + 1] ?? 'A');
    const c3 = chars.indexOf(normalized[i + 2] ?? 'A');
    const c4 = chars.indexOf(normalized[i + 3] ?? 'A');

    const b1 = c1 * 4 + Math.floor(c2 / 16);
    bytes.push(b1);

    if ((normalized[i + 2] ?? '=') !== '=') {
      const b2 = (c2 % 16) * 16 + Math.floor(c3 / 4);
      bytes.push(b2);
    }

    if ((normalized[i + 3] ?? '=') !== '=') {
      const b3 = (c3 % 4) * 64 + c4;
      bytes.push(b3);
    }

    i += 4;
  }

  return Uint8Array.from(bytes);
};

const encodeBase64 = (bytes: Uint8Array): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let index = 0;

  while (index < bytes.length) {
    const hasB1 = index < bytes.length;
    const b1 = hasB1 ? bytes[index] : 0;
    index += 1;

    const hasB2 = index < bytes.length;
    const b2 = hasB2 ? bytes[index] : 0;
    index += 1;

    const hasB3 = index < bytes.length;
    const b3 = hasB3 ? bytes[index] : 0;
    index += 1;

    const n = b1 * 65536 + b2 * 256 + b3;

    const e1 = Math.floor(n / 262144) % 64;
    const e2 = Math.floor(n / 4096) % 64;
    const e3 = Math.floor(n / 64) % 64;
    const e4 = n % 64;

    result += chars[e1];
    result += chars[e2];
    result += hasB2 ? chars[e3] : '=';
    result += hasB3 ? chars[e4] : '=';
  }

  return result;
};

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const makeWavBytes = (
  pcm: Uint8Array,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Uint8Array => {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const wav = new Uint8Array(44 + dataSize);
  const view = new DataView(wav.buffer);

  wav[0] = 'R'.charCodeAt(0);
  wav[1] = 'I'.charCodeAt(0);
  wav[2] = 'F'.charCodeAt(0);
  wav[3] = 'F'.charCodeAt(0);

  view.setUint32(4, 36 + dataSize, true);

  wav[8] = 'W'.charCodeAt(0);
  wav[9] = 'A'.charCodeAt(0);
  wav[10] = 'V'.charCodeAt(0);
  wav[11] = 'E'.charCodeAt(0);

  wav[12] = 'f'.charCodeAt(0);
  wav[13] = 'm'.charCodeAt(0);
  wav[14] = 't'.charCodeAt(0);
  wav[15] = ' '.charCodeAt(0);

  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  wav[36] = 'd'.charCodeAt(0);
  wav[37] = 'a'.charCodeAt(0);
  wav[38] = 't'.charCodeAt(0);
  wav[39] = 'a'.charCodeAt(0);

  view.setUint32(40, dataSize, true);
  wav.set(pcm, 44);

  return wav;
};

export class SpeechService {
  private isRecording = false;
  private recordingStartTime = 0;
  private transcriptionCallback: TranscriptionCallback | null = null;
  private audioLevelCallback: AudioLevelCallback | null = null;

  private audioLevelInterval: NodeJS.Timeout | null = null;
  private transcriptionInterval: NodeJS.Timeout | null = null;

  private pcmBuffer: Uint8Array[] = [];
  private bytesSinceLastChunk = 0;
  private chunkIndex = 0;

  setWhisperContext(ctx: WhisperContext): void {
    whisperContext = ctx;
    console.log('[SpeechService] ✅ Whisper context injected');
  }

  async initWhisperContext(filePath: string): Promise<void> {
    if (whisperContext && whisperContextPath === filePath) return;
    whisperContext = await initWhisper({ filePath });
    whisperContextPath = filePath;
    console.log('[SpeechService] ✅ Whisper context initialized from path');
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Latent needs access to your microphone to transcribe speech.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[SpeechService] ❌ Permission error:', error);
      return false;
    }
  }

  async startRecording(
    onTranscription: TranscriptionCallback,
    onAudioLevel?: AudioLevelCallback
  ): Promise<boolean> {
    try {
      if (this.isRecording) return true;
      if (!whisperContext) {
        console.error('[SpeechService] ❌ Whisper context not set');
        return false;
      }

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.error('[SpeechService] ❌ Microphone permission denied');
        return false;
      }

      this.transcriptionCallback = onTranscription;
      this.audioLevelCallback = onAudioLevel || null;
      this.recordingStartTime = Date.now();
      this.isRecording = true;
      this.pcmBuffer = [];
      this.bytesSinceLastChunk = 0;
      this.chunkIndex = 0;

      const tempWav = `${RNFS.CachesDirectoryPath}/latent_live_stream.wav`;

      AudioRecord.init({
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
        bitsPerSample: BITS_PER_SAMPLE,
        wavFile: tempWav,
      });

      AudioRecord.on('data', (base64Chunk: string) => {
        if (!this.isRecording) return;
        const chunk = decodeBase64(base64Chunk);
        this.pcmBuffer.push(chunk);
        this.bytesSinceLastChunk += chunk.length;
      });

      AudioRecord.start();

      this.startAudioLevelPolling();
      this.startContinuousTranscription();

      console.log('[SpeechService] ✅ Recording started');
      return true;
    } catch (error) {
      console.error('[SpeechService] ❌ Error starting recording:', error);
      this.isRecording = false;
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.isRecording) return null;

      this.stopAudioLevelPolling();
      this.stopContinuousTranscription();

      await AudioRecord.stop();
      this.isRecording = false;

      const finalText = await this.flushCurrentBufferAsChunk(Date.now());

      this.transcriptionCallback = null;
      this.audioLevelCallback = null;
      this.pcmBuffer = [];
      this.bytesSinceLastChunk = 0;

      return finalText;
    } catch (error) {
      console.error('[SpeechService] ❌ Error stopping recording:', error);
      this.isRecording = false;
      return null;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (!this.isRecording) return;

      this.stopAudioLevelPolling();
      this.stopContinuousTranscription();
      await AudioRecord.stop();

      this.isRecording = false;
      this.transcriptionCallback = null;
      this.audioLevelCallback = null;
      this.pcmBuffer = [];
      this.bytesSinceLastChunk = 0;
    } catch (error) {
      console.error('[SpeechService] ❌ Error cancelling recording:', error);
      this.isRecording = false;
    }
  }

  private startContinuousTranscription(): void {
    this.transcriptionInterval = setInterval(async () => {
      try {
        if (!this.isRecording || !whisperContext) return;

        const requiredBytes = (SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8) * CHUNK_MS) / 1000;
        if (this.bytesSinceLastChunk < requiredBytes) return;

        await this.flushCurrentBufferAsChunk(Date.now());
      } catch (error) {
        console.error('[SpeechService] ❌ Continuous transcription error:', error);
      }
    }, 1000);
  }

  private stopContinuousTranscription(): void {
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }
  }

  private startAudioLevelPolling(): void {
    this.audioLevelInterval = setInterval(() => {
      if (!this.isRecording || !this.audioLevelCallback) return;
      this.audioLevelCallback(this.computeLevelFromRecentPCM());
    }, 100);
  }

  private stopAudioLevelPolling(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }

  private computeLevelFromRecentPCM(): number {
    if (this.pcmBuffer.length === 0) return 0;
    const latest = this.pcmBuffer[this.pcmBuffer.length - 1];
    if (!latest || latest.length < 2) return 0;

    let sumSq = 0;
    let samples = 0;

    for (let i = 0; i + 1 < latest.length; i += 2) {
      const lo = latest[i]!;
      const hi = latest[i + 1]!;
      const combined = hi * 256 + lo;
      const signed = combined >= 32768 ? combined - 65536 : combined;
      const normalized = signed / 32768;

      sumSq += normalized * normalized;
      samples += 1;
    }

    if (samples === 0) return 0;
    const rms = Math.sqrt(sumSq / samples);
    return clamp01(rms * 3);
  }

  private async flushCurrentBufferAsChunk(timestamp: number): Promise<string | null> {
    if (!whisperContext || this.pcmBuffer.length === 0) return null;

    const pcm = concatBytes(this.pcmBuffer);
    this.pcmBuffer = [];
    this.bytesSinceLastChunk = 0;

    if (pcm.length === 0) return null;

    const wavPath = `${RNFS.CachesDirectoryPath}/latent_chunk_${Date.now()}_${this.chunkIndex++}.wav`;

    try {
      const wavBytes = makeWavBytes(pcm, SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE);
      const wavBase64 = encodeBase64(wavBytes);

      await RNFS.writeFile(wavPath, wavBase64, 'base64');

      const { promise } = whisperContext.transcribe(wavPath, {
        language: 'en',
        prompt: DOMAIN_PROMPT,
      });

      const result = await promise;
      const rawText =
        result.segments
          ?.map((segment) => segment.text)
          .join(' ')
          .trim() ||
        result.result ||
        '';

      const sanitized = rawText.replace(SILENCE_TOKEN_REGEX, '').trim();
      if (!sanitized) return null;

      if (this.transcriptionCallback) {
        this.transcriptionCallback(sanitized, timestamp);
      }

      return sanitized;
    } catch (error) {
      console.error('[SpeechService] ❌ Chunk transcription failed:', error);
      return null;
    } finally {
      try {
        const exists = await RNFS.exists(wavPath);
        if (exists) await RNFS.unlink(wavPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.recordingStartTime;
  }

  cleanup(): void {
    this.stopAudioLevelPolling();
    this.stopContinuousTranscription();
    if (this.isRecording) {
      this.cancelRecording();
    }
  }
}

// Export singleton instance
export const speechService = new SpeechService();
