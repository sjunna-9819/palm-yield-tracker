(() => {
const $ = id => document.getElementById(id);
const mobile = Math.min(innerWidth, innerHeight) < 600;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

/* ---------- renderer, scene, camera ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.75 : 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 20000);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 3; controls.maxDistance = 900; controls.screenSpacePanning = false;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

/* ---------- canvas texture helpers ---------- */
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso; if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t;
}
// one oil-palm frond: rachis down the middle, leaflets on both sides angled toward the tip
const frondTex = canvasTex(256, 1024, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const P0 = 0.2;   // bare, spiny petiole: no leaflets on the first fifth of the frond
  for (let i = 0; i < 300; i++) {
    const t = P0 + (i / 300) * (1 - P0), y = h - t * h * 0.985, u = (t - P0) / (1 - P0);
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)), 0.55);
    const L = (w / 2 - 4) * env * (0.55 + Math.random() * 0.5); if (L < 5) continue;
    const side = i % 2 ? 1 : -1, ang = 0.3 + Math.random() * 0.6, l = 150 + Math.random() * 80; if (Math.random() < 0.12) continue;
    g.strokeStyle = `rgb(${l * 0.9 | 0},${l | 0},${l * 0.75 | 0})`; g.lineWidth = 1.8 + env * 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w / 2, y);
    g.quadraticCurveTo(w / 2 + side * L * 0.5, y - L * Math.sin(ang) * 0.35, w / 2 + side * L * Math.cos(ang * 0.4), y - L * Math.sin(ang) * 0.9 - 4); g.stroke();
  }
  g.strokeStyle = 'rgb(215,205,150)'; g.lineCap = 'butt';
  for (let y = h; y > 4; y -= 4) { const t = 1 - y / h; g.lineWidth = 9 - t * 7; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2, y - 5); g.stroke(); }
  g.strokeStyle = 'rgb(190,180,120)'; g.lineWidth = 1.5;
  for (let y = h - 10; y > h * (1 - P0); y -= 14) { g.beginPath(); g.moveTo(w / 2 - 5, y); g.lineTo(w / 2 - 14, y - 8); g.moveTo(w / 2 + 5, y - 7); g.lineTo(w / 2 + 14, y - 15); g.stroke(); }
});
// trunk: rough diamond pattern of old frond bases
const trunkTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#3f3a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${70 + Math.random() * 30 | 0},${85 + Math.random() * 30 | 0},${40 + Math.random() * 20 | 0},.35)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 10 + Math.random() * 30, 0, 0, 6.28); g.fill(); } for (let i = 0; i < 3000; i++) { const v = 40 + Math.random() * 50; g.fillStyle = `rgba(${v + 15},${v + 8},${v},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  for (let r = 0; r < 16; r++) for (let c = 0; c < 6; c++) {
    const x = (c + (r % 2) * 0.5) * w / 6 + (Math.random() - 0.5) * 10, y = r * h / 16 + (Math.random() - 0.5) * 8, s = 0.7 + Math.random() * 0.5, v = 60 + Math.random() * 40;
    g.fillStyle = `rgb(${v + 18 | 0},${v + 6 | 0},${v - 12 | 0})`;
    g.beginPath(); g.moveTo(x, y - 18 * s); g.lineTo(x + 22 * s, y + 8 * s); g.lineTo(x, y + 26 * s); g.lineTo(x - 22 * s, y + 8 * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(20,14,8,.55)'; g.fillRect(x - 14 * s, y + 6 * s, 28 * s, 5 * s);
  }
}, { repeat: true });
const trunkBump = canvasTex(256, 512, g => g.drawImage(trunkTex.image, 0, 0), { repeat: true, srgb: false });
// leaf cluster for neighbour trees
const leafTex = canvasTex(256, 256, (g, w, h) => {
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * 6.28, r = Math.pow(Math.random(), 0.6) * 110, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.9;
    const l = 150 + Math.random() * 90; g.fillStyle = `rgb(${l * 0.88 | 0},${l | 0},${l * 0.7 | 0})`;
    g.save(); g.translate(x, y); g.rotate(Math.random() * 6.28); g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 6.28); g.fill(); g.restore();
  }
});
// grass / weed tuft
const grassTex = canvasTex(128, 128, (g, w, h) => {
  for (let i = 0; i < 46; i++) {
    const x = w / 2 + (Math.random() - 0.5) * 70, lean = (Math.random() - 0.5) * 60, hh = 50 + Math.random() * 70, l = 170 + Math.random() * 80;
    g.strokeStyle = `rgb(${l * 0.92 | 0},${l | 0},${l * 0.7 | 0})`; g.lineWidth = 2 + Math.random() * 1.5;
    g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * 0.3, h - hh * 0.6, x + lean, h - hh); g.stroke();
  }
});
// weeded circle around each palm, soft edge
const circleTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(120,98,68,.85)'); gr.addColorStop(0.7, 'rgba(112,92,62,.6)'); gr.addColorStop(1, 'rgba(112,92,62,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) { const a = Math.random() * 6.28, r = Math.random() * 50; g.fillStyle = `rgba(${60 + Math.random() * 60 | 0},${50 + Math.random() * 40 | 0},30,.35)`; g.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); }
});
// fine ground detail, tiled
const detailTex = canvasTex(256, 256, (g, w, h) => {
  const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 150 + (Math.random() - 0.5) * 70; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
  g.putImageData(d, 0, 0);
}, { repeat: true, srgb: false });
// water ripples (tileable, built from sines)
const waterNormal = canvasTex(256, 256, (g, w, h) => {
  const d = g.createImageData(w, h), P = Math.PI * 2, waves = [[3, 1, .9], [1, 4, .7], [5, -2, .5], [-3, 5, .4], [7, 3, .3]].map(([a, b, s]) => [a, b, s, Math.random() * 6]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let nx = 0, ny = 0; for (const [a, b, s, ph] of waves) { const c = Math.cos(P * (a * x / w + b * y / h) + ph) * s; nx += c * a; ny += c * b; }
    const i = (y * w + x) * 4; d.data[i] = 128 + nx * 9; d.data[i + 1] = 128 + ny * 9; d.data[i + 2] = 255; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
}, { repeat: true, srgb: false });

/* ---------- sky + light from the sky ---------- */
const sky = new THREE.Sky(); sky.scale.setScalar(10000); scene.add(sky);
const su = sky.material.uniforms; su.turbidity.value = 9; su.rayleigh.value = 1.6; su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.8;
const pmrem = new THREE.PMREMGenerator(renderer); const skyScene = new THREE.Scene(); const skyCopy = new THREE.Sky(); skyCopy.scale.setScalar(10000); skyScene.add(skyCopy);
let envRT = null;
scene.fog = new THREE.Fog(0xcdd5d8, 500, 2400);

const hemi = new THREE.HemisphereLight(0xdfeaf5, 0x5b4a30, 0.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
const sc = sun.shadow.camera; sc.left = -230; sc.right = 230; sc.top = 230; sc.bottom = -230; sc.near = 10; sc.far = 1400;
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);

/* ---------- terrain from the satellite photo (river carved) ---------- */
function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  let t = L ? ((px - a[0]) * dx + (pz - a[1]) * dz) / L : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
function heightAt(x, z) {
  let d = 1e9; for (let i = 1; i < F.river.length; i++) d = Math.min(d, segDist(x, z, F.river[i - 1], F.river[i]));
  const hw = 9.5; return d < hw ? -2.6 * (1 - (d / hw) ** 2) : 0;
}
const POLYS = F.polys || [F.poly], WETS = F.wets || [F.wet];   // several farms on one page: one outline each
function inPoly(x, z, poly) {
  if (!poly) return POLYS.some(q => inPoly(x, z, q));
  let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}
const inYard = (x, z) => F.blds.some(b => b.kind === 'compound' && Math.abs(x - b.x) < b.w / 2 + 1 && Math.abs(z - b.z) < b.d / 2 + 1);
const gGeo = new THREE.PlaneGeometry(F.W, F.H, mobile ? 180 : 300, mobile ? 164 : 274); gGeo.rotateX(-Math.PI / 2);
{ const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z) + (Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 2.3 + z * 1.7)) * 0.04); } gGeo.computeVertexNormals(); }
const gMat = new THREE.MeshStandardMaterial({ color: 0xb8ad94, roughness: 1, envMapIntensity: 0.5 });
gMat.onBeforeCompile = sh => {
  sh.uniforms.detailMap = { value: detailTex };
  sh.fragmentShader = 'uniform sampler2D detailMap;\n' + sh.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\n#ifdef USE_MAP\n diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMap, vUv * 160.0).rgb * 1.7 * texture2D(detailMap, vUv * 23.0).rgb * 1.7, 0.5);\n#endif');
};
const ground = new THREE.Mesh(gGeo, gMat); ground.receiveShadow = true; scene.add(ground);
new THREE.TextureLoader().load(F.dir + '/ground.jpg', tex => {
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = maxAniso;
  gMat.map = tex; gMat.color.set(0xffffff); gMat.needsUpdate = true; $('loading').hidden = true;
}, undefined, () => { $('loading').textContent = 'Satellite ground did not load; showing plain ground.'; });
{ const s = new THREE.Shape(); const R = 6000; s.moveTo(-R, -R); s.lineTo(R, -R); s.lineTo(R, R); s.lineTo(-R, R); s.lineTo(-R, -R);
  const h = new THREE.Path(); const w = F.W / 2 - 0.2, d = F.H / 2 - 0.2; h.moveTo(-w, -d); h.lineTo(-w, d); h.lineTo(w, d); h.lineTo(w, -d); h.lineTo(-w, -d); s.holes.push(h);
  const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9c8c6c, roughness: 1, side: THREE.DoubleSide })); m.position.y = -0.02; m.receiveShadow = true; scene.add(m); }
const waterMat = new THREE.MeshStandardMaterial({ color: 0x2c4a3f, roughness: 0.06, metalness: 0.0, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.94, envMapIntensity: 1.3 });
waterNormal.repeat.set(40, 40);
const water = new THREE.Mesh(new THREE.PlaneGeometry(F.W, F.H), waterMat);
water.rotation.x = -Math.PI / 2; water.position.y = -0.8; water.receiveShadow = true; scene.add(water);

/* ---------- oil palm ---------- */
function addFrond(pos, uv, col, idx, o) {
  const { az, th0, droop, L, w, color, twist } = o, N = 10, ca = Math.cos(az), sa = Math.sin(az);
  let x = 0, y = 0; const base = pos.length / 3;
  for (let s = 0; s <= N; s++) {
    const t = s / N, th = th0 - droop * t * t * 1.6;
    if (s) { x += Math.cos(th) * L / N; y += Math.sin(th) * L / N; }
    const ww = w * L * (t < 0.2 ? 0.25 + t : 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, (t - 0.2) / 0.8 * 0.95 + 0.05))), dn = ww * (0.45 + twist * t);
    const cx = ca * x, cz = sa * x, px = -sa * ww, pz = ca * ww;
    pos.push(cx + px, y - dn, cz + pz, cx, y, cz, cx - px, y - dn, cz - pz);
    uv.push(0, t, 0.5, t, 1, t);
    const sh = 0.75 + 0.25 * t; for (let k = 0; k < 3; k++) col.push(color.r * sh, color.g * sh, color.b * sh);
    if (s) { const a = base + (s - 1) * 3, b = base + s * 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
  }
}
const LIVE = [lin(0x5f8f2a), lin(0x6c9c30), lin(0x568526), lin(0x77a336)], OLD = lin(0x7d8a34), DEAD = lin(0x7a5a34);
function crownGeometry(kind) {
  const pos = [], uv = [], col = [], idx = []; const GA = 2.39996, n = kind === 0 ? 18 : 44;
  if (kind === 0) {
    // young oil palm (1-4 yr): long feathery fronds arching out from a short bole, only the newest few stand up
    for (let i = 0; i < n; i++) {
      const f = i / n;
      addFrond(pos, uv, col, idx, {
        az: i * GA + (rnd() - 0.5) * 0.35, th0: 1.42 - f * 0.7 + (rnd() - 0.5) * 0.2, droop: 0.4 + f * 0.55 + rnd() * 0.3,
        L: 0.85 + 0.15 * Math.sin(Math.PI * Math.min(1, f * 1.3 + 0.2)) + rnd() * 0.1, w: 0.15, twist: 0.4 + f * 0.3,
        color: f > 0.85 ? OLD : LIVE[Math.floor(rnd() * LIVE.length)]
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  for (let i = 0; i < n; i++) {
    const f = i / n;   // 0 = youngest (top, upright), 1 = oldest (lower, drooping)
    addFrond(pos, uv, col, idx, {
      az: i * GA + (rnd() - 0.5) * 0.2, th0: 1.3 - f * 1.35 + (rnd() - 0.5) * 0.12, droop: 0.4 + f * 0.9 + rnd() * 0.2,
      L: 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, f * 1.4 + 0.25)) + rnd() * 0.08, w: 0.15, twist: 0.25 + f * 0.25,
      color: f > 0.8 ? OLD : LIVE[Math.floor(rnd() * LIVE.length)]
    });
  }
  if (kind === 2) for (let i = 0; i < 6; i++) addFrond(pos, uv, col, idx, { az: rnd() * 6.28, th0: -0.5 - rnd() * 0.5, droop: 1.5, L: 0.85, w: 0.13, twist: 0.6, color: DEAD });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const crownMat = new THREE.MeshStandardMaterial({ map: frondTex, vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, alphaTest: 0.45, alphaToCoverage: true, envMapIntensity: 0.5 });
const crownDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: frondTex, alphaTest: 0.45 });
const trunkGeo = new THREE.CylinderGeometry(0.34, 0.5, 1, 14, 6, true); trunkGeo.translate(0, 0.5, 0);
{ const p = trunkGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.9 + rnd() * 0.18; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } trunkGeo.computeVertexNormals(); }
const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, bumpMap: trunkBump, bumpScale: 0.06, roughness: 0.95 });
trunkTex.repeat.set(2, 3); trunkBump.repeat.set(2, 3);
function mergeGeos(list) {
  const pos = [], nor = [], uv = [], col = [], idx = []; let off = 0;
  list.forEach(g => { const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); c ? col.push(c.getX(i), c.getY(i), c.getZ(i)) : col.push(1, 1, 1); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
    off += p.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
const tint = (g, c) => { const a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); return g; };
const bunchGeo = (() => { const parts = [], black = lin(0x1c1412), red = lin(0xb8361a), orange = lin(0xe0701f);
  for (let i = 0; i < 46; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.28, r = Math.sqrt(1 - u * u), y = u * 0.32;
    const f = new THREE.IcosahedronGeometry(0.055 + rnd() * 0.02, 0); f.scale(1, 1.3, 1);
    f.translate(Math.cos(a) * r * 0.2, y, Math.sin(a) * r * 0.2);
    const ripe = Math.max(0, Math.min(1, 0.5 - u * 0.6 + (rnd() - 0.5) * 0.4)), c = black.clone().lerp(rnd() < 0.5 ? red : orange, ripe);
    parts.push(tint(f.toNonIndexed(), c)); }
  for (let i = 0; i < 14; i++) { const s = new THREE.ConeGeometry(0.012, 0.12, 3); s.rotateZ(Math.PI / 2 + (rnd() - 0.5)); s.rotateY(rnd() * 6.28); s.translate(0, (rnd() - 0.5) * 0.5, 0); parts.push(tint(s.toNonIndexed(), lin(0x3b2e1c))); }
  const core = new THREE.SphereGeometry(0.19, 10, 8); core.scale(1, 1.6, 1); parts.push(tint(core.toNonIndexed(), black));
  const g = mergeGeos(parts); g.computeVertexNormals(); return g; })();
const bunchMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0 });
const BUNCH = [0x1a1614, 0x221816, 0x2e1a15, 0x3a1d14, 0x6e2a12, 0x9a3a14].map(lin);

/* ---------- GPS trees from the Palm Yield Tracker ----------
   The tracker's Export JSON lists every tree with lat/lng. Those are turned into
   metres (x east, z south, like the map) and slid onto the farm: the page tries
   offsets and small turns and keeps the one where the GPS trees land closest to
   the palms seen in the photo. GPS trees then replace the photo palms near them;
   rows not surveyed yet keep the photo palms. Saved in this browser only. */
/* Where the GPS trees come from:
   - opened from the app (?block=B01): the app keeps the block's surveyed trees in
     localStorage 'pyt.trees.B01' on this phone; they are fitted once and the fit is cached.
   - "Load GPS trees": a survey JSON file exported from the app. */
const qs = new URLSearchParams(location.search), BLOCK = qs.get('block') || 'file';
const RAW_KEY = 'pyt.trees.' + BLOCK, FIT_KEY = 'pyt.fit.' + F.key + '.' + BLOCK;
let gpsInfo = null;
function fitGps(trees) {
  const o = trees[0], kx = 111320 * Math.cos(o.lat * Math.PI / 180), ky = 110540;
  const G = trees.map(t => [(t.lng - o.lng) * kx, -(t.lat - o.lat) * ky]);
  const ref = F.palms.filter(p => inPoly(p[0], p[1]) && !inYard(p[0], p[1]));
  const cell = 6, hash = new Map();
  ref.forEach((p, i) => { const k = Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell); (hash.get(k) || hash.set(k, []).get(k)).push(i); });
  const near = (x, z) => { let best = 1e9, bi = -1; const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of hash.get((cx + a) + ',' + (cz + b)) || []) { const d = Math.hypot(ref[i][0] - x, ref[i][1] - z); if (d < best) { best = d; bi = i; } }
    return [Math.min(best, cell), bi]; };
  const gc = G.reduce((a, p) => [a[0] + p[0] / G.length, a[1] + p[1] / G.length], [0, 0]);
  const place = (rot, dx, dz) => { const c = Math.cos(rot), s = Math.sin(rot); return G.map(p => { const x = p[0] - gc[0], z = p[1] - gc[1]; return [x * c - z * s + dx, x * s + z * c + dz]; }); };
  const score = pts => { let t = 0; const step = Math.max(1, Math.floor(pts.length / 200)); for (let i = 0; i < pts.length; i += step) t += near(pts[i][0], pts[i][1])[0]; return t; };
  let best = { s: 1e18 };
  const [cx0, cz0] = farmCentre();
  for (let r = -6; r <= 6; r += 3) for (let dx = -150; dx <= 150; dx += 6) for (let dz = -150; dz <= 150; dz += 6) {
    const rot = r * Math.PI / 180, sc = score(place(rot, cx0 + dx, cz0 + dz)); if (sc < best.s) best = { s: sc, rot, dx: cx0 + dx, dz: cz0 + dz }; }
  for (const st of [2, 0.5]) { const b0 = { ...best };
    for (let r = -2; r <= 2; r++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const rot = b0.rot + r * st * Math.PI / 360, x = b0.dx + dx * st, z = b0.dz + dz * st, sc = score(place(rot, x, z)); if (sc < best.s) best = { s: sc, rot, dx: x, dz: z }; } }
  const pts = place(best.rot, best.dx, best.dz);
  const ages = pts.map(p => { const [d, i] = near(p[0], p[1]); return i >= 0 && d < cell ? ref[i][2] : null; });
  const known = ages.filter(a => a != null).sort((a, b) => a - b), med = known.length ? known[known.length >> 1] : 0.5;
  const err = pts.reduce((a, p) => a + near(p[0], p[1])[0], 0) / pts.length;
  return { pts: pts.map((p, i) => [+p[0].toFixed(2), +p[1].toFixed(2), ages[i] ?? med]), err, rot: best.rot * 180 / Math.PI };
}
function farmCentre() { let x = 0, z = 0; POLYS.forEach(q => { let a = 0, b = 0; q.forEach(p => { a += p[0]; b += p[1]; }); x += a / q.length / POLYS.length; z += b / q.length / POLYS.length; }); return [x, z]; }   // middle of the farms' centres
try {
  const raw = JSON.parse(localStorage.getItem(RAW_KEY) || 'null');
  if (Array.isArray(raw) && raw.length) {
    const sig = raw.length + ':' + raw[0].lat + ':' + raw[0].lng + ':' + raw[raw.length - 1].lat + ':' + raw[raw.length - 1].lng;
    let fit = JSON.parse(localStorage.getItem(FIT_KEY) || 'null');
    if (!fit || fit.sig !== sig) {
      const f = fitGps(raw.filter(t => Number.isFinite(t.lat) && Number.isFinite(t.lng)));
      fit = { sig, pts: f.pts, err: f.err, rot: f.rot, n: raw.length };
      try { localStorage.setItem(FIT_KEY, JSON.stringify(fit)); } catch (e) {}
    }
    const keep = F.palms.filter(p => !fit.pts.some(g => Math.hypot(g[0] - p[0], g[1] - p[1]) < 4.5));
    F.palms = keep.concat(fit.pts); gpsInfo = fit;
  }
} catch (e) { /* no GPS trees */ }

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
const P = F.palms.filter(([x, z]) => !inYard(x, z)), nP = P.length, groups = [[], [], []];
P.forEach((p, i) => groups[p[2] < 0.3 ? 0 : p[2] < 0.7 ? 1 : 2].push(i));
const palmGroup = new THREE.Group(), bunchSpots = [], trunkList = [];
groups.forEach((list, kind) => {
  [crownGeometry(kind), crownGeometry(kind)].forEach((geo, vi) => {
    const mine = list.filter((_, j) => j % 2 === vi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(geo, crownMat, mine.length); im.customDepthMaterial = crownDepth;
    mine.forEach((pi, j) => {
      const [x, z, age] = P[pi], gy = heightAt(x, z);
      const th = kind === 0 ? 0.2 + age * 0.6 + rnd() * 0.1 : 0.8 + age * age * 4.6 + rnd() * 0.6 * age, R = kind === 0 ? 3.6 + age * 3 + rnd() * 0.5 : 3.4 + age * 3.4 + rnd() * 0.5;
      trunkList.push([x, gy, z, th, kind === 0 ? 0.9 + age : 0.75 + age * 0.35]);
      M.compose(V.set(x, gy + th, z), Q.setFromEuler(E.set((rnd() - 0.5) * 0.08, rnd() * 6.28, (rnd() - 0.5) * 0.08)), S.set(R, R * (0.85 + rnd() * 0.15), R)); im.setMatrixAt(j, M);
      C.setHSL(0, 0, 0.85 + rnd() * 0.3); im.setColorAt(j, C);
      if (age > 0.25) { const nb = 2 + Math.floor(rnd() * 4); for (let b = 0; b < nb; b++) { const a = rnd() * 6.28, r = 0.32 + 0.12 * age; bunchSpots.push([x + Math.cos(a) * r, gy + th - 0.35 - rnd() * 0.45, z + Math.sin(a) * r, 0.6 + age * 0.3, BUNCH[Math.floor(rnd() * BUNCH.length)], a]); } }
    });
    im.castShadow = im.receiveShadow = true; palmGroup.add(im);
  });
});
function trunkGeometry(H) {
  const parts = [], core = new THREE.CylinderGeometry(0.28, 0.38, H + 0.3, 12, Math.max(2, Math.round(H * 2)), true); core.translate(0, (H + 0.3) / 2 - 0.1, 0);
  parts.push(tint(core, lin(0x8a7a5c)));
  const n = Math.max(14, Math.round(H * 30)), brown = lin(0x8a6f4a), moss = lin(0x6f7a3c), dark = lin(0x5a4a34);
  for (let k = 0; k < n; k++) {
    const t = k / n, a = k * 2.39996, y = 0.1 + t * H, top = t > 0.8;
    const len = (top ? 0.45 : 0.3) + rnd() * 0.12, st = new THREE.BoxGeometry(top ? 0.2 : 0.17, 0.06, len);
    st.translate(0, 0, len / 2); st.rotateX(-(0.55 + rnd() * 0.35)); st.translate(0, 0, 0.24); st.rotateY(a); st.translate(0, y, 0);
    parts.push(tint(st.toNonIndexed(), (rnd() < 0.35 ? moss : rnd() < 0.5 ? dark : brown).clone().multiplyScalar(0.8 + rnd() * 0.4)));
  }
  const g = mergeGeos(parts.map(p => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g;
}
const trunkMat2 = new THREE.MeshStandardMaterial({ map: trunkTex, bumpMap: trunkBump, bumpScale: 0.05, roughness: 0.95, vertexColors: true });
{ const buckets = new Map(); trunkList.forEach(t => { const H = Math.max(0.5, Math.round(t[3] * 2) / 2); if (!buckets.has(H)) buckets.set(H, []); buckets.get(H).push(t); });
  buckets.forEach((list, H) => { const im = new THREE.InstancedMesh(trunkGeometry(H), trunkMat2, list.length);
    list.forEach(([x, y, z, h, r], i) => { M.compose(V.set(x, y, z), Q.setFromEuler(E.set((rnd() - 0.5) * 0.05, rnd() * 6.28, (rnd() - 0.5) * 0.05)), S.set(r, h / H, r)); im.setMatrixAt(i, M); });
    im.castShadow = im.receiveShadow = true; palmGroup.add(im); }); }
scene.add(palmGroup);
const bunches = new THREE.InstancedMesh(bunchGeo, bunchMat, bunchSpots.length);
bunchSpots.forEach(([x, y, z, s, c, a], i) => { M.compose(V.set(x, y, z), Q.setFromEuler(E.set(Math.cos(a) * 0.5, a, Math.sin(a) * 0.5)), S.set(s, s, s)); bunches.setMatrixAt(i, M); bunches.setColorAt(i, C.setHSL(0, 0, 0.8 + rnd() * 0.4)); });
bunches.castShadow = true; scene.add(bunches);

const circles = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: circleTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), nP);
P.forEach(([x, z, age], i) => { const s = 2.6 + age * 1.6; M.compose(V.set(x, heightAt(x, z) + 0.03, z), Q.setFromEuler(E.set(0, rnd() * 6.28, 0)), S.set(s, 1, s)); circles.setMatrixAt(i, M); });
circles.receiveShadow = true; scene.add(circles);

/* ---------- weeds and grass tufts inside the farm ---------- */
{ const parts = [0, Math.PI / 3, 2 * Math.PI / 3].map(r => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY(r)), pos = [], uvs = [], ind = []; let off = 0;
  parts.forEach(p => { pos.push(...p.attributes.position.array); uvs.push(...p.attributes.uv.array); ind.push(...Array.from(p.index.array).map(v => v + off)); off += p.attributes.position.count; });
  const merged = new THREE.BufferGeometry(); merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); merged.setIndex(ind);
  { const n = []; for (let i = 0; i < pos.length / 3; i++) n.push(0, 1, 0); merged.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); }
  const N = mobile ? 14000 : 42000, mat = new THREE.MeshStandardMaterial({ map: grassTex, alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9 });
  const im = new THREE.InstancedMesh(merged, mat, N);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; POLYS.flat().forEach(([x, z]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); });
  let k = 0, tries = 0;
  while (k < N && tries++ < N * 6) {
    const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ); if (!inPoly(x, z) || inYard(x, z)) continue;
    const s = 0.25 + rnd() * 0.45;
    M.compose(V.set(x, heightAt(x, z), z), Q.setFromEuler(E.set(0, rnd() * 6.28, 0)), S.set(s * 1.2, s, s * 1.2)); im.setMatrixAt(k, M);
    im.setColorAt(k, C.setHSL(0.2 + rnd() * 0.06, 0.45 + rnd() * 0.2, 0.26 + rnd() * 0.14)); k++;
  }
  im.count = k; im.receiveShadow = true; scene.add(im); }

/* ---------- neighbouring trees and scrub (outside the boundary) ---------- */
const nbr = new THREE.Group();
{ const cards = [], uvs = [], ind = [], nrm = []; let off = 0;
  for (let i = 0; i < 26; i++) {
    const p = new THREE.PlaneGeometry(1, 1), a = rnd() * 6.28, r = Math.pow(rnd(), 0.5) * 0.75, y = (rnd() - 0.35) * 0.9;
    p.rotateX((rnd() - 0.5) * 1.6); p.rotateY(rnd() * 6.28); p.scale(0.9, 0.9, 0.9); p.translate(Math.cos(a) * r, y, Math.sin(a) * r);
    const arr = p.attributes.position.array; cards.push(...arr); uvs.push(...p.attributes.uv.array); ind.push(...Array.from(p.index.array).map(v => v + off)); off += 4;
    for (let j = 0; j < 4; j++) { V.set(arr[j * 3], arr[j * 3 + 1] + 0.3, arr[j * 3 + 2]).normalize(); nrm.push(V.x, V.y, V.z); }
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cards, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); cg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); cg.setIndex(ind);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.85 });
  const im = new THREE.InstancedMesh(cg, leafMat, F.nbr.length); im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.45 });
  const st = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.22, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x3d3125, roughness: 1 }), F.nbr.length);
  F.nbr.forEach(([x, z, v], i) => {
    const gy = heightAt(x, z), r = 1.8 + v * 2.4 + rnd() * 0.7, h = 0.9 + v * 2.4;
    M.compose(V.set(x, gy + h + r * 0.5, z), Q.setFromEuler(E.set(0, rnd() * 6.28, 0)), S.set(r * 1.35, r * 1.05, r * 1.35)); im.setMatrixAt(i, M);
    im.setColorAt(i, C.setHSL(0.21 + rnd() * 0.05, 0.35, 0.16 + rnd() * 0.07));
    M.compose(V.set(x, gy, z), Q.identity(), S.set(1, h + r * 0.5, 1)); st.setMatrixAt(i, M);
  });
  im.castShadow = st.castShadow = true; im.receiveShadow = true; nbr.add(im, st); }
scene.add(nbr);

/* ---------- buildings (from the Google Maps view: walled yard, long shed on its west wall) ---------- */
const plaster = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d8d0bf'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const v = 190 + Math.random() * 40; g.fillStyle = `rgba(${v},${v - 8},${v - 22},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = 'rgba(90,80,60,.25)'; g.fillRect(0, h - 30, w, 30); }, { repeat: true });
const tin = canvasTex(64, 256, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 150 + 60 * Math.sin(x / w * Math.PI * 8); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }, { repeat: true, srgb: false });
const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: 0xc9bfae, roughness: 0.92 });
const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.7 });
const box = (g, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
F.blds.forEach(b => {
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z);
  const roof = new THREE.MeshStandardMaterial({ color: b.roof, roughness: 0.45, metalness: b.kind === 'gable' ? 0.55 : 0, bumpMap: b.kind === 'gable' ? tin : null, bumpScale: 0.03, envMapIntensity: 0.8 });
  if (b.kind === 'compound') {
    const t = 0.23, h = b.h, gate = 4.5, eastLen = b.d, southSeg = (b.w - gate) / 2;
    box(g, b.w, h, t, 0, h / 2, -b.d / 2, wallMat);                      // north
    box(g, t, h, b.d, -b.w / 2, h / 2, 0, wallMat);                      // west
    box(g, t, h, eastLen, b.w / 2, h / 2, 0, wallMat);                   // east
    box(g, southSeg, h, t, -b.w / 2 + southSeg / 2, h / 2, b.d / 2, wallMat);  // south, with a gate gap
    box(g, southSeg, h, t, b.w / 2 - southSeg / 2, h / 2, b.d / 2, wallMat);
    const gateM = new THREE.MeshStandardMaterial({ color: 0x2f4a5a, roughness: 0.5, metalness: 0.6 });
    box(g, gate, h * 0.9, 0.06, 0, h * 0.45, b.d / 2, gateM);
    for (let i = 0; i <= Math.floor(b.w / 3); i++) box(g, 0.35, h + 0.2, 0.35, -b.w / 2 + i * b.w / Math.floor(b.w / 3), (h + 0.2) / 2, -b.d / 2, wallMat);
  } else if (b.kind === 'walls') {
    const t = 0.3; [[b.w, t, 0, -b.d / 2], [b.w, t, 0, b.d / 2], [t, b.d, -b.w / 2, 0], [t, b.d, b.w / 2, 0]].forEach(([w, d, x, z]) => box(g, w, b.h, d, x, b.h / 2, z, wallMat));
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.6, b.d - 0.6), waterMat); wt.rotation.x = -Math.PI / 2; wt.position.y = 0.7; g.add(wt);
  } else {
    const wh = b.kind === 'gable' ? b.h * 0.62 : b.h;
    box(g, b.w, wh, b.d, 0, wh / 2, 0, wallMat);
    const along = b.d > b.w, len = along ? b.d : b.w, nd = Math.max(1, Math.floor(len / 9));
    for (let i = 0; i < nd; i++) { const u = -len / 2 + (i + 0.5) * len / nd;
      box(g, along ? 0.06 : 1.6, 2.2, along ? 1.6 : 0.06, along ? b.w / 2 + 0.03 : u, 1.1, along ? u : b.d / 2 + 0.03, doorMat).castShadow = false; }
    if (b.kind === 'gable') {
      const span = along ? b.w : b.d, rise = b.h - wh, L2 = len + 0.8;
      const sh = new THREE.Shape(); sh.moveTo(-span / 2 - 0.5, -0.05); sh.lineTo(span / 2 + 0.5, -0.05); sh.lineTo(0, rise); sh.lineTo(-span / 2 - 0.5, -0.05);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: L2, bevelEnabled: false }); rg.translate(0, 0, -L2 / 2);
      { const uv = rg.attributes.uv, p = rg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getZ(i) * 0.15, p.getX(i) * 0.15); }
      const r = new THREE.Mesh(rg, roof); r.position.y = wh; if (!along) r.rotation.y = Math.PI / 2; r.castShadow = r.receiveShadow = true; g.add(r);
    } else box(g, b.w + 0.4, 0.22, b.d + 0.4, 0, wh + 0.11, 0, roof);
  }
  scene.add(g);
});

/* ---------- boundary fence: granite posts every 3 m, four barbed-wire strands, on an earth bund ---------- */
const fence = new THREE.Group();
POLYS.forEach((poly, pi) => { const pts = poly.concat([poly[0]]), posts = [], W8 = WETS[pi];
  const wet = i => W8 && W8[i % poly.length] && W8[(i + 1) % poly.length];  // river side: water is the boundary
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], L = Math.hypot(x1 - x0, z1 - z0);
    if (wet(i - 1)) { carry = 0; continue; }
    for (let s = carry; s < L; s += 3) posts.push([x0 + (x1 - x0) * s / L, z0 + (z1 - z0) * s / L]);
    carry = (carry - L) % 3; if (carry < 0) carry += 3;
  }
  const granite = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#a49c8e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 120 + Math.random() * 90; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const postIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.7, 0.16).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ map: granite, roughness: 0.95 }), posts.length);
  posts.forEach(([x, z], i) => {
    const n = posts[(i + 1) % posts.length], yaw = Math.atan2(n[0] - x, n[1] - z);
    M.compose(V.set(x, 0.3, z), Q.setFromEuler(E.set((rnd() - 0.5) * 0.05, yaw, (rnd() - 0.5) * 0.05)), S.set(1, 0.92 + rnd() * 0.12, 1));
    postIM.setMatrixAt(i, M); postIM.setColorAt(i, C.setHSL(0, 0, 0.85 + rnd() * 0.25));
  });
  postIM.castShadow = postIM.receiveShadow = true; fence.add(postIM);
  const H = [0.35, 0.7, 1.05, 1.4], segs = posts.length * H.length;
  const wire = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 4).rotateX(Math.PI / 2).translate(0, 0, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x55524d, roughness: 0.45, metalness: 0.7 }), segs);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); let k = 0;
  posts.forEach(([x, z], i) => {
    const [x1, z1] = posts[(i + 1) % posts.length];
    if (Math.hypot(x1 - x, z1 - z) > 6) { H.forEach(() => { M.makeScale(0, 0, 0); wire.setMatrixAt(k++, M); }); return; }
    H.forEach(h => {
      A.set(x, 0.3 + h, z); B.set(x1, 0.3 + h, z1);
      const L = A.distanceTo(B); M.lookAt(A, B, camera.up); Q.setFromRotationMatrix(M).multiply(flip);
      M.compose(A, Q, S.set(1, 1, L)); wire.setMatrixAt(k++, M);
    });
  });
  wire.castShadow = true; fence.add(wire);
  const hw = 0.9, pos = [], idx = []; let k2 = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    if (wet(i)) continue;
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
    [[x0, z0], [x1, z1]].forEach(([x, z]) => pos.push(x + nx * hw, 0.02, z + nz * hw, x + nx * hw * 0.4, 0.32, z + nz * hw * 0.4, x - nx * hw * 0.4, 0.32, z - nz * hw * 0.4, x - nx * hw, 0.02, z - nz * hw));
    for (let q = 0; q < 3; q++) idx.push(k2 + q, k2 + 4 + q, k2 + q + 1, k2 + q + 1, k2 + 4 + q, k2 + 5 + q);
    k2 += 8;
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
  const bund = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0x8f7652, roughness: 1, side: THREE.DoubleSide }));
  bund.receiveShadow = true; fence.add(bund); });
scene.add(fence);

/* ---------- sun by time of day (Nov, ~16.8°N: sun passes to the south) ---------- */
let envTimer = null;
function setSun(h) {
  const a = (h - 6) / 12 * Math.PI, el = Math.sin(a) * 0.93 + 0.03;
  const d = new THREE.Vector3(Math.cos(a), Math.max(0.03, el), 0.45).normalize();
  sun.position.copy(d).multiplyScalar(700); sun.target.position.set(0, 0, 0);
  su.sunPosition.value.copy(d);
  ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition'].forEach(k => skyCopy.material.uniforms[k].value = su[k].value);
  const low = 1 - Math.min(1, el / 0.5);
  sun.color.setHSL(0.09, 0.25 + low * 0.6, 0.95 - low * 0.2); sun.intensity = 1.2 + 1.8 * (1 - low);
  hemi.intensity = 0.12 + 0.18 * (1 - low);
  scene.fog.color.setHSL(0.1 - low * 0.03, 0.18 + low * 0.3, 0.78 - low * 0.12);
  clearTimeout(envTimer); envTimer = setTimeout(() => { if (envRT) envRT.dispose(); envRT = pmrem.fromScene(skyScene); scene.environment = envRT.texture; }, 60);
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60); $('sunOut').textContent = `${hh}:${String(mm).padStart(2, '0')}`;
}
$('sun').oninput = e => setSun(+e.target.value); setSun(9.5);

/* ---------- stats ---------- */
$('sAcres').textContent = (F.area / 4046.86).toFixed(1);
$('sPalms').textContent = nP.toLocaleString('en-IN');
{ let mx = 0; POLYS.forEach(q => q.forEach(a => q.forEach(b => mx = Math.max(mx, Math.hypot(a[0] - b[0], a[1] - b[1]))))); $('sPer').textContent = Math.round(mx / 10) * 10 + ' m'; }

/* ---------- toggles ---------- */
const tog = (id, fn) => $(id).onclick = () => { const on = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', on); fn(on); };
tog('tFence', on => fence.visible = on);
tog('tBunch', on => bunches.visible = on);
tog('tNbr', on => nbr.visible = on);
tog('tSpin', on => { controls.autoRotate = on; controls.autoRotateSpeed = 0.6; });
$('gpsLoad').onclick = () => $('gpsFile').click();
$('gpsFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const note = $('gpsNote'); note.hidden = false;
  try {
    const d = JSON.parse(await f.text());
    const trees = (d.trees || []).filter(t => Number.isFinite(t.lat) && Number.isFinite(t.lng));
    if (!trees.length) { note.textContent = 'No GPS trees in that file. In the app, survey some rows, then tap Export survey.'; return; }
    localStorage.setItem('pyt.trees.file', JSON.stringify(trees));
    location.search = '?block=file';
  } catch (err) { note.textContent = 'That file is not a survey export.'; }
};
$('gpsClear').onclick = () => { try { localStorage.removeItem(FIT_KEY); if (BLOCK === 'file') localStorage.removeItem(RAW_KEY); } catch (e) {} location.search = ''; };
if (gpsInfo) {
  $('gpsClear').hidden = false;
  $('gpsNote').hidden = false;
  $('gpsNote').textContent = `${gpsInfo.n} palms are placed from GPS (${BLOCK === 'file' ? 'loaded file' : 'block ' + BLOCK}), fitted to the photo with an average gap of ${gpsInfo.err.toFixed(1)} m${Math.abs(gpsInfo.rot) > 0.5 ? `, turned ${gpsInfo.rot.toFixed(1)}°` : ''}. Rows not surveyed yet still use the photo.`;
}
$('more').onclick = () => { const o = $('card').classList.toggle('open'); $('more').setAttribute('aria-expanded', o); $('more').textContent = o ? 'Less' : 'More'; };

/* ---------- camera views ---------- */
const farmC = farmCentre(), SPAN = F.span || 1;   // SPAN > 1 pulls the overview camera back for wide pages
const shed = F.blds.find(b => b.kind === 'compound') || F.blds[0] || { x: 0, z: 0 };
const VIEWS = {
  over: { p: [farmC[0] - 130 * SPAN, 140 * SPAN, farmC[1] + 200 * SPAN], t: [farmC[0], 0, farmC[1] + 10] },
  top: { p: [farmC[0], 420 * SPAN, farmC[1] + 1], t: [farmC[0], 0, farmC[1]] },
  shed: { p: [shed.x - 30, 24, shed.z + 52], t: [shed.x, 2, shed.z] },
  walk: { p: [farmC[0] + 20, 1.7, farmC[1] + 24], t: [farmC[0] + 8, 3.6, farmC[1] + 6] }
};
{ const y = P.find(p => p[2] < 0.15), m = P.find(p => p[2] > 0.95);
  if (y) VIEWS.young = { p: [y[0] + 7, 2.2, y[1] + 9], t: [y[0], 1.2, y[1]] };
  if (m) VIEWS.mature = { p: [m[0] + 9, 2.2, m[1] + 11], t: [m[0], 3.2, m[1]] };
  let best = null; const wc = (() => { const q = POLYS[0]; let x = 0, z = 0; q.forEach(p => { x += p[0]; z += p[1]; }); return [x / q.length, z / q.length]; })();
  for (let gx = -60; gx <= 60; gx += 1.5) for (let gz = -60; gz <= 60; gz += 1.5) {
    const x = wc[0] + gx, z = wc[1] + gz; if (!inPoly(x, z) || inYard(x, z)) continue;
    let d = 1e9, dense = 0; for (const p of P) { const dd = Math.hypot(p[0] - x, p[1] - z); if (dd < d) d = dd; if (dd < 15 && p[2] > 0.6) dense++; }
    const score = Math.min(d, 4.5) * 10 + dense; if (!best || score > best.s) best = { s: score, x, z };
  }
  if (best) VIEWS.walk = { p: [best.x, 1.7, best.z], t: [best.x + 12, 3, best.z - 6] }; }
let tween = null;
function go(v, instant) {
  const V0 = VIEWS[v]; document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  if (mobile && v === 'over') V0.p = [farmC[0] - 190 * SPAN, 230 * SPAN, farmC[1] + 300 * SPAN];
  const to = { p: new THREE.Vector3(...V0.p), t: new THREE.Vector3(...V0.t) };
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { camera.position.copy(to.p); controls.target.copy(to.t); tween = null; return; }
  tween = { from: { p: camera.position.clone(), t: controls.target.clone() }, to, t0: performance.now(), dur: 1600 };
}
document.querySelectorAll('.views button').forEach(b => b.onclick = () => go(b.dataset.v));
controls.addEventListener('start', () => { tween = null; });

/* ---------- loop ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
go(({ '#v-top': 'top', '#v-shed': 'shed', '#v-walk': 'walk', '#v-young': 'young', '#v-mature': 'mature' })[location.hash] || 'over', true);
const needle = $('needle'), dir = new THREE.Vector3();
// floating name labels: one per farm (F.tags) or the page's single label over the middle
const TAGS = F.tags ? F.tags.map(t => { const el = $('tag3d').cloneNode(true); el.removeAttribute('id'); el.textContent = t.name; $('tag3d').after(el); return [el, t.x, t.z]; }) : [[$('tag3d'), farmC[0], farmC[1]]];
renderer.setAnimationLoop(now => {
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    camera.position.lerpVectors(tween.from.p, tween.to.p, e); controls.target.lerpVectors(tween.from.t, tween.to.t, e); if (k === 1) tween = null;
  }
  controls.update();
  waterNormal.offset.set(now * 0.00001, now * 0.000006);
  TAGS.forEach(([tg, x, z]) => { V.set(x, 14, z).project(camera); const show = V.z < 1 && Math.abs(V.x) < 1.1 && Math.abs(V.y) < 1.1 && camera.position.y > 12;
    tg.hidden = !show; if (show) tg.style.transform = `translate(${(V.x + 1) / 2 * innerWidth}px, ${(1 - V.y) / 2 * innerHeight}px) translate(-50%, -100%)`; });
  camera.getWorldDirection(dir); needle.style.transform = `rotate(${Math.atan2(dir.x, -dir.z) * -180 / Math.PI}deg)`;
  renderer.render(scene, camera);
});
})();
