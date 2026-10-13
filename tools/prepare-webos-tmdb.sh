#!/usr/bin/env sh
# Write an ignored TMDB config file for local webOS Simulator runs.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$ROOT/webos-app/js/tmdb-token.local.js"

if [ -z "${TMDB_TOKEN:-}" ]; then
  echo "TMDB_TOKEN is required. Load it from .env before running this command." >&2
  exit 1
fi

umask 077
TOKEN_JSON=$(TMDB_TOKEN="$TMDB_TOKEN" node -p 'JSON.stringify(process.env.TMDB_TOKEN)')
printf '%s\n%s\n' '// Generated locally for Simulator use; ignored by Git.' "N.config.tmdbToken = $TOKEN_JSON;" > "$OUT"
