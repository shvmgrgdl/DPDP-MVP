import { zipSync, strToU8 } from 'fflate'
import type { LucideIcon } from 'lucide-react'
import {
  ShieldCheck, FileText, Send, EyeOff, ScanFace, Inbox, Siren, Building2, ClipboardCheck, GraduationCap,
  Users, FileDown, ClipboardList, KeyRound, Archive,
} from 'lucide-react'
import type { Evidence, Obligation, Vendor } from '@/data/types'
import { LEGAL } from '@/data/reference'
import { personName } from '@/store/app'
import { sha256 } from '@/lib/utils'

export const EVIDENCE_TYPES: Evidence['type'][] = [
  'permission', 'notice', 'publication', 'blur', 'review', 'request', 'incident', 'vendor', 'control',
  'training', 'expert', 'export', 'readiness', 'access', 'retention',
]

export const EVIDENCE_TYPE_META: Record<Evidence['type'], { label: string; icon: LucideIcon }> = {
  permission: { label: 'Permission', icon: ShieldCheck },
  notice: { label: 'Notice', icon: FileText },
  publication: { label: 'Publication', icon: Send },
  blur: { label: 'Blur', icon: EyeOff },
  review: { label: 'Face review', icon: ScanFace },
  request: { label: 'Parent request', icon: Inbox },
  incident: { label: 'Incident', icon: Siren },
  vendor: { label: 'Vendor', icon: Building2 },
  control: { label: 'Security control', icon: ClipboardCheck },
  training: { label: 'Training', icon: GraduationCap },
  expert: { label: 'Expert', icon: Users },
  export: { label: 'Export', icon: FileDown },
  readiness: { label: 'Readiness', icon: ClipboardList },
  access: { label: 'Access log', icon: KeyRound },
  retention: { label: 'Retention', icon: Archive },
}

const GENESIS = '0'.repeat(64)

export interface ChainCheck { id: string; ok: boolean }
export interface ChainVerification { results: ChainCheck[]; brokenAt: number }

/** Recomputes every fingerprint from genesis, in ledger order. Tampering any one record's content is
 *  caught at that record, and — because we chain forward from our own recomputed hash, not the stored
 *  one — every record after it stops matching its stored fingerprint too. */
export function verifyChain(records: Evidence[]): ChainVerification {
  let prev = GENESIS
  const results = records.map((e): ChainCheck => {
    const body = { id: e.id, at: e.at, type: e.type, title: e.title, actor: e.actor, refs: e.refs, payload: e.payload ?? null }
    const computed = sha256(prev + JSON.stringify(body))
    const ok = computed === e.hash
    prev = computed
    return { id: e.id, ok }
  })
  return { results, brokenAt: results.findIndex((r) => !r.ok) }
}

/** A copy with one record's content edited after the fact — the real store is never touched. */
export function tamperedCopy(records: Evidence[]): { copy: Evidence[]; targetId: string } {
  const idx = records.length > 2 ? 1 + Math.floor(Math.random() * (records.length - 2)) : 0
  const copy = records.map((r, i) => (i === idx ? { ...r, title: `${r.title} (edited after signing)` } : r))
  return { copy, targetId: copy[idx].id }
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const evidenceCsv = (evidence: Evidence[]) =>
  toCsv(['id', 'at', 'type', 'title', 'actor', 'refs', 'hash', 'prevHash'],
    evidence.map((e) => [e.id, e.at, e.type, e.title, personName(e.actor), e.refs.join('; '), e.hash, e.prevHash]))

export const obligationsCsv = (obligations: Obligation[]) =>
  toCsv(['id', 'area', 'title', 'status', 'owner', 'legalRef', 'dueAt'],
    obligations.map((o) => [o.id, o.area, o.title, o.status, personName(o.ownerId), o.legalRef, o.dueAt ?? '']))

export const vendorsCsv = (vendors: Vendor[]) =>
  toCsv(['id', 'name', 'category', 'riskTier', 'storageLocation', 'reviewDue', 'dpa', 'securityClause', 'deletionClause', 'breachNoticeClause', 'subProcessorClause', 'status'],
    vendors.map((v) => [v.id, v.name, v.category, v.riskTier, v.storageLocation, v.reviewDue, v.contract.dpa, v.contract.securityClause, v.contract.deletionClause, v.contract.breachNoticeClause, v.contract.subProcessorClause, v.status]))

function auditIndexHtml(ctx: { schoolName: string; generatedAt: string; evidence: Evidence[]; obligations: Obligation[]; vendors: Vendor[] }) {
  const byType = ctx.evidence.reduce<Record<string, number>>((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc }, {})
  const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<tr><td>${EVIDENCE_TYPE_META[t as Evidence['type']]?.label ?? t}</td><td style="text-align:right">${n}</td></tr>`).join('')
  const obligationRows = ctx.obligations.map((o) => `<tr><td>${o.id}</td><td>${o.title}</td><td>${o.status}</td></tr>`).join('')
  const vendorRows = ctx.vendors.map((v) => `<tr><td>${v.id}</td><td>${v.name}</td><td>${v.riskTier}</td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${ctx.schoolName} — DPDP audit pack</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:48px auto;color:#0b1c30;padding:0 24px;line-height:1.5}
h1{font-size:26px;margin-bottom:4px} h2{font-size:15px;margin-top:36px;border-bottom:1px solid #e7e4dc;padding-bottom:6px;text-transform:uppercase;letter-spacing:.04em;color:#3f4550}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px} td,th{padding:7px 9px;border-bottom:1px solid #eee;text-align:left}
.muted{color:#5f6570;font-size:13px} .files{font-family:'Courier New',monospace;font-size:12.5px;background:#f7f6f2;padding:14px 16px;border-radius:8px;line-height:1.7}
</style></head><body>
<h1>${ctx.schoolName}</h1>
<p class="muted">DPDP readiness audit pack · generated ${ctx.generatedAt}</p>
<p>This is a point-in-time export of the school's evidence ledger and compliance register, for your own records or to share with a reviewer.</p>
<h2>Evidence by type — ${ctx.evidence.length} records</h2>
<table><tr><th>Type</th><th style="text-align:right">Count</th></tr>${typeRows}</table>
<h2>Obligations — ${ctx.obligations.length}</h2>
<table><tr><th>ID</th><th>Title</th><th>Status</th></tr>${obligationRows}</table>
<h2>Vendors — ${ctx.vendors.length}</h2>
<table><tr><th>ID</th><th>Name</th><th>Risk tier</th></tr>${vendorRows}</table>
<h2>Files in this pack</h2>
<div class="files">index.html — this summary<br>evidence.csv, evidence.json — the full hash-chained evidence ledger<br>obligations.csv — DPDP obligation coverage<br>vendors.csv — vendor register and contract clauses</div>
<p class="muted" style="margin-top:32px">${LEGAL.disclaimer}</p>
</body></html>`
}

export function buildAuditPack(ctx: { schoolName: string; generatedAt: string; evidence: Evidence[]; obligations: Obligation[]; vendors: Vendor[] }): Uint8Array {
  return zipSync({
    'index.html': strToU8(auditIndexHtml(ctx)),
    'evidence.csv': strToU8(evidenceCsv(ctx.evidence)),
    'evidence.json': strToU8(JSON.stringify(ctx.evidence, null, 2)),
    'obligations.csv': strToU8(obligationsCsv(ctx.obligations)),
    'vendors.csv': strToU8(vendorsCsv(ctx.vendors)),
  }, { level: 6 })
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = 'application/zip') {
  const blob = new Blob([bytes as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
