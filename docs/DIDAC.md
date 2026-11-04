# DIDAC 2026 booth demo (PWA)

Separate, installable app in `didac/`, reusing the main app's utilities (`@/lib/utils` hashing) and its precomputed face boxes. Prototype with synthetic children and a fictional school.

```bash
npm run didac:dev       # http://localhost:5174
npm run didac:build     # -> dist-didac/ (service worker, manifest, offline precache)
npm run didac:preview   # http://localhost:4174
NETLIFY_AUTH_TOKEN=... VITE_WA_NUMBER=91XXXXXXXXXX ./scripts/deploy-didac.sh
```

## Notion requirement → screen

| Requirement (handwritten notes + Notion pages) | Where |
| --- | --- |
| Pitch: "Consent-driven media management", subhead, 30-second opening question | Pitch (home) |
| Establish: media is a DPDPA gap; consent and media are not in line; we run the workflow end to end (scoped, no "nobody solves this") | Pitch, three cards |
| Knowledge about DPDPA: MediaGuard × DPDP Act, commencement dates | DPDP map |
| Web app + school gallery | Live demo → School gallery |
| Parent console (private vs public, changes, withdrawal, Hindi) | Live demo → Parent · mobile |
| Laptop admin console (status per student/purpose, approve/restrict, review queue, evidence) | Live demo → Admin · laptop |
| Group-photo conflict, unknown child to review, school approval, controlled parent access, audit log | Guided demo steps 1–7 |
| Photo zoom: who opened, when, audit trail — and what it does not prove | Zoom dialog |
| One explainer video, 60–90 s | Story (75 s, five scenes, loops) |
| Versus Pixevety, honestly | vs Pixevety |
| QR → WhatsApp auto-send (opt-in, role/event qualifier) | Pilot & QR |
| FAQs incl. how a school gets flagged and penalties, priority-wise | FAQs |
| Free small pilot (remotely) → free 15-min assessment + bounded remote pilot | Pilot & QR |
| Lead capture, 3 qualifying questions, funnel, CSV export | Pilot & QR form, Leads (footer "Team") |

## Behaviour notes

- Fail-closed gate: any restricted child blocks public use; an unknown face holds the photo for review. Approve is disabled until eligible.
- Audit log is a SHA-256 hash chain; the Evidence tab verifies it.
- Leads and demo state persist in `localStorage` and work offline. Export CSV from Leads.
- Pricing is deliberately not shown (the ₹30k pilot figure is an internal hypothesis).
- Branding follows the Notion direction (DPDPA for Schools selling identity, MediaGuard as working name, warm paper/navy/gold, DM Sans). No "LIT" naming anywhere.

## Open items

- **WhatsApp number**: set `VITE_WA_NUMBER` at build time; without it the QR opens the app. True auto-replies need a WhatsApp Business account outside this app.
- **Name**: "MediaGuard" is not trademark-cleared; labelled "working name".
- **Parked**: "Location-wise DPDP vendor" (vendor directory, local partners or regional offering?) — undefined in Notion.
- **Legal**: counsel should review public wording before the event; Pixevety facts are from public sources as of 31 Oct 2026 and company claims are marked.
- Leads are device-local; there is no backend sync.
