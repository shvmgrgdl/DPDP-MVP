import type { Box } from '@/data/types'
import type { Frame } from './types'

/** Seconds a blur is held before a face's first and after its last sighting (privacy-first: blur a little early, release a little late). */
export const HOLD = 0.22

export interface Segment { start: number; end: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const boxOf = (f: Frame): Box => [f[1], f[2], f[3], f[4]]

/** Median time between sightings. */
export function medianStep(frames: Frame[]) {
  if (frames.length < 2) return 0.2
  const d: number[] = []
  for (let i = 1; i < frames.length; i++) d.push(frames[i][0] - frames[i - 1][0])
  d.sort((a, b) => a - b)
  return d[d.length >> 1] || 0.2
}

/** Largest gap still bridged by interpolation; beyond it the face is treated as off screen. */
export function gapFor(frames: Frame[]) {
  return Math.min(2.5, Math.max(0.75, medianStep(frames) * 2.6))
}

/** Face box at time t, interpolated between sightings. null = not on screen. */
export function boxAt(frames: Frame[], t: number, maxGap: number, hold = HOLD): Box | null {
  const n = frames.length
  if (!n) return null
  const first = frames[0]
  const last = frames[n - 1]
  if (t < first[0] - hold || t > last[0] + hold) return null
  if (t <= first[0]) return boxOf(first)
  if (t >= last[0]) return boxOf(last)
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (frames[mid][0] <= t) lo = mid
    else hi = mid
  }
  const a = frames[lo]
  const b = frames[hi]
  const dt = b[0] - a[0]
  if (dt > maxGap) {
    if (t - a[0] <= hold) return boxOf(a)
    if (b[0] - t <= hold) return boxOf(b)
    return null
  }
  const k = dt > 0 ? (t - a[0]) / dt : 0
  return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerp(a[4], b[4], k)]
}

/** On-screen spans of a track (for the timeline), including the blur hold at each end. */
export function segmentsOf(frames: Frame[], maxGap: number, duration: number, hold = HOLD): Segment[] {
  if (!frames.length) return []
  const out: Segment[] = []
  let s = frames[0][0]
  let e = s
  for (let i = 1; i < frames.length; i++) {
    const t = frames[i][0]
    if (t - e > maxGap) {
      out.push({ start: s, end: e })
      s = t
    }
    e = t
  }
  out.push({ start: s, end: e })
  const d = duration > 0 ? duration : Infinity
  return out.map((g) => ({ start: Math.max(0, g.start - hold), end: Math.min(d, g.end + hold) }))
}

/** The sighting that makes the best thumbnail: large, not cut by the frame edge, away from the track ends. */
export function bestFrame(frames: Frame[]): Frame | null {
  if (!frames.length) return null
  const t0 = frames[0][0]
  const t1 = frames[frames.length - 1][0]
  let best: Frame = frames[0]
  let bestScore = -1
  for (const f of frames) {
    const edge = f[1] < 0.01 || f[2] < 0.01 || f[1] + f[3] > 0.99 || f[2] + f[4] > 0.99
    const mid = t1 > t0 ? 1 - Math.abs((f[0] - t0) / (t1 - t0) - 0.5) : 1
    const score = f[3] * f[4] * (edge ? 0.4 : 1) * (0.6 + 0.4 * mid)
    if (score > bestScore) { bestScore = score; best = f }
  }
  return best
}

/* ------------------------------------------------------------------ */
/* Simple IoU tracker for live detection                                */
/* ------------------------------------------------------------------ */

export interface Detection { box: Box; score: number; descriptor?: Float32Array }

export interface TrackState {
  id: string
  frames: Frame[]
  last: Box
  lastT: number
  vx: number
  vy: number
  hits: number
  maxScore: number
  closed: boolean
  attempts: number
  votes: Map<string, { n: number; best: number }>
  personId: string | null
  distance: number | null
  idFinal: boolean
  descriptors: Float32Array[]
  thumb?: string
  thumbArea: number
}

export function iou(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]))
  const iy = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]))
  const inter = ix * iy
  const u = a[2] * a[3] + b[2] * b[3] - inter
  return u > 0 ? inter / u : 0
}

const centre = (b: Box) => [b[0] + b[2] / 2, b[1] + b[3] / 2] as const
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const r4 = (v: number) => Math.round(v * 10000) / 10000
const r3 = (v: number) => Math.round(v * 1000) / 1000

function euclid(a: ArrayLike<number>, b: ArrayLike<number>) {
  let s = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) { const d = a[i] - b[i]; s += d * d }
  return Math.sqrt(s)
}
function meanDescriptor(list: Float32Array[]) {
  if (!list.length) return null
  const m = new Float32Array(list[0].length)
  for (const d of list) for (let i = 0; i < m.length; i++) m[i] += d[i] / list.length
  return m
}

/** Greedy IoU matching with constant-velocity prediction; a centre-distance fallback catches fast movers. */
export class IouTracker {
  tracks: TrackState[] = []
  private seq = 0

  constructor(private maxAge = 1.25) {}

  private predict(tr: TrackState, dt: number): Box {
    const k = Math.min(dt, 0.6)
    return [clamp01(tr.last[0] + tr.vx * k), clamp01(tr.last[1] + tr.vy * k), tr.last[2], tr.last[3]]
  }

  update(t: number, dets: Detection[]) {
    for (const tr of this.tracks) if (!tr.closed && t - tr.lastT > this.maxAge) tr.closed = true
    const active = this.tracks.filter((tr) => !tr.closed)
    const pairs: { ti: number; di: number; s: number }[] = []
    active.forEach((tr, ti) => {
      const p = this.predict(tr, t - tr.lastT)
      dets.forEach((d, di) => {
        const o = Math.max(iou(p, d.box), iou(tr.last, d.box))
        if (o >= 0.12) { pairs.push({ ti, di, s: o }); return }
        const [px, py] = centre(p)
        const [dx, dy] = centre(d.box)
        const size = Math.max(p[2], p[3], d.box[2], d.box[3])
        const dist = Math.hypot(px - dx, py - dy) / size
        const ratio = (d.box[2] * d.box[3]) / Math.max(1e-6, p[2] * p[3])
        if (dist < 0.9 && ratio > 0.4 && ratio < 2.5) pairs.push({ ti, di, s: 0.1 * (1 - dist / 0.9) })
      })
    })
    pairs.sort((a, b) => b.s - a.s)
    const usedT = new Set<number>()
    const usedD = new Set<number>()
    const out: { track: TrackState; det: Detection; born: boolean }[] = []
    for (const p of pairs) {
      if (usedT.has(p.ti) || usedD.has(p.di)) continue
      usedT.add(p.ti)
      usedD.add(p.di)
      const tr = active[p.ti]
      this.extend(tr, t, dets[p.di])
      out.push({ track: tr, det: dets[p.di], born: false })
    }
    dets.forEach((d, di) => {
      if (usedD.has(di)) return
      const tr: TrackState = {
        id: `live-${++this.seq}`, frames: [], last: d.box, lastT: t, vx: 0, vy: 0, hits: 0, maxScore: 0, closed: false,
        attempts: 0, votes: new Map(), personId: null, distance: null, idFinal: false, descriptors: [], thumbArea: 0,
      }
      this.extend(tr, t, d)
      this.tracks.push(tr)
      out.push({ track: tr, det: d, born: true })
    })
    return out
  }

  private extend(tr: TrackState, t: number, d: Detection) {
    const dt = t - tr.lastT
    if (tr.hits > 0 && dt > 0) {
      const [x0, y0] = centre(tr.last)
      const [x1, y1] = centre(d.box)
      const vx = (x1 - x0) / dt
      const vy = (y1 - y0) / dt
      tr.vx = tr.hits > 1 ? tr.vx * 0.5 + vx * 0.5 : vx
      tr.vy = tr.hits > 1 ? tr.vy * 0.5 + vy * 0.5 : vy
    }
    tr.frames.push([r3(t), r4(d.box[0]), r4(d.box[1]), r4(d.box[2]), r4(d.box[3])])
    tr.last = d.box
    tr.lastT = t
    tr.hits++
    tr.maxScore = Math.max(tr.maxScore, d.score)
    if (d.descriptor && tr.descriptors.length < 6) tr.descriptors.push(d.descriptor)
  }

  /** Does this open track still need a face-matcher look? (Tiny faces are skipped: they stay "Unknown" and blurred.) */
  needsIdentity(tr: TrackState, frameW: number, frameH: number) {
    return !tr.closed && !tr.idFinal && tr.last[2] * frameW >= 28 && tr.last[3] * frameH >= 28
  }

  vote(tr: TrackState, match: { personId: string; distance: number } | null) {
    tr.attempts++
    if (match) {
      const v = tr.votes.get(match.personId) ?? { n: 0, best: 1 }
      v.n++
      v.best = Math.min(v.best, match.distance)
      tr.votes.set(match.personId, v)
    }
    let top: [string, { n: number; best: number }] | null = null
    for (const e of tr.votes) if (!top || e[1].n > top[1].n || (e[1].n === top[1].n && e[1].best < top[1].best)) top = e
    if (top && (top[1].n >= 2 || top[1].best < 0.42)) {
      tr.personId = top[0]
      tr.distance = top[1].best
      if (top[1].n >= 2) tr.idFinal = true
    }
    if (tr.attempts >= 3) tr.idFinal = true
  }

  /** Tracks worth showing: seen twice, or once with a confident detection. */
  visible() {
    return this.tracks.filter((tr) => tr.hits >= 2 || tr.maxScore >= 0.75)
  }

  /** End of scan: drop one-off blips, give each person one lane, never the same person twice at once. */
  finalize() {
    const list = this.visible().sort((a, b) => a.frames[0][0] - b.frames[0][0])
    // the same person matched in two overlapping tracks: keep the closer match
    for (const a of list) for (const b of list) {
      if (a === b || !a.personId || a.personId !== b.personId || !overlaps(a, b)) continue
      const loser = (a.distance ?? 1) <= (b.distance ?? 1) ? b : a
      loser.personId = null
      loser.distance = null
    }
    const merged: TrackState[] = []
    for (const tr of list) {
      const target = merged.find((m) => !overlaps(m, tr) && samePerson(m, tr))
      if (target) {
        target.frames = [...target.frames, ...tr.frames].sort((x, y) => x[0] - y[0])
        target.hits += tr.hits
        target.maxScore = Math.max(target.maxScore, tr.maxScore)
        target.descriptors = [...target.descriptors, ...tr.descriptors].slice(0, 12)
        if (tr.thumbArea > target.thumbArea) { target.thumb = tr.thumb; target.thumbArea = tr.thumbArea }
      } else merged.push(tr)
    }
    return merged
  }
}

function overlaps(a: TrackState, b: TrackState) {
  const a0 = a.frames[0][0], a1 = a.frames[a.frames.length - 1][0]
  const b0 = b.frames[0][0], b1 = b.frames[b.frames.length - 1][0]
  return a0 <= b1 + 0.05 && b0 <= a1 + 0.05
}

function samePerson(a: TrackState, b: TrackState) {
  if (a.personId || b.personId) return !!a.personId && a.personId === b.personId
  const da = meanDescriptor(a.descriptors)
  const db = meanDescriptor(b.descriptors)
  return !!da && !!db && euclid(da, db) < 0.42
}
