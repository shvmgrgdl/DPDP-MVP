#!/usr/bin/env bash
# Build and deploy to https://school-dpdp-os.netlify.app
# Usage: NETLIFY_AUTH_TOKEN=nfp_... ./scripts/deploy-netlify.sh
set -euo pipefail
: "${NETLIFY_AUTH_TOKEN:?set NETLIFY_AUTH_TOKEN}"
SITE_ID="${NETLIFY_SITE_ID:-61e8b6a6-0b89-463d-bfb1-7c748719b10e}"
cd "$(dirname "$0")/.."
rm -rf dist && npx vite build
rm -f dist/media/video/*.webm dist/models/face-api/age_gender*
ZIP="$(mktemp -d)/site.zip"
(cd dist && python3 -c "import zipfile,os;z=zipfile.ZipFile('$ZIP','w',zipfile.ZIP_DEFLATED);[z.write(os.path.join(r,f),os.path.join(r,f)[2:]) for r,_,fs in os.walk('.') for f in fs];z.close()")
curl -sS -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" -H "Content-Type: application/zip" --data-binary @"$ZIP" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" | python3 -c "import sys,json;d=json.load(sys.stdin);print('deploy',d.get('id'),d.get('state'))"
echo "Live: https://school-dpdp-os.netlify.app"
