#!/usr/bin/env bash
# One-command demo launcher (macOS/Linux). Builds once, serves locally, opens Chrome.
set -e
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install
[ -d dist ] && [ "${REBUILD:-0}" = "0" ] || npx vite build
npx vite preview --port 4173 --strictPort &
sleep 2
if command -v open >/dev/null; then open -a "Google Chrome" --args --app=http://localhost:4173 || open http://localhost:4173
elif command -v google-chrome >/dev/null; then google-chrome --app=http://localhost:4173 &
else xdg-open http://localhost:4173; fi
wait
