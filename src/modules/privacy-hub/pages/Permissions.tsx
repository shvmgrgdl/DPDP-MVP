import * as React from 'react'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { Card, Kpi, SectionTitle, Button, Progress, type Tone } from '@/design/ui'
import { WhatsappIcon } from '@/design/brand-icons'
import { useApp } from '@/store/app'
import { useRoleDef } from '@/store/hooks'
import { MEDIA_PURPOSES } from '@/data/reference'
import type { MediaPurposeKey } from '@/data/types'
import { fmtNum, pct, cn } from '@/lib/utils'
import { buildHeatGrid, pendingGuardians, sendBulkReminders, sendReminder } from '../data'

const SHORT_LABEL: Record<MediaPurposeKey, string> = { 'private-gallery': 'Private', internal: 'Internal', 'public-digital': 'Public', promotion: 'Promo', 'paid-ads': 'Ads' }

function heatTone(p: number): Tone {
  if (p >= 85) return 'ok'
  if (p >= 60) return 'warn'
  return 'risk'
}
const HEAT_BG: Record<Tone, string> = { ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', risk: 'bg-risk-bg text-risk', info: 'bg-info-bg text-info', azure: 'bg-azure-50 text-azure', expert: 'bg-expert-bg text-expert', muted: 'bg-muted-bg text-ink-2' }
const DOT: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', risk: 'bg-risk', info: 'bg-info', azure: 'bg-azure', expert: 'bg-expert', muted: 'bg-ink-3' }

export default function Permissions() {
  const guardians = useApp((s) => s.guardians)
  const students = useApp((s) => s.students)
  const classes = useApp((s) => s.classes)
  const permissions = useApp((s) => s.permissions)
  const roleDef = useRoleDef()
  const role = useApp((s) => s.role)
  const by = roleDef.person || role

  const onboarded = guardians.filter((g) => g.onboarded).length
  const total = guardians.length
  const adoptionPct = pct(onboarded, total)

  const grid = React.useMemo(() => buildHeatGrid(classes, students, permissions), [classes, students, permissions])
  const pending = React.useMemo(() => pendingGuardians(guardians), [guardians])

  const remind = (g: (typeof pending)[number]) => {
    sendReminder(g, by)
    toast.success(`Reminder sent to ${g.name}`)
  }
  const remindAll = () => {
    sendBulkReminders(pending, by)
    toast.success(`Reminders sent to ${pending.length} families`)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi label="Families onboarded" value={`${fmtNum(onboarded)} / ${fmtNum(total)}`} sub={`${adoptionPct}% have set their choices`} tone={adoptionPct >= 90 ? 'ok' : 'warn'} icon={<Users className="size-4" />} />
        <Card className="p-5">
          <div className="text-[13px] text-ink-2 font-medium">Adoption</div>
          <div className="mt-3"><Progress value={adoptionPct} tone={adoptionPct >= 90 ? 'ok' : 'warn'} /></div>
          <div className="mt-2 text-[12px] text-ink-3">{fmtNum(pending.length)} families still to set their choices</div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle>Choices by class</SectionTitle>
        <p className="mb-3 -mt-1 text-[13px] text-ink-2">Share of each class's families who granted each purpose.</p>
        <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight: 520 }}>
          <div className="grid min-w-[520px]" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
            <div className="sticky top-0 z-10 border-b border-line bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">Class</div>
            {MEDIA_PURPOSES.map((p) => (
              <div key={p.key} className="sticky top-0 z-10 border-b border-line bg-surface px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-3">{SHORT_LABEL[p.key]}</div>
            ))}
            {grid.map((row) => (
              <React.Fragment key={row.cls.id}>
                <div className="border-b border-line px-3 py-1.5 text-[12.5px] font-medium text-ink">{row.cls.label}</div>
                {row.cells.map((c) => (
                  <div key={c.purpose} className="border-b border-line p-1">
                    <div className={cn('flex h-7 items-center justify-center rounded-md text-[11px] font-semibold num', HEAT_BG[heatTone(c.pct)])}>{c.pct}%</div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className={cn('size-2.5 rounded-full', DOT.ok)} /> 85%+ granted</span>
          <span className="flex items-center gap-1.5"><span className={cn('size-2.5 rounded-full', DOT.warn)} /> 60–84%</span>
          <span className="flex items-center gap-1.5"><span className={cn('size-2.5 rounded-full', DOT.risk)} /> under 60%</span>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle action={<Button size="sm" variant="secondary" icon={<WhatsappIcon className="size-4" />} onClick={remindAll} disabled={pending.length === 0}>Remind all ({pending.length})</Button>}>
          Pending families ({fmtNum(pending.length)})
        </SectionTitle>
        {pending.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-ink-3">Every family has set their choices.</p>
        ) : (
          <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {pending.map((g) => {
              const kids = students.filter((s) => g.studentIds.includes(s.id))
              return (
                <div key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-ink">{g.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">
                      {kids.map((k) => `${k.name} · ${classes.find((c) => c.id === k.classId)?.label ?? k.classId}`).join(', ')} · {g.phone}
                    </div>
                  </div>
                  <Button size="sm" variant="soft" icon={<WhatsappIcon className="size-4" />} onClick={() => remind(g)}>Remind</Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
