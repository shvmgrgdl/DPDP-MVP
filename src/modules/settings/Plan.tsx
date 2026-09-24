import { Check } from 'lucide-react'
import { Card, SectionTitle, Button, Chip } from '@/design/ui'
import { PLAN_BULLETS } from './data'

export default function Plan() {
  return (
    <Card className="p-6">
      <SectionTitle>Plan</SectionTitle>
      <div className="rounded-2xl border border-azure/30 bg-azure-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-xl font-semibold text-ink">DPDP Managed</div>
            <p className="text-sm text-ink-2">Give this to us and relax.</p>
          </div>
          <Chip tone="azure">Current plan</Chip>
        </div>
        <ul className="mt-4 space-y-2">
          {PLAN_BULLETS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-ink"><Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} />{b}</li>
          ))}
        </ul>
        <Button className="mt-5" to="/experts">Talk to us</Button>
      </div>
    </Card>
  )
}
