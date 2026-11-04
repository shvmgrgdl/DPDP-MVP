import * as React from 'react'
import QRCode from 'qrcode'
import { Check, MessageCircle, CalendarCheck, FlaskConical, Download } from 'lucide-react'
import { useDemo } from '../store'
import { EVENT_TAG, WA_NUMBER, waLink } from '../config'
import { Btn, Chip, SectionTitle } from '../ui'

const field = 'h-11 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 text-sm'

function Qr({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = React.useState('')
  React.useEffect(() => { QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#14213d', light: '#ffffff' } }).then(setSrc).catch(() => setSrc('')) }, [value, size])
  return src ? <img src={src} alt="QR code" width={size} height={size} className="rounded-xl border border-line bg-white p-2" /> : <div style={{ width: size, height: size }} className="rounded-xl bg-sand" />
}

export function Pilot() {
  const add = useDemo((s) => s.addLead)
  const [done, setDone] = React.useState<{ phone: string; optIn: boolean; name: string } | null>(null)
  const [f, setF] = React.useState({ name: '', school: '', role: '', city: '', phone: '', q1: '', q2: '', q3: '' as 'yes' | 'maybe' | 'no' | '', optIn: false })
  const [role, setRole] = React.useState('Principal')
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const ok = f.name && f.school && f.role && f.q3
  const msg = `Hi! I'm a ${role} at my school. I saw DPDPA for Schools MediaGuard at ${EVENT_TAG} — please send me the demo. [${EVENT_TAG}]`
  const appUrl = typeof location !== 'undefined' ? location.href.split('#')[0] : ''
  const qrValue = WA_NUMBER ? waLink(msg) : appUrl
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle eyebrow="Offer · next step" title="Start with a free 15-minute workflow assessment" sub="We map how photos and permissions move at your school today, then walk you through the prototype with synthetic data. No real student data is needed." />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="card p-5"><div className="mb-2 flex items-center gap-2 font-bold"><CalendarCheck className="size-5 text-gold" /> Free: 15-minute assessment</div><ul className="space-y-1.5 text-sm text-ink-2">{['Your current photo approval path, in your words', 'A synthetic walkthrough of the group-photo conflict', 'A short written note of gaps and next steps'].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{t}</li>)}</ul></div>
        <div className="card p-5"><div className="mb-2 flex items-center gap-2 font-bold"><FlaskConical className="size-5 text-gold" /> Then: a bounded remote pilot</div><p className="text-sm text-ink-2">One real event, a named school owner, fixed dates and success measures. Real data comes only after your lawful-basis, safeguarding and processor review and a signed scope. We’ll quote the pilot after the assessment.</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); if (!ok) return; add({ ...f, source: EVENT_TAG, q3: f.q3 }); setDone({ phone: f.phone, optIn: f.optIn, name: f.name }); setF({ name: '', school: '', role: '', city: '', phone: '', q1: '', q2: '', q3: '', optIn: false }) }}>
          <div className="flex items-center justify-between"><div className="text-lg font-bold">Book your assessment</div><Chip tone="gold">{EVENT_TAG}</Chip></div>
          {done ? (
            <div className="rounded-xl bg-ok-bg p-4 text-sm text-ok"><b>Thank you, {done.name}.</b> Saved on this device — we’ll follow up.
              {done.optIn && done.phone && <div className="mt-3"><a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ok px-4 font-semibold text-white" target="_blank" rel="noreferrer" href={waLink(`Hello from DPDPA for Schools (${EVENT_TAG}). Here is the 75-second MediaGuard story and a link to book your free 15-minute workflow assessment: ${appUrl}#/story`, done.phone.replace(/\D/g, ''))}><MessageCircle className="size-4" /> Send my demo on WhatsApp</a></div>}
              <button type="button" className="mt-3 block text-xs underline" onClick={() => setDone(null)}>Add another</button></div>
          ) : (<>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={field} placeholder="Your name *" value={f.name} onChange={(e) => set('name', e.target.value)} />
              <input className={field} placeholder="School *" value={f.school} onChange={(e) => set('school', e.target.value)} />
              <input className={field} placeholder="Designation * (e.g. Principal)" value={f.role} onChange={(e) => set('role', e.target.value)} />
              <input className={field} placeholder="City" value={f.city} onChange={(e) => set('city', e.target.value)} />
              <input className={`${field} sm:col-span-2`} inputMode="tel" placeholder="WhatsApp number (optional)" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2 rounded-xl bg-sand p-3">
              <div className="eyebrow">Three quick questions</div>
              <input className={field} placeholder="1. Who approves public student photos today?" value={f.q1} onChange={(e) => set('q1', e.target.value)} />
              <input className={field} placeholder="2. How do they check group photos and withdrawn permissions?" value={f.q2} onChange={(e) => set('q2', e.target.value)} />
              <div className="text-sm font-semibold">3. Would you consider a bounded one-event pilot with a named owner? *</div>
              <div className="flex gap-2">{(['yes', 'maybe', 'no'] as const).map((v) => <button key={v} type="button" onClick={() => set('q3', v)} className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold capitalize ${f.q3 === v ? 'border-navy bg-navy text-white' : 'border-[#d6cdb8] bg-white'}`}>{v}</button>)}</div>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" className="mt-1 size-4" checked={f.optIn} onChange={(e) => set('optIn', e.target.checked)} />Yes, you may contact me on WhatsApp about this demo and assessment. I can opt out at any time.</label>
            <Btn variant="gold" className="w-full" disabled={!ok} type="submit">Request my assessment</Btn>
            <p className="text-[11px] text-ink-3">Details stay on this device until the team exports them. We use them only to follow up on this request.</p>
          </>)}
        </form>

        <div className="card space-y-3 p-5 text-center">
          <div className="eyebrow">Booth QR · WhatsApp opt-in</div>
          <div className="flex justify-center"><Qr value={qrValue} /></div>
          <div className="flex flex-wrap justify-center gap-1.5">{['Principal', 'School owner', 'Administrator', 'Teacher'].map((r) => <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${role === r ? 'bg-navy text-white' : 'bg-sand text-ink-2'}`}>{r}</button>)}</div>
          <p className="text-sm text-ink-2">{WA_NUMBER ? 'Scan to open WhatsApp with a ready message tagged ' + EVENT_TAG + '.' : 'No WhatsApp number configured: this QR opens the demo app instead. Set VITE_WA_NUMBER and rebuild for the WhatsApp opt-in.'}</p>
          <p className="text-[11px] text-ink-3">The visitor taps Send themselves — that is the opt-in. Automatic replies need a WhatsApp Business account, set up outside this demo.</p>
          <Qr value={appUrl} size={110} /><div className="text-xs text-ink-3">Install / open this app</div>
        </div>
      </div>
    </section>
  )
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function Leads() {
  const s = useDemo()
  const L = s.leads
  const n = (st: string) => L.filter((l) => l.stage === st).length
  const stages = [['Visitors', Math.max(s.visitors, L.length), '10 qualified conversations'], ['Qualified', L.filter((l) => l.stage !== 'new').length, ''], ['Demos', n('demo') + n('proposal') + n('paid'), 'target 3'], ['Proposals', n('proposal') + n('paid'), 'target 2'], ['Paid', n('paid'), 'target 1']] as const
  const exportCsv = () => {
    const rows = [['id', 'time', 'name', 'school', 'role', 'city', 'phone', 'q1_approver', 'q2_check', 'q3_pilot', 'whatsapp_optin', 'source', 'stage'], ...L.map((l) => [l.id, l.at, l.name, l.school, l.role, l.city, l.phone, l.q1, l.q2, l.q3, l.optIn, l.source, l.stage])]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })); a.download = `didac-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle eyebrow="Team only" title="Booth leads & funnel" sub="Visitors → qualified conversations → demos → proposals → paid pilots. Works offline; stored on this device until you export." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stages.map(([l, v, t]) => <div key={l} className="card p-4"><div className="eyebrow">{l}</div><div className="text-3xl font-bold">{v}</div><div className="text-[11px] text-ink-3">{t || ' '}</div></div>)}
      </div>
      <div className="mb-4 flex flex-wrap gap-2"><Btn variant="outline" onClick={s.addVisitor}>+ Booth visitor (no form)</Btn><Btn variant="outline" onClick={exportCsv} disabled={!L.length}><Download className="size-4" /> Export CSV</Btn><Btn variant="ghost" onClick={() => confirm('Delete all leads on this device?') && s.resetLeads()}>Clear</Btn></div>
      <div className="card divide-y divide-line">
        {L.length === 0 && <p className="p-5 text-sm text-ink-3">No leads yet. Submissions from “Pilot & QR” appear here.</p>}
        {L.map((l) => (
          <div key={l.id} className="grid items-center gap-2 p-4 md:grid-cols-[1.2fr_1fr_auto]">
            <div><div className="font-semibold">{l.name} <span className="font-normal text-ink-3">· {l.role}</span></div><div className="text-sm text-ink-2">{l.school}{l.city ? `, ${l.city}` : ''}</div></div>
            <div className="text-xs text-ink-2">Pilot interest: <b>{l.q3}</b>{l.optIn && <Chip tone="ok" className="ml-2">WhatsApp OK</Chip>}<div className="mt-0.5 text-ink-3">{l.q1}</div></div>
            <select aria-label="Stage" value={l.stage} onChange={(e) => s.setStage(l.id, e.target.value as typeof l.stage)} className="h-10 rounded-xl border border-line bg-white px-2 text-sm">{['new', 'qualified', 'demo', 'proposal', 'paid'].map((x) => <option key={x}>{x}</option>)}</select>
          </div>))}
      </div>
    </section>
  )
}
