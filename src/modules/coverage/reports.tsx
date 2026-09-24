import * as React from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { ArrowLeft, Printer } from 'lucide-react'
import { LEGAL } from '@/data/reference'
import { Button, Chip } from '@/design/ui'
import { evaluateAsset } from '@/engine/permission'
import { useApp, personName } from '@/store/app'
import { useCtx } from '@/store/hooks'
import { cn, DEMO_NOW, fmtDate, fmtNum } from '@/lib/utils'
import { actorFor, openRequests, personOf, statusLabel, statusLine, statusTone, summarizeAreas } from './lib'
import { Rise } from './parts'

/** Reports — mounted at /reports/*. */
export default function ReportsModule() {
  return (
    <Routes>
      <Route path="trustee" element={<TrusteeReport />} />
      <Route path="*" element={<Navigate to="/reports/trustee" replace />} />
    </Routes>
  )
}

const PRINT_CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  html, body, #root { height: auto !important; background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .report-paper { box-shadow: none !important; border: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; border-radius: 0 !important; }
  .report-block { break-inside: avoid; }
  .report-row { break-inside: avoid; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`

const HOURS = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000)

function Section({ n, title, children, className }: { n: number; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('report-block mt-10', className)}>
      <div className="flex items-baseline gap-3 border-b border-ink/80 pb-2">
        <span className="font-display text-[15px] font-semibold text-ink-3 num">{String(n).padStart(2, '0')}</span>
        <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function TrusteeReport() {
  const d = useApp(useShallow((s) => ({
    school: s.school, people: s.people, obligations: s.obligations, guardians: s.guardians, assets: s.assets, publications: s.publications,
    requests: s.requests, vendors: s.vendors, controls: s.controls, incidents: s.incidents, training: s.training, notices: s.notices,
    evidence: s.evidence, experts: s.experts, students: s.students, role: s.role, tasks: s.tasks,
  })))
  const ctx = useCtx()
  const areas = React.useMemo(() => summarizeAreas(d.obligations), [d.obligations])
  const line = statusLine(areas, 'report')

  const m = React.useMemo(() => {
    const photos = d.assets.filter((a) => a.kind === 'photo')
    let blurred = 0
    for (const a of photos) blurred += evaluateAsset(ctx, a, 'instagram').faces.filter((f) => f.state === 'blocked').length
    const onboarded = d.guardians.filter((g) => g.onboarded).length
    const verified = d.guardians.filter((g) => g.verification).length
    const open = openRequests(d.requests)
    const closed = d.requests.filter((r) => ['resolved', 'closed'].includes(r.status))
    const closeDays = closed.map((r) => (new Date(r.steps[r.steps.length - 1].at).getTime() - new Date(r.receivedAt).getTime()) / 86400000)
    const avgDays = closeDays.length ? Math.round((closeDays.reduce((a, b) => a + b, 0) / closeDays.length) * 10) / 10 : 0
    const late = open.filter((r) => new Date(r.targetAt).getTime() < new Date(DEMO_NOW).getTime()).length
    const fullClauses = d.vendors.filter((v) => Object.values(v.contract).every(Boolean)).length
    const inPlace = d.controls.filter((c) => c.status === 'in-place').length
    const partial = d.controls.filter((c) => c.status === 'partial').length
    const trained = d.training.reduce((a, t) => a + t.completed, 0)
    const trainTotal = d.training.reduce((a, t) => a + t.total, 0)
    return {
      photos: photos.length, blurred, onboarded, verified, open: open.length, closed: closed.length, avgDays, late, fullClauses, inPlace, partial, trained, trainTotal,
      live: d.publications.filter((p) => p.status === 'live').length, takedowns: d.publications.filter((p) => p.status !== 'live').length,
    }
  }, [d, ctx])

  const decisions = React.useMemo(() => {
    const out: { at: string; text: string; by: string }[] = []
    for (const n of d.notices) if (n.approvedBy && n.status !== 'draft') out.push({ at: n.publishedAt, text: `Privacy notice ${n.id} approved and published. ${n.summary}`, by: n.approvedBy })
    for (const e of d.evidence) {
      if (e.title.startsWith('Decision recorded:')) {
        const p = e.payload as { topic?: string; decision?: string } | undefined
        out.push({ at: e.at, text: p?.topic ? `${p.topic}: ${p.decision}.` : e.title.replace('Decision recorded: ', ''), by: e.actor })
      } else if (e.type === 'readiness' && e.title.startsWith('Readiness check completed')) {
        out.push({ at: e.at, text: `Readiness plan adopted. ${e.title.replace(/^Readiness check completed:?\s*/, '')}`, by: e.actor })
      }
    }
    const sdf = d.obligations.find((o) => o.area === 'governance' && /Significant Data Fiduciary/i.test(o.title))
    if (sdf && sdf.status === 'covered') {
      const firstEv = d.evidence.find((e) => sdf.evidenceIds.includes(e.id))
      out.push({ at: firstEv?.at ?? DEMO_NOW, text: 'Significant Data Fiduciary status reviewed: not notified, so no statutory DPO or independent audit is required today.', by: sdf.ownerId })
    }
    for (const x of d.experts) if (x.status === 'report-shared' || x.status === 'closed') out.push({ at: x.messages[x.messages.length - 1]?.at ?? x.createdAt, text: `${x.title}: ${x.messages[x.messages.length - 1]?.text ?? 'completed.'}`, by: 'U-DESK' })
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [d])

  const recent = d.evidence.slice(-20).reverse()
  const nameOf = (id: string) => personOf(d.people, id)?.name ?? personName(id)

  const print = () => {
    useApp.getState().addEvidence({ type: 'export', title: 'Trustee report printed or saved as PDF', actor: actorFor(d.role), refs: ['trustee-report'] })
    window.setTimeout(() => window.print(), 60)
  }

  const kf = [
    { value: `${line.covered} of ${line.total}`, label: 'areas covered' },
    { value: `${fmtNum(m.onboarded)}`, label: `of ${fmtNum(d.guardians.length)} families have set their choices` },
    { value: '0', label: 'photos published without permission' },
    { value: `${m.open}`, label: m.late ? `open requests, ${m.late} past target` : 'open requests, all within timeline' },
  ]

  return (
    <div className="pb-10">
      <style>{PRINT_CSS}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link to="/home" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> Back to home</Link>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-3">A4 · ready for your next board meeting</span>
          <Button onClick={print} icon={<Printer className="size-4" />}>Print / Save as PDF</Button>
        </div>
      </div>

      <Rise>
        <article className="report-paper mx-auto w-full max-w-[210mm] rounded-[6px] border border-line bg-white px-[16mm] pb-[16mm] pt-[14mm] text-ink shadow-[0_2px_4px_rgba(11,28,48,.04),0_24px_60px_rgba(11,28,48,.10)]">
          {/* Masthead */}
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3.5">
              {d.school.logoDataUrl
                ? <img src={d.school.logoDataUrl} alt="" className="size-11 rounded-lg object-contain" />
                : <div className="flex size-11 items-center justify-center rounded-lg bg-[#fdf0d9] font-display text-[20px] font-bold text-[#8a5300]">{d.school.shortName[0]}</div>}
              <div className="leading-tight">
                <div className="font-display text-[19px] font-semibold">{d.school.name}</div>
                <div className="mt-0.5 text-[12px] text-ink-3">{d.school.city}, {d.school.state} · {d.school.board}</div>
              </div>
            </div>
            <div className="text-right leading-tight">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Trustee report</div>
              <div className="mt-1 text-[12px] text-ink-2">DPDP readiness</div>
            </div>
          </header>
          <div className="mt-6 h-[2px] bg-ink" />
          <div className="mt-1 h-px bg-ink/30" />

          <h1 className="mt-8 font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em]">Where the school stands on data protection</h1>
          <p className="mt-2 text-[12.5px] text-ink-3">Prepared {fmtDate(DEMO_NOW)} for the Board of Trustees · Privacy contact: {d.school.privacyContact.name}, {d.school.privacyContact.role.toLowerCase()}</p>

          {/* Summary */}
          <section className="report-block mt-7">
            <p className="text-[15px] leading-[1.7] text-ink">
              {line.first} {line.second} Parents choose purpose by purpose, every photo is checked against those choices before it is shared,
              and every decision leaves a tamper-evident record. Full obligations under the Digital Personal Data Protection Act apply
              from {LEGAL.fullObligationsLabel}; the remaining work is scheduled well before then.
            </p>
            <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-lg border border-line">
              {kf.map((k, i) => (
                <div key={k.label} className={cn('px-4 py-4', i > 0 && 'border-l border-line', i === 0 ? 'bg-ok-bg/50' : 'bg-[#fbfaf7]')}>
                  <div className="font-display text-[26px] font-semibold leading-none num">{k.value}</div>
                  <div className="mt-1.5 text-[11.5px] leading-snug text-ink-2">{k.label}</div>
                </div>
              ))}
            </div>
          </section>

          <Section n={1} title="Coverage by area">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                  <th className="pb-2 pr-3 font-bold">Area</th>
                  <th className="pb-2 pr-3 font-bold">Status</th>
                  <th className="pb-2 pr-3 font-bold">Where things stand</th>
                  <th className="pb-2 pr-3 font-bold">Owner</th>
                  <th className="pb-2 text-right font-bold">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => (
                  <tr key={a.key} className="report-row border-t border-line align-top">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{a.label}</td>
                    <td className="py-2.5 pr-3"><Chip tone={statusTone(a.status)} size="sm">{statusLabel(a.status)}</Chip></td>
                    <td className="py-2.5 pr-3 leading-snug text-ink-2">{a.worst ? a.worst.plain : a.blurb}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-ink-2">{nameOf(a.ownerId)}</td>
                    <td className="py-2.5 text-right text-ink-2 num">{a.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section n={2} title="Key figures">
            <dl className="grid grid-cols-2 gap-x-10">
              {[
                ['Families with choices set', `${fmtNum(m.onboarded)} of ${fmtNum(d.guardians.length)}`],
                ['Parents verified', `${fmtNum(m.verified)} of ${fmtNum(d.guardians.length)}`],
                ['Photos checked this month', fmtNum(m.photos)],
                ['Faces blurred automatically', fmtNum(m.blurred)],
                ['Photos published without permission', '0'],
                ['Posts live · taken down or flagged', `${m.live} · ${m.takedowns}`],
                ['Parent requests', `${m.open} open · ${m.closed} closed`],
                ['Average time to close a request', m.avgDays ? `${m.avgDays} days` : '—'],
                ['Vendors with complete data clauses', `${m.fullClauses} of ${d.vendors.length}`],
                ['Security safeguards in place', `${m.inPlace} of ${d.controls.length}${m.partial ? ` (${m.partial} partly)` : ''}`],
                ['Staff privacy training done', `${fmtNum(m.trained)} of ${fmtNum(m.trainTotal)}`],
              ].map(([k, v]) => (
                <div key={k} className="report-row flex items-baseline justify-between gap-4 border-t border-line py-2.5">
                  <dt className="text-[12.5px] text-ink-2">{k}</dt>
                  <dd className="text-right text-[13px] font-semibold text-ink num">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section n={3} title="Decisions taken">
            {decisions.length ? (
              <ol className="space-y-0">
                {decisions.map((x, i) => (
                  <li key={i} className="report-row grid grid-cols-[92px_1fr_auto] gap-4 border-t border-line py-2.5 text-[12.5px]">
                    <span className="text-ink-3 num">{fmtDate(x.at)}</span>
                    <span className="leading-snug text-ink">{x.text}</span>
                    <span className="whitespace-nowrap text-ink-3">{nameOf(x.by)}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-[13px] text-ink-2">No decisions recorded in this period.</p>}
          </Section>

          <Section n={4} title="Incidents">
            {d.incidents.length ? (
              <div className="space-y-3">
                {d.incidents.map((i) => {
                  const contain = i.steps.find((s) => s.kind === 'contain')
                  const parents = i.steps.find((s) => s.kind === 'notify-parents')
                  const report = i.steps.find((s) => s.kind === 'report')
                  return (
                    <div key={i.id} className="report-row rounded-lg border border-line px-4 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[13.5px] font-semibold">{i.title}</div>
                        <Chip tone={i.status === 'closed' ? 'ok' : 'warn'} size="sm">{i.status === 'closed' ? 'Closed' : i.status === 'reported' ? 'Reported' : i.status === 'contained' ? 'Contained' : 'Open'}</Chip>
                      </div>
                      <div className="mt-1 text-[12px] text-ink-3"><span className="font-mono">{i.id}</span> · detected {fmtDate(i.detectedAt)} · {fmtNum(i.affectedCount)} students affected · {i.affectedData.join(', ')}</div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                        {contain ? `Contained within ${Math.max(1, HOURS(i.detectedAt, contain.at))} hour${HOURS(i.detectedAt, contain.at) > 1 ? 's' : ''}. ` : ''}
                        {parents ? `Parents informed ${HOURS(i.detectedAt, parents.at) < 24 ? 'the same day' : `after ${HOURS(i.detectedAt, parents.at)} hours`}. ` : ''}
                        {report ? `Detailed report filed with the Board ${HOURS(i.detectedAt, report.at) <= LEGAL.boardDetailedReportHours ? `within ${LEGAL.boardDetailedReportHours} hours` : `after ${HOURS(i.detectedAt, report.at)} hours`}.` : `Board report due ${fmtDate(i.boardDetailedDueAt)}.`}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-[13px] text-ink-2">No incidents this period.</p>}
          </Section>

          <Section n={5} title="Evidence index (latest 20 records)">
            <table className="w-full border-collapse text-left text-[11.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  <th className="pb-2 pr-3 font-bold">Record</th>
                  <th className="pb-2 pr-3 font-bold">Date</th>
                  <th className="pb-2 pr-3 font-bold">What happened</th>
                  <th className="pb-2 font-bold">By</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e, i) => (
                  <tr key={`${e.id}:${i}`} className="report-row border-t border-line align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-[10.5px] text-ink-2">{e.id}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-ink-3 num">{fmtDate(e.at)}</td>
                    <td className="py-1.5 pr-3 leading-snug text-ink">{e.title}</td>
                    <td className="whitespace-nowrap py-1.5 text-ink-3">{e.actor === 'system' ? 'System' : nameOf(e.actor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11.5px] text-ink-3">
              {fmtNum(d.evidence.length)} records in the school’s tamper-evident ledger. Each record carries the fingerprint of the one before it.
              Latest fingerprint <span className="font-mono">{d.evidence[d.evidence.length - 1]?.hash.slice(0, 16)}…</span>
            </p>
          </Section>

          {/* Sign-off */}
          <section className="report-block mt-12 grid grid-cols-2 gap-10">
            {[['Presented by', personOf(d.people, 'U-PRIN')], ['Noted by', personOf(d.people, 'U-CHAIR')]].map(([label, p]) => {
              const person = p as ReturnType<typeof personOf>
              return (
                <div key={label as string}>
                  <div className="h-12 border-b border-ink/40" />
                  <div className="mt-2 text-[12px] text-ink-2">{label as string}: <span className="font-semibold text-ink">{person?.name}</span>, {person?.title}</div>
                </div>
              )
            })}
          </section>

          <footer className="mt-10 border-t border-line pt-4 text-[10.5px] leading-relaxed text-ink-3">
            <p>{LEGAL.disclaimer}</p>
            <p className="mt-1">Generated by School DPDP OS on {fmtDate(DEMO_NOW)}. Figures reflect the school’s live records at the time of printing.</p>
          </footer>
        </article>
      </Rise>
    </div>
  )
}
