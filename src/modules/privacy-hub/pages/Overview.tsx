import { Link } from 'react-router'
import { Users, ScrollText, FileEdit, ShieldCheck } from 'lucide-react'
import { Card, Kpi, SectionTitle, Due, Empty } from '@/design/ui'
import { useApp } from '@/store/app'
import { fmtNum, fmtDate, pct, relDays } from '@/lib/utils'

export default function Overview() {
  const guardians = useApp((s) => s.guardians)
  const notices = useApp((s) => s.notices)
  const tasks = useApp((s) => s.tasks)

  const onboarded = guardians.filter((g) => g.onboarded).length
  const total = guardians.length
  const adoptionPct = pct(onboarded, total)
  const live = notices.find((n) => n.status === 'live')
  const draft = notices.find((n) => n.status === 'draft')
  const attention = tasks.filter((t) => t.status === 'open' && (t.area === 'notices' || t.area === 'rights'))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/privacy/permissions" className="block">
          <Kpi
            label="Families onboarded"
            value={`${fmtNum(onboarded)} / ${fmtNum(total)}`}
            sub={`${adoptionPct}% of families have set their choices`}
            tone={adoptionPct >= 90 ? 'ok' : 'warn'}
            icon={<Users className="size-4" />}
          />
        </Link>
        <Link to="/privacy/notices" className="block">
          <Kpi label="Live notice" value={live?.id ?? '—'} sub={live ? `Published ${fmtDate(live.publishedAt)} · EN + HI` : 'No live notice'} tone="ok" icon={<ScrollText className="size-4" />} />
        </Link>
        <Link to="/privacy/notices" className="block">
          <Kpi
            label="Draft awaiting approval"
            value={draft?.id ?? '—'}
            sub={draft ? 'Ready for Principal or Chairman' : 'Nothing pending'}
            tone={draft ? 'warn' : 'ok'}
            icon={<FileEdit className="size-4" />}
          />
        </Link>
        <Link to="/privacy/verification" className="block">
          <Kpi label="Verified parents" value={fmtNum(onboarded)} sub="School records · OTP · DigiLocker" tone="ok" icon={<ShieldCheck className="size-4" />} />
        </Link>
      </div>

      <Card className="p-5">
        <SectionTitle>Needs attention</SectionTitle>
        {attention.length === 0 ? (
          <Empty title="All caught up" body="Nothing needs attention in notices or requests right now." />
        ) : (
          <div className="divide-y divide-line">
            {attention.map((t) => (
              <Link key={t.id} to={t.link ?? '/privacy'} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                <span className="text-sm text-ink">{t.title}</span>
                <Due tone="warn">{relDays(t.dueAt)}</Due>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
