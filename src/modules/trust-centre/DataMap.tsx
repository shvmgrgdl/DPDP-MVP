import { ArrowRight, Users } from 'lucide-react'
import { useApp } from '@/store/app'
import { CORE_PURPOSES } from '@/data/reference'
import { PageHeader, Card, Chip } from '@/design/ui'
import { fmtNum } from '@/lib/utils'
import { RISK_TONE } from './shared'

function Connector() {
  return <div className="hidden shrink-0 items-center justify-center px-1 text-ink-3 lg:flex"><ArrowRight className="size-6" /></div>
}

export function DataMap() {
  const students = useApp((s) => s.students)
  const guardians = useApp((s) => s.guardians)
  const vendors = useApp((s) => s.vendors)

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Data map" subtitle="Where student data comes from, what it's used for inside school, and who outside school can see it." />
      <div className="flex flex-col items-stretch gap-3 lg:flex-row">
        <div className="lg:flex lg:w-[200px] lg:shrink-0 lg:flex-col lg:justify-center">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-azure-50 text-azure"><Users className="size-5" /></span>
            <div className="mt-3 font-display text-[26px] font-semibold leading-none text-ink num">{fmtNum(guardians.length)}</div>
            <div className="text-[13px] font-medium text-ink">Families</div>
            <div className="mt-1 text-[11px] text-ink-3">{fmtNum(students.length)} students</div>
          </Card>
        </div>

        <Connector />

        <div className="min-w-0 flex-1">
          <div className="label-caps mb-2">School systems</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CORE_PURPOSES.map((p) => (
              <Card key={p.key} className="p-3.5">
                <div className="text-[13px] font-semibold leading-snug text-ink">{p.label}</div>
                <div className="mt-1 text-[11px] leading-snug text-ink-3">{p.example}</div>
              </Card>
            ))}
          </div>
        </div>

        <Connector />

        <div className="min-w-0 flex-1">
          <div className="label-caps mb-2">Vendors</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {vendors.map((v) => (
              <Card key={v.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-snug text-ink">{v.name}</span>
                  <Chip tone={RISK_TONE[v.riskTier]} size="sm" icon={false} className="shrink-0 capitalize">{v.riskTier}</Chip>
                </div>
                <div className="mt-1 text-[11px] text-ink-3">{v.category} · {v.storageLocation}</div>
                <div className="mt-1.5 text-[11px] leading-snug text-ink-2">{v.dataShared.slice(0, 2).join(', ')}{v.dataShared.length > 2 ? ` +${v.dataShared.length - 2} more` : ''}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
