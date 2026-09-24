/** Small helpers around HTMLVideoElement. */

export function waitForEvent(el: HTMLMediaElement, ev: string, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve() }
    const fail = () => { cleanup(); reject(new Error(mediaErrorText(el))) }
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('The video took too long to load')) }, timeoutMs)
    const cleanup = () => {
      window.clearTimeout(timer)
      el.removeEventListener(ev, done)
      el.removeEventListener('error', fail)
    }
    el.addEventListener(ev, done, { once: true })
    el.addEventListener('error', fail, { once: true })
  })
}

/** Resolves once the element has data for the current frame. */
export async function whenLoaded(el: HTMLVideoElement, timeoutMs = 20000) {
  if (el.error) throw new Error(mediaErrorText(el))
  if (el.readyState >= 2) return
  await waitForEvent(el, 'loadeddata', timeoutMs)
}

/** Seek and wait until the new frame is ready. */
export async function seekExact(el: HTMLVideoElement, t: number, timeoutMs = 8000) {
  if (Math.abs(el.currentTime - t) < 1e-3 && el.readyState >= 2 && !el.seeking) return
  const p = waitForEvent(el, 'seeked', timeoutMs)
  el.currentTime = t
  await p
}

/**
 * Files recorded by MediaRecorder (including our own exports) often carry no duration: the element
 * reports Infinity. Seeking far past the end makes the browser work it out; then we return to 0.
 */
export async function resolveDuration(el: HTMLVideoElement, timeoutMs = 8000): Promise<number> {
  if (Number.isFinite(el.duration) && el.duration > 0) return el.duration
  const d = await new Promise<number>((resolve) => {
    const check = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) { cleanup(); resolve(el.duration) }
    }
    const timer = window.setTimeout(() => { cleanup(); resolve(0) }, timeoutMs)
    const cleanup = () => {
      window.clearTimeout(timer)
      el.removeEventListener('durationchange', check)
      el.removeEventListener('timeupdate', check)
      el.removeEventListener('seeked', check)
    }
    el.addEventListener('durationchange', check)
    el.addEventListener('timeupdate', check)
    el.addEventListener('seeked', check)
    el.currentTime = 1e101
  })
  try { await seekExact(el, 0) } catch { /* best effort */ }
  return d
}

export function mediaErrorText(el: HTMLMediaElement) {
  const code = el.error?.code
  if (code === 4) return 'This browser can’t play this video format. MP4 (H.264) or WebM files work best.'
  if (code === 3) return 'The video file looks damaged and could not be decoded.'
  if (code === 2) return 'The video could not be downloaded.'
  return 'The video could not be loaded.'
}

/** An off-screen (but rendered) muted video for analysis and thumbnails. */
export function hiddenVideo(src: string) {
  const v = document.createElement('video')
  v.muted = true
  v.defaultMuted = true
  v.playsInline = true
  v.preload = 'auto'
  v.setAttribute('aria-hidden', 'true')
  v.setAttribute('tabindex', '-1')
  Object.assign(v.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' })
  v.src = src
  document.body.appendChild(v)
  const dispose = () => {
    v.pause()
    v.removeAttribute('src')
    try { v.load() } catch { /* ignore */ }
    v.remove()
  }
  return { video: v, dispose }
}

export const fmtClock = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export const fmtBytes = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`
