import type { AreaKey, Destination, DestinationKey, MediaPurposeKey, Purpose } from './types'

/** Single source for legal dates/refs used in UI copy. Verify against MeitY Gazette before external use. */
export const LEGAL = {
  rulesNotified: '2025-11-13',
  fullObligationsFrom: '2027-05-13',
  fullObligationsLabel: '13 May 2027',
  boardDetailedReportHours: 72,
  grievanceMaxDays: 90,
  logRetention: 'at least one year',
  disclaimer:
    'School DPDP OS helps you run a DPDP readiness programme. It is not legal advice; templates are reviewed by empanelled Indian privacy counsel before use.',
}

export const MEDIA_PURPOSES: (Purpose & { key: MediaPurposeKey })[] = [
  {
    key: 'private-gallery',
    label: 'Private gallery for me and my child’s class',
    labelHi: 'मेरे और मेरे बच्चे की कक्षा के लिए निजी गैलरी',
    example: 'Event photos shared only with parents of the class, inside the app.',
    exampleHi: 'कार्यक्रम की तस्वीरें केवल कक्षा के अभिभावकों के साथ, ऐप के अंदर।',
    basis: 'consent',
    category: 'media',
    defaultOn: true,
  },
  {
    key: 'internal',
    label: 'Inside school: notice boards, yearbook, newsletters',
    labelHi: 'स्कूल के अंदर: नोटिस बोर्ड, ईयरबुक, न्यूज़लेटर',
    example: 'Sports Day board in the corridor, annual yearbook.',
    exampleHi: 'गलियारे में स्पोर्ट्स डे बोर्ड, वार्षिक ईयरबुक।',
    basis: 'consent',
    category: 'media',
    defaultOn: true,
  },
  {
    key: 'public-digital',
    label: 'School website & social media',
    labelHi: 'स्कूल की वेबसाइट और सोशल मीडिया',
    example: 'Instagram, Facebook, YouTube and the school website.',
    exampleHi: 'इंस्टाग्राम, फेसबुक, यूट्यूब और स्कूल वेबसाइट।',
    basis: 'consent',
    category: 'media',
  },
  {
    key: 'promotion',
    label: 'Brochures, prospectus & newspapers',
    labelHi: 'ब्रोशर, प्रॉस्पेक्टस और समाचार पत्र',
    example: 'Admission brochure, hoardings, local newspaper features.',
    exampleHi: 'प्रवेश ब्रोशर, होर्डिंग, स्थानीय अख़बार।',
    basis: 'consent',
    category: 'media',
  },
  {
    key: 'paid-ads',
    label: 'Paid advertisements',
    labelHi: 'सशुल्क विज्ञापन',
    example: 'Sponsored posts and paid admission campaigns. Off unless you turn it on.',
    exampleHi: 'प्रायोजित पोस्ट और सशुल्क प्रवेश अभियान। जब तक आप चालू न करें, बंद।',
    basis: 'consent',
    category: 'media',
  },
]

/** Non-media processing purposes (legitimate use / school exemption) shown in the Privacy Hub. */
export const CORE_PURPOSES: Purpose[] = [
  { key: 'admission', label: 'Admission & enrolment records', example: 'Application, documents, class allocation', basis: 'legitimate-use', category: 'core' },
  { key: 'academics', label: 'Teaching, assessment & report cards', example: 'Marks, attendance, homework, report cards', basis: 'school-exemption', category: 'core', note: 'Educational activity — Fourth Schedule exemption from s.9(1)/(3) for tracking & behavioural monitoring.' },
  { key: 'safety-cctv', label: 'Campus safety (CCTV)', example: 'Cameras in corridors, gates and buses', basis: 'school-exemption', category: 'safety', note: 'Child safety — Fourth Schedule exemption; document purpose and access controls.' },
  { key: 'transport', label: 'Bus location tracking', example: 'Live bus GPS shared with parents during travel', basis: 'school-exemption', category: 'transport', note: 'Transport location tracking during travel for child safety — scoped exemption.' },
  { key: 'fees', label: 'Fees & payments', example: 'Fee receipts through the payment gateway', basis: 'consent', category: 'core' },
  { key: 'health', label: 'Health & medical needs', example: 'Allergies, medical conditions, nurse visits', basis: 'consent', category: 'core' },
  { key: 'edtech', label: 'Learning apps (EdTech)', example: 'LMS and practice apps used in class', basis: 'consent', category: 'edtech', note: 'No tracking or targeted ads by third parties.' },
  { key: 'comms', label: 'Messages to parents', example: 'WhatsApp, SMS and email updates', basis: 'consent', category: 'communication' },
]

export const DESTINATIONS: Destination[] = [
  { key: 'instagram', label: 'Instagram', short: 'Instagram', purpose: 'public-digital', blurFixAllowed: true, audience: 'public' },
  { key: 'website', label: 'School website', short: 'Website', purpose: 'public-digital', blurFixAllowed: true, audience: 'public' },
  { key: 'facebook', label: 'Facebook', short: 'Facebook', purpose: 'public-digital', blurFixAllowed: true, audience: 'public' },
  { key: 'youtube', label: 'YouTube', short: 'YouTube', purpose: 'public-digital', blurFixAllowed: true, audience: 'public' },
  { key: 'print', label: 'Brochure / prospectus', short: 'Print', purpose: 'promotion', blurFixAllowed: false, audience: 'promotion', note: 'Print never uses blurred faces — pick another photo.' },
  { key: 'newspaper', label: 'Newspaper', short: 'Press', purpose: 'promotion', blurFixAllowed: false, audience: 'promotion', note: 'Press photos need permission for every child shown.' },
  { key: 'paid-ads', label: 'Paid ads', short: 'Ads', purpose: 'paid-ads', blurFixAllowed: false, audience: 'paid', note: 'Every face needs explicit permission for paid ads.' },
  { key: 'internal', label: 'Notice board & yearbook', short: 'Internal', purpose: 'internal', blurFixAllowed: true, audience: 'internal' },
  { key: 'class-whatsapp', label: 'Class WhatsApp group', short: 'WhatsApp', purpose: 'private-gallery', blurFixAllowed: true, audience: 'private' },
  { key: 'private-gallery', label: 'Private parent gallery', short: 'Parents', purpose: 'private-gallery', blurFixAllowed: true, audience: 'private', note: 'Each family sees only photos of their own child; other children are softly blurred unless their parents allow class sharing.' },
]
export const DEST = Object.fromEntries(DESTINATIONS.map((d) => [d.key, d])) as Record<DestinationKey, Destination>

export const AREAS: { key: AreaKey; label: string; short: string; blurb: string }[] = [
  { key: 'governance', label: 'Governance & privacy contact', short: 'Governance', blurb: 'Who is accountable, the processing register and the annual review.' },
  { key: 'notices', label: 'Notices & parent permissions', short: 'Notices', blurb: 'Clear notices in English and Hindi, verified parents, purpose-by-purpose choices.' },
  { key: 'media', label: 'Child & media safety', short: 'Media', blurb: 'Photos and videos follow each parent’s choices, automatically.' },
  { key: 'rights', label: 'Parent requests', short: 'Requests', blurb: 'Access, correction, erasure, nomination and grievances — on time, with a trail.' },
  { key: 'vendors', label: 'Vendors & data sharing', short: 'Vendors', blurb: 'Every app and vendor that touches student data, with the right contract clauses.' },
  { key: 'security', label: 'Security & incidents', short: 'Security', blurb: 'Reasonable safeguards, logs, backups and a ready breach plan.' },
  { key: 'retention', label: 'Retention & deletion', short: 'Retention', blurb: 'Keep data only as long as needed; delete with proof.' },
  { key: 'assurance', label: 'Expert support', short: 'Experts', blurb: 'Managed privacy desk, counsel, cyber and audit partners on call.' },
]

export const STATUS_META = {
  covered: { label: 'Covered', tone: 'ok' },
  'action-due': { label: 'Action due', tone: 'warn' },
  decision: { label: 'Needs your decision', tone: 'info' },
  'expert-review': { label: 'Expert review', tone: 'expert' },
  exempt: { label: 'School exemption', tone: 'muted' },
  gap: { label: 'Gap', tone: 'risk' },
} as const

export const VERDICT_META = {
  ready: { label: 'Ready to share', tone: 'ok' },
  'needs-blur': { label: 'Needs a blur', tone: 'warn' },
  'keep-private': { label: 'Keep private', tone: 'risk' },
  'check-faces': { label: 'Check faces', tone: 'info' },
} as const

export const EXPERTS = [
  { kind: 'managed-desk', title: 'Managed Privacy Desk', who: 'School DPDP OS privacy team', blurb: 'A named privacy coordinator for your school: parent queries, requests, monthly review and escalation.', when: 'Recommended for every school' },
  { kind: 'privacy-review', title: 'Privacy counsel review', who: 'Empanelled Indian privacy lawyer', blurb: 'Review of notices, new purposes, contracts and tricky parent situations.', when: 'On demand' },
  { kind: 'cyber', title: 'Cyber security assessment', who: 'Empanelled cyber firm', blurb: 'Configuration and vulnerability review against reasonable-safeguard expectations, with a fix plan.', when: 'Annually' },
  { kind: 'breach-support', title: 'Breach support', who: 'Privacy counsel + incident responder', blurb: 'Hands-on help to contain, notify parents and file with the Board on time.', when: 'When something goes wrong' },
  { kind: 'training', title: 'Staff training', who: 'School DPDP OS + partner', blurb: '5-minute modules for teachers, office staff and photographers, with acknowledgements.', when: 'Every term' },
  { kind: 'dpo', title: 'Data Protection Officer service', who: 'Qualified India-based DPO', blurb: 'Only required if your school is notified as a Significant Data Fiduciary — or if you want DPO-level governance voluntarily.', when: 'Only if applicable' },
  { kind: 'audit-dpia', title: 'Independent audit & DPIA', who: 'Independent data auditor (separate from us)', blurb: 'Annual DPIA and audit for Significant Data Fiduciaries. Kept independent from our implementation team.', when: 'Only if applicable' },
] as const
