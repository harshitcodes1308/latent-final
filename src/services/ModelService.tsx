import React, { createContext, useContext, useState, useCallback } from 'react';
import RNFS from 'react-native-fs';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { initLlama, LlamaContext } from 'llama.rn';
import { speechService } from './SpeechService';

const MODEL_IDS = {
  llm: 'lfm2-350m-q8_0',
  stt: 'ggml-tiny.en.bin',
  tts: 'piper-tts-placeholder',
} as const;

const MODEL_URLS = {
  llm: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q8_0.gguf',
  stt: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
} as const;

const MODEL_DIR = `${RNFS.DocumentDirectoryPath}/LatentModels`;
const LLM_PATH = `${MODEL_DIR}/${MODEL_IDS.llm}.gguf`;
const STT_PATH = `${MODEL_DIR}/${MODEL_IDS.stt}`;

interface ModelServiceState {
  // SDK readiness (kept for backward compatibility)
  isSDKReady: boolean;
  sdkError: string | null;

  // Download state
  isLLMDownloading: boolean;
  isSTTDownloading: boolean;
  isTTSDownloading: boolean;

  llmDownloadProgress: number;
  sttDownloadProgress: number;
  ttsDownloadProgress: number;

  // Load state
  isLLMLoading: boolean;
  isSTTLoading: boolean;
  isTTSLoading: boolean;

  // Loaded state
  isLLMLoaded: boolean;
  isSTTLoaded: boolean;
  isTTSLoaded: boolean;

  isVoiceAgentReady: boolean;

  // Actions
  downloadAndLoadLLM: () => Promise<void>;
  downloadAndLoadSTT: () => Promise<void>;
  downloadAndLoadTTS: () => Promise<void>;
  downloadAndLoadAllModels: () => Promise<void>;
  unloadAllModels: () => Promise<void>;
}

const ModelServiceContext = createContext<ModelServiceState | null>(null);

export const useModelService = () => {
  const context = useContext(ModelServiceContext);
  if (!context) {
    throw new Error('useModelService must be used within ModelServiceProvider');
  }
  return context;
};

interface ModelServiceProviderProps {
  children: React.ReactNode;
}

let whisperCtxSingleton: WhisperContext | null = null;
let llamaCtxSingleton: LlamaContext | null = null;

const ensureModelDir = async () => {
  const exists = await RNFS.exists(MODEL_DIR);
  if (!exists) {
    await RNFS.mkdir(MODEL_DIR);
  }
};

const downloadWithProgress = async (
  fromUrl: string,
  toFile: string,
  onProgress: (pct: number) => void
): Promise<void> => {
  const exists = await RNFS.exists(toFile);
  if (exists) {
    onProgress(100);
    return;
  }

  const ret = RNFS.downloadFile({
    fromUrl,
    toFile,
    discretionary: true,
    background: true,
    progressDivider: 2,
    begin: () => onProgress(0),
    progress: ({ contentLength, bytesWritten }) => {
      if (!contentLength) {
        onProgress(0);
        return;
      }
      onProgress((bytesWritten / contentLength) * 100);
    },
  });

  const result = await ret.promise;
  if (result.statusCode !== 200) {
    throw new Error(`Download failed (${result.statusCode}) for ${fromUrl}`);
  }

  onProgress(100);
};

export const ModelServiceProvider: React.FC<ModelServiceProviderProps> = ({ children }) => {
  // SDK readiness (semantic kept, now means local AI stack readiness)
  const [isSDKReady] = useState(true);
  const [sdkError, setSDKError] = useState<string | null>(null);

  // Download state
  const [isLLMDownloading, setIsLLMDownloading] = useState(false);
  const [isSTTDownloading, setIsSTTDownloading] = useState(false);
  const [isTTSDownloading] = useState(false);

  const [llmDownloadProgress, setLLMDownloadProgress] = useState(0);
  const [sttDownloadProgress, setSTTDownloadProgress] = useState(0);
  const [ttsDownloadProgress, setTTSDownloadProgress] = useState(0);

  // Load state
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  // Loaded state
  const [isLLMLoaded, setIsLLMLoaded] = useState(false);
  const [isSTTLoaded, setIsSTTLoaded] = useState(false);
  const [isTTSLoaded, setIsTTSLoaded] = useState(false);

  const isVoiceAgentReady = isLLMLoaded && isSTTLoaded && isTTSLoaded;

  const downloadAndLoadLLM = useCallback(async () => {
    if (isLLMDownloading || isLLMLoading) return;

    try {
      await ensureModelDir();

      setIsLLMDownloading(true);
      setLLMDownloadProgress(0);

      await downloadWithProgress(MODEL_URLS.llm, LLM_PATH, setLLMDownloadProgress);
      setIsLLMDownloading(false);

      setIsLLMLoading(true);
      if (!llamaCtxSingleton) {
        llamaCtxSingleton = await initLlama({ model: LLM_PATH });
      }
      setIsLLMLoaded(true);
      setIsLLMLoading(false);
    } catch (error) {
      setIsLLMDownloading(false);
      setIsLLMLoading(false);
      setSDKError(error instanceof Error ? error.message : 'LLM load failed');
      console.error('[ModelService] LLM download/load error:', error);
    }
  }, [isLLMDownloading, isLLMLoading]);

  const downloadAndLoadSTT = useCallback(async () => {
    if (isSTTDownloading || isSTTLoading) return;

    try {
      await ensureModelDir();

      setIsSTTDownloading(true);
      setSTTDownloadProgress(0);

      await downloadWithProgress(MODEL_URLS.stt, STT_PATH, setSTTDownloadProgress);
      setIsSTTDownloading(false);

      setIsSTTLoading(true);
      if (!whisperCtxSingleton) {
        whisperCtxSingleton = await initWhisper({ filePath: STT_PATH });
      }

      speechService.setWhisperContext(whisperCtxSingleton);
      setIsSTTLoaded(true);
      setIsSTTLoading(false);
    } catch (error) {
      setIsSTTDownloading(false);
      setIsSTTLoading(false);
      setSDKError(error instanceof Error ? error.message : 'STT load failed');
      console.error('[ModelService] STT download/load error:', error);
    }
  }, [isSTTDownloading, isSTTLoading]);

  const downloadAndLoadTTS = useCallback(async () => {
    if (isTTSDownloading || isTTSLoading) return;

    setIsTTSLoading(true);
    setTTSDownloadProgress(100);

    // TODO: replace Piper TTS with a new local TTS backend.
    setIsTTSLoaded(true);

    setIsTTSLoading(false);
  }, [isTTSDownloading, isTTSLoading]);

  const downloadAndLoadAllModels = useCallback(async () => {
    await Promise.all([downloadAndLoadLLM(), downloadAndLoadSTT(), downloadAndLoadTTS()]);
  }, [downloadAndLoadLLM, downloadAndLoadSTT, downloadAndLoadTTS]);

  const unloadAllModels = useCallback(async () => {
    try {
      if (llamaCtxSingleton) {
        await llamaCtxSingleton.release();
        llamaCtxSingleton = null;
      }
      if (whisperCtxSingleton) {
        await whisperCtxSingleton.release();
        whisperCtxSingleton = null;
      }

      setIsLLMLoaded(false);
      setIsSTTLoaded(false);
      setIsTTSLoaded(false);
    } catch (error) {
      console.error('[ModelService] Error unloading models:', error);
    }
  }, []);

  const value: ModelServiceState = {
    isSDKReady,
    sdkError,
    isLLMDownloading,
    isSTTDownloading,
    isTTSDownloading,
    llmDownloadProgress,
    sttDownloadProgress,
    ttsDownloadProgress,
    isLLMLoading,
    isSTTLoading,
    isTTSLoading,
    isLLMLoaded,
    isSTTLoaded,
    isTTSLoaded,
    isVoiceAgentReady,
    downloadAndLoadLLM,
    downloadAndLoadSTT,
    downloadAndLoadTTS,
    downloadAndLoadAllModels,
    unloadAllModels,
  };

  return <ModelServiceContext.Provider value={value}>{children}</ModelServiceContext.Provider>;
};
