import * as React from 'react'
import { Download, Users, Presentation, Settings2, Printer } from 'lucide-react'
import { useDemo } from '../store'
import { Btn, Chip, SectionTitle } from '../ui'
import { Qr, appUrl, qrFor } from './Pilot'
import { go } from '../nav'

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const inp = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm'

function Leads() {
  const s = useDemo(); const L = s.leads
  const owners = s.settings.owners.split(',').map((x) => x.trim()).filter(Boolean)
  const n = (st: string) => L.filter((l) => l.stage === st).length
  const stages = [['Visitors', Math.max(s.visitors, L.length), 'target: 10 qualified conversations'], ['Qualified', L.filter((l) => l.stage !== 'new').length, ''], ['Demos', n('demo') + n('proposal') + n('paid'), 'target 3'], ['Proposals', n('proposal') + n('paid'), 'target 2 (priced)'], ['Paid', n('paid'), 'target 1']] as const
  const exportCsv = () => {
    const rows = [['id', 'time', 'name', 'school', 'role', 'city', 'phone', 'q1_approver', 'q2_check', 'q3_pilot', 'whatsapp_optin', 'source', 'stage', 'owner', 'next_meeting', 'notes'], ...L.map((l) => [l.id, l.at, l.name, l.school, l.role, l.city, l.phone, l.q1, l.q2, l.q3, l.optIn, l.source, l.stage, l.owner, l.nextMeeting, l.notes])]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })); a.download = `didac-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }
  return (<>
    <p className="mb-4 text-sm text-ink-2">Visitors → qualified conversations → demos → proposals → paid pilots. Tracks real conversations, not QR scans. Stored on this device — export before you leave.</p>
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{stages.map(([l, v, t]) => <div key={l} className="card p-4"><div className="eyebrow">{l}</div><div className="text-3xl font-bold">{v}</div><div className="text-[11px] text-ink-3">{t || ' '}</div></div>)}</div>
    <div className="mb-4 flex flex-wrap gap-2"><Btn variant="outline" onClick={s.addVisitor}>+ Booth visitor (no form)</Btn><Btn variant="outline" onClick={exportCsv} disabled={!L.length}><Download className="size-4" /> Export CSV</Btn><Btn variant="ghost" onClick={() => confirm('Delete all leads on this device?') && s.resetLeads()}>Clear</Btn></div>
    <div className="card divide-y divide-line">
      {L.length === 0 && <p className="p-5 text-sm text-ink-3">No leads yet. Submissions from “Pilot & QR” appear here.</p>}
      {L.map((l) => (
        <div key={l.id} className="space-y-2 p-4">
          <div className="grid items-center gap-2 md:grid-cols-[1.2fr_1fr_auto]">
            <div><div className="font-semibold">{l.name} <span className="font-normal text-ink-3">· {l.role}</span></div><div className="text-sm text-ink-2">{l.school}{l.city ? `, ${l.city}` : ''}{l.phone ? ` · ${l.phone}` : ''}</div></div>
            <div className="text-xs text-ink-2">Pilot interest: <b>{l.q3}</b>{l.optIn && <Chip tone="ok" className="ml-2">WhatsApp OK</Chip>}<div className="mt-0.5 text-ink-3">{l.q1}</div></div>
            <select aria-label="Stage" value={l.stage} onChange={(e) => s.setStage(l.id, e.target.value as typeof l.stage)} className="h-10 rounded-xl border border-line bg-white px-2 text-sm">{['new', 'qualified', 'demo', 'proposal', 'paid'].map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[11px] font-semibold text-ink-3">Owner<select className={inp} value={l.owner} onChange={(e) => s.updateLead(l.id, { owner: e.target.value })}>{[...new Set([l.owner, ...owners])].map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-ink-3">Next meeting<input type="date" className={inp} value={l.nextMeeting} onChange={(e) => s.updateLead(l.id, { nextMeeting: e.target.value })} /></label>
            <label className="text-[11px] font-semibold text-ink-3">Notes<input className={inp} value={l.notes} onChange={(e) => s.updateLead(l.id, { notes: e.target.value })} placeholder="e.g. 2 campuses, uses WhatsApp groups" /></label>
          </div>
        </div>))}
    </div></>)
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="card p-5"><div className="eyebrow mb-2">{title}</div>{children}</div>
function Presenter() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Opening question"><p className="text-lg font-bold leading-snug">“Who verifies a child’s media permissions before your school publishes Annual Day or sports-event photographs?”</p></Block>
      <Block title="30-second booth pitch"><p className="text-sm leading-relaxed text-ink-2">“Schools create thousands of student photos, but permissions often live in a separate form or spreadsheet. When a photo goes to the website, Instagram or a parent group, who checks what each parent has approved? DPDPA for Schools is developing a consent-driven media workflow: check permissions, review exceptions, control sharing where the platform is used, and keep an evidence trail. Could we run through your next school event and propose a short, scoped pilot?”</p></Block>
      <Block title="2–3 minute demo run-of-show">
        <ol className="space-y-1.5 text-sm text-ink-2">{['Launcher → Booth kit → Live demo (or play the 75 s story first).', 'Admin: Annual Day group photo — three matched, one unknown. One guardian hasn’t set choices yet, so public use is blocked by default.', 'Parent app: sign in with the school-issued ID (demo login G-4K7Q) → set password → notice → choices: album yes, public no. Show Hindi. Point out: no name or phone number is held.', 'Admin: public publishing stays blocked, with the reason. Unknown face → human review.', 'Approve the eligible choir photo. Parent sees only their child; others blurred.', 'Photo zoom: who opened, when. Say what it does NOT prove.', 'Evidence tab: chain verified. Bonus: parent withdraws → takedown task.'].map((t, i) => <li key={i} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold-50 text-[11px] font-bold text-gold">{i + 1}</span>{t}</li>)}</ol>
        <p className="mt-2 text-xs text-ink-3">Say out loud: “This is a prototype with synthetic children and a fictional school.”</p>
      </Block>
      <Block title="Three qualifying questions">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2"><li>Who currently approves public student photos?</li><li>How does the person publishing check all students in group images and revoked consent?</li><li>Would you pay for a bounded one-event pilot with a named admin owner and a dated outcome?</li></ol>
        <p className="mt-2 text-xs text-ink-3">Targets: 10 qualified principal/management conversations · 3 demos · 2 priced proposals · 1 paid commitment.</p>
      </Block>
      <Block title="Say / don’t say">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <ul className="space-y-1.5 text-ink-2">{['“Schools should prepare ahead of the main provisions scheduled for May 2027.”', '“We check permissions before managed sharing and keep an evidence trail.”', '“Penalties are caps after an enquiry, not a per-photo fine.”', '“This is a prototype with synthetic data.”'].map((t) => <li key={t} className="rounded-lg bg-ok-bg px-2.5 py-1.5 text-ok">{t}</li>)}</ul>
          <ul className="space-y-1.5 text-ink-2">{['“No one else solves this.”', '“We make you DPDP compliant / certified.”', '“₹200 crore for every photo.”', '“Our AI identifies every child.”', '“We can delete it from WhatsApp.”'].map((t) => <li key={t} className="rounded-lg bg-risk-bg px-2.5 py-1.5 text-risk line-through">{t}</li>)}</ul>
        </div>
      </Block>
      <Block title="What is real vs prototype">
        <table className="w-full text-sm"><tbody>{[['Private school gallery', 'Base exists; school restrictions unverified'], ['Parent console, admin console', 'Prototype / demo'], ['Permission gate + decision log', 'Prototype; built first in a pilot'], ['Face matching of children', 'Proposed; needs counsel + accuracy test'], ['Photo activity (who opened)', 'Only where logging exists; validate'], ['WhatsApp auto-reply', 'Needs WhatsApp Business setup']].map(([a, b]) => <tr key={a} className="border-t border-line"><td className="py-1.5 pr-2 font-semibold">{a}</td><td className="text-ink-2">{b}</td></tr>)}</tbody></table>
      </Block>
      <Block title="Pilot policy">
        <ul className="space-y-1.5 text-sm text-ink-2"><li>• Free: 15-minute assessment + synthetic walkthrough. Not free custom implementation.</li><li>• Next: bounded remote pilot for one event; real data only after lawful-basis, safeguarding and processor review and a signed scope. Price on proposal.</li><li>• Exceptional free pilot only with a named decision-maker, fixed timeframe, success criteria and signed intent to discuss paid conversion — log the opportunity cost.</li></ul>
      </Block>
      <Block title="Before the event — checklist">
        <ul className="space-y-1.5 text-sm text-ink-2">{['Counsel reviews public wording (S.9 vs Rule 12, child-face matching, penalties).', 'Set the WhatsApp number in Settings and test the QR on two phones.', 'Install the app on the booth tablet; open it once online so it works offline.', 'Reset demo data and clear test leads.', 'Print the one-pager (Booth kit → One-pager).'].map((t) => <li key={t} className="flex gap-2"><span className="mt-1 size-3.5 shrink-0 rounded border border-line" />{t}</li>)}</ul>
      </Block>
    </div>)
}

function Settings() {
  const s = useDemo(); const st = s.settings
  const [role] = React.useState('Principal')
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="card space-y-3 p-5">
        <label className="block text-sm font-semibold">WhatsApp number for the booth QR<input className={`${inp} mt-1`} inputMode="tel" placeholder="e.g. 919876543210 (country code, digits only)" value={st.waNumber} onChange={(e) => s.setSettings({ waNumber: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="block text-sm font-semibold">Event tag<input className={`${inp} mt-1`} value={st.eventTag} onChange={(e) => s.setSettings({ eventTag: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Team members (comma-separated, for lead owner)<input className={`${inp} mt-1`} value={st.owners} onChange={(e) => s.setSettings({ owners: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Contact email (one-pager)<input className={`${inp} mt-1`} type="email" value={st.contactEmail} onChange={(e) => s.setSettings({ contactEmail: e.target.value })} /></label><label className="block text-sm font-semibold">Contact phone (one-pager)<input className={`${inp} mt-1`} value={st.contactPhone} onChange={(e) => s.setSettings({ contactPhone: e.target.value })} /></label></div>
        <p className="text-xs text-ink-3">Saved on this device. Use DPDPA for Schools’ own contact route — not another product’s number.</p>
        <div className="flex flex-wrap gap-2 pt-1"><Btn variant="outline" onClick={() => confirm('Reset demo data (photos, choices, log)? Leads are kept.') && s.resetDemo()}>Reset demo data</Btn><Btn variant="outline" onClick={() => go('onepager')}><Printer className="size-4" /> Open one-pager</Btn></div>
      </div>
      <div className="card p-5 text-center"><div className="eyebrow mb-2">QR preview</div><div className="flex justify-center"><Qr value={qrFor(st.waNumber, st.eventTag, role)} size={180} /></div><p className="mt-2 text-xs text-ink-3">{st.waNumber ? 'Opens WhatsApp with a ready message' : 'No number: opens the app'}</p><p className="mt-1 break-all text-[10px] text-ink-3">{appUrl()}</p></div>
    </div>)
}

export function Team() {
  const [tab, setTab] = React.useState<'leads' | 'presenter' | 'settings'>('leads')
  const tabs: ['leads' | 'presenter' | 'settings', string, React.ReactNode][] = [['leads', 'Leads & funnel', <Users key="a" className="size-4" />], ['presenter', 'Presenter notes', <Presentation key="b" className="size-4" />], ['settings', 'Settings', <Settings2 key="c" className="size-4" />]]
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle eyebrow="Team only" title="Booth control room" sub="Everything the team needs at the stand: the script, the funnel and the settings." />
      <div className="mb-5 flex gap-1 rounded-2xl bg-sand p-1.5">{tabs.map(([k, l, i]) => <button key={k} type="button" onClick={() => setTab(k)} className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${tab === k ? 'bg-white shadow-sm' : 'text-ink-2'}`}>{i}{l}</button>)}</div>
      {tab === 'leads' && <Leads />}{tab === 'presenter' && <Presenter />}{tab === 'settings' && <Settings />}
    </section>
  )
}
