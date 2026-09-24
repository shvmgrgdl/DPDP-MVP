export type IntegrationStatus = 'live' | 'pilot' | 'roadmap'
export interface Integration { name: string; status: IntegrationStatus; blurb: string }

export const INTEGRATIONS: Integration[] = [
  { name: 'CSV roster import', status: 'live', blurb: 'Bring students, classes and guardians in from a spreadsheet.' },
  { name: 'WhatsApp Business', status: 'live', blurb: 'Send notices and permission reminders where parents already are.' },
  { name: 'Parent app', status: 'live', blurb: 'Verified choices, private photos and requests, on any phone.' },
  { name: 'Email', status: 'live', blurb: 'Notices, receipts and request updates by email.' },
  { name: 'ERP API (CampusCore, Entab, Fedena…)', status: 'pilot', blurb: 'Two-way sync of admissions, attendance and report cards.' },
  { name: 'Google / Microsoft SSO', status: 'pilot', blurb: 'Staff sign in with their school Google or Microsoft account.' },
  { name: 'Website & Instagram publishing', status: 'roadmap', blurb: 'Publish straight from Publish Guard, with the same checks.' },
]

export const STATUS_LABEL: Record<IntegrationStatus, string> = { live: 'Live', pilot: 'Pilot', roadmap: 'Roadmap' }

export interface LangRow { code: string; label: string; available: boolean }
export const LANGUAGES: LangRow[] = [
  { code: 'en', label: 'English', available: true },
  { code: 'hi', label: 'Hindi · हिंदी', available: true },
  { code: 'mr', label: 'Marathi · मराठी', available: false },
  { code: 'ta', label: 'Tamil · தமிழ்', available: false },
  { code: 'te', label: 'Telugu · తెలుగు', available: false },
  { code: 'bn', label: 'Bengali · বাংলা', available: false },
  { code: 'gu', label: 'Gujarati · ગુજરાતી', available: false },
  { code: 'kn', label: 'Kannada · ಕನ್ನಡ', available: false },
]

export const PLAN_BULLETS = [
  'Managed privacy desk with a named coordinator for your school',
  'Monthly review, evidence and a trustee-ready report',
  'Media Safe: face matching, automatic blur and Publish Guard',
  'Counsel, cyber and audit partners on standby',
  'Parent requests handled on time, every time',
]
