/* store.js — on-device persistence. No backend, no accounts.
 * Clearing site data = factory reset. */
import { config } from './config.js';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/** Mutable user settings (language, emergency contact). */
export const settings = Object.assign(
  { lang: config.defaultLang, emergencyContact: null },
  read('disha:settings', {})
);

export function saveSettings() { write('disha:settings', settings); }

/** Favorites + breadcrumb pin. */
export const db = {
  getFavorites: () => read('disha:favorites', {}),
  saveFavorites: (favs) => write('disha:favorites', favs),
  getSpot: () => read('disha:spot', null),
  saveSpot: (spot) => write('disha:spot', spot),
};
