import type { LucideIcon } from 'lucide-react'
import { Scale, Headphones, ShieldCheck, UserCog, ClipboardCheck, LifeBuoy, GraduationCap } from 'lucide-react'
import type { ExpertKind, ExpertRequest, Evidence } from '@/data/types'

export const KIND_ICON: Record<ExpertKind, LucideIcon> = {
  'managed-desk': Headphones,
  'privacy-review': Scale,
  cyber: ShieldCheck,
  'breach-support': LifeBuoy,
  training: GraduationCap,
  dpo: UserCog,
  'audit-dpia': ClipboardCheck,
}

/** Evidence types most relevant to each expert kind — used to preselect attachments in the request dialog. */
export const KIND_EVIDENCE: Record<ExpertKind, Evidence['type'][]> = {
  'privacy-review': ['notice', 'permission'],
  'managed-desk': ['request', 'readiness'],
  cyber: ['control', 'incident'],
  dpo: ['readiness', 'control'],
  'audit-dpia': ['readiness', 'control', 'vendor'],
  'breach-support': ['incident'],
  training: ['training'],
}

export const STATUS_STEPS: { key: ExpertRequest['status']; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in-review', label: 'In review' },
  { key: 'report-shared', label: 'Report shared' },
  { key: 'closed', label: 'Closed' },
]

export const PACKAGES = [
  {
    key: 'ready', title: 'DPDP Ready', tagline: 'The essentials, in place and evidenced.', recommended: false,
    bullets: ['Notices in English & Hindi', 'Verified parent permissions', 'Processing register & retention schedule', 'Parent requests handled on time'],
  },
  {
    key: 'ready-media', title: 'DPDP Ready + Media Safe', tagline: 'Adds automatic photo & video protection.', recommended: false,
    bullets: ['Everything in DPDP Ready', 'Face matching against the class roster', 'Automatic blur before publishing', 'Publish Guard on every channel'],
  },
  {
    key: 'managed', title: 'DPDP Managed', tagline: 'Recommended: give this to us and relax.', recommended: true,
    bullets: ['Everything in DPDP Ready + Media Safe', 'A named privacy coordinator for your school', 'Monthly review, on call for parent queries', 'Counsel, cyber and audit partners on standby'],
  },
] as const

/** Decorative only — this demo models a single school's data. */
export const OTHER_DESK_SCHOOLS = ['Riverdale Public School', "St. Xavier's Sr. Sec. School"]
