/* speech.js — voice in (SpeechRecognition) and voice out (speechSynthesis).
 * Degrades to on-screen text when unsupported (ARCHITECTURE §6). */
import { showSaid, setTalkState } from './ui.js';
import { settings } from './store.js';
import { tr } from './i18n.js';

function pickVoice() {
  try {
    const vs = window.speechSynthesis.getVoices() || [];
    return vs.filter((v) => v.lang === settings.lang)[0] ||
           vs.filter((v) => v.lang && v.lang.indexOf(settings.lang.slice(0, 2)) === 0)[0] ||
           null;
  } catch (e) { return null; }
}

/** Speak aloud + echo in large type (TRD FR-2). */
export function speak(text) {
  showSaid(text);
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.lang;
    const v = pickVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch (e) {}
}

/** speak a template key, e.g. say('whereAmI', address). */
export function say(key, arg) {
  speak(tr(settings.lang, key, arg));
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const speechSupported = !!SR;

let rec = null;
let listening = false;
let onResultCb = null;

export function onSpeechResult(cb) { onResultCb = cb; }
export function isListening() { return listening; }

export function startListen() {
  if (!SR) { speak(tr(settings.lang, 'noSR')); return; }
  try { window.speechSynthesis.cancel(); } catch (e) {}
  rec = new SR();
  rec.lang = settings.lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    stopListen();
    if (onResultCb) onResultCb(txt);
  };
  rec.onerror = () => { stopListen(); };
  rec.onend = () => { listening = false; setTalkState('idle'); };
  try {
    rec.start();
    listening = true;
    setTalkState('listening');
  } catch (e) {
    listening = false;
    setTalkState('idle');
  }
}

export function stopListen() {
  try { if (rec) rec.stop(); } catch (e) {}
  listening = false;
  setTalkState('idle');
}

export function toggleListen() { listening ? stopListen() : startListen(); }
