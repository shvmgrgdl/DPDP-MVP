import type { FaceInstance } from '@/data/types'
import { evaluateFace, studentById, type EngineCtx, type FaceEval } from '@/engine/permission'
import { gapFor, segmentsOf, type Segment } from './tracks'
import type { DestChoice, Frame, SourceTrack } from './types'

export type LaneTone = 'ok' | 'blocked' | 'unknown'

export interface Lane {
  id: string
  name: string
  shortName: string
  studentId: string | null
  tone: LaneTone
  /** Short status, e.g. "Not allowed on Instagram". */
  reason: string
  /** Longer explanation for the tooltip. */
  detail: string
  blur: boolean
  auto: boolean
  locked: boolean
  overridden: boolean
  /** Safeguarding flag: never shown outside the private parents gallery. */
  protectedChild: boolean
  frames: Frame[]
  gap: number
  segments: Segment[]
  firstT: number
  thumb?: string
}

export const DEST_CHOICES: { key: DestChoice; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'website', label: 'Website' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'private-gallery', label: 'Parents gallery' },
]
export const DEST_PHRASE: Record<DestChoice, string> = {
  instagram: 'on Instagram', website: 'on the website', youtube: 'on YouTube', 'private-gallery': 'in the parents gallery',
}
export const destLabel = (d: DestChoice) => DEST_CHOICES.find((x) => x.key === d)?.label ?? d
/** Short form for lane labels. */
const DEST_SHORT: Record<DestChoice, string> = { instagram: 'on Instagram', website: 'on the website', youtube: 'on YouTube', 'private-gallery': 'in the gallery' }

function reasonFor(ev: FaceEval, face: FaceInstance, dest: DestChoice) {
  const where = DEST_PHRASE[dest]
  const short = DEST_SHORT[dest]
  if (ev.state === 'ok') {
    if (face.review === 'non-student') return { reason: 'Adult or visitor', detail: 'Marked as an adult or visitor by staff, so no parent permission is needed.' }
    return { reason: `Allowed ${short}`, detail: `Parent allowed this use ${where}.` }
  }
  if (ev.state === 'unknown') return { reason: 'Not recognised', detail: 'We never guess who a face is. Blur it, or confirm who it is in Media Safe.' }
  if (face.review === 'always-blur') return { reason: 'Always blurred', detail: 'Staff marked this face “always blur”.' }
  if (ev.student?.protected) return { reason: 'Protected child', detail: 'Safeguarding flag: this child is never shown outside the private parents gallery.' }
  if (!ev.permission) return { reason: 'No choice recorded yet', detail: 'No parent choice is on record for this use, so the face stays hidden.' }
  if (ev.reason.startsWith('Choice given on an outdated notice')) return { reason: 'Needs re-confirmation', detail: ev.reason }
  if (ev.permission.status === 'pending') return { reason: 'Choices pending', detail: 'The family hasn’t set their choices yet, so the face stays hidden until they do.' }
  if (ev.permission.status === 'withdrawn') return { reason: 'Permission withdrawn', detail: `The parent withdrew permission for use ${where}.` }
  return { reason: `Not allowed ${short}`, detail: `The parent chose not to allow use ${where}.` }
}

const plainReview = (t: SourceTrack) => !t.face || t.face.review === 'auto' || t.face.review === 'confirmed'

/** Re-entries of the same student become one lane. Never merged when they overlap in time (two faces at once must stay two tracks). */
export function mergeSameStudent(tracks: SourceTrack[]): SourceTrack[] {
  const out: SourceTrack[] = []
  for (const tr of [...tracks].filter((t) => t.frames.length).sort((a, b) => a.frames[0][0] - b.frames[0][0])) {
    const target = tr.studentId && plainReview(tr)
      ? out.find((o) => o.studentId === tr.studentId && plainReview(o) && o.frames[o.frames.length - 1][0] < tr.frames[0][0] - 0.05)
      : undefined
    if (target) {
      target.frames = [...target.frames, ...tr.frames]
      target.thumb = target.thumb ?? tr.thumb
    } else out.push({ ...tr, frames: [...tr.frames] })
  }
  return out
}

/**
 * One lane per face track, evaluated against parents' choices for the chosen destination.
 * Faces without permission are always blurred (locked). Unrecognised faces follow "Blur everyone without permission".
 * Allowed faces can be blurred by hand.
 */
export function buildLanes(
  ctx: EngineCtx, tracks: SourceTrack[], dest: DestChoice, blurEveryone: boolean, overrides: Record<string, boolean>,
  canNames: boolean, duration: number, thumbs: Record<string, string> | undefined,
): Lane[] {
  let childN = 0
  return mergeSameStudent(tracks)
    .map((tr) => {
      const f0 = tr.frames[0]
      const face: FaceInstance = tr.face ?? {
        id: tr.id, box: [f0[1], f0[2], f0[3], f0[4]], studentId: tr.studentId,
        confidence: tr.studentId ? 0.9 : 0, review: tr.studentId ? 'auto' : 'unknown', main: false,
      }
      const ev = evaluateFace(ctx, face, dest)
      const student = ev.student ?? studentById(ctx, face.studentId)
      const { reason, detail } = reasonFor(ev, face, dest)
      const tone: LaneTone = ev.state
      const auto = tone === 'blocked' ? true : tone === 'unknown' ? blurEveryone : false
      const locked = tone === 'blocked'
      const ov = overrides[tr.id]
      const blur = locked ? true : ov ?? auto
      let name = 'Unknown'
      let shortName = 'Unknown'
      if (face.review === 'non-student') { name = 'Adult or visitor'; shortName = 'Adult' }
      else if (student) {
        if (canNames) { name = student.name; shortName = student.name.split(' ')[0] }
        else { childN++; name = `Child ${childN}`; shortName = name }
      }
      const gap = gapFor(tr.frames)
      return {
        id: tr.id, name, shortName, studentId: student?.id ?? null, tone, reason, detail, blur, auto, locked,
        overridden: !locked && ov !== undefined && ov !== auto, protectedChild: tone === 'blocked' && !!student?.protected && face.review !== 'always-blur',
        frames: tr.frames, gap,
        segments: segmentsOf(tr.frames, gap, duration), firstT: tr.frames[0][0], thumb: tr.thumb ?? thumbs?.[tr.id],
      }
    })
    .sort((a, b) => a.firstT - b.firstT)
}

/** Union of on-screen spans for the lanes that get blurred (drawn under the scrub bar). */
export function blurredSpans(lanes: Lane[]): Segment[] {
  const all = lanes.filter((l) => l.blur).flatMap((l) => l.segments).sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  for (const s of all) {
    const last = out[out.length - 1]
    if (last && s.start <= last.end + 0.05) last.end = Math.max(last.end, s.end)
    else out.push({ ...s })
  }
  return out
}
