import * as React from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Check, Circle, Send, Info, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useApp, personName } from '@/store/app'
import { ROLE } from '@/roles/roles'
import type { Incident, IncidentStep } from '@/data/types'
import { PageHeader, Card, SectionTitle, Chip, Button, Tabs, Textarea, Empty, type Tone } from '@/design/ui'
import { cn, fmtDateTime } from '@/lib/utils'
import { INCIDENT_CHECKLIST, INCIDENT_KIND_META, boardIntimationTemplate, detailedReportTemplate, parentNoticeTemplate } from './shared'

const STATUS_TONE: Record<Incident['status'], Tone> = { open: 'risk', contained: 'warn', reported: 'ok', closed: 'muted' }

function useNow(tickMs = 1000) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), tickMs); return () => clearInterval(t) }, [tickMs])
  return now
}
function fmtCountdown(ms: number) {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000)
  return `${ms < 0 ? '−' : ''}${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function CountdownCard({ incident }: { incident: Incident }) {
  const now = useNow()
  const reportStep = incident.steps.find((s) => s.kind === 'report')
  if (reportStep) {
    const onTime = new Date(reportStep.at).getTime() <= new Date(incident.boardDetailedDueAt).getTime()
    return (
      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
        <div><div className="text-sm font-semibold text-ok">Detailed report filed</div><p className="mt-0.5 text-sm text-ink-2">{fmtDateTime(reportStep.at)} — {onTime ? 'within the 72-hour window.' : 'after the 72-hour window.'}</p></div>
      </Card>
    )
  }
  const diff = new Date(incident.boardDetailedDueAt).getTime() - now
  const tone: Tone = diff <= 0 ? 'risk' : diff < 24 * 3600000 ? 'warn' : 'ok'
  return (
    <Card className="p-6">
      <div className="label-caps mb-1.5 flex items-center gap-2">
        <span className={cn('size-1.5 rounded-full', tone === 'risk' ? 'bg-risk animate-pulse' : tone === 'warn' ? 'bg-warn animate-pulse' : 'bg-ok')} />
        Time to the Board’s detailed report
      </div>
      <div className={cn('font-display text-[38px] font-semibold leading-none num', tone === 'risk' ? 'text-risk' : tone === 'warn' ? 'text-warn' : 'text-ok')}>
        {diff <= 0 ? `Overdue by ${fmtCountdown(diff)}` : fmtCountdown(diff)}
      </div>
      <div className="mt-2 text-xs text-ink-3">Due {fmtDateTime(incident.boardDetailedDueAt)} · detected {fmtDateTime(incident.detectedAt)}</div>
    </Card>
  )
}

function ChecklistCard({ incident }: { incident: Incident }) {
  const updateIncident = useApp((s) => s.updateIncident)
  const role = useApp((s) => s.role)
  const quickMark = (kind: 'contain' | 'assess') => {
    const by = ROLE[role].person || role
    const text = kind === 'contain' ? 'Contained — access revoked and the risk stopped' : `Assessed — ${incident.affectedCount} people affected; data: ${incident.affectedData.join(', ')}`
    updateIncident(incident.id, kind === 'contain' && incident.status === 'open' ? { status: 'contained' } : {}, { text, by, kind })
    toast.success(kind === 'contain' ? 'Marked contained' : 'Marked assessed')
  }
  return (
    <Card className="p-5">
      <SectionTitle>Checklist</SectionTitle>
      <div className="space-y-2">
        {INCIDENT_CHECKLIST.map((item) => {
          const step = incident.steps.find((s) => s.kind === item.kind)
          const quick = item.kind === 'contain' || item.kind === 'assess'
          return (
            <div key={item.kind} className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-2.5">
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', step ? 'bg-ok-bg text-ok' : 'bg-sunken text-ink-3')}>
                {step ? <Check className="size-3.5" strokeWidth={3} /> : <Circle className="size-2.5 fill-current" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{item.label}</div>
                <div className="truncate text-xs text-ink-3">{step ? `${step.text} · ${fmtDateTime(step.at)}` : item.blurb}</div>
              </div>
              {!step && quick && <Button size="sm" variant="secondary" onClick={() => quickMark(item.kind as 'contain' | 'assess')}>Mark done</Button>}
              {!step && !quick && <a href={`#${item.kind}`} className="shrink-0 text-xs font-semibold text-azure hover:underline">Draft below ↓</a>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DraftSection({ anchorId, title, incident, stepKind, langs, buildText, sentLabel, statusOnSent }: {
  anchorId: string; title: string; incident: Incident; stepKind: IncidentStep['kind']; langs: ('en' | 'hi')[]
  buildText: (lang: 'en' | 'hi') => string; sentLabel: string; statusOnSent?: Incident['status']
}) {
  const updateIncident = useApp((s) => s.updateIncident)
  const role = useApp((s) => s.role)
  const [lang, setLang] = React.useState<'en' | 'hi'>(langs[0])
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() => Object.fromEntries(langs.map((l) => [l, buildText(l)])))
  const sentStep = incident.steps.find((s) => s.kind === stepKind)

  if (sentStep) {
    return (
      <Card className="p-5" id={anchorId}>
        <div className="flex items-center gap-2 text-ok"><CheckCircle2 className="size-5" /><span className="text-sm font-semibold">{title} sent</span></div>
        <p className="mt-1 text-sm text-ink-2">{sentStep.text} · {fmtDateTime(sentStep.at)} · {personName(sentStep.by)}</p>
      </Card>
    )
  }
  return (
    <Card className="p-5" id={anchorId}>
      <SectionTitle action={langs.length > 1 ? <Tabs value={lang} onValueChange={(v) => setLang(v as 'en' | 'hi')} tabs={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }]} /> : undefined}>{title}</SectionTitle>
      <Textarea value={drafts[lang]} onChange={(e) => setDrafts((d) => ({ ...d, [lang]: e.target.value }))} rows={9} className={lang === 'hi' ? 'deva' : undefined} lang={lang} />
      <div className="mt-3 flex justify-end">
        <Button icon={<Send className="size-4" />} onClick={() => {
          const by = ROLE[role].person || role
          updateIncident(incident.id, statusOnSent ? { status: statusOnSent } : {}, { text: sentLabel, by, kind: stepKind })
          toast.success(`${title} sent`)
        }}>Mark sent</Button>
      </div>
    </Card>
  )
}

function IncidentTimeline({ incident }: { incident: Incident }) {
  return (
    <Card className="p-5">
      <SectionTitle>Timeline</SectionTitle>
      <div className="space-y-0">
        {incident.steps.map((s, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 flex size-2.5 shrink-0 rounded-full bg-risk" />
              {i < incident.steps.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className={cn('min-w-0 flex-1', i < incident.steps.length - 1 && 'pb-4')}>
              <p className="text-sm text-ink">{s.text}</p>
              <p className="mt-0.5 text-xs text-ink-3">{fmtDateTime(s.at)} · {personName(s.by)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function IncidentDetail() {
  const { id = '' } = useParams()
  const incident = useApp((s) => s.incidents.find((i) => i.id === id))
  const school = useApp((s) => s.school)
  const updateIncident = useApp((s) => s.updateIncident)
  const role = useApp((s) => s.role)

  if (!incident) {
    return (<div><Link to="/trust/incidents" className="inline-flex items-center gap-1.5 text-sm font-medium text-azure"><ArrowLeft className="size-4" /> Back to incidents</Link><Card className="mt-4"><Empty title="Incident not found" /></Card></div>)
  }
  const meta = INCIDENT_KIND_META[incident.kind]
  const Icon = meta.icon
  const allDone = INCIDENT_CHECKLIST.every((item) => incident.steps.some((s) => s.kind === item.kind))
  const canClose = allDone && incident.status !== 'closed'

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/trust/incidents" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-azure hover:underline"><ArrowLeft className="size-4" /> Back to incidents</Link>
      <PageHeader eyebrow={<span className="flex items-center gap-1.5"><Icon className="size-3.5" /> {meta.label}</span>} title={incident.title}
        subtitle={`${incident.id} · ${incident.affectedCount} people · ${incident.affectedData.join(', ')}`}
        actions={<Chip tone={STATUS_TONE[incident.status]} size="md" className="capitalize">{incident.status}</Chip>} />
      <div className="space-y-5">
        <CountdownCard incident={incident} />
        <Card className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <p className="text-[13px] leading-snug text-ink-2">Every personal-data breach must be intimated to the Board — there is no minimum size or severity threshold.</p>
        </Card>
        <ChecklistCard incident={incident} />
        <DraftSection anchorId="notify-parents" title="Parent notice" incident={incident} stepKind="notify-parents" langs={['en', 'hi']}
          buildText={(lang) => parentNoticeTemplate(lang, incident, school)} sentLabel="Parent notice sent (English & Hindi)" />
        <DraftSection anchorId="notify-board" title="Board intimation" incident={incident} stepKind="notify-board" langs={['en']}
          buildText={() => boardIntimationTemplate(incident, school)} sentLabel="Initial Board intimation filed" />
        <DraftSection anchorId="report" title="Detailed report" incident={incident} stepKind="report" langs={['en']}
          buildText={() => detailedReportTemplate(incident, school)} sentLabel="Detailed report filed with the Board" statusOnSent="reported" />
        <IncidentTimeline incident={incident} />
        {canClose && (
          <div className="flex justify-end">
            <Button variant="secondary" icon={<CheckCircle2 className="size-4" />}
              onClick={() => { updateIncident(id, { status: 'closed' }, { text: 'Incident closed', by: ROLE[role].person || role, kind: 'close' }); toast.success('Incident closed') }}>
              Close this incident
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
