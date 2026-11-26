/* Satellite map: every palm with a saved GPS spot, drawn on real imagery.
   Palms far apart (different farms) are grouped into "places" with a jump button each. */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map = null, layer = null, places = [], lastKey = '';

const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const metres = (a, b) => {
  const k = 111320, c = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
  return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * c);
};

// group points: a point joins a place if it is within 300 m of any point already in it
function group(pts) {
  const out = [];
  for (const p of pts) {
    const g = out.find(g => g.some(q => metres(p, q) < 300));
    if (g) g.push(p); else out.push([p]);
  }
  return out;
}

/* pts: [{id, n, lat, lng, acc}]  opts.label(i, count) -> button text */
export function drawSatMap(el, btnEl, pts, opts = {}) {
  if (!map) {
    map = L.map(el, { zoomControl: true, attributionControl: true, maxZoom: 21 });
    L.tileLayer(TILES, { maxZoom: 21, maxNativeZoom: 18, attribution: 'Imagery © Esri' }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  const key = JSON.stringify(pts.map(p => [p.id, p.lat, p.lng]));
  if (key === lastKey) { map.invalidateSize(); return; }
  const first = !lastKey; lastKey = key;
  layer.clearLayers();
  for (const p of pts) {
    L.circle([p.lat, p.lng], { radius: Math.max(p.acc || 0, 0.5), color: '#fff', weight: 1, opacity: .6, fillOpacity: .08, interactive: false }).addTo(layer);
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'sat-pin', html: `<span>${p.n}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      keyboard: false, title: p.id,
    }).on('click', () => opts.open && opts.open(p.id)).addTo(layer);
  }
  places = group(pts).map(g => L.latLngBounds(g.map(p => [p.lat, p.lng])).pad(0.25));
  btnEl.innerHTML = places.length > 1 ? places.map((_, i) => `<button class="chip" data-place="${i}">${opts.label ? opts.label(i + 1, group(pts)[i].length) : 'Place ' + (i + 1)}</button>`).join('') : '';
  btnEl.onclick = e => { const b = e.target.closest('[data-place]'); if (b) map.fitBounds(places[+b.dataset.place], { maxZoom: 20 }); };
  setTimeout(() => {
    map.invalidateSize();
    if (first || pts.length) {
      if (places.length) map.fitBounds(places[0], { maxZoom: 20 });
      else map.setView([16.7935, 79.295], 15);
    }
  }, 0);
}
export function resizeSatMap() { if (map) setTimeout(() => map.invalidateSize(), 0); }
