#!/bin/bash
set -e

echo "==> Cleaning output directory"
rm -rf _out
mkdir -p _out

echo "==> Copying static marketing pages (privacy, terms, support, guidelines)"
cp -r css images _out/
for f in privacy.html terms.html support.html guidelines.html fediverse.html; do
  [ -f "$f" ] && cp "$f" _out/
done

echo "==> Building React SPA"
cd app
npm install
npm run build
cd ..

echo "==> Copying SPA output to _out/ (SPA serves from root)"
cp -r app/dist/* _out/

echo "==> Build complete. Output in _out/"
