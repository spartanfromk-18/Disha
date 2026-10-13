/* transcription.js — swappable voice input providers with a Web Speech fallback. */
import { config } from './config.js';
import { settings } from './store.js';
import { speak } from './speech.js';
import { setTalkState } from './ui.js';
import { tr } from './i18n.js';

const SpeechRecognitionApi = typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);
let activeInputStop = null;

export class WebSpeechProvider {
  transcribe() {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognitionApi) {
        reject(new Error('Speech Recognition is not supported'));
        return;
      }

      const recognition = new SpeechRecognitionApi();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        activeInputStop = null;
        callback(value);
      };

      recognition.lang = settings.lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) finish(resolve, transcript);
        else finish(reject, new Error('Speech Recognition returned no transcript'));
      };
      recognition.onerror = (event) => {
        finish(reject, new Error(event.error || 'Speech Recognition failed'));
      };
      recognition.onend = () => {
        if (!settled) finish(reject, new Error('Speech Recognition ended without a result'));
      };
      activeInputStop = () => recognition.abort();

      try {
        recognition.start();
      } catch (error) {
        finish(reject, error);
      }
    });
  }
}

function writeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  });
  return new Uint8Array(buffer);
}

async function captureWav() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Audio recording is not supported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  const analyser = new AudioContext().createAnalyser();
  const source = analyser.context.createMediaStreamSource(stream);
  source.connect(analyser);
  const levels = new Uint8Array(analyser.fftSize);
  let started = false;
  let quietSince = 0;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      activeInputStop = null;
      stream.getTracks().forEach((track) => track.stop());
      source.disconnect();
      analyser.disconnect();
    };
    const stop = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
    activeInputStop = stop;
    const checkSilence = () => {
      if (recorder.state === 'inactive') return;
      analyser.getByteTimeDomainData(levels);
      const loud = levels.some((level) => Math.abs(level - 128) > 7);
      if (loud) {
        started = true;
        quietSince = 0;
      } else if (started) {
        quietSince ||= Date.now();
        if (Date.now() - quietSince >= 800) stop();
      }
      if (Date.now() - startedAt >= 8000) stop();
      else requestAnimationFrame(checkSilence);
    };
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { cleanup(); reject(new Error('Audio recording failed')); };
    recorder.onstop = async () => {
      cleanup();
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const decoded = await new AudioContext().decodeAudioData(await blob.arrayBuffer());
        const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
        const bufferSource = offline.createBufferSource();
        bufferSource.buffer = decoded;
        bufferSource.connect(offline.destination);
        bufferSource.start();
        const rendered = await offline.startRendering();
        resolve(writeWav(rendered.getChannelData(0), 16000));
      } catch (error) {
        reject(error);
      }
    };
    try {
      recorder.start();
      requestAnimationFrame(checkSilence);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function toBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export class WisprProvider {
  async transcribe() {
    if (config.wisprMock) return 'take me home';
    if (!config.wisprApiKey) throw new Error('Wispr API key is missing');
    const wav = await captureWav();
    const response = await fetch(`${config.wisprApiUrl}/api/v1/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + config.wisprApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: toBase64(wav),
        language: settings.lang.slice(0, 2),
      }),
    });
    if (!response.ok) throw new Error(`Wispr transcription failed (${response.status})`);
    const data = await response.json();
    const transcript = data.text || data.transcript;
    if (typeof transcript !== 'string' || !transcript.trim()) {
      throw new Error('Wispr returned no transcript');
    }
    return transcript.trim();
  }
}

export async function transcribeOnce() {
  if (settings.transcriptionProvider === 'wispr') {
    try {
      return await new WisprProvider().transcribe();
    } catch (error) {
      speak('Pro transcription is unavailable; using browser voice input.');
    }
  }
  return new WebSpeechProvider().transcribe();
}

let listening = false;
let onResultCb = null;

export const speechSupported = !!SpeechRecognitionApi;
export function onSpeechResult(callback) { onResultCb = callback; }
export function isListening() { return listening; }

export async function startListen() {
  if (listening) return;
  listening = true;
  setTalkState('listening');
  try {
    const transcript = await transcribeOnce();
    if (onResultCb) onResultCb(transcript);
  } catch (error) {
    if (settings.transcriptionProvider === 'webspeech') speak(tr(settings.lang, 'noSR'));
  } finally {
    listening = false;
    setTalkState('idle');
  }
}

export function stopListen() {
  if (activeInputStop) activeInputStop();
  listening = false;
  setTalkState('idle');
}

export function toggleListen() {
  if (listening) stopListen();
  else startListen();
}
