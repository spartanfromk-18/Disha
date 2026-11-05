import { showSaid, setTalkState } from './ui.js';
import { settings } from './store.js';
import { tr } from './i18n.js';

const SpeechRecognitionApi = typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);
const proxyUrl = () => window.DISHA_NIM_URL || 'http://localhost:8000';
let listening = false;
let onResultCb = null;
let stopCapture = null;

export function pickVoice() {
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find((voice) => voice.lang === settings.lang) ||
      voices.find((voice) => voice.lang?.startsWith(settings.lang.slice(0, 2))) ||
      null;
  } catch {
    return null;
  }
}

async function speakWithNim(text) {
  const response = await fetch(`${proxyUrl()}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang: settings.lang }),
  });
  if (!response.ok) throw new Error(`NIM TTS failed (${response.status})`);
  const audio = new Audio(URL.createObjectURL(await response.blob()));
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('NIM audio playback failed'));
    audio.play().catch(reject);
  });
}

export function speak(text) {
  showSaid(text);
  speakWithNim(text).catch(() => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.lang;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    } catch {
      // The browser fallback is best effort when speech output is unavailable.
    }
  });
}

export function say(key, arg) {
  speak(tr(settings.lang, key, arg));
}

function browserTranscribe() {
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
      callback(value);
    };
    recognition.lang = settings.lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) finish(resolve, transcript);
      else finish(reject, new Error('Browser returned no transcript'));
    };
    recognition.onerror = (event) => finish(reject, new Error(event.error || 'Browser speech failed'));
    recognition.onend = () => finish(reject, new Error('Browser speech ended without a result'));
    stopCapture = () => recognition.abort();
    try {
      recognition.start();
    } catch (error) {
      finish(reject, error);
    }
  });
}

async function recordAudio() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Audio recording is not supported');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stopCapture = null;
      stream.getTracks().forEach((track) => track.stop());
    };
    stopCapture = () => recorder.stop();
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { cleanup(); reject(new Error('Audio recording failed')); };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    recorder.start();
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 8000);
  });
}

async function nimTranscribe() {
  const audio = await recordAudio();
  const form = new FormData();
  form.append('audio', audio, 'recording.webm');
  const response = await fetch(`${proxyUrl()}/stt`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`NIM STT failed (${response.status})`);
  const result = await response.json();
  if (!result.transcript?.trim()) throw new Error('NIM returned no transcript');
  return result.transcript.trim();
}

export const speechSupported = !!SpeechRecognitionApi ||
  (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
export function onSpeechResult(callback) { onResultCb = callback; }
export function isListening() { return listening; }

export async function startListen() {
  if (listening) return;
  listening = true;
  setTalkState('listening');
  try {
    let transcript;
    try {
      transcript = await nimTranscribe();
    } catch {
      transcript = await browserTranscribe();
    }
    if (onResultCb) onResultCb(transcript);
  } catch {
    speak(tr(settings.lang, 'noSR'));
  } finally {
    listening = false;
    stopCapture = null;
    setTalkState('idle');
  }
}

export function stopListen() {
  if (stopCapture) stopCapture();
  listening = false;
  setTalkState('idle');
}

export function toggleListen() {
  if (listening) stopListen();
  else startListen();
}
