import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { animate, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  Archive, ArrowRight, ArrowUpRight, Check, FileCheck, Handshake, Images, Inbox, Landmark, LifeBuoy, LockKeyhole, ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { AreaKey, Task } from '@/data/types'
import { Avatar, Button, Chip, Dialog, Due, Ring, toneText, type Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import { cn, fmtNum } from '@/lib/utils'
import { DECISIONS, type DecisionKey } from '@/modules/readiness/tree'
import {
  actorFor, completeTaskWithRecord, dueText, dueTone, personOf, statusLabel, statusTone, TASK_AREA_LABEL, type AreaSummary,
} from './lib'

/* ---------------- Motion helpers ---------------- */

export const EASE = [0.22, 1, 0.36, 1] as const

/** Soft fade-up entrance. `i` staggers siblings. */
export function Rise({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.04 + i * 0.05, ease: EASE }}>
      {children}
    </motion.div>
  )
}

/** Number that counts up to its value (Fraunces-friendly, tabular). */
export function CountUp({ value, delay = 0.15, duration = 0.9, format = fmtNum, className }: { value: number; delay?: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion()
  const [n, setN] = React.useState(reduce ? value : 0)
  const shown = React.useRef(reduce ? value : 0)
  React.useEffect(() => {
    if (reduce) { setN(value); shown.current = value; return }
    const c = animate(shown.current, value, { duration, delay, ease: EASE, onUpdate: (v) => { shown.current = v; setN(v) } })
    return () => c.stop()
  }, [value, reduce, delay, duration])
  return <span className={cn('num', className)}>{format(Math.round(n))}</span>
}

/** Ring that sweeps in on mount. */
export function SweepRing({ value, ...rest }: React.ComponentProps<typeof Ring>) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    const id = window.setTimeout(() => setV(value), 120)
    return () => window.clearTimeout(id)
  }, [value])
  return <Ring value={v} {...rest} />
}

/* ---------------- Areas ---------------- */

export const AREA_ICON: Record<AreaKey, LucideIcon> = {
  governance: Landmark, notices: ScrollText, media: Images, rights: Inbox, vendors: Handshake, security: LockKeyhole, retention: Archive, assurance: LifeBuoy,
}
export const TINT: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', info: 'bg-info-bg text-info', expert: 'bg-expert-bg text-expert',
  muted: 'bg-muted-bg text-ink-2', risk: 'bg-risk-bg text-risk', azure: 'bg-azure-50 text-azure',
}

export function AreaGlyph({ area, tone, size = 40, className }: { area: AreaKey; tone: Tone; size?: number; className?: string }) {
  const Icon = AREA_ICON[area]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-xl', TINT[tone], className)} style={{ width: size, height: size }}>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.9} />
    </span>
  )
}

/** Executive area card: status, plain blurb, owner and evidence. */
export function AreaCard({ area }: { area: AreaSummary }) {
  const people = useApp((s) => s.people)
  const owner = personOf(people, area.ownerId)
  const tone = statusTone(area.status)
  const open = area.status !== 'covered'
  return (
    <Link to={`/home/areas/${area.key}`}
      className="group card relative flex h-full flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-pop)] focus-visible:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <AreaGlyph area={area.key} tone={tone} />
        <Chip tone={tone} size="sm">{statusLabel(area.status)}</Chip>
      </div>
      <h3 className="mt-4 text-[15.5px] font-semibold leading-snug text-ink">{area.label}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{open && area.worst ? area.worst.plain : area.blurb}</p>
      {open && area.worst?.dueAt && <div className="mt-2"><Due tone={dueTone(area.worst.dueAt)}>{dueText(area.worst.dueAt)}</Due></div>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <span className="flex min-w-0 items-center gap-2">
          {owner && <Avatar name={owner.name} size={24} />}
          <span className="truncate text-[12.5px] text-ink-2">{owner?.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[12.5px] text-ink-3 transition-colors group-hover:text-azure">
          <FileCheck className="size-3.5" />
          <span className="num">{area.evidence}</span> records
          <ArrowUpRight className="-mr-1 size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

/** Compact tile for the operational view. */
export function AreaTile({ area }: { area: AreaSummary }) {
  const tone = statusTone(area.status)
  return (
    <Link to={`/home/areas/${area.key}`}
      className="group card flex flex-col rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-pop)]">
      <AreaGlyph area={area.key} tone={tone} size={32} />
      <div className="mt-3 truncate text-[13.5px] font-semibold text-ink">{area.short}</div>
      <div className={cn('mt-0.5 truncate text-[12px] font-medium', toneText[tone])}>{statusLabel(area.status)}</div>
    </Link>
  )
}

/* ---------------- Tasks ---------------- */

/** Where a task's primary button goes. Readiness decisions open the decision dialog on /home. */
export function useOpenTask() {
  const navigate = useNavigate()
  return (t: Task) => navigate(t.link ?? (t.kind === 'approval' ? '/privacy/notices' : '/home'))
}

export function TaskRow({ task, compact }: { task: Task; compact?: boolean }) {
  const people = useApp((s) => s.people)
  const setUI = useApp((s) => s.setUI)
  const openTask = useOpenTask()
  const owner = personOf(people, task.ownerId)
  const done = task.status === 'done'
  const complete = () => {
    const evId = completeTaskWithRecord(task.id)
    toast.success('Task done', {
      description: task.title,
      action: evId ? { label: 'View record', onClick: () => setUI({ evidenceDrawer: evId }) } : undefined,
    })
  }
  return (
    <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className={cn('flex items-center gap-3.5', compact ? 'py-2.5' : 'py-3.5')}>
      <button type="button" onClick={complete} disabled={done} aria-label={done ? 'Completed' : `Mark “${task.title}” as done`}
        className={cn('group/check flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          done ? 'border-ok bg-ok text-white' : 'border-line-strong text-transparent hover:border-ok hover:bg-ok-bg hover:text-ok')}>
        <Check className="size-3.5" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[14.5px] font-medium leading-snug', done ? 'text-ink-3 line-through decoration-line-strong' : 'text-ink')}>{task.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          <span>{TASK_AREA_LABEL(task.area)}</span>
          {owner && <span className="flex items-center gap-1.5"><Avatar name={owner.name} size={18} />{owner.name}</span>}
          {!done && <Due tone={dueTone(task.dueAt)}>{dueText(task.dueAt)}</Due>}
        </div>
      </div>
      {task.link && !done && (
        <Button variant="ghost" size="sm" onClick={() => openTask(task)} className="shrink-0">
          {task.kind === 'approval' ? 'Review' : 'Open'} <ArrowRight className="size-3.5" />
        </Button>
      )}
    </motion.li>
  )
}

/* ---------------- Decisions (from the readiness plan) ---------------- */

export function DecisionDialog() {
  const [params, setParams] = useSearchParams()
  const key = params.get('decide') as DecisionKey | null
  const def = key ? DECISIONS[key] : undefined
  const [choice, setChoice] = React.useState(0)
  React.useEffect(() => {
    if (def) setChoice(Math.max(0, def.options.findIndex((o) => o.recommended)))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => {
    const p = new URLSearchParams(params)
    p.delete('decide')
    setParams(p, { replace: true })
  }
  const record = () => {
    if (!def || !key) return
    const s = useApp.getState()
    const task = s.tasks.find((t) => t.status === 'open' && t.link === `/home?decide=${key}`)
    if (task) s.completeTask(task.id)
    const opt = def.options[choice]
    const evId = s.addEvidence({
      type: 'readiness', title: `Decision recorded: ${opt.label}`, actor: actorFor(s.role), refs: task ? [task.id] : [],
      payload: { question: def.question, decision: opt.label },
    })
    toast.success('Decision recorded', {
      description: 'Saved to the evidence vault and added to the trustee report.',
      action: { label: 'View record', onClick: () => useApp.getState().setUI({ evidenceDrawer: evId }) },
    })
    close()
  }
  return (
    <Dialog open={!!def} onOpenChange={(v) => !v && close()} title={def?.question ?? ''} description={def?.context}
      footer={<><Button variant="secondary" onClick={close}>Decide later</Button><Button onClick={record} icon={<Check className="size-4" />}>Record decision</Button></>}>
      <div role="radiogroup" className="space-y-2.5">
        {def?.options.map((o, i) => (
          <button key={o.label} type="button" role="radio" aria-checked={choice === i} onClick={() => setChoice(i)}
            className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
              choice === i ? 'border-azure bg-azure-50/70 ring-1 ring-azure' : 'border-line-strong hover:bg-sunken')}>
            <span className={cn('mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2', choice === i ? 'border-azure' : 'border-line-strong')}>
              {choice === i && <span className="size-2 rounded-full bg-azure" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
                {o.label}{o.recommended && <Chip tone="azure" size="sm" icon={false}>Recommended</Chip>}
              </span>
              <span className="mt-0.5 block text-[13px] text-ink-2">{o.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
