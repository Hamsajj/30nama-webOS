#!/usr/bin/env bash
# Usage: ./build.sh <security-profile> [target]   (target = sdb device, e.g. <tv-ip>:26101)
# Builds tizen-app, packages a signed .wgt into dist/, and installs+runs it if a target is given.
set -euo pipefail
PROFILE="${1:?usage: build.sh <profile> [target]}"; TARGET="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TH="${TIZEN_HOME:-/c/tizen-studio}"
tizen() { "$TH/tools/ide/bin/tizen.bat" "$@" </dev/null; }
rm -rf "$ROOT/build/web" "$ROOT/build/out"; mkdir -p "$ROOT/build" "$ROOT/dist"
cp -r "$ROOT/tizen-app" "$ROOT/build/web"; rm -rf "$ROOT/build/web/tools"
if [[ ! -f "$ROOT/tizen-app/js/tmdb-token.js" ]]; then
  echo "Note: tizen-app/js/tmdb-token.js not found -> TMDB features disabled (see tmdb-token.example.js)"
  echo "/* TMDB disabled */" > "$ROOT/build/web/js/tmdb-token.js"
fi
tizen build-web -out "$(cygpath -w "$ROOT/build/out")" -- "$(cygpath -w "$ROOT/build/web")"
tizen package -t wgt -s "$PROFILE" -o "$(cygpath -w "$ROOT/dist")" -- "$(cygpath -w "$ROOT/build/out")"
WGT=$(ls -t "$ROOT"/dist/*.wgt | head -1); echo "Built $WGT"
if [[ -n "$TARGET" ]]; then
  "$TH/tools/sdb.exe" connect "${TARGET%%:*}" || true
  TNAME=$("$TH/tools/sdb.exe" devices | awk -v t="$TARGET" '$1==t{print $3}'); TARGET="${TNAME:-$TARGET}"
  tizen install -n "$(basename "$WGT")" -t "$TARGET" -- "$(cygpath -w "$ROOT/dist")"
  tizen run -p Nama30TvAp.Nama30TV -t "$TARGET"
fi
