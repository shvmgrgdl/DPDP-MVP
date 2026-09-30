# Deployment

The build is a static site (`dist/`) using hash routing and relative asset URLs, so the same build works on Netlify, on a claude.ai preview, and offline.

## Live site
- **URL:** https://school-dpdp-os.netlify.app (Netlify site `school-dpdp-os`, id `61e8b6a6-0b89-463d-bfb1-7c748719b10e`)
- **Password:** `SchoolDPDP@2026`. The in-app gate (`src/shell/PasswordGate.tsx`) stores a SHA-256 hash and remembers the browser once unlocked. It is skipped in `npm run dev`. To change the password, replace `HASH` with `sha256(newPassword)`.
- **Redeploy:** `NETLIFY_AUTH_TOKEN=… ./scripts/deploy-netlify.sh` (zip deploy through the Netlify API). Never commit the token.

## Netlify via GitHub (optional alternative, auto-deploys on push)
1. app.netlify.com → **Add new site → Import an existing project → GitHub**.
2. Repo `shvmgrgdl/DPDP-MVP`, branch `claude/sweet-bardeen-d79fof`.
3. Leave the build settings alone: `netlify.toml` sets `npx vite build`, publish `dist`, Node 22.
4. Deploy, then rename the site or add a custom domain (e.g. a subdomain of DPDPAforschools.in).

## claude.ai preview
Published from `dist/` as a private artifact: https://claude.ai/artifact/VeQojd6BqqVzsLdY1G3CA9. When republishing:
- Exclude `media/video/*.webm` and `models/face-api/age_gender*` (not used).
- Send `.bin` model files with `contentType: application/wasm`.

## Offline laptop
```bash
npm install     # once, online
npm run demo    # build + preview at http://localhost:4173
```
Fonts, models and media are all bundled; no network is needed at demo time.

## Size
About 50 MB, mostly stock media and face models.
