# DIDAC 2026 booth demo (PWA)

Separate, installable app in `didac/` that reuses the main app's utilities and precomputed face boxes. A prototype with synthetic children and a fictional school.

```bash
npm run didac:dev       # http://localhost:5174
npm run didac:build     # -> dist-didac/ (service worker, manifest, offline precache)
npm run didac:preview   # http://localhost:4174
NETLIFY_AUTH_TOKEN=... ./scripts/deploy-didac.sh
```

## What it is

Splash → launcher → pick who you are, or start the 3-minute guided demo. **A language picker is in every app** (10 languages).

| App | Flow |
| --- | --- |
| **Parent app** (phone-first; device frame on laptops) | Welcome → **sign in with a school-issued ID + password** → forced first-login password change → notice v1.2 → three consent screens, nothing pre-selected → confirm (guardian declaration) → receipt with evidence ID → **Home · Photos** (multi-select, watermarked downloads, expiring family link, zoom with who-opened activity, wrong face, ask to remove) **· Inbox** (one-time approvals) **· Choices** (change/withdraw, history) **· More** (access/correction/erasure/grievance with case ID and due date, "how your data is protected", sign out) |
| **School admin** (laptop) | Review queue with fail-closed gate, "Ask guardian (one-time)", face review, permissions matrix, requests (privacy requests, approvals, live posts needing takedown), **Parent logins** (issue/reissue slips), **Security**, **Evidence** (searchable, exportable audit log) |
| **School gallery** (web app) | Private gallery vs **public website preview** (only approved photos) |
| **Photographer** | Event-limited upload → face detect → match → unknown held for review |
| **Booth kit** | Pitch, 90 s story (+ MP4 per language), guided demo (9 steps incl. withdrawal → takedown), DPDP map, Security, FAQs, pilot & QR, one-pager, Team |

State is shared: what a parent chooses changes what the admin can publish, instantly. Deep links: `?role=parent|admin|gallery|photographer|booth` and `?lang=en|hi|bn|mr|gu|ta|te|kn|pa|ml`. Reset between visitors from the launcher.

## Identity and privacy model

- Parents sign in with a **random, pre-assigned ID and password** printed on a slip by the school. The platform holds **no parent names, phone numbers or emails**; the school keeps the ID → family mapping in its own records.
- **Student names are masked at source** (first and last letter, e.g. `D••a S••••a`); admission numbers partly hidden.
- Temp password must be changed at first sign-in; 5 failures lock the account; the school reissues logins (no self-service recovery — there is no contact channel to verify).
- Demo logins (booth only): `G-4K7Q / maple-river-481` (first sign-in → onboarding), `G-9M2X / cedar-lamp-352`, `G-2T8V / olive-moon-627`, `G-6R5C / coral-bell-914`.
- Open point for counsel: how the school documents verification of the adult before issuing an ID (DPDP Rule 10).

## Security, tracing and audit (appearance of the production design)

- **Encryption (shown, not implemented):** Security tab/page shows TLS 1.3 + HSTS in transit, AES-256-GCM at rest with per-object IVs, a per-school key (ID, 90-day rotation), an "encrypted vault" listing every photo and record with raw ciphertext view, a decrypt animation and a **tamper test** that rejects an altered copy. Labelled *Prototype*; the demo stores only synthetic data.
- **Watermark (real overlay):** every photo shows the viewer's **school-issued ID, a live clock and a trace ID**, tiled so it survives cropping. Downloaded copies are real files with the watermark burned in. Right-click/drag/long-press save are disabled on photos.
- **Leak trace (simulated):** pick a downloaded copy → "Watermark found" → viewer ID, photo, time, trace, matching audit entry. States plainly that watermarks make leaks traceable, not impossible, and cannot stop screenshots.
- **Audit log (real, in-app):** SHA-256 hash chain. Logs sign-ins (incl. failures and lockouts), sign-outs, language changes, notice read, every consent change, face review, approvals, views, downloads, shares, requests, takedowns, security actions and exports. Each entry records actor, app, language, session ID and trace. Search, filter, export CSV/JSON (exports are themselves logged).

## Languages

English, Hindi, Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Punjabi, Malayalam. Every app screen, the consent notice, the pitch pages and the audit entries' display are translated; the stored audit record stays canonical English. Fonts for all scripts are bundled (Noto Sans). Locales are lazy-loaded (`didac/src/locales/<code>.json`). Staff-only Team tools (script, funnel, settings) stay in English.
Translations were machine-drafted and validated for coverage and placeholders — **have a native speaker review the consent notice and legal text before real use.**
Tooling: `scripts/i18n-wrap.mjs` / `i18n-render.mjs` (wrap strings), `i18n-keys.mjs` (extract), `i18n-validate.mjs` / `i18n-merge.mjs` (check and merge locale parts).

## Notion requirement → screen

| Requirement | Where |
| --- | --- |
| Pitch "Consent-driven media management", subhead, opening question, timing | Pitch |
| Establish: media is a gap; everyday tools don't check permissions; we run it end to end, within limits | Pitch (3 cards) |
| Knowledge about DPDPA: Act mapping, commencement dates | DPDP map |
| Web app + gallery | School gallery app |
| Parent console (private vs public, changes, withdrawal) | Parent app |
| Admin console (permission status, approve/restrict, review queue, evidence) | School admin |
| Group-photo conflict, unknown face to review, school approval, controlled parent access, audit log | Guided demo steps 1–7 (+ bonus withdrawal/takedown) |
| Photo zoom: who opened, when, audit trail — and what it does not prove | Zoom dialog |
| One explainer video | Story (live, in the selected language) + MP4 |
| QR → WhatsApp (opt-in, role/event qualifier) | Pilot & QR |
| FAQs incl. how a school gets flagged and penalties, priority-wise | FAQs |
| Free small pilot → free assessment + bounded remote pilot | Pilot & QR, one-pager |
| Leads, 3 qualifying questions, funnel, owner, next meeting | Pilot & QR form; Team → Leads |
| Booth script, say/don't-say, targets 10/3/2/1 | Team → Presenter notes |
| Printable leave-behind (no pricing) | One-pager |

## Not shown on purpose

Pricing (the pilot figure is an internal hypothesis); "Powered by LIT"; named customers or competitors; "nobody else solves this"; certification claims.

## Open items

- **WhatsApp number**: set it in Team → Settings (no rebuild). Auto-replies need a WhatsApp Business account outside this app.
- **Name**: "MediaGuard" is not trademark-cleared; shown as a working name.
- **Parked**: "Location-wise DPDP vendor" is undefined in Notion.
- **Legal**: counsel should review public wording and the translated consent notice before use.
- Leads are device-local; there is no backend sync.
