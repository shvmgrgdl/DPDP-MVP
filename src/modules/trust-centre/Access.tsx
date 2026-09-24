import { Link } from 'react-router'
import { Check, Camera, GraduationCap, ArrowUpRight, KeyRound } from 'lucide-react'
import { useApp, personName } from '@/store/app'
import { ROLE, ROLES, type Ability } from '@/roles/roles'
import { PageHeader, Card, SectionTitle, Tip } from '@/design/ui'
import { cn, fmtDateTime, relDays } from '@/lib/utils'

const ABILITIES: Ability[] = ['approve', 'publish', 'upload', 'review-faces', 'manage-requests', 'manage-vendors', 'manage-incidents', 'manage-settings', 'view-names', 'export']
const ABILITY_META: Record<Ability, { short: string; full: string }> = {
  approve: { short: 'Approve', full: 'Approve notices and decisions' },
  publish: { short: 'Publish', full: 'Publish photos to public or promotional channels' },
  upload: { short: 'Upload', full: 'Upload event photos and videos' },
  'review-faces': { short: 'Faces', full: 'Review and confirm face matches' },
  'manage-requests': { short: 'Requests', full: 'Handle parent requests' },
  'manage-vendors': { short: 'Vendors', full: 'Manage the vendor register and contracts' },
  'manage-incidents': { short: 'Incidents', full: 'Open and run incident response' },
  'manage-settings': { short: 'Settings', full: 'Change school and system settings' },
  'view-names': { short: 'Names', full: 'See student names (not just face boxes)' },
  export: { short: 'Export', full: 'Export data and reports' },
}

export function Access() {
  const evidence = useApp((s) => s.evidence)
  const students = useApp((s) => s.students)
  const teacherScope = ROLE.teacher.scope
  const scopedCount = students.filter((s) => s.classId === teacherScope).length
  const accessLog = evidence.filter((e) => e.type === 'access').slice().sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 15)

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Access & roles" subtitle="Who can see and do what — every role scoped to only what it needs." />

      <Card className="overflow-x-auto p-0">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[190px_repeat(10,1fr)] items-center gap-1 border-b border-line bg-sunken/60 px-4 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Role</div>
            {ABILITIES.map((a) => (
              <Tip key={a} content={ABILITY_META[a].full}><div className="text-center text-[10.5px] font-bold uppercase tracking-wide text-ink-3">{ABILITY_META[a].short}</div></Tip>
            ))}
          </div>
          {ROLES.map((r, i) => (
            <div key={r.key} className={cn('grid grid-cols-[190px_repeat(10,1fr)] items-center gap-1 px-4 py-2.5', i < ROLES.length - 1 && 'border-b border-line')}>
              <div className="min-w-0 truncate text-[13px] font-medium text-ink">{r.label}</div>
              {ABILITIES.map((a) => (
                <div key={a} className="flex justify-center">
                  {r.abilities.includes(a) ? <span className="flex size-5 items-center justify-center rounded-full bg-ok-bg text-ok"><Check className="size-3" strokeWidth={3} /></span> : <span className="text-ink-3">—</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Camera className="size-4 text-ink-3" /> Photographer (guest access)</div>
          <p className="mt-1.5 text-sm text-ink-2">{ROLE.photographer.blurb}. A single time-bound upload link per event — no login, no gallery view, and never any student names.</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><GraduationCap className="size-4 text-ink-3" /> Class teacher</div>
          <p className="mt-1.5 text-sm text-ink-2">Sees only Class {teacherScope} — {scopedCount} students. No access to other classes, school-wide reports or settings.</p>
        </Card>
      </div>

      <div className="mt-8">
        <SectionTitle action={<Link to="/evidence?type=access" className="inline-flex items-center gap-1 text-xs font-semibold text-azure hover:underline">View all in Evidence vault <ArrowUpRight className="size-3.5" /></Link>}>Access log</SectionTitle>
        <Card className="overflow-hidden">
          {accessLog.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-3 text-[13px] last:border-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-3"><KeyRound className="size-3.5" /></span>
              <div className="min-w-0 flex-1"><span className="text-ink">{e.title}</span></div>
              <span className="shrink-0 text-xs text-ink-3">{personName(e.actor)}</span>
              <span className="shrink-0 text-xs text-ink-3" title={fmtDateTime(e.at)}>{relDays(e.at)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
