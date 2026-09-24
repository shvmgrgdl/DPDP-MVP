import * as React from 'react'
import { Link } from 'react-router'
import { Film, FolderOpen, HardDrive, LoaderCircle, Play, ScanFace, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Button, Card, Chip, Empty, PageHeader } from '@/design/ui'
import { BlurPatch, coverBox, VerdictChip } from '@/design/media'
import { InstagramIcon } from '@/design/brand-icons'
import type { Box } from '@/data/types'
import type { EngineCtx } from '@/engine/permission'
import { useApp } from '@/store/app'
import { useCan, useCtx } from '@/store/hooks'
import { fmtDate } from '@/lib/utils'
import { useVideoEntries } from './sources'
import { removeLocalVideo, setDuration, useStudio } from './store'
import { cancelScan } from './scan'
import { buildLanes } from './lanes'
import { boxAt } from './tracks'
import { fmtBytes, fmtClock } from './media'
import { useOpenVideo } from './open'
import type { Frame, ScanState, SourceTrack, VideoEntry } from './types'

export function Library() {
  const { entries, loading } = useVideoEntries()
  const open = useOpenVideo()
  const ctx = useCtx()
  const canNames = useCan('view-names')
  const evidence = useApp((s) => s.evidence)
  const events = useApp((s) => s.events)
  const scans = useStudio((s) => s.scans)
  const durations = useStudio((s) => s.durations)
  const [dragging, setDragging] = React.useState(false)
  const dragDepth = React.useRef(0)

  const exports = React.useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const e of evidence) {
      if (e.type !== 'blur') continue
      const video = typeof e.payload?.video === 'string' ? e.payload.video : e.refs[0]
      const dest = e.payload?.dest
      if (!video || typeof dest !== 'string') continue
      if (!m.has(video)) m.set(video, new Set())
      m.get(video)!.add(dest)
    }
    return m
  }, [evidence])

  const stats = React.useMemo(() => {
    let faces = 0
    for (const e of entries) faces += e.tracks ? e.tracks.length : scans[e.id]?.status === 'done' ? scans[e.id].tracks.length : 0
    const copies = entries.reduce((n, e) => n + (exports.get(e.id)?.size ?? 0), 0)
    return { videos: entries.length, faces, copies }
  }, [entries, scans, exports])

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  return (
    <div
      onDragEnter={(e) => { if (!hasFiles(e)) return; dragDepth.current++; setDragging(true) }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault() }}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current = 0; setDragging(false); open.onFiles(e.dataTransfer.files) }}>
      {open.input}
      <PageHeader eyebrow="Video Studio" title="Video privacy studio"
        subtitle="Hide every child whose parents haven’t allowed a use, frame by frame, before a video is shared."
        actions={<Button variant="secondary" icon={<FolderOpen className="size-4" />} onClick={open.open}>Open a video file…</Button>} />

      <Card className="mb-8 flex flex-wrap items-center justify-between gap-6 px-6 py-5">
        <div className="flex max-w-xl items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-azure-50 text-azure"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="font-display text-[19px] font-semibold leading-snug text-ink">Faces are tracked frame by frame and blurred before anything leaves the school.</p>
            <p className="mt-1 text-[13px] text-ink-2">Each child follows their parents’ choices for the place you share to. Every export is logged as evidence.</p>
          </div>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-8">
            <Stat label="Videos" value={stats.videos} />
            <Stat label="Faces tracked" value={stats.faces} />
            <Stat label="Protected copies" value={stats.copies} />
          </div>
        )}
      </Card>

      {entries.length === 0 && loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="card h-[300px] animate-pulse bg-sunken" />)}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <Empty icon={<Film className="size-6" />} title="No videos yet"
            body="Event videos added to the school library appear here with every face already tracked. You can also open a video from this computer: it stays in this browser and faces are found right here."
            action={<Button icon={<FolderOpen className="size-4" />} onClick={open.open}>Open a video file…</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => (
            <VideoCard key={e.id} entry={e} ctx={ctx} canNames={canNames} scan={scans[e.id]} exported={exports.get(e.id)}
              duration={e.duration ?? durations[e.id] ?? (scans[e.id]?.duration || undefined)}
              eventName={events.find((x) => x.id === e.eventId)?.name} />
          ))}
          <button type="button" onClick={open.open}
            className="card flex min-h-[280px] flex-col items-center justify-center gap-3 border-2 border-dashed border-line-strong bg-transparent px-6 text-center shadow-none transition-colors hover:border-azure hover:bg-azure-50/40">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-azure-50 text-azure"><FolderOpen className="size-6" /></span>
            <span className="font-semibold text-ink">Open a video from this computer</span>
            <span className="max-w-[260px] text-[13px] text-ink-3">MP4 or WebM, or drop it anywhere on this page. It stays in this browser and faces are found right here.</span>
          </button>
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-navy/25 p-10 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white bg-navy/70 px-14 py-12 text-white">
            <FolderOpen className="size-8" />
            <div className="font-display text-[22px] font-semibold">Drop to open in Video Studio</div>
            <div className="text-[13px] text-white/75">The video stays on this computer</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-[28px] font-semibold leading-none text-ink num">{value}</div>
      <div className="mt-1 text-[12px] text-ink-3">{label}</div>
    </div>
  )
}

function tracksOf(entry: VideoEntry, scan: ScanState | undefined): SourceTrack[] | null {
  if (entry.tracks) {
    const asset = entry.asset
    return entry.tracks.map((t, i) => {
      const face = asset?.faces.find((f) => f.id === `${asset.id}-f${i}`)
      return { id: t.trackId, studentId: face ? face.studentId : t.studentId, frames: t.frames as Frame[], face }
    })
  }
  if (scan && (scan.status === 'done' || scan.status === 'scanning')) return scan.tracks.map((t) => ({ id: t.id, studentId: t.studentId, frames: t.frames }))
  return null
}

function VideoCard({ entry, ctx, canNames, scan, exported, duration, eventName }: {
  entry: VideoEntry
  ctx: EngineCtx
  canNames: boolean
  scan: ScanState | undefined
  exported: Set<string> | undefined
  duration: number | undefined
  eventName: string | undefined
}) {
  const posterT = duration ? Math.min(1, duration * 0.2) : 0.6
  const tracks = React.useMemo(() => tracksOf(entry, scan), [entry, scan])
  const lanes = React.useMemo(() => (tracks ? buildLanes(ctx, tracks, 'instagram', true, {}, canNames, duration ?? 0, undefined) : null), [tracks, ctx, canNames, duration])
  const blocks = React.useMemo(() => (lanes ?? []).filter((l) => l.blur).map((l) => boxAt(l.frames, posterT, l.gap)).filter((b): b is Box => !!b), [lanes, posterT])
  const scanning = !entry.tracks && !!scan && scan.status !== 'done' && scan.status !== 'error'
  const faces = lanes?.length ?? 0
  const toBlur = lanes?.filter((l) => l.blur).length ?? 0

  let status: React.ReactNode
  if (exported?.has('instagram')) status = <Chip tone="ok" size="sm" icon={<ShieldCheck className="size-3.5" />}>Protected copy made</Chip>
  else if (scanning) status = <Chip tone="info" size="sm" icon={<LoaderCircle className="size-3.5 animate-spin" />}>Checking faces</Chip>
  else if (!lanes) status = <Chip tone="muted" size="sm">Not checked yet</Chip>
  else status = <VerdictChip verdict={toBlur ? 'needs-blur' : 'ready'} size="sm" />

  const sub = entry.origin === 'local'
    ? `This computer${entry.size ? ` · ${fmtBytes(entry.size)}` : ''}`
    : [eventName ?? (entry.origin === 'folder' ? 'School video folder' : undefined), entry.capturedAt ? fmtDate(entry.capturedAt) : undefined].filter(Boolean).join(' · ')

  return (
    <Link to={`/video/${entry.id}`} className="group card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
      <Poster entry={entry} t={posterT} blocks={blocks} duration={duration} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink" title={entry.title}>{entry.title}</div>
            <div className="truncate text-[12.5px] text-ink-3">{sub || 'School video'}</div>
          </div>
          {entry.origin === 'local' && (
            <button type="button" aria-label="Close this video" title="Close this video"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelScan(entry.id); removeLocalVideo(entry.id) }}
              className="-mr-1 -mt-0.5 rounded-lg p-1 text-ink-3 hover:bg-sunken hover:text-ink"><X className="size-4" /></button>
          )}
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
            <ScanFace className="size-4 shrink-0 text-ink-3" />
            <span className="truncate">
              {lanes ? (faces ? `${faces} ${faces === 1 ? 'face' : 'faces'} tracked${toBlur ? ` · ${toBlur} to blur` : ''}` : 'No faces found') : scanning ? 'Finding faces…' : 'Faces found when opened'}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5" title="Instagram">
            <InstagramIcon className="size-4 text-ink-3" />
            {status}
          </span>
        </div>
      </div>
    </Link>
  )
}

function Poster({ entry, t, blocks, duration }: { entry: VideoEntry; t: number; blocks: Box[]; duration: number | undefined }) {
  const [failed, setFailed] = React.useState(false)
  const [dims, setDims] = React.useState(entry.w && entry.h ? { w: entry.w, h: entry.h } : null)
  const src = `${entry.src}#t=${t.toFixed(2)}`
  return (
    <div className="relative aspect-video overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#1a2540_0%,#0b1220_65%)]">
      {!failed ? (
        <video src={src} preload="metadata" muted playsInline tabIndex={-1} aria-hidden className="size-full object-cover"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            if (v.videoWidth && v.videoHeight) setDims({ w: v.videoWidth, h: v.videoHeight })
            setDuration(entry.id, v.duration)
          }}
          onError={() => setFailed(true)} />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-white/60">
          <Film className="size-7" />
          <span className="text-[12px]">Preview not available in this browser</span>
        </div>
      )}
      {!failed && dims && blocks.map((b, i) => {
        const p = coverBox(b, dims.w / dims.h, 16 / 9, 0.22)
        return <BlurPatch key={i} style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }} />
      })}
      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg"><Play className="ml-0.5 size-5" fill="currentColor" /></span>
      </span>
      <div className="absolute left-3 top-3 flex gap-1.5">
        {entry.origin === 'local' && <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur"><HardDrive className="size-3" />On this computer</span>}
        {!entry.tracks && entry.origin !== 'local' && <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur"><Sparkles className="size-3" />Faces found in browser</span>}
      </div>
      {duration ? <span className="num absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">{fmtClock(duration)}</span> : null}
    </div>
  )
}
