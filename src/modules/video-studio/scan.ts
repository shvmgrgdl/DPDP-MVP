import { detectFaces, loadModels, matchDescriptor, personToStudent } from '@/media/face'
import type { Box } from '@/data/types'
import { IouTracker, type TrackState } from './tracks'
import { patchScan, useStudio } from './store'
import { hiddenVideo, resolveDuration, seekExact, whenLoaded } from './media'
import type { LiveTrack, VideoEntry } from './types'

/** Samples per second of video. Between samples, positions are interpolated. */
export const SAMPLE_FPS = 7
/** Long edge of the analysis frame; the detectors downscale further anyway. */
const ANALYSIS_EDGE = 960

interface Ctl { cancelled: boolean }
const running = new Map<string, Ctl>()

export const isScanRunning = (id: string) => running.has(id)

/** Find and track faces in a video that has no pre-computed tracks. Runs in the background; progress lands in useStudio().scans[id]. */
export function startScan(entry: VideoEntry, force = false) {
  if (running.has(entry.id)) return
  const cur = useStudio.getState().scans[entry.id]
  if (cur && cur.status === 'done' && !force) return
  const ctl: Ctl = { cancelled: false }
  running.set(entry.id, ctl)
  void runScan(entry, ctl).finally(() => {
    if (running.get(entry.id) === ctl) running.delete(entry.id)
  })
}

export function cancelScan(id: string) {
  const ctl = running.get(id)
  if (ctl) ctl.cancelled = true
}

async function runScan(entry: VideoEntry, ctl: Ctl) {
  const t0 = performance.now()
  patchScan(entry.id, { status: 'starting', progress: 0, tracks: [], samples: 0, error: undefined })
  const { video, dispose } = hiddenVideo(entry.src)
  try {
    await whenLoaded(video)
    const duration = await resolveDuration(video)
    if (!duration) throw new Error('We couldn’t read how long this video is.')
    patchScan(entry.id, { duration })
    const info = await loadModels()
    if (ctl.cancelled) return
    patchScan(entry.id, { status: 'scanning', backend: info.backend })

    const k = Math.min(1, ANALYSIS_EDGE / Math.max(video.videoWidth, video.videoHeight))
    const cw = Math.max(2, Math.round(video.videoWidth * k))
    const ch = Math.max(2, Math.round(video.videoHeight * k))
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const g = canvas.getContext('2d')
    if (!g) throw new Error('Canvas is not available in this browser')
    const tracker = new IouTracker()
    let samples = 0

    const publish = (final: boolean) => {
      const list = final ? tracker.finalize() : tracker.visible()
      patchScan(entry.id, { tracks: list.map(toLive), samples })
    }

    const sample = async (t: number) => {
      g.drawImage(video, 0, 0, cw, ch)
      const needId = tracker.tracks.filter((tr) => tracker.needsIdentity(tr, cw, ch))
      // The quick detector keeps up with motion; the thorough one (with face descriptors) runs about once a
      // second to catch small faces, and whenever a new face still needs a name.
      const thorough = samples % SAMPLE_FPS === 0 || needId.length > 0
      const dets = thorough
        ? await detectFaces(canvas, { detector: 'ssd', descriptors: true, tiles: false, minConfidence: 0.4 })
        : await detectFaces(canvas, { detector: 'tiny', inputSize: 512, minConfidence: 0.45 })
      if (ctl.cancelled) return
      const res = tracker.update(t, dets)
      const voted = new Set<TrackState>()
      for (const r of res) {
        if (r.det.descriptor && tracker.needsIdentity(r.track, cw, ch)) {
          tracker.vote(r.track, await matchDescriptor(r.det.descriptor))
          voted.add(r.track)
        }
        takeThumb(r.track, r.det.box, canvas)
      }
      // a thorough pass that didn't see a waiting face still counts as a try, so we never loop on it
      if (thorough) for (const tr of needId) if (!voted.has(tr)) tracker.vote(tr, null)
      samples++
      if (samples % 3 === 0) publish(false)
    }

    await drive(video, duration, sample, ctl, (t) => patchScan(entry.id, { progress: Math.min(0.99, t / duration), samples }))
    if (ctl.cancelled) return
    publish(true)
    patchScan(entry.id, { status: 'done', progress: 1, ms: Math.round(performance.now() - t0) })
  } catch (e) {
    if (!ctl.cancelled) patchScan(entry.id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
  } finally {
    dispose()
  }
}

function toLive(tr: TrackState): LiveTrack {
  return {
    id: tr.id, studentId: personToStudent(tr.personId), personId: tr.personId, distance: tr.distance,
    frames: tr.frames.slice(), score: Math.round(tr.maxScore * 100) / 100, thumb: tr.thumb,
  }
}

const thumbCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
function takeThumb(tr: TrackState, box: Box, src: HTMLCanvasElement) {
  if (!thumbCanvas) return
  const bw = box[2] * src.width
  const bh = box[3] * src.height
  const area = bw * bh
  if (area < 20 * 20 || area < tr.thumbArea * 1.25) return
  tr.thumbArea = area
  const size = Math.max(bw, bh) * 1.6
  const cx = (box[0] + box[2] / 2) * src.width
  const cy = (box[1] + box[3] / 2) * src.height
  thumbCanvas.width = 96
  thumbCanvas.height = 96
  const g = thumbCanvas.getContext('2d')
  if (!g) return
  g.fillStyle = '#1b2436'
  g.fillRect(0, 0, 96, 96)
  g.drawImage(src, cx - size / 2, cy - size / 2, size, size, 0, 0, 96, 96)
  tr.thumb = thumbCanvas.toDataURL('image/jpeg', 0.82)
}

/**
 * Walk through the video once. Primary mode plays the hidden video and pauses on each sample frame
 * (requestVideoFrameCallback gives the exact frame time), so decoding stays sequential and no sample is skipped
 * however slow the detector is. If frame callbacks are missing or stall (e.g. a background tab), fall back to seeking.
 */
async function drive(video: HTMLVideoElement, duration: number, sample: (t: number) => Promise<void>, ctl: Ctl, onProgress: (t: number) => void) {
  const step = 1 / SAMPLE_FPS
  let nextT = 0
  if (typeof video.requestVideoFrameCallback === 'function') {
    const completed = await new Promise<boolean>((resolve, reject) => {
      let busy = false
      let settled = false
      let endedFlag = false
      let lastCb = performance.now()
      const finish = (v: boolean) => {
        if (settled) return
        settled = true
        window.clearInterval(watch)
        video.removeEventListener('ended', onEnded)
        video.pause()
        resolve(v)
      }
      const fail = (e: unknown) => {
        if (settled) return
        settled = true
        window.clearInterval(watch)
        video.removeEventListener('ended', onEnded)
        reject(e)
      }
      const onEnded = () => { if (busy) endedFlag = true; else finish(true) }
      const cb = (_now: number, meta: VideoFrameCallbackMetadata) => {
        if (settled) return
        lastCb = performance.now()
        if (ctl.cancelled) return finish(true)
        const t = meta.mediaTime
        if (t + 1e-3 < nextT) { video.requestVideoFrameCallback(cb); return }
        busy = true
        video.pause()
        sample(t).then(() => {
          busy = false
          nextT = t + step
          onProgress(t)
          lastCb = performance.now()
          if (settled) return
          if (ctl.cancelled || endedFlag || video.ended || t >= duration - 1e-3) return finish(true)
          video.requestVideoFrameCallback(cb)
          video.play().catch(() => finish(false))
        }, fail)
      }
      const watch = window.setInterval(() => {
        if (!busy && !settled && performance.now() - lastCb > 4000) finish(false)
      }, 1000)
      video.addEventListener('ended', onEnded)
      video.playbackRate = 2
      video.requestVideoFrameCallback(cb)
      video.play().catch(() => finish(false))
    })
    if (completed || ctl.cancelled) return
  }
  for (let t = nextT; t < duration && !ctl.cancelled; t += step) {
    await seekExact(video, Math.min(t, Math.max(0, duration - 0.01)))
    await sample(t)
    onProgress(t)
  }
}
