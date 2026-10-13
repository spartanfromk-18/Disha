/* chime.js — arrival beacon: audio "hotter/colder" inside the last 100 m,
 * the stretch where turn-by-turn says "you have arrived" too early.
 * Degrades silently when WebAudio/geolocation are unavailable. */
import { config } from './config.js';
import { settings } from './store.js';
import { speak } from './speech.js';
import { tr } from './i18n.js';
import { haversineKm } from './geo.js';

let timer = null;
let watchId = null;
let audio = null;
let target = null;
let lastPos = null;

function beep(freq) {
  try {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, audio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.2);
  } catch (e) {}
}

export function stopChime() {
  if (timer) clearTimeout(timer);
  if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} }
  if (audio) { try { audio.close(); } catch (e) {} }
  timer = watchId = audio = target = lastPos = null;
}

/** Start homing beeps toward { lat, lon }. Beeps quicken under chimeRadiusM. */
export function startChime(dest) {
  stopChime();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !navigator.geolocation) return;
  audio = new AC();
  target = dest;
  watchId = navigator.geolocation.watchPosition(
    (p) => { lastPos = { lat: p.coords.latitude, lon: p.coords.longitude }; },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
  (function loop() {
    if (!target) return;
    if (lastPos) {
      const d = haversineKm(lastPos.lat, lastPos.lon, target.lat, target.lon) * 1000;
      if (d <= config.arrivalRadiusM) { speak(tr(settings.lang, 'arrived')); stopChime(); return; }
      beep(d < config.chimeRadiusM ? 880 : 620);
      timer = setTimeout(loop, d < config.chimeRadiusM ? 300 + d * 6 : 2500);
    } else {
      timer = setTimeout(loop, 1500);
    }
  })();
}
