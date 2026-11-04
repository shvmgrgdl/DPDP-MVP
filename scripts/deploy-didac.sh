#!/usr/bin/env bash
# Build the DIDAC PWA and deploy it to its own Netlify site.
# Usage: NETLIFY_AUTH_TOKEN=... [NETLIFY_DIDAC_SITE_ID=...] [VITE_WA_NUMBER=91XXXXXXXXXX] ./scripts/deploy-didac.sh
# Without NETLIFY_DIDAC_SITE_ID a new site is created and its id printed — save it for later deploys.
set -euo pipefail
: "${NETLIFY_AUTH_TOKEN:?set NETLIFY_AUTH_TOKEN}"
cd "$(dirname "$0")/.."
npm run didac:build
SITE_ID="${NETLIFY_DIDAC_SITE_ID:-}"
if [ -z "$SITE_ID" ]; then
  SITE_ID=$(curl -sS -X POST -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"name":"dpdpa-mediaguard-demo"}' https://api.netlify.com/api/v1/sites | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('id',''));sys.stderr.write(str(d.get('ssl_url',d))+'\n')")
  echo "Created site id: $SITE_ID"
fi
ZIP="$(mktemp -d)/site.zip"
(cd dist-didac && python3 -c "import zipfile,os;z=zipfile.ZipFile('$ZIP','w',zipfile.ZIP_DEFLATED);[z.write(os.path.join(r,f),os.path.join(r,f)[2:]) for r,_,fs in os.walk('.') for f in fs];z.close()")
curl -sS -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" -H "Content-Type: application/zip" --data-binary @"$ZIP" "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" | python3 -c "import sys,json;d=json.load(sys.stdin);print('deploy',d.get('id'),d.get('state'),d.get('ssl_url'))"
