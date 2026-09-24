import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  ArrowLeft, ShieldCheck, CircleCheck, PenLine, ImageOff, Trash2, Printer, Send, Fingerprint, Scale,
} from 'lucide-react'
import { useApp, personName, pkey } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { LEGAL, MEDIA_PURPOSES, CORE_PURPOSES, DEST } from '@/data/reference'
import type { PermissionStatus, RequestType } from '@/data/types'
import { assetsOfStudent } from '@/engine/permission'
import { PageHeader, Card, SectionTitle, Chip, Select, Field, Input, Textarea, Button, Tabs, Empty, Divider, type Tone } from '@/design/ui'
import { EvidenceLink, PhotoFaces } from '@/design/media'
import { fmtDate, fmtDateTime, relDays, cn } from '@/lib/utils'
import { REQUEST_STATUS_META, REQUEST_TYPE_META, guessCorrection, replyTemplate, trackStatus } from './lib'

const IDENTITY_RE = /matched to (admission|school) records/i

function QuickFacts({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const student = useApp((s) => s.students.find((x) => x.id === request.studentId))
  const guardian = useApp((s) => s.guardians.find((x) => x.id === request.guardianId))
  const classLabel = useApp((s) => s.classes.find((c) => c.id === student?.classId)?.label)
  const people = useApp((s) => s.people)
  const updateRequest = useApp((s) => s.updateRequest)
  const track = trackStatus(request)
  const ownerOptions = people.filter((p) => ROLE[p.role].abilities.includes('manage-requests'))

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><div className="label-caps mb-1">Child</div><div className="text-sm font-semibold text-ink">{student?.name ?? '—'}</div><div className="text-xs text-ink-3">{classLabel} · {student?.admissionNo}</div></div>
        <div><div className="label-caps mb-1">Parent</div><div className="text-sm font-semibold text-ink">{guardian?.name ?? '—'}</div><div className="text-xs text-ink-3">{guardian?.relation} · {guardian?.lang === 'hi' ? 'Hindi' : 'English'}</div></div>
        <div><div className="label-caps mb-1">Received</div><div className="text-sm font-semibold text-ink">{fmtDate(request.receivedAt)}</div><div className="text-xs text-ink-3">via {request.channel.replace('-', ' ')}</div></div>
        <div className="no-print">
          <div className="label-caps mb-1">Owner</div>
          <Select value={request.ownerId} className="h-8 py-0 text-xs"
            onChange={(e) => { updateRequest(id, { ownerId: e.target.value }, `Reassigned to ${personName(e.target.value)}`); toast.success(`Reassigned to ${personName(e.target.value)}`) }}
            options={ownerOptions.map((p) => ({ value: p.id, label: p.name }))} />
        </div>
      </div>
      <Divider className="my-4" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="text-ink-3">Internal target (7 days)</span><span className={cn('font-semibold', track.tone === 'ok' ? 'text-ok' : track.tone === 'warn' ? 'text-warn' : track.tone === 'risk' ? 'text-risk' : 'text-ink-3')}>{fmtDate(request.targetAt)} · {relDays(request.targetAt)}</span></div>
        <div className="flex items-center gap-2"><Scale className="size-3.5 text-ink-3" /><span className="text-ink-3">Legal maximum ({LEGAL.grievanceMaxDays} days)</span><span className="font-medium text-ink-2">{fmtDate(request.dueAt)}</span></div>
      </div>
    </Card>
  )
}

function IdentityCheck({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const student = useApp((s) => s.students.find((x) => x.id === request.studentId))
  const updateRequest = useApp((s) => s.updateRequest)
  const matchedStep = request.steps.find((s) => IDENTITY_RE.test(s.text))
  const verified = !!matchedStep || !['new', 'verifying'].includes(request.status)

  return (
    <Card className="no-print p-5">
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full', verified ? 'bg-ok-bg text-ok' : 'bg-info-bg text-info')}>
          {verified ? <CircleCheck className="size-5" /> : <Fingerprint className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">Identity check</div>
          {verified ? (
            <p className="mt-0.5 text-sm text-ink-2">Matched to admission records{student ? ` — Admission No. ${student.admissionNo}` : ''}. {matchedStep && <span className="text-ink-3">{fmtDateTime(matchedStep.at)}</span>}</p>
          ) : (
            <>
              <p className="mt-0.5 text-sm text-ink-2">Confirm the parent raising this request is verified against school records before acting on it.</p>
              <Button size="sm" className="mt-3" icon={<ShieldCheck className="size-4" />}
                onClick={() => { updateRequest(id, { status: 'in-progress' }, `Identity verified — matched to admission records${student ? ` (Admission No. ${student.admissionNo})` : ''}`); toast.success('Identity confirmed') }}>
                Confirm match to admission records
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function CorrectionPanel({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const updateRequest = useApp((s) => s.updateRequest)
  const guess = React.useMemo(() => guessCorrection(request.summary), [request.summary])
  const [field, setField] = React.useState(guess.field)
  const [before, setBefore] = React.useState(guess.before)
  const [after, setAfter] = React.useState(guess.after)
  const done = request.steps.some((s) => s.text.startsWith('Updated record'))
  return (
    <Card className="p-5">
      <SectionTitle>Correction</SectionTitle>
      <p className="mb-4 text-sm text-ink-2">{request.summary}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Field"><Input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Date of birth" disabled={done} /></Field>
        <Field label="Current value"><Input value={before} onChange={(e) => setBefore(e.target.value)} disabled={done} /></Field>
        <Field label="Corrected value"><Input value={after} onChange={(e) => setAfter(e.target.value)} disabled={done} /></Field>
      </div>
      <Button className="mt-4" icon={<PenLine className="size-4" />} disabled={done || !after.trim()}
        onClick={() => { updateRequest(id, { status: 'in-progress' }, `Updated record: ${field || 'field'} "${before || '—'}" → "${after}"`); toast.success('Record updated') }}>
        {done ? 'Record updated' : 'Update record'}
      </Button>
    </Card>
  )
}

function PhotoRemovalPanel({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const assets = useApp((s) => s.assets)
  const publications = useApp((s) => s.publications)
  const requestTakedown = useApp((s) => s.requestTakedown)
  const updateRequest = useApp((s) => s.updateRequest)
  const done = request.steps.some((s) => s.text.startsWith('Took down photo'))

  const myAssets = assetsOfStudent(assets, request.studentId)
  const live = publications.filter((p) => p.status === 'live' && myAssets.some((a) => a.id === p.assetId))
  const pub = live.find((p) => p.destination === 'website') ?? live[0]
  const asset = pub ? myAssets.find((a) => a.id === pub.assetId) : myAssets[0]
  const destLabel = pub ? DEST[pub.destination].label : 'the location the parent flagged'

  return (
    <Card className="p-5">
      <SectionTitle>Photo removal</SectionTitle>
      <p className="mb-4 text-sm text-ink-2">{request.summary}</p>
      <div className="flex items-start gap-4">
        {asset ? (
          <PhotoFaces asset={asset} aspect={4 / 3} className={cn('w-40 shrink-0', done && 'opacity-40 grayscale')} />
        ) : (
          <div className="flex w-40 shrink-0 aspect-[4/3] items-center justify-center rounded-xl bg-sunken text-ink-3"><ImageOff className="size-7" /></div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">{pub ? `Live on ${destLabel}` : 'No live post matched automatically'}</div>
          <div className="mt-0.5 text-xs text-ink-3">{pub ? `Published ${fmtDate(pub.at)} · ${pub.id}` : 'Removal will still be logged and confirmed to the parent.'}</div>
          <Button className="mt-4" variant={done ? 'secondary' : 'danger'} icon={<ImageOff className="size-4" />} disabled={done}
            onClick={() => {
              if (pub) requestTakedown(pub.id)
              updateRequest(id, { status: 'in-progress' }, `Took down photo from ${destLabel}`)
              toast.success('Photo taken down and confirmed')
            }}>
            {done ? 'Taken down' : 'Take down & confirm'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

const PERM_TONE: Record<PermissionStatus, Tone> = { granted: 'ok', denied: 'muted', withdrawn: 'risk', pending: 'warn' }
const PERM_LABEL: Record<PermissionStatus, string> = { granted: 'Allowed', denied: 'Not allowed', withdrawn: 'Withdrawn', pending: 'Not set yet' }
const BASIS_LABEL: Record<string, string> = { consent: 'Parent’s choice', 'legitimate-use': 'Legitimate use', 'school-exemption': 'School exemption' }

function AccessPanel({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const student = useApp((s) => s.students.find((x) => x.id === request.studentId))
  const permissions = useApp((s) => s.permissions)
  const vendors = useApp((s) => s.vendors)
  const school = useApp((s) => s.school)
  const updateRequest = useApp((s) => s.updateRequest)
  const shared = request.steps.some((s) => s.text.includes('shared with the parent'))
  if (!student) return null

  return (
    <Card className="p-5" id="access-summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Data summary — {student.name}</SectionTitle>
        <div className="no-print flex gap-2">
          <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>Print / save PDF</Button>
          <Button size="sm" variant={shared ? 'secondary' : 'primary'} disabled={shared}
            onClick={() => { updateRequest(id, { status: 'in-progress' }, 'Data summary generated and shared with the parent'); toast.success('Marked as shared') }}>
            {shared ? 'Shared with parent' : 'Mark shared with parent'}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-3">{school.name} · generated {fmtDate(new Date().toISOString())} · Admission No. {student.admissionNo}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="label-caps mb-2">What we hold, and why</div>
          <div className="space-y-2">
            {CORE_PURPOSES.map((p) => (
              <div key={p.key} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <div className="min-w-0"><div className="text-[13px] font-medium text-ink">{p.label}</div><div className="text-xs text-ink-3">{p.example}</div></div>
                <Chip tone="muted" size="sm" icon={false} className="shrink-0">{BASIS_LABEL[p.basis]}</Chip>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="label-caps mb-2">Photo &amp; video choices on file</div>
          <div className="space-y-2">
            {MEDIA_PURPOSES.map((p) => {
              const perm = permissions[pkey(student.id, p.key)]
              const status = perm?.status ?? 'pending'
              return (
                <div key={p.key} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0 text-[13px] font-medium text-ink">{p.label}</div>
                  <Chip tone={PERM_TONE[status]} size="sm" className="shrink-0">{PERM_LABEL[status]}</Chip>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="label-caps mb-2">Shared with these vendors</div>
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="grid grid-cols-[1.3fr_1fr_1.4fr_100px] gap-3 bg-sunken/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-3"><div>Vendor</div><div>Category</div><div>Data shared</div><div>Location</div></div>
          {vendors.map((v) => (
            <div key={v.id} className="grid grid-cols-[1.3fr_1fr_1.4fr_100px] items-center gap-3 border-t border-line px-3 py-2 text-[13px]">
              <div className="font-medium text-ink">{v.name}</div><div className="text-ink-3">{v.category}</div>
              <div className="truncate text-ink-2">{v.dataShared.join(', ')}</div><div className="text-ink-3">{v.storageLocation}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ErasurePanel({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const academicRule = useApp((s) => s.retention.find((r) => r.id === 'RET-01'))
  const updateRequest = useApp((s) => s.updateRequest)
  const done = request.steps.some((s) => s.text.startsWith('Explained legal hold'))
  return (
    <Card className="p-5">
      <SectionTitle>Erasure</SectionTitle>
      <p className="mb-4 text-sm text-ink-2">{request.summary}</p>
      <div className="flex items-start gap-3 rounded-xl border border-line bg-sunken p-4">
        <Scale className="mt-0.5 size-5 shrink-0 text-ink-3" />
        <div className="text-sm">
          <div className="font-semibold text-ink">Legal hold on academic records</div>
          <p className="mt-1 text-ink-2">{academicRule?.category ?? 'Admission & academic records'} must be kept — {academicRule?.retention ?? 'permanently'} — under {academicRule?.basis ?? 'CBSE / state education rules'}{academicRule?.exception ? `. ${academicRule.exception}.` : '.'} Everything else that is not legally required can be deleted.</p>
        </div>
      </div>
      <Button className="mt-4" disabled={done} icon={<Trash2 className="size-4" />}
        onClick={() => { updateRequest(id, { status: 'in-progress' }, 'Explained legal hold on academic records; remaining data erased'); toast.success('Logged and explained to parent') }}>
        {done ? 'Legal hold explained' : 'Acknowledge legal hold to parent'}
      </Button>
    </Card>
  )
}

function GenericPanel({ id, type }: { id: string; type: RequestType }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const updateRequest = useApp((s) => s.updateRequest)
  const done = request.steps.some((s) => s.text === 'Request actioned')
  return (
    <Card className="p-5">
      <SectionTitle>{REQUEST_TYPE_META[type].label}</SectionTitle>
      <p className="mb-4 text-sm text-ink-2">{request.summary}</p>
      <Button disabled={done} onClick={() => { updateRequest(id, { status: 'in-progress' }, 'Request actioned'); toast.success('Logged') }}>{done ? 'Actioned' : 'Mark actioned'}</Button>
    </Card>
  )
}

function Timeline({ id }: { id: string }) {
  const steps = useApp((s) => s.requests.find((r) => r.id === id)?.steps ?? [])
  return (
    <Card className="no-print p-5">
      <SectionTitle>Timeline</SectionTitle>
      <div className="space-y-0">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 flex size-2.5 shrink-0 rounded-full bg-azure" />
              {i < steps.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className={cn('min-w-0 flex-1', i < steps.length - 1 && 'pb-4')}>
              <p className="text-sm text-ink">{s.text}</p>
              <p className="mt-0.5 text-xs text-ink-3">{fmtDateTime(s.at)} · {personName(s.by)}{s.evidenceId && <> · <EvidenceLink id={s.evidenceId} /></>}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ReplyPanel({ id }: { id: string }) {
  const request = useApp((s) => s.requests.find((r) => r.id === id))!
  const student = useApp((s) => s.students.find((x) => x.id === request.studentId))
  const guardian = useApp((s) => s.guardians.find((x) => x.id === request.guardianId))
  const school = useApp((s) => s.school)
  const updateRequest = useApp((s) => s.updateRequest)
  const navigate = useNavigate()
  const [lang, setLang] = React.useState<'en' | 'hi'>(guardian?.lang ?? 'en')
  const ctx = React.useMemo(() => ({ child: student?.name ?? 'your child', guardian: guardian?.name ?? 'Parent', school: school.name, contact: school.privacyContact.email, summary: request.summary }), [student, guardian, school, request.summary])
  const [drafts, setDrafts] = React.useState<{ en: string; hi: string }>(() => ({ en: replyTemplate(request.type, 'en', ctx), hi: replyTemplate(request.type, 'hi', ctx) }))

  if (['resolved', 'closed'].includes(request.status)) {
    const closingStep = [...request.steps].reverse().find((s) => s.text.startsWith('Reply sent'))
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-ok"><CircleCheck className="size-5" /><span className="text-sm font-semibold">{REQUEST_STATUS_META[request.status].label}</span></div>
        <p className="mt-1 text-sm text-ink-2">{closingStep ? `${closingStep.text} · ${fmtDateTime(closingStep.at)}` : 'This request has been resolved.'}</p>
      </Card>
    )
  }
  return (
    <Card className="no-print p-5">
      <SectionTitle action={<Tabs value={lang} onValueChange={(v) => setLang(v as 'en' | 'hi')} tabs={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }]} />}>Reply to parent</SectionTitle>
      <Textarea value={drafts[lang]} onChange={(e) => setDrafts((d) => ({ ...d, [lang]: e.target.value }))} rows={7} className={lang === 'hi' ? 'deva' : undefined} lang={lang} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3">Sends the reply and marks this request resolved.</p>
        <Button icon={<Send className="size-4" />} onClick={() => { updateRequest(id, { status: 'resolved' }, 'Reply sent to parent'); toast.success(`${id} resolved — reply sent to parent`); navigate('/requests') }}>Send &amp; resolve</Button>
      </div>
    </Card>
  )
}

export function RequestDetail() {
  const { id = '' } = useParams()
  const request = useApp((s) => s.requests.find((r) => r.id === id))
  if (!request) return (<div><Link to="/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-azure"><ArrowLeft className="size-4" /> Back to requests</Link><Card className="mt-4"><Empty title="Request not found" body="It may have been removed." /></Card></div>)

  const meta = REQUEST_TYPE_META[request.type]
  const Icon = meta.icon
  const statusMeta = REQUEST_STATUS_META[request.status]

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/requests" className="no-print mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-azure hover:underline"><ArrowLeft className="size-4" /> Back to requests</Link>
      <PageHeader eyebrow={<span className="flex items-center gap-1.5"><Icon className="size-3.5" /> {meta.label}</span>} title={<span className="font-mono text-[26px]">{request.id}</span>}
        actions={<Chip tone={statusMeta.tone} size="md">{statusMeta.label}</Chip>} />
      <div className="space-y-5">
        <QuickFacts id={id} />
        <IdentityCheck id={id} />
        {request.type === 'correction' && <CorrectionPanel id={id} />}
        {request.type === 'photo-removal' && <PhotoRemovalPanel id={id} />}
        {request.type === 'access' && <AccessPanel id={id} />}
        {request.type === 'erasure' && <ErasurePanel id={id} />}
        {['nomination', 'grievance', 'withdrawal'].includes(request.type) && <GenericPanel id={id} type={request.type} />}
        <Timeline id={id} />
        <ReplyPanel id={id} />
      </div>
    </div>
  )
}
