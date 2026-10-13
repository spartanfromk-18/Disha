/* commands.js — voice intent parsing + handlers (EN + HI).
 * Every intent: show transcript -> announce "working" -> act ->
 * speak result + large-type echo (TRD FR-2). */
import { setStatus, showHeard, setTalkState, setLang } from './ui.js';
import { settings, saveSettings, db } from './store.js';
import { speak, say, stopListen } from './speech.js';
import { getPos, reverseGeocode, searchPlace } from './geo.js';
import { nearby } from './places.js';
import { mapsDir, mapsSearch, waShare, waTo, openUrl } from './nav.js';
import { startChime, stopChime } from './chime.js';
import { tr } from './i18n.js';

export function onHeard(raw) {
  showHeard('"' + raw + '"');
  handle(raw);
}

function done() {
  setStatus('');
  setTalkState('idle');
}

async function handle(raw) {
  const text = raw.toLowerCase().trim();
  speak(tr(settings.lang, 'working')); // UI_UX: working state is announced aloud
  setStatus(tr(settings.lang, 'working'));
  setTalkState('working');

  try {
    let m;

    /* stop — TRD FR-11: halts chime AND any in-progress listening */
    if (/^(stop|रुको|बंद करो)$/.test(text)) { stopChime(); stopListen(); say('stopped'); return; }

    /* language */
    if (/speak hindi|हिंदी में बोलो/.test(text)) { setLang('hi-IN'); say('langName'); return; }
    if (/speak english|अंग्रेज़ी में बोलो|अंग्रेजी में बोलो/.test(text)) { setLang('en-IN'); say('langName'); return; }

    /* emergency contact */
    m = text.match(/my emergency (?:number|contact) is ([\d+\s-]{6,})/);
    if (m) {
      settings.emergencyContact = m[1].replace(/[\s-]/g, '');
      saveSettings();
      say('emergencySaved');
      return;
    }

    /* where am i */
    if (/where am i|मैं कहाँ|मेरी लोकेशन/.test(text)) {
      const p = await getPos();
      const lat = p.coords.latitude, lon = p.coords.longitude;
      let addr = null;
      try { addr = await reverseGeocode(lat, lon); } catch (e) {}
      say(addr ? 'whereAmI' : 'noAddress', addr || '');
      return;
    }

    /* remember this spot (breadcrumb) */
    if (/remember this spot|यह जगह याद/.test(text)) {
      const p = await getPos();
      db.saveSpot({
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        createdAt: new Date().toISOString(),
      });
      say('spotSaved');
      return;
    }

    /* take me back */
    if (/take me back|वापस ले चलो/.test(text)) {
      const spot = db.getSpot();
      if (!spot) { say('noSpot'); return; }
      openUrl(mapsDir(spot.lat, spot.lon));
      say('backChime');
      startChime(spot);
      return;
    }

    /* take me to <place> */
    m = text.match(/^take me to (.+)$/);
    if (m) {
      const place = await searchPlace(m[1]);
      if (!place) { say('placeNotFound', m[1]); return; }
      openUrl(mapsDir(place.lat, place.lon));
      say('openingNav', m[1]);
      return;
    }

    /* take me <favorite> — e.g. "take me home" */
    m = text.match(/^take me (\S+)$/);
    if (m) {
      const f = db.getFavorites()[m[1]];
      if (!f) { say('noFavorite', m[1]); return; }
      openUrl(mapsDir(f.lat, f.lon));
      say('openingNav', m[1]);
      return;
    }

    /* "<label> ले चलो" — favorite first, else search */
    m = text.match(/^(.+) ले चलो$/);
    if (m) {
      const label = m[1].trim();
      const f = db.getFavorites()[label];
      if (f) {
        openUrl(mapsDir(f.lat, f.lon));
        say('openingNav', label);
        return;
      }
      const place = await searchPlace(label);
      if (!place) { say('placeNotFound', label); return; }
      openUrl(mapsDir(place.lat, place.lon));
      say('openingNav', label);
      return;
    }

    /* remember <label> — "remember home" / "घर याद रखो" */
    m = text.match(/^(?:remember|याद रखो|याद करो)\s+(.+)$/) ||
        text.match(/^(.+?)\s+याद (?:रखो|करो)$/);
    if (m && !/this spot/.test(text)) {
      const label = m[1].trim();
      const p = await getPos();
      const favs = db.getFavorites();
      favs[label] = {
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        createdAt: new Date().toISOString(),
      };
      db.saveFavorites(favs);
      say('remembered', label);
      return;
    }

    /* what's near me — ARCHITECTURE §6: degrade to Maps-search suggestion */
    if (/what'?s near me|nearby|आसपास/.test(text)) {
      const p = await getPos();
      let items = null;
      try { items = await nearby(p.coords.latitude, p.coords.longitude); }
      catch (e) { items = null; }
      if (items === null) { say('placesDown'); return; }
      if (!items.length) { say('nearNone'); return; }
      speak(tr(settings.lang, 'nearLead') + items.map((it) =>
        `${it.name}, ${Math.round(it.distM)} meters`).join('. ') + '.');
      return;
    }

    /* share my trip */
    if (/share my trip|यात्रा शेयर/.test(text)) {
      const p = await getPos();
      const url = mapsSearch(p.coords.latitude, p.coords.longitude);
      openUrl(waShare(tr(settings.lang, 'shareText') + ' ' + url));
      say('shared');
      return;
    }

    /* help me */
    if (/help me|मदद/.test(text)) {
      if (!settings.emergencyContact) { say('helpNoContact'); return; }
      const p = await getPos();
      let addr = '';
      try { addr = await reverseGeocode(p.coords.latitude, p.coords.longitude) || ''; } catch (e) {}
      const url = mapsSearch(p.coords.latitude, p.coords.longitude);
      speak(tr(settings.lang, 'helpLead') + addr);
      openUrl(waTo(settings.emergencyContact, 'HELP. I need assistance. ' + addr + ' ' + url));
      return;
    }

    say('notUnderstood');
  } catch (err) {
    if (err && err.code === 1) say('needLocation');
    else say('servicesDown');
  } finally {
    done();
  }
}
