import * as React from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import {
  AlertTriangle, ArrowLeft, Circle, Clapperboard, Download, Droplets, Grid3x3, ImageOff, Loader2, Lock, MoveHorizontal, RotateCcw,
  SquareDashed, Star, Trash2, X,
} from 'lucide-react'
import { Button, Card, Chip, Empty, Mono, PageHeader, Select, Switch } from '@/design/ui'
import { EvidenceLink, PhotoFaces, VerdictChip, type BlurStyle } from '@/design/media'
import { DEST, DESTINATIONS } from '@/data/reference'
import type { Box, DestinationKey, MediaAsset } from '@/data/types'
import { evaluateAsset, type FaceEval } from '@/engine/permission'
import { useApp } from '@/store/app'
import { useAsset, useCan, useCtx } from '@/store/hooks'
import { cn, fmtDate } from '@/lib/utils'
import { BLUR_STYLES, STRENGTH, baseCanvas, canvasToJpeg, downloadBlob, fileStem, loadImage, regionNorm, renderBlurred, type BlurTarget } from './blur'
import { DestIcon, REVIEW_LINK, actorId, isDest, photoLink } from './shared'

const PREVIEW_MAX = 1400
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const pctStyle = (b: Box): React.CSSProperties => ({ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` })
const styleIcon: Record<BlurStyle, React.ReactNode> = {
  soft: <Droplets className="size-4" />, pixel: <Grid3x3 className="size-4" />, sticker: <Star className="size-4" />, solid: <Circle className="size-4 fill-current" />,
}

export default function BlurStudio() {
  const { assetId = '' } = useParams()
  const asset = useAsset(assetId)
  if (!asset) {
    return (
      <div>
        <StudioHeader />
        <Card>
          <Empty icon={<ImageOff className="size-6" />} title="We couldn’t find that photo"
            body="It may have been removed, or the event photos are still being prepared."
            action={<Button variant="soft" to="/publish">Back to Publish Guard</Button>} />
        </Card>
      </div>
    )
  }
  if (asset.kind === 'video') {
    return (
      <div>
        <StudioHeader />
        <Card>
          <Empty icon={<Clapperboard className="size-6" />} title="This is a video"
            body="Videos are protected frame by frame in Video Studio, with faces tracked across the clip."
            action={<Button variant="soft" to="/video">Open Video Studio</Button>} />
        </Card>
      </div>
    )
  }
  return <Studio key={asset.id} asset={asset} />
}

function StudioHeader({ subtitle, back = '/publish' }: { subtitle?: React.ReactNode; back?: string }) {
  return (
    <PageHeader eyebrow="Publish Guard · Blur Studio" title="Blur Studio"
      subtitle={subtitle ?? 'Protect faces in the copy that leaves school. The original stays locked in the school library.'}
      actions={<Button variant="secondary" to={back} icon={<ArrowLeft className="size-4" />}>Back to Publish Guard</Button>} />
  )
}

function Studio({ asset }: { asset: MediaAsset }) {
  const [params, setParams] = useSearchParams()
  const qDest = params.get('dest')
  const dest: DestinationKey = isDest(qDest) ? qDest : 'instagram'
  const d = DEST[dest]
  const ctx = useCtx()
  const canNames = useCan('view-names')
  const canExport = useCan('publish')
  const event = useApp((s) => s.events.find((e) => e.id === asset.eventId))
  const siblings = useApp(useShallow((s) => s.assets.filter((a) => a.eventId === asset.eventId && a.kind === 'photo' && a.id !== asset.id)))
  const ev = React.useMemo(() => evaluateAsset(ctx, asset, dest), [ctx, asset, dest])

  const [style, setStyle] = React.useState<BlurStyle>('soft')
  const [strength, setStrength] = React.useState<number>(STRENGTH.default)
  const [auto, setAuto] = React.useState(true)
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})
  const [areas, setAreas] = React.useState<{ id: string; box: Box }[]>([])
  const [watermark, setWatermark] = React.useState(false)
  const [split, setSplit] = React.useState(0)
  const [drawing, setDrawing] = React.useState(false)
  const [drag, setDrag] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [hover, setHover] = React.useState<string | null>(null)
  const [img, setImg] = React.useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [saved, setSaved] = React.useState<{ id: string; file: string } | null>(null)

  // auto-set follows the destination: a new destination re-applies "blur everyone without permission"
  React.useEffect(() => setOverrides({}), [dest])

  React.useEffect(() => {
    let alive = true
    setImg(null)
    setLoadError(null)
    loadImage(asset.src).then((i) => alive && setImg(i)).catch((e: Error) => alive && setLoadError(e.message))
    return () => { alive = false }
  }, [asset.src])

  React.useEffect(() => {
    if (!drawing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawing(false); setDrag(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawing])

  const isBlurred = (f: FaceEval) => overrides[f.face.id] ?? (auto && f.state !== 'ok')
  const blurredFaces = ev.faces.filter(isBlurred)
  const uncovered = ev.faces.filter((f) => f.state !== 'ok' && !isBlurred(f))
  const mainBlocked = ev.faces.some((f) => f.face.main && f.state === 'blocked')
  const targets: BlurTarget[] = [
    ...blurredFaces.map((f) => ({ box: f.face.box, shape: 'face' as const })),
    ...areas.map((a) => ({ box: a.box, shape: 'area' as const })),
  ]
  const targetsKey = JSON.stringify(targets)
  const wmText = `Cleared for ${d.label} · ${fmtDate(new Date().toISOString())}`
  const styleLabel = BLUR_STYLES.find((s) => s.key === style)!.label

  /* ---------------- canvas rendering ---------------- */
  const displayRef = React.useRef<HTMLCanvasElement>(null)
  const processedRef = React.useRef<HTMLCanvasElement | null>(null)
  const paint = () => {
    const out = displayRef.current
    const p = processedRef.current
    if (!out || !p || !img) return
    if (out.width !== p.width) out.width = p.width
    if (out.height !== p.height) out.height = p.height
    const c = out.getContext('2d')!
    c.drawImage(p, 0, 0)
    if (split > 0) {
      c.save()
      c.beginPath()
      c.rect(0, 0, (p.width * split) / 100, p.height)
      c.clip()
      c.drawImage(baseCanvas(img, PREVIEW_MAX), 0, 0)
      c.restore()
    }
  }
  React.useEffect(() => {
    if (!img) return
    processedRef.current = renderBlurred(img, targets, style, strength, {
      maxSide: PREVIEW_MAX, watermark: watermark ? wmText : null, canvas: processedRef.current ?? undefined,
    })
    paint()
  }, [img, targetsKey, style, strength, watermark, wmText])
  React.useEffect(() => paint(), [split])

  /* ---------------- fit the photo to the stage ---------------- */
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [fit, setFit] = React.useState<{ w: number; h: number } | null>(null)
  const natW = img?.naturalWidth || asset.w
  const natH = img?.naturalHeight || asset.h
  React.useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const availW = el.clientWidth - 48
      const availH = Math.max(340, window.innerHeight - 300)
      const k = Math.min(availW / natW, availH / natH)
      setFit({ w: Math.max(1, Math.floor(natW * k)), h: Math.max(1, Math.floor(natH * k)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [natW, natH])

  /* ---------------- drawing extra areas ---------------- */
  const photoRef = React.useRef<HTMLDivElement>(null)
  const pt = (e: React.PointerEvent) => {
    const r = photoRef.current!.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
  }
  const rectOf = (g: { x0: number; y0: number; x1: number; y1: number }): Box => [Math.min(g.x0, g.x1), Math.min(g.y0, g.y1), Math.abs(g.x1 - g.x0), Math.abs(g.y1 - g.y0)]
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pt(e)
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const p = pt(e)
    setDrag({ ...drag, x1: p.x, y1: p.y })
  }
  const onUp = () => {
    if (!drag) return
    const b = rectOf(drag)
    setDrag(null)
    if (b[2] < 0.015 || b[3] < 0.015) return
    setAreas((a) => [...a, { id: `area-${Date.now().toString(36)}`, box: b }])
    setDrawing(false)
  }

  const reset = () => {
    setStyle('soft'); setStrength(STRENGTH.default); setAuto(true); setOverrides({}); setAreas([]); setWatermark(false); setSplit(0); setDrawing(false)
  }

  /* ---------------- export ---------------- */
  const blocked = !d.blurFixAllowed || uncovered.length > 0 || !canExport
  const exportJpeg = async () => {
    if (!img || busy || blocked) return
    setBusy(true)
    try {
      const full = renderBlurred(img, targets, style, strength, { watermark: watermark ? wmText : null })
      const blob = await canvasToJpeg(full, 0.92)
      full.width = full.height = 1
      const file = `${fileStem(asset.src, asset.id)}-${dest}-protected.jpg`
      downloadBlob(blob, file)
      const id = useApp.getState().addEvidence({
        type: 'blur',
        title: `Protected copy of ${asset.title ?? asset.id} made for ${d.label}`,
        actor: actorId(),
        refs: [asset.id, ...blurredFaces.map((f) => f.face.id)],
        payload: {
          destination: d.label, style: styleLabel, strength: style === 'soft' || style === 'pixel' ? strength : '—',
          'faces blurred': blurredFaces.length, 'extra areas': areas.length, label: watermark ? wmText : 'none', file,
          original: 'Kept locked in the school library',
        },
      })
      setSaved({ id, file })
      toast.success('Protected copy downloaded', { description: `Evidence ${id}. The original stays locked in the school library.` })
    } catch (err) {
      toast.error('Could not export the JPEG', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  const back = `/publish?event=${encodeURIComponent(asset.eventId)}&dest=${dest}`
  const nameOf = (f: FaceEval, i: number) =>
    f.face.review === 'non-student' ? 'Adult / visitor' : !f.student ? 'Not recognised' : canNames ? `${f.student.name} · ${f.student.classId}` : `Child ${i + 1} · ${f.student.classId}`
  const toggleFace = (f: FaceEval, v?: boolean) => setOverrides((o) => ({ ...o, [f.face.id]: v ?? !isBlurred(f) }))

  const more = React.useMemo(
    () => siblings.map((a) => evaluateAsset(ctx, a, dest)).filter((e) => e.verdict === 'needs-blur').slice(0, 12),
    [siblings, ctx, dest],
  )

  return (
    <div>
      <StudioHeader back={back}
        subtitle={<>{event?.name ?? 'Event photo'} · {asset.title ?? asset.id}. Faces are blurred in the real pixels of the copy you export. The original stays locked in the school library.</>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- stage ---------------- */}
        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <div ref={stageRef} className="relative flex min-h-[360px] items-center justify-center rounded-2xl bg-navy p-6">
            {img && fit ? (
              <div className="flex flex-col items-center" style={{ width: fit.w }}>
                <div ref={photoRef} className="relative select-none overflow-hidden rounded-lg shadow-[0_20px_50px_rgba(0,0,0,.35)]"
                  style={{ width: fit.w, height: fit.h, touchAction: drawing ? 'none' : undefined }}>
                  <canvas ref={displayRef} className="block size-full" role="img" aria-label="Protected preview of the photo" />

                  {!drawing && ev.faces.map((f, i) => {
                    const on = isBlurred(f)
                    return (
                      <button key={f.face.id} type="button" onClick={() => toggleFace(f)}
                        onMouseEnter={() => setHover(f.face.id)} onMouseLeave={() => setHover(null)}
                        aria-label={`${nameOf(f, i)}: ${on ? 'blurred' : 'visible'}. Click to ${on ? 'show' : 'blur'}.`}
                        className={cn('absolute rounded-[45%] border-2 transition-colors focus-visible:outline-none',
                          hover === f.face.id ? 'border-white/90 bg-white/5' : 'border-transparent hover:border-white/80 focus-visible:border-white')}
                        style={pctStyle(regionNorm(f.face.box))} />
                    )
                  })}

                  {areas.map((a, i) => (
                    <div key={a.id} className={cn('pointer-events-none absolute border border-dashed', hover === a.id ? 'border-white' : 'border-white/60')} style={pctStyle(a.box)}>
                      <span className="absolute -left-2 -top-2 flex size-4 items-center justify-center rounded-full bg-white text-[9.5px] font-bold text-ink shadow">{i + 1}</span>
                    </div>
                  ))}

                  {split > 0 && (
                    <>
                      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,.4)]" style={{ left: `${split}%` }}>
                        <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow">
                          <MoveHorizontal className="size-4" />
                        </span>
                      </div>
                      {split > 14 && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-navy/70 px-2 py-0.5 text-[11px] font-semibold text-white">Before · original</span>}
                    </>
                  )}
                  {split < 86 && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-navy/70 px-2 py-0.5 text-[11px] font-semibold text-white">After · protected</span>}

                  {drawing && (
                    <div className="absolute inset-0 cursor-crosshair bg-navy/10" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
                      {!drag && <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink shadow">Drag over anything else to blur · Esc to cancel</span>}
                      {drag && <div className="absolute border-2 border-dashed border-white bg-white/15" style={pctStyle(rectOf(drag))} />}
                    </div>
                  )}
                </div>

                <label className="mt-4 flex w-full items-center gap-3 text-white/80">
                  <span className="text-[12px] font-semibold">Before / after</span>
                  <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))}
                    aria-label="Compare with the original" className="h-1.5 flex-1 cursor-pointer accent-[#7fb3ff]" />
                  <span className="w-20 text-right text-[12px]">{split === 0 ? 'Protected' : split === 100 ? 'Original' : 'Comparing'}</span>
                </label>
              </div>
            ) : loadError ? (
              <div className="text-center text-white/80"><ImageOff className="mx-auto mb-2 size-6" /><p className="text-sm">{loadError}</p></div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="size-4 animate-spin" />Loading the full-resolution photo…</div>
            )}
          </div>

          {more.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[12.5px] font-semibold text-ink-2">More {event?.name ?? 'event'} photos that need a blur for {d.label}</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {more.map((e) => (
                  <Link key={e.asset.id} to={`/publish/blur/${encodeURIComponent(e.asset.id)}?dest=${dest}`} className="w-16 shrink-0 rounded-lg ring-azure/40 transition hover:ring-2" title={e.asset.title ?? e.asset.id}>
                    <PhotoFaces asset={e.asset} evals={e.faces} aspect={0.8} blurBlocked rounded="rounded-lg" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- controls ---------------- */}
        <Card className="divide-y divide-line self-start">
          <section className="p-5">
            <div className="flex items-center justify-between">
              <div className="label-caps">Protect for</div>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-3 hover:text-ink"><RotateCcw className="size-3.5" />Reset</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken"><DestIcon dest={dest} /></span>
              <Select aria-label="Destination" value={dest} options={DESTINATIONS.map((x) => ({ value: x.key, label: x.label }))}
                onChange={(e) => { const n = new URLSearchParams(params); n.set('dest', e.target.value); setParams(n, { replace: true }) }} />
            </div>
            <div className="mt-3 flex items-start gap-2">
              <VerdictChip verdict={ev.verdict} size="sm" className="mt-px" />
              <p className="text-[12.5px] leading-snug text-ink-2">{ev.reason}</p>
            </div>
            {!d.blurFixAllowed && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn">
                <Lock className="mt-0.5 size-3.5 shrink-0" />{d.note ?? 'Blurred faces are never used here.'} Pick a public or school destination to export a blurred copy.
              </p>
            )}
            {d.blurFixAllowed && mainBlocked && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />The main child in this photo isn’t cleared, so a blurred copy won’t make a good post. Consider another photo.
              </p>
            )}
          </section>

          <section className="p-5">
            <div className="label-caps">Blur style</div>
            <div role="radiogroup" aria-label="Blur style" className="mt-2 grid grid-cols-2 gap-2">
              {BLUR_STYLES.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={style === s.key} onClick={() => setStyle(s.key)}
                  className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
                    style === s.key ? 'border-azure bg-azure-50 text-azure' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink')}>
                  {styleIcon[s.key]}{s.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink-3">{BLUR_STYLES.find((s) => s.key === style)!.hint}</p>
            {(style === 'soft' || style === 'pixel') && (
              <label className="mt-3 block">
                <span className="flex items-center justify-between text-[12.5px]"><span className="font-semibold text-ink-2">Strength</span><span className="text-ink-3 num">{strength} of {STRENGTH.max}</span></span>
                <input type="range" min={STRENGTH.min} max={STRENGTH.max} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="mt-1.5 w-full cursor-pointer accent-azure" />
              </label>
            )}
          </section>

          <section className="p-5">
            <div className="label-caps">Faces in this photo ({ev.faces.length})</div>
            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-sunken/70 p-3">
              <Switch checked={auto} onCheckedChange={(v) => { setAuto(v); setOverrides({}) }} label="Blur everyone without permission" />
              <span className="text-[13px] leading-snug">
                <span className="font-semibold text-ink">Blur everyone without permission</span>
                <span className="block text-[12px] text-ink-3">Set from each parent’s choice for {d.label}. Includes faces we couldn’t recognise.</span>
              </span>
            </label>
            {ev.faces.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-ink-3">No faces were found in this photo.</p>
            ) : (
              <ul className="mt-2">
                {ev.faces.map((f, i) => {
                  const on = isBlurred(f)
                  return (
                    <li key={f.face.id} onMouseEnter={() => setHover(f.face.id)} onMouseLeave={() => setHover(null)}
                      className={cn('-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors', hover === f.face.id && 'bg-azure-50/70')}>
                      <FaceCrop asset={asset} box={f.face.box} blurred={on} locked={!!f.student?.protected} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-ink">{nameOf(f, i)}</span>
                          {f.face.main && <span className="shrink-0 rounded bg-sunken px-1 text-[10px] font-semibold text-ink-3">Main</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Chip size="sm" icon={false} tone={f.state === 'ok' ? 'ok' : f.state === 'blocked' ? 'warn' : 'info'}>
                            {f.state === 'ok' ? 'Cleared' : f.state === 'blocked' ? 'No permission' : 'Not recognised'}
                          </Chip>
                          <span className="truncate text-[11.5px] text-ink-3" title={f.reason}>{f.reason}</span>
                        </div>
                      </div>
                      <Switch checked={on} onCheckedChange={(v) => toggleFace(f, v)} label={`Blur ${nameOf(f, i)}`} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="label-caps">Extra blur areas</div>
              <Button size="sm" variant={drawing ? 'secondary' : 'soft'} icon={drawing ? <X className="size-3.5" /> : <SquareDashed className="size-3.5" />}
                onClick={() => { setDrawing((v) => !v); setDrag(null) }} disabled={!img}>
                {drawing ? 'Cancel' : 'Add blur area'}
              </Button>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-3">{drawing ? 'Drag a rectangle on the photo.' : 'For name badges, ID cards, a named school bag or a car number plate.'}</p>
            {areas.length > 0 && (
              <ul className="mt-2 space-y-1">
                {areas.map((a, i) => (
                  <li key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)}
                    className="flex items-center gap-2 rounded-lg bg-sunken/60 px-2.5 py-1.5 text-[12.5px] text-ink-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink shadow-sm">{i + 1}</span>
                    Area {i + 1}
                    <button type="button" aria-label={`Remove area ${i + 1}`} onClick={() => setAreas((x) => x.filter((y) => y.id !== a.id))}
                      className="ml-auto rounded p-1 text-ink-3 hover:bg-surface hover:text-risk"><Trash2 className="size-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <Switch checked={watermark} onCheckedChange={setWatermark} label="Add a cleared label" />
              <span className="text-[13px] leading-snug">
                <span className="font-semibold text-ink">Add a “cleared” label</span>
                <span className="block text-[12px] text-ink-3">“{wmText}” in the corner</span>
              </span>
            </label>
          </section>

          <section className="p-5">
            <Button size="lg" className="w-full" onClick={exportJpeg} disabled={!img || busy || blocked}
              icon={busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}>
              {busy ? 'Preparing JPEG…' : 'Export JPEG'}
            </Button>
            {uncovered.length > 0 && d.blurFixAllowed && (
              <p className="mt-2.5 text-[12px] leading-snug text-warn">
                {uncovered.length} face{uncovered.length > 1 ? 's' : ''} without permission {uncovered.length > 1 ? 'are' : 'is'} still visible. Blur {uncovered.length > 1 ? 'them' : 'it'}, or{' '}
                <Link to={uncovered.some((f) => f.state === 'unknown') ? REVIEW_LINK : photoLink(asset.id, dest)} className="font-semibold underline">check faces</Link> if {uncovered.length > 1 ? 'they are adults' : 'it is an adult'}.
              </p>
            )}
            {!canExport && <p className="mt-2.5 text-[12px] text-warn">Only Marketing or the Principal can export.</p>}
            <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink-3"><Lock className="size-3.5" />Original stays locked in the school library</p>
            {saved && (
              <p className="mt-2 text-[12px] text-ink-2">Saved <Mono>{saved.file}</Mono> · Evidence <EvidenceLink id={saved.id} /></p>
            )}
          </section>
        </Card>
      </div>
    </div>
  )
}

/** Small round crop of one face, taken from the photo itself (blurred when it will be blurred). */
function FaceCrop({ asset, box, blurred, locked }: { asset: MediaAsset; box: Box; blurred: boolean; locked: boolean }) {
  if (locked) {
    return <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-risk-bg text-risk ring-1 ring-line" title="Protected child"><Lock className="size-4" /></span>
  }
  const [x, y, w, h] = box
  const side = Math.max(w * asset.w, h * asset.h) * 1.3
  const sw = Math.min(1, side / asset.w)
  const sh = Math.min(1, side / asset.h)
  const left = Math.min(Math.max(x + w / 2 - sw / 2, 0), 1 - sw)
  const top = Math.min(Math.max(y + h / 2 - sh / 2, 0), 1 - sh)
  const style: React.CSSProperties = {
    backgroundImage: `url("${asset.src}")`,
    backgroundSize: `${100 / sw}% ${100 / sh}%`,
    backgroundPosition: `${sw >= 1 ? 0 : (left / (1 - sw)) * 100}% ${sh >= 1 ? 0 : (top / (1 - sh)) * 100}%`,
    filter: blurred ? 'blur(2.5px)' : undefined,
    transform: blurred ? 'scale(1.2)' : undefined,
  }
  return (
    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-sunken ring-1 ring-line">
      <span className="absolute inset-0 bg-no-repeat" style={style} />
    </span>
  )
}
