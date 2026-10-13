/* nav.js — navigation handoffs. Disha never routes (PRD non-goal);
 * it builds deep links and lets Google Maps / WhatsApp do their jobs. */
export const mapsDir = (lat, lon) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;

export const mapsSearch = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

export const waShare = (text) =>
  'https://wa.me/?text=' + encodeURIComponent(text);

export const waTo = (number, text) =>
  'https://wa.me/' + number + '?text=' + encodeURIComponent(text);

export function openUrl(url) { window.open(url, '_blank'); }
