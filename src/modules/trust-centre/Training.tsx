import { toast } from 'sonner'
import { Bell } from 'lucide-react'
import { useApp } from '@/store/app'
import { PageHeader, Card, Chip, Progress, Button } from '@/design/ui'
import { pct } from '@/lib/utils'
import { sendTrainingReminder } from './shared'

export function Training() {
  const training = useApp((s) => s.training)
  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Training" subtitle="Short modules that keep everyone — teachers, office staff, photographers — confident about what they can and can't do." />
      <div className="grid gap-4 md:grid-cols-2">
        {training.map((m) => {
          const p = pct(m.completed, m.total)
          const pending = m.total - m.completed
          const tone = p === 100 ? 'ok' : p >= 70 ? 'warn' : 'risk'
          return (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-ink">{m.title}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{m.audience} · {m.minutes} min</div>
                </div>
                <Chip tone={tone} size="sm" icon={false}>{p}%</Chip>
              </div>
              <Progress value={p} tone={tone} className="mt-4" />
              <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
                <span>{m.completed} of {m.total} completed</span>
                {pending > 0 && <span>{pending} pending</span>}
              </div>
              {pending > 0 && (
                <Button size="sm" variant="secondary" className="mt-3" icon={<Bell className="size-3.5" />}
                  onClick={() => { const n = sendTrainingReminder(m); toast.success(`Reminder sent to ${n} pending staff`) }}>
                  Send reminder
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
