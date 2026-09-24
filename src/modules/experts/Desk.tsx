import * as React from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { Inbox, ListChecks, ShieldAlert, Users, CheckCircle2 } from 'lucide-react'
import { PageHeader, Card, SectionTitle, Button, Due, Kpi, Empty, type Tone } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { EXPERTS } from '@/data/reference'
import { DEMO_NOW, relDays } from '@/lib/utils'
import { OTHER_DESK_SCHOOLS } from './data'
import { StatusStepper } from './parts'
import { RequestDetail } from './RequestDetail'

const CHECKLIST = [
  'Reviewed every open parent request against its due date',
  'Checked vendor contracts for missing clauses',
  'Reviewed the incident log for anything unclosed',
  "Confirmed this term's staff training completion",
  'Reviewed retention items due this month',
]

function slaTone(dueAt: string): Tone {
  const days = Math.round((new Date(dueAt).getTime() - new Date(DEMO_NOW).getTime()) / 86400000)
  if (days < 0) return 'risk'
  if (days <= 2) return 'warn'
  return 'ok'
}

export default function Desk() {
  const school = useApp((s) => s.school)
  const requests = useApp((s) => s.requests)
  const tasks = useApp((s) => s.tasks)
  const incidents = useApp((s) => s.incidents)
  const experts = useApp((s) => s.experts)
  const role = useApp((s) => s.role)
  const addEvidence = useApp((s) => s.addEvidence)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [checked, setChecked] = React.useState<boolean[]>(() => CHECKLIST.map(() => false))
  const [lastReviewEv, setLastReviewEv] = React.useState<string | null>(null)

  const openRequests = requests.filter((r) => !['resolved', 'closed'].includes(r.status))
  const openTasks = tasks.filter((t) => t.status === 'open')
  const openIncidents = incidents.filter((i) => i.status !== 'closed')
  const openExpert = experts.filter((e) => e.status !== 'closed')

  const meId = ROLE[role].person
  const monthLabel = new Date(DEMO_NOW).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const allChecked = checked.every(Boolean)

  const submitReview = () => {
    const id = addEvidence({ type: 'readiness', title: `Monthly privacy review completed for ${school.shortName} — ${monthLabel}`, actor: meId, refs: [] })
    setLastReviewEv(id)
    toast.success('Monthly review logged')
  }

  return (
    <div>
      <PageHeader eyebrow="Privacy desk" title="Managed desk inbox" subtitle="Everything open for your schools, in one place." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy px-3.5 py-1.5 text-[13px] font-semibold text-white">{school.name}</span>
        <span className="text-[12px] text-ink-3">Other schools on your desk:</span>
        {OTHER_DESK_SCHOOLS.map((n) => (
          <button key={n} type="button" onClick={() => toast(`Demo data is only available for ${school.name}.`)}
            className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-3 opacity-60 hover:opacity-90">{n}</button>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Inbox className="size-4" />} label="Open requests" value={openRequests.length} />
        <Kpi icon={<ListChecks className="size-4" />} label="Open tasks" value={openTasks.length} />
        <Kpi icon={<ShieldAlert className="size-4" />} label="Open incidents" value={openIncidents.length} tone={openIncidents.length ? 'warn' : 'ok'} />
        <Kpi icon={<Users className="size-4" />} label="Expert items in flight" value={openExpert.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle action={<Link to="/requests" className="text-[12.5px] font-semibold text-azure">View all</Link>}>Parent requests</SectionTitle>
            {openRequests.length === 0 ? <Empty title="No open requests" /> : (
              <div className="divide-y divide-line">
                {openRequests.slice(0, 6).map((r) => (
                  <Link key={r.id} to={`/requests/${r.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-sunken">
                    <div className="min-w-0"><div className="truncate text-[13.5px] font-medium text-ink">{r.summary}</div><div className="text-[11.5px] text-ink-3">{r.id} · {r.type}</div></div>
                    <Due tone={slaTone(r.dueAt)}>{relDays(r.dueAt)}</Due>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <SectionTitle action={<Link to="/home" className="text-[12.5px] font-semibold text-azure">View all</Link>}>Tasks</SectionTitle>
            {openTasks.length === 0 ? <Empty title="No open tasks" /> : (
              <div className="divide-y divide-line">
                {openTasks.slice(0, 6).map((t) => (
                  <Link key={t.id} to={t.link ?? '/home'} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-sunken">
                    <div className="min-w-0"><div className="truncate text-[13.5px] font-medium text-ink">{t.title}</div><div className="text-[11.5px] capitalize text-ink-3">{t.area}</div></div>
                    <Due tone={slaTone(t.dueAt)}>{relDays(t.dueAt)}</Due>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <SectionTitle action={<Link to="/trust" className="text-[12.5px] font-semibold text-azure">View all</Link>}>Incidents</SectionTitle>
            {openIncidents.length === 0 ? <Empty title="No open incidents" /> : (
              <div className="divide-y divide-line">
                {openIncidents.map((i) => (
                  <Link key={i.id} to={`/trust/incidents/${i.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-sunken">
                    <div className="min-w-0"><div className="truncate text-[13.5px] font-medium text-ink">{i.title}</div><div className="text-[11.5px] text-ink-3">{i.id} · {i.status}</div></div>
                    <Due tone={slaTone(i.boardDetailedDueAt)}>{relDays(i.boardDetailedDueAt)}</Due>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <SectionTitle>Expert items</SectionTitle>
            {openExpert.length === 0 ? <Empty title="Nothing in flight" /> : (
              <div className="space-y-3">
                {openExpert.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0"><div className="truncate text-[13.5px] font-medium text-ink">{r.title}</div><div className="text-[11.5px] text-ink-3">{EXPERTS.find((e) => e.kind === r.kind)?.title} · {r.partner}</div></div>
                      <Button variant="ghost" size="sm" onClick={() => setOpenId(r.id)}>Open</Button>
                    </div>
                    <StatusStepper status={r.status} className="mt-3" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <SectionTitle>Monthly review checklist</SectionTitle>
          <p className="mb-3 text-[12.5px] text-ink-3">{monthLabel}</p>
          <div className="space-y-2.5">
            {CHECKLIST.map((c, i) => (
              <label key={c} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink">
                <input type="checkbox" className="mt-0.5 accent-azure" checked={checked[i]} onChange={() => setChecked((arr) => arr.map((v, j) => (j === i ? !v : v)))} />
                {c}
              </label>
            ))}
          </div>
          <Button className="mt-4 w-full" icon={<CheckCircle2 className="size-4" />} disabled={!allChecked} onClick={submitReview}>Log this month's review</Button>
          {lastReviewEv && <p className="mt-2 text-[12px] text-ok">Logged as <EvidenceLink id={lastReviewEv} /></p>}
        </Card>
      </div>

      <RequestDetail id={openId} onClose={() => setOpenId(null)} mode="desk" />
    </div>
  )
}
