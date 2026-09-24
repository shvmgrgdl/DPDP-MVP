import type { LucideIcon } from 'lucide-react'
import { Laptop, Mail, ShieldOff, Building2, ImageOff } from 'lucide-react'
import type { Control, Incident, IncidentStep, School, TrainingModule, Vendor } from '@/data/types'
import type { Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import { addDays, fmtDate, fmtDateTime } from '@/lib/utils'

export const INCIDENT_KIND_META: Record<Incident['kind'], { label: string; icon: LucideIcon }> = {
  'lost-device': { label: 'Lost or stolen device', icon: Laptop },
  'misdirected-email': { label: 'Misdirected email', icon: Mail },
  'unauthorised-access': { label: 'Unauthorised access', icon: ShieldOff },
  'vendor-breach': { label: 'Vendor / third-party breach', icon: Building2 },
  'photo-leak': { label: 'Photo or video leak', icon: ImageOff },
}

export const INCIDENT_CHECKLIST: { kind: IncidentStep['kind']; label: string; blurb: string }[] = [
  { kind: 'contain', label: 'Contain', blurb: 'Stop further exposure — revoke access, recover the device, lock the account.' },
  { kind: 'assess', label: 'Assess what happened', blurb: 'Work out what data and how many people are affected.' },
  { kind: 'notify-parents', label: 'Notify affected parents', blurb: 'Plain-language notice in English and Hindi.' },
  { kind: 'notify-board', label: 'Board intimation', blurb: 'Initial intimation to the Data Protection Board.' },
  { kind: 'report', label: 'Detailed report', blurb: 'Full report to the Board within 72 hours of detection.' },
]

export const CONTROL_STATUS_META: Record<Control['status'], { label: string; tone: Tone }> = {
  'in-place': { label: 'In place', tone: 'ok' },
  partial: { label: 'Partly in place', tone: 'warn' },
  missing: { label: 'Missing', tone: 'risk' },
}

export const RISK_TONE: Record<Vendor['riskTier'], Tone> = { low: 'ok', medium: 'warn', high: 'risk' }

export const CLAUSES: { key: keyof Vendor['contract']; label: string }[] = [
  { key: 'dpa', label: 'Data processing agreement' },
  { key: 'securityClause', label: 'Security clause' },
  { key: 'deletionClause', label: 'Deletion clause' },
  { key: 'breachNoticeClause', label: 'Breach notice clause' },
  { key: 'subProcessorClause', label: 'Sub-processor clause' },
]

/** Local store helpers — trust-centre owns these, calling the shared addEvidence/addTask/etc. primitives. */

export function addControlEvidence(controlId: string, title: string, payload?: Record<string, unknown>) {
  const s = useApp.getState()
  const evidenceId = s.addEvidence({ type: 'control', title, actor: s.role, refs: [controlId], payload })
  useApp.setState({ controls: useApp.getState().controls.map((c) => (c.id === controlId ? { ...c, evidenceIds: [...c.evidenceIds, evidenceId] } : c)) })
  return evidenceId
}

export function sendClauseAddendum(vendor: Vendor) {
  const s = useApp.getState()
  const missing = CLAUSES.filter((c) => !vendor.contract[c.key]).map((c) => c.label)
  const taskId = s.addTask({ title: `Send clause addendum to ${vendor.name}${missing.length ? ` (${missing.join(', ')})` : ''}`, area: 'vendors', ownerId: 'U-OFFICE', dueAt: addDays(new Date().toISOString(), 14), link: '/trust/vendors', kind: 'contract' })
  s.addEvidence({ type: 'vendor', title: `Clause addendum sent to ${vendor.name} — awaiting countersignature`, actor: s.role, refs: [vendor.id, taskId] })
  s.notify({ text: `Clause addendum sent to ${vendor.name}`, link: '/trust/vendors', roles: ['office', 'principal'] })
  return taskId
}

export function reviewClassOf2023(action: 'archive' | 'delete', note: string) {
  const s = useApp.getState()
  const count = 412
  const at = new Date().toISOString()
  const certificate = `CERT-${at.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`
  const evidenceId = s.addEvidence({
    type: 'retention', title: `Class of 2023 media ${action === 'archive' ? 'archived' : 'permanently deleted'} — deletion certificate ${certificate}`,
    actor: s.role, refs: ['RET-02', 'OB-19', 'TSK-03'], payload: { action, count, certificate, note: note || undefined },
  })
  s.completeTask('TSK-03')
  s.setObligationStatus('OB-19', 'covered')
  useApp.setState({
    retention: useApp.getState().retention.map((r) => (r.id === 'RET-02'
      ? { ...r, nextReview: addDays(at, 365 * 3), exception: `Reviewed ${fmtDate(at)} — ${action === 'archive' ? 'archived' : 'deleted'} (${count} items). Certificate ${certificate}.` }
      : r)),
  })
  s.notify({ text: `Class of 2023 media ${action === 'archive' ? 'archived' : 'deleted'} — certificate issued`, link: '/trust/retention', roles: ['principal', 'chairman', 'office'] })
  return { evidenceId, certificate }
}

export function parentNoticeTemplate(lang: 'en' | 'hi', incident: Incident, school: School): string {
  const kindLabel = INCIDENT_KIND_META[incident.kind].label
  const people = `${incident.affectedCount} ${incident.affectedCount === 1 ? 'child' : 'children'}`
  if (lang === 'en') {
    return `Dear Parent,

What happened: ${kindLabel} — ${incident.title}. Detected on ${fmtDate(incident.detectedAt)}.
Data affected: ${incident.affectedData.join(', ')}.
Likely impact: ${people} may be affected. We have found no evidence so far that this data has been misused.
What we did: We contained the incident, assessed what was affected, and are notifying you as a precaution — this is what a responsible school does, even for a small incident.
What you can do: No action is required right now. If anything unusual happens (for example, someone contacting you claiming to have this information), please let us know straight away.
Contact: ${school.privacyContact.name}, ${school.privacyContact.role} — ${school.privacyContact.email} / ${school.privacyContact.phone}.

— ${school.name}`
  }
  return `प्रिय अभिभावक,

क्या हुआ: ${kindLabel} — ${incident.title}। ${fmtDate(incident.detectedAt)} को पता चला।
प्रभावित डेटा: ${incident.affectedData.join(', ')}।
संभावित प्रभाव: लगभग ${people} प्रभावित हो सकते हैं। अब तक इस डेटा के दुरुपयोग का कोई प्रमाण नहीं मिला है।
हमने क्या किया: हमने घटना को तुरंत रोका, प्रभाव का आकलन किया, और सावधानीवश आपको सूचित कर रहे हैं।
आप क्या कर सकते हैं: अभी किसी कार्रवाई की आवश्यकता नहीं है। कुछ असामान्य लगे (जैसे कोई इस जानकारी के आधार पर संपर्क करे) तो कृपया हमें तुरंत बताएं।
संपर्क: ${school.privacyContact.name}, ${school.privacyContact.role} — ${school.privacyContact.email} / ${school.privacyContact.phone}।

— ${school.name}`
}

export function boardIntimationTemplate(incident: Incident, school: School): string {
  return `Nature of the breach: ${INCIDENT_KIND_META[incident.kind].label} — ${incident.title}.
Extent: approximately ${incident.affectedCount} individuals; data categories: ${incident.affectedData.join(', ')}.
Timing: detected ${fmtDateTime(incident.detectedAt)}.
Location: ${school.name}, ${school.city}, ${school.state}.
Likely impact: Assessed as limited — contained promptly; no evidence of further misuse identified so far. A detailed report will follow within 72 hours of detection.`
}

export function detailedReportTemplate(incident: Incident, school: School): string {
  const containStep = incident.steps.find((s) => s.kind === 'contain')
  return `Facts: ${incident.title} (${INCIDENT_KIND_META[incident.kind].label}). Detected ${fmtDateTime(incident.detectedAt)}. Affected: approximately ${incident.affectedCount} individuals — ${incident.affectedData.join(', ')}.
Mitigation: ${containStep ? containStep.text : 'Access was revoked and the risk contained promptly.'} Affected systems have been reviewed and access tightened where needed.
Persons responsible for follow-up: ${school.privacyContact.name} (${school.privacyContact.role}), ${school.privacyContact.email}, ${school.privacyContact.phone}.
Notifications made: parents of affected students; initial intimation to the Data Protection Board on ${fmtDate(incident.detectedAt)}.`
}

export function sendTrainingReminder(mod: TrainingModule) {
  const s = useApp.getState()
  const pending = mod.total - mod.completed
  s.addEvidence({ type: 'training', title: `Reminder sent for “${mod.title}” — ${pending} pending`, actor: s.role, refs: [mod.id] })
  s.notify({ text: `Training reminder sent: ${mod.title} (${pending} pending)`, link: '/trust/training', roles: ['principal', 'office'] })
  return pending
}
