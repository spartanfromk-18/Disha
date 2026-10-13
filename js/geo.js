/* geo.js — device location + OpenStreetMap geocoding. */
import { config } from './config.js';
import { settings } from './store.js';
import { speak } from './speech.js';
import { tr } from './i18n.js';

let locExplained = false; // TRD §4: explain the permission aloud, once

/** Resolves with a GeolocationPosition; rejects with { code } on failure. */
export function getPos() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej({ code: 0 });
    if (!locExplained) {
      locExplained = true;
      speak(tr(settings.lang, 'locExplain'));
    }
    navigator.geolocation.getCurrentPosition(res, rej,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLa = (lat2 - lat1) * Math.PI / 180;
  const dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Coordinates -> human address (Nominatim reverse geocode). */
export function reverseGeocode(lat, lon) {
  const lang = settings.lang.indexOf('hi') === 0 ? 'hi' : 'en';
  const url = `${config.nominatimBase}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${lang}`;
  return fetch(url, { headers: { 'Accept': 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error('geo-fail'); return r.json(); })
    .then((j) => j.display_name || null);
}

/** Place name -> { lat, lon, name } (Nominatim search). */
export function searchPlace(q) {
  const url = `${config.nominatimBase}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  return fetch(url, { headers: { 'Accept': 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error('geo-fail'); return r.json(); })
    .then((j) => {
      if (!j[0]) return null;
      return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), name: j[0].display_name };
    });
}
