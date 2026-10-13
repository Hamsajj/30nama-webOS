#!/usr/bin/env sh
# Package the webOS app with a TMDB token injected only into a temporary staging copy.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP="$ROOT/webos-app"
OUT_DIR=${1:-"$ROOT/dist/webos"}

if [ -z "${TMDB_TOKEN:-}" ]; then
  echo "TMDB_TOKEN is required. Example: TMDB_TOKEN='...' $0" >&2
  exit 1
fi

if ! command -v ares-package >/dev/null 2>&1; then
  echo "ares-package was not found. Install the webOS CLI first." >&2
  exit 1
fi

umask 077
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/30nama-webos.XXXXXX")
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT HUP INT TERM

mkdir -p "$OUT_DIR"
cp -R "$APP" "$STAGE/app"
rm -f "$STAGE/app/js/tmdb-token.local.js"

TOKEN_JSON=$(TMDB_TOKEN="$TMDB_TOKEN" node -p 'JSON.stringify(process.env.TMDB_TOKEN)')
printf '%s\n%s\n' '// Generated during packaging; do not commit.' "N.config.tmdbToken = $TOKEN_JSON;" > "$STAGE/app/js/tmdb-token.js"

ares-package --no-minify -o "$OUT_DIR" "$STAGE/app"
