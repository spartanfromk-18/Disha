/* main.js — bootstrap: wire buttons, language, env guards. */
import { el, setLang, refreshLabels } from './ui.js';
import { settings } from './store.js';
import { tr } from './i18n.js';
import { speak, toggleListen, stopListen, onSpeechResult, speechSupported } from './speech.js';
import { onHeard } from './commands.js';

el.talkBtn.addEventListener('click', toggleListen);

el.langEn.addEventListener('click', () => {
  setLang('en-IN');
  speak(tr(settings.lang, 'langName'));
});
el.langHi.addEventListener('click', () => {
  setLang('hi-IN');
  speak(tr(settings.lang, 'langName'));
});

onSpeechResult(onHeard);

document.querySelectorAll('.qa').forEach((btn) => {
  btn.addEventListener('click', () => {
    stopListen();
    onHeard(btn.dataset.cmd);
  });
});

if (!speechSupported) el.srNote.hidden = false;

/* TRD §5: mic + GPS need a secure context — warn in-product, not just in docs. */
(() => {
  const h = location.hostname;
  const ok = location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1' || h === '';
  if (!ok) el.secureWarn.hidden = false;
})();

try {
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => {};
} catch (e) {}

setLang(settings.lang);
refreshLabels();
