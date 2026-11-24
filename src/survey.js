/* =====================================================================
   GPS survey of palm rows (one survey per block)
   ---------------------------------------------------------------------
   Stored in the shared database at survey/<blockId>:
     { rows: [ { id, no, count, first: fix|null, last: fix|null, marks: { treeNo: fix } } ], t }
   fix = { lat, lng, acc, best, n, t }  (an averaged GPS reading)

   Trees are named R<row>-T<n>. Their positions are never stored: they are
   worked out from the marked trees (see treesOfRow), so re-marking a tree or
   fixing a row's count moves the others automatically.

   "Use for palm map" turns the survey into the block's field layout
   (rows + positions in metres), so palm numbers run row by row.
   ===================================================================== */
import { watchLocation } from './platform.js';

const MARK_MIN_MS = 5000, MARK_MAX_MS = 10000;   // average GPS for 5-10 s
const ACC_LIMIT_M = 8;                            // warn when worse than this
const SPACING_OK = [6, 12];                       // expected palm spacing, metres

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- geometry ---------- */
export function distM(a, b) {
  const R = 6371000, k = Math.PI / 180;
  const dLat = (b.lat - a.lat) * k, dLng = (b.lng - a.lng) * k;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function anchorsOf(row) {
  const out = [];
  if (row.first) out.push({ ...row.first, n: 1 });
  for (const [k, f] of Object.entries(row.marks || {})) { const n = +k; if (n > 1 && n < row.count) out.push({ ...f, n }); }
  if (row.last && row.count > 1) out.push({ ...row.last, n: row.count });
  return out.sort((a, b) => a.n - b.n);
}
/* every tree of a row: marked trees use their own GPS; others are spaced evenly
   between the nearest marked trees (past the last mark the line is continued) */
export function treesOfRow(row) {
  const A = anchorsOf(row);
  if (A.length < 2 || row.count < 1) return [];
  const out = [];
  for (let i = 1; i <= row.count; i++) {
    let j = A.findIndex(a => a.n >= i);
    if (j === -1) j = A.length - 1;
    if (j === 0) j = 1;
    const a = A[j - 1], b = A[j], exact = A.find(x => x.n === i), f = (i - a.n) / (b.n - a.n);
    out.push({ id: `R${row.no}-T${i}`, row: row.no, n: i, marked: !!exact,
      lat: exact ? exact.lat : a.lat + (b.lat - a.lat) * f, lng: exact ? exact.lng : a.lng + (b.lng - a.lng) * f });
  }
  return out;
}
function spacingOf(row) {
  const A = anchorsOf(row); if (A.length < 2) return null;
  return distM(A[0], A[A.length - 1]) / (A[A.length - 1].n - A[0].n);
}
const sortedRows = d => (d.rows || []).slice().sort((a, b) => a.no - b.no);
export const allTrees = d => sortedRows(d).flatMap(treesOfRow);

/* ---------- module state ---------- */
let ctx = null;          // { db, blocks(), canEdit(), toast(), t(), saveLayout(blockId, rows, pos) }
let blockId = null, data = { rows: [] }, unsub = null, lastFix = null, stopLive = null, marking = null;

export function initSurvey(c) {
  ctx = c;
  $('svBlock').onchange = e => pickBlock(e.target.value);
  $('svAdd').onclick = addRow;
  $('svApply').onclick = applyLayout;
  $('svExport').onclick = exportJson;
  $('svRows').addEventListener('click', onRowsClick);
  $('svRows').addEventListener('change', e => {
    if (!e.target.matches('[data-count]')) return;
    const row = rowOf(e.target.closest('[data-row]')); if (row) setCount(row, +e.target.value);
  });
  $('svMarkCancel').onclick = () => { if (marking) { marking.stop(); marking = null; } $('svMark').hidden = true; };
}
/* called when the Survey view opens / closes */
export async function showSurvey(on) {
  if (!on) { if (stopLive) { stopLive(); stopLive = null; } return; }
  refreshBlocks();
  if (!stopLive && !lastFix) chip(null, ctx.t('svWaiting'));
  if (!stopLive) {
    try { stopLive = await watchLocation(f => { lastFix = f; chip(f.acc); drawMap(); }); }
    catch { chip(null, ctx.t('svGpsOff')); }
  }
}
export function refreshBlocks() {
  if (!ctx) return;
  const bs = ctx.blocks();
  $('svBlock').innerHTML = bs.map(b => `<option value="${esc(b.id)}">${esc(b.id)}</option>`).join('');
  if (!bs.find(b => b.id === blockId)) blockId = bs[0] ? bs[0].id : null;
  if (blockId) { $('svBlock').value = blockId; if (!unsub) pickBlock(blockId); }
  render();
}
function pickBlock(id) {
  blockId = id; if (unsub) unsub();
  unsub = ctx.db ? ctx.db.doc('survey/' + id).onSnapshot(s => {
    data = s.exists ? s.data() : { rows: [] };
    if (!Array.isArray(data.rows)) data.rows = [];
    publishTrees(); render();
  }, () => {}) : null;
}
async function save() {
  try { await ctx.db.doc('survey/' + blockId).set({ rows: data.rows, t: Date.now() }); }
  catch { ctx.toast(ctx.t('saveFailed')); }
}
/* the 3D farm pages read these to place palms from GPS */
function publishTrees() {
  try { localStorage.setItem('pyt.trees.' + blockId, JSON.stringify(allTrees(data).map(t => ({ id: t.id, lat: t.lat, lng: t.lng, marked: t.marked })))); } catch {}
}

/* ---------- GPS chip ---------- */
function chip(acc, text) {
  $('svDot').className = 'sv-dot ' + (acc == null ? '' : acc <= 5 ? 'g' : acc <= ACC_LIMIT_M ? 'a' : 'r');
  $('svGps').textContent = text || `GPS ±${acc.toFixed(1)} m`;
}

/* ---------- averaged GPS mark ---------- */
let wakeLock = null;
async function keepAwake(on) {
  try { if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); else if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch { /* optional */ }
}
/* which = 'first' | 'last' | tree number */
async function startMark(row, which) {
  const t = ctx.t, reads = [], t0 = Date.now();
  $('svMarkTitle').textContent = typeof which === 'number' ? t('svStandAt', `R${row.no}-T${which}`) : t(which === 'first' ? 'svStandFirst' : 'svStandLast', row.no);
  $('svMarkResult').hidden = true; $('svMarkResult').innerHTML = '';
  $('svMarkCancel').textContent = t('svCancel');
  $('svMarkCancel').onclick = () => { if (marking) { marking.stop(); marking = null; } $('svMark').hidden = true; };
  $('svMark').hidden = false; keepAwake(true);
  let stopWatch = null;
  try { stopWatch = await watchLocation(f => reads.push(f)); } catch { return showResult(null, t('gpsFail')); }
  const tick = setInterval(() => {
    const ms = Date.now() - t0, f = Math.min(1, ms / MARK_MAX_MS);
    $('svArc').style.strokeDashoffset = String(276.5 * (1 - f));
    $('svSecs').textContent = Math.ceil(Math.max(0, MARK_MAX_MS - ms) / 1000);
    $('svReads').textContent = t('svReads', reads.length);
    const best = reads.length ? Math.min(...reads.map(r => r.acc)) : null;
    $('svMarkAcc').textContent = best == null ? t('svWaiting') : t('svBest', best.toFixed(1));
    if ((ms >= MARK_MIN_MS && best != null && best <= 3 && reads.length >= 5) || ms >= MARK_MAX_MS) finish();
  }, 250);
  marking = { stop: () => { clearInterval(tick); stopWatch && stopWatch(); keepAwake(false); } };

  function finish() {
    if (!marking) return; marking.stop(); marking = null;
    if (!reads.length) return showResult(null, t('svNoReading'));
    const best = Math.min(...reads.map(r => r.acc));
    const use = reads.filter(r => r.acc <= Math.max(best * 2, best + 3));
    let w = 0, lat = 0, lng = 0, accSum = 0;
    for (const r of use) { const k = 1 / (r.acc * r.acc); w += k; lat += r.lat * k; lng += r.lng * k; accSum += r.acc; }
    showResult({ lat: +(lat / w).toFixed(7), lng: +(lng / w).toFixed(7), acc: +(accSum / use.length).toFixed(1), best: +best.toFixed(1), n: use.length, t: Date.now() });
  }
  function showResult(fix, err) {
    const box = $('svMarkResult'); box.hidden = false; $('svArc').style.strokeDashoffset = '0';
    if (!fix) { $('svMarkAcc').textContent = err; box.innerHTML = `<button class="btn go" data-r="retry">${esc(t('svRetry'))}</button>`; }
    else if (fix.acc > ACC_LIMIT_M) {
      $('svMarkAcc').innerHTML = `<span class="sv-pill warn">±${fix.acc} m</span> ${esc(t('svWorse', ACC_LIMIT_M))}`;
      box.innerHTML = `<div class="hint">${esc(t('svWaitRetry'))}</div><button class="btn go" data-r="retry">${esc(t('svRetry'))}</button><button class="btn" data-r="keep">${esc(t('svKeep'))}</button>`;
    } else {
      $('svMarkAcc').innerHTML = `<span class="sv-pill ok">±${fix.acc} m</span> ${esc(t('svFrom', fix.n))}`;
      saveFix(row, which, fix);
      const nx = nextTree(rowById(row.id), which);
      box.innerHTML = (nx ? `<button class="btn go" data-r="next">${esc(t('svNext', `R${row.no}-T${nx}`))}</button>` : '') + `<button class="btn${nx ? '' : ' go'}" data-r="close">${esc(t('svDone'))}</button>`;
    }
    $('svMarkCancel').textContent = t('svClose');
    box.onclick = e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'retry') startMark(row, which);
      if (b.dataset.r === 'next') startMark(rowById(row.id), nextTree(rowById(row.id), which));
      if (b.dataset.r === 'keep') { saveFix(row, which, fix); $('svMark').hidden = true; }
      if (b.dataset.r === 'close') $('svMark').hidden = true;
    };
  }
}
const rowById = id => data.rows.find(r => r.id === id);
const rowOf = el => el ? rowById(el.dataset.row) : null;
function nextTree(row, which) {
  if (!row || typeof which !== 'number') return null;
  return which < row.count ? which + 1 : null;
}
function saveFix(row, which, fix) {
  const r = rowById(row.id); if (!r) return;
  let n = which;
  if (n === 1) which = 'first'; else if (n === r.count) which = 'last';
  if (typeof which === 'number') { r.marks = r.marks || {}; r.marks[n] = fix; } else r[which] = fix;
  save(); render();
  ctx.toast(typeof which === 'number' ? ctx.t('svSavedTree', `R${r.no}-T${n}`, fix.acc) : ctx.t('svSavedEnd', r.no, fix.acc));
}

/* ---------- rows ---------- */
function addRow() {
  if (!blockId) return;
  const no = data.rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
  const prev = sortedRows(data).pop();
  data.rows.push({ id: 'r' + Date.now().toString(36), no, count: prev ? prev.count : 20, first: null, last: null, marks: {} });
  save(); render();
}
function setCount(row, n) { row.count = Math.max(1, Math.min(500, Math.round(n) || 1)); save(); render(); }
function onRowsClick(e) {
  const row = rowOf(e.target.closest('[data-row]')); if (!row) return;
  const t = e.target;
  if (t.closest('[data-tree]')) return showTree(treesOfRow(row).find(x => x.id === t.closest('[data-tree]').dataset.tree), row);
  if (t.closest('[data-mark]')) return startMark(row, t.closest('[data-mark]').dataset.mark);
  if (t.closest('[data-walk]')) { const done = anchorsOf(row).map(a => a.n); let n = 1; while (done.includes(n) && n < row.count) n++; return startMark(row, n); }
  if (t.closest('[data-step]')) return setCount(row, row.count + +t.closest('[data-step]').dataset.step);
  if (t.closest('[data-del]')) return ask(ctx.t('svDelAsk', row.no), ctx.t('svDelRow', row.no), () => { data.rows = data.rows.filter(r => r.id !== row.id); save(); render(); });
}
function endHtml(row, which) {
  const t = ctx.t, e = row[which], label = t(which === 'first' ? 'svFirst' : 'svLast');
  if (!e) return `<div class="sv-end"><b>${esc(label)}</b><span class="hint">${esc(t('svNotMarked'))}</span><button class="btn go small" data-mark="${which}">${esc(t(which === 'first' ? 'svMarkFirst' : 'svMarkLast'))}</button></div>`;
  const poor = e.acc > ACC_LIMIT_M;
  return `<div class="sv-end ${poor ? 'poor' : 'done'}"><b>${esc(label)}</b><span><span class="sv-pill ${poor ? 'warn' : 'ok'}">±${e.acc} m</span> <span class="hint">${esc(t('svReads', e.n))}</span></span><button class="btn small" data-mark="${which}">${esc(t('svRemark'))}</button></div>`;
}
function render() {
  if (!ctx) return;
  const t = ctx.t, box = $('svRows');
  $('svAdd').disabled = !blockId;
  if (!blockId) { box.innerHTML = `<div class="panel hint">${esc(t('svNoBlock'))}</div>`; drawMap(); return; }
  const rows = sortedRows(data);
  box.innerHTML = rows.length ? rows.map(row => {
    const sp = spacingOf(row), trees = treesOfRow(row), nMarked = Object.keys(row.marks || {}).length;
    let spHtml = `<span class="hint">${esc(t('svMark2'))}</span>`;
    if (sp != null) { const ok = sp >= SPACING_OK[0] && sp <= SPACING_OK[1]; spHtml = `<span class="sv-pill ${ok ? 'ok' : 'warn'}">${esc(t('svApart', sp.toFixed(1)))}</span>${ok ? '' : ` <span class="hint">${esc(t('svCheck'))}</span>`}`; }
    return `<section class="panel sv-row" data-row="${esc(row.id)}">
      <div class="sv-head"><h3>${esc(t('svRow', row.no))}</h3><span>${spHtml}</span></div>
      <div class="sv-ends">${endHtml(row, 'first')}${endHtml(row, 'last')}</div>
      <div class="sv-head"><span class="hint">${esc(t('svTrees'))}</span>
        <div class="sv-count"><button data-step="-1" aria-label="−1">−</button><input type="number" inputmode="numeric" min="1" max="500" value="${row.count}" data-count aria-label="${esc(t('svTrees'))}"><button data-step="1" aria-label="+1">+</button></div></div>
      ${trees.length ? `<details><summary class="hint">${esc(t('svShowIds', trees.length, trees.filter(x => x.marked).length))}</summary>
        <div class="sv-trees">${trees.map(x => `<button type="button" class="${x.marked ? 'on' : ''}" data-tree="${x.id}">${x.id}</button>`).join('')}</div></details>` : ''}
      <button class="btn small" data-walk>${esc(t('svWalk'))}${nMarked ? ` (${nMarked})` : ''}</button>
      <button class="btn small sv-del" data-del>${esc(t('svDelRow', row.no))}</button>
    </section>`;
  }).join('') : `<div class="panel hint">${esc(t('svEmpty'))}</div>`;
  const all = allTrees(data);
  $('svSummary').textContent = t('svSummary', rows.length, all.length, all.filter(x => x.marked).length);
  $('svApply').hidden = !ctx.canEdit(); $('svApply').disabled = !all.length;
  drawMap();
}

/* ---------- one tree: location, re-mark, remove mark ---------- */
function showTree(tr, row) {
  if (!tr) return; const t = ctx.t;
  const ll = `${tr.lat.toFixed(6)}, ${tr.lng.toFixed(6)}`;
  const canClear = tr.marked && tr.n !== 1 && tr.n !== row.count;
  sheet(`<div class="sv-big">${tr.id}</div><span class="sv-pill ${tr.marked ? 'ok' : 'warn'}">${esc(t(tr.marked ? 'svGpsMarked' : 'svWorkedOut'))}</span>
    <div style="font-size:19px;user-select:all">${ll}</div>${lastFix ? `<div class="hint">${esc(t('svAway', distM(lastFix, tr).toFixed(0)))}</div>` : ''}
    <button class="btn go" data-s="mark">${esc(t(tr.marked ? 'svRemarkHere' : 'svMarkHere'))}</button>
    ${canClear ? `<button class="btn sv-del" data-s="clear">${esc(t('svRemove'))}</button>` : ''}
    <a class="btn" href="https://maps.google.com/?q=${tr.lat},${tr.lng}" target="_blank" rel="noopener">${esc(t('svOpenMaps'))}</a>
    <button class="btn" data-s="close">${esc(t('svClose'))}</button>`, s => {
    if (s === 'mark') startMark(row, tr.n);
    if (s === 'clear') { delete row.marks[tr.n]; save(); render(); }
  });
}
function ask(text, yes, fn) {
  sheet(`<div class="sv-msg">${esc(text)}</div><button class="btn go" data-s="yes">${esc(yes)}</button><button class="btn" data-s="close">${esc(ctx.t('svCancel'))}</button>`, s => { if (s === 'yes') fn(); });
}
function sheet(html, onPick) {
  const el = $('svSheet'); el.querySelector('.in').innerHTML = html; el.hidden = false;
  el.onclick = e => { const b = e.target.closest('[data-s]'); if (!b && e.target !== el) return; el.hidden = true; if (b) onPick(b.dataset.s); };
}

/* ---------- survey → block field layout ---------- */
function applyLayout() {
  const rows = sortedRows(data).filter(r => treesOfRow(r).length);
  if (!rows.length) return;
  const trees = rows.flatMap(treesOfRow);
  const o = trees[0], kx = 111320 * Math.cos(o.lat * Math.PI / 180), ky = 110540;
  const pos = trees.map(p => [+((p.lng - o.lng) * kx).toFixed(1), +(-(p.lat - o.lat) * ky).toFixed(1)]);
  ask(ctx.t('svApplyAsk', blockId, rows.length, trees.length), ctx.t('svApply'), () => ctx.saveLayout(blockId, rows.map(r => r.count), pos));
}
async function exportJson() {
  const name = `survey-${blockId}-${new Date().toISOString().slice(0, 10)}.json`;
  const body = { app: 'palm-yield-tracker', block: blockId, exported: new Date().toISOString(), rows: data.rows,
    trees: allTrees(data).map(x => ({ id: x.id, lat: +x.lat.toFixed(7), lng: +x.lng.toFixed(7), marked: x.marked })) };
  ctx.download(name, new Blob([JSON.stringify(body, null, 1)], { type: 'application/json' }));
}

/* ---------- small to-scale map of the survey ---------- */
function drawMap() {
  const cv = $('svMap'); if (!cv) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim() || '#17261b', leaf = css.getPropertyValue('--leaf').trim() || '#2d6a3e', muted = css.getPropertyValue('--muted').trim() || '#5d6b5f';
  g.clearRect(0, 0, W, H);
  const trees = allTrees(data), pts = trees.slice(); if (lastFix) pts.push(lastFix);
  if (!trees.length) { g.fillStyle = muted; g.font = '28px system-ui'; g.textAlign = 'center'; g.fillText(ctx ? ctx.t('svMapEmpty') : '', W / 2, H / 2); return; }
  const o = trees[0], kx = 111320 * Math.cos(o.lat * Math.PI / 180), ky = 110540;
  const xy = p => [(p.lng - o.lng) * kx, -(p.lat - o.lat) * ky];
  const P = pts.map(xy), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const minX = Math.min(...xs) - 10, maxX = Math.max(...xs) + 10, minY = Math.min(...ys) - 10, maxY = Math.max(...ys) + 10;
  const s = Math.min(W / (maxX - minX), H / (maxY - minY));
  const sx = p => (xy(p)[0] - minX) * s + (W - (maxX - minX) * s) / 2, sy = p => (xy(p)[1] - minY) * s + (H - (maxY - minY) * s) / 2;
  g.lineWidth = 3; g.strokeStyle = muted;
  for (const row of sortedRows(data)) { const tr = treesOfRow(row); if (tr.length < 2) continue;
    g.globalAlpha = .5; g.beginPath(); g.moveTo(sx(tr[0]), sy(tr[0])); for (const p of tr) g.lineTo(sx(p), sy(p)); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = ink; g.font = 'bold 22px system-ui'; g.textAlign = 'right'; g.fillText('R' + row.no, sx(tr[0]) - 10, sy(tr[0]) + 8); }
  const r = Math.max(3, Math.min(9, s * 2.2));
  for (const tr of trees) { g.fillStyle = leaf; g.globalAlpha = tr.marked ? 1 : .55; g.beginPath(); g.arc(sx(tr), sy(tr), r, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  if (lastFix) {
    g.fillStyle = 'rgba(29,95,209,.18)'; g.beginPath(); g.arc(sx(lastFix), sy(lastFix), lastFix.acc * s, 0, 7); g.fill();
    g.fillStyle = '#1d5fd1'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(sx(lastFix), sy(lastFix), 10, 0, 7); g.fill(); g.stroke();
  }
  g.fillStyle = ink; g.fillRect(16, H - 22, 10 * s, 5); g.font = '20px system-ui'; g.textAlign = 'left'; g.fillText('10 m', 16, H - 30);
}

/* ---------- averaged GPS reading for any screen ----------
   Shows the ring sheet, averages 5-10 s of readings and resolves with
   { lat, lng, acc, best, n, t }, or null if cancelled / no reading. */
export function averageGps(title, t) {
  return new Promise(async resolve => {
    const reads = [], t0 = Date.now();
    let done = false, stopWatch = null, tick = null;
    const end = v => { if (done) return; done = true; clearInterval(tick); stopWatch && stopWatch(); keepAwake(false); resolve(v); };
    $('svMarkTitle').textContent = title;
    $('svMarkResult').hidden = true; $('svMarkResult').innerHTML = '';
    $('svMarkCancel').textContent = t('svCancel');
    $('svMarkCancel').onclick = () => { $('svMark').hidden = true; end(null); };
    $('svMark').hidden = false; keepAwake(true);
    let gpsErr = null;
    if (!('geolocation' in navigator)) gpsErr = 'unavailable';
    else if (!window.isSecureContext) gpsErr = 'insecure';
    try { if (!gpsErr) stopWatch = await watchLocation(f => reads.push(f), e => { gpsErr = e; }); } catch { gpsErr = 'unavailable'; }
    tick = setInterval(() => {
      const ms = Date.now() - t0, f = Math.min(1, ms / MARK_MAX_MS);
      $('svArc').style.strokeDashoffset = String(276.5 * (1 - f));
      $('svSecs').textContent = Math.ceil(Math.max(0, MARK_MAX_MS - ms) / 1000);
      $('svReads').textContent = t('svReads', reads.length);
      const best = reads.length ? Math.min(...reads.map(r => r.acc)) : null;
      $('svMarkAcc').textContent = best == null ? t(gpsErr === 'denied' ? 'gpsDenied' : 'svWaiting') : t('svBest', best.toFixed(1));
      if (gpsErr === 'denied' || gpsErr === 'insecure' || (ms >= MARK_MIN_MS && best != null && best <= 3 && reads.length >= 5) || ms >= MARK_MAX_MS) finish();
    }, 250);
    function finish() {
      clearInterval(tick); stopWatch && stopWatch(); stopWatch = null; keepAwake(false);
      const box = $('svMarkResult'); box.hidden = false;
      if (!reads.length) {
        $('svMarkAcc').textContent = t(gpsErr === 'denied' ? 'gpsDenied' : gpsErr === 'insecure' ? 'gpsInsecure' : 'svNoReading');
        box.innerHTML = `<button class="btn go" data-r="retry">${esc(t('svRetry'))}</button>`;
      } else {
        const best = Math.min(...reads.map(r => r.acc)), use = reads.filter(r => r.acc <= Math.max(best * 2, best + 3));
        let w = 0, lat = 0, lng = 0, accSum = 0;
        for (const r of use) { const k = 1 / (r.acc * r.acc); w += k; lat += r.lat * k; lng += r.lng * k; accSum += r.acc; }
        const fix = { lat: +(lat / w).toFixed(7), lng: +(lng / w).toFixed(7), acc: +(accSum / use.length).toFixed(1), best: +best.toFixed(1), n: use.length, t: Date.now() };
        if (fix.acc <= ACC_LIMIT_M) { $('svMark').hidden = true; end(fix); return; }
        $('svMarkAcc').innerHTML = `<span class="sv-pill warn">±${fix.acc} m</span> ${esc(t('svWorse', ACC_LIMIT_M))}`;
        box.innerHTML = `<div class="hint">${esc(t('svWaitRetry'))}</div><button class="btn go" data-r="retry">${esc(t('svRetry'))}</button><button class="btn" data-r="keep">${esc(t('svKeep'))}</button>`;
        box.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return;
          if (b.dataset.r === 'keep') { $('svMark').hidden = true; end(fix); }
          if (b.dataset.r === 'retry') { $('svMark').hidden = true; done = true; averageGps(title, t).then(resolve); } };
        return;
      }
      box.onclick = e => { const b = e.target.closest('[data-r]'); if (b && b.dataset.r === 'retry') { $('svMark').hidden = true; done = true; averageGps(title, t).then(resolve); } };
    }
  });
}
