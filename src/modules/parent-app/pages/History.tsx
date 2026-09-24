import * as React from 'react'
import { SlidersHorizontal, ScrollText, Inbox, ShieldCheck, FileCheck2 } from 'lucide-react'
import { Card, Empty } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp } from '@/store/app'
import type { Evidence } from '@/data/types'
import { fmtDateTime } from '@/lib/utils'
import { useActiveFamily } from '../family'
import { Bi, tr, useLang } from '../i18n'

const TYPE_ICON: Partial<Record<Evidence['type'], React.ComponentType<{ className?: string }>>> = {
  permission: SlidersHorizontal,
  notice: ScrollText,
  request: Inbox,
  publication: FileCheck2,
}

export default function HistoryPage() {
  const lang = useLang()
  const { guardian, children } = useActiveFamily()
  const evidence = useApp((s) => s.evidence)

  const ids = new Set([guardian.id, ...children.map((c) => c.id)])
  const mine = evidence.filter((e) => e.refs.some((r) => ids.has(r))).sort((a, b) => (a.at < b.at ? 1 : -1))

  return (
    <div className="space-y-5">
      <div>
        <div className="label-caps"><Bi en="History" hi="इतिहास" /></div>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink"><Bi en="Change history" hi="बदलावों का इतिहास" /></h1>
        <p className="mt-1 text-[13px] text-ink-2"><Bi en="Every choice and request, timestamped and verifiable." hi="हर पसंद और अनुरोध, समय-मुद्रित और सत्यापन योग्य।" /></p>
      </div>

      {mine.length === 0 ? (
        <Card className="p-0"><Empty title={tr(lang, 'Nothing yet', 'अभी कुछ नहीं')} body={tr(lang, 'Changes you make will appear here.', 'आपके द्वारा किए गए बदलाव यहां दिखेंगे।')} /></Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((e) => {
            const Icon = TYPE_ICON[e.type] ?? ShieldCheck
            return (
              <Card key={e.id} className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-azure-50 text-azure"><Icon className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] leading-snug text-ink">{e.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
                      <span>{fmtDateTime(e.at)}</span>
                      <span aria-hidden>·</span>
                      <EvidenceLink id={e.id} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
