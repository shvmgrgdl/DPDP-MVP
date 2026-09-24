# Deployment

The build is a static site (`dist/`) using hash routing and relative asset URLs, so the same build works on Netlify, on a claude.ai preview, and offline.

## Netlify (live domain, auto-deploys on push)
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
