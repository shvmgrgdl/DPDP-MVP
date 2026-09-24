import * as React from 'react'
import { Info } from 'lucide-react'
import { PageHeader, Card, Button, Empty } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp } from '@/store/app'
import { EXPERTS } from '@/data/reference'
import { fmtDate } from '@/lib/utils'
import { StatusStepper } from './parts'
import { RequestDetail } from './RequestDetail'

/** Expert partner view (e.g. Adv. Kavita Menon): only counsel-review requests assigned to her, with attached evidence. */
export default function Partner() {
  const experts = useApp((s) => s.experts)
  const evidence = useApp((s) => s.evidence)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const mine = experts.filter((e) => e.kind === 'privacy-review')

  return (
    <div>
      <PageHeader eyebrow="Expert partner" title="Assigned to you" subtitle="Counsel review requests, with the school's evidence already attached." />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-sunken px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <p className="text-[13px] text-ink-2">Independent audits are performed by a separate empanelled auditor — you'll only see privacy counsel reviews here.</p>
      </div>

      {mine.length === 0 ? (
        <Card><Empty title="Nothing assigned yet" body="New counsel review requests will appear here as soon as a school sends one." /></Card>
      ) : (
        <div className="space-y-4">
          {mine.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{r.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-3">{EXPERTS.find((e) => e.kind === r.kind)?.title} · requested {fmtDate(r.createdAt)}</div>
                </div>
                <Button size="sm" onClick={() => setOpenId(r.id)}>Open</Button>
              </div>
              <StatusStepper status={r.status} className="mt-4" />
              <div className="mt-4">
                <div className="label-caps mb-1.5">Evidence attached</div>
                {r.attachments.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {r.attachments.map((a) => {
                      const title = evidence.find((e) => e.id === a)?.title
                      return <EvidenceLink key={a} id={a} className="inline-flex max-w-[240px] truncate rounded-full bg-sunken px-2.5 py-1">{title ?? a}</EvidenceLink>
                    })}
                  </div>
                ) : <p className="text-sm text-ink-3">None yet.</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <RequestDetail id={openId} onClose={() => setOpenId(null)} mode="partner" />
    </div>
  )
}
