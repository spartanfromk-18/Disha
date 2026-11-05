import { getPos, searchPlace } from './geo.js';

let map;
let marker;

const INDIA_CENTER = [22.5937, 78.9629];

function status(message) {
  const element = document.getElementById('mapStatus');
  if (element) element.textContent = message;
}

function setMarker(lat, lon, label) {
  if (!map) return;
  if (marker) marker.remove();
  marker = window.L.marker([lat, lon]).addTo(map).bindPopup(label || 'Selected place').openPopup();
  map.setView([lat, lon], 15);
}

export function initMap() {
  if (!window.L || !document.getElementById('map')) {
    status('Map is unavailable offline. Voice and search still work.');
    return;
  }
  map = window.L.map('map').setView(INDIA_CENTER, 5);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  document.getElementById('locateBtn').addEventListener('click', locate);
  document.getElementById('mapSearch').addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = document.getElementById('mapQuery').value.trim();
    if (!query) return;
    status('Searching global places…');
    try {
      const place = await searchPlace(query);
      if (!place) {
        status('No place found. Try a landmark, station, hospital or city.');
        return;
      }
      setMarker(place.lat, place.lon, place.name);
      status(place.name);
    } catch {
      status('Search is unavailable. Check your connection and try again.');
    }
  });
}

async function locate() {
  status('Finding your location…');
  try {
    const position = await getPos();
    const { latitude, longitude } = position.coords;
    setMarker(latitude, longitude, 'You are here');
    status('Your current location');
  } catch {
    status('Location permission is needed to locate you.');
  }
}
