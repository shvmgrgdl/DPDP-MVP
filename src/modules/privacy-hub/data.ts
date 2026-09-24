import { useApp } from '@/store/app'
import { pkey } from '@/data/seed'
import { MEDIA_PURPOSES } from '@/data/reference'
import type { ClassSection, Guardian, MediaPurposeKey, Permission, Student, VerificationMethod } from '@/data/types'
import { addDays } from '@/lib/utils'

/** Classes × media purposes → % of that class's students with the purpose granted. */
export interface HeatCell { purpose: MediaPurposeKey; pct: number; granted: number; total: number }
export interface HeatRow { cls: ClassSection; cells: HeatCell[] }

export function buildHeatGrid(classes: ClassSection[], students: Student[], permissions: Record<string, Permission>): HeatRow[] {
  const byClass = new Map<string, Student[]>()
  for (const s of students) {
    const list = byClass.get(s.classId)
    if (list) list.push(s)
    else byClass.set(s.classId, [s])
  }
  return classes.map((cls) => {
    const kids = byClass.get(cls.id) ?? []
    const cells = MEDIA_PURPOSES.map((p) => {
      const total = kids.length
      const granted = kids.filter((s) => permissions[pkey(s.id, p.key)]?.status === 'granted').length
      return { purpose: p.key, pct: total ? Math.round((granted / total) * 100) : 0, granted, total }
    })
    return { cls, cells }
  })
}

export function pendingGuardians(guardians: Guardian[]) {
  return guardians.filter((g) => !g.onboarded)
}

export function verificationBreakdown(guardians: Guardian[]) {
  const counts: Record<VerificationMethod, number> = { 'school-records': 0, otp: 0, 'digilocker-token': 0 }
  let onboarded = 0
  for (const g of guardians) {
    if (g.onboarded && g.verification) {
      counts[g.verification.method]++
      onboarded++
    }
  }
  return { counts, onboarded }
}

export interface CampaignDay { date: string; count: number; cumOnboarded: number; cumPct: number }

/** A forward-looking, front-loaded reminder plan distributing the remaining pending families over `days`. */
export function buildCampaignPlan(onboarded: number, total: number, startIso: string, days = 14): CampaignDay[] {
  const remaining = Math.max(0, total - onboarded)
  const weights = Array.from({ length: days }, (_, i) => days - i)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  let allocated = 0
  let cum = onboarded
  return weights.map((w, i) => {
    const isLast = i === days - 1
    const count = Math.max(0, isLast ? remaining - allocated : Math.round((remaining * w) / weightSum))
    allocated += count
    cum += count
    return { date: addDays(startIso, i), count, cumOnboarded: cum, cumPct: Math.round((cum / total) * 1000) / 10 }
  })
}

export function sendReminder(guardian: Guardian, by: string) {
  useApp.getState().addEvidence({ type: 'notice', title: `WhatsApp reminder sent to ${guardian.name}`, actor: by, refs: [guardian.id] })
}

export function sendBulkReminders(guardians: Guardian[], by: string) {
  useApp.getState().addEvidence({ type: 'notice', title: `WhatsApp reminder sent to ${guardians.length} pending families`, actor: by, refs: guardians.map((g) => g.id) })
}
