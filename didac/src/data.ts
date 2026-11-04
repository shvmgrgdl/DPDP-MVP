export type Purpose = 'album' | 'internal' | 'public'
export const PURPOSES: { key: Purpose; label: string; labelHi: string; example: string }[] = [
  { key: 'album', label: 'Private parent album', labelHi: 'निजी अभिभावक एल्बम', example: 'Event photos visible only to guardians of children in the picture, inside the app.' },
  { key: 'internal', label: 'Inside school', labelHi: 'स्कूल के अंदर', example: 'Notice boards, yearbook, internal newsletter.' },
  { key: 'public', label: 'Website & social media', labelHi: 'वेबसाइट और सोशल मीडिया', example: 'School website, Instagram, Facebook, YouTube.' },
]

/** Names are masked at source (first and last letter only). The platform never holds full names or parent contact details; the school keeps the ID → family link. */
export const mask = (n: string) => n.split(' ').map((w) => (w.length <= 2 ? w[0] + '•' : w[0] + '•'.repeat(w.length - 2) + w[w.length - 1])).join(' ')
export interface Student { id: string; name: string; cls: string; guardian: string; admNo: string; perms: Record<Purpose, boolean>; onboarded: boolean; askEach?: boolean; approvals: string[]; consentAt?: string }
export const STUDENTS0: Student[] = [
  { id: 'S1', name: 'K•••r M•••a', cls: '5B', guardian: 'G-9M2X', admNo: 'ADM-••91', perms: { album: true, internal: true, public: true }, onboarded: true, approvals: [] },
  // This guardian has not yet set choices: fail closed until onboarding completes in the parent app.
  { id: 'S2', name: 'D••a S••••a', cls: '5B', guardian: 'G-4K7Q', admNo: 'ADM-••04', perms: { album: false, internal: false, public: false }, onboarded: false, approvals: [] },
  { id: 'S3', name: 'A•••n V•••a', cls: '5B', guardian: 'G-2T8V', admNo: 'ADM-••17', perms: { album: true, internal: true, public: true }, onboarded: true, approvals: [] },
  { id: 'S4', name: 'M•••a I••r', cls: '5A', guardian: 'G-6R5C', admNo: 'ADM-••88', perms: { album: true, internal: true, public: true }, onboarded: true, approvals: [] },
]

export interface Face { box: [number, number, number, number]; studentId: string | null; adult?: boolean }
export interface Photo { id: string; src: string; w: number; h: number; title: string; faces: Face[]; uploadedBy: string }

/** Face boxes are real, precomputed offline detections from the main demo's media manifest. Identities are assigned for the demo story. */
export const PHOTOS_BASE: Photo[] = [
  {
    id: 'P1', src: 'media/annual-day-08.jpg', w: 1100, h: 733, title: 'Annual Day · drama act (group)', uploadedBy: 'Photographer · Studio Lens',
    faces: [
      { box: [0.4893, 0.4013, 0.0995, 0.2059], studentId: 'S1' },
      { box: [0.2415, 0.131, 0.0972, 0.1994], studentId: 'S2' },
      { box: [0.6494, 0.0909, 0.1106, 0.2212], studentId: 'S3' },
      { box: [0.4208, 0.1286, 0.1023, 0.1949], studentId: null },
    ],
  },
  { id: 'P2', src: 'media/annual-day-05.jpg', w: 1100, h: 733, title: 'Annual Day · choir performance', uploadedBy: 'Photographer · Studio Lens', faces: [{ box: [0.404, 0.1324, 0.1474, 0.2945], studentId: 'S4' }] },
  { id: 'P3', src: 'media/annual-day-16.jpg', w: 1100, h: 733, title: 'Annual Day · curtain call', uploadedBy: 'Photographer · Studio Lens', faces: [{ box: [0.3808, 0.2938, 0.1847, 0.3099], studentId: 'S2' }] },
]
export const MORE_PHOTOS: Photo[] = [
  { id: 'P5', src: 'media/annual-day-03.jpg', w: 1100, h: 1649, title: 'Annual Day · opening ceremony', uploadedBy: 'Photographer · Studio Lens', faces: [{ box: [0.4471, 0.42, 0.0905, 0.0812], studentId: 'S2' }] },
  { id: 'P6', src: 'media/annual-day-12.jpg', w: 1100, h: 1650, title: 'Annual Day · welcome song', uploadedBy: 'Photographer · Studio Lens', faces: [
    { box: [0.7548, 0.3851, 0.0423, 0.0406], studentId: 'S4' }, { box: [0.4787, 0.3603, 0.0635, 0.0689], studentId: 'S3' },
    { box: [0.2972, 0.2289, 0.0663, 0.09], studentId: 'S2' }, { box: [0.1224, 0.4647, 0.0386, 0.0437], studentId: null }, { box: [0.5253, 0.1847, 0.06, 0.0824], studentId: 'S1' }] },
]
/** Added by the "Photographer uploads new batch" action. */
export const UPLOAD_PHOTO: Photo = {
  id: 'P4', src: 'media/annual-day-15.jpg', w: 1100, h: 733, title: 'Annual Day · group photo (new upload)', uploadedBy: 'Photographer · Studio Lens',
  faces: [{ box: [0.5719, 0.2919, 0.0819, 0.178], studentId: null }],
}

export const PHOTOS0: Photo[] = [...PHOTOS_BASE, ...MORE_PHOTOS]

export type PhotoState = 'published' | 'takedown' | 'blocked' | 'review' | 'eligible'
export interface Evaluation { state: PhotoState; restricted: Student[]; unknown: number; people: (Student | null)[]; reasons: string[] }

/** Fail-closed gate for the public-use purpose: an unknown face is never presumed consented. */
export function evaluate(p: Photo, students: Student[], published: boolean): Evaluation {
  const by = (id: string | null) => students.find((s) => s.id === id) ?? null
  const people = p.faces.map((f) => (f.adult ? null : by(f.studentId)))
  const allowed = (s: Student) => s.perms.public || s.approvals.includes(p.id)
  const restricted = p.faces.map((f) => (f.adult ? null : by(f.studentId))).filter((s): s is Student => !!s && !allowed(s))
  const unknown = p.faces.filter((f) => !f.adult && !f.studentId).length
  const reasons: string[] = []
  restricted.forEach((s) => reasons.push(s.onboarded ? `${s.name}'s guardian has not allowed website & social media${s.askEach ? ' (asks each time)' : ''}` : `${s.name}'s guardian has not set choices yet`))
  if (unknown) reasons.push(`${unknown} face${unknown > 1 ? 's' : ''} not matched to a student — needs human review`)
  let state: PhotoState = restricted.length ? 'blocked' : unknown ? 'review' : 'eligible'
  if (published) state = restricted.length ? 'takedown' : 'published'
  return { state, restricted, unknown, people, reasons }
}

export const STATE_META: Record<PhotoState, { label: string; tone: 'ok' | 'warn' | 'risk' | 'info' }> = {
  eligible: { label: 'Eligible · awaiting school approval', tone: 'info' },
  review: { label: 'Human review needed', tone: 'warn' },
  blocked: { label: 'Public use blocked', tone: 'risk' },
  published: { label: 'Approved & published', tone: 'ok' },
  takedown: { label: 'Live post · takedown task', tone: 'risk' },
}

/** Statute dates per the DPDP commencement notification (13 Nov 2025) and the 18-month formula. */
export const TIMELINE = [
  { date: '13 Nov 2025', title: 'Act partly in force', body: 'Preliminary and Board provisions commenced; DPDP Rules, 2025 notified (Rules 1, 2 and 17–21 in force).' },
  { date: '13 Nov 2026', title: 'Consent Manager regime', body: 'Section 6(9) on registered Consent Managers and Rule 4 begin. A school permission console is not a registered Consent Manager.' },
  { date: '13 May 2027', title: 'Main duties scheduled', body: 'Sections 3–5, 6(1)–(8) and (10), 7–17 and related rules (3, 5–16, 22, 23). Schools should prepare ahead of this date.' },
]

export type Status = 'Prototype' | 'Planned' | 'Service' | 'Not offered'
export const LEGAL_MAP: { ref: string; topic: string; control: string; status: Status }[] = [
  { ref: 'S.5 · Rule 3', topic: 'Notice', control: 'Purpose-by-purpose guardian notice, versioned, in English and Hindi, with the school’s contact route.', status: 'Prototype' },
  { ref: 'S.6(1)–(3)', topic: 'Consent', control: 'Separate choices for private album, internal use, and website/social. Nothing pre-selected for public use.', status: 'Prototype' },
  { ref: 'S.6(1)', topic: 'Data minimisation', control: 'Parents sign in with school-issued random IDs. No parent name, phone or email is held; student names are masked on screen. The school keeps the ID → family link.', status: 'Prototype' },
  { ref: 'S.6(4)–(6)', topic: 'Withdrawal', control: 'Guardian can change a choice as easily as they gave it; future school-managed sharing is restricted and live posts raise a takedown task.', status: 'Prototype' },
  { ref: 'S.6(10)', topic: 'Proof', control: 'Hash-chained record of notice version, choice, actor and time — available if a decision is questioned.', status: 'Prototype' },
  { ref: 'S.9 · Rule 10', topic: 'Children', control: 'Guardian-led choices per child. The school issues IDs only to verified guardians; how that verification is documented is under legal review.', status: 'Planned' },
  { ref: 'S.8(5) · Rule 6', topic: 'Security safeguards', control: 'Role-based access, activity logs, event-limited photographer access. Infrastructure to be assessed before real data.', status: 'Planned' },
  { ref: 'S.8(6) · Rule 7', topic: 'Breach response', control: 'Incident workflow and evidence support. The school and its counsel make the statutory notifications.', status: 'Service' },
  { ref: 'S.8(7)–(8)', topic: 'Erasure & retention', control: 'Album expiry and deletion queue for school-managed copies. Independent external copies cannot be recalled.', status: 'Planned' },
  { ref: 'S.11–13', topic: 'Rights & grievance', control: 'Parent request, case ID, owner and response history.', status: 'Planned' },
  { ref: 'S.6(9) · Rule 4', topic: 'Registered Consent Manager', control: 'Not claimed. We call this a permissions register / parent console.', status: 'Not offered' },
  { ref: 'S.33', topic: 'Penalties', control: 'Statutory caps after an enquiry — not a per-photo fine. We offer readiness, not penalty insurance or certification.', status: 'Not offered' },
]

export const FAQS: { q: string; a: string }[] = [
  { q: 'How could a school be flagged under the DPDP Act?', a: 'A concern can arise from a parent’s complaint, a rights request that is not answered, a data incident, or a Board process — depending on the law and the facts. There is no guaranteed detection pipeline. What helps is being able to show, quickly, what was decided and why.' },
  { q: 'What are the penalties — and which matter most?', a: 'Penalties are caps set after an enquiry, never an automatic amount per photo, and the main provisions are scheduled to take effect on 13 May 2027. In priority order by cap: failing to keep reasonable security safeguards (up to ₹250 crore), failing to notify a breach (up to ₹200 crore), and breaching children’s-data duties (up to ₹200 crore). Other duties carry lower caps. Counsel should advise on your school’s position.' },
  { q: 'Is every school photo illegal without consent?', a: 'No blanket rule exists. The lawful basis, purpose, the child’s age, school-related exceptions and what has commenced all matter. Separately, parent-approved sharing is a sensible school policy, and this prototype shows how to run it.' },
  { q: 'Can you delete a photo already forwarded on WhatsApp?', a: 'No. We can restrict links and exports that go through the managed workflow. We cannot recall screenshots or independent copies.' },
  { q: 'Does the AI find every student in every group photo?', a: 'No. Matching can be incomplete or wrong, so anything unknown or low-confidence goes to a person. In this demo an unknown face blocks publishing until someone reviews it. Child-face matching also needs legal review before any real use.' },
  { q: 'Is this DPDP compliance or a government certification?', a: 'Neither. It is a scoped media-governance workflow. Wider school readiness — notices, vendor contracts, training, incidents — is a separate service.' },
  { q: 'What exactly is audited?', a: 'Permission versions, configured restrictions, approval decisions, and access and sharing events that actually happen inside the managed workflow. It cannot prove what happened outside it, such as who later leaked a copy.' },
  { q: 'Do you use facial recognition?', a: 'The prototype shows matching with a human fallback, using synthetic data. Any real deployment would start with manual tagging as an option and a legal review of child-face processing.' },
  { q: 'Do you see parents’ names or phone numbers?', a: 'No — that is a design choice. Parents sign in with a random ID and password printed on a slip by the school. The link between an ID and a family stays in the school’s own records; the app holds no parent names, phone numbers or emails, and shows student names partly masked. The trade-off: we can’t reset a forgotten password — the school office reissues it.' },
  { q: 'What access do vendors and photographers get?', a: 'Event-limited upload access that expires. They never see parent choices of other events or the full roster.' },
  { q: 'What if a parent withdraws after we posted?', a: 'Future managed use is restricted immediately, and any live post is flagged for takedown. Copies already shared elsewhere can’t be recalled, so we say so up front.' },
  { q: 'What does a pilot cost, and how does it run?', a: 'Start with a free 15-minute workflow assessment and a synthetic walkthrough. A bounded remote pilot around one real event follows only after your lawful-basis, safeguarding and processor review. We’ll scope it with you.' },
]

/** Demo credentials, as printed on the school's login slips. In a real deployment only salted hashes are stored, and the ID → family mapping stays in the school's own records. */
export const ACCOUNTS0: Record<string, { id: string; temp: string; password: string; mustChange: boolean; failed: number; resets: number }> = {
  S1: { id: 'G-9M2X', temp: 'cedar-lamp-352', password: 'cedar-lamp-352', mustChange: false, failed: 0, resets: 0 },
  S2: { id: 'G-4K7Q', temp: 'maple-river-481', password: 'maple-river-481', mustChange: true, failed: 0, resets: 0 },
  S3: { id: 'G-2T8V', temp: 'olive-moon-627', password: 'olive-moon-627', mustChange: false, failed: 0, resets: 0 },
  S4: { id: 'G-6R5C', temp: 'coral-bell-914', password: 'coral-bell-914', mustChange: false, failed: 0, resets: 0 },
}
