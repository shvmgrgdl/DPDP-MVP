import { bestFrame } from './tracks'
import { setThumbs, useStudio } from './store'
import { hiddenVideo, seekExact, whenLoaded } from './media'
import type { SourceTrack } from './types'

const inflight = new Set<string>()

/** Crop a small face thumbnail for each pre-computed track from its best sighting. Best effort: failures leave initials. */
export async function ensureThumbs(videoId: string, src: string, tracks: SourceTrack[]) {
  if (!tracks.length || inflight.has(videoId)) return
  const have = useStudio.getState().thumbs[videoId] ?? {}
  const todo = tracks.filter((t) => !have[t.id] && t.frames.length)
  if (!todo.length) return
  inflight.add(videoId)
  const { video, dispose } = hiddenVideo(src)
  try {
    await whenLoaded(video, 15000)
    const out: Record<string, string> = { ...have }
    const c = document.createElement('canvas')
    c.width = 96
    c.height = 96
    const g = c.getContext('2d')
    if (!g) return
    for (const tr of todo) {
      const f = bestFrame(tr.frames)
      if (!f) continue
      await seekExact(video, f[0])
      const W = video.videoWidth
      const H = video.videoHeight
      const bw = f[3] * W
      const bh = f[4] * H
      const size = Math.max(bw, bh) * 1.6
      const cx = (f[1] + f[3] / 2) * W
      const cy = (f[2] + f[4] / 2) * H
      g.fillStyle = '#1b2436'
      g.fillRect(0, 0, 96, 96)
      g.drawImage(video, cx - size / 2, cy - size / 2, size, size, 0, 0, 96, 96)
      out[tr.id] = c.toDataURL('image/jpeg', 0.82)
      setThumbs(videoId, { ...out })
    }
  } catch {
    /* e.g. a codec this browser can't decode: lanes fall back to initials */
  } finally {
    dispose()
    inflight.delete(videoId)
  }
}
