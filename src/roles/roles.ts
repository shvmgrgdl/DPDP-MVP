import type { RoleKey } from '@/data/types'

export type NavKey =
  | 'home'
  | 'readiness'
  | 'privacy'
  | 'media'
  | 'publish'
  | 'video'
  | 'requests'
  | 'trust'
  | 'evidence'
  | 'experts'
  | 'ask'
  | 'settings'
  | 'tech'

export type Ability =
  | 'approve'
  | 'publish'
  | 'upload'
  | 'review-faces'
  | 'manage-requests'
  | 'manage-vendors'
  | 'manage-incidents'
  | 'manage-settings'
  | 'view-names'
  | 'export'

export interface RoleDef {
  key: RoleKey
  label: string
  person: string // person id in seed
  blurb: string
  home: string
  nav: NavKey[]
  abilities: Ability[]
  scope?: string // class scope for teacher
  mobile?: boolean
}

export const ROLES: RoleDef[] = [
  {
    key: 'chairman', label: 'Chairman / Trustee', person: 'U-CHAIR', blurb: 'Calm overview, decisions and the trustee report',
    home: '/home', nav: ['home', 'readiness', 'media', 'requests', 'trust', 'evidence', 'experts', 'ask'],
    abilities: ['approve', 'view-names', 'export'],
  },
  {
    key: 'principal', label: 'Principal', person: 'U-PRIN', blurb: 'Runs the programme day to day, approves notices',
    home: '/home', nav: ['home', 'readiness', 'privacy', 'media', 'publish', 'requests', 'trust', 'evidence', 'experts', 'ask', 'settings'],
    abilities: ['approve', 'publish', 'upload', 'review-faces', 'manage-requests', 'manage-incidents', 'view-names', 'export', 'manage-settings'],
  },
  {
    key: 'office', label: 'School office (privacy coordinator)', person: 'U-OFFICE', blurb: 'Handles requests, vendors, retention and parents',
    home: '/home', nav: ['home', 'readiness', 'privacy', 'media', 'requests', 'trust', 'evidence', 'experts', 'ask', 'settings'],
    abilities: ['review-faces', 'manage-requests', 'manage-vendors', 'manage-incidents', 'view-names', 'export', 'upload'],
  },
  {
    key: 'marketing', label: 'Marketing & communications', person: 'U-MKT', blurb: 'Publishes only what parents have allowed',
    home: '/media', nav: ['media', 'publish', 'video', 'ask'],
    abilities: ['publish', 'upload', 'review-faces', 'view-names', 'export'],
  },
  {
    key: 'teacher', label: 'Class teacher (5B)', person: 'U-TEACH', blurb: 'Sees only Class 5B; quick “can I share this?”',
    home: '/media', nav: ['media', 'ask'], abilities: ['upload', 'view-names'], scope: '5B',
  },
  {
    key: 'photographer', label: 'Photographer (guest access)', person: 'U-PHOTO', blurb: 'Upload-only, time-bound, never sees names',
    home: '/media/upload-portal', nav: [], abilities: ['upload'],
  },
  {
    key: 'parent', label: 'Parent', person: 'G-HERO-KABIR', blurb: 'Mobile app: choices, private photos, requests',
    home: '/parent', nav: [], abilities: [], mobile: true,
  },
  {
    key: 'it', label: 'IT head', person: 'U-IT', blurb: 'Security, access, vendors and how it all works',
    home: '/tech', nav: ['tech', 'trust', 'evidence', 'settings', 'ask'],
    abilities: ['manage-vendors', 'manage-incidents', 'manage-settings', 'export'],
  },
  {
    key: 'desk', label: 'Privacy desk (our team)', person: 'U-DESK', blurb: 'Managed service view across your school',
    home: '/experts/desk', nav: ['home', 'requests', 'trust', 'evidence', 'experts', 'ask'],
    abilities: ['manage-requests', 'manage-vendors', 'manage-incidents', 'view-names', 'export'],
  },
  {
    key: 'partner', label: 'Expert partner', person: 'U-PARTNER', blurb: 'Sees only assigned reviews and their evidence',
    home: '/experts/partner', nav: [], abilities: [],
  },
]

export const ROLE = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<RoleKey, RoleDef>

export const NAV_META: Record<NavKey, { label: string; path: string }> = {
  home: { label: 'Home', path: '/home' },
  readiness: { label: 'Readiness', path: '/readiness' },
  privacy: { label: 'Privacy Hub', path: '/privacy' },
  media: { label: 'Media Safe', path: '/media' },
  publish: { label: 'Publish Guard', path: '/publish' },
  video: { label: 'Video Studio', path: '/video' },
  requests: { label: 'Requests', path: '/requests' },
  trust: { label: 'Trust Centre', path: '/trust' },
  evidence: { label: 'Evidence', path: '/evidence' },
  experts: { label: 'Experts', path: '/experts' },
  ask: { label: 'Ask', path: '/ask' },
  settings: { label: 'Settings', path: '/settings' },
  tech: { label: 'Under the hood', path: '/tech' },
}
