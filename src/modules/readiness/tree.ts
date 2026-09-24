/**
 * Readiness Engine — the question tree as data.
 * Each option can "yield" findings. A finding lands in one of four buckets:
 * covered by the current setup · we'll complete for you · needs your decision · needs specialist review.
 * Questions with `showIf` only appear when an earlier answer makes them relevant (a decision tree, not a form dump).
 */
import type { AreaKey, Task } from '@/data/types'
import type { Tone } from '@/design/ui'

export type Bucket = 'covered' | 'complete' | 'decision' | 'specialist'
export type FamilyKey = 'school' | 'children' | 'systems' | 'processors' | 'security' | 'retention' | 'rights'
/** question id → selected option values (single-choice questions hold one value). */
export type Answers = Record<string, string[]>

export interface Option {
  value: string
  label: string
  hint?: string
  yields?: string[]
  /** Shown in the "Your school" line of the side panel. */
  note?: string
}

export interface Question {
  id: string
  family: FamilyKey
  kind: 'single' | 'multi'
  prompt: string
  help?: string
  options: Option[]
  prefill: string[]
  columns?: 1 | 2 | 3
  showIf?: (a: Answers) => boolean
}

export type OwnerRef = 'desk' | 'office' | 'decider'
export type DecisionKey = 'whatsapp' | 'paid-ads' | 'alumni' | 'bio-students'

export interface FindingDef {
  bucket: Bucket
  title: string
  detail: string
  area: AreaKey
  tag?: 'exemption' | 'media-safe'
  ref?: string
  decision?: DecisionKey
  task?: { title: string; owner: OwnerRef; days: number; kind: NonNullable<Task['kind']>; link: string; skipIfOpen?: string }
}
export interface Finding extends FindingDef { id: string; source: string }

/* ------------------------------------------------------------------ */

export const FAMILIES: { key: FamilyKey; label: string; blurb: string }[] = [
  { key: 'school', label: 'School & governance', blurb: 'Who you are and who decides' },
  { key: 'children', label: 'Children & purposes', blurb: 'Why you use student data' },
  { key: 'systems', label: 'Systems', blurb: 'Where student data lives' },
  { key: 'processors', label: 'Processors', blurb: 'Vendors who handle data for you' },
  { key: 'security', label: 'Security', blurb: 'Safeguards and breach readiness' },
  { key: 'retention', label: 'Retention', blurb: 'How long you keep things' },
  { key: 'rights', label: 'Rights', blurb: 'How parents reach you' },
]

export const BUCKETS: Record<Bucket, { label: string; short: string; tone: Tone; blurb: string }> = {
  covered: { label: 'Covered by your current setup', short: 'Covered', tone: 'ok', blurb: 'Already in place, including school exemptions.' },
  complete: { label: 'We’ll complete for you', short: 'We’ll complete', tone: 'azure', blurb: 'Your privacy desk drafts, sets up and closes these.' },
  decision: { label: 'Needs your decision', short: 'Your decision', tone: 'info', blurb: 'A quick choice only the school can make.' },
  specialist: { label: 'Needs specialist review', short: 'Specialist', tone: 'expert', blurb: 'Empanelled counsel or cyber partners take a look.' },
}
export const BUCKET_ORDER: Bucket[] = ['covered', 'complete', 'decision', 'specialist']

/* ------------------------------------------------------------------ */

export const DECISIONS: Record<DecisionKey, { topic: string; question: string; context: string; options: { label: string; detail: string; recommended?: boolean }[] }> = {
  whatsapp: {
    topic: 'Photos in class WhatsApp groups',
    question: 'How should teachers share photos with class parents?',
    context: 'Class WhatsApp groups are quick, but every photo reaches every family in the group, including children whose parents said no.',
    options: [
      { label: 'Only through the private parent gallery', detail: 'Each family sees their own child. Other children are softly blurred unless their parents allow class sharing.', recommended: true },
      { label: 'WhatsApp only for photos where every child is cleared', detail: 'Media Safe checks each photo before a teacher can forward it.' },
      { label: 'Keep WhatsApp groups for text updates only', detail: 'Photos go to the gallery; WhatsApp carries notices and reminders.' },
    ],
  },
  'paid-ads': {
    topic: 'Children in paid admission ads',
    question: 'Should children ever appear in paid admission ads?',
    context: 'Paid ads reach strangers and stay online for a long time. Parents choose this separately, and it stays off unless they turn it on.',
    options: [
      { label: 'Never. Use campus and staff photos', detail: 'The simplest position to explain to parents.', recommended: true },
      { label: 'Only with a separate, explicit yes from parents', detail: 'Publish Guard allows a paid ad only when every child in it has a yes.' },
    ],
  },
  alumni: {
    topic: 'What the school keeps after a student leaves',
    question: 'What should the school keep after a student leaves?',
    context: 'Transfer certificates and marks are kept as education rules require. Anything else needs a reason and a time limit.',
    options: [
      { label: 'Contact details for the alumni network, if the family agrees', detail: 'Asked when the student leaves; reviewed every three years.', recommended: true },
      { label: 'Only what the rules require', detail: 'Transfer certificate and marks. Everything else is deleted after one year.' },
    ],
  },
  'bio-students': {
    topic: 'Biometric attendance for students',
    question: 'Should students use biometric attendance?',
    context: 'Fingerprints cannot be changed if they leak. A card or app check-in does the same job with less risk.',
    options: [
      { label: 'Switch students to cards or app check-in', detail: 'Staff can stay on biometric; student templates are deleted with a certificate.', recommended: true },
      { label: 'Keep biometric, with parent permission', detail: 'Parents choose, and a card option stays available.' },
    ],
  },
}

/* ------------------------------------------------------------------ */

export const FINDINGS: Record<string, FindingDef> = {
  /* Covered by your current setup */
  contact: { bucket: 'covered', area: 'governance', title: 'Privacy contact in place', detail: 'Parents know who to ask about their child’s data, on the website, notice and app.', ref: 'Sec 8(9) · Rule 9' },
  'sdf-no': { bucket: 'covered', area: 'governance', title: 'Not a Significant Data Fiduciary', detail: 'No statutory DPO or annual audit is needed today. We re-check if the Government notifies new classes.', ref: 'Sec 10 · Rule 13' },
  consent: { bucket: 'covered', area: 'notices', title: 'Verified parent choices', detail: 'Parents are verified and choose purpose by purpose, the standard the Act sets for children.', ref: 'Sec 9(1) · Rule 10' },
  'ex-education': { bucket: 'covered', area: 'notices', tag: 'exemption', title: 'Educational tracking and behavioural monitoring', detail: 'Attendance, progress and behaviour records for educational activity are a school exemption. Document it; no extra consent forms.', ref: 'Rule 12 · Fourth Schedule' },
  'media-safe': { bucket: 'covered', area: 'media', tag: 'media-safe', title: 'Photos follow each parent’s choices', detail: 'Media Safe checks every photo and video against each child’s permissions before it is shared.', ref: 'Sec 9 · Sec 6' },
  'ex-cctv': { bucket: 'covered', area: 'security', tag: 'exemption', title: 'Child-safety CCTV', detail: 'Cameras kept for the safety of children fall within the school exemption. Keep footage short and log who views it.', ref: 'Rule 12 · Fourth Schedule' },
  'ex-transport': { bucket: 'covered', area: 'notices', tag: 'exemption', title: 'Bus location during travel', detail: 'Tracking the school bus while children travel to and from school is a school exemption, limited to the journey.', ref: 'Rule 12 · Fourth Schedule' },
  photographers: { bucket: 'covered', area: 'media', tag: 'media-safe', title: 'Photographers upload through time-bound links', detail: 'Guest photographers upload to one event, never see names and keep no copies.', ref: 'Rule 6' },
  'contracts-ok': { bucket: 'covered', area: 'vendors', title: 'Vendor contracts carry data clauses', detail: 'Security, deletion, breach notice and sub-processor clauses are in every contract.', ref: 'Sec 8(2) · Rule 6' },
  'edtech-ok': { bucket: 'covered', area: 'vendors', title: 'Learning apps are ad-free', detail: 'No tracking or targeted ads aimed at children in the apps you use.', ref: 'Sec 9(3)' },
  safeguards: { bucket: 'covered', area: 'security', title: 'Reasonable security safeguards', detail: 'Two-step sign-in, encryption and role-based access are in place.', ref: 'Sec 8(5) · Rule 6' },
  logs: { bucket: 'covered', area: 'security', title: 'Access logs kept for a year', detail: 'Who opened what is recorded and kept for at least a year.', ref: 'Rule 6' },
  breach: { bucket: 'covered', area: 'security', title: 'Breach plan ready', detail: 'Everyone knows who informs parents and the Data Protection Board, and by when.', ref: 'Sec 8(6) · Rule 7' },
  'training-ok': { bucket: 'covered', area: 'security', title: 'Staff trained this term', detail: 'Every staff member finished the 5-minute privacy module.', ref: 'Rule 6' },
  retention: { bucket: 'covered', area: 'retention', title: 'Retention schedule', detail: 'Each kind of record has a keep-until date and a reason.', ref: 'Sec 8(7)' },
  'old-media-ok': { bucket: 'covered', area: 'retention', title: 'Old event photos reviewed', detail: 'Past batches’ photos are archived or deleted on schedule, with proof.', ref: 'Sec 8(7)' },
  requests: { bucket: 'covered', area: 'rights', title: 'Parent request channel', detail: 'Parents can ask for a summary, a correction or deletion from the app, website or office, each with an owner and due date.', ref: 'Sec 11–14 · Rule 14' },
  'nomination-ok': { bucket: 'covered', area: 'rights', title: 'Parents can nominate someone', detail: 'A nominee can act for a parent who is unable to.', ref: 'Sec 14' },

  /* We'll complete for you */
  'contact-publish': { bucket: 'complete', area: 'governance', title: 'Publish your privacy contact', detail: 'We add a named contact to your website, notice and parent app.', ref: 'Sec 8(9) · Rule 9', task: { title: 'Publish the privacy contact on website, notice and app', owner: 'desk', days: 5, kind: 'general', link: '/privacy' } },
  reminders: { bucket: 'complete', area: 'notices', title: 'Nudge families who haven’t chosen yet', detail: 'Friendly reminders in English and Hindi to families who haven’t set their choices.', task: { title: 'Remind families who have not set photo choices', owner: 'office', days: 3, kind: 'general', link: '/privacy/permissions', skipIfOpen: 'Remind' } },
  'consent-digitise': { bucket: 'complete', area: 'notices', title: 'Move paper forms to verified choices', detail: 'We turn the admission form into verified, purpose-by-purpose choices parents can change any time.', ref: 'Sec 9(1) · Rule 10', task: { title: 'Move paper permission forms to verified, purpose-by-purpose choices', owner: 'desk', days: 21, kind: 'general', link: '/privacy/permissions' } },
  'consent-split': { bucket: 'complete', area: 'notices', title: 'Split the blanket form into clear choices', detail: 'One yes for everything is not a real choice. We split it purpose by purpose.', ref: 'Sec 6 · Rule 3', task: { title: 'Split the blanket permission form into purpose-by-purpose choices', owner: 'desk', days: 21, kind: 'general', link: '/privacy/permissions' } },
  'consent-setup': { bucket: 'complete', area: 'notices', title: 'Set up verified parent choices', detail: 'Notice in English and Hindi, parent verification and purpose-by-purpose choices.', ref: 'Sec 9(1) · Rule 10', task: { title: 'Set up notice, parent verification and choices', owner: 'desk', days: 21, kind: 'general', link: '/privacy' } },
  'notice-update': { bucket: 'complete', area: 'notices', title: 'Add the bus app to your notice', detail: 'We draft the notice update covering the transport app and CCTV retention, in English and Hindi.', task: { title: 'Draft notice update for the transport app and CCTV retention', owner: 'desk', days: 5, kind: 'general', link: '/privacy/notices', skipIfOpen: 'notice v2.2' } },
  'cctv-shorten': { bucket: 'complete', area: 'security', title: 'Shorten CCTV retention', detail: 'Keep footage for 30 days unless an incident is under review, and log who views it.', task: { title: 'Set CCTV footage to delete after 30 days', owner: 'office', days: 10, kind: 'deletion', link: '/trust/retention' } },
  'storage-map': { bucket: 'complete', area: 'vendors', title: 'Record where each system stores data', detail: 'Some systems keep data outside India. We record each location and watch for restricted countries.', ref: 'Sec 16', task: { title: 'Record storage locations for cloud systems', owner: 'desk', days: 10, kind: 'general', link: '/trust/vendors' } },
  contracts: { bucket: 'complete', area: 'vendors', title: 'Add missing clauses to vendor contracts', detail: 'We draft deletion, breach-notice and sub-processor clauses for the contracts that lack them.', ref: 'Sec 8(2) · Rule 6', task: { title: 'Draft missing data clauses for vendor contracts', owner: 'desk', days: 12, kind: 'contract', link: '/trust/vendors', skipIfOpen: 'clauses' } },
  'photographers-link': { bucket: 'complete', area: 'media', title: 'Give photographers upload links', detail: 'Time-bound links for each event, no names shown, cards wiped after upload.', ref: 'Rule 6', task: { title: 'Switch photographers to time-bound upload links', owner: 'office', days: 7, kind: 'general', link: '/media/upload' } },
  mfa: { bucket: 'complete', area: 'security', title: 'Turn on two-step sign-in everywhere', detail: 'We help your IT head switch it on for email, the ERP and admin tools.', ref: 'Rule 6', task: { title: 'Turn on two-step sign-in for all staff systems', owner: 'desk', days: 14, kind: 'general', link: '/trust' } },
  'logs-extend': { bucket: 'complete', area: 'security', title: 'Keep access logs for a year', detail: 'We set log retention to at least a year and schedule a monthly review.', ref: 'Rule 6', task: { title: 'Extend access-log retention to at least one year', owner: 'desk', days: 14, kind: 'general', link: '/trust' } },
  'breach-plan': { bucket: 'complete', area: 'security', title: 'Breach plan and a short drill', detail: 'A one-page plan, named roles and a 20-minute tabletop drill.', ref: 'Sec 8(6) · Rule 7', task: { title: 'Write the breach plan and run a 20-minute drill', owner: 'desk', days: 14, kind: 'general', link: '/trust/incidents' } },
  training: { bucket: 'complete', area: 'security', title: 'Finish this term’s staff training', detail: 'A 5-minute module for the staff who haven’t done it yet, with acknowledgements.', task: { title: 'Finish privacy training for remaining staff', owner: 'office', days: 14, kind: 'training', link: '/trust/training', skipIfOpen: 'training' } },
  'retention-schedule': { bucket: 'complete', area: 'retention', title: 'Write your retention schedule', detail: 'Keep-until dates and reasons for each kind of record, reviewed every year.', ref: 'Sec 8(7)', task: { title: 'Draft the retention schedule', owner: 'desk', days: 14, kind: 'general', link: '/trust/retention' } },
  'old-media': { bucket: 'complete', area: 'retention', title: 'Review old event photos', detail: 'Past batches’ photos are kept indefinitely. We set up a review (keep, archive or delete) with a certificate.', ref: 'Sec 8(7)', task: { title: 'Set up a review of past batches’ event media', owner: 'desk', days: 9, kind: 'deletion', link: '/trust/retention', skipIfOpen: 'Class of 2023' } },
  'requests-channel': { bucket: 'complete', area: 'rights', title: 'Open request channels for parents', detail: 'Requests from the app, website and office, each with an owner and due date.', ref: 'Sec 11–14 · Rule 14', task: { title: 'Open parent request channels in the app and website', owner: 'desk', days: 10, kind: 'general', link: '/requests' } },
  nomination: { bucket: 'complete', area: 'rights', title: 'Let parents nominate someone', detail: 'We add a “nominate someone to act for me” option to the parent app and privacy centre.', ref: 'Sec 14', task: { title: 'Add a nomination option for parents', owner: 'desk', days: 10, kind: 'general', link: '/requests' } },

  /* Needs your decision */
  whatsapp: { bucket: 'decision', area: 'media', decision: 'whatsapp', title: 'Photos in class WhatsApp groups', detail: 'Choose how teachers share photos with class parents.', task: { title: 'Decide how teachers share photos in class WhatsApp groups', owner: 'decider', days: 7, kind: 'approval', link: '/home?decide=whatsapp' } },
  'paid-ads': { bucket: 'decision', area: 'media', decision: 'paid-ads', title: 'Children in paid ads', detail: 'Decide whether children ever appear in paid admission ads.', task: { title: 'Decide whether children appear in paid admission ads', owner: 'decider', days: 7, kind: 'approval', link: '/home?decide=paid-ads' } },
  alumni: { bucket: 'decision', area: 'retention', decision: 'alumni', title: 'What to keep after students leave', detail: 'Decide what you keep for the alumni network, and for how long.', task: { title: 'Decide what the school keeps after a student leaves', owner: 'decider', days: 14, kind: 'approval', link: '/home?decide=alumni' } },
  'bio-students': { bucket: 'decision', area: 'security', decision: 'bio-students', title: 'Biometric attendance for students', detail: 'Decide whether students keep biometric attendance or move to cards.', task: { title: 'Decide on biometric attendance for students', owner: 'decider', days: 14, kind: 'approval', link: '/home?decide=bio-students' } },

  /* Needs specialist review */
  'sdf-unsure': { bucket: 'specialist', area: 'governance', title: 'Confirm Significant Data Fiduciary status', detail: 'Counsel confirms whether any notification applies to your school or trust. Most schools are not notified.', ref: 'Sec 10 · Rule 13', task: { title: 'Counsel to confirm Significant Data Fiduciary status', owner: 'desk', days: 14, kind: 'review', link: '/experts' } },
  'sdf-yes': { bucket: 'specialist', area: 'governance', title: 'Significant Data Fiduciary duties', detail: 'A Data Protection Officer in India, an annual DPIA and an independent audit. Our partners set these up.', ref: 'Sec 10 · Rule 13', task: { title: 'Set up DPO, DPIA and independent audit', owner: 'desk', days: 30, kind: 'review', link: '/experts' } },
  edtech: { bucket: 'specialist', area: 'vendors', title: 'Check learning apps for ads and tracking', detail: 'Children must not be tracked or targeted with ads. A specialist reviews each app’s settings and terms.', ref: 'Sec 9(3)', task: { title: 'Specialist review of learning apps for ads and tracking', owner: 'desk', days: 14, kind: 'review', link: '/experts' } },
}

/* ------------------------------------------------------------------ */

const has = (a: Answers, q: string, v: string) => (a[q] ?? []).includes(v)

export const QUESTIONS: Question[] = [
  /* School & governance */
  {
    id: 'size', family: 'school', kind: 'single', prompt: 'About how many students study with you?',
    help: 'This helps us size your plan. It does not change what the law asks of you.',
    options: [
      { value: 'small', label: 'Under 500', note: 'Under 500 students' },
      { value: 'mid', label: '500 to 2,000', note: '500 to 2,000 students' },
      { value: 'large', label: '2,000 to 5,000', note: '2,000 to 5,000 students' },
      { value: 'xl', label: 'More than 5,000', note: 'More than 5,000 students' },
    ],
    prefill: ['mid'],
  },
  {
    id: 'decider', family: 'school', kind: 'single', prompt: 'Who takes privacy decisions for the school?',
    help: 'Anything we can’t settle for you goes to this person, with our recommendation.',
    options: [
      { value: 'chairman', label: 'The chairman or trustees', note: 'Decisions go to the chairman' },
      { value: 'principal', label: 'The principal', note: 'Decisions go to the principal' },
      { value: 'committee', label: 'A small committee', hint: 'Principal, administrator and a trustee', note: 'Decisions go to a committee' },
    ],
    prefill: ['principal'],
  },
  {
    id: 'contact', family: 'school', kind: 'single', prompt: 'Is there a named person parents can contact about privacy?',
    help: 'The Act asks you to publish the contact details of someone who can answer questions about personal data.',
    options: [
      { value: 'named', label: 'Yes, named and published', yields: ['contact'] },
      { value: 'informal', label: 'Someone handles it, but it isn’t published', yields: ['contact-publish'] },
      { value: 'none', label: 'Not yet', yields: ['contact-publish'] },
    ],
    prefill: ['named'],
  },
  {
    id: 'sdf', family: 'school', kind: 'single', prompt: 'Has the Government notified your school or trust as a Significant Data Fiduciary?',
    help: 'Only organisations the Government names carry extra duties such as a DPO and an annual audit. Most schools are not named.',
    options: [
      { value: 'no', label: 'No', yields: ['sdf-no'] },
      { value: 'yes', label: 'Yes', yields: ['sdf-yes'] },
      { value: 'unsure', label: 'Not sure', hint: 'Common for trusts that run several schools', yields: ['sdf-unsure'] },
    ],
    prefill: ['unsure'],
  },

  /* Children & purposes */
  {
    id: 'ages', family: 'children', kind: 'multi', prompt: 'Which classes do you teach?',
    help: 'Everyone under 18 is a child under the Act, so a parent decides for them.',
    options: [
      { value: 'pre', label: 'Pre-primary', hint: 'Nursery to UKG' },
      { value: 'primary', label: 'Primary', hint: 'Classes 1 to 5' },
      { value: 'middle', label: 'Middle', hint: 'Classes 6 to 8' },
      { value: 'secondary', label: 'Secondary', hint: 'Classes 9 and 10' },
      { value: 'senior', label: 'Senior secondary', hint: 'Classes 11 and 12' },
    ],
    prefill: ['pre', 'primary', 'middle', 'secondary', 'senior'], columns: 2,
  },
  {
    id: 'consent', family: 'children', kind: 'single', prompt: 'How do parents give permission today?',
    options: [
      { value: 'app', label: 'Purpose by purpose, in an app or online form', hint: 'Each parent verified against admission records', yields: ['consent', 'reminders'] },
      { value: 'paper', label: 'A paper form at admission', yields: ['consent-digitise'] },
      { value: 'blanket', label: 'One form that covers everything', yields: ['consent-split'] },
      { value: 'none', label: 'We don’t ask yet', yields: ['consent-setup'] },
    ],
    prefill: ['app'],
  },
  {
    id: 'uses', family: 'children', kind: 'multi', prompt: 'What do you use student information for?',
    help: 'Pick everything that applies. Some of these are school exemptions, so no consent forms are needed.',
    options: [
      { value: 'teaching', label: 'Teaching and report cards', yields: ['ex-education'] },
      { value: 'attendance', label: 'Attendance and behaviour', yields: ['ex-education'] },
      { value: 'health', label: 'Health and medical needs' },
      { value: 'fees', label: 'Fees and payments' },
      { value: 'transport', label: 'School transport' },
      { value: 'safety', label: 'Safety and safeguarding' },
      { value: 'alumni', label: 'Staying in touch with alumni', yields: ['alumni'] },
      { value: 'marketing', label: 'Admissions marketing' },
    ],
    prefill: ['teaching', 'attendance', 'health', 'fees', 'transport', 'safety', 'alumni'], columns: 2,
  },
  {
    id: 'media', family: 'children', kind: 'single', prompt: 'Do you take photos or videos of students at school events?',
    options: [
      { value: 'often', label: 'Yes, at most events', yields: ['media-safe'] },
      { value: 'sometimes', label: 'Now and then', yields: ['media-safe'] },
      { value: 'never', label: 'No' },
    ],
    prefill: ['often'],
  },
  {
    id: 'mediaWhere', family: 'children', kind: 'multi', prompt: 'Where do those photos end up?',
    help: 'Each place is a separate choice for parents. Media Safe checks every photo against those choices.',
    showIf: (a) => !has(a, 'media', 'never') && (a.media ?? []).length > 0,
    options: [
      { value: 'gallery', label: 'Private gallery for parents' },
      { value: 'whatsapp', label: 'Class WhatsApp groups', yields: ['whatsapp'] },
      { value: 'internal', label: 'Notice boards and yearbook' },
      { value: 'social', label: 'Website and social media' },
      { value: 'print', label: 'Brochures and newspapers' },
      { value: 'ads', label: 'Paid admission ads', yields: ['paid-ads'] },
    ],
    prefill: ['gallery', 'whatsapp', 'internal', 'social', 'print', 'ads'], columns: 2,
  },

  /* Systems */
  {
    id: 'systems', family: 'systems', kind: 'multi', prompt: 'Which of these hold student data?',
    help: 'Pick every system and service you use. We map each one and what it receives.',
    options: [
      { value: 'entab', label: 'Entab CampusCare' },
      { value: 'fedena', label: 'Fedena' },
      { value: 'teachmint', label: 'Teachmint' },
      { value: 'myclassboard', label: 'MyClassboard' },
      { value: 'other-erp', label: 'Another ERP', hint: 'e.g. CampusCore' },
      { value: 'google', label: 'Google Workspace' },
      { value: 'm365', label: 'Microsoft 365' },
      { value: 'cctv', label: 'CCTV cameras', yields: ['ex-cctv'] },
      { value: 'biometric', label: 'Biometric attendance' },
      { value: 'bus', label: 'Bus GPS app', yields: ['ex-transport', 'notice-update'] },
      { value: 'lms', label: 'Learning app (LMS)' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'payments', label: 'Payment gateway' },
      { value: 'website', label: 'School website' },
      { value: 'photographers', label: 'Event photographers' },
    ],
    prefill: ['other-erp', 'google', 'cctv', 'biometric', 'bus', 'lms', 'whatsapp', 'payments', 'website', 'photographers'], columns: 3,
  },
  {
    id: 'cctvKeep', family: 'systems', kind: 'single', prompt: 'How long is CCTV footage kept?',
    help: 'Child-safety cameras are a school exemption, as long as footage isn’t kept longer than it’s needed.',
    showIf: (a) => has(a, 'systems', 'cctv'),
    options: [
      { value: '30', label: 'Up to 30 days' },
      { value: '90', label: '31 to 90 days', yields: ['cctv-shorten'] },
      { value: 'long', label: 'Longer, or until the disk fills up', yields: ['cctv-shorten'] },
      { value: 'unsure', label: 'Not sure', yields: ['cctv-shorten'] },
    ],
    prefill: ['30'],
  },
  {
    id: 'biometric', family: 'systems', kind: 'single', prompt: 'Who uses biometric attendance?',
    showIf: (a) => has(a, 'systems', 'biometric'),
    options: [
      { value: 'staff', label: 'Staff only' },
      { value: 'students', label: 'Students as well', yields: ['bio-students'] },
    ],
    prefill: ['staff'],
  },
  {
    id: 'storage', family: 'systems', kind: 'single', prompt: 'Where is your data stored?',
    help: 'Storing data outside India is allowed, except in countries the Government restricts. You just need to know where.',
    options: [
      { value: 'india', label: 'Only in India' },
      { value: 'mixed', label: 'India and global cloud services', hint: 'For example Google, Microsoft or WhatsApp', yields: ['storage-map'] },
      { value: 'unsure', label: 'Not sure', yields: ['storage-map'] },
    ],
    prefill: ['mixed'],
  },

  /* Processors */
  {
    id: 'contracts', family: 'processors', kind: 'single', prompt: 'Do your vendor contracts include data-protection clauses?',
    help: 'Vendors act on your behalf, so the school stays responsible. Contracts should cover security, deletion, breach notice and sub-processors.',
    options: [
      { value: 'all', label: 'Yes, all of them', yields: ['contracts-ok'] },
      { value: 'most', label: 'Most of them', yields: ['contracts'] },
      { value: 'few', label: 'A few', yields: ['contracts'] },
      { value: 'none', label: 'No, or not sure', yields: ['contracts'] },
    ],
    prefill: ['most'],
  },
  {
    id: 'edtech', family: 'processors', kind: 'single', prompt: 'Do any learning apps show ads or track children for marketing?',
    help: 'The Act bars tracking, behavioural monitoring and targeted ads aimed at children.',
    showIf: (a) => has(a, 'systems', 'lms') || has(a, 'systems', 'teachmint'),
    options: [
      { value: 'no', label: 'No, they’re ad-free', yields: ['edtech-ok'] },
      { value: 'some', label: 'Some free apps might', yields: ['edtech'] },
      { value: 'unsure', label: 'Not sure', yields: ['edtech'] },
    ],
    prefill: ['unsure'],
  },
  {
    id: 'photographers', family: 'processors', kind: 'single', prompt: 'How do event photographers hand over photos?',
    showIf: (a) => has(a, 'systems', 'photographers'),
    options: [
      { value: 'link', label: 'Through a time-limited school upload link', hint: 'They never see names and keep no copies', yields: ['photographers'] },
      { value: 'drive', label: 'On a shared drive or pen drive', yields: ['photographers-link'] },
      { value: 'keep', label: 'They keep copies and send us a selection', yields: ['photographers-link'] },
    ],
    prefill: ['link'],
  },

  /* Security */
  {
    id: 'mfa', family: 'security', kind: 'single', prompt: 'Do staff sign in with two-step verification?',
    options: [
      { value: 'yes', label: 'Yes, for email and the ERP', yields: ['safeguards'] },
      { value: 'some', label: 'For some systems', yields: ['mfa'] },
      { value: 'no', label: 'Not yet', yields: ['mfa'] },
    ],
    prefill: ['yes'],
  },
  {
    id: 'logs', family: 'security', kind: 'single', prompt: 'Do you keep a record of who opened student data?',
    help: 'The Rules expect access logs to be kept for at least a year.',
    options: [
      { value: 'year', label: 'Yes, for at least a year', yields: ['logs'] },
      { value: 'short', label: 'Yes, for a shorter time', yields: ['logs-extend'] },
      { value: 'no', label: 'No', yields: ['logs-extend'] },
    ],
    prefill: ['year'],
  },
  {
    id: 'breach', family: 'security', kind: 'single', prompt: 'If a laptop with student data went missing today, would everyone know what to do?',
    options: [
      { value: 'plan', label: 'Yes, we have a tested plan', yields: ['breach'] },
      { value: 'rough', label: 'Roughly', yields: ['breach-plan'] },
      { value: 'no', label: 'No', yields: ['breach-plan'] },
    ],
    prefill: ['plan'],
  },
  {
    id: 'training', family: 'security', kind: 'single', prompt: 'Have staff done privacy training this term?',
    options: [
      { value: 'all', label: 'Everyone', yields: ['training-ok'] },
      { value: 'most', label: 'Most staff', yields: ['training'] },
      { value: 'few', label: 'A few, or none yet', yields: ['training'] },
    ],
    prefill: ['most'],
  },

  /* Retention */
  {
    id: 'schedule', family: 'retention', kind: 'single', prompt: 'Do you have a rule for how long each kind of record is kept?',
    options: [
      { value: 'yes', label: 'Yes, written down', yields: ['retention'] },
      { value: 'some', label: 'For some records', yields: ['retention-schedule'] },
      { value: 'no', label: 'No', yields: ['retention-schedule'] },
    ],
    prefill: ['yes'],
  },
  {
    id: 'oldMedia', family: 'retention', kind: 'single', prompt: 'What happens to event photos after children leave?',
    options: [
      { value: 'reviewed', label: 'They’re reviewed, then archived or deleted', yields: ['old-media-ok'] },
      { value: 'kept', label: 'We keep them indefinitely', yields: ['old-media'] },
      { value: 'unsure', label: 'Not sure', yields: ['old-media'] },
    ],
    prefill: ['kept'],
  },

  /* Rights */
  {
    id: 'channel', family: 'rights', kind: 'single', prompt: 'How can parents ask to see, correct or delete their child’s data?',
    options: [
      { value: 'all', label: 'App, website or office, all logged', yields: ['requests'] },
      { value: 'office', label: 'Only by visiting the office', yields: ['requests-channel'] },
      { value: 'none', label: 'There’s no set way yet', yields: ['requests-channel'] },
    ],
    prefill: ['all'],
  },
  {
    id: 'nominee', family: 'rights', kind: 'single', prompt: 'Can a parent nominate someone to act for them?',
    help: 'Parents can name someone to use their rights if they are unable to.',
    options: [
      { value: 'yes', label: 'Yes', yields: ['nomination-ok'] },
      { value: 'no', label: 'Not yet', yields: ['nomination'] },
      { value: 'unsure', label: 'Not sure', yields: ['nomination'] },
    ],
    prefill: ['no'],
  },
]

/* ------------------------------------------------------------------ */

export const prefilledAnswers = (): Answers => Object.fromEntries(QUESTIONS.map((q) => [q.id, [...q.prefill]]))

export const visibleQuestions = (a: Answers) => QUESTIONS.filter((q) => !q.showIf || q.showIf(a))

/** Findings for the visible questions (optionally only those passing `include`), de-duplicated, in question order. */
export function recognise(a: Answers, include: (q: Question) => boolean = () => true): Finding[] {
  const seen = new Set<string>()
  const out: Finding[] = []
  for (const q of visibleQuestions(a).filter(include)) {
    const sel = a[q.id] ?? []
    for (const o of q.options) {
      if (!sel.includes(o.value)) continue
      for (const id of o.yields ?? []) {
        if (seen.has(id) || !FINDINGS[id]) continue
        seen.add(id)
        out.push({ ...FINDINGS[id], id, source: q.id })
      }
    }
  }
  return out
}

/** "Your school" notes (size, who decides) for the side panel. */
export function profileNotes(a: Answers, include: (q: Question) => boolean = () => true) {
  return visibleQuestions(a).filter(include).flatMap((q) => q.options.filter((o) => o.note && (a[q.id] ?? []).includes(o.value)).map((o) => o.note!))
}

export function countBuckets(fs: Finding[]) {
  const c: Record<Bucket, number> = { covered: 0, complete: 0, decision: 0, specialist: 0 }
  for (const f of fs) c[f.bucket]++
  return c
}

export function ownerFor(ref: OwnerRef, a: Answers) {
  if (ref === 'desk') return 'U-DESK'
  if (ref === 'office') return 'U-OFFICE'
  return (a.decider ?? [])[0] === 'chairman' ? 'U-CHAIR' : 'U-PRIN'
}
