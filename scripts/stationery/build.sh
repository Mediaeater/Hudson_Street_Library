#!/usr/bin/env bash
#
# Build the print-ready stationery artwork, end to end.
#
#   npm run build && npx http-server _site -p 8899 -s &
#   scripts/stationery/build.sh
#
# Output lands in dist/stationery/ (gitignored), and is then published into
# src/assets/stationery/ (tracked), which is how a printer gets the files: as links on
# /identity/stationery/ rather than as an email attachment. Working files live in
# build/stationery/. Two builds of an unchanged page produce byte-identical PDFs, so
# the publish step is a no-op until the design actually moves — at which point bump
# ARTWORK_DATE in build_artwork.py, which is what the files are dated from.
#
# Two interpreters are used on purpose. The extraction stages drive a real browser,
# so they run under an interpreter that has Playwright installed; the artwork stages
# run in a pinned venv, so the PDF a printer receives does not change under us when
# a library upgrades. Override either with BROWSER_PYTHON= / URL=.
set -euo pipefail

cd "$(dirname "$0")/../.."
HERE=scripts/stationery
BUILD=build/stationery
DIST=dist/stationery
URL=${URL:-http://localhost:8899/identity/stationery/}
PUBLISH=src/assets/stationery
BROWSER_PYTHON=${BROWSER_PYTHON:-/opt/homebrew/bin/python3}

# CRPC2 is the CGATS 21 uncoated condition, which is the stock the job is specified
# on. Its own copyright tag grants embedding and redistribution without restriction,
# which the alternatives (Apple's Generic CMYK, Ghostscript's default_cmyk) do not.
ICC_URL=https://www.color.org/registry/profiles/CGATS21_CRPC2.icc
ICC=$BUILD/CGATS21_CRPC2.icc
CONDITION=CGATS21_CRPC2

mkdir -p "$BUILD" "$DIST" "$PUBLISH"

if ! curl -sf -o /dev/null "$URL"; then
  echo "! $URL is not answering." >&2
  echo "  Build and serve the site first:  npm run build && npx http-server _site -p 8899 -s &" >&2
  exit 1
fi

if [ ! -x "$BROWSER_PYTHON" ]; then
  echo "! BROWSER_PYTHON=$BROWSER_PYTHON not found; set it to an interpreter with playwright" >&2
  exit 1
fi

VENV=$BUILD/venv
if [ ! -d "$VENV" ]; then
  echo "== venv"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q reportlab==5.0.1 fonttools==4.63.0 pikepdf==10.12.0 pillow==12.3.0
fi
PY="$VENV/bin/python"

[ -f "$ICC" ] || { echo "== output intent profile"; curl -sL -o "$ICC" "$ICC_URL"; }

echo "== 1. geometry, out of the browser"
"$BROWSER_PYTHON" "$HERE/extract_geometry.py" "$URL" "$BUILD/geometry.json"

echo "== 2. font instances"
"$PY" "$HERE/prepare_fonts.py" "$BUILD/geometry.json" "$BUILD"

echo "== 3. artwork"
"$PY" "$HERE/build_artwork.py" --geometry "$BUILD/geometry.json" --build "$BUILD" \
      --out "$DIST" --icc "$ICC" --condition "$CONDITION"

echo "== 4. verification"
"$PY" "$HERE/verify_artwork.py" --dist "$DIST" --reference "$BUILD/reference.pdf" --render \
      --url "$URL" --browser-python "$BROWSER_PYTHON" --condition "$CONDITION" \
      --out "$BUILD/verify"

# Last, and only if verification passed: nothing unverified reaches the website.
echo "== 5. publication"
"$PY" "$HERE/publish.py" --dist "$DIST" --to "$PUBLISH"
