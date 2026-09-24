import * as React from 'react'
import { drawOverlay, drawProtectedFrame, type RenderParams } from './render'
import { mediaErrorText, resolveDuration, seekExact } from './media'

/** Long edge of the preview/export canvas. */
const MAX_EDGE = 1920

export interface TimeStore { get(): number; set(t: number): void; subscribe(f: () => void): () => void }
function createTimeStore(): TimeStore {
  let t = 0
  const subs = new Set<() => void>()
  return {
    get: () => t,
    set: (v) => { if (v !== t) { t = v; subs.forEach((f) => f()) } },
    subscribe: (f) => { subs.add(f); return () => { subs.delete(f) } },
  }
}
export const useTime = (s: TimeStore) => React.useSyncExternalStore(s.subscribe, s.get, s.get)

export interface PlayerState {
  ready: boolean
  error: string | null
  playing: boolean
  duration: number
  w: number
  h: number
  muted: boolean
  exporting: boolean
}

export interface ExportResult { blob: Blob; mime: string; ext: 'webm' | 'mp4'; hasAudio: boolean; ms: number }

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }

function pickMime(hasAudio: boolean) {
  if (typeof MediaRecorder === 'undefined') return null
  const c = hasAudio
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return c.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

export type Player = ReturnType<typeof usePlayer>

/**
 * Plays a video into a canvas. Every presented frame (requestVideoFrameCallback) is redrawn with faces hidden,
 * so what you see is exactly what the export records. Outlines live on a second canvas that is never recorded.
 */
export function usePlayer(src: string, params: React.RefObject<RenderParams>) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const frameRef = React.useRef<HTMLCanvasElement>(null)
  const overlayRef = React.useRef<HTMLCanvasElement>(null)
  const time = React.useMemo(createTimeStore, [])
  const [state, setState] = React.useState<PlayerState>({ ready: false, error: null, playing: false, duration: 0, w: 16, h: 9, muted: false, exporting: false })
  const patch = React.useCallback((p: Partial<PlayerState>) => setState((s) => ({ ...s, ...p })), [])

  const draw = React.useCallback((t: number) => {
    const v = videoRef.current
    const c = frameRef.current
    if (!v || !c || v.readyState < 2 || c.width < 4) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const p = params.current
    const faces = p.facesAt(t)
    drawProtectedFrame(ctx, v, c.width, c.height, faces, p.style, p.exporting ? null : p.compare)
    const o = overlayRef.current
    const octx = o?.getContext('2d')
    if (o && octx) drawOverlay(octx, o.width, o.height, faces, p.outlines && !p.exporting)
    time.set(t)
  }, [params, time])

  React.useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let disposed = false
    const onMeta = async () => {
      const W0 = v.videoWidth
      const H0 = v.videoHeight
      if (!W0 || !H0) return
      const k = Math.min(1, MAX_EDGE / Math.max(W0, H0))
      const W = Math.max(2, Math.round(W0 * k))
      const H = Math.max(2, Math.round(H0 * k))
      for (const c of [frameRef.current, overlayRef.current]) if (c && (c.width !== W || c.height !== H)) { c.width = W; c.height = H }
      patch({ w: W, h: H })
      const d = await resolveDuration(v)
      if (!disposed && d) patch({ duration: d })
      if (!disposed) draw(v.currentTime)
    }
    const onData = () => { patch({ ready: true, error: null }); draw(v.currentTime) }
    const onPlay = () => patch({ playing: true })
    const onPause = () => patch({ playing: false })
    const onError = () => patch({ error: mediaErrorText(v), ready: false })
    const onSeeked = () => draw(v.currentTime)
    const onDur = () => { if (Number.isFinite(v.duration) && v.duration > 0) patch({ duration: v.duration }) }
    const onVol = () => patch({ muted: v.muted })
    const evs: [string, EventListener][] = [
      ['loadedmetadata', () => void onMeta()], ['loadeddata', onData], ['play', onPlay], ['pause', onPause], ['ended', onPause],
      ['error', onError], ['seeked', onSeeked], ['durationchange', onDur], ['volumechange', onVol],
    ]
    evs.forEach(([e, f]) => v.addEventListener(e, f))
    if (v.error) onError()
    else {
      if (v.readyState >= 1) void onMeta()
      if (v.readyState >= 2) onData()
    }
    let handle = 0
    let raf = 0
    const hasRVFC = typeof v.requestVideoFrameCallback === 'function'
    const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (disposed) return
      draw(meta.mediaTime)
      handle = v.requestVideoFrameCallback(onFrame)
    }
    if (hasRVFC) handle = v.requestVideoFrameCallback(onFrame)
    else {
      const tick = () => {
        if (disposed) return
        if (!v.paused) draw(v.currentTime)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    return () => {
      disposed = true
      evs.forEach(([e, f]) => v.removeEventListener(e, f))
      if (hasRVFC) v.cancelVideoFrameCallback(handle)
      cancelAnimationFrame(raf)
    }
  }, [src, draw, patch])

  const play = React.useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    if (v.ended) v.currentTime = 0
    try { await v.play() } catch { /* interrupted by a pause or seek: harmless */ }
  }, [])
  const pause = React.useCallback(() => videoRef.current?.pause(), [])
  const toggle = React.useCallback(() => { const v = videoRef.current; if (v) void (v.paused || v.ended ? play() : v.pause()) }, [play])
  const seek = React.useCallback((t: number) => {
    const v = videoRef.current
    if (!v) return
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : state.duration
    const to = Math.max(0, Math.min(t, Math.max(0, d - 0.01)))
    v.currentTime = to
    time.set(to)
  }, [state.duration, time])
  const setMuted = React.useCallback((m: boolean) => { const v = videoRef.current; if (v) v.muted = m }, [])
  /** Redraw the current frame after a settings change (playback redraws every frame anyway). */
  const redraw = React.useCallback(() => { const v = videoRef.current; if (v && (v.paused || v.ended)) draw(v.currentTime) }, [draw])

  /**
   * Record the protected canvas while the video plays through once: canvas.captureStream(30) + the video's own
   * audio track (if any) → MediaRecorder (WebM VP9/VP8). The original file is never modified.
   */
  const exportProtected = React.useCallback(async (o: { onProgress: (p: number) => void; signal: AbortSignal }): Promise<ExportResult> => {
    const v = videoRef.current as CapturableVideo | null
    const c = frameRef.current
    if (!v || !c) throw new Error('The player is not ready yet')
    if (typeof c.captureStream !== 'function' || typeof MediaRecorder === 'undefined') throw new Error('This browser can’t record video. Try the latest Chrome, Edge or Firefox.')
    const started = performance.now()
    const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : state.duration
    const inner = new AbortController()
    const abort = (msg: string) => inner.abort(new Error(msg))
    const onOuter = () => abort('cancelled')
    o.signal.addEventListener('abort', onOuter, { once: true })
    const onHidden = () => { if (document.hidden) abort('Export stopped because this tab went into the background. Keep it open while exporting.') }
    document.addEventListener('visibilitychange', onHidden)

    params.current.exporting = true
    patch({ exporting: true })
    const prev = { muted: v.muted, rate: v.playbackRate, loop: v.loop }
    let stream: MediaStream | null = null
    let rec: MediaRecorder | null = null
    const chunks: Blob[] = []
    try {
      v.pause()
      v.loop = false
      v.playbackRate = 1
      await seekExact(v, 0)
      draw(0)
      stream = c.captureStream(30)
      let audio: MediaStreamTrack[] = []
      try {
        const cap = v.captureStream?.() ?? v.mozCaptureStream?.()
        audio = cap?.getAudioTracks() ?? []
        cap?.getVideoTracks().forEach((t) => t.stop())
      } catch { /* no capturable audio: export silent */ }
      audio.forEach((t) => stream!.addTrack(t))
      const mime = pickMime(audio.length > 0)
      if (!mime) throw new Error('This browser can’t record WebM video. Try the latest Chrome, Edge or Firefox.')
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      const recorder = rec
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const stopped = new Promise<void>((res) => { recorder.onstop = () => res() })
      recorder.start(500)
      v.muted = false // audio must flow for the capture; it plays through once, like the picture
      try { await v.play() } catch { v.muted = true; await v.play() }
      await new Promise<void>((resolve, reject) => {
        const onTime = () => o.onProgress(duration ? Math.min(0.999, v.currentTime / duration) : 0)
        const onEnd = () => { cleanup(); resolve() }
        const onAbort = () => { cleanup(); reject(inner.signal.reason) }
        const cleanup = () => {
          v.removeEventListener('timeupdate', onTime)
          v.removeEventListener('ended', onEnd)
          inner.signal.removeEventListener('abort', onAbort)
        }
        v.addEventListener('timeupdate', onTime)
        v.addEventListener('ended', onEnd)
        inner.signal.addEventListener('abort', onAbort)
        if (inner.signal.aborted) onAbort()
      })
      // let the last frame reach the recorder
      await new Promise((r) => setTimeout(r, 120))
      recorder.stop()
      await stopped
      o.onProgress(1)
      const base = mime.split(';')[0]
      return { blob: new Blob(chunks, { type: base }), mime, ext: base.includes('mp4') ? 'mp4' : 'webm', hasAudio: audio.length > 0, ms: Math.round(performance.now() - started) }
    } finally {
      if (rec && rec.state !== 'inactive') { try { rec.stop() } catch { /* ignore */ } }
      stream?.getTracks().forEach((t) => t.stop())
      v.pause()
      v.muted = prev.muted
      v.playbackRate = prev.rate
      v.loop = prev.loop
      params.current.exporting = false
      patch({ exporting: false })
      o.signal.removeEventListener('abort', onOuter)
      document.removeEventListener('visibilitychange', onHidden)
      draw(v.currentTime)
    }
  }, [draw, params, patch, state.duration])

  return { videoRef, frameRef, overlayRef, time, state, play, pause, toggle, seek, setMuted, redraw, exportProtected }
}
