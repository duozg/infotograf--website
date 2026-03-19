#!/bin/bash
set -e

echo "==> Cleaning output directory"
rm -rf _out
mkdir -p _out

echo "==> Copying marketing site static files"
cp -r css images _out/
for f in *.html; do
  [ -f "$f" ] && cp "$f" _out/
done

echo "==> Building React SPA"
cd app
npm install
npm run build
cd ..

echo "==> Copying SPA output to _out/app/"
mkdir -p _out/app
cp -r app/dist/* _out/app/

echo "==> Build complete. Output in _out/"
