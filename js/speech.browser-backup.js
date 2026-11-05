/* speech.js — voice output (speechSynthesis).
 * Voice input providers live in transcription.js. */
import { showSaid } from './ui.js';
import { settings } from './store.js';
import { tr } from './i18n.js';

export function pickVoice() {
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

// Keep the original input exports available to existing callers.
export {
  startListen,
  stopListen,
  toggleListen,
  onSpeechResult,
  isListening,
  speechSupported,
} from './transcription.js';
