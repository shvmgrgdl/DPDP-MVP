# School DPDP OS — demo

A calm, offline demo of a DPDP (India) privacy operating system for K-12 schools: coverage for leadership, parent permissions, consent-aware photos & video (face matching + real blur), Publish Guard, requests, vendors, breach room, evidence vault and expert partners.

## Run it on the demo laptop (offline)

```bash
npm install        # once, with internet
npm run demo       # builds and opens http://localhost:4173
```
Chrome recommended. Everything (fonts, face-AI models, media) is bundled — no internet needed after install.

## Presenter controls
- **Role switcher** (top right, “Viewing as”): Chairman, Principal, School office, Marketing, Class teacher, Photographer, Parent, IT head, Privacy desk, Expert partner.
- **Demo Director**: `Ctrl/⌘ + Shift + D` (or click the logo 5×) — school name, city, logo, chairman name, reset data, jump to any scene, tech overlays.
- **Story mode**: 12 scenes of the demo script with presenter notes (start from Demo Director).
- **Search**: `Ctrl/⌘ + K`.

## Dev
```bash
npm run dev                         # http://localhost:5173
npm run typecheck && npm run build
node scripts/annotate.mjs           # regenerate media manifest from public/media (needs dev server)
node scripts/shot.mjs /tmp/shots chairman:/home marketing:/publish   # screenshots
```
Docs: `docs/FOUNDATION.md` (architecture & APIs), `docs/ASSET_SOURCES.md` (image licences).

Not legal advice. Demo data is synthetic; stock images are used under their free licences.
