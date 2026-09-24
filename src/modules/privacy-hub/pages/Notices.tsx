import { toast } from 'sonner'
import { Check, Plus, RefreshCw } from 'lucide-react'
import { Card, SectionTitle, Chip, Button, type Tone } from '@/design/ui'
import { useApp, personName } from '@/store/app'
import { useCan, useRoleDef } from '@/store/hooks'
import type { NoticeVersion } from '@/data/types'
import { fmtDate } from '@/lib/utils'
import { NOTICE_SECTIONS, NOTICE_SUMMARY, V22_CHANGES } from '../noticeContent'

const STATUS_META: Record<NoticeVersion['status'], { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'ok' },
  draft: { label: 'Draft', tone: 'warn' },
  retired: { label: 'Retired', tone: 'muted' },
}

export default function Notices() {
  const notices = useApp((s) => s.notices)
  const roleDef = useRoleDef()
  const role = useApp((s) => s.role)
  const canApprove = useCan('approve')
  const draft = notices.find((n) => n.status === 'draft')
  const sorted = [...notices].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))

  const approve = () => {
    if (!draft) return
    const by = roleDef.person || role
    useApp.getState().approveNotice(draft.id, by)
    toast.success(`Notice ${draft.id} approved and published`)
  }

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-line p-0">
        {sorted.map((n) => (
          <div key={n.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[17px] font-semibold text-ink">{n.id}</span>
              <Chip tone={STATUS_META[n.status].tone} size="sm">{STATUS_META[n.status].label}</Chip>
              {n.material && <Chip tone="info" size="sm" icon={false}>Material change</Chip>}
            </div>
            <div className="mt-1 text-[13px] text-ink-2">{n.summary}</div>
            <div className="mt-1 text-[12px] text-ink-3">
              {n.languages.map((l) => l.toUpperCase()).join(' + ')} · {n.status === 'draft' ? 'Prepared' : 'Published'} {fmtDate(n.publishedAt)}
              {n.approvedBy && ` · Approved by ${personName(n.approvedBy)}`}
            </div>
          </div>
        ))}
      </Card>

      {draft && (
        <Card className="p-5">
          <SectionTitle>Draft {draft.id} preview</SectionTitle>

          <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">What changed since v2.1</div>
          <ul className="mb-5 space-y-1.5">
            {V22_CHANGES.map((c, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink-2">
                {c.kind === 'added' ? <Plus className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={2.5} /> : <RefreshCw className="mt-0.5 size-3.5 shrink-0 text-info" />}
                <span>{c.en}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <div className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-3">English</div>
              <ul className="space-y-2">
                {NOTICE_SUMMARY.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={2.5} />
                    {b.en}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-3">
                {NOTICE_SECTIONS.map((s) => (
                  <div key={s.key}>
                    <div className="text-[12.5px] font-semibold text-ink">{s.title.en}</div>
                    <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{s.body.en}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line p-4" lang="hi">
              <div className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-3">हिन्दी</div>
              <ul className="space-y-2">
                {NOTICE_SUMMARY.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={2.5} />
                    {b.hi}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-3">
                {NOTICE_SECTIONS.map((s) => (
                  <div key={s.key}>
                    <div className="text-[12.5px] font-semibold text-ink">{s.title.hi}</div>
                    <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{s.body.hi}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            {canApprove ? (
              <Button icon={<Check className="size-4" />} onClick={approve}>Approve & publish</Button>
            ) : (
              <p className="text-[13px] text-ink-3">Only the Principal or Chairman can approve and publish this notice.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
