# School DPDP OS — demo

A calm, click-through demo of a privacy operating system for Indian K-12 schools under the **DPDP Act 2023 and DPDP Rules 2025**. It is built for school owners and chairmen, with enough depth for their IT people.

**Promise:** *"You run the school. We run the privacy operating system."* The hero is **Media Safe**: every school photo and video is checked against each parent's choices before it goes anywhere, and blocked children are blurred automatically. Around it sits one calm control plane for the rest of DPDP.

- **Private preview:** https://claude.ai/artifact/VeQojd6BqqVzsLdY1G3CA9
- **Branch:** `claude/sweet-bardeen-d79fof`
- **Hosting:** Netlify-ready (`netlify.toml`); see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

> **Demo only.** All people and data are synthetic. Photos and videos are free-licence stock ([docs/ASSET_SOURCES.md](docs/ASSET_SOURCES.md)). Face positions are precomputed offline, so the app does no live face processing on the demo media. Not legal advice.

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173
npm run demo         # production build + preview on http://localhost:4173 (works offline)
./scripts/demo.sh    # macOS/Linux: build once, open Chrome in app mode
```
Requires Node 20+ (22 recommended). Chrome is recommended; any modern browser works.

## Presenting
| Control | How |
|---|---|
| Switch persona | Top-right **"Viewing as"**: Chairman, Principal, School office, Marketing, Class teacher, Photographer, Parent, IT head, Privacy desk, Expert partner |
| Demo Director | `Ctrl/⌘ + Shift + D`, or click the logo 5×. Set the school name, city, logo and chairman name, reset data, jump to scenes, toggle tech overlays |
| Story mode | Start it from the Demo Director: 12 scenes with presenter notes |
| Search | `Ctrl/⌘ + K` |
| Reset | Demo Director → **Reset demo data** (state persists in the browser's IndexedDB) |

The full walkthrough is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Documentation
| Doc | What's in it |
|---|---|
| [docs/MODULES.md](docs/MODULES.md) | Every module, route and role, with what each screen does |
| [docs/FOUNDATION.md](docs/FOUNDATION.md) | Architecture, data model, store actions, engine, UI kit, design rules |
| [docs/MEDIA_PIPELINE.md](docs/MEDIA_PIPELINE.md) | How photos and videos get face positions, names and blur; how to swap in new media |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | The 12-minute chairman demo, with talking points and legal guardrails |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Netlify, the claude.ai preview, and running offline on a laptop |
| [docs/ASSET_SOURCES.md](docs/ASSET_SOURCES.md) | Image and video licences and credits |

## Tech
Vite · React 19 · TypeScript (strict) · Tailwind v4 · Radix · zustand (+IndexedDB) · react-router v7 (hash routing) · motion · lucide · fflate · fuse.js · @vladmandic/face-api (offline tooling + optional live upload).

## Scripts
| Command | Purpose |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + production build to `dist/` |
| `node scripts/annotate.mjs` | Precompute photo faces into `src/data/media-manifest.json` (dev server must run; `SKIP_VIDEO=1 WORKERS=4` recommended) |
| `node scripts/video_tracks.mjs` | Precompute face tracks for every clip in `public/media/video/` |
| `node scripts/shot.mjs <dir> role:/path ...` | Screenshots per role (dev helper) |
| `node scripts/eval.mjs "<expr on s>"` | Evaluate an expression against the live store (dev helper) |
