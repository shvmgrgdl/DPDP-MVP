import * as React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Target, CalendarClock, Users, Phone, FileText, ClipboardList, MessageSquare } from 'lucide-react'
import { Card, Kpi, SectionTitle, Button } from '@/design/ui'
import { WhatsappIcon } from '@/design/brand-icons'
import { useApp } from '@/store/app'
import { useRoleDef } from '@/store/hooks'
import { fmtNum, fmtDate, pct, DEMO_NOW } from '@/lib/utils'
import { buildCampaignPlan, pendingGuardians, sendBulkReminders, type CampaignDay } from '../data'

const SCHEDULE = [
  { day: 'Day 1 (today)', channel: 'WhatsApp', icon: WhatsappIcon, action: 'Broadcast the layered notice with a direct link to set choices.' },
  { day: 'Day 3', channel: 'SMS', icon: MessageSquare, action: 'Short Hindi & English reminder to families who haven’t opened the app.' },
  { day: 'Day 7', channel: 'Phone call', icon: Phone, action: 'Class teachers call families still pending.' },
  { day: 'Day 10', channel: 'Printed slip', icon: FileText, action: 'A note goes home with the child for families with no phone response.' },
  { day: 'Day 14', channel: 'Report', icon: ClipboardList, action: 'Remaining families reported to the Principal for follow-up.' },
] as const

function DailyBars({ plan, goalIndex }: { plan: CampaignDay[]; goalIndex: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 640
  const h = 200
  const padL = 6
  const padR = 6
  const padT = 22
  const padB = 26
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const max = Math.max(1, ...plan.map((d) => d.count))
  const barGap = 5
  const barW = (innerW - barGap * (plan.length - 1)) / plan.length
  const xOf = (i: number) => padL + i * (barW + barGap)
  const labelIdx = [0, goalIndex, plan.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Planned new families onboarded per day">
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--color-line)" strokeWidth={1} />
        {plan.map((d, i) => {
          const bh = Math.max(2, (d.count / max) * innerH)
          const x = xOf(i)
          const y = h - padB - bh
          const isGoal = i === goalIndex
          const dim = hover !== null && hover !== i
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((v) => (v === i ? null : v))} style={{ cursor: 'pointer' }}>
              <rect x={x} y={padT} width={barW} height={innerH} fill="transparent" />
              <rect x={x} y={y} width={barW} height={bh} rx={4} fill={isGoal ? 'var(--color-ok)' : 'var(--color-azure)'} opacity={dim ? 0.4 : 1} />
              {isGoal && (
                <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="var(--color-ok)">
                  90%+
                </text>
              )}
            </g>
          )
        })}
        {labelIdx.map((i) => (
          <text key={i} x={xOf(i) + barW / 2} y={h - padB + 15} textAnchor="middle" fontSize="9" fill="var(--color-ink-3)">
            {fmtDate(plan[i].date).replace(/ \d{4}$/, '')}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[110%] whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{ left: `${((xOf(hover) + barW / 2) / w) * 100}%`, top: `${((h - padB - Math.max(2, (plan[hover].count / max) * innerH)) / h) * 100}%` }}
        >
          <div className="font-semibold">{fmtDate(plan[hover].date)}</div>
          <div>+{plan[hover].count} families · {plan[hover].cumPct}% total</div>
        </div>
      )}
    </div>
  )
}

export default function Campaign() {
  const guardians = useApp((s) => s.guardians)
  const roleDef = useRoleDef()
  const role = useApp((s) => s.role)
  const by = roleDef.person || role

  const onboarded = guardians.filter((g) => g.onboarded).length
  const total = guardians.length
  const adoptionPct = pct(onboarded, total)
  const pending = React.useMemo(() => pendingGuardians(guardians), [guardians])
  const plan = React.useMemo(() => buildCampaignPlan(onboarded, total, DEMO_NOW, 14), [onboarded, total])
  const goalIndex = plan.findIndex((d) => d.cumPct >= 90)
  const familiesToGoal = Math.max(0, Math.ceil(total * 0.9) - onboarded)

  const remindToday = () => {
    sendBulkReminders(pending, by)
    toast.success(`Day 1 reminders sent to ${pending.length} families`)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Adoption today" value={`${adoptionPct}%`} sub={`${fmtNum(onboarded)} of ${fmtNum(total)} families`} tone={adoptionPct >= 90 ? 'ok' : 'warn'} icon={<Users className="size-4" />} />
        <Kpi label="Goal" value=">90%" sub={`By ${fmtDate(plan[plan.length - 1].date)}`} tone="azure" icon={<Target className="size-4" />} />
        <Kpi label="Families to reach goal" value={fmtNum(familiesToGoal)} tone={familiesToGoal > 0 ? 'warn' : 'ok'} icon={<CalendarClock className="size-4" />} />
        <Kpi label="Days left" value="14" sub="Front-loaded reminder plan" tone="muted" icon={<CalendarClock className="size-4" />} />
      </div>

      <Card className="p-5">
        <SectionTitle
          action={<Button size="sm" variant="secondary" icon={<WhatsappIcon className="size-4" />} onClick={remindToday} disabled={pending.length === 0}>Send today’s reminders</Button>}
        >
          Planned new families per day
        </SectionTitle>
        <p className="mb-4 -mt-1 text-[13px] text-ink-2">A front-loaded reminder push — most conversions expected in the first week, tapering off. The green bar marks the day cumulative adoption is projected to cross 90%.</p>
        <DailyBars plan={plan} goalIndex={goalIndex} />
      </Card>

      <Card className="p-5">
        <SectionTitle>Reminder schedule</SectionTitle>
        <div className="divide-y divide-line">
          {SCHEDULE.map((s) => (
            <div key={s.day} className="flex items-start gap-3 py-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-azure-50 text-azure"><s.icon className="size-4" /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">{s.day} · <span className="font-normal text-ink-2">{s.channel}</span></div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{s.action}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
