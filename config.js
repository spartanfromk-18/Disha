/* =====================================================================
 * config.js — central configuration for Disha.
 *
 * API keys are NEVER hardcoded here and NEVER committed.
 *
 * How keys reach the app (pick one):
 *   1. Local dev:  cp .env.example .env   (fill values)
 *                  node scripts/inject-env.js   -> generates js/env.generated.js (gitignored)
 *   2. Netlify / Vercel: set build env vars; run the inject script in the
 *      build command, e.g.  `node scripts/inject-env.js && <your build>`
 *   3. Any static host: define window.__DISHA_ENV__ in a snippet before
 *      js/main.js loads.
 *
 * Today Disha runs keyless (OpenStreetMap). The holders below are ready
 * for upgrades (embedded maps, weather briefings) without restructuring.
 * ===================================================================== */

// Optional generated file — missing is fine, we catch and continue.
try {
  await import('./env.generated.js'); // sets window.__DISHA_ENV__ when present
} catch (e) { /* keyless mode */ }

const injected = (typeof window !== 'undefined' && window.__DISHA_ENV__) || {};

export const config = {
  env: injected.NODE_ENV || 'production',

  // --- geospatial backends (keyless today) ---
  nominatimBase: injected.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
  overpassBase: injected.OVERPASS_BASE || 'https://overpass-api.de/api/interpreter',

  // --- reserved key holders (empty = feature stays keyless/degraded) ---
  googleMapsApiKey: injected.GOOGLE_MAPS_API_KEY || '',
  openWeatherApiKey: injected.OPENWEATHER_API_KEY || '',

  // --- tuning ---
  defaultLang: injected.DEFAULT_LANG || 'en-IN',
  nearbyRadiusM: parseInt(injected.NEARBY_RADIUS_M || '1500', 10),
  chimeRadiusM: parseInt(injected.CHIME_RADIUS_M || '100', 10),
  arrivalRadiusM: parseInt(injected.ARRIVAL_RADIUS_M || '12', 10),
};

export default config;
