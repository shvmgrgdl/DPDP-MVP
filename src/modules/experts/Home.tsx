import * as React from 'react'
import { Info, MessageSquareText, ArrowRight, Plus } from 'lucide-react'
import { PageHeader, Card, SectionTitle, Chip, Button, Empty } from '@/design/ui'
import { useApp } from '@/store/app'
import { EXPERTS } from '@/data/reference'
import type { ExpertKind } from '@/data/types'
import { fmtDate } from '@/lib/utils'
import { KIND_ICON, PACKAGES } from './data'
import { StatusStepper } from './parts'
import { RequestDialog } from './RequestDialog'
import { RequestDetail } from './RequestDetail'

export default function Home() {
  const school = useApp((s) => s.school)
  const experts = useApp((s) => s.experts)
  const [dialog, setDialog] = React.useState<{ kind?: ExpertKind; title?: string; desc?: string } | null>(null)
  const [openId, setOpenId] = React.useState<string | null>(null)

  const askPackage = (title: string, blurb: string) =>
    setDialog({ kind: 'managed-desk', title: `Interested in ${title}`, desc: `We'd like to talk about the ${title} package. ${blurb}` })

  return (
    <div>
      <PageHeader eyebrow="Experts" title="Experts & privacy desk"
        subtitle="Counsel, cyber and audit partners on call — plus a managed desk that handles the day-to-day for you."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setDialog({})}>New request</Button>} />

      <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-azure-50 text-azure"><Info className="size-5" /></div>
        <div>
          <div className="font-semibold text-ink">Privacy Contact vs statutory DPO</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            {school.privacyContact.name} ({school.privacyContact.role}) is {school.shortName}'s day-to-day privacy contact — parents and staff reach them for any question.
            A statutory <strong>Data Protection Officer</strong>, an <strong>independent data auditor</strong> and an <strong>annual DPIA + audit</strong> are only legally required
            if the school is notified by the government as a <strong>Significant Data Fiduciary (SDF)</strong>.
          </p>
          <div className="mt-2.5"><Chip tone="muted" icon={false}>School status: not notified as an SDF</Chip></div>
        </div>
      </Card>

      <SectionTitle>Talk to an expert</SectionTitle>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXPERTS.map((x) => {
          const Icon = KIND_ICON[x.kind as ExpertKind]
          const onlyIfApplicable = x.when === 'Only if applicable'
          return (
            <Card key={x.kind} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-expert-bg text-expert"><Icon className="size-[18px]" /></div>
                <Chip tone={onlyIfApplicable ? 'muted' : 'azure'} size="sm" icon={false}>{x.when}</Chip>
              </div>
              <div className="mt-3 font-semibold text-ink">{x.title}</div>
              <div className="text-[12px] text-ink-3">{x.who}</div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">{x.blurb}</p>
              <Button variant="secondary" size="sm" className="mt-4 self-start" onClick={() => setDialog({ kind: x.kind as ExpertKind, title: `${x.title} request` })}>Request</Button>
            </Card>
          )
        })}
      </div>

      <SectionTitle action={<span className="text-[12.5px] text-ink-3">{experts.length} total</span>}>Your requests</SectionTitle>
      <div className="mb-8 space-y-3">
        {experts.length === 0 && <Card><Empty icon={<MessageSquareText className="size-6" />} title="No requests yet" body="Ask an expert above, or send something to the managed desk." /></Card>}
        {experts.map((r) => {
          const meta = EXPERTS.find((e) => e.kind === r.kind)
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{r.title}</span>
                    <Chip tone="expert" size="sm">{meta?.title ?? r.kind}</Chip>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink-3">
                    {r.partner} · requested {fmtDate(r.createdAt)}{r.messages.length ? ` · ${r.messages.length} message${r.messages.length > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={<ArrowRight className="size-4" />} onClick={() => setOpenId(r.id)}>Open</Button>
              </div>
              <StatusStepper status={r.status} className="mt-4" />
            </Card>
          )
        })}
      </div>

      <SectionTitle>Packages</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        {PACKAGES.map((p) => (
          <Card key={p.key} className={p.recommended ? 'relative flex flex-col border-azure p-5 ring-1 ring-azure/30' : 'relative flex flex-col p-5'}>
            {p.recommended && <span className="absolute -top-3 left-5 rounded-full bg-azure px-2.5 py-1 text-[11px] font-bold text-white">Recommended</span>}
            <div className="font-display text-lg font-semibold text-ink">{p.title}</div>
            <p className="mt-1 text-[13px] text-ink-2">{p.tagline}</p>
            <ul className="mt-3 flex-1 space-y-1.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] text-ink-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-azure" />{b}</li>
              ))}
            </ul>
            <Button variant={p.recommended ? 'primary' : 'secondary'} className="mt-4" onClick={() => askPackage(p.title, p.tagline)}>Talk to us</Button>
          </Card>
        ))}
      </div>

      <RequestDialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)} defaultKind={dialog?.kind} prefillTitle={dialog?.title} prefillDescription={dialog?.desc} />
      <RequestDetail id={openId} onClose={() => setOpenId(null)} mode="view" />
    </div>
  )
}
