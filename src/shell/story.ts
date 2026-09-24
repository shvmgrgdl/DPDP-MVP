import type { RoleKey } from '@/data/types'

/** The 12-minute demo script. Each step sets role + route; presenter notes appear in the Story bar. */
export const STORY: { title: string; role: RoleKey; path: string; note: string }[] = [
  { title: 'Chairman’s calm overview', role: 'chairman', path: '/home', note: 'Covered in 6 of 8 areas. Two small actions sit with the team; one decision waits for the principal. No scary score — just status and evidence.' },
  { title: 'Readiness in 60 seconds', role: 'principal', path: '/readiness', note: 'Tick CCTV, bus GPS, photographers, Instagram. Watch school exemptions get recognised instead of manufacturing consent forms.' },
  { title: 'A parent sets choices', role: 'parent', path: '/parent', note: 'Verified once from admission records. Short notice in English or Hindi. Purpose-by-purpose choices, saved with a timestamp.' },
  { title: 'Annual Day upload', role: 'marketing', path: '/media/events/annual-day', note: 'Photos arrive from the photographer. Faces are matched to the roster, and each child’s permissions travel with them.' },
  { title: 'Publish Guard: Instagram', role: 'marketing', path: '/publish', note: 'Pick Instagram. Safe photos, photos fixed by blur, and photos held back — with a reason for each.' },
  { title: 'Why was this blurred?', role: 'marketing', path: '/media/review', note: 'Click any blocked face: parent → verification → choice → notice version → timestamp → evidence ID.' },
  { title: 'Blur studio & video', role: 'marketing', path: '/video', note: 'Real in-browser blur. Switch styles, compare before/after, export a protected clip.' },
  { title: 'Parent withdraws', role: 'parent', path: '/parent/choices', note: 'Turn off social media for Diya. Back in Marketing, the two live posts are flagged for takedown automatically.' },
  { title: 'A privacy request', role: 'office', path: '/requests', note: 'Correction request: owner, due date and evidence created in under two minutes.' },
  { title: 'Breach room', role: 'principal', path: '/trust/incidents', note: 'Lost teacher laptop → affected data → parent notice and Board intimation drafted → 72-hour clock.' },
  { title: 'Experts on call', role: 'chairman', path: '/experts', note: 'Request a counsel review; the partner receives it with evidence already attached. Close on DPDP Managed.' },
  { title: 'Evidence vault', role: 'chairman', path: '/evidence', note: 'Verify the chain and export an audit pack. For tech visitors: Under the hood.' },
]
