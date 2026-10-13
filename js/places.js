/* places.js — "what's near me" via the Overpass API (OpenStreetMap).
 * Free, keyless, fair-use: 1 query per command, radius from config. */
import { config } from './config.js';
import { haversineKm } from './geo.js';

/**
 * Returns up to 3 closest amenities: [{ name, distM }].
 * Throws on service failure — callers degrade per ARCHITECTURE §6.
 */
export async function nearby(lat, lon) {
  const r = config.nearbyRadiusM;
  const q = `[out:json][timeout:25];(` +
    `node(around:${r},${lat},${lon})["amenity"~"^(pharmacy|hospital|clinic|doctors|atm)$"];` +
    `node(around:${r},${lat},${lon})["highway"="bus_stop"];` +
    `);out 20;`;
  const res = await fetch(config.overpassBase + '?data=' + encodeURIComponent(q));
  if (!res.ok) throw new Error('places-fail');
  const j = await res.json();
  return (j.elements || [])
    .map((e) => {
      const tags = e.tags || {};
      return {
        name: tags.name || tags.amenity || tags.highway || 'place',
        distM: haversineKm(lat, lon, e.lat, e.lon) * 1000,
      };
    })
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 3);
}
