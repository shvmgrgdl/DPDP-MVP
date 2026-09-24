import { create } from 'zustand'
import type { LocalVideo, ScanState, VideoEntry } from './types'

/**
 * Module-local, in-memory state for Video Studio. Nothing here is persisted: local files are object URLs
 * that only live as long as this browser tab, and live scans are cheap to redo.
 */
interface StudioState {
  locals: Record<string, LocalVideo>
  scans: Record<string, ScanState>
  /** videoId → trackId → face thumbnail (data URL) for pre-computed tracks. */
  thumbs: Record<string, Record<string, string>>
  /** Entries listed in /media/video/index.json (null until fetched). */
  folder: VideoEntry[] | null
  /** Durations discovered from media metadata (for cards whose source has none). */
  durations: Record<string, number>
}

export const useStudio = create<StudioState>(() => ({ locals: {}, scans: {}, thumbs: {}, folder: null, durations: {} }))

export function patchScan(id: string, p: Partial<ScanState>) {
  const cur = useStudio.getState().scans[id]
  const base: ScanState = cur ?? { status: 'starting', progress: 0, tracks: [], samples: 0, duration: 0 }
  useStudio.setState((s) => ({ scans: { ...s.scans, [id]: { ...base, ...p } } }))
}

export function setThumbs(id: string, map: Record<string, string>) {
  useStudio.setState((s) => ({ thumbs: { ...s.thumbs, [id]: map } }))
}

export function setDuration(id: string, d: number) {
  if (!Number.isFinite(d) || d <= 0 || useStudio.getState().durations[id] === d) return
  useStudio.setState((s) => ({ durations: { ...s.durations, [id]: d } }))
}

const VIDEO_FILE = /\.(mp4|m4v|webm|mov|ogv)$/i
export const isVideoFile = (f: File) => f.type.startsWith('video/') || VIDEO_FILE.test(f.name)

/** Register a file from this computer. It stays in the browser: an object URL, never uploaded. */
export function addLocalVideo(file: File): LocalVideo {
  const id = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const lv: LocalVideo = { id, name: file.name, url: URL.createObjectURL(file), size: file.size, type: file.type, addedAt: new Date().toISOString() }
  useStudio.setState((s) => ({ locals: { ...s.locals, [id]: lv } }))
  return lv
}

export function removeLocalVideo(id: string) {
  const lv = useStudio.getState().locals[id]
  if (!lv) return
  useStudio.setState((s) => {
    const { [id]: _gone, ...locals } = s.locals
    const { [id]: _scan, ...scans } = s.scans
    return { locals, scans }
  })
  setTimeout(() => URL.revokeObjectURL(lv.url), 1000)
}
