# Modules, routes and roles

All routes are hash routes (`/#/home`). Each module lives in `src/modules/<name>/` and owns its sub-routes.

## Roles ("Viewing as")
| Role | Lands on | Sees |
|---|---|---|
| Chairman / Trustee | `/home` | Calm executive view: coverage, decisions, trustee report; read-mostly |
| Principal | `/home` | Operational view, approvals (e.g. notice v2.2), incidents, requests |
| School office (privacy coordinator) | `/home` | Requests, vendors, retention, parents |
| Marketing & communications | `/media` | Media Safe, Publish Guard, Video Studio |
| Class teacher (5B) | `/media` | Class 5B only; "Can I share this?" |
| Photographer (guest) | `/media/upload/portal` | Upload-only, time-bound, never sees names |
| Parent | `/parent` | Mobile app in a phone frame (English / हिन्दी) |
| IT head | `/tech` | Architecture, security, access, vendors |
| Privacy desk (our team) | `/experts/desk` | Managed-service inbox |
| Expert partner | `/experts/partner` | Only assigned reviews and their evidence |

Role definitions, nav and abilities are in `src/roles/roles.ts`.

## Modules
| Module | Routes | What it does |
|---|---|---|
| **coverage** | `/home`, `/home/areas/:area`, `/reports/trustee` | Chairman/Principal home: 8 coverage areas (Covered / Action due / Needs decision / Expert review / Exemption), "What needs you", media and parent stats, "Ready before 13 May 2027" timeline, a printable trustee report |
| **readiness** | `/readiness` | 24-question decision tree (`tree.ts`) with prefilled answers; recognises school exemptions (Fourth Schedule); sorts items into 4 buckets; "Add to my plan" creates tasks |
| **privacy-hub** | `/privacy/*`, `/privacy-centre` | Purposes & legal basis, notices (v2.1 live, v2.2 draft with EN/HI diff and approval), parent permission heat-grid and reminders, verification methods, legacy-parent campaign, public Privacy Centre with request form |
| **parent-app** | `/parent/*` | Family switcher, first-time setup (OTP/DigiLocker verify → layered notice → 5 purpose toggles → receipt), choices with withdrawal, private photo gallery (classmates blurred), requests, history |
| **media-safe** | `/media`, `/media/events/:id`, `/media/photos/:id`, `/media/review`, `/media/students/:id` | Events, galleries by destination, **Proof Card** (per-face decision trace: parent → verification → choice → notice → timestamp → evidence ID), unknown-face review, student media profile |
| **media-upload** | `/media/upload`, `/media/upload/portal` | Upload intake with a "Media X-Ray" animation (sample photos provided) and the photographer guest portal |
| **publish-guard** | `/publish`, `/publish/blur/:id`, `/publish/live` | Choose a destination → Ready / Fixed with blur / Held back; export a zip (blurred JPEGs + evidence.json/html); Blur Studio (4 styles, before/after, manual areas, watermark); live posts and takedowns |
| **video-studio** | `/video`, `/video/:id` | Precomputed face tracks → real canvas blur during playback, per-face lanes, destination rules, export of a protected clip (MP4/WebM) |
| **requests** | `/requests`, `/requests/:id` | Parent rights and grievances with an internal target (7 days) and legal max (90 days), type-specific panels, EN/HI replies |
| **trust-centre** | `/trust/*` | Vendors (5-clause checklist, photographer token), Rule 6 safeguards, **Breach Room** (72-hour Board clock, parent notice + Board intimation drafts), retention, access matrix, training, data map |
| **evidence** | `/evidence` | Hash-chained evidence ledger, "Verify chain", tamper simulation (tech overlay), audit-pack export |
| **experts** | `/experts`, `/experts/desk`, `/experts/partner` | Managed desk, counsel, cyber, DPO/audit (only if SDF), packages (Ready / Ready + Media Safe / Managed) |
| **ask** | `/ask` | Offline assistant: ~20 intents answered from live data with sources; escalates to the desk |
| **settings** | `/settings/*` | School profile, people, notifications, languages, integrations (Live / Pilot / Roadmap), plan, image credits |
| **tech** | `/tech` | Architecture diagram, life of a photo, security model, face-data policy, API preview |
| **auth** | `/login` | Branded sign-in (SSO/OTP simulated) |

## Shared building blocks
- `src/shell/`: app shell, role switcher, ⌘K palette, notifications, evidence drawer, Demo Director, Story mode (`story.ts`)
- `src/design/`: UI kit (`ui.tsx`) and media components (`media.tsx`: PhotoFaces, blur patches, verdict chips, phone frame)
- `src/engine/permission.ts`: the consent engine (`evaluateAsset`, `decisionTrace`, `affectedPublications`)
- `src/store/app.ts`: all state and actions; persisted to IndexedDB; `DATA_VERSION` bumps reset it
- `src/data/`: types, reference data (`LEGAL`, purposes, destinations, areas), seed generator, media manifest
