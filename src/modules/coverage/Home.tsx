import * as React from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowDown, ArrowRight, Check, CircleCheck, Compass, FileDown, Flag, Images, Inbox, MessageCircle, ScanFace, ShieldCheck, Siren, Stamp, Users,
} from 'lucide-react'
import { LEGAL } from '@/data/reference'
import type { Task } from '@/data/types'
import { Avatar, Button, Card, Chip, Due, Empty, Tabs } from '@/design/ui'
import { evaluateAsset } from '@/engine/permission'
import { useApp } from '@/store/app'
import { useCtx } from '@/store/hooks'
import { ROLE } from '@/roles/roles'
import { cn, DEMO_NOW, fmtDate, fmtNum, pct } from '@/lib/utils'
import {
  callName, dueText, dueTone, greeting, monthLabel, openRequests, personOf, REQUEST_LABEL, shortDate, sortByDue, statusLine,
  summarizeAreas, todayLabel,
} from './lib'
import { AreaCard, AreaTile, CountUp, DecisionDialog, EASE, Rise, SweepRing, TaskRow, useOpenTask } from './parts'

function useAreas() {
  const obligations = useApp((s) => s.obligations)
  return React.useMemo(() => summarizeAreas(obligations), [obligations])
}

/* ---------------- Header (shared by every role) ---------------- */

function HomeHeader({ actions, below }: { actions?: React.ReactNode; below?: React.ReactNode }) {
  const role = useApp((s) => s.role)
  const people = useApp((s) => s.people)
  const school = useApp((s) => s.school)
  const areas = useAreas()
  const me = personOf(people, ROLE[role].person)
  const line = statusLine(areas)
  return (
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <Rise><div className="label-caps">{todayLabel()} · {school.name}</div></Rise>
        <Rise i={1}>
          <h1 className="mt-3 font-display text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            {greeting()}, {me ? callName(me.name) : 'welcome back'}.
          </h1>
        </Rise>
        <Rise i={2}>
          <p className="mt-3.5 max-w-3xl text-[17.5px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">{line.first}</span> {line.second}
          </p>
        </Rise>
        {below && <Rise i={2.5}>{below}</Rise>}
      </div>
      {actions && <Rise i={3} className="flex flex-wrap items-center gap-2">{actions}</Rise>}
    </header>
  )
}

/* ---------------- Chairman: executive cards ---------------- */

function ApprovalRow({ task }: { task: Task }) {
  const people = useApp((s) => s.people)
  const openTask = useOpenTask()
  const owner = personOf(people, task.ownerId)
  return (
    <li className="flex items-center gap-4 rounded-xl border border-line bg-canvas/70 px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf0d9] text-[#8a5300]"><Stamp className="size-[18px]" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-snug text-ink">{task.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          {owner && <span className="flex items-center gap-1.5"><Avatar name={owner.name} size={18} />With {owner.name}</span>}
          <Due tone={dueTone(task.dueAt)}>{dueText(task.dueAt)}</Due>
        </div>
      </div>
      <Button size="sm" onClick={() => openTask(task)} className="shrink-0">Review</Button>
    </li>
  )
}

function NeedsYou() {
  const tasks = useApp((s) => s.tasks)
  const people = useApp((s) => s.people)
  const areas = useAreas()
  const approvals = sortByDue(tasks.filter((t) => t.status === 'open' && t.kind === 'approval'))
  const withTeam = areas.flatMap((a) => a.open.map((o) => ({ o, area: a }))).filter(({ o }) => o.status !== 'decision')
  const n = approvals.length
  return (
    <Card className="flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[23px] font-semibold text-ink">What needs you</h2>
          <p className="mt-1 text-[14px] text-ink-2">
            {n ? `${n} ${n === 1 ? 'decision is' : 'decisions are'} waiting. Everything else is with your team.` : 'Nothing is waiting on you. Your team has everything in hand.'}
          </p>
        </div>
        {n > 0 && <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-marigold text-[13px] font-bold text-navy num">{n}</span>}
      </div>
      {n ? (
        <ul className="mt-5 space-y-2.5">{approvals.slice(0, 3).map((t) => <ApprovalRow key={t.id} task={t} />)}</ul>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-ok-bg/60 px-4 py-4 text-[14px] text-ok">
          <CircleCheck className="size-5" /> All decisions are up to date.
        </div>
      )}
      {n > 3 && <p className="mt-2.5 text-[13px] text-ink-3">and {n - 3} more waiting on your plan.</p>}
      {withTeam.length > 0 && (
        <div className="mt-auto pt-6">
          <div className="label-caps">With your team</div>
          <ul className="mt-2 divide-y divide-line">
            {withTeam.slice(0, 3).map(({ o, area }) => {
              const owner = personOf(people, o.ownerId)
              return (
                <li key={o.id}>
                  <Link to={`/home/areas/${area.key}`} className="group flex items-center gap-3 py-2.5">
                    {owner && <Avatar name={owner.name} size={26} />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-ink group-hover:text-azure">{o.title}</div>
                      <div className="text-[12.5px] text-ink-3">{area.short} · {owner?.name}</div>
                    </div>
                    {o.dueAt && <Due tone={dueTone(o.dueAt)}>{dueText(o.dueAt)}</Due>}
                    <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-azure" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

function DeskCard() {
  const people = useApp((s) => s.people)
  const experts = useApp((s) => s.experts)
  const requests = useApp((s) => s.requests)
  const desk = personOf(people, 'U-DESK')
  const active = experts.find((e) => ['requested', 'scheduled', 'in-review'].includes(e.status))
  const closed = requests.filter((r) => ['resolved', 'closed'].includes(r.status))
  const days = closed.map((r) => (new Date(r.steps[r.steps.length - 1]?.at ?? r.receivedAt).getTime() - new Date(r.receivedAt).getTime()) / 86400000)
  const avg = days.length ? Math.max(1, Math.round(days.reduce((a, b) => a + b, 0) / days.length)) : 0
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-[var(--shadow-card)]">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[#2f6bff]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-marigold/10 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">Your privacy desk</div>
        <div className="mt-4 flex items-center gap-3.5">
          <div className="relative">
            <Avatar name={desk?.name ?? 'Priya Nair'} size={50} className="ring-2 ring-white/15" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-navy bg-[#4ade80]" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[20px] font-semibold leading-tight">{desk?.name ?? 'Priya Nair'}</div>
            <div className="text-[13px] text-white/65">Privacy desk lead</div>
          </div>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-white/80">
          Answers parent questions, runs requests and your monthly review.
          {active && <> This week: <span className="text-white">{active.title.charAt(0).toLowerCase() + active.title.slice(1)}</span>.</>}
        </p>
        <div className="mt-3 text-[12.5px] text-white/55">Usually replies within 2 working hours</div>
        {closed.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <dt className="text-[11.5px] text-white/55">Requests closed</dt>
              <dd className="mt-1 font-display text-[24px] font-semibold leading-none"><CountUp value={closed.length} /></dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-white/55">Average time to close</dt>
              <dd className="mt-1 font-display text-[24px] font-semibold leading-none"><CountUp value={avg} /><span className="ml-1 font-sans text-[13px] font-normal text-white/60">days</span></dd>
            </div>
          </dl>
        )}
        <div className="mt-auto pt-5">
          <Button to="/experts" variant="secondary" icon={<MessageCircle className="size-4" />} className="w-full border-transparent bg-white text-navy hover:bg-white/90">
            Message the desk
          </Button>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'ok' }) {
  return (
    <div className="min-w-0">
      <div className={cn('font-display text-[34px] font-semibold leading-none', tone === 'ok' ? 'text-ok' : 'text-ink')}><CountUp value={value} /></div>
      <div className="mt-2 text-[12.5px] leading-snug text-ink-2">{label}</div>
    </div>
  )
}

function MediaSafetyCard() {
  const ctx = useCtx()
  const assets = useApp((s) => s.assets)
  const publications = useApp((s) => s.publications)
  const stats = React.useMemo(() => {
    const photos = assets.filter((a) => a.kind === 'photo')
    let blurred = 0
    for (const a of photos) blurred += evaluateAsset(ctx, a, 'instagram').faces.filter((f) => f.state === 'blocked').length
    return { photos: photos.length, blurred, flagged: publications.filter((p) => p.status === 'takedown-requested').length }
  }, [assets, ctx, publications])
  return (
    <Card className="flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-azure-50 text-azure"><Images className="size-[18px]" /></span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Media safety</h2>
            <div className="text-[12.5px] text-ink-3">This month · {monthLabel()}</div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat value={stats.photos} label="photos checked" />
        <Stat value={stats.blurred} label="faces auto-blurred" />
        <Stat value={0} label="published without permission" tone="ok" />
      </div>
      <p className="mt-auto flex items-start gap-2 pt-5 text-[13px] leading-snug text-ink-2">
        <ScanFace className="mt-0.5 size-4 shrink-0 text-ok" />
        {stats.photos === 0
          ? 'Photos appear here as soon as the photographer uploads them.'
          : stats.flagged
            ? `Every photo was checked before sharing. ${stats.flagged} live post${stats.flagged > 1 ? 's were' : ' was'} flagged for takedown after a parent changed their mind.`
            : 'Every photo was checked against each parent’s choices before it was shared.'}
      </p>
      <Link to="/media" className="pt-4 text-[13px] font-semibold text-azure hover:underline">Open Media Safe</Link>
    </Card>
  )
}

function PermissionsCard() {
  const guardians = useApp((s) => s.guardians)
  const total = guardians.length
  const done = guardians.filter((g) => g.onboarded).length
  return (
    <Card className="flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-ok-bg text-ok"><Users className="size-[18px]" /></span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Parent permissions</h2>
            <div className="text-[12.5px] text-ink-3">Verified, purpose by purpose</div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <SweepRing value={pct(done, total)} size={112} stroke={9} tone="ok">
          <div className="text-center leading-none">
            <div className="font-display text-[24px] font-semibold text-ink"><CountUp value={done} /></div>
            <div className="mt-1 text-[11px] text-ink-3">of {fmtNum(total)}</div>
          </div>
        </SweepRing>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug text-ink">{fmtNum(done)} of {fmtNum(total)} families have set their choices</div>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
            {total - done > 0 ? `${fmtNum(total - done)} still to go. Friendly reminders go out in English and Hindi.` : 'Every family has set their choices.'}
          </p>
        </div>
      </div>
      <Link to="/privacy/permissions" className="mt-auto pt-5 text-[13px] font-semibold text-azure hover:underline">See permissions</Link>
    </Card>
  )
}

function RequestsCard() {
  const requests = useApp((s) => s.requests)
  const students = useApp((s) => s.students)
  const open = [...openRequests(requests)].sort((a, b) => a.targetAt.localeCompare(b.targetAt))
  const now = new Date(DEMO_NOW).getTime()
  const late = open.filter((r) => new Date(r.targetAt).getTime() < now).length
  const next = open[0]
  const child = next ? students.find((s) => s.id === next.studentId) : undefined
  return (
    <Card className="flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-info-bg text-info"><Inbox className="size-[18px]" /></span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Parent requests</h2>
          <div className="text-[12.5px] text-ink-3">Access, correction, removal</div>
        </div>
      </div>
      <div className="mt-5 flex items-end gap-3">
        <div className="font-display text-[44px] font-semibold leading-none text-ink"><CountUp value={open.length} /></div>
        <div className="pb-1 text-[14px] text-ink-2">open</div>
      </div>
      <div className="mt-3">
        {late ? <Chip tone="warn">{late} past our 7-day target</Chip> : <Chip tone="ok">All within timeline</Chip>}
      </div>
      {next && (
        <p className="mt-3 text-[13px] leading-snug text-ink-2">
          Next due <span className="font-semibold text-ink">{shortDate(next.targetAt)}</span>: {REQUEST_LABEL[next.type].toLowerCase()}{child ? ` for ${child.name}` : ''}.
        </p>
      )}
      <Link to="/requests" className="mt-auto pt-5 text-[13px] font-semibold text-azure hover:underline">Open requests</Link>
    </Card>
  )
}

/* ---------------- Timeline ---------------- */

type StepState = 'done' | 'active' | 'goal'

function ReadyTimeline() {
  const reduce = useReducedMotion()
  const notices = useApp((s) => s.notices)
  const areas = useAreas()
  const v21 = notices.find((n) => n.id === 'v2.1')
  const vendorsDone = areas.find((a) => a.key === 'vendors')?.status === 'covered'
  const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const steps: { at: string; date: string; title: string; state: StepState; note?: string }[] = [
    { at: LEGAL.rulesNotified, date: fmtDate(LEGAL.rulesNotified), title: 'Rules notified', state: 'done' },
    { at: v21?.publishedAt ?? '2026-08-01', date: monthYear(v21?.publishedAt ?? '2026-08-01'), title: 'Notice v2.1 + parent choices', state: 'done' },
    { at: '2026-09-01', date: 'Sep 2026', title: 'Media Safe live', state: 'done' },
    { at: '2026-10-01', date: 'Oct 2026', title: 'Vendor clauses', state: vendorsDone ? 'done' : 'active', note: vendorsDone ? 'Done' : 'In progress' },
    { at: LEGAL.fullObligationsFrom, date: LEGAL.fullObligationsLabel, title: 'Full obligations', state: 'goal' },
  ]
  // "Today" position along the line (node centres sit at 10% … 90%)
  const t = new Date(DEMO_NOW).getTime()
  let pos = 10
  for (let i = 0; i < steps.length - 1; i++) {
    const a = new Date(steps[i].at).getTime()
    const b = new Date(steps[i + 1].at).getTime()
    if (t >= a && t <= b) pos = 10 + (i + (t - a) / (b - a)) * 20
    else if (t > b) pos = 10 + (i + 1) * 20
  }
  return (
    <Card className="rounded-2xl px-6 pb-7 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[23px] font-semibold text-ink">Ready before {LEGAL.fullObligationsLabel}</h2>
          <p className="mt-1 text-[14px] text-ink-2">Full DPDP obligations apply from {LEGAL.fullObligationsLabel}. Most of the groundwork is already in place.</p>
        </div>
        <Chip tone="ok">On track</Chip>
      </div>
      <div className="relative mt-9">
        {/* track */}
        <div className="absolute left-[10%] right-[10%] top-[15px] h-[3px] rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_6px,transparent_6px_12px)]" />
        <motion.div className="absolute left-[10%] top-[15px] h-[3px] rounded-full bg-ok"
          initial={reduce ? false : { width: 0 }} animate={{ width: `${pos - 10}%` }} transition={{ duration: 1.1, delay: 0.3, ease: EASE }} />
        <motion.div className="absolute top-[-22px] -translate-x-1/2 text-center" style={{ left: `${pos}%` }}
          initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <div className="rounded-full bg-navy px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">Today</div>
          <div className="mx-auto mt-1 h-[22px] w-px bg-navy/40" />
        </motion.div>
        <ol className="relative grid grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center px-2 text-center">
              <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 + i * 0.12, duration: 0.4, ease: EASE }}
                className={cn('relative flex size-[33px] items-center justify-center rounded-full',
                  s.state === 'done' && 'bg-ok text-white',
                  s.state === 'active' && 'border-[3px] border-marigold bg-surface',
                  s.state === 'goal' && 'bg-navy text-white')}>
                {s.state === 'done' && <Check className="size-4" strokeWidth={3} />}
                {s.state === 'active' && <><span className="size-2.5 rounded-full bg-marigold" /><span className="absolute inset-[-7px] animate-ping rounded-full border-2 border-marigold/40 [animation-duration:2.4s]" /></>}
                {s.state === 'goal' && <Flag className="size-4" />}
              </motion.span>
              <div className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{s.date}</div>
              <div className="mt-1 text-[14px] font-semibold leading-snug text-ink">{s.title}</div>
              {s.note && <div className={cn('mt-0.5 text-[12.5px] font-medium', s.state === 'active' ? 'text-warn' : 'text-ok')}>{s.note}</div>}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}

/* ---------------- Chairman home ---------------- */

function WaitingPill() {
  const tasks = useApp((s) => s.tasks)
  const n = tasks.filter((t) => t.status === 'open' && t.kind === 'approval').length
  if (!n) return null
  return (
    <button type="button" onClick={() => document.getElementById('needs-you')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-marigold/40 bg-[#fdf0d9]/70 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-[#6b4000] transition-colors hover:bg-[#fdf0d9]">
      <span className="flex size-5 items-center justify-center rounded-full bg-marigold text-[11px] font-bold text-navy num">{n}</span>
      {n === 1 ? '1 decision is waiting' : `${n} decisions are waiting`}
      <ArrowDown className="size-3.5" />
    </button>
  )
}

function ChairmanHome() {
  const areas = useAreas()
  return (
    <div className="pb-6">
      <HomeHeader below={<WaitingPill />} actions={<Button variant="navy" size="lg" to="/reports/trustee" icon={<FileDown className="size-[18px]" />}>Download trustee report</Button>} />
      <section aria-label="Coverage by area" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {areas.map((a, i) => <Rise key={a.key} i={3 + i * 0.5} className="h-full"><AreaCard area={a} /></Rise>)}
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Rise i={8} className="scroll-mt-24 lg:col-span-2"><div id="needs-you" className="h-full"><NeedsYou /></div></Rise>
        <Rise i={9}><DeskCard /></Rise>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Rise i={10}><MediaSafetyCard /></Rise>
        <Rise i={10.5}><PermissionsCard /></Rise>
        <Rise i={11}><RequestsCard /></Rise>
      </div>
      <Rise i={12} className="mt-4"><ReadyTimeline /></Rise>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[12px] leading-relaxed text-ink-3">{LEGAL.disclaimer}</p>
    </div>
  )
}

/* ---------------- Operational home (principal, office, desk) ---------------- */

function TasksCard() {
  const tasks = useApp((s) => s.tasks)
  const role = useApp((s) => s.role)
  const me = ROLE[role].person
  const [tab, setTab] = React.useState('open')
  const open = sortByDue(tasks.filter((t) => t.status === 'open'))
  const mine = open.filter((t) => t.ownerId === me)
  const done = tasks.filter((t) => t.status === 'done')
  const overdue = open.filter((t) => dueTone(t.dueAt) === 'risk').length
  const list = tab === 'mine' ? mine : tab === 'done' ? done : open
  return (
    <Card className="h-full rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[23px] font-semibold text-ink">Open tasks</h2>
          <p className="mt-1 text-[14px] text-ink-2">{open.length} open across the team{overdue ? `, ${overdue} overdue` : ', none overdue'}.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} tabs={[
          { value: 'open', label: 'All open', count: open.length },
          { value: 'mine', label: 'Mine', count: mine.length },
          { value: 'done', label: 'Done', count: done.length },
        ]} />
      </div>
      {list.length ? (
        <ul className="mt-3 divide-y divide-line">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((t) => <TaskRow key={t.id} task={t} />)}
          </AnimatePresence>
        </ul>
      ) : (
        <Empty icon={<CircleCheck className="size-6" />} title={tab === 'done' ? 'Nothing completed yet' : 'All clear'}
          body={tab === 'mine' ? 'Nothing is assigned to you right now.' : tab === 'done' ? 'Completed tasks appear here with their evidence.' : 'Your team has no open tasks.'} />
      )}
    </Card>
  )
}

function SideCard({ icon, title, sub, children, link }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode; link?: { to: string; label: string } }) {
  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {sub && <div className="text-[12.5px] text-ink-3">{sub}</div>}
          </div>
        </div>
        {link && <Link to={link.to} className="text-[13px] font-semibold text-azure hover:underline">{link.label}</Link>}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  )
}

function ApprovalsCard() {
  const tasks = useApp((s) => s.tasks)
  const people = useApp((s) => s.people)
  const openTask = useOpenTask()
  const approvals = sortByDue(tasks.filter((t) => t.status === 'open' && t.kind === 'approval'))
  return (
    <SideCard icon={<span className="flex size-9 items-center justify-center rounded-xl bg-[#fdf0d9] text-[#8a5300]"><Stamp className="size-[18px]" /></span>}
      title="Approvals" sub={approvals.length ? `${approvals.length} waiting` : 'Nothing waiting'}>
      {approvals.length ? (
        <ul className="space-y-2">
          {approvals.map((t) => {
            const owner = personOf(people, t.ownerId)
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold leading-snug text-ink">{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">{owner?.name}<Due tone={dueTone(t.dueAt)}>{dueText(t.dueAt)}</Due></div>
                </div>
                <Button size="sm" onClick={() => openTask(t)}>Review</Button>
              </li>
            )
          })}
        </ul>
      ) : <p className="text-[13.5px] text-ink-2">No approvals are waiting.</p>}
    </SideCard>
  )
}

function RequestsDueCard() {
  const requests = useApp((s) => s.requests)
  const students = useApp((s) => s.students)
  const open = [...openRequests(requests)].sort((a, b) => a.targetAt.localeCompare(b.targetAt))
  const late = open.filter((r) => dueTone(r.targetAt) === 'risk').length
  return (
    <SideCard icon={<span className="flex size-9 items-center justify-center rounded-xl bg-info-bg text-info"><Inbox className="size-[18px]" /></span>}
      title="Requests due" sub={open.length ? (late ? `${late} past our 7-day target` : `${open.length} open, all within timeline`) : 'None open'}
      link={{ to: '/requests', label: 'All requests' }}>
      {open.length ? (
        <ul className="divide-y divide-line">
          {open.slice(0, 4).map((r) => (
            <li key={r.id}>
              <Link to={`/requests/${r.id}`} className="group flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink group-hover:text-azure">{REQUEST_LABEL[r.type]} · {students.find((s) => s.id === r.studentId)?.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3"><span className="font-mono">{r.id}</span><Due tone={dueTone(r.targetAt)}>{dueText(r.targetAt)}</Due></div>
                </div>
                <ArrowRight className="size-4 text-ink-3 group-hover:text-azure" />
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-[13.5px] text-ink-2">No parent requests are open.</p>}
    </SideCard>
  )
}

function IncidentsCard() {
  const incidents = useApp((s) => s.incidents)
  const open = incidents.filter((i) => i.status !== 'closed')
  const last = incidents.find((i) => i.status === 'closed')
  return (
    <SideCard icon={<span className={cn('flex size-9 items-center justify-center rounded-xl', open.length ? 'bg-risk-bg text-risk' : 'bg-ok-bg text-ok')}>{open.length ? <Siren className="size-[18px]" /> : <ShieldCheck className="size-[18px]" />}</span>}
      title="Incidents" sub={open.length ? `${open.length} open` : 'No open incidents'} link={{ to: '/trust/incidents', label: 'Breach room' }}>
      {open.length ? (
        <ul className="space-y-2">
          {open.map((i) => (
            <li key={i.id}>
              <Link to={`/trust/incidents/${i.id}`} className="block rounded-xl bg-risk-bg/50 px-3 py-2.5 hover:bg-risk-bg">
                <div className="text-[13.5px] font-semibold text-ink">{i.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-2">Board report due {fmtDate(i.boardDetailedDueAt)} · {fmtNum(i.affectedCount)} affected</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] leading-snug text-ink-2">
          {last ? <>Last: {last.title.charAt(0).toLowerCase() + last.title.slice(1)}. Closed with a Board report inside {LEGAL.boardDetailedReportHours} hours.</> : 'Nothing to report.'}
        </p>
      )}
    </SideCard>
  )
}

function OpsHome() {
  const areas = useAreas()
  return (
    <div className="pb-6">
      <HomeHeader actions={<>
        <Button variant="secondary" to="/readiness" icon={<Compass className="size-4" />}>Readiness check</Button>
        <Button variant="navy" to="/reports/trustee" icon={<FileDown className="size-4" />}>Trustee report</Button>
      </>} />
      <section aria-label="Coverage by area" className="grid grid-cols-4 gap-3 xl:grid-cols-8">
        {areas.map((a, i) => <Rise key={a.key} i={3 + i * 0.4}><AreaTile area={a} /></Rise>)}
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Rise i={7} className="lg:col-span-2"><TasksCard /></Rise>
        <div className="space-y-4">
          <Rise i={8}><ApprovalsCard /></Rise>
          <Rise i={9}><RequestsDueCard /></Rise>
          <Rise i={10}><IncidentsCard /></Rise>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[12px] leading-relaxed text-ink-3">{LEGAL.disclaimer}</p>
    </div>
  )
}

export function Home() {
  const role = useApp((s) => s.role)
  return (
    <>
      {role === 'chairman' ? <ChairmanHome /> : <OpsHome />}
      <DecisionDialog />
    </>
  )
}

