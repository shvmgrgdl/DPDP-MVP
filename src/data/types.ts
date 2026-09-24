// Core domain model for School DPDP OS (demo). Keep in sync with docs/FOUNDATION.md.

export type RoleKey =
  | 'chairman'
  | 'principal'
  | 'office'
  | 'marketing'
  | 'teacher'
  | 'photographer'
  | 'parent'
  | 'it'
  | 'desk'
  | 'partner'

export type Lang = 'en' | 'hi'

export interface School {
  name: string
  shortName: string
  city: string
  state: string
  board: string
  logoDataUrl?: string
  campuses: number
  privacyContact: { name: string; role: string; email: string; phone: string }
  sdfStatus: 'not-notified' | 'notified' | 'unknown-review'
  mediaCaption: string // "Demo images · licensed stock"
}

export interface Person {
  id: string
  name: string
  role: RoleKey
  title: string
  email: string
  scope?: string // e.g. class "5B" for teacher
}

export interface ClassSection {
  id: string // "5B"
  grade: string // "5"
  section: string // "B"
  label: string // "Class 5B"
  teacherId?: string
}

export interface Student {
  id: string // "STU-0421"
  admissionNo: string
  name: string
  classId: string
  gender: 'F' | 'M'
  dob: string
  guardianIds: string[]
  house: string
  photo?: string // roster headshot src (may be crop spec)
  protected?: boolean // custody / court-order / safeguarding: never publish
  hero?: boolean
}

export type VerificationMethod = 'school-records' | 'digilocker-token' | 'otp'

export interface Guardian {
  id: string
  name: string
  relation: 'Mother' | 'Father' | 'Guardian'
  phone: string // masked
  email: string
  lang: Lang
  studentIds: string[]
  verification?: { method: VerificationMethod; at: string }
  onboarded: boolean // family has completed permissions setup
}

export type LegalBasis = 'consent' | 'legitimate-use' | 'school-exemption'

export type MediaPurposeKey = 'private-gallery' | 'internal' | 'public-digital' | 'promotion' | 'paid-ads'

export interface Purpose {
  key: string
  label: string
  labelHi?: string
  example: string
  exampleHi?: string
  basis: LegalBasis
  category: 'media' | 'core' | 'safety' | 'transport' | 'edtech' | 'communication'
  defaultOn?: boolean
  note?: string
}

export interface NoticeVersion {
  id: string // "v2.1"
  publishedAt: string
  approvedBy: string
  languages: Lang[]
  material: boolean
  status: 'live' | 'draft' | 'retired'
  summary: string
}

export type PermissionStatus = 'granted' | 'denied' | 'withdrawn' | 'pending'
export type CaptureChannel = 'parent-app' | 'whatsapp-link' | 'office' | 'paper-digitised'

export interface PermissionChange {
  status: PermissionStatus
  at: string
  via: CaptureChannel
  by: string // guardian id or staff id
  noticeVersion: string
  evidenceId: string
}

export interface Permission {
  studentId: string
  purpose: MediaPurposeKey
  status: PermissionStatus
  guardianId: string
  noticeVersion: string
  via: CaptureChannel
  at: string
  evidenceId: string
  history: PermissionChange[]
}

export interface SchoolEvent {
  id: string // "annual-day"
  name: string
  date: string
  type: 'stage' | 'sports' | 'academic' | 'classroom' | 'trip'
  location: string
  photographerIds: string[]
  uploadWindow?: { from: string; to: string }
  cover?: string
  retentionUntil: string
  status: 'upcoming' | 'uploading' | 'reviewing' | 'published' | 'archived'
}

/** Normalised [x, y, w, h] in 0..1 image space. */
export type Box = [number, number, number, number]

export type FaceReview = 'auto' | 'confirmed' | 'unknown' | 'non-student' | 'always-blur'

export interface FaceInstance {
  id: string
  box: Box
  studentId: string | null
  confidence: number // match confidence 0..1 (0 for unknown)
  review: FaceReview
  main: boolean // is the main subject of the photo
}

export interface MediaAsset {
  id: string
  eventId: string
  kind: 'photo' | 'video'
  src: string
  w: number
  h: number
  capturedAt: string
  uploadedBy: string
  faces: FaceInstance[]
  duration?: number
  tracks?: VideoTrack[]
  title?: string
}

export interface VideoTrack {
  trackId: string
  studentId: string | null
  /** frames: [tSeconds, x, y, w, h] normalised */
  frames: [number, number, number, number, number][]
}

export type DestinationKey =
  | 'private-gallery'
  | 'class-whatsapp'
  | 'internal'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'print'
  | 'newspaper'
  | 'paid-ads'

export interface Destination {
  key: DestinationKey
  label: string
  short: string
  purpose: MediaPurposeKey
  blurFixAllowed: boolean
  audience: 'private' | 'internal' | 'public' | 'promotion' | 'paid'
  note?: string
}

export type Verdict = 'ready' | 'needs-blur' | 'keep-private' | 'check-faces'

export interface Publication {
  id: string
  assetId: string
  destination: DestinationKey
  variant: 'original' | 'blurred'
  at: string
  by: string
  evidenceId: string
  status: 'live' | 'takedown-requested' | 'removed'
  url?: string
}

export type RequestType = 'access' | 'correction' | 'erasure' | 'nomination' | 'grievance' | 'withdrawal' | 'photo-removal'
export type RequestStatus = 'new' | 'verifying' | 'in-progress' | 'waiting-parent' | 'resolved' | 'closed'

export interface RequestStep {
  at: string
  by: string
  text: string
  evidenceId?: string
}

export interface PrivacyRequest {
  id: string // "REQ-1042"
  type: RequestType
  guardianId: string
  studentId: string
  channel: 'parent-app' | 'privacy-centre' | 'email' | 'office'
  receivedAt: string
  dueAt: string
  targetAt: string // internal target
  ownerId: string
  status: RequestStatus
  summary: string
  steps: RequestStep[]
}

export interface Vendor {
  id: string
  name: string
  category: 'ERP' | 'Transport' | 'CCTV' | 'Photography' | 'LMS' | 'Payments' | 'Communication' | 'Productivity' | 'Biometric' | 'Website' | 'Health' | 'Assessment'
  service: string
  dataShared: string[]
  purposes: string[]
  riskTier: 'low' | 'medium' | 'high'
  contract: {
    dpa: boolean
    securityClause: boolean
    deletionClause: boolean
    breachNoticeClause: boolean
    subProcessorClause: boolean
  }
  reviewDue: string
  storageLocation: string
  access?: { token: string; expiresAt: string; scope: string; revoked?: boolean }
  status: 'active' | 'expired' | 'onboarding'
}

export type CoverageStatus = 'covered' | 'action-due' | 'decision' | 'expert-review' | 'exempt' | 'gap'

export type AreaKey =
  | 'governance'
  | 'notices'
  | 'media'
  | 'rights'
  | 'vendors'
  | 'security'
  | 'retention'
  | 'assurance'

export interface Obligation {
  id: string
  area: AreaKey
  title: string
  plain: string // plain-English explanation
  status: CoverageStatus
  ownerId: string
  evidenceIds: string[]
  legalRef: string
  dueAt?: string
  source?: string // readiness answer that created it
}

export interface Control {
  id: string
  title: string
  detail: string
  ruleRef: string
  status: 'in-place' | 'partial' | 'missing'
  ownerId: string
  evidenceIds: string[]
}

export interface IncidentStep {
  at: string
  text: string
  by: string
  kind: 'detect' | 'contain' | 'assess' | 'notify-parents' | 'notify-board' | 'report' | 'close'
}

export interface Incident {
  id: string
  title: string
  kind: 'lost-device' | 'misdirected-email' | 'unauthorised-access' | 'vendor-breach' | 'photo-leak'
  detectedAt: string
  status: 'open' | 'contained' | 'reported' | 'closed'
  affectedData: string[]
  affectedCount: number
  boardDetailedDueAt: string
  steps: IncidentStep[]
}

export interface RetentionRule {
  id: string
  category: string
  retention: string
  basis: string
  ownerId: string
  nextReview: string
  exception?: string
}

export interface Task {
  id: string
  title: string
  area: AreaKey | 'media' | 'requests'
  ownerId: string
  dueAt: string
  status: 'open' | 'done'
  link?: string
  createdAt: string
  kind?: 'takedown' | 'review' | 'contract' | 'approval' | 'deletion' | 'training' | 'general'
}

export type ExpertKind = 'privacy-review' | 'managed-desk' | 'cyber' | 'dpo' | 'audit-dpia' | 'breach-support' | 'training'

export interface ExpertRequest {
  id: string
  kind: ExpertKind
  title: string
  status: 'requested' | 'scheduled' | 'in-review' | 'report-shared' | 'closed'
  partner: string
  createdAt: string
  attachments: string[] // evidence ids
  messages: { at: string; from: string; text: string }[]
}

export interface Evidence {
  id: string // "EV-2026-0920-2041"
  at: string
  type:
    | 'permission'
    | 'notice'
    | 'publication'
    | 'blur'
    | 'review'
    | 'request'
    | 'incident'
    | 'vendor'
    | 'control'
    | 'training'
    | 'expert'
    | 'export'
    | 'readiness'
    | 'access'
    | 'retention'
  title: string
  actor: string
  refs: string[]
  payload?: Record<string, unknown>
  prevHash: string
  hash: string
}

export interface TrainingModule {
  id: string
  title: string
  minutes: number
  audience: string
  completed: number
  total: number
}

export interface Notification {
  id: string
  at: string
  text: string
  link?: string
  read: boolean
  roles: RoleKey[]
}
