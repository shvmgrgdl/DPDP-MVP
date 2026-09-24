import type {
  DestinationKey, FaceInstance, Guardian, MediaAsset, MediaPurposeKey, NoticeVersion, Permission, Publication, Student, Verdict,
} from '@/data/types'
import { DEST } from '@/data/reference'
import { pkey } from '@/data/seed'

export interface EngineCtx {
  students: Student[]
  guardians: Guardian[]
  permissions: Record<string, Permission>
  notices: NoticeVersion[]
}

export type FaceState = 'ok' | 'blocked' | 'unknown'

export interface FaceEval {
  face: FaceInstance
  state: FaceState
  reason: string
  student?: Student
  permission?: Permission
}

export interface AssetEval {
  asset: MediaAsset
  verdict: Verdict
  faces: FaceEval[]
  fixable: boolean // blur makes it shareable
  reason: string
}

const studentIndex = new WeakMap<Student[], Map<string, Student>>()
export function studentById(ctx: Pick<EngineCtx, 'students'>, id: string | null | undefined) {
  if (!id) return undefined
  let m = studentIndex.get(ctx.students)
  if (!m) {
    m = new Map(ctx.students.map((s) => [s.id, s]))
    studentIndex.set(ctx.students, m)
  }
  return m.get(id)
}

export function getPermission(ctx: EngineCtx, studentId: string, purpose: MediaPurposeKey) {
  return ctx.permissions[pkey(studentId, purpose)]
}

/** Evaluate one face against a destination. Unknown faces are never guessed. */
export function evaluateFace(ctx: EngineCtx, face: FaceInstance, dest: DestinationKey, opts: { blurUnknowns?: boolean } = {}): FaceEval {
  const d = DEST[dest]
  if (face.review === 'always-blur') return { face, state: 'blocked', reason: 'Marked “always blur” by staff' }
  if (face.review === 'non-student') return { face, state: 'ok', reason: 'Marked as an adult / visitor by staff' }
  if (!face.studentId || face.review === 'unknown') {
    return { face, state: opts.blurUnknowns ? 'blocked' : 'unknown', reason: 'Not matched to any student — needs a quick check' }
  }
  const student = studentById(ctx, face.studentId)
  if (!student) return { face, state: 'unknown', reason: 'Student record not found' }
  if (student.protected && d.audience !== 'private') {
    return { face, state: 'blocked', reason: 'Protected child — never published (safeguarding flag)', student }
  }
  const p = getPermission(ctx, student.id, d.purpose)
  if (!p) return { face, state: 'blocked', reason: 'No choice recorded yet', student }
  const notice = ctx.notices.find((n) => n.id === p.noticeVersion)
  if (notice && notice.status === 'retired' && notice.material) {
    return { face, state: 'blocked', reason: `Choice given on an outdated notice (${notice.id}) — needs re-confirmation`, student, permission: p }
  }
  if (p.status === 'granted') return { face, state: 'ok', reason: 'Parent allowed this use', student, permission: p }
  if (p.status === 'pending') return { face, state: 'blocked', reason: 'Parent has not set choices yet', student, permission: p }
  if (p.status === 'withdrawn') return { face, state: 'blocked', reason: 'Parent withdrew this permission', student, permission: p }
  return { face, state: 'blocked', reason: 'Parent chose not to allow this use', student, permission: p }
}

/** Evaluate an asset for a destination → verdict + per-face reasons. */
export function evaluateAsset(ctx: EngineCtx, asset: MediaAsset, dest: DestinationKey, opts: { blurUnknowns?: boolean } = {}): AssetEval {
  const d = DEST[dest]
  const faces = asset.faces.map((f) => evaluateFace(ctx, f, dest, opts))
  const unknown = faces.filter((f) => f.state === 'unknown')
  const blocked = faces.filter((f) => f.state === 'blocked')
  if (unknown.length) {
    return { asset, verdict: 'check-faces', faces, fixable: false, reason: `${unknown.length} face${unknown.length > 1 ? 's' : ''} not recognised — check before sharing` }
  }
  if (!blocked.length) return { asset, verdict: 'ready', faces, fixable: false, reason: 'Everyone in this photo is cleared for this use' }
  const mainBlocked = blocked.some((f) => f.face.main)
  if (d.blurFixAllowed && !mainBlocked) {
    return { asset, verdict: 'needs-blur', faces, fixable: true, reason: `${blocked.length} child${blocked.length > 1 ? 'ren' : ''} will be blurred automatically` }
  }
  return {
    asset, verdict: 'keep-private', faces, fixable: false,
    reason: mainBlocked ? 'The main child in this photo is not cleared for this use' : d.note ?? 'Blurring is not allowed for this destination',
  }
}

export interface Summary { total: number; ready: number; 'needs-blur': number; 'keep-private': number; 'check-faces': number }

export function summarize(ctx: EngineCtx, assets: MediaAsset[], dest: DestinationKey, opts: { blurUnknowns?: boolean } = {}): Summary {
  const s: Summary = { total: assets.length, ready: 0, 'needs-blur': 0, 'keep-private': 0, 'check-faces': 0 }
  for (const a of assets) s[evaluateAsset(ctx, a, dest, opts).verdict]++
  return s
}

/** Evidence chain for one face decision: student → guardian → verification → choice → notice → timestamp → evidence. */
export function decisionTrace(ctx: EngineCtx, studentId: string, purpose: MediaPurposeKey) {
  const student = studentById(ctx, studentId)
  const p = getPermission(ctx, studentId, purpose)
  const guardian = p ? ctx.guardians.find((g) => g.id === p.guardianId) : undefined
  const notice = p ? ctx.notices.find((n) => n.id === p.noticeVersion) : undefined
  return { student, permission: p, guardian, notice }
}

/** Channel-safety map for thumbnails: which destinations this asset is fine for as-is. */
export function channelMap(ctx: EngineCtx, asset: MediaAsset, keys: DestinationKey[] = ['instagram', 'website', 'print', 'youtube']) {
  return keys.map((k) => ({ key: k, verdict: evaluateAsset(ctx, asset, k).verdict }))
}

/** After a permission change: live publications that now include a blocked child (school-controlled channels). */
export function affectedPublications(ctx: EngineCtx, assets: MediaAsset[], pubs: Publication[], studentId: string) {
  return pubs.filter((p) => {
    if (p.status !== 'live') return false
    const a = assets.find((x) => x.id === p.assetId)
    if (!a || !a.faces.some((f) => f.studentId === studentId)) return false
    const e = evaluateAsset(ctx, a, p.destination)
    const face = e.faces.find((f) => f.face.studentId === studentId)
    return face?.state === 'blocked' && p.variant === 'original'
  })
}

/** All assets a student appears in. */
export function assetsOfStudent(assets: MediaAsset[], studentId: string) {
  return assets.filter((a) => a.faces.some((f) => f.studentId === studentId))
}
