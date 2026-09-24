import * as React from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Plus, Inbox, AlertTriangle, Scale } from 'lucide-react'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { LEGAL } from '@/data/reference'
import type { RequestStatus, RequestType } from '@/data/types'
import { PageHeader, Card, Kpi, Tabs, Select, Chip, Avatar, Empty, Button, Dialog, Field, Textarea, toneText } from '@/design/ui'
import { addDays, cn, fmtDate, relDays } from '@/lib/utils'
import { StudentPicker } from './StudentPicker'
import { CHANNEL_LABEL, OPEN_STATUSES, REQUEST_TYPES, REQUEST_TYPE_META, trackStatus } from './lib'

const COLS = 'grid grid-cols-[128px_1.5fr_92px_160px_170px_118px] items-center gap-3'

function NewRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const students = useApp((s) => s.students)
  const people = useApp((s) => s.people)
  const role = useApp((s) => s.role)
  const addRequest = useApp((s) => s.addRequest)
  const navigate = useNavigate()
  const ownerOptions = React.useMemo(() => people.filter((p) => ROLE[p.role].abilities.includes('manage-requests')), [people])
  const [type, setType] = React.useState<RequestType>('access')
  const [studentId, setStudentId] = React.useState<string | undefined>(undefined)
  const [channel, setChannel] = React.useState<'office' | 'parent-app' | 'privacy-centre' | 'email'>('office')
  const [ownerId, setOwnerId] = React.useState(ROLE[role].abilities.includes('manage-requests') ? ROLE[role].person : (ownerOptions[0]?.id ?? 'U-OFFICE'))
  const [summary, setSummary] = React.useState('')

  const reset = () => { setType('access'); setStudentId(undefined); setChannel('office'); setSummary(''); setOwnerId(ROLE[role].abilities.includes('manage-requests') ? ROLE[role].person : (ownerOptions[0]?.id ?? 'U-OFFICE')) }

  const submit = () => {
    if (!studentId) { toast.error('Pick the child this request is about'); return }
    if (!summary.trim()) { toast.error('Add a one-line summary'); return }
    const student = students.find((s) => s.id === studentId)!
    const receivedAt = new Date().toISOString()
    const id = addRequest({
      type, guardianId: student.guardianIds[0], studentId, channel, receivedAt,
      dueAt: addDays(receivedAt, LEGAL.grievanceMaxDays), targetAt: addDays(receivedAt, 7), ownerId, status: 'new', summary: summary.trim(),
    })
    toast.success(`${id} logged — target in 7 days, owner ${people.find((p) => p.id === ownerId)?.name ?? ownerId}`)
    onOpenChange(false)
    reset()
    navigate(`/requests/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }} title="New request" description="Office intake — for a request that arrived by phone, walk-in or email."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Log request</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Request type"><Select value={type} onChange={(e) => setType(e.target.value as RequestType)} options={REQUEST_TYPES.map((t) => ({ value: t, label: REQUEST_TYPE_META[t].label }))} /></Field>
        <Field label="How it arrived"><Select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} options={(['office', 'parent-app', 'privacy-centre', 'email'] as const).map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))} /></Field>
        <div className="sm:col-span-2"><Field label="Child" hint="Search by name or admission number"><StudentPicker studentId={studentId} onChange={setStudentId} /></Field></div>
        <Field label="Owner"><Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} options={ownerOptions.map((p) => ({ value: p.id, label: p.name }))} /></Field>
        <Field label="Internal target" hint="Set automatically"><div className="flex h-10 items-center text-sm text-ink-2">7 days · legal max {LEGAL.grievanceMaxDays} days</div></Field>
        <div className="sm:col-span-2"><Field label="What do they need?"><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Correct child's date of birth in ERP (shows 12 Mar, should be 21 Mar)" rows={3} /></Field></div>
      </div>
    </Dialog>
  )
}

export function RequestsList() {
  const requests = useApp((s) => s.requests)
  const students = useApp((s) => s.students)
  const guardians = useApp((s) => s.guardians)
  const classes = useApp((s) => s.classes)
  const people = useApp((s) => s.people)
  const navigate = useNavigate()
  const [tab, setTab] = React.useState<'open' | 'closed'>('open')
  const [typeFilter, setTypeFilter] = React.useState<'all' | RequestType>('all')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const isOpen = (st: RequestStatus) => OPEN_STATUSES.includes(st)
  const openList = requests.filter((r) => isOpen(r.status))
  const closedList = requests.filter((r) => !isOpen(r.status))
  const attention = openList.filter((r) => ['warn', 'risk'].includes(trackStatus(r).tone)).length

  let list = tab === 'open' ? openList : closedList
  if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter)
  list = [...list].sort((a, b) => tab === 'open' ? new Date(a.targetAt).getTime() - new Date(b.targetAt).getTime() : new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

  return (
    <div>
      <PageHeader eyebrow="Requests" title="Parent requests"
        subtitle="Access, correction, erasure and grievance requests from parents — each with an owner, a due date and a paper trail."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setDialogOpen(true)}>New request</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Open requests" value={openList.length} icon={<Inbox className="size-4" />} />
        <Kpi label="Needs attention" value={attention} tone={attention ? 'warn' : 'ok'} icon={<AlertTriangle className="size-4" />} sub={attention ? 'Due soon or past the 7-day target' : 'All on track'} />
        <Kpi label="Legal maximum" value={`${LEGAL.grievanceMaxDays} days`} icon={<Scale className="size-4" />} sub="Internal target is 7 days" />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} tabs={[{ value: 'open', label: 'Open', count: openList.length }, { value: 'closed', label: 'Closed', count: closedList.length }]} />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="w-auto min-w-[190px]"
          options={[{ value: 'all', label: 'All request types' }, ...REQUEST_TYPES.map((t) => ({ value: t, label: REQUEST_TYPE_META[t].label }))]} />
      </div>
      <Card className="overflow-hidden">
        <div className={cn(COLS, 'border-b border-line bg-sunken/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-3')}>
          <div>Type</div><div>Child &amp; parent</div><div>Received</div><div>Owner</div><div>Target · legal max</div><div>Status</div>
        </div>
        {list.length === 0 && <Empty icon={<Inbox className="size-6" />} title={tab === 'open' ? 'No open requests' : 'No closed requests yet'} body={typeFilter !== 'all' ? 'Try a different request type.' : tab === 'open' ? 'New parent requests will appear here.' : 'Resolved and closed requests will appear here.'} />}
        {list.map((r) => {
          const student = students.find((s) => s.id === r.studentId)
          const guardian = guardians.find((g) => g.id === r.guardianId)
          const owner = people.find((p) => p.id === r.ownerId)
          const meta = REQUEST_TYPE_META[r.type]
          const track = trackStatus(r)
          const Icon = meta.icon
          return (
            <button type="button" key={r.id} onClick={() => navigate(`/requests/${r.id}`)} className={cn(COLS, 'w-full border-b border-line px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-sunken')}>
              <Chip tone="azure" size="sm" icon={<Icon className="size-3.5" />}>{meta.short}</Chip>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{student?.name ?? '—'} <span className="font-normal text-ink-3">· {classes.find((c) => c.id === student?.classId)?.label}</span></div>
                <div className="truncate text-xs text-ink-3">{guardian?.name ?? '—'} · {r.id}</div>
              </div>
              <div className="text-xs text-ink-2">{fmtDate(r.receivedAt)}</div>
              <div className="flex min-w-0 items-center gap-2">{owner && <Avatar name={owner.name} size={22} />}<span className="truncate text-xs text-ink-2">{owner?.name ?? r.ownerId}</span></div>
              <div className="min-w-0">
                <div className={cn('truncate text-xs font-semibold', toneText[track.tone])}>{tab === 'open' ? `Target: ${relDays(r.targetAt)}` : 'Target met'}</div>
                <div className="truncate text-[11px] text-ink-3">Legal max {fmtDate(r.dueAt)}</div>
              </div>
              <Chip tone={track.tone} size="sm" icon={false}>{track.label}</Chip>
            </button>
          )
        })}
      </Card>
      <NewRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
