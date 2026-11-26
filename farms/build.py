"""Build the 3D farm pages into src/public/farm1.html and farm2.html.
Run from the repo root:  python3 farms/build.py
Each page = farms/<farm>/head.html + farms/<farm>/farm.json (as F) + farms/scene.js."""
import json, pathlib
root = pathlib.Path(__file__).parent
scene = (root / 'scene.js').read_text()
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance

def surround(F, d):
    """Land beyond the photo, SURR x SURR metres, written to <d>/surround.jpg.
    A patchwork of fields, each cut from a random piece of the farm's own satellite photo at true scale
    (so textures, colours and tree sizes match), with earth bunds between plots. Right next to the photo
    its mirror image fades into the patchwork, so the photo's edge has no seam. Sets F['surr'], F['surrCol']."""
    import random
    rng = random.Random(7)
    pub = root.parent / 'src' / 'public' / d
    src = Image.open(pub / 'ground.jpg').convert('RGB')
    SURR = max(4000, 6 * max(F['W'], F['H'])); N = 3072; ppm = N / SURR
    small = src.resize((max(8, round(F['W'] * ppm)), max(8, round(F['H'] * ppm))), Image.LANCZOS)
    sw, sh = small.size
    out = Image.new('RGB', (N, N), (150, 138, 110))
    draw = ImageDraw.Draw(out)
    def plots(x, y, w, h):                       # split into fields of roughly 40-170 m
        lim = 170 * ppm
        if w > lim or h > lim:
            if w >= h: c = rng.uniform(0.3, 0.7) * w; return plots(x, y, c, h) + plots(x + c, y, w - c, h)
            c = rng.uniform(0.3, 0.7) * h; return plots(x, y, w, c) + plots(x, y + c, w, h - c)
        if max(w, h) > 80 * ppm and rng.random() < 0.5:
            if w >= h: c = rng.uniform(0.35, 0.65) * w; return plots(x, y, c, h) + plots(x + c, y, w - c, h)
            c = rng.uniform(0.35, 0.65) * h; return plots(x, y, w, c) + plots(x, y + c, w, h - c)
        return [(x, y, w, h)]
    bunds = []
    for (x, y, w, h) in plots(0, 0, N, N):
        X, Y, Wd, Ht = round(x), round(y), max(2, round(w)), max(2, round(h))
        piece = small.rotate(90 * rng.randrange(4), expand=True) if rng.random() < 0.5 else small
        if rng.random() < 0.5: piece = ImageOps.mirror(piece)
        pw, ph = piece.size
        if pw < Wd or ph < Ht: piece = piece.resize((max(pw, Wd), max(ph, Ht)))
        pw, ph = piece.size
        cx, cy = rng.randrange(0, pw - Wd + 1), rng.randrange(0, ph - Ht + 1)
        crop = piece.crop((cx, cy, cx + Wd, cy + Ht))
        crop = ImageEnhance.Brightness(crop).enhance(rng.uniform(0.9, 1.08))
        out.paste(crop, (X, Y))
        if rng.random() < 0.7: bunds.append([X, Y, X + Wd - 1, Y + Ht - 1])
    # earth bunds between fields: thin, faint, earthy (drawn on a layer and blended in)
    lay = out.copy(); ld = ImageDraw.Draw(lay)
    for b in bunds: ld.rectangle(b, outline=(150, 128, 96))
    out = Image.blend(out, lay, 0.45)
    # the photo's own edge continues outward (mirrored), fading into the fields over ~40 m
    x0, y0 = round(N / 2 - sw / 2), round(N / 2 - sh / 2)
    band = round(40 * ppm)
    mir = Image.new('RGB', (sw + 2 * band, sh + 2 * band))
    for i, fx in ((-1, True), (0, False), (1, True)):
        for j, fy in ((-1, True), (0, False), (1, True)):
            t = small
            if fx: t = ImageOps.mirror(t)
            if fy: t = ImageOps.flip(t)
            mir.paste(t, (band + i * sw, band + j * sh))
    mask = Image.new('L', mir.size, 0); md = ImageDraw.Draw(mask)
    for k in range(band):
        md.rectangle([k, k, mir.size[0] - 1 - k, mir.size[1] - 1 - k], outline=round(255 * (k / band) ** 1.5))
    md.rectangle([band, band, band + sw, band + sh], fill=255)
    out.paste(mir, (x0 - band, y0 - band), mask)
    out = ImageEnhance.Color(out).enhance(0.92)
    col = src.resize((1, 1), Image.BOX).getpixel((0, 0))
    out.save(pub / 'surround.jpg', quality=76)
    F['surr'], F['surrCol'] = SURR, (col[0] << 16) | (col[1] << 8) | col[2]

for key in ('farm1', 'farm2'):
    F = json.loads((root / key / 'farm.json').read_text())
    F['key'], F['dir'] = key, key          # ground.jpg lives in src/public/<key>/
    surround(F, key)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n'
            + (root / key / 'head.html').read_text()
            + '\n<script>const F=' + json.dumps(F, separators=(',', ':')) + ';</script>\n<script>\n'
            + scene + '\n</script>\n</body></html>\n')
    (root.parent / 'src' / 'public' / (key + '.html')).write_text(page)
    print(key, len(page) // 1024, 'KB')

# ---- both farms side by side on one ground (not their real distance apart) ----
GAP = 30                                   # metres of plain ground between the two
A = json.loads((root / 'farm1' / 'farm.json').read_text())
B = json.loads((root / 'farm2' / 'farm.json').read_text())
W, H = A['W'] + GAP + B['W'], max(A['H'], B['H'])
off = {'farm1': -W / 2 + A['W'] / 2, 'farm2': W / 2 - B['W'] / 2}
pub = root.parent / 'src' / 'public'
ppm = Image.open(pub / 'farm2' / 'ground.jpg').size[0] / B['W']       # pixels per metre of the joined photo
CW, CH = round(W * ppm), round(H * ppm)
layers = []
for key, F in (('farm1', A), ('farm2', B)):
    im = Image.open(pub / key / 'ground.jpg').convert('RGB').resize((round(F['W'] * ppm), round(F['H'] * ppm)), Image.LANCZOS)
    iw, ih = im.size; x0, y0 = round((off[key] - F['W'] / 2 + W / 2) * ppm), round((H - F['H']) / 2 * ppm)
    full = Image.new('RGB', (CW, CH))
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            t = im
            if i: t = ImageOps.mirror(t)
            if j: t = ImageOps.flip(t)
            full.paste(t, (x0 + i * iw, y0 + j * ih))
    layers.append(full)
mid = round((A['W'] + GAP / 2) * ppm); fade = round(GAP / 2 * ppm)
mask = Image.new('L', (CW, CH), 0); md = ImageDraw.Draw(mask)
for x in range(CW):
    md.line([(x, 0), (x, CH)], fill=max(0, min(255, round(255 * (x - (mid - fade)) / (2 * fade)))))
canvas = Image.composite(layers[1], layers[0], mask)
(pub / 'both').mkdir(exist_ok=True)
canvas.save(pub / 'both' / 'ground.jpg', quality=84)
sh = lambda pts, dx: [[round(p[0] + dx, 2), *p[1:]] for p in pts]
F = {'W': W, 'H': H, 'area': A['area'] + B['area'], 'span': 2.9, 'key': 'both', 'dir': 'both',
     'palms': sh(A['palms'], off['farm1']) + sh(B['palms'], off['farm2']),
     'nbr': sh(A['nbr'], off['farm1']) + sh(B['nbr'], off['farm2']),
     'river': sh(A['river'], off['farm1']), 'road': [],
     'blds': [{**b, 'x': b['x'] + off['farm1']} for b in A['blds']],
     'polys': [sh(A['poly'], off['farm1']), sh(B['poly'], off['farm2'])],
     'wets': [A.get('wet'), B.get('wet')],
     'bamboos': [A.get('bamboo', 0), B.get('bamboo', 0)],
     'geos': [dict(A['geo'], dx=off['farm1']) if A.get('geo') else None, dict(B['geo'], dx=off['farm2']) if B.get('geo') else None],
     'tags': [{'name': 'Farm 1', 'x': sum(p[0] for p in A['poly']) / len(A['poly']) + off['farm1'], 'z': sum(p[1] for p in A['poly']) / len(A['poly'])},
              {'name': 'Farm 2', 'x': sum(p[0] for p in B['poly']) / len(B['poly']) + off['farm2'], 'z': sum(p[1] for p in B['poly']) / len(B['poly'])}]}
F['poly'] = F['polys'][0]
surround(F, 'both')
page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n'
        + (root / 'both' / 'head.html').read_text()
        + '\n<script>const F=' + json.dumps(F, separators=(',', ':')) + ';</script>\n<script>\n'
        + scene + '\n</script>\n</body></html>\n')
(pub / 'farms.html').write_text(page)
print('farms (both)', len(page) // 1024, 'KB')
