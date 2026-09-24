import * as React from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowRight, Check, ChevronLeft, ClipboardCheck, Compass, Landmark, ListPlus, RotateCcw, Route, Scale, ScanFace, Sparkles, type LucideIcon,
} from 'lucide-react'
import { Button, Card, Chip, toneText } from '@/design/ui'
import { useApp } from '@/store/app'
import { addDays, cn, DEMO_NOW, fmtDate } from '@/lib/utils'
import { actorFor } from '@/modules/coverage/lib'
import { EASE, Rise, TINT } from '@/modules/coverage/parts'
import {
  BUCKET_ORDER, BUCKETS, countBuckets, FAMILIES, ownerFor, prefilledAnswers, profileNotes, QUESTIONS, recognise, visibleQuestions,
  type Answers, type Bucket, type Finding, type Question,
} from './tree'

type Stage = 'intro' | 'questions' | 'results'
type Mode = 'prefilled' | 'fresh'

/* ---------------- Finding presentation ---------------- */

function findingLook(f: Finding): { icon: LucideIcon; label: string; cls: string } {
  if (f.tag === 'exemption') return { icon: Landmark, label: 'School exemption · Fourth Schedule', cls: 'bg-[#e9edf6] text-navy-2' }
  if (f.tag === 'media-safe') return { icon: ScanFace, label: 'Covered · Media Safe', cls: TINT.ok }
  if (f.bucket === 'complete') return { icon: ClipboardCheck, label: 'We’ll complete for you', cls: TINT.azure }
  if (f.bucket === 'decision') return { icon: Scale, label: 'Needs your decision', cls: TINT.info }
  if (f.bucket === 'specialist') return { icon: Sparkles, label: 'Specialist review', cls: TINT.expert }
  return { icon: Check, label: 'Covered', cls: TINT.ok }
}

const BUCKET_ICON: Record<Bucket, LucideIcon> = { covered: Check, complete: ClipboardCheck, decision: Scale, specialist: Sparkles }
const BUCKET_BAR: Record<Bucket, string> = { covered: 'bg-ok', complete: 'bg-azure', decision: 'bg-info', specialist: 'bg-expert' }

/* ---------------- Plan creation ---------------- */

/** addTask, but if the returned id already existed (store counter restarts after a reload), give the new task a unique id. */
function addTaskSafe(t: Parameters<ReturnType<typeof useApp.getState>['addTask']>[0]) {
  const before = new Set(useApp.getState().tasks.map((x) => x.id))
  const id = useApp.getState().addTask(t)
  if (!before.has(id)) return id
  const unique = `${id}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  useApp.setState({ tasks: useApp.getState().tasks.map((x, i) => (i === 0 && x.id === id ? { ...x, id: unique } : x)) })
  return unique
}

function addToPlan(answers: Answers, findings: Finding[]) {
  const s = useApp.getState()
  const actor = actorFor(s.role)
  const openTitles = s.tasks.filter((t) => t.status === 'open').map((t) => t.title.toLowerCase())
  const created: string[] = []
  let already = 0
  for (const f of findings) {
    const t = f.task
    if (!t) continue
    const exists = openTitles.some((x) => x === t.title.toLowerCase() || (t.skipIfOpen && x.includes(t.skipIfOpen.toLowerCase())))
    if (exists) { already++; continue }
    created.push(addTaskSafe({ title: t.title, area: f.area, ownerId: ownerFor(t.owner, answers), dueAt: addDays(DEMO_NOW, t.days), link: t.link, kind: t.kind }))
  }
  const c = countBuckets(findings)
  const ex = findings.filter((f) => f.tag === 'exemption').length
  const evidenceId = s.addEvidence({
    type: 'readiness',
    title: `Readiness check completed: ${c.covered} covered (${ex} school exemption${ex === 1 ? '' : 's'}), ${c.complete} we’ll complete, ${c.decision} decision${c.decision === 1 ? '' : 's'}, ${c.specialist} specialist review${c.specialist === 1 ? '' : 's'}`,
    actor, refs: created,
    payload: { covered: c.covered, exemptions: ex, complete: c.complete, decisions: c.decision, specialist: c.specialist, tasksAdded: created.length, alreadyPlanned: already },
  })
  if (created.length && c.decision) {
    s.notify({ text: `Readiness check: ${c.decision} decision${c.decision > 1 ? 's' : ''} added to your plan`, link: '/home', roles: ['chairman', 'principal'] })
  }
  return { created: created.length, already, evidenceId }
}

/* ---------------- Intro ---------------- */

function Intro({ onStart, onFresh, onSkip }: { onStart: () => void; onFresh: () => void; onSkip: () => void }) {
  const school = useApp((s) => s.school)
  const evidence = useApp((s) => s.evidence)
  const last = React.useMemo(() => [...evidence].reverse().find((e) => e.title.startsWith('Readiness check completed')), [evidence])
  const total = visibleQuestions(prefilledAnswers()).length
  return (
    <div className="pb-6">
      <Rise>
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-card)]">
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(0,81,213,0.08),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/3 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(232,163,23,0.07),transparent)]" />
          <div className="relative grid gap-10 p-8 lg:grid-cols-[1.3fr_1fr] lg:p-12">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-azure-50 text-azure"><Compass className="size-[18px]" /></span>
                <span className="label-caps">Readiness check</span>
              </div>
              <h1 className="mt-6 font-display text-[44px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink">
                10 minutes. We tell you what’s covered, what’s exempt, and what’s left.
              </h1>
              <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
                We’ve pre-filled the answers from {school.name}’s records, so this is mostly confirming. One question at a time, in plain English.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={onStart}>Review pre-filled answers <ArrowRight className="size-4" /></Button>
                <Button size="lg" variant="secondary" onClick={onFresh} icon={<RotateCcw className="size-4" />}>Start fresh</Button>
                <button type="button" onClick={onSkip} className="ml-1 rounded-lg px-2 py-2 text-[14px] font-semibold text-azure hover:bg-azure-50">Skip to results</button>
              </div>
              {last && (
                <p className="mt-5 text-[13px] text-ink-3">Last check on {fmtDate(last.at)}: {last.title.replace(/^Readiness check completed:\s*/, '')}.</p>
              )}
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-6">
              <div className="label-caps">What you’ll get</div>
              <ul className="mt-4 space-y-3.5">
                {BUCKET_ORDER.map((b) => {
                  const Icon = BUCKET_ICON[b]
                  return (
                    <li key={b} className="flex items-start gap-3">
                      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', TINT[BUCKETS[b].tone])}><Icon className="size-4" /></span>
                      <div>
                        <div className="text-[14.5px] font-semibold text-ink">{BUCKETS[b].label}</div>
                        <div className="text-[13px] leading-snug text-ink-2">{BUCKETS[b].blurb}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-[13px] leading-snug text-ink-2">
                <Landmark className="mt-0.5 size-4 shrink-0 text-navy-2" />
                School exemptions under the Fourth Schedule, like attendance, child-safety CCTV and the school bus, are recognised for you. No extra consent forms.
              </div>
            </div>
          </div>
          <div className="relative border-t border-line bg-[#fbfaf7] px-8 py-6 lg:px-12">
            <div className="text-[13px] font-semibold text-ink">{total} questions in {FAMILIES.length} short sections</div>
            <ol className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:grid-cols-7">
              {FAMILIES.map((f, i) => (
                <li key={f.key} className="flex items-start gap-2">
                  <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-[10.5px] font-bold text-ink-2">{i + 1}</span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-[13px] font-medium text-ink">{f.label}</span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-3">{f.blurb}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Rise>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          { icon: Sparkles, title: `Pre-filled for ${school.shortName}`, body: 'From your admission records, vendor list and settings. Change anything that isn’t right.' },
          { icon: Route, title: 'Only what applies to you', body: 'Questions branch on your answers. No CCTV means no CCTV questions.' },
          { icon: ListPlus, title: 'A plan, not a score', body: 'Every item lands in one of four buckets, with an owner and a due date. Nothing to grade.' },
        ].map((x, i) => (
          <Rise key={x.title} i={2 + i}>
            <div className="flex h-full items-start gap-3.5 rounded-2xl border border-line/80 bg-surface/60 px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-navy-2 ring-1 ring-line"><x.icon className="size-[18px]" /></span>
              <div>
                <div className="text-[14.5px] font-semibold text-ink">{x.title}</div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{x.body}</p>
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Progress rail ---------------- */

function Rail({ visible, current, seen, onJump, onSkip, mode, onMode }: {
  visible: Question[]; current: string; seen: Set<string>; onJump: (id: string) => void; onSkip: () => void; mode: Mode; onMode: () => void
}) {
  const pos = visible.findIndex((q) => q.id === current) + 1
  return (
    <nav aria-label="Readiness sections" className="xl:sticky xl:top-24">
      <div className="label-caps">Your progress</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[30px] font-semibold leading-none text-ink num">{pos}</span>
        <span className="text-[13px] text-ink-3">of {visible.length}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <motion.div className="h-full rounded-full bg-azure" initial={false} animate={{ width: `${(pos / visible.length) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} />
      </div>
      <ol className="relative mt-6">
        <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-px bg-line-strong/70" />
        {FAMILIES.map((f, i) => {
          const qs = visible.filter((q) => q.family === f.key)
          const isCurrent = qs.some((q) => q.id === current)
          const done = !isCurrent && qs.length > 0 && qs.every((q) => seen.has(q.id))
          const at = qs.findIndex((q) => q.id === current) + 1
          return (
            <li key={f.key}>
              <button type="button" disabled={!qs.length} onClick={() => qs[0] && onJump(qs[0].id)}
                className="group relative flex w-full items-start gap-3 rounded-lg py-2 text-left disabled:opacity-40">
                <span className={cn('relative z-10 mt-px flex size-[23px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                  done ? 'border-ok bg-ok text-white' : isCurrent ? 'border-azure bg-azure text-white shadow-[0_0_0_4px_rgba(0,81,213,0.12)]' : 'border-line-strong bg-canvas text-ink-3 group-hover:border-ink-3')}>
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-[13.5px] font-semibold leading-tight', isCurrent ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3 group-hover:text-ink-2')}>{f.label}</span>
                  {isCurrent && <span className="mt-0.5 block text-[12px] text-ink-3">Question {at} of {qs.length}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-6 flex flex-col items-start gap-2 border-t border-line pt-5">
        <Button variant="soft" size="sm" onClick={onSkip}>Skip to results <ArrowRight className="size-3.5" /></Button>
        <button type="button" onClick={onMode} className="px-1 text-[12.5px] font-medium text-ink-3 hover:text-ink">
          {mode === 'prefilled' ? 'Start fresh instead' : 'Use pre-filled answers'}
        </button>
      </div>
    </nav>
  )
}

/* ---------------- One question ---------------- */

function OptionTile({ q, o, selected, onPick, compact }: { q: Question; o: Question['options'][number]; selected: boolean; onPick: () => void; compact?: boolean }) {
  const multi = q.kind === 'multi'
  return (
    <button type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected} onClick={onPick}
      className={cn('group flex w-full items-center gap-3 rounded-xl border text-left transition-all duration-200',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        selected ? (multi ? 'border-azure/60 bg-azure-50/60' : 'border-azure bg-azure-50/70 ring-1 ring-azure') : 'border-line-strong bg-surface hover:border-ink-3/50 hover:bg-[#fbfaf7]')}>
      <span className={cn('flex size-[18px] shrink-0 items-center justify-center border-2 transition-colors', multi ? 'rounded-[5px]' : 'rounded-full',
        selected ? (multi ? 'border-azure bg-azure text-white' : 'border-azure') : 'border-line-strong group-hover:border-ink-3')}>
        {selected && (multi ? <Check className="size-3" strokeWidth={3.2} /> : <span className="size-2 rounded-full bg-azure" />)}
      </span>
      {compact ? (
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-snug text-ink">
          {o.label}{o.hint && <span className="font-normal text-ink-3"> · {o.hint}</span>}
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-snug text-ink">{o.label}</span>
          {o.hint && <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{o.hint}</span>}
        </span>
      )}
    </button>
  )
}

function QuestionCard({ q, pos, total, dir, answer, prefilled, onPick, onBack, onNext, isLast }: {
  q: Question; pos: number; total: number; dir: number; answer: string[] | undefined; prefilled: boolean
  onPick: (value: string) => void; onBack: () => void; onNext: () => void; isLast: boolean
}) {
  const reduce = useReducedMotion()
  const family = FAMILIES.find((f) => f.key === q.family)!
  const cols = q.columns ?? 1
  const answered = answer !== undefined && (q.kind === 'multi' || answer.length > 0)
  return (
    <Card className="relative overflow-hidden rounded-[22px] p-0">
      <div className="h-[3px] bg-sunken">
        <motion.div className="h-full bg-azure" initial={false} animate={{ width: `${(pos / total) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} />
      </div>
      <div className="p-7 lg:p-9">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={q.id}
            initial={reduce ? false : { opacity: 0, x: 28 * dir }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -20 * dir }}
            transition={{ duration: 0.28, ease: EASE }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[12px] font-semibold text-ink-3">
                <span className="text-azure">{family.label}</span> · Question {pos} of {total}
              </div>
              {prefilled && <Chip tone="azure" size="sm" icon={<Sparkles className="size-3" />}>Pre-filled from your records</Chip>}
            </div>
            <h2 className="mt-4 font-display text-[30px] font-semibold leading-[1.16] tracking-[-0.012em] text-ink">{q.prompt}</h2>
            {q.help && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{q.help}</p>}
            <div role={q.kind === 'multi' ? 'group' : 'radiogroup'} aria-label={q.prompt}
              className={cn('mt-7 grid gap-2.5', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-2 2xl:grid-cols-3')}>
              {q.options.map((o) => (
                <OptionTile key={o.value} q={q} o={o} compact={q.kind === 'multi' && q.options.length > 6} selected={(answer ?? []).includes(o.value)} onPick={() => onPick(o.value)} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="ghost" onClick={onBack} disabled={pos === 1} icon={<ChevronLeft className="size-4" />}>Back</Button>
          <span className="hidden text-[12.5px] text-ink-3 sm:block">
            {q.kind === 'multi' ? 'Pick all that apply, then continue' : 'Pick one, or press Enter to keep it'}
          </span>
          <Button onClick={onNext} variant={answered ? 'primary' : 'secondary'}>
            {isLast ? 'See my results' : answered ? 'Next' : 'Skip'} <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ---------------- Live side panel ---------------- */

function Tick({ value }: { value: number }) {
  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} className="inline-block num" initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function RecognisedPanel({ findings, notes }: { findings: Finding[]; notes: string[] }) {
  const board = useApp((s) => s.school.board)
  const c = countBuckets(findings)
  const list = [...findings].reverse()
  return (
    <aside className="lg:sticky lg:top-24">
      <Card className="rounded-[22px] p-5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-ok/50 [animation-duration:2s]" />
            <span className="relative size-2 rounded-full bg-ok" />
          </span>
          <span className="label-caps">What we’ve recognised</span>
        </div>
        <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{[board, ...notes].join(' · ')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {BUCKET_ORDER.map((b) => (
            <div key={b} className={cn('rounded-xl px-3 py-2.5', TINT[BUCKETS[b].tone])}>
              <div className="font-display text-[24px] font-semibold leading-none"><Tick value={c[b]} /></div>
              <div className="mt-1 text-[11.5px] font-semibold">{BUCKETS[b].short}</div>
            </div>
          ))}
        </div>
        <div className="-mr-2 mt-4 max-h-[min(440px,calc(100vh-380px))] min-h-[120px] overflow-y-auto pr-2">
          {list.length === 0 ? (
            <p className="px-2 py-8 text-center text-[13px] leading-relaxed text-ink-3">As you answer, we’ll show what’s covered, what’s exempt and what’s left.</p>
          ) : (
            <ul className="space-y-0.5">
              <AnimatePresence initial={false}>
                {list.map((f) => {
                  const look = findingLook(f)
                  const Icon = look.icon
                  return (
                    <motion.li key={f.id} layout="position" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.35, ease: EASE }} className="flex items-start gap-2.5 rounded-lg px-2 py-2">
                      <span className={cn('mt-px flex size-6 shrink-0 items-center justify-center rounded-md', look.cls)}><Icon className="size-3.5" strokeWidth={2.2} /></span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-snug text-ink">{f.title}</div>
                        <div className="mt-0.5 text-[11.5px] text-ink-3">{look.label}</div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </Card>
    </aside>
  )
}

/* ---------------- Results: items sort into four buckets ---------------- */

function ResultItem({ f }: { f: Finding }) {
  const look = findingLook(f)
  return (
    <motion.div layoutId={`r-${f.id}`} layout transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className={cn('relative z-20 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-[0_1px_2px_rgba(11,28,48,.05)]')}>
      <motion.div layout="position" className="text-[13.5px] font-semibold leading-snug text-ink">{f.title}</motion.div>
      {f.tag && <div className={cn('mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', look.cls)}><look.icon className="size-3" />{f.tag === 'exemption' ? 'School exemption' : 'Media Safe'}</div>}
      {f.bucket !== 'covered' && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-1 text-[12.5px] leading-snug text-ink-2">{f.detail}</motion.p>
      )}
    </motion.div>
  )
}

function Results({ answers, onReview, onRestart }: { answers: Answers; onReview: () => void; onRestart: () => void }) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const school = useApp((s) => s.school)
  const findings = React.useMemo(() => recognise(answers), [answers])
  const answeredCount = visibleQuestions(answers).filter((q) => (answers[q.id] ?? []).length > 0).length
  const c = countBuckets(findings)
  const exemptions = findings.filter((f) => f.tag === 'exemption').length
  const [placed, setPlaced] = React.useState(reduce ? findings.length : 0)
  const colRef = React.useRef<HTMLDivElement>(null)
  const [cardW, setCardW] = React.useState(264)

  React.useLayoutEffect(() => {
    if (colRef.current) setCardW(colRef.current.offsetWidth)
  }, [])
  React.useEffect(() => {
    if (reduce) { setPlaced(findings.length); return }
    let id = 0
    const start = window.setTimeout(() => {
      id = window.setInterval(() => setPlaced((p) => (p >= findings.length ? p : p + 1)), 105)
    }, 650)
    return () => { window.clearTimeout(start); window.clearInterval(id) }
  }, [findings.length, reduce])

  const done = placed >= findings.length
  const deck = findings.slice(placed)
  const placedIds = new Set(findings.slice(0, placed).map((f) => f.id))
  const planItems = c.complete + c.decision + c.specialist

  const add = () => {
    const r = addToPlan(answers, findings)
    if (r.created) {
      toast.success(`${r.created} new task${r.created === 1 ? '' : 's'} added to your plan`, {
        description: r.already ? `${r.already} ${r.already === 1 ? 'was' : 'were'} already on your team’s list. The check is saved as evidence.` : 'The check is saved as evidence.',
      })
    } else {
      toast.success('Your plan is already up to date', { description: 'Nothing new to add. The check is saved as evidence.' })
    }
    navigate('/home')
  }

  return (
    <div className="pb-6">
      <Rise>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps">Readiness results · {answeredCount} answers</div>
            <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">Here’s where {school.shortName} stands.</h1>
            <p className="mt-2.5 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              Everything we recognised, sorted into what’s already covered, what we’ll do for you, and the few things that need a person.
              {exemptions > 0 && ` ${exemptions} of the covered items are school exemptions.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onRestart} icon={<RotateCcw className="size-4" />}>Start again</Button>
          </div>
        </div>
      </Rise>

      <LayoutGroup>
        <div className="relative mt-8 h-[124px]">
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="deck" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex h-full flex-col items-center">
                <div className="relative h-[84px]" style={{ width: cardW }}>
                  {deck.slice(0, 4).map((f, depth) => (
                    <motion.div key={f.id} layoutId={`r-${f.id}`} layout
                      className="absolute rounded-xl border border-line bg-surface px-3.5 py-3 shadow-[0_6px_18px_rgba(11,28,48,.08)]"
                      style={{ top: depth * 9, left: depth * 12, right: depth * 12, zIndex: 10 - depth, opacity: depth > 2 ? 0 : 1 - depth * 0.18 }}>
                      <motion.div layout="position" className="truncate text-[13.5px] font-semibold text-ink">{f.title}</motion.div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-2 text-[12.5px] font-medium text-ink-3">Sorting {deck.length} of {findings.length}…</div>
              </motion.div>
            ) : (
              <motion.div key="cta" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
                className="flex h-full flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-surface px-7 shadow-[var(--shadow-card)]">
                <div className="min-w-0">
                  <div className="font-display text-[22px] font-semibold text-ink">{planItems ? `${planItems} items for your plan` : 'Nothing left to plan'}</div>
                  <div className="mt-0.5 text-[14px] text-ink-2">
                    {planItems ? `${c.complete} we’ll complete, ${c.decision} need${c.decision === 1 ? 's' : ''} your decision, ${c.specialist} go${c.specialist === 1 ? 'es' : ''} to a specialist. The other ${c.covered} are already covered.` : `All ${c.covered} items are already covered.`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={onReview}>Review answers</Button>
                  <Button size="lg" onClick={add} icon={<ListPlus className="size-[18px]" />}>Add to my plan</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BUCKET_ORDER.map((b, bi) => {
            const items = findings.filter((f) => f.bucket === b && placedIds.has(f.id))
            const Icon = BUCKET_ICON[b]
            return (
              <div key={b} ref={bi === 0 ? colRef : undefined} className="min-w-0">
                <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-4 pb-4 pt-5 shadow-[var(--shadow-card)]">
                  <span className={cn('absolute inset-x-0 top-0 h-1', BUCKET_BAR[b])} />
                  <div className="flex items-center justify-between">
                    <span className={cn('flex size-8 items-center justify-center rounded-lg', TINT[BUCKETS[b].tone])}><Icon className="size-4" /></span>
                    <span className={cn('font-display text-[30px] font-semibold leading-none', toneText[BUCKETS[b].tone])}><Tick value={items.length} /></span>
                  </div>
                  <div className="mt-3 text-[14.5px] font-semibold leading-snug text-ink">{BUCKETS[b].label}</div>
                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{BUCKETS[b].blurb}</div>
                </div>
                <div className="mt-2.5 space-y-2">
                  {items.map((f) => <ResultItem key={f.id} f={f} />)}
                  {done && items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line-strong px-3.5 py-4 text-center text-[12.5px] text-ink-3">Nothing here</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </LayoutGroup>
    </div>
  )
}

/* ---------------- The engine ---------------- */

export function Readiness() {
  const [stage, setStage] = React.useState<Stage>('intro')
  const [mode, setMode] = React.useState<Mode>('prefilled')
  const [answers, setAnswers] = React.useState<Answers>(prefilledAnswers)
  const [touched, setTouched] = React.useState<Set<string>>(() => new Set())
  const [current, setCurrent] = React.useState(QUESTIONS[0].id)
  const [seen, setSeen] = React.useState<Set<string>>(() => new Set([QUESTIONS[0].id]))
  const [dir, setDir] = React.useState(1)
  const advanceTimer = React.useRef<number | undefined>(undefined)

  const visible = React.useMemo(() => visibleQuestions(answers), [answers])
  // If the current question was just hidden by an answer, fall forward to the next visible one.
  const idx = React.useMemo(() => {
    const i = visible.findIndex((x) => x.id === current)
    if (i >= 0) return i
    const order = QUESTIONS.findIndex((x) => x.id === current)
    const after = visible.findIndex((x) => QUESTIONS.indexOf(x) > order)
    return after >= 0 ? after : visible.length - 1
  }, [visible, current])
  const q = visible[idx]
  const include = React.useCallback((x: Question) => seen.has(x.id), [seen])
  const live = React.useMemo(() => recognise(answers, include), [answers, include])
  const notes = React.useMemo(() => profileNotes(answers, include), [answers, include])

  React.useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  const goTo = (id: string, d = 1) => {
    window.clearTimeout(advanceTimer.current)
    setDir(d)
    setCurrent(id)
    setSeen((s) => new Set(s).add(id))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = React.useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    // An unanswered multi-select counts as "none of these".
    setAnswers((a) => (q && a[q.id] === undefined && q.kind === 'multi' ? { ...a, [q.id]: [] } : a))
    const nextQ = visible[idx + 1]
    if (nextQ) goTo(nextQ.id, 1)
    else { setSeen(new Set(visible.map((x) => x.id))); setStage('results'); window.scrollTo({ top: 0 }) }
  }, [visible, idx, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const back = () => { const p = visible[idx - 1]; if (p) goTo(p.id, -1) }
  const nextRef = React.useRef(next)
  React.useEffect(() => { nextRef.current = next })

  const pick = (value: string) => {
    if (!q) return
    setTouched((t) => new Set(t).add(q.id))
    if (q.kind === 'multi') {
      setAnswers((a) => {
        const cur = a[q.id] ?? []
        return { ...a, [q.id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
      })
    } else {
      setAnswers((a) => ({ ...a, [q.id]: [value] }))
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = window.setTimeout(() => nextRef.current(), 320)
    }
  }

  // Enter → next (unless a button or field has focus and handles it itself)
  React.useEffect(() => {
    if (stage !== 'questions') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== 'Enter' || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(t.tagName)) return
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, next])

  const start = (m: Mode) => {
    setMode(m)
    setAnswers(m === 'prefilled' ? prefilledAnswers() : {})
    setTouched(new Set())
    setDir(1)
    setCurrent(QUESTIONS[0].id)
    setSeen(new Set([QUESTIONS[0].id]))
    setStage('questions')
  }
  const toResults = (a?: Answers) => {
    const ans = a ?? answers
    setSeen(new Set(visibleQuestions(ans).map((x) => x.id)))
    setStage('results')
    window.scrollTo({ top: 0 })
  }

  if (stage === 'intro') {
    return <Intro onStart={() => start('prefilled')} onFresh={() => start('fresh')} onSkip={() => { const a = prefilledAnswers(); setAnswers(a); setMode('prefilled'); toResults(a) }} />
  }
  if (stage === 'results') {
    return <Results answers={answers} onReview={() => { setDir(-1); setCurrent(visible[0].id); setStage('questions') }} onRestart={() => setStage('intro')} />
  }

  const prefilledShown = mode === 'prefilled' && !!q && !touched.has(q.id)
  return (
    <div className="grid items-start gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[196px_minmax(0,1fr)_316px]">
      <div className="hidden xl:block">
        <Rail visible={visible} current={q?.id ?? ''} seen={seen} onJump={(id) => goTo(id, visible.findIndex((x) => x.id === id) >= idx ? 1 : -1)}
          onSkip={() => toResults()} mode={mode} onMode={() => start(mode === 'prefilled' ? 'fresh' : 'prefilled')} />
      </div>
      <div className="min-w-0">
        {q && (
          <QuestionCard q={q} pos={idx + 1} total={visible.length} dir={dir} answer={answers[q.id]} prefilled={prefilledShown}
            onPick={pick} onBack={back} onNext={next} isLast={idx === visible.length - 1} />
        )}
        <div className="mt-4 flex items-center justify-between px-1 xl:hidden">
          <button type="button" onClick={() => toResults()} className="text-[13px] font-semibold text-azure hover:underline">Skip to results</button>
          <button type="button" onClick={() => start(mode === 'prefilled' ? 'fresh' : 'prefilled')} className="text-[12.5px] text-ink-3 hover:text-ink">
            {mode === 'prefilled' ? 'Start fresh instead' : 'Use pre-filled answers'}
          </button>
        </div>
      </div>
      <RecognisedPanel findings={live} notes={notes} />
    </div>
  )
}
