# DIDAC 2026 booth demo (PWA)

**It opens as an app, not a website.** Splash → launcher → pick who you are (or start the 3-minute guided demo):

| App | What the flow shows |
| --- | --- |
| **Parent app** (phone-first; device frame on laptops) | Welcome → **sign in with a school-issued ID + password** → forced first-login password change → notice v1.2 (English/Hindi) → three consent screens, nothing pre-selected → confirm (guardian declaration) → receipt with evidence ID → **Home · Photos** (multi-select, download, expiring family link, zoom with who-opened activity, wrong face, ask to remove) **· Inbox** (one-time approvals) **· Choices** (change/withdraw, history) **· More** (access/correction/erasure/grievance with case ID and due date, sign out, replay) |
| **School admin** (laptop) | Review queue with fail-closed gate, "Ask guardian (one-time)", face review, permissions matrix, requests (privacy requests, approvals, **live posts needing takedown**), **Parent logins** (issue/reissue slips, lock status), hash-chained evidence |
| **School gallery** (web app) | Private gallery vs **public website preview** (only approved photos), zoom with activity |
| **Photographer** | Event-limited upload → face detect → match → unknown held for review |
| **Booth kit** | Pitch, 75 s story (+ downloadable MP4), guided demo (9 steps incl. withdrawal → takedown), DPDP map, vs Pixevety, FAQs, pilot & QR, one-pager, Team (leads/funnel, presenter notes, settings) |

### Identity and privacy model

- Parents sign in with a **random, pre-assigned ID and password** printed on a slip by the school. The platform holds **no parent names, phone numbers or emails**; the school keeps the ID → family mapping in its own records and can map it later.
- **Student names are masked at source** (first and last letter only, e.g. `D••a S••••a`) and admission numbers partly hidden. Real names never enter the app's data.
- Temporary password must be changed at first sign-in; 5 failed attempts lock the account; the school reissues logins (no self-service recovery, because there is no contact channel to verify). The school cannot see a parent's chosen password.
- Audit log actors are guardian IDs (`Guardian G-4K7Q`), never names.
- Demo logins (booth only): `G-4K7Q / maple-river-481` (first sign-in → onboarding), `G-9M2X / cedar-lamp-352`, `G-2T8V / olive-moon-627`, `G-6R5C / coral-bell-914`. In production only salted hashes would be stored and temp passwords shown once.
- Open design point for counsel: how the school documents verification of the adult before issuing an ID (DPDP Rule 10).

State is shared: what a parent chooses changes what the admin can publish, instantly. Deep links: `?role=parent|admin|gallery|photographer|booth`. Reset between visitors from the launcher.

Derived from the DIDAC prep notes beyond the handwritten list: purpose-by-purpose consent (S.6), per-event "ask each time", withdrawal with takedown task, rights requests and grievance (S.11–13), event-limited vendor access, data minimisation, timing language ("prepare ahead of the main provisions scheduled for 13 May 2027"), and the explicit limit that copies outside the managed workflow can't be recalled.

Not shown on purpose: pricing (the ₹30k pilot figure is an internal hypothesis), "Powered by LIT", named customers (the notes' "GEMS" was an unresolved handwritten word), "nobody else solves this", certification claims.

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
| Web app + gallery ("GEMS / Galleries?") | School gallery app (private vs public preview) |
| Booth script, 3 qualifying questions, targets 10/3/2/1, say/don't-say | Team → Presenter notes |
| Bounded written offer / leave-behind | One-pager (printable, no pricing) |
| Lead owner + next meeting, tag DIDAC | Team → Leads |
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

- **WhatsApp number**: enter it in Team → Settings (no rebuild); without it the QR opens the app. True auto-replies need a WhatsApp Business account outside this app.
- **Name**: "MediaGuard" is not trademark-cleared; labelled "working name".
- **Parked**: "Location-wise DPDP vendor" (vendor directory, local partners or regional offering?) — undefined in Notion.
- **Legal**: counsel should review public wording before the event; Pixevety facts are from public sources as of 31 Oct 2026 and company claims are marked.
- Leads are device-local; there is no backend sync.
