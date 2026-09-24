import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import manifest from '@/data/media-manifest.json'
import type { Manifest } from '@/data/seed'
import type { VideoTrack } from '@/data/types'
import { useApp } from '@/store/app'
import { personToStudent } from '@/media/face'
import { useStudio } from './store'
import type { Frame, LocalVideo, VideoEntry } from './types'

const FOLDER = 'media/video/'
const VIDEO_EXT = /\.(mp4|m4v|webm|mov|ogv)$/i

const basename = (src: string) => decodeURIComponent(src.split('?')[0].split('#')[0].split('/').pop() ?? src)
const pathOf = (src: string) => src.split('?')[0].split('#')[0]

/** "sports-day-kabaddi.mp4" → "Sports day kabaddi" */
export function humanise(file: string) {
  const s = basename(file).replace(VIDEO_EXT, '').replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : 'Untitled video'
}
const slug = (s: string) => s.toLowerCase().replace(VIDEO_EXT, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video'

/* ------------------------------------------------------------------ */
/* /media/video/index.json (optional)                                   */
/* ------------------------------------------------------------------ */

type RawTrack = { trackId?: string; id?: string; person?: string | null; personId?: string | null; studentId?: string | null; frames?: unknown }

function toFrames(v: unknown): Frame[] | null {
  if (!Array.isArray(v)) return null
  const out: Frame[] = []
  for (const f of v) if (Array.isArray(f) && f.length >= 5 && f.slice(0, 5).every((n) => typeof n === 'number')) out.push([f[0], f[1], f[2], f[3], f[4]])
  return out.sort((a, b) => a[0] - b[0])
}

function toTracks(v: unknown): VideoTrack[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: VideoTrack[] = []
  v.forEach((raw: RawTrack, i) => {
    const frames = toFrames(raw?.frames)
    if (!frames) return
    const person = raw.person ?? raw.personId ?? null
    out.push({ trackId: String(raw.trackId ?? raw.id ?? `t${i}`), studentId: raw.studentId ?? personToStudent(person), frames })
  })
  return out
}

function folderEntry(item: unknown): VideoEntry | null {
  const o = (typeof item === 'string' ? { src: item } : item) as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  const rawSrc = [o.src, o.file, o.url, o.path, o.name].find((x) => typeof x === 'string') as string | undefined
  if (!rawSrc || !VIDEO_EXT.test(pathOf(rawSrc))) return null
  const src = /^(https?:|blob:|data:)/.test(rawSrc) ? rawSrc : rawSrc.startsWith('/') ? rawSrc.slice(1) : rawSrc.startsWith('media/') ? rawSrc : FOLDER + rawSrc
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
  return {
    id: typeof o.id === 'string' && o.id ? o.id : `clip-${slug(basename(src))}`,
    title: typeof o.title === 'string' && o.title ? o.title : humanise(src),
    src,
    origin: 'folder',
    eventId: typeof o.event === 'string' ? o.event : typeof o.eventId === 'string' ? o.eventId : undefined,
    duration: num(o.duration),
    w: num(o.w) ?? num(o.width),
    h: num(o.h) ?? num(o.height),
    tracks: toTracks(o.tracks),
    fileName: basename(src),
  }
}

let folderPromise: Promise<void> | null = null
/** Fetch /media/video/index.json once. Missing (404 or the dev server's HTML fallback) or malformed = no folder clips. */
export function ensureFolderIndex(force = false) {
  if (!folderPromise || force) {
    folderPromise = (async () => {
      let entries: VideoEntry[] = []
      try {
        const res = await fetch(`${FOLDER}index.json`, { cache: 'no-cache' })
        if (res.ok) {
          const text = await res.text()
          if (text.trim() && !text.trimStart().startsWith('<')) {
            const raw = JSON.parse(text) as unknown
            const list = Array.isArray(raw) ? raw : ((raw as Record<string, unknown>)?.videos ?? (raw as Record<string, unknown>)?.files ?? (raw as Record<string, unknown>)?.items ?? [])
            if (Array.isArray(list)) entries = list.map(folderEntry).filter((e): e is VideoEntry => !!e)
          }
        }
      } catch {
        /* no index: fine */
      }
      const seen = new Set<string>()
      useStudio.setState({ folder: entries.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))) })
    })()
  }
  return folderPromise
}

/* ------------------------------------------------------------------ */
/* Library                                                              */
/* ------------------------------------------------------------------ */

function manifestFallback(knownIds: Set<string>, knownSrc: Set<string>): VideoEntry[] {
  const m = manifest as unknown as Manifest
  return (m.videos ?? [])
    .filter((v) => !knownIds.has(v.id) && !knownSrc.has(pathOf(v.src)))
    .map((v) => ({
      id: v.id, title: v.title ?? humanise(v.src), src: v.src, origin: 'library' as const, eventId: v.event, duration: v.duration, w: v.w, h: v.h,
      tracks: v.tracks.map((t) => ({ trackId: t.trackId, studentId: personToStudent(t.person), frames: t.frames })),
      fileName: basename(v.src),
    }))
}

const localEntry = (lv: LocalVideo): VideoEntry => ({ id: lv.id, title: humanise(lv.name), src: lv.url, origin: 'local', fileName: lv.name, size: lv.size })

/** Every video the studio can open: school library (media manifest), the /media/video folder index, and files opened from this computer. */
export function useVideoEntries() {
  const assets = useApp(useShallow((s) => s.assets.filter((a) => a.kind === 'video')))
  const folder = useStudio((s) => s.folder)
  const locals = useStudio((s) => s.locals)
  React.useEffect(() => { void ensureFolderIndex() }, [])
  const entries = React.useMemo(() => {
    const lib: VideoEntry[] = [...assets]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .map((a) => ({
        id: a.id, title: a.title ?? humanise(a.src), src: a.src, origin: 'library', asset: a, eventId: a.eventId, capturedAt: a.capturedAt,
        // no tracks at all (e.g. a fresh upload) → faces are found live; an empty list means "checked, nobody visible"
        duration: a.duration, w: a.w, h: a.h, tracks: a.tracks, fileName: basename(a.src),
      }))
    const ids = new Set(lib.map((e) => e.id))
    const srcs = new Set(lib.map((e) => pathOf(e.src)))
    const extra = manifestFallback(ids, srcs)
    for (const e of extra) { ids.add(e.id); srcs.add(pathOf(e.src)) }
    const fromFolder = (folder ?? []).filter((e) => !ids.has(e.id) && !srcs.has(pathOf(e.src)))
    const local = Object.values(locals).sort((a, b) => b.addedAt.localeCompare(a.addedAt)).map(localEntry)
    return [...lib, ...extra, ...fromFolder, ...local]
  }, [assets, folder, locals])
  return { entries, loading: folder === null }
}

export function useVideoEntry(id: string | undefined) {
  const { entries, loading } = useVideoEntries()
  const entry = React.useMemo(() => entries.find((e) => e.id === id), [entries, id])
  return { entry, loading: !entry && loading }
}
