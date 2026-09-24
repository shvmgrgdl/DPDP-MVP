import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowRight, Bookmark, CalendarDays, Check, ChevronDown, CircleCheck, Download, EyeOff, FileCheck2, Heart, ImageOff, Info,
  Loader2, Lock, MessageCircle, Radio, ScanFace, Send, ShieldCheck, Wand2,
} from 'lucide-react'
import { Button, Card, Dialog, Empty, Mono, PageHeader, Switch, toneText, type Tone } from '@/design/ui'
import { EvidenceLink, MediaCaption, PhotoFaces, VerdictChip } from '@/design/media'
import { DEST, DESTINATIONS } from '@/data/reference'
import type { DestinationKey, MediaAsset, SchoolEvent } from '@/data/types'
import { evaluateAsset, type AssetEval } from '@/engine/permission'
import { useApp } from '@/store/app'
import { useCan, useCtx } from '@/store/hooks'
import { cn, fmtDate } from '@/lib/utils'
import { CountUp, DEST_GROUPS, DEST_INFO, DestIcon, childLabel, firstName, fmtBytes, isDest, purposeLabel, reviewLink } from './shared'
import { EXPORT_BLUR, exportSafeSet, type SafeSetResult } from './export'

const EMPTY: MediaAsset[] = []
const COLUMN_LIMIT = 12
const spring = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 } as const

type ExportDone = SafeSetResult & { dest: DestinationKey; eventName: string; preview: AssetEval[] }

export default function PublishPage() {
  const [params, setParams] = useSearchParams()
  const events = useApp((s) => s.events)
  const assets = useApp((s) => s.assets)
  const publications = useApp((s) => s.publications)
  const ctx = useCtx()
  const canPublish = useCan('publish')
  const canNames = useCan('view-names')
  const reduce = useReducedMotion()

  const photosByEvent = React.useMemo(() => {
    const m = new Map<string, MediaAsset[]>()
    for (const a of assets) {
      if (a.kind !== 'photo') continue
      const l = m.get(a.eventId)
      if (l) l.push(a)
      else m.set(a.eventId, [a])
    }
    return m
  }, [assets])

  const qEvent = params.get('event')
  const eventId = qEvent && events.some((e) => e.id === qEvent) ? qEvent : events.find((e) => e.id === 'annual-day')?.id ?? events[0]?.id ?? ''
  const event = events.find((e) => e.id === eventId)
  const qDest = params.get('dest')
  const dest: DestinationKey = isDest(qDest) ? qDest : 'instagram'
  const d = DEST[dest]

  const [blurUnknowns, setBlurUnknowns] = React.useState(false)
  const unknownsBlurred = blurUnknowns && d.blurFixAllowed
  const photos = photosByEvent.get(eventId) ?? EMPTY

  const evals = React.useMemo(() => photos.map((a) => evaluateAsset(ctx, a, dest, { blurUnknowns: unknownsBlurred })), [photos, ctx, dest, unknownsBlurred])
  const ready = evals.filter((e) => e.verdict === 'ready')
  const fixed = evals.filter((e) => e.verdict === 'needs-blur')
  const held = [...evals.filter((e) => e.verdict === 'check-faces'), ...evals.filter((e) => e.verdict === 'keep-private')]
  const faceCount = evals.reduce((n, e) => n + e.faces.length, 0)
  const exportable = ready.length + fixed.length

  /** Per-destination "can go" counts for the picker, so the audiences can be compared at a glance. */
  const canGo = React.useMemo(() => {
    const out = {} as Record<DestinationKey, number>
    for (const x of DESTINATIONS) {
      out[x.key] = photos.filter((a) => {
        const v = evaluateAsset(ctx, a, x.key, { blurUnknowns: blurUnknowns && x.blurFixAllowed }).verdict
        return v === 'ready' || v === 'needs-blur'
      }).length
    }
    return out
  }, [photos, ctx, blurUnknowns])

  const liveHere = React.useMemo(
    () => new Set(publications.filter((p) => p.destination === dest && p.status === 'live').map((p) => p.assetId)),
    [publications, dest],
  )
  const flagged = publications.filter((p) => p.status === 'takedown-requested').length

  const setQuery = (patch: { event?: string; dest?: DestinationKey }) => {
    const next = new URLSearchParams(params)
    if (patch.event) next.set('event', patch.event)
    if (patch.dest) next.set('dest', patch.dest)
    setParams(next, { replace: true })
  }

  // A short, honest "checking" moment on arrival and on a new event; the engine itself is instant.
  const hasPhotos = photos.length > 0
  const [scanning, setScanning] = React.useState(!reduce && hasPhotos)
  React.useEffect(() => {
    if (reduce || !hasPhotos) {
      setScanning(false)
      return
    }
    setScanning(true)
    const t = setTimeout(() => setScanning(false), 700)
    return () => clearTimeout(t)
  }, [eventId, hasPhotos, reduce])

  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null)
  const [done, setDone] = React.useState<ExportDone | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const onExport = async () => {
    if (!exportable || progress) return
    setProgress({ done: 0, total: exportable })
    try {
      const res = await exportSafeSet({
        event, eventId, dest, ready, fixed, held, blurUnknowns: unknownsBlurred, ctx,
        onProgress: (n, total) => setProgress({ done: n, total }),
      })
      setDone({ ...res, dest, eventName: event?.name ?? eventId, preview: [...fixed, ...ready].slice(0, 6) })
      setDialogOpen(true)
    } catch (err) {
      toast.error('The export didn’t finish', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setProgress(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Publish Guard"
        title="Where will these photos go?"
        subtitle="Pick an event and a destination. Every face is checked against its parent’s latest choice before anything leaves school."
        actions={
          <Button variant="secondary" to="/publish/live" icon={<Radio className="size-4" />}>
            Live posts
            {flagged > 0 && <span className="rounded-full bg-marigold px-1.5 text-[11px] font-bold text-navy num">{flagged}</span>}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-6">
          <EventSelect events={events} photosByEvent={photosByEvent} value={eventId} onChange={(id) => setQuery({ event: id })} />
          <DestinationPicker value={dest} onChange={(k) => setQuery({ dest: k })} canGo={canGo} total={photos.length} />
        </aside>

        <section className="min-w-0" aria-live="polite">
          {done && !dialogOpen && done.dest === dest && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ok/20 bg-ok-bg px-4 py-3 text-[13.5px] text-ok">
              <CircleCheck className="size-4 shrink-0" />
              <span className="font-semibold">Exported {done.originals + done.blurred} photos for {DEST[done.dest].label}</span>
              <span className="text-ink-2">Evidence <EvidenceLink id={done.evidenceId} /></span>
              <Link to="/publish/live" className="ml-auto inline-flex items-center gap-1 font-semibold text-azure hover:underline">View live posts <ArrowRight className="size-3.5" /></Link>
            </motion.div>
          )}

          {!photos.length ? (
            <Card>
              <Empty
                icon={<ImageOff className="size-6" />}
                title={assets.length ? `No photos in ${event?.name ?? 'this event'} yet` : 'Photos are still being prepared'}
                body={assets.length
                  ? 'Pick another event, or add photos. Every photo is checked here automatically once it arrives.'
                  : 'Event photos appear here as soon as they are uploaded and matched to the class roster.'}
                action={<Button variant="soft" to="/media/upload">Add photos</Button>}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="px-6 pb-4 pt-5">
                <div className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-ink">
                  <span>{event?.name}</span>
                  <ArrowRight className="size-4 text-ink-3" />
                  <span className="inline-flex items-center gap-1.5"><DestIcon dest={dest} className="size-[18px]" />{d.label}</span>
                </div>
                <p className="mt-1 text-[13px] text-ink-3">
                  Checked <span className="num">{photos.length}</span> photos and <span className="num">{faceCount}</span> faces against each parent’s choice for “{purposeLabel(dest)}”.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-line bg-[#fbfaf7] px-6 py-2.5">
                <label className={cn('flex cursor-pointer items-center gap-3', !d.blurFixAllowed && 'cursor-not-allowed opacity-60')}>
                  <Switch checked={unknownsBlurred} onCheckedChange={setBlurUnknowns} disabled={!d.blurFixAllowed} label="Also blur faces we couldn’t recognise" />
                  <span className="text-[13px] leading-snug">
                    <span className="font-semibold text-ink">Also blur faces we couldn’t recognise</span>
                    <span className="ml-1.5 text-[12px] text-ink-3">{d.blurFixAllowed ? 'instead of holding those photos back' : `not available for ${d.label}`}</span>
                  </span>
                </label>
                {d.blurFixAllowed && fixed.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3"><Wand2 className="size-3.5" />Open a blurred photo to fine-tune it in Blur Studio</span>
                )}
              </div>

              {!d.blurFixAllowed && (
                <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-warn/20 bg-warn-bg px-4 py-3 text-[13px] text-warn">
                  <EyeOff className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <span className="font-semibold">Print, newspapers and paid ads never use blurred faces.</span>{' '}
                    <span className="text-ink-2">{d.note ?? 'Every child shown needs their parent’s permission for this use.'} Photos that would need a blur are held back instead.</span>
                  </div>
                </div>
              )}

              <LayoutGroup id="publish-guard">
                {scanning ? (
                  <ScanPanel photos={photos} faceCount={faceCount} dest={dest} />
                ) : (
                  <div className="grid gap-4 p-4 md:grid-cols-3 md:p-5">
                    <Column index={0} tone="ok" icon={<CircleCheck className="size-4" />} title="Ready to share" count={ready.length}
                      blurb={`Everyone in these photos is cleared for ${d.short === 'Print' ? 'print' : d.label}.`}
                      empty={<ColumnEmpty icon={<Info className="size-4" />} text={`No photo is cleared as taken for ${d.label}.`} />}>
                      <ThumbGrid items={ready} render={(e) => <ReadyThumb key={e.asset.id} e={e} live={liveHere.has(e.asset.id)} />} />
                    </Column>
                    <Column index={1} tone="warn" icon={<EyeOff className="size-4" />} title="Fixed with blur" count={fixed.length}
                      blurb="Children without permission are blurred in the copy that leaves school."
                      empty={<ColumnEmpty icon={d.blurFixAllowed ? <Check className="size-4" /> : <Lock className="size-4" />}
                        text={d.blurFixAllowed ? 'No photo needs a blur.' : `Blur is never used for ${d.label}.`} />}>
                      <ThumbGrid items={fixed} render={(e) => <FixedThumb key={e.asset.id} e={e} dest={dest} canNames={canNames} live={liveHere.has(e.asset.id)} />} />
                    </Column>
                    <Column index={2} tone="risk" icon={<Lock className="size-4" />} title="Held back" count={held.length}
                      blurb="Not included in the export. Each one says why."
                      empty={<ColumnEmpty icon={<Check className="size-4" />} text="Nothing held back. Every photo can go." />}>
                      <HeldList items={held} canNames={canNames} />
                    </Column>
                  </div>
                )}
              </LayoutGroup>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-[#fbfaf7] px-6 py-3 text-[12px] text-ink-3">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-ok" />Faces are matched to the class roster, then checked against the parent’s latest choice. Unrecognised faces are never guessed.</span>
                <MediaCaption className="ml-auto" />
              </div>
            </Card>
          )}

          {photos.length > 0 && (
            <div className="sticky bottom-4 z-20 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface/95 px-5 py-4 shadow-[var(--shadow-pop)] backdrop-blur">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-ink">
                    {exportable ? <>Safe set for {d.label}: <span className="num">{exportable}</span> photo{exportable === 1 ? '' : 's'}</> : `Nothing can go to ${d.label} yet`}
                  </div>
                  <div className="text-[12.5px] text-ink-3">
                    {exportable
                      ? <><span className="num">{ready.length}</span> as taken · <span className="num">{fixed.length}</span> with faces blurred · evidence.json and evidence.html included{held.length ? <> · <span className="num">{held.length}</span> held back</> : null}</>
                      : 'Check the held-back photos, or pick a destination with a wider audience permission.'}
                    {!canPublish && <span className="block text-warn">Only Marketing or the Principal can export.</span>}
                  </div>
                </div>
                <Button size="lg" onClick={onExport} disabled={!exportable || !!progress || !canPublish || scanning}
                  icon={progress ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}>
                  {progress ? `Preparing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : `Export safe set (${exportable})`}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {done && <ExportDialog open={dialogOpen} onOpenChange={setDialogOpen} done={done} />}
    </div>
  )
}

/* ------------------------------------------------------------------ pickers */

function EventSelect({ events, photosByEvent, value, onChange }: { events: SchoolEvent[]; photosByEvent: Map<string, MediaAsset[]>; value: string; onChange: (id: string) => void }) {
  const ev = events.find((e) => e.id === value)
  const cover = photosByEvent.get(value)?.[0]
  const count = photosByEvent.get(value)?.length ?? 0
  return (
    <div>
      <div className="label-caps mb-2">1 · Event</div>
      <div className="relative flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-azure/30 hover:border-line-strong">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-sunken">
          {cover ? <img src={cover.src} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-ink-3"><CalendarDays className="size-5" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{ev?.name ?? 'Choose an event'}</div>
          <div className="text-[12px] text-ink-3">{ev ? fmtDate(ev.date) : ''} · <span className="num">{count}</span> photo{count === 1 ? '' : 's'}</div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-ink-3" />
        <select aria-label="Event" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name} · {photosByEvent.get(e.id)?.length ?? 0} photos</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function DestinationPicker({ value, onChange, canGo, total }: { value: DestinationKey; onChange: (k: DestinationKey) => void; canGo: Record<DestinationKey, number>; total: number }) {
  return (
    <div>
      <div className="label-caps mb-2">2 · Destination</div>
      <div role="radiogroup" aria-label="Destination" className="space-y-4">
        {DEST_GROUPS.map((g) => (
          <div key={g.key}>
            <div className="mb-1.5 flex items-baseline justify-between px-0.5">
              <span className="text-[12.5px] font-semibold text-ink-2">{g.label}</span>
              <span className="text-[11px] text-ink-3">{g.hint}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
              {g.dests.map((k) => (
                <DestCard key={k} dest={k} selected={value === k} onSelect={() => onChange(k)} canGo={canGo[k]} total={total} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DestCard({ dest, selected, onSelect, canGo, total }: { dest: DestinationKey; selected: boolean; onSelect: () => void; canGo: number; total: number }) {
  const d = DEST[dest]
  const info = DEST_INFO[dest]
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={cn('group relative flex w-full items-start gap-3 rounded-xl border bg-surface px-3 py-2.5 text-left transition-[border-color,box-shadow,background-color]',
        selected ? 'border-azure shadow-[0_0_0_3px_rgba(0,81,213,0.14)]' : 'border-line hover:border-line-strong hover:bg-[#fcfbf8]')}>
      <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors', selected ? 'bg-azure-50' : 'bg-sunken')}>
        <DestIcon dest={dest} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">{d.label}</span>
          {!d.blurFixAllowed && <span className="shrink-0 rounded bg-sunken px-1.5 py-px text-[10px] font-semibold text-ink-3">No blur</span>}
          {total > 0 && (
            <span className={cn('ml-auto shrink-0 text-[11px] font-semibold num', canGo === 0 ? 'text-risk' : canGo === total ? 'text-ok' : 'text-ink-3')}
              title={`${canGo} of ${total} photos can go here`}>
              {canGo}/{total}
            </span>
          )}
        </span>
        <span className="block truncate text-[12.5px] text-ink-2">{info.meaning}</span>
        <span className="block truncate text-[11.5px] text-ink-3">{info.audience}</span>
      </span>
      {selected && (
        <motion.span layoutId="dest-check" transition={spring} className="absolute -left-px top-3 bottom-3 w-[3px] rounded-full bg-azure" />
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ results */

function ScanPanel({ photos, faceCount, dest }: { photos: MediaAsset[]; faceCount: number; dest: DestinationKey }) {
  return (
    <div className="relative overflow-hidden px-6 py-7">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
        <ScanFace className="size-4 animate-pulse text-azure" />
        Checking {photos.length} photos and {faceCount} faces against parent choices for {DEST[dest].label}…
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {photos.slice(0, 40).map((a) => (
          <motion.div key={a.id} layoutId={`pg-${a.id}`} transition={spring} className="w-12 overflow-hidden" style={{ borderRadius: 8 }}>
            <PhotoFaces asset={a} aspect={0.8} rounded="rounded-none" loading="eager" />
          </motion.div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="scanline h-full w-full bg-[linear-gradient(to_bottom,transparent_35%,rgba(0,81,213,0.10)_50%,transparent_65%)]" />
      </div>
    </div>
  )
}

const columnTint: Record<string, string> = { ok: 'bg-ok-bg/45', warn: 'bg-warn-bg/50', risk: 'bg-risk-bg/40' }

function Column({ index, tone, icon, title, count, blurb, empty, children }: {
  index: number; tone: Tone; icon: React.ReactNode; title: string; count: number; blurb: string; empty: React.ReactNode; children: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.04 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex min-w-0 flex-col rounded-2xl p-3', columnTint[tone])}>
      <div className="px-1.5 pb-3 pt-1">
        <div className={cn('flex items-center gap-1.5 text-[13px] font-semibold', toneText[tone])}>{icon}{title}</div>
        <div className={cn('mt-1.5 font-display text-[46px] font-semibold leading-none tracking-tight', toneText[tone])}><CountUp value={count} /></div>
        <p className="mt-2 text-[12.5px] leading-snug text-ink-2">{blurb}</p>
      </div>
      {count === 0 ? empty : children}
    </motion.div>
  )
}

function ColumnEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong/70 bg-surface/60 px-4 py-8 text-center text-[12.5px] text-ink-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-surface text-ink-3 shadow-sm">{icon}</span>
      {text}
    </div>
  )
}

function useLimited<T>(items: T[]) {
  const [all, setAll] = React.useState(false)
  const shown = all ? items : items.slice(0, COLUMN_LIMIT)
  const more = items.length - shown.length
  const toggle = more > 0 || all ? (
    <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 w-full rounded-lg py-1.5 text-[12.5px] font-semibold text-azure hover:bg-surface/70">
      {all ? 'Show fewer' : `Show ${more} more`}
    </button>
  ) : null
  return { shown, toggle }
}

function ThumbGrid({ items, render }: { items: AssetEval[]; render: (e: AssetEval) => React.ReactNode }) {
  const { shown, toggle } = useLimited(items)
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">{shown.map(render)}</div>
      {toggle}
    </div>
  )
}

function LiveBadge() {
  return <span className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-ok shadow-sm"><span className="size-1.5 rounded-full bg-ok" />Live</span>
}

function ReadyThumb({ e, live }: { e: AssetEval; live: boolean }) {
  const n = e.faces.length
  return (
    <div className="min-w-0">
      <motion.div layoutId={`pg-${e.asset.id}`} transition={spring} className="relative overflow-hidden bg-sunken shadow-sm" style={{ borderRadius: 10 }}>
        <PhotoFaces asset={e.asset} evals={e.faces} aspect={0.8} rounded="rounded-none" />
        {live && <LiveBadge />}
      </motion.div>
      <div className="mt-1 flex items-center gap-1 truncate px-0.5 text-[11.5px] text-ink-3">
        <Check className="size-3 shrink-0 text-ok" strokeWidth={3} />
        {n ? `${n} face${n > 1 ? 's' : ''}, all cleared` : 'No faces'}
      </div>
    </div>
  )
}

function FixedThumb({ e, dest, canNames, live }: { e: AssetEval; dest: DestinationKey; canNames: boolean; live: boolean }) {
  const blocked = e.faces.filter((f) => f.state === 'blocked')
  const named = blocked.filter((f) => f.student && !f.student.protected).map((f) => firstName(f.student!.name))
  const who = canNames && named.length === blocked.length && named.length <= 3 ? named.join(', ') : `${blocked.length} ${blocked.length === 1 ? 'child' : 'children'}`
  return (
    <div className="min-w-0">
      <motion.div layoutId={`pg-${e.asset.id}`} transition={spring} className="group relative overflow-hidden bg-sunken shadow-sm" style={{ borderRadius: 10 }}>
        <PhotoFaces asset={e.asset} evals={e.faces} aspect={0.8} blurBlocked rounded="rounded-none" />
        {live && <LiveBadge />}
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-navy/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          <EyeOff className="size-3" />{blocked.length}
        </span>
        <Link to={`/publish/blur/${encodeURIComponent(e.asset.id)}?dest=${dest}`}
          className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-navy/70 via-navy/10 to-transparent p-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink shadow"><Wand2 className="size-3" />Blur Studio</span>
        </Link>
      </motion.div>
      <div className="mt-1 truncate px-0.5 text-[11.5px] text-ink-3" title={`Blurred: ${who}`}>Blurred: {who}</div>
    </div>
  )
}

function HeldList({ items, canNames }: { items: AssetEval[]; canNames: boolean }) {
  const { shown, toggle } = useLimited(items)
  return (
    <div>
      <div className="space-y-2">
        {shown.map((e) => <HeldRow key={e.asset.id} e={e} canNames={canNames} />)}
      </div>
      {toggle}
    </div>
  )
}

function HeldRow({ e, canNames }: { e: AssetEval; canNames: boolean }) {
  const blocked = e.faces.filter((f) => f.state === 'blocked')
  const detail = e.verdict === 'keep-private'
    ? [...blocked.filter((f) => f.face.main), ...blocked.filter((f) => !f.face.main)].slice(0, 2).map((f) => ({ id: f.face.id, who: childLabel(f.student, canNames), why: f.reason }))
    : []
  const extra = e.verdict === 'keep-private' ? blocked.length - detail.length : 0
  return (
    <div className="flex gap-3 rounded-xl bg-surface p-2 shadow-sm">
      <motion.div layoutId={`pg-${e.asset.id}`} transition={spring} className="w-14 shrink-0 self-start overflow-hidden bg-sunken" style={{ borderRadius: 8 }}>
        <PhotoFaces asset={e.asset} evals={e.faces} aspect={0.8} rounded="rounded-none" className="saturate-[.55]" />
      </motion.div>
      <div className="min-w-0 flex-1 py-0.5">
        <VerdictChip verdict={e.verdict} size="sm" />
        <p className="mt-1 text-[12.5px] leading-snug text-ink">{e.reason}</p>
        {detail.map((x) => (
          <p key={x.id} className="mt-0.5 text-[11.5px] leading-snug text-ink-3"><span className="font-semibold text-ink-2">{x.who}:</span> {x.why}</p>
        ))}
        {extra > 0 && <p className="mt-0.5 text-[11.5px] text-ink-3">and {extra} more</p>}
        <Link to={reviewLink(e.asset.id)} className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-azure hover:underline">
          Check faces <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ success */

function ExportDialog({ open, onOpenChange, done }: { open: boolean; onOpenChange: (v: boolean) => void; done: ExportDone }) {
  const d = DEST[done.dest]
  const n = done.originals + done.blurred
  const social = done.dest === 'instagram' || done.dest === 'facebook'
  return (
    <Dialog open={open} onOpenChange={onOpenChange} wide title="Safe set exported"
      description={`${n} photo${n === 1 ? '' : 's'} for ${d.label} are in your downloads, with the evidence pack.`}
      footer={<>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Done</Button>
        <Button to="/publish/live" icon={<Radio className="size-4" />}>View live posts</Button>
      </>}>
      <div className="grid gap-6 md:grid-cols-[272px_minmax(0,1fr)]">
        {social ? <PostPreview done={done} /> : <PreviewGrid done={done} />}
        <div className="min-w-0 space-y-4">
          <ul className="space-y-2.5 text-[14px]">
            <li className="flex items-start gap-2.5"><CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" /><span><b className="num">{done.originals}</b> photo{done.originals === 1 ? '' : 's'} as taken, original files untouched</span></li>
            <li className="flex items-start gap-2.5"><EyeOff className="mt-0.5 size-4 shrink-0 text-warn" /><span><b className="num">{done.blurred}</b> cop{done.blurred === 1 ? 'y' : 'ies'} with faces blurred into the pixels ({EXPORT_BLUR.label.toLowerCase()}, full resolution)</span></li>
            <li className="flex items-start gap-2.5"><FileCheck2 className="mt-0.5 size-4 shrink-0 text-azure" /><span><Mono>evidence.json</Mono> and a readable <Mono>evidence.html</Mono>: every face, its parent choice and notice version</span></li>
            {done.heldBack > 0 && <li className="flex items-start gap-2.5"><Lock className="mt-0.5 size-4 shrink-0 text-risk" /><span><b className="num">{done.heldBack}</b> held back and not included</span></li>}
          </ul>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-line bg-sunken/60 p-4 text-[13px]">
            <dt className="text-ink-3">Evidence record</dt><dd><EvidenceLink id={done.evidenceId} /></dd>
            <dt className="text-ink-3">Pack fingerprint</dt><dd className="truncate"><Mono>{done.fingerprint.slice(0, 24)}…</Mono></dd>
            <dt className="text-ink-3">File</dt><dd className="min-w-0 break-all"><Mono>{done.filename}</Mono> <span className="whitespace-nowrap text-ink-3">· {fmtBytes(done.size)}</span></dd>
          </dl>
          <p className="text-[12.5px] text-ink-3">These posts are now listed under Live posts. If a parent changes their choice later, the affected post is flagged there automatically. Originals stay locked in the school library.</p>
        </div>
      </div>
    </Dialog>
  )
}

function PostPreview({ done }: { done: ExportDone }) {
  const school = useApp((s) => s.school)
  const first = done.preview[0]
  const handle = `${school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.school`
  if (!first) return <PreviewGrid done={done} />
  return (
    <div>
      <div className="label-caps mb-2">Preview</div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
            <span className="flex size-full items-center justify-center rounded-full bg-[#fdf0d9] font-display text-[13px] font-bold text-[#8a5300]">{school.shortName[0]}</span>
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold text-ink">{handle}</div>
            <div className="truncate text-[11px] text-ink-3">{school.city}</div>
          </div>
          <DestIcon dest={done.dest} className="ml-auto size-4" />
        </div>
        <PhotoFaces asset={first.asset} evals={first.faces} aspect={1} blurBlocked rounded="rounded-none" loading="eager" />
        <div className="flex items-center gap-3 px-3 pt-2.5 text-ink">
          <Heart className="size-5" /><MessageCircle className="size-5" /><Send className="size-5" /><Bookmark className="ml-auto size-5" />
        </div>
        {done.preview.length > 1 && (
          <div className="mt-1 flex justify-center gap-1">
            {done.preview.map((p, i) => <span key={p.asset.id} className={cn('size-1.5 rounded-full', i === 0 ? 'bg-azure' : 'bg-line-strong')} />)}
          </div>
        )}
        <p className="px-3 pb-3 pt-1.5 text-[12.5px] leading-snug text-ink">
          <b>{handle}</b> {done.eventName}. Thank you to every family who made it special.
        </p>
      </div>
    </div>
  )
}

function PreviewGrid({ done }: { done: ExportDone }) {
  return (
    <div>
      <div className="label-caps mb-2">In the pack</div>
      <div className="grid grid-cols-3 gap-1.5">
        {done.preview.map((e) => (
          <PhotoFaces key={e.asset.id} asset={e.asset} evals={e.faces} aspect={0.8} blurBlocked={e.verdict === 'needs-blur'} rounded="rounded-lg" loading="eager" />
        ))}
      </div>
    </div>
  )
}
