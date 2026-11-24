#!/bin/sh
# Build the app and publish it to GitHub Pages (branch gh-pages).
# Usage: ./deploy.sh
set -e
cd "$(dirname "$0")"
python3 farms/build.py
npx vite build
touch dist/.nojekyll
tmp=$(mktemp -d)
git worktree add -f "$tmp" gh-pages 2>/dev/null || git worktree add -f -B gh-pages "$tmp"
( cd "$tmp" && git rm -rqf . >/dev/null 2>&1 || true; cp -R "$OLDPWD/dist/." . && git add -A \
  && git -c user.email=junna2805@gmail.com -c user.name=sjunna-9819 commit -qm "Publish $(date '+%Y-%m-%d %H:%M')" || echo "nothing new" ; git push -q -f origin gh-pages )
git worktree remove -f "$tmp"
echo "Published: https://sjunna-9819.github.io/palm-yield-tracker/"
