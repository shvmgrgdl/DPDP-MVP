import type { AreaKey, CoverageStatus, Obligation, Person, PrivacyRequest, RoleKey, Task } from '@/data/types'
import { AREAS, STATUS_META } from '@/data/reference'
import type { Tone } from '@/design/ui'
import { ROLE } from '@/roles/roles'
import { useApp } from '@/store/app'
import { DEMO_NOW, relDays } from '@/lib/utils'

/* ---------------- Area status ---------------- */

/** Higher = needs more attention. Covered and school exemptions both count as covered. */
export const SEVERITY: Record<CoverageStatus, number> = { gap: 5, decision: 4, 'action-due': 3, 'expert-review': 2, exempt: 0, covered: 0 }
export const isOpenStatus = (s: CoverageStatus) => SEVERITY[s] > 0
export const statusLabel = (s: CoverageStatus) => STATUS_META[s].label
export const statusTone = (s: CoverageStatus) => STATUS_META[s].tone as Tone

export interface AreaSummary {
  key: AreaKey
  label: string
  short: string
  blurb: string
  obligations: Obligation[]
  open: Obligation[]
  worst?: Obligation
  status: CoverageStatus
  evidence: number
  ownerId: string
  inPlace: number
}

export function summarizeAreas(obligations: Obligation[]): AreaSummary[] {
  return AREAS.map((a) => {
    const obs = obligations.filter((o) => o.area === a.key)
    const open = obs.filter((o) => isOpenStatus(o.status)).sort((x, y) => SEVERITY[y.status] - SEVERITY[x.status])
    const worst = open[0]
    const counts = new Map<string, number>()
    for (const o of obs) counts.set(o.ownerId, (counts.get(o.ownerId) ?? 0) + 1)
    const topOwner = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'U-DESK'
    return {
      ...a,
      obligations: obs,
      open,
      worst,
      status: worst?.status ?? 'covered',
      evidence: obs.reduce((n, o) => n + o.evidenceIds.length, 0),
      ownerId: worst?.ownerId ?? topOwner,
      inPlace: obs.length - open.length,
    }
  })
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** "Your school is covered in 6 of 8 areas." + "2 small actions are with your team." (`report` voice: "The school … the team") */
export function statusLine(areas: AreaSummary[], voice: 'you' | 'report' = 'you') {
  const covered = areas.filter((a) => a.status === 'covered').length
  const open = areas.flatMap((a) => a.open)
  const actions = open.filter((o) => o.status === 'action-due' || o.status === 'gap').length
  const decisions = open.filter((o) => o.status === 'decision').length
  const experts = open.filter((o) => o.status === 'expert-review').length
  const subject = voice === 'you' ? 'Your school' : 'The school'
  const team = voice === 'you' ? 'your team' : 'the team'
  const first = covered === areas.length ? `${subject} is covered in all ${areas.length} areas.` : `${subject} is covered in ${covered} of ${areas.length} areas.`
  const parts: string[] = []
  if (actions) parts.push(`${actions} small ${plural(actions, 'action is', 'actions are')} with ${team}`)
  if (decisions) parts.push(`${decisions} ${plural(decisions, 'decision needs', 'decisions need')} ${voice === 'you' ? 'you' : 'a decision from leadership'}`)
  if (experts) parts.push(`${experts} ${plural(experts, 'item is', 'items are')} with our specialists`)
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
  const second = joined ? `${joined[0].toUpperCase()}${joined.slice(1)}.` : voice === 'you' ? 'Nothing needs you today.' : 'Nothing is outstanding.'
  return { first, second, covered, total: areas.length }
}

/* ---------------- People & greeting ---------------- */

export function greeting(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(d))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** "Rajiv Malhotra" → "Rajiv"; "Dr. Meera Iyer" → "Dr. Iyer". */
export function callName(name: string) {
  const m = name.match(/^(Dr|Adv)\.?\s+(.+)$/)
  if (m) return `${m[1]}. ${m[2].split(' ').slice(-1)[0]}`
  return name.split(' ')[0]
}

export const todayLabel = () =>
  new Date(DEMO_NOW).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })

export const monthLabel = () => new Date(DEMO_NOW).toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })

export const personOf = (people: Person[], id?: string) => people.find((p) => p.id === id)

/** Person id acting for the current role (falls back to the office). */
export const actorFor = (role: RoleKey) => ROLE[role].person || 'U-OFFICE'

/* ---------------- Due dates ---------------- */

const dayDiff = (iso: string) => Math.round((new Date(iso).getTime() - new Date(DEMO_NOW).getTime()) / 86400000)

export function dueTone(iso: string): Tone {
  const d = dayDiff(iso)
  return d < 0 ? 'risk' : d <= 3 ? 'warn' : 'muted'
}

export function dueText(iso: string) {
  const d = dayDiff(iso)
  if (d < 0) return `${-d} ${plural(-d, 'day', 'days')} overdue`
  const r = relDays(iso)
  return r === 'today' ? 'Due today' : `Due ${r}`
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

/* ---------------- Tasks & requests ---------------- */

export const openRequests = (requests: PrivacyRequest[]) => requests.filter((r) => !['resolved', 'closed'].includes(r.status))

export const REQUEST_LABEL: Record<PrivacyRequest['type'], string> = {
  access: 'Data summary',
  correction: 'Correction',
  erasure: 'Erasure',
  nomination: 'Nomination',
  grievance: 'Grievance',
  withdrawal: 'Withdrawal',
  'photo-removal': 'Photo removal',
}

export const TASK_AREA_LABEL = (area: Task['area']) => (area === 'requests' ? 'Requests' : AREAS.find((a) => a.key === area)?.short ?? area)

export const sortByDue = <T extends { dueAt: string }>(xs: T[]) => [...xs].sort((a, b) => a.dueAt.localeCompare(b.dueAt))

/* ---------------- Local store helpers (module-owned actions) ---------------- */

/** Mark an obligation as covered and attach a fresh evidence record to it. */
export function markObligationDone(obligationId: string, actor: string) {
  const s = useApp.getState()
  const ob = s.obligations.find((o) => o.id === obligationId)
  if (!ob) return undefined
  const evidenceId = s.addEvidence({ type: 'readiness', title: `${ob.title}: marked as done`, actor, refs: [ob.id], payload: { from: ob.status, to: 'covered' } })
  s.setObligationStatus(ob.id, 'covered')
  useApp.setState({ obligations: useApp.getState().obligations.map((o) => (o.id === ob.id ? { ...o, evidenceIds: [...o.evidenceIds, evidenceId] } : o)) })
  return evidenceId
}

/** Complete a task via the shared action and return the evidence id it produced. */
export function completeTaskWithRecord(taskId: string) {
  useApp.getState().completeTask(taskId)
  const ev = useApp.getState().evidence
  return ev[ev.length - 1]?.id
}
