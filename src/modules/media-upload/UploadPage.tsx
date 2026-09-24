import * as React from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import {
  ArrowLeft, Camera, Check, Copy, Drama, Eye, FileCheck2, FlaskConical, Fingerprint, GraduationCap, KeyRound, Link2, Loader2, Lock,
  RotateCcw, ScanFace, ShieldCheck, Trophy, UserCheck, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Chip, Mono, PageHeader } from '@/design/ui'
import { EvidenceLink, VerdictChip } from '@/design/media'
import { InstagramIcon } from '@/design/brand-icons'
import { useApp } from '@/store/app'
import { useCan } from '@/store/hooks'
import { VERDICT_META } from '@/data/reference'
import type { SchoolEvent, Verdict } from '@/data/types'
import { cn, fmtDate, fmtDateTime } from '@/lib/utils'
import { loadDescriptors, useFaceEngine } from '@/media/face'
import { phaseIndex, stageItem, summarizeItems, useStaffSession, type XFace, type XItem } from './session'
import { DropZone, EngineStatus, Filmstrip } from './parts'
import { FaceCrop, XRayPhoto, ringTone } from './XRayPhoto'
import { fetchSampleFiles, useSamples } from './samples'
import { accessState, countdown, issuePhotographerLink, revokePhotographerLink, usePhotoVendor, useTicker } from './access'

const EVENT_ICON: Record<SchoolEvent['type'], React.ReactNode> = {
  stage: <Drama className="size-4" />, sports: <Trophy className="size-4" />, academic: <FlaskConical className="size-4" />,
  classroom: <GraduationCap className="size-4" />, trip: <Camera className="size-4" />,
}

function useStudentNames() {
  const students = useApp((s) => s.students)
  return React.useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])
}

function defaultEventId(events: SchoolEvent[]) {
  return (events.find((e) => e.status === 'uploading') ?? events.find((e) => e.status === 'reviewing') ?? events[0])?.id ?? ''
}

export function UploadPage() {
  const role = useApp((s) => s.role)
  const canUpload = useCan('upload')
  const events = useApp((s) => s.events)
  const [params, setParams] = useSearchParams()
  const requested = params.get('event')
  const eventId = events.some((e) => e.id === requested) ? (requested as string) : defaultEventId(events)
  const event = events.find((e) => e.id === eventId)
  const setEvent = (id: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('event', id); return n }, { replace: true })

  const allItems = useStaffSession((s) => s.items)
  const focusKey = useStaffSession((s) => s.focusKey)
  const running = useStaffSession((s) => s.running)
  const items = React.useMemo(() => allItems.filter((i) => i.eventId === eventId), [allItems, eventId])
  const current = stageItem(items, focusKey)
  const { samples } = useSamples(eventId)
  const [samplesLoading, setSamplesLoading] = React.useState(false)

  if (role === 'photographer') return <Navigate to="/media/upload/portal" replace />

  const addFiles = (files: File[]) => {
    const n = useStaffSession.getState().add(files, eventId)
    if (n) useStaffSession.getState().focus(null)
  }
  const addSamples = async () => {
    setSamplesLoading(true)
    try {
      const files = await fetchSampleFiles(samples)
      if (!files.length) toast.error('Sample photos could not be loaded')
      else addFiles(files)
    } finally {
      setSamplesLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><ScanFace className="size-3.5" /> Media Safe · Media X-Ray</span>}
        title="Check photos as they arrive"
        subtitle="Every photo is looked at the moment it lands: faces found, matched to the class roster, each parent’s choices applied, and a record kept — before anyone can share it."
        actions={<EngineStatus />}
      />

      <EventPicker events={events} value={eventId} onChange={(id) => { setEvent(id); useStaffSession.getState().focus(null) }} />

      {!canUpload ? (
        <NoUploadAccess />
      ) : (
        <>
          <AnimatePresence mode="wait" initial={false}>
            {items.length === 0 ? (
              <motion.div key="big" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                <DropZone onFiles={addFiles} onSamples={samples.length ? () => void addSamples() : undefined} samplesLoading={samplesLoading}
                  title={`Drop ${event?.name ?? 'event'} photos here`} />
              </motion.div>
            ) : (
              <motion.div key="compact" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <DropZone compact onFiles={addFiles} onSamples={samples.length ? () => void addSamples() : undefined} samplesLoading={samplesLoading}
                  title={`Add more photos to ${event?.name ?? 'this event'}`} hint="Drag photos here or choose them. Each one is checked in turn."
                  extra={<Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} disabled={running}
                    onClick={() => { useStaffSession.getState().clear(eventId); toast.message('Ready for a new batch', { description: 'Photos already checked stay in the event library.' }) }}>New batch</Button>} />
              </motion.div>
            )}
          </AnimatePresence>

          {current && <Stage item={current} items={items} live={!focusKey || !running} />}

          {items.length > 1 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink">This batch</h2>
                <span className="text-[12.5px] text-ink-3 num">{items.filter((i) => i.phase === 'done').length} of {items.length} checked</span>
              </div>
              <Filmstrip items={items} activeKey={current?.key} onSelect={(k) => useStaffSession.getState().focus(k)} />
            </section>
          )}

          {items.some((i) => i.phase === 'done' || i.phase === 'error') && <SummaryCard items={items} eventId={eventId} eventName={event?.name ?? ''} />}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <HowItWorks />
        <PhotographerAccessCard />
      </div>
    </div>
  )
}

/* ---------------- Event picker ---------------- */

function EventPicker({ events, value, onChange }: { events: SchoolEvent[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Event" className="flex flex-wrap gap-2">
      {events.map((e) => {
        const on = e.id === value
        return (
          <button key={e.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(e.id)}
            className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
              on ? 'border-navy bg-navy text-white shadow-sm' : 'border-line bg-surface text-ink hover:border-line-strong')}>
            <span className={cn('flex size-8 items-center justify-center rounded-lg', on ? 'bg-white/12 text-white' : 'bg-sunken text-ink-2')}>{EVENT_ICON[e.type]}</span>
            <span className="leading-tight">
              <span className="block text-[13.5px] font-semibold">{e.name}</span>
              <span className={cn('block text-[11.5px]', on ? 'text-white/70' : 'text-ink-3')}>{fmtDate(e.date)} · {e.location}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NoUploadAccess() {
  const setRole = useApp((s) => s.setRole)
  return (
    <Card className="flex flex-wrap items-center gap-5 p-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-azure-50 text-azure"><Lock className="size-6" /></span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink">Uploading is for staff with upload access</div>
        <p className="mt-0.5 text-[14px] text-ink-2">Marketing, class teachers, the office and the principal can add photos here. You can still see how it works below.</p>
      </div>
      <Button variant="soft" icon={<Eye className="size-4" />} onClick={() => { setRole('marketing'); toast.message('Now viewing as Marketing & communications') }}>View as Marketing</Button>
    </Card>
  )
}

/* ---------------- Stage ---------------- */

function Stage({ item, items, live }: { item: XItem; items: XItem[]; live: boolean }) {
  const names = useStudentNames()
  const [hoverFace, setHoverFace] = React.useState<string | null>(null)
  const index = items.findIndex((i) => i.key === item.key)
  const permissionsDone = !!item.verdict
  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <div className="relative flex flex-col justify-center bg-navy px-5 pb-4 pt-5 lg:min-h-[500px]">
          <XRayPhoto item={item} names={names} hoverFace={hoverFace} onHoverFace={setHoverFace} maxHeight={440} />
          <div className="mt-4 flex min-h-5 flex-wrap items-center justify-between gap-3 text-[11.5px] text-white/70">
            <span className="truncate">{item.name}</span>
            <AnimatePresence>
              {permissionsDone && item.faces.length > 0 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                  <Legend color="#34d399" label="Cleared for Instagram" />
                  <Legend color="#fb923c" label="Not cleared" />
                  <Legend color="#93c5fd" label="Unknown" dashed />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="label-caps">Photo {index + 1} of {items.length}</span>
            {!live ? (
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => useStaffSession.getState().focus(null)}>Back to live</Button>
            ) : item.phase === 'done' && item.ms ? (
              <span className="text-[12px] text-ink-3 num">Checked in {(item.ms / 1000).toFixed(1)} s</span>
            ) : null}
          </div>
          <PipelineSteps item={item} names={names} hoverFace={hoverFace} onHoverFace={setHoverFace} ahead={items.slice(0, index).filter((i) => i.phase === 'queued').length} />
        </div>
      </div>
    </Card>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block size-2.5 rounded-full border-2', dashed && 'border-dashed')} style={{ borderColor: color }} />{label}
    </span>
  )
}

/* ---------------- Pipeline steps ---------------- */

type StepStatus = 'pending' | 'active' | 'done'
const STEPS = [
  { title: 'Faces found', icon: ScanFace },
  { title: 'Matched to roster', icon: Users },
  { title: 'Permissions applied', icon: ShieldCheck },
  { title: 'Evidence recorded', icon: FileCheck2 },
] as const

function stepStatus(item: XItem, i: number): StepStatus {
  if (item.phase === 'done') return 'done'
  const p = phaseIndex(item.phase)
  if (p > i + 2) return 'done'
  if (p === i + 2) return 'active'
  return 'pending'
}

function PipelineSteps({ item, names, hoverFace, onHoverFace, ahead }: { item: XItem; names: Map<string, string>; hoverFace: string | null; onHoverFace: (id: string | null) => void; ahead: number }) {
  if (item.phase === 'error') return <ItemError item={item} />
  return (
    <ol className="mt-4 flex-1">
      {STEPS.map((s, i) => {
        const st = stepStatus(item, i)
        const Icon = s.icon
        return (
          <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < STEPS.length - 1 && <span aria-hidden className={cn('absolute left-[15px] top-9 bottom-1 w-px transition-colors duration-500', st === 'done' ? 'bg-ok/40' : 'bg-line')} />}
            <StepDot status={st} icon={<Icon className="size-4" />} />
            <div className="min-w-0 flex-1 pt-1">
              <div className={cn('text-[14.5px] font-semibold transition-colors', st === 'pending' ? 'text-ink-3' : 'text-ink')}>{s.title}</div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${i}-${st}-${i === 1 ? String(item.matched) : i === 2 ? String(item.verdict) : i === 3 ? String(item.evidenceId) : String(item.detected)}`}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  {i === 0 && <FacesBody item={item} status={st} ahead={ahead} />}
                  {i === 1 && <MatchBody item={item} status={st} names={names} hoverFace={hoverFace} onHoverFace={onHoverFace} />}
                  {i === 2 && <PermissionBody item={item} status={st} names={names} />}
                  {i === 3 && <EvidenceBody item={item} status={st} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function StepDot({ status, icon }: { status: StepStatus; icon: React.ReactNode }) {
  return (
    <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center">
      {status === 'active' && <motion.span className="absolute inset-0 rounded-full bg-azure/15" animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />}
      <span className={cn('relative flex size-8 items-center justify-center rounded-full border transition-colors duration-500',
        status === 'done' ? 'border-ok/30 bg-ok-bg text-ok' : status === 'active' ? 'border-azure/30 bg-azure-50 text-azure' : 'border-line bg-surface text-ink-3')}>
        {status === 'done' ? <Check className="size-4" strokeWidth={2.5} /> : status === 'active' ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
    </span>
  )
}

const muted = 'mt-0.5 text-[13px] text-ink-3'

function FacesBody({ item, status, ahead }: { item: XItem; status: StepStatus; ahead: number }) {
  const engine = useFaceEngine(useShallow((s) => ({ status: s.status, progress: s.progress })))
  if (item.phase === 'queued') return <p className={muted}>{ahead > 0 ? `Waiting in line · ${ahead} photo${ahead === 1 ? '' : 's'} ahead` : 'Waiting in line'}</p>
  if (!item.detected) {
    if (status === 'pending' || item.phase === 'reading') return <p className={muted}>Opening the photo…</p>
    if (engine.status !== 'ready') return <p className={muted}>Waiting for the face engine · {Math.round(engine.progress * 100)}%</p>
    return <p className={muted}>Looking for faces…</p>
  }
  const n = item.faces.length
  if (!n) return <p className={muted}>No faces in this photo.</p>
  return (
    <div>
      <p className="mt-0.5 text-[13px] text-ink-2"><span className="font-semibold text-ink num">{n}</span> face{n === 1 ? '' : 's'} found</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.faces.slice(0, 14).map((f, i) => (
          <motion.span key={f.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 14) * 0.05 }}>
            <FaceCrop src={f.crop} size={26} tone="found" className="ring-line" />
          </motion.span>
        ))}
        {n > 14 && <span className="flex h-[26px] items-center rounded-full bg-sunken px-2 text-[11px] font-semibold text-ink-2">+{n - 14}</span>}
      </div>
    </div>
  )
}

function MatchBody({ item, status, names, hoverFace, onHoverFace }: { item: XItem; status: StepStatus; names: Map<string, string>; hoverFace: string | null; onHoverFace: (id: string | null) => void }) {
  const [noRoster, setNoRoster] = React.useState(false)
  React.useEffect(() => { void loadDescriptors().then((d) => setNoRoster(d.size === 0)) }, [])
  if (status === 'pending') return <p className={muted}>Compared privately with the class roster.</p>
  if (!item.matched) return <p className={muted}>Comparing with the class roster…</p>
  if (!item.faces.length) return <p className={muted}>Nothing to match.</p>
  const faces = [...item.faces].sort((a, b) => Number(!!b.studentId) - Number(!!a.studentId) || (names.get(a.studentId ?? '') ?? '').localeCompare(names.get(b.studentId ?? '') ?? ''))
  const nMatched = faces.filter((f) => f.studentId).length
  const shown = faces.slice(0, 10)
  return (
    <div>
      <p className="mt-0.5 text-[13px] text-ink-2"><span className="font-semibold text-ink num">{nMatched}</span> matched · <span className="font-semibold text-ink num">{faces.length - nMatched}</span> unknown</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((f, i) => <NameChip key={f.id} f={f} i={i} item={item} name={f.studentId ? names.get(f.studentId) : undefined} hovered={hoverFace === f.id} onHover={onHoverFace} />)}
        {faces.length > shown.length && <span className="flex h-7 items-center rounded-full bg-sunken px-2.5 text-[11.5px] font-semibold text-ink-2">+{faces.length - shown.length} more</span>}
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        {noRoster ? 'Roster face signatures are not set up yet, so faces stay Unknown until a person checks them.' : 'Unknown faces are never guessed. A person checks them.'}
      </p>
    </div>
  )
}

function NameChip({ f, i, item, name, hovered, onHover }: { f: XFace; i: number; item: XItem; name?: string; hovered: boolean; onHover: (id: string | null) => void }) {
  const tone = ringTone(item, f, false)
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.06 }}
      onMouseEnter={() => onHover(f.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(f.id)} onBlur={() => onHover(null)}
      title={name ? `${name} · match confidence ${Math.round(f.confidence * 100)}%` : 'Not matched to any student'}
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold transition-colors',
        hovered ? 'border-azure bg-azure-50' : 'border-line bg-surface', name ? 'text-ink' : 'text-info')}>
      <FaceCrop src={f.crop} size={22} tone={tone} className="ring-[1.5px]" />
      {name ?? 'Unknown'}
      {name && <span className="font-medium text-ink-3 num">{Math.round(f.confidence * 100)}%</span>}
    </motion.button>
  )
}

function PermissionBody({ item, status, names }: { item: XItem; status: StepStatus; names: Map<string, string> }) {
  if (status === 'pending') return <p className={muted}>Each parent’s choices, checked for Instagram.</p>
  if (!item.verdict) return <p className={muted}>Applying each parent’s choices…</p>
  const blocked = item.faces.filter((f) => f.state === 'blocked')
  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2"><InstagramIcon className="size-4" /> Instagram</span>
        <VerdictChip verdict={item.verdict} size="sm" />
      </div>
      <p className="mt-1.5 text-[13px] text-ink-2">{item.reason}</p>
      {blocked.length > 0 && (
        <ul className="mt-2 space-y-1">
          {blocked.slice(0, 3).map((f) => (
            <li key={f.id} className="flex items-start gap-2 text-[12.5px] text-ink-2">
              <FaceCrop src={f.crop} size={18} tone="blocked" className="mt-px ring-[1.5px]" />
              <span><span className="font-semibold text-ink">{f.studentId ? names.get(f.studentId) ?? 'A child' : 'A face'}</span> · {f.reason}</span>
            </li>
          ))}
          {blocked.length > 3 && <li className="pl-6 text-[12px] text-ink-3">and {blocked.length - 3} more</li>}
        </ul>
      )}
    </div>
  )
}

function EvidenceBody({ item, status }: { item: XItem; status: StepStatus }) {
  const eventName = useApp((s) => s.events.find((e) => e.id === item.eventId)?.name)
  if (status === 'pending') return <p className={muted}>A tamper-evident record of this check.</p>
  if (!item.evidenceId) return <p className={muted}>Recording…</p>
  return (
    <div className="mt-0.5 space-y-1 text-[13px] text-ink-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><EvidenceLink id={item.evidenceId} /><span className="text-ink-3">· added to {eventName}</span></div>
      {item.fingerprint && (
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3"><Fingerprint className="size-3.5" /> Photo fingerprint <Mono className="text-[11.5px] text-ink-3">{item.fingerprint.slice(0, 10)}…{item.fingerprint.slice(-6)}</Mono></div>
      )}
    </div>
  )
}

function ItemError({ item }: { item: XItem }) {
  const running = useStaffSession((s) => s.running)
  return (
    <div className="mt-4 rounded-xl border border-risk/20 bg-risk-bg/60 p-4">
      <div className="text-[14px] font-semibold text-risk">This photo was not added</div>
      <p className="mt-1 text-[13px] text-ink-2">{item.error}</p>
      {item.engineError && (
        <Button className="mt-3" size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} disabled={running} onClick={() => useStaffSession.getState().retry()}>Try again</Button>
      )}
    </div>
  )
}

/* ---------------- Summary ---------------- */

const VERDICT_ORDER: Verdict[] = ['ready', 'needs-blur', 'check-faces', 'keep-private']

function SummaryCard({ items, eventId, eventName }: { items: XItem[]; eventId: string; eventName: string }) {
  const s = summarizeItems(items)
  const busy = s.pending > 0
  const Dot = () => <span className="mx-2 text-ink-3/60">·</span>
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="relative overflow-hidden p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="label-caps flex items-center gap-2">
              {busy ? <><Loader2 className="size-3.5 animate-spin text-azure" /> Checking {s.done + 1} of {s.total - s.errors}</> : <><Check className="size-3.5 text-ok" strokeWidth={3} /> Batch checked · {eventName}</>}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline font-display text-[26px] font-semibold leading-tight text-ink num md:text-[30px]">
              <span>{s.done} photo{s.done === 1 ? '' : 's'}</span><Dot />
              <span>{s.faces} face{s.faces === 1 ? '' : 's'}</span><Dot />
              <span className="text-ok">{s.matched} matched</span><Dot />
              <span className={s.unknown ? 'text-info' : 'text-ink-3'}>{s.unknown} need{s.unknown === 1 ? 's' : ''} a check</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3"><InstagramIcon className="size-3.5" /> For Instagram</span>
              {VERDICT_ORDER.filter((v) => s.verdicts[v]).map((v) => (
                <Chip key={v} tone={VERDICT_META[v].tone} size="sm" icon={false}><span className="num">{s.verdicts[v]}</span>&nbsp;{VERDICT_META[v].label.toLowerCase()}</Chip>
              ))}
              {s.errors > 0 && <Chip tone="risk" size="sm">{s.errors} not added</Chip>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" to="/media/review" icon={<UserCheck className="size-4" />}>Review unknown faces</Button>
            <Button to={`/publish?event=${eventId}`} icon={<ShieldCheck className="size-4" />}>Open in Publish Guard</Button>
          </div>
        </div>
        {s.lastEvidence && (
          <div className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-3">
            Each photo has its own evidence record. Latest: <EvidenceLink id={s.lastEvidence} className="text-[12px]" />
          </div>
        )}
      </Card>
    </motion.div>
  )
}

/* ---------------- Explainer + photographer access ---------------- */

function HowItWorks() {
  const points = [
    { icon: <Lock className="size-4" />, title: 'Checked on this computer', body: 'Faces are found and compared right here in the browser. Photos are not sent to any outside AI service.' },
    { icon: <ScanFace className="size-4" />, title: 'Never guesses', body: 'A face gets a name only when it closely matches the roster. Everything else is marked Unknown for a person to check.' },
    { icon: <ShieldCheck className="size-4" />, title: 'Choices travel with the child', body: 'Each parent’s photo choices are applied before anyone can share, and every check leaves a record.' },
  ]
  return (
    <Card className="p-6">
      <h2 className="text-[15px] font-semibold text-ink">How Media X-Ray works</h2>
      <ul className="mt-4 space-y-4">
        {points.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-azure-50 text-azure">{p.icon}</span>
            <div>
              <div className="text-[14px] font-semibold text-ink">{p.title}</div>
              <p className="text-[13px] text-ink-2">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function PhotographerAccessCard() {
  const v = usePhotoVendor()
  const now = useTicker(30000)
  const canVendors = useCan('manage-vendors')
  const canApprove = useCan('approve')
  const canManage = canVendors || canApprove
  const state = accessState(v, now)
  if (!v?.access) return null
  const left = countdown(new Date(v.access.expiresAt).getTime() - now)
  const link = `${window.location.origin}/media/upload/portal?token=${v.access.token}`
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Photographer access</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">{v.name} uploads through a time-bound link and never sees names.</p>
        </div>
        {state === 'active' ? <Chip tone="ok">Active</Chip> : state === 'revoked' ? <Chip tone="risk">Revoked</Chip> : <Chip tone="muted">Expired</Chip>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-sunken/70 p-3.5 text-[13px]">
        <div>
          <div className="label-caps">Link</div>
          <div className="mt-1 flex items-center gap-1.5"><KeyRound className="size-3.5 text-ink-3" /><Mono className="text-ink">{v.access.token}</Mono></div>
        </div>
        <div>
          <div className="label-caps">{state === 'active' ? 'Closes in' : 'Closed'}</div>
          <div className="mt-1 font-semibold text-ink num">{state === 'active' ? `${left.d}d ${left.h}h ${left.m}m` : state === 'revoked' ? 'Revoked by the school' : fmtDateTime(v.access.expiresAt)}</div>
        </div>
        <div className="col-span-2 text-[12.5px] text-ink-3">{v.access.scope}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" to="/media/upload/portal" icon={<Eye className="size-4" />}>Preview portal</Button>
        {state === 'active' && (
          <Button size="sm" variant="ghost" icon={<Copy className="size-4" />}
            onClick={() => { void navigator.clipboard?.writeText(link).catch(() => undefined); toast.success('Upload link copied', { description: 'Share it only with the photographer.' }) }}>Copy link</Button>
        )}
        {canManage && state === 'active' && (
          <Button size="sm" variant="danger" icon={<Link2 className="size-4" />}
            onClick={() => { const id = revokePhotographerLink(); toast.success('Link revoked', { description: `${v.name} can no longer upload.${id ? ` Evidence ${id}` : ''}` }) }}>Revoke link</Button>
        )}
        {canManage && state !== 'active' && (
          <Button size="sm" variant="soft" icon={<KeyRound className="size-4" />}
            onClick={() => { const id = issuePhotographerLink(); toast.success('New link issued', { description: `Valid for 3 days.${id ? ` Evidence ${id}` : ''}` }) }}>Issue a new link</Button>
        )}
        {!canManage && <span className="self-center text-[12px] text-ink-3">Managed by the school office</span>}
      </div>
    </Card>
  )
}
