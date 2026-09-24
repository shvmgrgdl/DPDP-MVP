import * as React from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { ArrowLeft, Check, CircleCheck, FileCheck, MessageCircle } from 'lucide-react'
import { AREAS, LEGAL } from '@/data/reference'
import type { AreaKey, Obligation } from '@/data/types'
import { Avatar, Button, Card, Chip, Due, Empty } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp } from '@/store/app'
import { cn } from '@/lib/utils'
import { actorFor, dueText, dueTone, isOpenStatus, markObligationDone, personOf, sortByDue, statusLabel, statusTone, summarizeAreas } from './lib'
import { AreaGlyph, CountUp, Rise, TaskRow } from './parts'

function ObligationCard({ ob }: { ob: Obligation }) {
  const people = useApp((s) => s.people)
  const role = useApp((s) => s.role)
  const setUI = useApp((s) => s.setUI)
  const [showAll, setShowAll] = React.useState(false)
  const owner = personOf(people, ob.ownerId)
  const tone = statusTone(ob.status)
  const open = isOpenStatus(ob.status)
  const ids = showAll ? ob.evidenceIds : ob.evidenceIds.slice(0, 3)
  const markDone = () => {
    const evId = markObligationDone(ob.id, actorFor(role))
    toast.success('Marked as done', {
      description: `${ob.title}. Evidence recorded.`,
      action: evId ? { label: 'View record', onClick: () => setUI({ evidenceDrawer: evId }) } : undefined,
    })
  }
  return (
    <Card className={cn('rounded-2xl p-6 transition-colors', open && 'border-[#f2dfbd]')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip tone={tone} size="sm">{statusLabel(ob.status)}</Chip>
            {open && ob.dueAt && <Due tone={dueTone(ob.dueAt)}>{dueText(ob.dueAt)}</Due>}
          </div>
          <h3 className="mt-3 text-[17px] font-semibold leading-snug text-ink">{ob.title}</h3>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{ob.plain}</p>
        </div>
        <span className="shrink-0 rounded-md bg-sunken px-2 py-1 text-[11.5px] font-medium text-ink-3" title="Legal reference">{ob.legalRef}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-4">
        {owner && (
          <div className="flex items-center gap-2.5">
            <Avatar name={owner.name} size={30} />
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">{owner.name}</div>
              <div className="text-[12px] text-ink-3">{owner.title}</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-[12px] text-ink-3"><FileCheck className="size-3.5" />Evidence</span>
          {ids.map((id, i) => <EvidenceLink key={`${id}:${i}`} id={id} />)}
          {ob.evidenceIds.length > 3 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[12px] font-semibold text-ink-2 hover:text-ink">
              {showAll ? 'Show less' : `+${ob.evidenceIds.length - 3} more`}
            </button>
          )}
        </div>
      </div>
      {ob.status === 'action-due' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warn-bg/55 px-4 py-3">
          <p className="text-[13.5px] text-ink-2">Once this is finished, mark it done. We’ll record the evidence for you.</p>
          <Button size="sm" onClick={markDone} icon={<Check className="size-4" />}>Mark as done</Button>
        </div>
      )}
    </Card>
  )
}

export function AreaDetail() {
  const { area } = useParams()
  const def = AREAS.find((a) => a.key === area)
  const obligations = useApp((s) => s.obligations)
  const tasks = useApp((s) => s.tasks)
  const people = useApp((s) => s.people)
  const summary = React.useMemo(() => summarizeAreas(obligations).find((a) => a.key === area), [obligations, area])

  if (!def || !summary) {
    return (
      <Card className="rounded-2xl">
        <Empty title="We couldn’t find that area" body="It may have been renamed. Head back to see all eight areas." action={<Button to="/home" icon={<ArrowLeft className="size-4" />}>All areas</Button>} />
      </Card>
    )
  }

  const tone = statusTone(summary.status)
  const related = tasks.filter((t) => t.area === (def.key as AreaKey))
  const openTasks = sortByDue(related.filter((t) => t.status === 'open'))
  const doneTasks = related.filter((t) => t.status === 'done')
  const owner = personOf(people, summary.ownerId)
  const sorted = [...summary.obligations].sort((a, b) => Number(isOpenStatus(b.status)) - Number(isOpenStatus(a.status)))

  return (
    <div className="pb-6">
      <Rise>
        <Link to="/home" className="inline-flex items-center gap-1.5 rounded-lg py-1 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> All areas
        </Link>
      </Rise>
      <Rise i={1}>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-5">
            <AreaGlyph area={def.key} tone={tone} size={56} className="rounded-2xl" />
            <div className="min-w-0">
              <div className="label-caps">Coverage area</div>
              <h1 className="mt-1.5 font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.015em] text-ink">{def.label}</h1>
              <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-2">{def.blurb}</p>
            </div>
          </div>
          <Chip tone={tone} className="px-3.5 py-1.5 text-[13px]">{statusLabel(summary.status)}</Chip>
        </header>
      </Rise>

      <div className="mt-9 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Rise i={2}><h2 className="text-[15px] font-semibold text-ink">What’s expected, and where you stand</h2></Rise>
          {sorted.map((o, i) => <Rise key={o.id} i={3 + i}><ObligationCard ob={o} /></Rise>)}

          <Rise i={4 + sorted.length}>
            <Card className="mt-2 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-ink">Related tasks</h2>
                <span className="text-[12.5px] text-ink-3">{openTasks.length} open · {doneTasks.length} done</span>
              </div>
              {related.length ? (
                <ul className="mt-2 divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {[...openTasks, ...doneTasks].map((t) => <TaskRow key={t.id} task={t} />)}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-2"><CircleCheck className="size-4 text-ok" /> No tasks in this area right now.</p>
              )}
            </Card>
          </Rise>
        </div>

        <aside className="space-y-4">
          <Rise i={3}>
            <Card className="rounded-2xl p-6">
              <div className="label-caps">At a glance</div>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[12.5px] text-ink-3">In place</dt>
                  <dd className="mt-1 font-display text-[32px] font-semibold leading-none text-ink"><CountUp value={summary.inPlace} /><span className="text-[18px] text-ink-3"> / {summary.obligations.length}</span></dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-ink-3">Evidence records</dt>
                  <dd className="mt-1 font-display text-[32px] font-semibold leading-none text-ink"><CountUp value={summary.evidence} /></dd>
                </div>
              </dl>
              {owner && (
                <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <Avatar name={owner.name} size={36} />
                  <div className="leading-tight">
                    <div className="text-[12px] text-ink-3">{summary.open.length ? 'Next step with' : 'Looked after by'}</div>
                    <div className="text-[14px] font-semibold text-ink">{owner.name}</div>
                  </div>
                </div>
              )}
            </Card>
          </Rise>
          <Rise i={4}>
            <Card className="rounded-2xl bg-[#fbfaf7] p-6">
              <h3 className="text-[15px] font-semibold text-ink">Questions about this area?</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">Your privacy desk can explain what’s expected, or take a task off your team’s plate.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button to="/experts" variant="soft" size="sm" icon={<MessageCircle className="size-4" />}>Ask the desk</Button>
                <Button to="/evidence" variant="secondary" size="sm" icon={<FileCheck className="size-4" />}>Evidence vault</Button>
              </div>
            </Card>
          </Rise>
          <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">{LEGAL.disclaimer}</p>
        </aside>
      </div>
    </div>
  )
}
