/* Satellite maps (Leaflet + Esri imagery). One factory, used by the Walk screen and the Palms tab.
   Each palm with a saved GPS spot is a numbered dot coloured by status; the phone's own
   position is a blue dot with its accuracy ring. Palms far apart (different farms) are
   grouped into "places" with a jump button each. */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const metres = (a, b) => {
  const k = 111320, c = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
  return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * c);
};
// a point joins a place if it is within 300 m of any point already in it
function group(pts) {
  const out = [];
  for (const p of pts) {
    const g = out.find(g => g.some(q => metres(p, q) < 300));
    if (g) g.push(p); else out.push([p]);
  }
  return out;
}

/* opts: open(id), label(i, n) -> place button text, rings (accuracy rings, default true), follow (keep "you" in view) */
export function createSatMap(el, placesEl, opts = {}) {
  let map = null, layer = null, youDot = null, youRing = null, lastKey = '', places = [], fitted = false, userMoved = false;
  function ensure() {
    if (map) return;
    map = L.map(el, { zoomControl: true, attributionControl: true, maxZoom: 21 });
    L.tileLayer(TILES, { maxZoom: 21, maxNativeZoom: 18, attribution: 'Imagery © Esri' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('dragstart', () => { userMoved = true; });
  }
  function draw(pts) {
    ensure();
    const key = JSON.stringify(pts.map(p => [p.id, p.lat, p.lng, p.cls, p.hi]));
    if (key === lastKey) { map.invalidateSize(); return; }
    lastKey = key; layer.clearLayers();
    for (const p of pts) {
      if (opts.rings !== false) L.circle([p.lat, p.lng], { radius: Math.max(p.acc || 0, 0.5), color: '#fff', weight: 1, opacity: .5, fillOpacity: .06, interactive: false }).addTo(layer);
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: `sat-pin ${p.cls || 'c0'}${p.hi ? ' hi' : ''}`, html: `<span>${p.n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        keyboard: false, title: p.id, zIndexOffset: p.hi ? 1000 : 0,
      }).on('click', () => opts.open && opts.open(p.id)).addTo(layer);
    }
    const gs = group(pts);
    places = gs.map(g => L.latLngBounds(g.map(p => [p.lat, p.lng])).pad(0.25));
    if (placesEl) {
      placesEl.innerHTML = places.length > 1 ? gs.map((g, i) => `<button class="chip" data-place="${i}">${opts.label ? opts.label(i + 1, g.length) : 'Place ' + (i + 1)}</button>`).join('') : '';
      placesEl.onclick = e => { const b = e.target.closest('[data-place]'); if (b) { userMoved = true; map.fitBounds(places[+b.dataset.place], { maxZoom: 20 }); } };
    }
    setTimeout(() => {
      map.invalidateSize();
      if (!fitted) { fitted = true; if (places.length) map.fitBounds(places[0], { maxZoom: 20 }); else map.setView([16.7935, 79.295], 15); }
    }, 0);
  }
  // fix: {lat, lng, acc} or null
  function you(fix) {
    ensure();
    if (!fix) { if (youDot) { youDot.remove(); youRing.remove(); youDot = youRing = null; } return; }
    const ll = [fix.lat, fix.lng];
    if (!youDot) {
      youRing = L.circle(ll, { radius: fix.acc || 5, color: '#2f80ed', weight: 1, fillColor: '#2f80ed', fillOpacity: .15, interactive: false }).addTo(map);
      youDot = L.marker(ll, { icon: L.divIcon({ className: 'you-dot', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 2000 }).addTo(map);
    } else { youDot.setLatLng(ll); youRing.setLatLng(ll); youRing.setRadius(fix.acc || 5); }
    if (opts.follow && !userMoved) map.setView(ll, Math.max(map.getZoom() || 19, 19), { animate: true });
  }
  function recenter() { userMoved = false; if (youDot) map.setView(youDot.getLatLng(), Math.max(map.getZoom(), 19)); else if (places.length) map.fitBounds(places[0], { maxZoom: 20 }); }
  function resize() { if (map) setTimeout(() => map.invalidateSize(), 0); }
  return { draw, you, recenter, resize };
}
