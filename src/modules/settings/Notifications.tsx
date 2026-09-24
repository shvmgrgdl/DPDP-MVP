import * as React from 'react'
import { toast } from 'sonner'
import { Card, SectionTitle, Switch } from '@/design/ui'

interface Row { key: string; label: string; hint: string; def: boolean }
const ROWS: Row[] = [
  { key: 'requests', label: 'New parent requests', hint: 'Access, correction, erasure and grievance requests.', def: true },
  { key: 'due', label: 'Tasks due soon', hint: 'A reminder before something becomes overdue.', def: true },
  { key: 'incidents', label: 'Incidents', hint: 'Whenever an incident is opened or the Board clock is running.', def: true },
  { key: 'experts', label: 'Expert messages', hint: 'Replies from counsel, cyber or the privacy desk.', def: true },
  { key: 'weekly', label: 'Weekly summary', hint: 'A short Friday recap for the chairman and principal.', def: false },
  { key: 'marketing', label: 'Publishing activity', hint: 'When marketing publishes or takes down a post.', def: false },
]

export default function Notifications() {
  const [state, setState] = React.useState<Record<string, boolean>>(() => Object.fromEntries(ROWS.map((r) => [r.key, r.def])))
  const toggle = (key: string, label: string) => {
    setState((s) => {
      const next = !s[key]
      toast.success(`${label} ${next ? 'turned on' : 'turned off'}`)
      return { ...s, [key]: next }
    })
  }
  return (
    <Card className="p-6">
      <SectionTitle>Notification preferences</SectionTitle>
      <div className="divide-y divide-line">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-3.5">
            <div><div className="text-sm font-semibold text-ink">{r.label}</div><div className="text-[12.5px] text-ink-3">{r.hint}</div></div>
            <Switch checked={state[r.key]} onCheckedChange={() => toggle(r.key, r.label)} label={r.label} />
          </div>
        ))}
      </div>
    </Card>
  )
}
