"""Build the 3D farm pages into src/public/farm1.html and farm2.html.
Run from the repo root:  python3 farms/build.py
Each page = farms/<farm>/head.html + farms/<farm>/farm.json (as F) + farms/scene.js."""
import json, pathlib
root = pathlib.Path(__file__).parent
scene = (root / 'scene.js').read_text()
for key in ('farm1', 'farm2'):
    F = json.loads((root / key / 'farm.json').read_text())
    F['key'], F['dir'] = key, key          # ground.jpg lives in src/public/<key>/
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n'
            + (root / key / 'head.html').read_text()
            + '\n<script>const F=' + json.dumps(F, separators=(',', ':')) + ';</script>\n<script>\n'
            + scene + '\n</script>\n</body></html>\n')
    (root.parent / 'src' / 'public' / (key + '.html')).write_text(page)
    print(key, len(page) // 1024, 'KB')

# ---- both farms side by side on one ground (not their real distance apart) ----
from PIL import Image
GAP = 30                                   # metres of plain ground between the two
A = json.loads((root / 'farm1' / 'farm.json').read_text())
B = json.loads((root / 'farm2' / 'farm.json').read_text())
W, H = A['W'] + GAP + B['W'], max(A['H'], B['H'])
off = {'farm1': -W / 2 + A['W'] / 2, 'farm2': W / 2 - B['W'] / 2}
pub = root.parent / 'src' / 'public'
ppm = Image.open(pub / 'farm2' / 'ground.jpg').size[0] / B['W']       # pixels per metre of the joined photo
canvas = Image.new('RGB', (round(W * ppm), round(H * ppm)), (156, 140, 108))
for key, F in (('farm1', A), ('farm2', B)):
    im = Image.open(pub / key / 'ground.jpg').convert('RGB').resize((round(F['W'] * ppm), round(F['H'] * ppm)), Image.LANCZOS)
    canvas.paste(im, (round((off[key] - F['W'] / 2 + W / 2) * ppm), round((H - F['H']) / 2 * ppm)))
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
     'tags': [{'name': 'Farm 1', 'x': sum(p[0] for p in A['poly']) / len(A['poly']) + off['farm1'], 'z': sum(p[1] for p in A['poly']) / len(A['poly'])},
              {'name': 'Farm 2', 'x': sum(p[0] for p in B['poly']) / len(B['poly']) + off['farm2'], 'z': sum(p[1] for p in B['poly']) / len(B['poly'])}]}
F['poly'] = F['polys'][0]
page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n'
        + (root / 'both' / 'head.html').read_text()
        + '\n<script>const F=' + json.dumps(F, separators=(',', ':')) + ';</script>\n<script>\n'
        + scene + '\n</script>\n</body></html>\n')
(pub / 'farms.html').write_text(page)
print('farms (both)', len(page) // 1024, 'KB')
