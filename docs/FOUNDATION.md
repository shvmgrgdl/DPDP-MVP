# Foundation API (read this, not the whole codebase)

Stack: Vite + React 19 + TS (tsc 7, strict) + Tailwind v4 + Radix + zustand + react-router v7 + lucide-react + motion + sonner + fflate + fuse.js + @vladmandic/face-api. Dev server already running at http://localhost:5173 (HMR). **Do not install packages or edit package.json** — ask in your report instead.

## Ownership rules
- You own ONLY `src/modules/<your-module>/**`. Do not edit shared files (`src/design`, `src/shell`, `src/store`, `src/data`, `src/engine`, `src/roles`, router). Need a shared change? Put a local helper in your module and mention it in your report.
- Module entry = `src/modules/<m>/index.tsx` default export rendering `<Routes>` (descendant routes; router mounts it at `/<prefix>/*`). Use relative paths inside (`<Route path="events/:id" …>`), absolute paths in links (`/media/events/annual-day`).
- Extra store actions: write them in your module as functions using `useApp.setState` / `useApp.getState()` (zustand), and call `useApp.getState().addEvidence({...})` for anything evidence-worthy.
- No `git` commands. Typecheck your folder: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep src/modules/<m>` (must be empty). Screenshot: `node scripts/shot.mjs /tmp/shots-<m> <role>:<path>[@WxH]` then view the PNG. Keep screenshots few (token cost).

## Data & store (`src/store/app.ts`, types in `src/data/types.ts`)
`useApp` holds: school, people, classes, students(1,512), guardians, permissions (Record key `${studentId}|${purpose}` → Permission), notices, events, assets (MediaAsset with faces[] normalised boxes), publications, requests, vendors, obligations, controls, incidents, retention, tasks, experts, evidence (hash-chained), training, notifications; UI: role, storyStep, techOverlay, evidenceDrawer.
Actions: setRole, setUI, updateSchool, resetDemo, addEvidence, setPermission(studentId,purpose,status,{via,by}) → {evidenceId,takedowns} (runs propagation), verifyGuardian, setFace(assetId,faceId,patch), publish(items,dest) → evidenceId, requestTakedown, addRequest, updateRequest(id,patch,stepText?), updateVendor, addIncident, updateIncident(id,patch,step?), addTask, completeTask, addExpertRequest, updateExpert(id,patch,msg?), approveNotice, notify, markAllRead, setObligationStatus.
Hooks (`src/store/hooks.ts`): useRoleDef, useCan(ability), useCtx() (engine ctx), useStudent, useGuardian, useAsset, useEventAssets. `personName(id)` resolves staff/guardian names.
Reference data (`src/data/reference.ts`): LEGAL (dates/limits/disclaimer), MEDIA_PURPOSES (5, with Hindi), CORE_PURPOSES, DESTINATIONS/DEST, AREAS (8 coverage areas), STATUS_META, VERDICT_META, EXPERTS. Seed: `src/data/seed/index.ts` (HEROES in Class 5B: Diya Patel, Kabir Singh (school & parents only), Aarav Sharma, Ananya Reddy, Vihaan Gupta, Ishita Nair, Zoya Qureshi (protected), Arjun Mehta (pending), Saanvi Joshi, Reyansh Khan).

## Engine (`src/engine/permission.ts`)
evaluateFace, evaluateAsset(ctx, asset, dest, {blurUnknowns}) → {verdict: ready|needs-blur|keep-private|check-faces, faces: FaceEval[] (state ok|blocked|unknown + reason), fixable, reason}; summarize(ctx, assets, dest); decisionTrace(ctx, studentId, purpose) → {student, permission, guardian, notice}; channelMap; affectedPublications; assetsOfStudent; studentById.

## UI kit (`src/design/ui.tsx`, `src/design/media.tsx`, `src/design/brand-icons.tsx`)
Button (variant primary|navy|secondary|ghost|soft|danger, size sm|md|lg, icon, `to` for links), Card, PageHeader(eyebrow,title,subtitle,actions), SectionTitle, Chip(tone ok|warn|risk|info|expert|muted|azure), Avatar, Kpi, Progress, Ring, Switch, Dialog, Sheet, Tabs, Tip, Empty, Mono, Due, Divider, Field, Input, Textarea, Select, toneText/toneBg.
Media: VerdictChip, PhotoFaces(asset, evals, aspect, rings, names, blurBlocked, blurUnknown, blurStyle soft|pixel|sticker|solid, blurIds, selectedFaceId, onFaceClick), BlurPatch, coverBox, ChannelDots, MediaCaption, PhoneFrame, EvidenceLink(id). Brand glyphs: InstagramIcon, YoutubeIcon, FacebookIcon, WhatsappIcon. `toast` from 'sonner'. Utils `src/lib/utils.ts`: cn, fmtNum (en-IN), pct, fmtDate/fmtDateTime (IST), relDays, addDays, DEMO_NOW, sha256.

## Design language (non-negotiable)
Calm trust, warmed up: warm canvas `bg-canvas`, white `card`s, navy `text-ink`, azure actions, Fraunces display (`font-display`) for page titles and big numbers, Public Sans UI, IBM Plex Mono only for IDs/hashes. Status vocabulary: Covered / Action due / Needs your decision / Expert review / School exemption; media: Ready to share / Needs a blur / Keep private / Check faces. Plain English, generous whitespace, cards over dense tables, lucide icons, no emoji, no SCREAMING_SNAKE, no reticles on children, no "compliance score" %, no "purge/quarantine/lockdown". Every button must do something (navigate, change state, toast, open drawer/dialog). Empty/loading states handled. Responsive ≥ 1024px wide (tablet) and nice at 1440. Legal copy only from `LEGAL` or plain-English; never claim "100% compliant/certified".

## Media pipeline facts
- `src/data/media-manifest.json` is (re)generated by `scripts/annotate.*` from photos in `public/media/events/<event>/` and clips in `public/media/video/`. It may be sparse/empty while you start — it fills during the build; the seed maps manifest persons → students (heroes get the most frequent faces). `faceIndex` in the store maps manifest personId → studentId. `public/media/descriptors.json` (personId → 128-d face descriptor) enables live matching of new uploads. `public/media/upload-samples/` holds held-back photos of the same children for the live-upload demo.
- face-api models are served at `/models/face-api/` (ssd_mobilenetv1, tiny_face_detector, face_landmark_68, face_recognition). Shared face helpers live in `src/media/face.ts` (owned by the media-upload agent; others may import).
- Fresh Playwright contexts always start from the seed (IndexedDB empty). DATA_VERSION bumps reset persisted state.
