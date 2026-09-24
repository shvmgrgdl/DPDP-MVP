import * as React from 'react'
import { useSearchParams } from 'react-router'
import type {
  CaptureChannel, DestinationKey, FaceInstance, MediaAsset, MediaPurposeKey, PermissionStatus, RoleKey, SchoolEvent, Student, VerificationMethod,
} from '@/data/types'
import type { Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import { useRoleDef } from '@/store/hooks'
import { ROLE } from '@/roles/roles'
import { DEMO_NOW } from '@/lib/utils'

/* ---------- destinations offered in Media Safe ---------- */
export const DEST_KEYS = ['instagram', 'website', 'print', 'private-gallery'] as const satisfies readonly DestinationKey[]
export type MediaDest = (typeof DEST_KEYS)[number]
export const DEST_LABEL: Record<MediaDest, string> = { instagram: 'Instagram', website: 'Website', print: 'Print', 'private-gallery': 'Parents gallery' }
const isDest = (v: string | null): v is MediaDest => !!v && (DEST_KEYS as readonly string[]).includes(v)

/** Destination lives in the URL (?dest=) so it survives gallery → proof card → back. */
export function useDest(): [MediaDest, (d: MediaDest) => void] {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('dest')
  const dest: MediaDest = isDest(raw) ? raw : 'instagram'
  const set = React.useCallback(
    (d: MediaDest) => setSp((p) => { const n = new URLSearchParams(p); n.set('dest', d); return n }, { replace: true }),
    [setSp],
  )
  return [dest, set]
}

/* ---------- role scope (teacher = one class) ---------- */
export const useScope = () => useRoleDef().scope

/** All assets the current role may see. Teacher: only photos that include a child from their class. */
export function useScopedAssets() {
  const scope = useScope()
  const assets = useApp((s) => s.assets)
  const students = useApp((s) => s.students)
  return React.useMemo(() => {
    if (!scope) return assets
    const ids = new Set(students.filter((s) => s.classId === scope).map((s) => s.id))
    return assets.filter((a) => a.faces.some((f) => f.studentId && ids.has(f.studentId)))
  }, [assets, students, scope])
}

export function useClassLabel() {
  const classes = useApp((s) => s.classes)
  return React.useCallback((id: string) => classes.find((c) => c.id === id)?.label ?? id, [classes])
}

/* ---------- vocabulary ---------- */
export const PURPOSE_SHORT: Record<MediaPurposeKey, string> = {
  'private-gallery': 'Parents’ gallery',
  internal: 'Inside school',
  'public-digital': 'Website & social',
  promotion: 'Brochures & press',
  'paid-ads': 'Paid ads',
}
export const STATUS_WORD: Record<PermissionStatus, string> = { granted: 'Allowed', denied: 'Not allowed', withdrawn: 'Withdrawn', pending: 'Not set yet' }
export const STATUS_TONE: Record<PermissionStatus, Tone> = { granted: 'ok', denied: 'risk', withdrawn: 'warn', pending: 'muted' }
export const VERIFY_LABEL: Record<VerificationMethod, string> = {
  'school-records': 'School admission records',
  otp: 'One-time code on registered phone',
  'digilocker-token': 'DigiLocker',
}
export const CHANNEL_LABEL: Record<CaptureChannel, string> = {
  'parent-app': 'Parent app', 'whatsapp-link': 'WhatsApp link', office: 'School office', 'paper-digitised': 'Paper form (digitised)',
}
export const EVENT_STATUS: Record<SchoolEvent['status'], string> = {
  upcoming: 'Upcoming', uploading: 'Uploading', reviewing: 'Reviewing', published: 'Shared', archived: 'Archived',
}
export const PUB_STATUS: Record<'live' | 'takedown-requested' | 'removed', { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'ok' }, 'takedown-requested': { label: 'Takedown requested', tone: 'warn' }, removed: { label: 'Removed', tone: 'muted' },
}

/* ---------- helpers ---------- */
/** Faces nobody has identified yet (adults / always-blur are already decided). */
export const isUnknownFace = (f: FaceInstance) => f.review !== 'non-student' && f.review !== 'always-blur' && (!f.studentId || f.review === 'unknown')

export const byId = (a: MediaAsset, b: MediaAsset) => a.id.localeCompare(b.id, 'en', { numeric: true })
export const firstName = (n: string) => n.split(' ')[0]
export const actorOf = (role: RoleKey) => ROLE[role].person || role
/** Display title: drops a leading "Event · " prefix (the event is shown alongside) and capitalises. */
export function photoLabel(a: MediaAsset, idx?: number) {
  const t = a.title?.includes(' · ') ? a.title.slice(a.title.indexOf(' · ') + 3) : a.title
  if (t) return t.charAt(0).toUpperCase() + t.slice(1)
  return idx !== undefined && idx >= 0 ? `Photo ${idx + 1}` : a.id
}

export const MONTH_START_MS = new Date(`${DEMO_NOW.slice(0, 7)}-01T00:00:00+05:30`).getTime()
export const MONTH_LABEL = new Date(DEMO_NOW).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

/** Name search: prefix > word prefix > contains; heroes and Class 5B float up. */
export function searchStudents(students: Student[], q: string, scope?: string, limit = 8) {
  const t = q.trim().toLowerCase()
  if (!t) return []
  const out: { s: Student; score: number }[] = []
  for (const s of students) {
    if (scope && s.classId !== scope) continue
    const n = s.name.toLowerCase()
    const base = n.startsWith(t) ? 0 : n.split(' ').some((w) => w.startsWith(t)) ? 1 : n.includes(t) ? 2 : s.id.toLowerCase() === t ? 3 : -1
    if (base < 0) continue
    out.push({ s, score: base * 4 - (s.hero ? 2 : 0) - (s.classId === '5B' ? 1 : 0) })
  }
  return out.sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name)).slice(0, limit).map((x) => x.s)
}
