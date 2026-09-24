import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Film, FolderOpen, ScanFace, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Empty, PageHeader } from '@/design/ui'
import type { BlurStyle } from '@/design/media'
import { DEST } from '@/data/reference'
import { fingerprint, useFaceEngine } from '@/media/face'
import { useApp } from '@/store/app'
import { useCan, useCtx } from '@/store/hooks'
import { ROLE } from '@/roles/roles'
import { fmtDate } from '@/lib/utils'
import { useVideoEntry } from './sources'
import { useStudio } from './store'
import { startScan } from './scan'
import { ensureThumbs } from './thumbs'
import { blurredSpans, buildLanes, DEST_CHOICES, DEST_PHRASE, destLabel } from './lanes'
import { boxAt } from './tracks'
import { usePlayer } from './player'
import type { DrawFace, RenderParams } from './render'
import { fmtBytes, fmtClock } from './media'
import { Stage } from './Stage'
import { Timeline, type ScanInfo } from './Timeline'
import { SharePanel, type ExportState } from './SharePanel'
import { useOpenVideo } from './open'
import type { DestChoice, Frame, SourceTrack, VideoEntry } from './types'

export function Studio() {
  const { assetId } = useParams()
  const { entry, loading } = useVideoEntry(assetId)
  const open = useOpenVideo()
  if (entry) return <StudioInner key={entry.id} entry={entry} />
  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Video Studio" title="Opening video…" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-[#0b1220]/90" />
      </div>
    )
  }
  const local = assetId?.startsWith('local-')
  return (
    <div>
      <PageHeader eyebrow={<BackLink />} title={local ? 'This video is no longer open' : 'Video not found'} />
      <Card>
        <Empty icon={<Film className="size-6" />}
          title={local ? 'Videos opened from your computer stay in this browser tab' : 'We couldn’t find this video'}
          body={local ? 'It was never uploaded, so after a reload it has to be opened again. Nothing about it was saved.' : 'It may have been removed from the school library. Pick another video from the studio.'}
          action={<div className="flex gap-2">{open.input}<Button icon={<FolderOpen className="size-4" />} onClick={open.open}>Open a video file…</Button><Button variant="secondary" to="/video">Back to Video Studio</Button></div>} />
      </Card>
    </div>
  )
}

function BackLink() {
  return <Link to="/video" className="inline-flex items-center gap-1 hover:text-azure"><ArrowLeft className="size-3.5" />Video Studio</Link>
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'video'

function download(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function StudioInner({ entry }: { entry: VideoEntry }) {
  const ctx = useCtx()
  const canNames = useCan('view-names')
  const canExportAbility = useCan('export')
  const canPublish = useCan('publish')
  const canExport = canExportAbility || canPublish
  const role = useApp((s) => s.role)
  const event = useApp((s) => s.events.find((e) => e.id === entry.eventId))
  const engine = useFaceEngine()
  const open = useOpenVideo()
  const navigate = useNavigate()

  const [search, setSearch] = useSearchParams()
  const forParam = search.get('for')
  const dest: DestChoice = DEST_CHOICES.some((d) => d.key === forParam) ? (forParam as DestChoice) : 'instagram'
  const [blurEveryone, setBlurEveryoneState] = React.useState(true)
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})
  const [style, setStyle] = React.useState<BlurStyle>('soft')
  const [outlines, setOutlines] = React.useState(false)
  const [compare, setCompare] = React.useState<number | null>(null)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [exportState, setExportState] = React.useState<ExportState>({ phase: 'idle' })

  const setDest = (d: DestChoice) => {
    setSearch((p) => { const n = new URLSearchParams(p); n.set('for', d); return n }, { replace: true })
    setOverrides({})
  }
  const setBlurEveryone = (v: boolean) => { setBlurEveryoneState(v); setOverrides({}) }

  // ---- face tracks: pre-computed from the media manifest, or found live in this browser ----
  const precomputed = entry.tracks !== undefined
  const scan = useStudio((s) => s.scans[entry.id])
  const thumbs = useStudio((s) => s.thumbs[entry.id])
  React.useEffect(() => { if (!precomputed) startScan(entry) }, [entry, precomputed])

  const sourceTracks = React.useMemo<SourceTrack[]>(() => {
    if (precomputed) {
      const asset = entry.asset
      return (entry.tracks ?? []).map((t, i) => {
        const face = asset?.faces.find((f) => f.id === `${asset.id}-f${i}`)
        return { id: t.trackId, studentId: face ? face.studentId : t.studentId, frames: t.frames as Frame[], face }
      })
    }
    return (scan?.tracks ?? []).map((t) => ({ id: t.id, studentId: t.studentId, frames: t.frames, thumb: t.thumb }))
  }, [precomputed, entry, scan?.tracks])

  React.useEffect(() => {
    if (precomputed && sourceTracks.length) void ensureThumbs(entry.id, entry.src, sourceTracks)
  }, [precomputed, entry.id, entry.src, sourceTracks])

  // ---- player ----
  const renderRef = React.useRef<RenderParams>({ facesAt: () => [], style: 'soft', outlines: false, compare: null, exporting: false })
  const player = usePlayer(entry.src, renderRef)
  const duration = player.state.duration || entry.duration || scan?.duration || 0

  const lanes = React.useMemo(
    () => buildLanes(ctx, sourceTracks, dest, blurEveryone, overrides, canNames, duration, thumbs),
    [ctx, sourceTracks, dest, blurEveryone, overrides, canNames, duration, thumbs],
  )
  const spans = React.useMemo(() => blurredSpans(lanes), [lanes])

  const { redraw } = player
  React.useLayoutEffect(() => {
    const r = renderRef.current
    r.facesAt = (t: number) => {
      const out: DrawFace[] = []
      for (const l of lanes) {
        const box = boxAt(l.frames, t, l.gap)
        if (box) out.push({ id: l.id, box, blur: l.blur, tone: l.tone, label: l.shortName, selected: l.id === selected })
      }
      return out
    }
    r.style = style
    r.outlines = outlines
    r.compare = compare
    redraw()
  }, [lanes, style, outlines, compare, selected, redraw])

  // ---- scan status for the UI ----
  const scanInfo: ScanInfo | null = React.useMemo(() => {
    if (precomputed) return null
    if (!scan || scan.status === 'starting') {
      const loadingEngine = engine.status === 'loading'
      return { active: true, progress: loadingEngine ? engine.progress : 0.02, label: loadingEngine ? `${engine.stage || 'Loading the face engine'}…` : 'Getting the video ready…' }
    }
    if (scan.status === 'scanning') {
      const n = scan.tracks.length
      return { active: true, progress: scan.progress, label: `Finding faces in this browser · ${n} ${n === 1 ? 'person' : 'people'} so far` }
    }
    if (scan.status === 'error') return { active: false, progress: 0, label: '', error: scan.error ?? 'Something went wrong', onRetry: () => startScan(entry, true) }
    return null
  }, [precomputed, scan, engine.status, engine.progress, engine.stage, entry])

  const stageScan = scanInfo?.active ? { active: true, progress: scanInfo.progress, label: `Finding faces · ${Math.round(scanInfo.progress * 100)}%` } : null

  // ---- export ----
  const abortRef = React.useRef<AbortController | null>(null)
  const urlRef = React.useRef<string | null>(null)
  React.useEffect(() => () => {
    abortRef.current?.abort()
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  const exportBlock = player.state.error
    ? 'This video can’t be played in this browser, so it can’t be exported here.'
    : !player.state.ready
      ? 'Waiting for the video to load.'
      : !precomputed && scan?.status === 'error'
        ? 'The face scan didn’t finish. Run it again before exporting.'
        : !precomputed && scan?.status !== 'done'
          ? 'Finishing the face scan first: the export needs every face found.'
          : null

  const onExport = async () => {
    if (exportState.phase === 'running' || exportBlock || !canExport) return
    const ac = new AbortController()
    abortRef.current = ac
    setCompare(null)
    setExportState({ phase: 'running', progress: 0 })
    const snapshot = lanes
    try {
      const res = await player.exportProtected({
        signal: ac.signal,
        onProgress: (p) => setExportState((s) => (s.phase === 'running' ? { phase: 'running', progress: p } : s)),
      })
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(res.blob)
      urlRef.current = url
      const fileName = `${slug(entry.title)}-protected-${dest}.${res.ext}`
      download(url, fileName)
      const sha = await fingerprint(res.blob)
      const blurredLanes = snapshot.filter((l) => l.blur)
      const n = blurredLanes.length
      const st = useApp.getState()
      const evidenceId = st.addEvidence({
        type: 'blur',
        title: `Protected video exported for ${DEST[dest].label}: “${entry.title}” (${n} of ${snapshot.length} face${snapshot.length === 1 ? '' : 's'} blurred)`,
        actor: ROLE[st.role].person || st.role,
        refs: [entry.id, ...new Set(blurredLanes.map((l) => l.studentId).filter((x): x is string => !!x))],
        payload: {
          dest, video: entry.id, source: entry.origin, file: fileName, bytes: res.blob.size, sha256: sha, style,
          facesTracked: snapshot.length, facesBlurred: n,
          noPermission: snapshot.filter((l) => l.tone === 'blocked').length,
          notRecognisedBlurred: snapshot.filter((l) => l.tone === 'unknown' && l.blur).length,
          notRecognisedShown: snapshot.filter((l) => l.tone === 'unknown' && !l.blur).length,
          allowedBlurredByHand: snapshot.filter((l) => l.tone === 'ok' && l.blur).length,
          tracking: precomputed ? 'pre-computed face tracks' : 'in-browser face detection', audio: res.hasAudio,
          seconds: Math.round(duration * 10) / 10,
        },
      })
      setExportState({ phase: 'done', url, fileName, size: res.blob.size, evidenceId, blurred: n, hasAudio: res.hasAudio })
      toast.success('Protected video exported', { description: `${fileName} · ${fmtBytes(res.blob.size)} · evidence ${evidenceId}` })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'cancelled') {
        setExportState({ phase: 'idle' })
        toast('Export cancelled', { description: 'Nothing was saved.' })
      } else setExportState({ phase: 'error', message: msg })
    } finally {
      abortRef.current = null
    }
  }

  const onSelect = (id: string) => {
    setSelected((cur) => (cur === id ? null : id))
    const l = lanes.find((x) => x.id === id)
    if (l && !player.state.exporting) {
      player.pause()
      player.seek(l.firstT + 0.05)
      if (!outlines) toast(`${l.name}: first seen at ${fmtClock(l.firstT)}`, { description: 'Turn on “Show face outlines” to see who is where.' })
    }
  }

  const subtitle = entry.origin === 'local'
    ? `Opened from this computer${entry.size ? ` · ${fmtBytes(entry.size)}` : ''} · stays in this browser, never uploaded`
    : [event?.name ?? (entry.origin === 'folder' ? 'School video folder' : undefined), entry.capturedAt ? fmtDate(entry.capturedAt) : undefined, duration ? fmtClock(duration) : undefined]
      .filter(Boolean).join(' · ')

  return (
    <div>
      {open.input}
      <PageHeader eyebrow={<BackLink />} title={entry.title} subtitle={subtitle}
        actions={<Button variant="secondary" icon={<FolderOpen className="size-4" />} onClick={open.open} disabled={player.state.exporting}>Open another video…</Button>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Stage src={entry.src} player={player} destName={destLabel(dest)} compare={compare} setCompare={setCompare}
            scan={stageScan} blurredCount={lanes.filter((l) => l.blur).length} spans={spans} />
          <Timeline lanes={lanes} duration={duration} time={player.time} onSeek={(t) => { if (!player.state.exporting) player.seek(t) }}
            selectedId={selected} onSelect={onSelect} destWhere={DEST_PHRASE[dest]}
            onToggle={(id, v) => setOverrides((o) => ({ ...o, [id]: v }))} scan={scanInfo} />
        </div>
        <div className="space-y-4">
          <SharePanel dest={dest} setDest={setDest} lanes={lanes} blurEveryone={blurEveryone} setBlurEveryone={setBlurEveryone}
            outlines={outlines} setOutlines={setOutlines} style={style} setStyle={setStyle}
            exportState={exportState} onExport={() => void onExport()} onCancel={() => abortRef.current?.abort()}
            onDownload={() => { if (exportState.phase === 'done') download(exportState.url, exportState.fileName) }}
            onReset={() => setExportState({ phase: 'idle' })} exportBlock={exportBlock} canExport={canExport}
            onBlurUnknown={() => setBlurEveryone(true)} />
          <HowItWorks precomputed={precomputed} onLibrary={() => navigate('/video')} />
        </div>
      </div>
    </div>
  )
}

function HowItWorks({ precomputed, onLibrary }: { precomputed: boolean; onLibrary: () => void }) {
  const steps = [
    { icon: <ScanFace className="size-4" />, title: 'Tracked', body: precomputed ? 'Every face was followed frame by frame when the video was added.' : 'Faces are found and followed in this browser. The video never leaves this computer.' },
    { icon: <ShieldCheck className="size-4" />, title: 'Checked', body: 'Each child is matched to their parents’ choices for the place you are sharing to.' },
    { icon: <Sparkles className="size-4" />, title: 'Hidden', body: 'Faces are blurred in the pixels of a new file, and the export is logged as evidence.' },
  ]
  return (
    <Card className="p-5">
      <div className="text-[14px] font-semibold text-ink">How the studio protects children</div>
      <ol className="mt-3 space-y-3">
        {steps.map((s) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-azure-50 text-azure">{s.icon}</span>
            <span className="text-[12.5px] leading-snug text-ink-2"><span className="font-semibold text-ink">{s.title}. </span>{s.body}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onLibrary} className="mt-4 text-[13px] font-semibold text-azure hover:underline">All videos</button>
    </Card>
  )
}
