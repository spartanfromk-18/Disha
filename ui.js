/* ui.js — DOM refs, status/transcript/response rendering, language state. */
import { settings, saveSettings } from './store.js';
import { tr } from './i18n.js';

const $ = (id) => document.getElementById(id);

export const el = {
  talkBtn: $('talkBtn'),
  status: $('status'),
  heard: $('heard'),
  said: $('said'),
  heardLabel: $('heardLabel'),
  saidLabel: $('saidLabel'),
  langEn: $('langEn'),
  langHi: $('langHi'),
  srNote: $('srNote'),
  secureWarn: $('secureWarn'),
};

export function setStatus(s) { el.status.textContent = s || ''; }
export function showHeard(text) { el.heard.textContent = text; }
export function showSaid(text) { el.said.textContent = text; }

/** 'idle' | 'listening' | 'working' — mirrors UI_UX button states. */
export function setTalkState(state) {
  el.talkBtn.classList.toggle('listening', state === 'listening');
  el.talkBtn.classList.toggle('working', state === 'working');
  el.talkBtn.querySelector('.talk-text').textContent =
    state === 'listening' ? '···' : 'TALK';
}

export function refreshLabels() {
  el.heardLabel.textContent = tr(settings.lang, 'heard');
  el.saidLabel.textContent = tr(settings.lang, 'says');
  document.documentElement.lang = settings.lang.slice(0, 2);
}

export function setLang(lang) {
  settings.lang = lang;
  saveSettings();
  refreshLabels();
  el.langEn.classList.toggle('active', lang === 'en-IN');
  el.langHi.classList.toggle('active', lang === 'hi-IN');
}
