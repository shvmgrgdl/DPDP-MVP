import { useNavigate } from 'react-router'
import { Building2, ShieldCheck, Siren, Archive, KeyRound, GraduationCap, Network, ChevronRight } from 'lucide-react'
import { useApp } from '@/store/app'
import { ROLES } from '@/roles/roles'
import { PageHeader, Card } from '@/design/ui'
import { cn, pct } from '@/lib/utils'

function Tile({ icon, tone, title, sub, path }: { icon: React.ReactNode; tone: string; title: string; sub: string; path: string }) {
  const navigate = useNavigate()
  return (
    <Card as="button" onClick={() => navigate(path)} className="flex items-start gap-4 p-5 text-left transition-shadow hover:shadow-[var(--shadow-pop)]">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-[13px] text-ink-3">{sub}</div>
      </div>
      <ChevronRight className="mt-1.5 size-4 shrink-0 text-ink-3" />
    </Card>
  )
}

export function Overview() {
  const vendors = useApp((s) => s.vendors)
  const controls = useApp((s) => s.controls)
  const incidents = useApp((s) => s.incidents)
  const retention = useApp((s) => s.retention)
  const obligations = useApp((s) => s.obligations)
  const training = useApp((s) => s.training)

  const vendorsNeedingClauses = vendors.filter((v) => Object.values(v.contract).some((c) => !c)).length
  const inPlace = controls.filter((c) => c.status === 'in-place').length
  const openIncidents = incidents.filter((i) => i.status !== 'closed').length
  const ob19 = obligations.find((o) => o.id === 'OB-19')
  const totalCompleted = training.reduce((a, m) => a + m.completed, 0)
  const totalSeats = training.reduce((a, m) => a + m.total, 0)

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Vendors, security & incidents"
        subtitle="Everything a governing body would ask about — who you share data with, how it's protected, and what happens if something goes wrong." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile icon={<Building2 className="size-5" />} tone="bg-azure-50 text-azure" title="Vendors" path="/trust/vendors"
          sub={`${vendors.length} vendors · ${vendorsNeedingClauses ? `${vendorsNeedingClauses} need a clause addendum` : 'contracts up to date'}`} />
        <Tile icon={<ShieldCheck className="size-5" />} tone="bg-ok-bg text-ok" title="Security" path="/trust/security"
          sub={`${inPlace} of ${controls.length} Rule 6 safeguards in place`} />
        <Tile icon={<Siren className="size-5" />} tone={openIncidents ? 'bg-risk-bg text-risk' : 'bg-ok-bg text-ok'} title="Incidents" path="/trust/incidents"
          sub={openIncidents ? `${openIncidents} open — Board clock running` : 'All clear — nothing open'} />
        <Tile icon={<Archive className="size-5" />} tone="bg-warn-bg text-warn" title="Retention" path="/trust/retention"
          sub={`${retention.length} rules · ${ob19?.status === 'action-due' ? '1 review due' : 'up to date'}`} />
        <Tile icon={<KeyRound className="size-5" />} tone="bg-expert-bg text-expert" title="Access & roles" path="/trust/access"
          sub={`${ROLES.length} roles mapped, each scoped to what they need`} />
        <Tile icon={<GraduationCap className="size-5" />} tone="bg-info-bg text-info" title="Training" path="/trust/training"
          sub={`${training.length} modules · ${pct(totalCompleted, totalSeats)}% average completion`} />
        <Tile icon={<Network className="size-5" />} tone="bg-sunken text-ink-2" title="Data map" path="/trust/data-map"
          sub="How data flows from families through school systems to vendors" />
      </div>
    </div>
  )
}
