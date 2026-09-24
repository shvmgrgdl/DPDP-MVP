/**
 * "Export safe set": a real zip, built in the browser with fflate.
 *   photos/<name>.jpg          ready photos, original bytes untouched
 *   photos/<name>-blurred.jpg  fixed photos, canvas-blurred full-resolution JPEGs
 *   evidence.json              per photo: decision, faces (first name + class), permission evidence IDs, notice version
 *   evidence.html              the same, readable (opens next to the photos)
 * Then records the publication (store.publish) and a fingerprint of the pack in the evidence ledger.
 */
import { strToU8, zipSync, type Zippable } from 'fflate'
import { DEST, LEGAL } from '@/data/reference'
import type { DestinationKey, SchoolEvent } from '@/data/types'
import { decisionTrace, type AssetEval, type EngineCtx, type FaceEval } from '@/engine/permission'
import { fmtDate, fmtDateTime, sha256 } from '@/lib/utils'
import { ROLE } from '@/roles/roles'
import { personName, useApp } from '@/store/app'
import { blobBytes, canvasToJpeg, downloadBlob, fetchBytes, fileExt, fileStem, loadImage, renderBlurred } from './blur'
import { actorId, classShort, firstName, purposeLabel } from './shared'

export const EXPORT_BLUR = { style: 'soft' as const, label: 'Soft blur', strength: 7 }

export interface SafeSetInput {
  event?: SchoolEvent
  eventId: string
  dest: DestinationKey
  ready: AssetEval[]
  fixed: AssetEval[]
  held: AssetEval[]
  blurUnknowns: boolean
  ctx: EngineCtx
  onProgress?: (done: number, total: number) => void
}

export interface SafeSetResult {
  evidenceId: string
  packEvidenceId: string
  filename: string
  size: number
  fingerprint: string
  originals: number
  blurred: number
  heldBack: number
}

interface FaceRecord {
  faceId: string
  child: string | null
  class: string | null
  decision: string
  reason: string
  mainSubject: boolean
  permission: { choice: string; evidenceId: string; noticeVersion: string; recordedAt: string; via: string } | null
}

interface PhotoRecord {
  assetId: string
  title: string | null
  file: string
  decision: 'Ready to share' | 'Fixed with blur'
  variant: 'original' | 'blurred'
  faces: FaceRecord[]
}

interface HeldRecord {
  assetId: string
  title: string | null
  decision: 'Keep private' | 'Check faces'
  reason: string
  faces: FaceRecord[]
}

function faceRecord(ctx: EngineCtx, fe: FaceEval, dest: DestinationKey, decision: string): FaceRecord {
  const st = fe.student
  const trace = st ? decisionTrace(ctx, st.id, DEST[dest].purpose) : undefined
  const p = fe.permission ?? trace?.permission
  const adult = fe.face.review === 'non-student'
  return {
    faceId: fe.face.id,
    // first name + class only; safeguarded children are never named in an export
    child: adult ? 'Adult / visitor' : st && !st.protected ? firstName(st.name) : null,
    class: st ? classShort(st.classId) : null,
    decision,
    reason: st?.protected ? 'Never published (school safeguarding rule)' : fe.reason,
    mainSubject: fe.face.main,
    permission: p ? { choice: p.status, evidenceId: p.evidenceId, noticeVersion: p.noticeVersion, recordedAt: p.at, via: p.via } : null,
  }
}

const heldDecision = (f: FaceEval) => (f.state === 'ok' ? 'Cleared' : f.state === 'unknown' ? 'Not recognised' : 'Not cleared')
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const tick = () => new Promise<void>((r) => setTimeout(r, 0))

export async function exportSafeSet(input: SafeSetInput): Promise<SafeSetResult> {
  const { dest, ready, fixed, held, ctx } = input
  const app = useApp.getState()
  const total = ready.length + fixed.length
  if (!total) throw new Error('There is nothing cleared to export for this destination.')

  const folder = `${slug(app.school.shortName)}-${slug(input.eventId)}-${dest}-safe-set`
  const files: Zippable = {}
  const used = new Set<string>()
  const unique = (path: string) => {
    let p = path
    for (let i = 2; used.has(p); i++) p = path.replace(/(\.[a-z0-9]+)$/i, `-${i}$1`)
    used.add(p)
    return p
  }
  const photos: PhotoRecord[] = []
  let done = 0
  input.onProgress?.(0, total)

  for (const e of ready) {
    const a = e.asset
    const file = unique(`photos/${fileStem(a.src, a.id)}.${fileExt(a.src)}`)
    files[`${folder}/${file}`] = [await fetchBytes(a.src), { level: 0 }]
    photos.push({ assetId: a.id, title: a.title ?? null, file, decision: 'Ready to share', variant: 'original', faces: e.faces.map((f) => faceRecord(ctx, f, dest, 'Shown')) })
    input.onProgress?.(++done, total)
  }

  for (const e of fixed) {
    const a = e.asset
    const img = await loadImage(a.src)
    const targets = e.faces.filter((f) => f.state === 'blocked').map((f) => ({ box: f.face.box, shape: 'face' as const }))
    const canvas = renderBlurred(img, targets, EXPORT_BLUR.style, EXPORT_BLUR.strength)
    const bytes = await blobBytes(await canvasToJpeg(canvas, 0.9))
    canvas.width = canvas.height = 1 // release memory early
    const file = unique(`photos/${fileStem(a.src, a.id)}-blurred.jpg`)
    files[`${folder}/${file}`] = [bytes, { level: 0 }]
    photos.push({
      assetId: a.id, title: a.title ?? null, file, decision: 'Fixed with blur', variant: 'blurred',
      faces: e.faces.map((f) => faceRecord(ctx, f, dest, f.state === 'blocked' ? 'Blurred' : 'Shown')),
    })
    input.onProgress?.(++done, total)
    await tick()
  }

  // record the publication first so the pack can carry its evidence ID
  const evidenceId = app.publish(
    [...ready.map((e) => ({ assetId: e.asset.id, variant: 'original' as const })), ...fixed.map((e) => ({ assetId: e.asset.id, variant: 'blurred' as const }))],
    dest,
  )
  const actor = actorId()
  const d = DEST[dest]
  const heldBack: HeldRecord[] = held.map((e) => ({
    assetId: e.asset.id, title: e.asset.title ?? null, decision: e.verdict === 'check-faces' ? 'Check faces' : 'Keep private', reason: e.reason,
    faces: e.faces.map((f) => faceRecord(ctx, f, dest, heldDecision(f))),
  }))
  const notices = [...new Set([...photos, ...heldBack].flatMap((p) => p.faces.map((f) => f.permission?.noticeVersion)).filter((v): v is string => !!v))].sort()
  const pack = {
    pack: 'Publish Guard safe set',
    version: 1,
    school: app.school.name,
    event: { id: input.eventId, name: input.event?.name ?? input.eventId, date: input.event?.date ?? null },
    destination: { key: dest, label: d.label, audience: d.audience, parentChoiceChecked: purposeLabel(dest), blurAllowed: d.blurFixAllowed },
    exportedAt: new Date().toISOString(),
    exportedBy: { id: actor, name: personName(actor), role: ROLE[app.role].label },
    evidenceId,
    options: { blurUnrecognisedFaces: input.blurUnknowns, blurStyle: EXPORT_BLUR.label, blurStrength: EXPORT_BLUR.strength },
    summary: {
      photosChecked: ready.length + fixed.length + held.length,
      facesChecked: [...ready, ...fixed, ...held].reduce((n, e) => n + e.faces.length, 0),
      readyAsTaken: ready.length,
      fixedWithBlur: fixed.length,
      heldBack: held.length,
    },
    noticeVersions: notices,
    photos,
    heldBack,
    originals: 'Unedited originals stay locked in the school library. This pack holds only what was cleared for this destination.',
    disclaimer: LEGAL.disclaimer,
  }
  const json = JSON.stringify(pack, null, 2)
  const fingerprint = sha256(json)
  files[`${folder}/evidence.json`] = strToU8(json)
  files[`${folder}/evidence.html`] = strToU8(evidenceHtml(pack, fingerprint))
  const zipped = zipSync(files, { level: 6, mtime: new Date() })
  const filename = `${folder}.zip`

  const packEvidenceId = useApp.getState().addEvidence({
    type: 'export',
    title: `Evidence pack downloaded: ${filename}`,
    actor,
    refs: [evidenceId, ...photos.map((p) => p.assetId)],
    payload: { file: filename, photos: total, blurred: fixed.length, 'held back': held.length, fingerprint: `${fingerprint.slice(0, 16)}…` },
  })
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), filename)
  return { evidenceId, packEvidenceId, filename, size: zipped.byteLength, fingerprint, originals: ready.length, blurred: fixed.length, heldBack: held.length }
}

/* ------------------------------------------------------------------ evidence.html */

type Pack = {
  school: string
  event: { name: string; date: string | null }
  destination: { label: string; parentChoiceChecked: string; blurAllowed: boolean }
  exportedAt: string
  exportedBy: { name: string; role: string }
  evidenceId: string
  options: { blurUnrecognisedFaces: boolean; blurStyle: string }
  summary: { photosChecked: number; facesChecked: number; readyAsTaken: number; fixedWithBlur: number; heldBack: number }
  noticeVersions: string[]
  photos: PhotoRecord[]
  heldBack: HeldRecord[]
  originals: string
  disclaimer: string
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

const chipCls = (decision: string) =>
  /blur/i.test(decision) ? 'warn' : /ready|shown|cleared/i.test(decision) ? 'ok' : /recognised|check/i.test(decision) ? 'info' : 'risk'

function facesTable(faces: FaceRecord[]) {
  if (!faces.length) return '<p class="muted">No faces in this photo.</p>'
  const rows = faces
    .map((f) => `<tr>
      <td>${f.child ? esc(f.child) : f.class ? '<span class="muted">Not named</span>' : '<span class="muted">Not recognised</span>'}${f.mainSubject ? ' <span class="tag">main subject</span>' : ''}</td>
      <td>${esc(f.class ?? '—')}</td>
      <td><span class="chip ${chipCls(f.decision)}">${esc(f.decision)}</span></td>
      <td>${esc(f.reason)}</td>
      <td class="mono">${f.permission ? esc(f.permission.evidenceId) : '—'}</td>
      <td class="mono">${f.permission ? esc(f.permission.noticeVersion) : '—'}</td>
    </tr>`)
    .join('')
  return `<table><thead><tr><th>Child</th><th>Class</th><th>Decision</th><th>Why</th><th>Permission evidence</th><th>Notice</th></tr></thead><tbody>${rows}</tbody></table>`
}

function evidenceHtml(p: Pack, fingerprint: string) {
  const photos = p.photos
    .map((ph) => `<section class="photo">
      <a href="${esc(ph.file)}"><img src="${esc(ph.file)}" alt="${esc(ph.title ?? ph.assetId)}" loading="lazy"></a>
      <div>
        <div class="row"><strong>${esc(ph.title ?? ph.assetId)}</strong><span class="chip ${chipCls(ph.decision)}">${esc(ph.decision)}</span></div>
        <div class="muted small">File <span class="mono">${esc(ph.file)}</span> · Photo ID <span class="mono">${esc(ph.assetId)}</span> · ${ph.variant === 'blurred' ? 'faces blurred in this copy' : 'original, unedited'}</div>
        ${facesTable(ph.faces)}
      </div>
    </section>`)
    .join('')
  const held = p.heldBack.length
    ? p.heldBack
        .map((h) => `<section class="held">
          <div class="row"><strong>${esc(h.title ?? h.assetId)}</strong><span class="chip ${h.decision === 'Check faces' ? 'info' : 'risk'}">${esc(h.decision)}</span></div>
          <div class="muted small">${esc(h.reason)} · Photo ID <span class="mono">${esc(h.assetId)}</span></div>
          ${facesTable(h.faces)}
        </section>`)
        .join('')
    : '<p class="muted">Nothing was held back.</p>'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Evidence: ${esc(p.event.name)} for ${esc(p.destination.label)}</title>
<style>
:root{--ink:#0b1c30;--ink2:#3f4550;--ink3:#5f6570;--line:#e7e4dc;--canvas:#f7f6f2;--ok:#0e6b4b;--okbg:#e3f3eb;--warn:#8a5300;--warnbg:#fdf0d9;--risk:#b42318;--riskbg:#fde7e4;--info:#1d4ed8;--infobg:#e6eeff}
*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:14px/1.55 "Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:40px 24px 64px}
h1{font:600 30px/1.2 Georgia,"Times New Roman",serif;margin:6px 0 6px}h2{font-size:16px;margin:0 0 12px}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)}
.lead{color:var(--ink2);max-width:720px;margin:0}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-top:18px}
dl{display:grid;grid-template-columns:190px 1fr;gap:7px 16px;margin:0;font-size:13.5px}dt{color:var(--ink3)}dd{margin:0}
.mono{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:12px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stat{border-radius:12px;padding:14px 16px}
.stat b{display:block;font:600 34px/1.1 Georgia,serif}.stat span{font-size:13px;font-weight:600}
.chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;white-space:nowrap}
.ok{background:var(--okbg);color:var(--ok)}.warn{background:var(--warnbg);color:var(--warn)}.risk{background:var(--riskbg);color:var(--risk)}.info{background:var(--infobg);color:var(--info)}
.tag{font-size:10.5px;font-weight:700;color:var(--ink3);border:1px solid var(--line);border-radius:6px;padding:0 5px;margin-left:4px}
.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.muted{color:var(--ink3)}.small{font-size:12.5px;margin-top:2px}
.photo{display:grid;grid-template-columns:150px 1fr;gap:18px;padding:18px 0;border-top:1px solid var(--line)}.photo:first-of-type{border-top:0;padding-top:4px}
.photo img{width:150px;height:188px;object-fit:cover;border-radius:10px;background:#eee;display:block}
.held{padding:14px 0;border-top:1px solid var(--line)}.held:first-of-type{border-top:0;padding-top:0}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:10px}th{text-align:left;font-weight:600;color:var(--ink3);padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:7px 8px;border-bottom:1px solid #f1efe9;vertical-align:top}
footer{margin-top:28px;color:var(--ink3);font-size:12px}
@media print{body{background:#fff}.card{break-inside:avoid}}
</style></head><body><main>
<div class="eyebrow">Publish Guard · evidence pack</div>
<h1>${esc(p.event.name)} → ${esc(p.destination.label)}</h1>
<p class="lead">Every face was matched to the school roster and checked against the parent’s latest choice for “${esc(p.destination.parentChoiceChecked)}”. Faces we could not recognise were never guessed.</p>

<div class="card"><dl>
<dt>School</dt><dd>${esc(p.school)}</dd>
<dt>Event</dt><dd>${esc(p.event.name)}${p.event.date ? ` · ${esc(fmtDate(p.event.date))}` : ''}</dd>
<dt>Destination</dt><dd>${esc(p.destination.label)}${p.destination.blurAllowed ? '' : ' · blurred faces are never used here'}</dd>
<dt>Parent choice checked</dt><dd>${esc(p.destination.parentChoiceChecked)}</dd>
<dt>Exported</dt><dd>${esc(fmtDateTime(p.exportedAt))} by ${esc(p.exportedBy.name)} (${esc(p.exportedBy.role)})</dd>
<dt>Evidence record</dt><dd class="mono">${esc(p.evidenceId)}</dd>
<dt>Notice version(s)</dt><dd class="mono">${esc(p.noticeVersions.join(', ') || '—')}</dd>
<dt>Unrecognised faces</dt><dd>${p.options.blurUnrecognisedFaces ? 'Blurred' : 'Held back for a quick check'}</dd>
<dt>Blur used</dt><dd>${esc(p.options.blurStyle)}, applied to the pixels of the exported copy</dd>
<dt>Pack fingerprint</dt><dd class="mono">SHA-256 of evidence.json: ${esc(fingerprint)}</dd>
</dl></div>

<div class="card stats">
<div class="stat ok"><b>${p.summary.readyAsTaken}</b><span>Ready to share</span></div>
<div class="stat warn"><b>${p.summary.fixedWithBlur}</b><span>Fixed with blur</span></div>
<div class="stat risk"><b>${p.summary.heldBack}</b><span>Held back (not in this pack)</span></div>
</div>

<div class="card"><h2>In this pack (${p.photos.length})</h2>${photos}</div>
<div class="card"><h2>Held back (${p.heldBack.length})</h2>${held}</div>

<footer><p>${esc(p.originals)}</p><p>${p.summary.photosChecked} photos and ${p.summary.facesChecked} faces checked.</p><p>${esc(p.disclaimer)}</p></footer>
</main></body></html>`
}
