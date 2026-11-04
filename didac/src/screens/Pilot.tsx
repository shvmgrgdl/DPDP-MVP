import * as React from 'react'
import QRCode from 'qrcode'
import { Check, MessageCircle, CalendarCheck, FlaskConical, ClipboardList, Rocket, FileCheck2, X } from 'lucide-react'
import { useDemo } from '../store'
import { waLink } from '../config'
import { Btn, Chip, SectionTitle } from '../ui'

const field = 'h-11 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 text-sm'

export function Qr({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = React.useState('')
  React.useEffect(() => { QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#14213d', light: '#ffffff' } }).then(setSrc).catch(() => setSrc('')) }, [value, size])
  return src ? <img src={src} alt="QR code" width={size} height={size} className="rounded-xl border border-line bg-white p-2" /> : <div style={{ width: size, height: size }} className="rounded-xl bg-sand" />
}
export const appUrl = () => (typeof location !== 'undefined' ? location.href.split('#')[0].split('?')[0] : '')
export const qrFor = (number: string, tag: string, role: string) => number ? waLink(`Hi! I'm a ${role} at my school. I saw DPDPA for Schools MediaGuard at ${tag} — please send me the demo. [${tag}]`, number) : appUrl()

export function Pilot() {
  const add = useDemo((s) => s.addLead)
  const { waNumber, eventTag } = useDemo((s) => s.settings)
  const [done, setDone] = React.useState<{ phone: string; optIn: boolean; name: string } | null>(null)
  const [f, setF] = React.useState({ name: '', school: '', role: '', city: '', phone: '', q1: '', q2: '', q3: '' as 'yes' | 'maybe' | 'no' | '', optIn: false })
  const [role, setRole] = React.useState('Principal')
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const ok = f.name && f.school && f.role && f.q3
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle eyebrow="Next step" title="Start with a free 15-minute workflow assessment" sub="We map how photos and permissions move at your school today, then walk you through the prototype with synthetic data. No real student data is needed." />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="card p-5"><div className="mb-2 flex items-center gap-2 font-bold"><CalendarCheck className="size-5 text-gold" /> Free: 15-minute assessment</div><ul className="space-y-1.5 text-sm text-ink-2">{['Your current photo approval path, in your words', 'A synthetic walkthrough of the group-photo conflict', 'A short written note of gaps and next steps'].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{t}</li>)}</ul></div>
        <div className="card p-5"><div className="mb-2 flex items-center gap-2 font-bold"><FlaskConical className="size-5 text-gold" /> Then: a bounded remote pilot</div><p className="text-sm text-ink-2">One real event, a named school owner, fixed dates and success measures. Real data only after your lawful-basis, safeguarding and processor review and a signed scope. We quote the pilot after the assessment.</p></div>
      </div>

      <div className="mb-8">
        <div className="eyebrow mb-3">How a pilot works</div>
        <ol className="grid gap-3 md:grid-cols-4">
          {[[ClipboardList, 'Assess', 'Map today’s photo and permission flow with your admin owner.'], [Rocket, 'Set up one event', 'Roster import by the school, login slips, notice, guardian onboarding, photographer access.'], [FileCheck2, 'Run it', 'Parents choose, faces are reviewed, only approved photos are shared.'], [Check, 'Decide', 'Evidence report, review effort and what you saw — then you choose what next.']].map(([I, t, b], i) => { const Icon = I as typeof Check; return <li key={t as string} className="card p-4"><div className="mb-2 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-gold-50 text-xs font-bold text-gold">{i + 1}</span><Icon className="size-4 text-gold" /></div><div className="font-bold">{t as string}</div><p className="mt-1 text-sm text-ink-2">{b as string}</p></li> })}
        </ol>
        <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-sand p-4 text-sm md:grid-cols-2">
          <div><div className="mb-1 font-bold">What it is</div><p className="text-ink-2">A scoped workflow for school photos: permissions checked before managed sharing, exceptions reviewed by a person, decisions recorded.</p></div>
          <div><div className="mb-1 flex items-center gap-1 font-bold"><X className="size-4 text-risk" /> What it is not</div><p className="text-ink-2">Not a compliance certificate or legal advice. It can’t recall copies that leave the managed workflow, and it doesn’t cover CCTV, ERP or school-wide compliance.</p></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); if (!ok) return; add({ ...f, source: eventTag, q3: f.q3 }); setDone({ phone: f.phone, optIn: f.optIn, name: f.name }); setF({ name: '', school: '', role: '', city: '', phone: '', q1: '', q2: '', q3: '', optIn: false }) }}>
          <div className="flex items-center justify-between"><div className="text-lg font-bold">Book your assessment</div><Chip tone="gold">{eventTag}</Chip></div>
          {done ? (
            <div className="rounded-xl bg-ok-bg p-4 text-sm text-ok"><b>Thank you, {done.name}.</b> We’ll be in touch to fix a time.
              {done.optIn && done.phone && <div className="mt-3"><a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ok px-4 font-semibold text-white" target="_blank" rel="noreferrer" href={waLink(`Hello from DPDPA for Schools (${eventTag}). Here is the 90-second MediaGuard story and a link to book your free 15-minute workflow assessment: ${appUrl()}#/story`, done.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1'))}><MessageCircle className="size-4" /> Send my demo on WhatsApp</a></div>}
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
            <p className="text-[11px] text-ink-3">Used only to follow up on this request. Stored on this device until the team exports it.</p>
          </>)}
        </form>

        <div className="card space-y-3 p-5 text-center">
          <div className="eyebrow">Booth QR · WhatsApp opt-in</div>
          <div className="flex justify-center"><Qr value={qrFor(waNumber, eventTag, role)} /></div>
          <div className="flex flex-wrap justify-center gap-1.5">{['Principal', 'School owner', 'Administrator', 'Teacher'].map((r) => <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${role === r ? 'bg-navy text-white' : 'bg-sand text-ink-2'}`}>{r}</button>)}</div>
          <p className="text-sm text-ink-2">{waNumber ? `Scan to open WhatsApp with a ready message tagged ${eventTag} and the role you pick.` : 'No WhatsApp number set yet — this QR opens the app. Add the number in Team → Settings.'}</p>
          <p className="text-[11px] text-ink-3">The visitor taps Send themselves — that is their opt-in. Automatic replies need a WhatsApp Business account, set up outside this app.</p>
        </div>
      </div>
    </section>
  )
}
