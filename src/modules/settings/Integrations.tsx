import { toast } from 'sonner'
import { Card, SectionTitle, Chip, type Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { nowIso } from '@/lib/utils'
import { INTEGRATIONS, STATUS_LABEL, type IntegrationStatus } from './data'

const STATUS_TONE: Record<IntegrationStatus, Tone> = { live: 'ok', pilot: 'info', roadmap: 'muted' }
const GROUPS: IntegrationStatus[] = ['live', 'pilot', 'roadmap']

export default function Integrations() {
  const role = useApp((s) => s.role)
  const addExpertRequest = useApp((s) => s.addExpertRequest)

  const act = (i: (typeof INTEGRATIONS)[number]) => {
    if (i.status === 'roadmap') { toast.success(`We'll let you know when ${i.name} ships.`); return }
    if (i.status === 'pilot') {
      const meId = ROLE[role].person
      addExpertRequest({
        kind: 'managed-desk', title: `Join the ${i.name} pilot`, status: 'requested', partner: 'School DPDP OS privacy team',
        attachments: [], messages: [{ at: nowIso(), from: meId, text: `Interested in the ${i.name} pilot.` }],
      })
      toast.success('Sent to the privacy desk.')
      return
    }
    toast(`${i.name} is live — ${i.blurb}`)
  }

  return (
    <Card className="p-6">
      <SectionTitle>Integrations</SectionTitle>
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="label-caps mb-2">{STATUS_LABEL[g]}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {INTEGRATIONS.filter((i) => i.status === g).map((i) => (
                <div key={i.name} className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">{i.name}</div>
                    <Chip tone={STATUS_TONE[i.status]} size="sm">{STATUS_LABEL[i.status]}</Chip>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-2">{i.blurb}</p>
                  <button type="button" onClick={() => act(i)} className="mt-2 text-[12.5px] font-semibold text-azure hover:underline">
                    {i.status === 'live' ? 'How it works' : i.status === 'pilot' ? 'Ask about the pilot' : 'Notify me'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
