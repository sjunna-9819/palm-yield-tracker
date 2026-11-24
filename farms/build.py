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
