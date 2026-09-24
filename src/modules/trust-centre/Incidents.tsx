import * as React from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Siren, Plus, Info } from 'lucide-react'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { LEGAL } from '@/data/reference'
import type { Incident } from '@/data/types'
import { PageHeader, Card, Chip, Kpi, Button, Dialog, Field, Input, Select, Switch, Empty, Due } from '@/design/ui'
import { addHours, cn, fmtDate, relDays } from '@/lib/utils'
import { INCIDENT_KIND_META } from './shared'

const KIND_PRESETS: { kind: Incident['kind']; title: string }[] = [
  { kind: 'lost-device', title: 'Lost teacher laptop' },
  { kind: 'misdirected-email', title: 'Email sent to the wrong parent group' },
  { kind: 'unauthorised-access', title: 'Unauthorised access to a school system' },
  { kind: 'vendor-breach', title: 'A vendor reported a breach' },
  { kind: 'photo-leak', title: 'Student photos or videos leaked' },
]
const DATA_OPTIONS = ['Student names', 'Contact numbers', 'Photos or videos', 'Academic records', 'Health records', 'Attendance records', 'Fee or payment details', 'Login credentials']

function ReportIncidentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const addIncident = useApp((s) => s.addIncident)
  const role = useApp((s) => s.role)
  const navigate = useNavigate()
  const [kindIdx, setKindIdx] = React.useState(0)
  const [title, setTitle] = React.useState(KIND_PRESETS[0].title)
  const [data, setData] = React.useState<string[]>([])
  const [count, setCount] = React.useState('')
  const [contained, setContained] = React.useState(false)

  const reset = () => { setKindIdx(0); setTitle(KIND_PRESETS[0].title); setData([]); setCount(''); setContained(false) }
  const toggleData = (d: string) => setData((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  const submit = () => {
    if (!data.length) { toast.error('Select at least one kind of data affected'); return }
    const n = Number(count)
    if (!n || n < 1) { toast.error('Enter how many people are affected'); return }
    const by = ROLE[role].person || role
    const detectedAt = new Date().toISOString()
    const id = addIncident({
      title: title.trim() || KIND_PRESETS[kindIdx].title, kind: KIND_PRESETS[kindIdx].kind, detectedAt,
      status: contained ? 'contained' : 'open', affectedData: data, affectedCount: n,
      boardDetailedDueAt: addHours(detectedAt, LEGAL.boardDetailedReportHours),
      steps: [{ at: detectedAt, text: 'Incident reported', by, kind: 'detect' }, ...(contained ? [{ at: detectedAt, text: 'Contained immediately on report', by, kind: 'contain' as const }] : [])],
    })
    toast.success(`${id} opened — Board detailed report due in 72 hours`)
    onOpenChange(false); reset()
    navigate(`/trust/incidents/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }} title="Report an incident" wide
      description="The 72-hour clock to the Board's detailed report starts the moment you save this."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="danger" onClick={submit}>Open incident</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What happened">
          <Select value={String(kindIdx)} onChange={(e) => { const i = Number(e.target.value); setKindIdx(i); setTitle(KIND_PRESETS[i].title) }}
            options={KIND_PRESETS.map((k, i) => ({ value: String(i), label: k.title }))} />
        </Field>
        <Field label="Short title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="What data is affected?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DATA_OPTIONS.map((d) => (
                <label key={d} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[13px]', data.includes(d) ? 'border-azure bg-azure-50 text-azure' : 'border-line-strong text-ink-2 hover:bg-sunken')}>
                  <input type="checkbox" className="accent-[--color-azure]" checked={data.includes(d)} onChange={() => toggleData(d)} /> {d}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <Field label="How many people are affected?"><Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 38" /></Field>
        <Field label="Already contained?" hint="Access revoked, device recovered, or risk otherwise stopped">
          <div className="flex h-10 items-center"><Switch checked={contained} onCheckedChange={setContained} label="Already contained" /><span className="ml-3 text-sm text-ink-2">{contained ? 'Yes' : 'Not yet'}</span></div>
        </Field>
      </div>
    </Dialog>
  )
}

export function Incidents() {
  const incidents = useApp((s) => s.incidents)
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const openCount = incidents.filter((i) => i.status !== 'closed').length
  const sorted = [...incidents].sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Incidents"
        subtitle="Every personal-data breach, however small, gets a Breach Room: contain, assess, tell parents, tell the Board."
        actions={<Button variant="danger" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Report an incident</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Open incidents" value={openCount} tone={openCount ? 'risk' : 'ok'} icon={<Siren className="size-4" />} />
        <Kpi label="Total on record" value={incidents.length} />
        <Card className="flex items-start gap-3 p-5 sm:col-span-1">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <p className="text-[13px] leading-snug text-ink-2">Every personal-data breach must be intimated to the Board — there is no minimum size or severity threshold.</p>
        </Card>
      </div>
      {sorted.length === 0 ? (
        <Card><Empty icon={<Siren className="size-6" />} title="No incidents on record" body="If something happens — a lost device, a misdirected email — report it here." /></Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((i) => {
            const meta = INCIDENT_KIND_META[i.kind]
            const Icon = meta.icon
            const awaitingReport = !['reported', 'closed'].includes(i.status)
            const overdue = awaitingReport && new Date(i.boardDetailedDueAt).getTime() < Date.now()
            return (
              <Card key={i.id} as="button" onClick={() => navigate(`/trust/incidents/${i.id}`)} className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:shadow-[var(--shadow-pop)]">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', i.status === 'closed' ? 'bg-sunken text-ink-3' : 'bg-risk-bg text-risk')}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{i.title}</div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">{i.id} · {fmtDate(i.detectedAt)} · {i.affectedCount} affected · {i.affectedData.slice(0, 2).join(', ')}{i.affectedData.length > 2 ? '…' : ''}</div>
                </div>
                {awaitingReport && <Due tone={overdue ? 'risk' : 'warn'}>{overdue ? 'Board report overdue' : `Board report ${relDays(i.boardDetailedDueAt)}`}</Due>}
                <Chip tone={i.status === 'closed' ? 'muted' : i.status === 'reported' ? 'ok' : i.status === 'contained' ? 'warn' : 'risk'} size="sm" className="shrink-0 capitalize">{i.status}</Chip>
              </Card>
            )
          })}
        </div>
      )}
      <ReportIncidentDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
