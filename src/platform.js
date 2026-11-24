/* Native platform layer: replaces the claude.ai runtime (db / user / downloads) with
   Firebase Firestore (offline cache) + anonymous sign-in + PIN join, and adds QR scan + GPS. */
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { initializeAuth, indexedDBLocalPersistence, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
import { firebaseConfig } from './firebase-config.js';

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE');
let fs = null, auth = null, uid = null, role = null;

/* A Firestore write resolves only when the server confirms it. In the field there may be no signal,
   so we return as soon as the write is in the phone's cache and report server rejections separately. */
const soon = p => { p.catch(e => window.dispatchEvent(new CustomEvent('pbr:syncerror', { detail: e && e.code }))); return Promise.race([p, new Promise(r => setTimeout(r, 350))]); };
function docApi(path) {
  const r = doc(fs, path);
  return {
    set: d => soon(setDoc(r, d)),
    delete: () => soon(deleteDoc(r)),
    onSnapshot: (cb, err) => onSnapshot(r, s => cb({ exists: s.exists(), id: s.id, data: () => s.data(), metadata: s.metadata }), err)
  };
}
function colApi(path) {
  const r = collection(fs, path);
  return {
    doc: id => docApi(path + '/' + id),
    add: d => soon(setDoc(doc(r), d)),
    onSnapshot: (cb, err) => onSnapshot(r, { includeMetadataChanges: true }, s => {
      if (path === 'palms' || path === 'tickets') window.dispatchEvent(new CustomEvent('pbr:pending', { detail: { path, pending: s.metadata.hasPendingWrites } }));
      cb({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })), metadata: s.metadata });
    }, err)
  };
}
const dbNs = { doc: docApi, collection: colApi };

/* ---------- phone-only mode (no Firebase yet) ----------
   Same doc/collection API as above, kept in this phone's localStorage under LOCAL_KEY
   as { "config/farm": {...}, "palms/B01-0001": {...}, ... }. Everything works on one
   phone; once Firebase is added, Setup → "Copy this phone's data to the farm database"
   uploads it. */
const LOCAL_KEY = 'pyt:localdb';
const local = (() => {
  let store = {}; try { store = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch {}
  const subs = new Set();
  const persist = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(store)); } catch { window.dispatchEvent(new CustomEvent('pbr:syncerror', { detail: 'storage-full' })); } };
  const meta = { fromCache: false, hasPendingWrites: false };
  const fire = () => subs.forEach(f => f());
  const docSnap = path => ({ exists: path in store, id: path.split('/').pop(), data: () => store[path] && JSON.parse(JSON.stringify(store[path])), metadata: meta });
  const colDocs = path => Object.keys(store).filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/')).map(k => ({ id: k.slice(path.length + 1), data: () => JSON.parse(JSON.stringify(store[k])) }));
  const listen = f => { subs.add(f); setTimeout(f, 0); return () => subs.delete(f); };
  const ldoc = path => ({
    set: async d => { store[path] = JSON.parse(JSON.stringify(d)); persist(); fire(); },
    delete: async () => { delete store[path]; persist(); fire(); },
    onSnapshot: cb => listen(() => cb(docSnap(path)))
  });
  const lcol = path => ({
    doc: id => ldoc(path + '/' + id),
    add: async d => ldoc(path + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).set(d),
    onSnapshot: cb => listen(() => cb({ docs: colDocs(path), metadata: meta }))
  });
  return { db: { doc: ldoc, collection: lcol }, all: () => store, replace: d => { store = d; persist(); fire(); } };
})();
export const localData = local;
export const isShared = () => configured;
/* upload everything in phone-only storage to Firestore (owner only, once) */
export async function uploadLocal() {
  const all = local.all(), keys = Object.keys(all);
  for (let i = 0; i < keys.length; i += 400) {
    const b = writeBatch(fs);
    keys.slice(i, i + 400).forEach(k => b.set(doc(fs, k), all[k]));
    await b.commit();
  }
  return keys.length;
}
const userNs = { id: async () => uid, canEdit: async () => role === 'admin', can: async n => n === 'data.write' ? !!role : null, isOwner: async () => role === 'admin' };
const downloadsNs = {
  async save({ filename, data }) {
    const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(data); });
    if (!Capacitor.isNativePlatform()) { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename; a.click(); return; }
    const w = await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache });
    await Share.share({ title: filename, url: w.uri });
  }
};

/* ---------- join screen (first launch only) ---------- */
const JT = {
  en: { title: 'Join your farm', name: 'Your name', pin: 'Farm PIN', go: 'Join', hint: 'Ask the farm owner for the PIN. Workers use the worker PIN; the owner uses the owner PIN.', bad: 'Wrong PIN, or no signal. Check and try again.', net: 'Needs signal the first time. Try again near a tower.', setup: 'This app is not connected to a farm database yet. The owner adds the Firebase settings (see SETUP.md).' },
  te: { title: 'మీ తోటలో చేరండి', name: 'మీ పేరు', pin: 'తోట PIN', go: 'చేరండి', hint: 'PIN కోసం తోట యజమానిని అడగండి. కూలీలు వర్కర్ PIN, యజమాని ఓనర్ PIN వాడాలి.', bad: 'PIN తప్పు, లేదా సిగ్నల్ లేదు. మళ్ళీ ప్రయత్నించండి.', net: 'మొదటిసారి సిగ్నల్ కావాలి. సిగ్నల్ ఉన్న చోట మళ్ళీ ప్రయత్నించండి.', setup: 'ఈ యాప్ ఇంకా తోట డేటాబేస్‌కు కనెక్ట్ కాలేదు. యజమాని Firebase సెట్టింగ్స్ జోడించాలి (SETUP.md).' }
};
const lang = () => { try { return localStorage.getItem('pbr:lang') === 'te' ? 'te' : 'en'; } catch { return 'en'; } };
function joinScreen(msg) {
  return new Promise(resolve => {
    const L = JT[lang()], el = document.getElementById('join');
    el.innerHTML = `<div class="in"><h1>${L.title}</h1>
      ${msg === 'setup' ? `<p>${L.setup}</p>` : `<label class="field"><span>${L.name}</span><input id="jName" autocomplete="name"></label>
      <label class="field"><span>${L.pin}</span><input id="jPin" inputmode="numeric" autocomplete="off"></label>
      <button class="btn go" id="jGo">${L.go}</button><p class="hint">${L.hint}</p><p class="hint" id="jErr" style="color:var(--bad)"></p>`}</div>`;
    el.hidden = false;
    const go = document.getElementById('jGo'); if (!go) return;
    go.onclick = async () => {
      const name = document.getElementById('jName').value.trim().slice(0, 40), pin = document.getElementById('jPin').value.trim();
      if (!pin) return; go.disabled = true;
      for (const r of ['admin', 'worker']) {
        try {
          const b = writeBatch(fs);
          b.set(doc(fs, 'joins/' + uid), { pin, t: Date.now() });
          b.set(doc(fs, 'members/' + uid), { name, role: r, t: Date.now() });
          await b.commit(); role = r; el.hidden = true; resolve(); return;
        } catch (e) { if (e && e.code === 'unavailable') { document.getElementById('jErr').textContent = L.net; go.disabled = false; return; } }
      }
      document.getElementById('jErr').textContent = L.bad; go.disabled = false;
    };
  });
}

let ready = null;
function init() {
  if (ready) return ready;
  ready = (async () => {
    if (!configured) { uid = 'this-phone'; role = 'admin'; return 'local'; }
    const app = initializeApp(firebaseConfig);
    fs = initializeFirestore(app, { localCache: persistentLocalCache() });
    auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
    uid = await new Promise(res => { const off = onAuthStateChanged(auth, u => { if (u) { off(); res(u.uid); } }); signInAnonymously(auth).catch(() => {}); });
    try { localStorage.setItem('pbr:uid', uid); } catch {}
    let m = null;
    try { m = await getDoc(doc(fs, 'members/' + uid)); } catch {}
    if (m && m.exists()) role = m.data().role;
    else { try { role = localStorage.getItem('pbr:role'); } catch {} if (!role) await joinScreen(); }
    try { localStorage.setItem('pbr:role', role); } catch {}
    return true;
  })();
  return ready;
}
export const claude = {
  async use(name) {
    const ok = await init();
    if (!ok) return null;
    return { db: ok === 'local' ? local.db : dbNs, user: userNs, downloads: downloadsNs }[name] || null;
  }
};

/* ---------- QR scan ---------- */
export async function scanTag() {
  const r = await CapacitorBarcodeScanner.scanBarcode({ hint: CapacitorBarcodeScannerTypeHint.QR_CODE, scanInstructions: lang() === 'te' ? 'చెట్టు ట్యాగ్ QR కోడ్‌ను చూపించండి' : 'Point at the palm tag QR code' });
  const m = /([A-Za-z0-9]+-\d{1,5})\s*$/.exec((r && r.ScanResult) || '');
  return m ? m[1].toUpperCase() : null;
}

/* ---------- GPS: watch ~8 s, keep the most accurate fix ---------- */
export async function getLocation(onUpdate) {
  if (webGeo()) {
    let best = null;
    const stop = await watchLocation(f => { if (!best || f.acc < best.acc) { best = f; onUpdate && onUpdate(best); } });
    await new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { if ((best && best.acc <= 3) || Date.now() - t0 > 8000) { clearInterval(iv); res(); } }, 250); });
    stop(); return best;
  }
  try { const p = await Geolocation.checkPermissions(); if (p.location !== 'granted') await Geolocation.requestPermissions(); } catch {}
  let best = null, id = null;
  await new Promise(res => {
    const stop = () => { if (id != null) Geolocation.clearWatch({ id }); res(); };
    Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, (pos, err) => {
      if (err || !pos) return;
      const c = pos.coords;
      if (!best || c.accuracy < best.acc) { best = { lat: +c.latitude.toFixed(7), lng: +c.longitude.toFixed(7), acc: Math.round(c.accuracy * 10) / 10, t: Date.now() }; onUpdate && onUpdate(best); }
      if (best.acc <= 3) stop();
    }).then(w => { id = w; });
    setTimeout(stop, 8000);
  });
  return best;
}

/* ---------- GPS: continuous watch for "find palm near me" ----------
   On the website (Safari / Chrome) the browser's own geolocation is used directly;
   onError gets 'denied' | 'unavailable' | 'timeout' so screens can say what is wrong. */
const webGeo = () => !Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.geolocation;
export async function watchLocation(onFix, onError) {
  if (webGeo()) {
    const id = navigator.geolocation.watchPosition(
      pos => { const c = pos.coords; onFix({ lat: +c.latitude.toFixed(7), lng: +c.longitude.toFixed(7), acc: Math.round(c.accuracy * 10) / 10, t: Date.now() }); },
      err => onError && onError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }
  try { const p = await Geolocation.checkPermissions(); if (p.location !== 'granted') await Geolocation.requestPermissions(); } catch {}
  const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }, (pos, err) => {
    if (err || !pos) return;
    const c = pos.coords;
    onFix({ lat: +c.latitude.toFixed(7), lng: +c.longitude.toFixed(7), acc: Math.round(c.accuracy * 10) / 10, t: Date.now() });
  });
  return () => Geolocation.clearWatch({ id });
}
