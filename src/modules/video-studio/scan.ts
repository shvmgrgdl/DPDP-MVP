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

type Sampler = (t: number, frame: HTMLCanvasElement) => Promise<void>

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
    const tracker = new IouTracker()
    let samples = 0

    const publish = (final: boolean) => {
      const list = final ? tracker.finalize() : tracker.visible()
      patchScan(entry.id, { tracks: list.map(toLive), samples })
    }

    const sample: Sampler = async (t, frame) => {
      const needId = tracker.tracks.filter((tr) => tracker.needsIdentity(tr, cw, ch))
      // The quick detector keeps up with motion; the thorough one (with face descriptors) runs about once a
      // second to catch small faces, and whenever a new face still needs a name.
      const thorough = samples % SAMPLE_FPS === 0 || needId.length > 0
      const dets = thorough
        ? await detectFaces(frame, { detector: 'ssd', descriptors: true, tiles: false, minConfidence: 0.4 })
        : await detectFaces(frame, { detector: 'tiny', inputSize: 512, minConfidence: 0.45 })
      if (ctl.cancelled) return
      const res = tracker.update(t, dets)
      const voted = new Set<TrackState>()
      for (const r of res) {
        if (r.det.descriptor && tracker.needsIdentity(r.track, cw, ch)) {
          tracker.vote(r.track, await matchDescriptor(r.det.descriptor))
          voted.add(r.track)
        }
        takeThumb(r.track, r.det.box, frame)
      }
      // a thorough pass that didn't see a waiting face still counts as a try, so we never loop on it
      if (thorough) for (const tr of needId) if (!voted.has(tr)) tracker.vote(tr, null)
      samples++
      if (samples % 3 === 0) publish(false)
    }

    await drive(video, duration, cw, ch, sample, ctl, (t) => patchScan(entry.id, { progress: Math.min(0.99, t / duration), samples }), info.backend)
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
 * Walk through the video once, sampling ~7 frames per second of video.
 *
 * Fast path: the video never stops. requestVideoFrameCallback hands us each presented frame with its exact media
 * time; at each sample point the frame is copied into a canvas and playback drops to 1/16 speed while the detector
 * works (the detector can block the main thread; a crawling video can't run past the next sample point, and unlike
 * pause/play it causes no dropped "late" frames on resume). Then it runs at 2x to the next sample point.
 *
 * Slow path: without frame callbacks, on a CPU-only engine, or if the detector is so slow that the crawl still
 * overshoots, the rest is sampled by seeking frame by frame.
 */
async function drive(video: HTMLVideoElement, duration: number, cw: number, ch: number, sample: Sampler, ctl: Ctl, onProgress: (t: number) => void, backend: string) {
  const step = 1 / SAMPLE_FPS
  const frame = document.createElement('canvas')
  frame.width = cw
  frame.height = ch
  const g = frame.getContext('2d')
  if (!g) throw new Error('Canvas is not available in this browser')
  let nextT = 0

  if (typeof video.requestVideoFrameCallback === 'function' && backend !== 'cpu') {
    const SLOW = 0.0625
    const FAST = 2
    const setRate = (r: number) => { try { if (video.playbackRate !== r) video.playbackRate = r } catch { /* rate not supported */ } }
    let pending: number | null = null
    let wake: (() => void) | null = null
    const signal = () => { const w = wake; wake = null; w?.() }
    let ended = false
    let stalled = false
    let overshoots = 0
    let jobs = 0
    let lastCb = performance.now()

    const cb = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (ended || stalled || ctl.cancelled) return
      lastCb = performance.now()
      const t = meta.mediaTime
      if (pending === null && t + 1e-3 >= nextT) {
        setRate(SLOW)
        g.drawImage(video, 0, 0, cw, ch)
        pending = t
        signal()
      }
      video.requestVideoFrameCallback(cb)
    }
    const onEnded = () => { ended = true; signal() }
    video.addEventListener('ended', onEnded)
    const watch = window.setInterval(() => {
      if (!ended && !stalled && pending === null && performance.now() - lastCb > 4000) { stalled = true; signal() }
    }, 1000)

    setRate(FAST)
    video.requestVideoFrameCallback(cb)
    video.play().catch(() => { stalled = true; signal() })
    try {
      for (;;) {
        if (ctl.cancelled) break
        if (pending === null) {
          if (ended || stalled) break
          await new Promise<void>((r) => { wake = r })
          continue
        }
        const t = pending
        await sample(t, frame)
        onProgress(t)
        nextT = t + step
        jobs++
        // crawled past the next sample point anyway? (very slow detector) → finish by seeking instead
        if (!ended && video.currentTime > nextT + step * 0.5 && jobs > 2 && ++overshoots >= 2) { stalled = true; break }
        pending = null
        lastCb = performance.now()
        if (!ended) setRate(FAST)
      }
    } finally {
      window.clearInterval(watch)
      video.removeEventListener('ended', onEnded)
      video.pause()
    }
    if (ctl.cancelled || (ended && !stalled)) return
  }

  // Seek-by-seek sampling (deterministic, a little slower).
  for (let t = nextT; t < duration && !ctl.cancelled; t += step) {
    await seekExact(video, Math.min(t, Math.max(0, duration - 0.01)))
    g.drawImage(video, 0, 0, cw, ch)
    await sample(t, frame)
    onProgress(t)
  }
}
