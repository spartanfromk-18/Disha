/* places.js — "what's near me" via the Overpass API (OpenStreetMap).
 * Free, keyless, fair-use: 1 query per command, radius from config. */
import { config } from './config.js';
import { haversineKm } from './geo.js';

/**
 * Returns up to 3 closest Indian landmarks, services and transit stops.
 * Throws on service failure — callers degrade per ARCHITECTURE §6.
 */
export async function nearby(lat, lon) {
  const r = config.nearbyRadiusM;
  const q = `[out:json][timeout:25];(` +
    `node(around:${r},${lat},${lon})["amenity"~"^(pharmacy|hospital|clinic|doctors|atm|restaurant|school|place_of_worship)$"];` +
    `node(around:${r},${lat},${lon})["highway"~"^(bus_stop|platform)$"];` +
    `node(around:${r},${lat},${lon})["public_transport"~"^(station|stop_position|platform)$"];` +
    `node(around:${r},${lat},${lon})["railway"~"^(station|halt|tram_stop|subway_entrance)$"];` +
    `node(around:${r},${lat},${lon})["shop"~"^(supermarket|convenience)$"];` +
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
