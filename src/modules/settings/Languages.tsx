import { toast } from 'sonner'
import { Card, SectionTitle, Chip, Button } from '@/design/ui'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { nowIso } from '@/lib/utils'
import { LANGUAGES } from './data'

export default function Languages() {
  const role = useApp((s) => s.role)
  const addExpertRequest = useApp((s) => s.addExpertRequest)
  const request = (label: string) => {
    const meId = ROLE[role].person
    addExpertRequest({
      kind: 'managed-desk', title: `Add ${label} to notices and the parent app`, status: 'requested', partner: 'School DPDP OS privacy team',
      attachments: [], messages: [{ at: nowIso(), from: meId, text: `Please add ${label} as a supported language.` }],
    })
    toast.success(`Noted — we'll follow up on ${label}.`)
  }
  return (
    <Card className="p-6">
      <SectionTitle>Languages</SectionTitle>
      <p className="mb-4 text-sm text-ink-2">Notices, the parent app and this assistant support these languages today.</p>
      <div className="space-y-2">
        {LANGUAGES.map((l) => (
          <div key={l.code} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
            <span className="text-sm font-medium text-ink">{l.label}</span>
            {l.available ? <Chip tone="ok">Available</Chip> : <Button variant="secondary" size="sm" onClick={() => request(l.label)}>Request this language</Button>}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-ink-3">More languages on request — sent straight to the privacy desk.</p>
    </Card>
  )
}
