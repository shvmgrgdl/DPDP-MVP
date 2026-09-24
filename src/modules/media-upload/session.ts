/**
 * Upload sessions for Media X-Ray (staff) and the photographer portal.
 * A session lives outside React, so processing continues when the user navigates away and the
 * results are still there when they come back. Each photo runs: read → faces → matching →
 * permissions → evidence. Minimum step durations keep the animation calm and readable.
 */
import { create } from 'zustand'
import { toast } from 'sonner'
import type { Box, MediaAsset, Verdict } from '@/data/types'
import { evaluateAsset, type FaceState } from '@/engine/permission'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { detectFaces, downscaleImage, fingerprint, getBackend, loadModels, matchConfidence, matchFaces, personToStudent, MATCH_THRESHOLD } from '@/media/face'

export type Mode = 'staff' | 'portal'
export type Phase = 'queued' | 'reading' | 'faces' | 'matching' | 'permissions' | 'evidence' | 'done' | 'error'
export const PHASES: Phase[] = ['queued', 'reading', 'faces', 'matching', 'permissions', 'evidence', 'done']
export const phaseIndex = (p: Phase) => (p === 'error' ? -1 : PHASES.indexOf(p))

export interface XFace {
  id: string
  box: Box
  score: number
  personId: string | null
  studentId: string | null
  distance: number | null
  confidence: number
  main: boolean
  crop?: string
  state?: FaceState
  reason?: string
}

export interface XItem {
  key: string
  name: string
  eventId: string
  phase: Phase
  src?: string
  w: number
  h: number
  faces: XFace[]
  /** detection finished (faces may be empty) */
  detected?: boolean
  /** match results have landed (rings switch from "found" to named / unknown) */
  matched?: boolean
  assetId?: string
  verdict?: Verdict
  reason?: string
  evidenceId?: string
  fingerprint?: string
  error?: string
  engineError?: boolean
  ms?: number
}

export interface SessionState {
  items: XItem[]
  running: boolean
  focusKey: string | null
  add: (files: File[], eventId: string) => number
  clear: (eventId: string) => void
  focus: (key: string | null) => void
  retry: () => void
  /** Stop photos that have not started yet (e.g. the upload link was closed). */
  cancelQueued: (reason: string) => void
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i
export const isImageFile = (f: File) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let seq = 0

/** Square face crop for chips (small JPEG data URL). */
function cropFace(canvas: HTMLCanvasElement, box: Box, size = 72) {
  try {
    const [x, y, w, h] = box
    const cx = (x + w / 2) * canvas.width
    const cy = (y + h / 2) * canvas.height
    const side = Math.max(w * canvas.width, h * canvas.height) * 1.45
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const g = c.getContext('2d')
    if (!g) return undefined
    g.fillStyle = '#e7e4dc'
    g.fillRect(0, 0, size, size)
    g.drawImage(canvas, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size)
    return c.toDataURL('image/jpeg', 0.82)
  } catch {
    return undefined
  }
}

function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (/readable image|decode|load image/i.test(msg)) return 'This file could not be opened as a photo. JPG or PNG works best.'
  return 'Something went wrong while checking this photo.'
}

function makeSession(mode: Mode) {
  const files = new Map<string, File>()
  const previews = new Map<string, string>()

  const useSession = create<SessionState>((set, get) => ({
    items: [],
    running: false,
    focusKey: null,
    add: (list, eventId) => {
      const accepted = list.filter(isImageFile)
      const now = Date.now().toString(36)
      const items: XItem[] = accepted.map((f) => {
        const key = `${now}-${seq++}`
        files.set(key, f)
        const url = URL.createObjectURL(f)
        previews.set(key, url)
        return { key, name: f.name, eventId, phase: 'queued', src: url, w: 0, h: 0, faces: [] }
      })
      if (items.length) {
        set({ items: [...get().items, ...items] })
        void pump()
      }
      return items.length
    },
    clear: (eventId) => {
      const keep = get().items.filter((i) => i.eventId !== eventId || !['done', 'error', 'queued'].includes(i.phase))
      for (const i of get().items) if (!keep.includes(i)) release(i.key)
      set({ items: keep, focusKey: null })
    },
    focus: (key) => set({ focusKey: key }),
    cancelQueued: (reason) => {
      if (!get().items.some((i) => i.phase === 'queued')) return
      set({ items: get().items.map((i) => (i.phase === 'queued' ? { ...i, phase: 'error', error: reason } : i)) })
    },
    retry: () => {
      set({ items: get().items.map((i) => (i.phase === 'error' && files.has(i.key) ? { ...i, phase: 'queued', error: undefined, engineError: undefined } : i)) })
      void pump()
    },
  }))

  const patch = (key: string, p: Partial<XItem>) =>
    useSession.setState((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, ...p } : i)) }))

  function release(key: string) {
    const url = previews.get(key)
    if (url) URL.revokeObjectURL(url)
    previews.delete(key)
    files.delete(key)
  }

  let batch = { photos: 0, faces: 0, matched: 0, unknown: 0, eventId: '' }

  async function pump() {
    if (useSession.getState().running) return
    useSession.setState({ running: true })
    batch = { photos: 0, faces: 0, matched: 0, unknown: 0, eventId: '' }
    try {
      for (;;) {
        const next = useSession.getState().items.find((i) => i.phase === 'queued')
        if (!next) break
        const ok = await processItem(next)
        if (!ok) break
      }
    } finally {
      useSession.setState({ running: false })
    }
    if (batch.photos) onBatchDone()
  }

  function onBatchDone() {
    const app = useApp.getState()
    const ev = app.events.find((e) => e.id === batch.eventId)
    const photos = `${batch.photos} photo${batch.photos === 1 ? '' : 's'}`
    const check = batch.unknown ? `${batch.unknown} face${batch.unknown === 1 ? '' : 's'} need${batch.unknown === 1 ? 's' : ''} a quick check` : 'no faces need a check'
    if (mode === 'portal') {
      app.notify({ text: `SnapStory Photography uploaded ${photos} to ${ev?.name ?? 'an event'} — ${check}`, link: '/media/review', roles: ['marketing', 'principal', 'office'] })
      toast.success(`${photos} uploaded`, { description: 'The school has them now. Thank you.' })
    } else {
      toast.success(`${photos} checked`, { description: `${batch.faces} faces · ${batch.matched} matched · ${check}` })
    }
  }

  /** Returns false when the face engine cannot run (stops the queue). */
  async function processItem(item: XItem): Promise<boolean> {
    const file = files.get(item.key)
    if (!file) {
      patch(item.key, { phase: 'error', error: 'This file is no longer available. Please add it again.' })
      return true
    }
    const t0 = performance.now()
    const queued = useSession.getState().items.filter((i) => i.phase === 'queued').length
    const k = mode === 'portal' ? 0.45 : queued > 5 ? 0.55 : 1 // calmer pacing for small batches
    const pace = (ms: number) => sleep(ms * k)
    const app = () => useApp.getState()
    const eventName = app().events.find((e) => e.id === item.eventId)?.name ?? item.eventId

    try {
      patch(item.key, { phase: 'reading' })
      const [img, fp] = await Promise.all([downscaleImage(file, 1600), fingerprint(file)])
      const url = previews.get(item.key)
      patch(item.key, { src: img.dataUrl, w: img.w, h: img.h, fingerprint: fp })
      if (url) { URL.revokeObjectURL(url); previews.delete(item.key) }

      // 1 · faces
      patch(item.key, { phase: 'faces' })
      const minStep = pace(900)
      try {
        await loadModels()
      } catch {
        const err = 'The face engine could not start in this browser, so this photo was not added.'
        useSession.setState((s) => ({ items: s.items.map((i) => (i.key === item.key || i.phase === 'queued' ? { ...i, phase: 'error', error: err, engineError: true } : i)) }))
        return false
      }
      const detected = await detectFaces(img.canvas, { minConfidence: 0.35, descriptors: true })
      const faces: XFace[] = detected.map((d, i) => ({
        id: `f${i}`, box: d.box, score: d.score, personId: null, studentId: null, distance: null, confidence: 0, main: i === 0, crop: cropFace(img.canvas, d.box),
      }))
      patch(item.key, { faces, detected: true })
      await minStep
      await pace(500 + Math.min(faces.length, 12) * 80)

      // 2 · matching (private; the portal never shows the result)
      patch(item.key, { phase: 'matching' })
      const [matches] = await Promise.all([matchFaces(detected.map((d) => d.descriptor)), pace(faces.length ? 450 : 250)])
      const matched = faces.map((f, i) => {
        const m = matches[i]
        const studentId = m ? personToStudent(m.personId) : null
        return { ...f, personId: m?.personId ?? null, distance: m?.distance ?? null, studentId, confidence: studentId && m ? Math.round(matchConfidence(m.distance) * 100) / 100 : 0 }
      })
      patch(item.key, { faces: matched, matched: true })
      await pace(faces.length ? 500 + Math.min(faces.length, 12) * 70 : 250)

      // 3 · permissions (Instagram as the reference channel)
      patch(item.key, { phase: 'permissions' })
      await pace(450)
      const role = app().role
      const assetId = `${item.eventId}-up-${Date.now().toString(36)}${Math.floor(Math.random() * 36 ** 2).toString(36)}`
      const asset: MediaAsset = {
        id: assetId,
        eventId: item.eventId,
        kind: 'photo',
        src: img.dataUrl,
        w: img.w,
        h: img.h,
        capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
        uploadedBy: mode === 'portal' ? 'U-PHOTO' : ROLE[role].person || 'U-MKT',
        title: file.name.replace(/\.[^.]+$/, ''),
        faces: matched.map((f, i) => ({
          id: `${assetId}-f${i}`, box: f.box, studentId: f.studentId, confidence: f.confidence, review: f.studentId ? 'auto' : 'unknown', main: f.main,
        })),
      }
      const ev = evaluateAsset(app(), asset, 'instagram')
      patch(item.key, {
        faces: matched.map((f, i) => ({ ...f, state: ev.faces[i]?.state, reason: ev.faces[i]?.reason })),
        verdict: ev.verdict, reason: ev.reason, assetId,
      })
      await pace(700)

      // 4 · evidence
      patch(item.key, { phase: 'evidence' })
      await pace(350)
      const nMatched = matched.filter((f) => f.studentId).length
      const nUnknown = matched.length - nMatched
      useApp.setState((s) => ({ assets: [...s.assets, asset] }))
      const payload = {
        event: item.eventId, file: file.name, fingerprint: fp || undefined, faces: matched.length, matched: nMatched, unknown: nUnknown,
        instagram: ev.verdict, engine: getBackend(), threshold: MATCH_THRESHOLD,
      }
      const evidenceId = mode === 'portal'
        ? app().addEvidence({
            type: 'access', actor: 'U-PHOTO', refs: [assetId, item.eventId, 'VEN-05'], payload,
            title: `SnapStory Photography uploaded ${file.name} to ${eventName} via guest link (${matched.length} face${matched.length === 1 ? '' : 's'} detected)`,
          })
        : app().addEvidence({
            type: 'review', actor: ROLE[role].person || role, refs: [assetId, item.eventId], payload,
            title: `Photo checked on upload: ${file.name} → ${eventName} (${matched.length} face${matched.length === 1 ? '' : 's'}, ${nMatched} matched, ${nUnknown} to check)`,
          })
      patch(item.key, { evidenceId })
      await pace(550)
      patch(item.key, { phase: 'done', ms: Math.round(performance.now() - t0) })
      files.delete(item.key)
      batch.photos++
      batch.faces += matched.length
      batch.matched += nMatched
      batch.unknown += nUnknown
      batch.eventId = item.eventId
      return true
    } catch (e) {
      patch(item.key, { phase: 'error', error: friendlyError(e) })
      return true
    }
  }

  return useSession
}

export const useStaffSession = makeSession('staff')
export const usePortalSession = makeSession('portal')

/* ---------------- derived helpers ---------------- */

export function summarizeItems(items: XItem[]) {
  const done = items.filter((i) => i.phase === 'done')
  const faces = done.reduce((n, i) => n + i.faces.length, 0)
  const matched = done.reduce((n, i) => n + i.faces.filter((f) => f.studentId).length, 0)
  const verdicts: Record<Verdict, number> = { ready: 0, 'needs-blur': 0, 'keep-private': 0, 'check-faces': 0 }
  for (const i of done) if (i.verdict) verdicts[i.verdict]++
  return {
    total: items.length,
    done: done.length,
    pending: items.filter((i) => phaseIndex(i.phase) >= 0 && i.phase !== 'done').length,
    errors: items.filter((i) => i.phase === 'error').length,
    faces,
    matched,
    unknown: faces - matched,
    verdicts,
    lastEvidence: [...done].reverse().find((i) => i.evidenceId)?.evidenceId,
  }
}

/** Which item the stage should show: user focus → in progress → latest done → first queued. */
export function stageItem(items: XItem[], focusKey: string | null) {
  return (
    items.find((i) => i.key === focusKey) ??
    items.find((i) => ['reading', 'faces', 'matching', 'permissions', 'evidence'].includes(i.phase)) ??
    [...items].reverse().find((i) => i.phase === 'done' || i.phase === 'error') ??
    items[0]
  )
}
