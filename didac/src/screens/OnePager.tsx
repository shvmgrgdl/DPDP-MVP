import { Printer } from 'lucide-react'
import { useDemo } from '../store'
import { Btn } from '../ui'
import { Qr, appUrl, qrFor } from './Pilot'

/** Printable leave-behind: A4, no pricing, claims limited to what the notes allow. */
export function OnePager() {
  const st = useDemo((s) => s.settings)
  return (
    <section className="mx-auto max-w-[820px] px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between"><div><div className="eyebrow">Leave-behind</div><h2 className="text-xl font-bold">One-page summary</h2></div><Btn variant="gold" onClick={() => window.print()}><Printer className="size-4" /> Print / save as PDF</Btn></div>
      <style>{`@media print{@page{size:A4;margin:12mm}body{background:#fff}}`}</style>
      <article className="rounded-2xl border border-line bg-white p-8 text-[13px] leading-relaxed print:rounded-none print:border-0 print:p-0">
        <header className="flex items-center justify-between border-b-2 border-gold pb-3"><div><div className="text-lg font-bold">DPDPA for Schools</div><div className="text-xs text-ink-3">MediaGuard (working name) · {st.eventTag}</div></div><div className="rounded-full bg-gold-50 px-3 py-1 text-[11px] font-bold text-gold">Prototype · synthetic data</div></header>
        <h1 className="mt-4 text-3xl font-bold leading-tight">Consent-driven school media management</h1>
        <p className="text-ink-2">Parent permissions, controlled sharing, accountable records.</p>
        <p className="mt-3 rounded-xl bg-sand p-3 font-semibold">Who verifies a child’s media permissions before your school publishes Annual Day or sports-event photographs?</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[['The gap', 'Student photos are where permissions get tested. Permissions sit in a form or spreadsheet; photos sit in Drive and WhatsApp. Nothing checks one against the other when a photo is shared.'], ['The workflow', 'Parents sign in with a school-issued ID — we hold no names or phone numbers — and choose purpose by purpose. Each face is checked; unknown faces go to a person. Only approved photos are shared. Every decision is recorded.'], ['The timing', 'Schools should prepare ahead of the main DPDP provisions scheduled to take effect on 13 May 2027.']].map(([h, b]) => <div key={h} className="rounded-xl border border-line p-3"><div className="mb-1 font-bold">{h}</div><p className="text-ink-2">{b}</p></div>)}
        </div>
        <div className="mt-4"><div className="mb-1.5 font-bold">From school event to evidence</div><ol className="grid grid-cols-5 gap-2 text-center text-[11px] font-semibold">{['School event', 'Parent permission', 'School review', 'Controlled sharing', 'Evidence'].map((t, i) => <li key={t} className="rounded-lg bg-navy px-1 py-2 text-white"><span className="text-gold">{i + 1}</span><br />{t}</li>)}</ol></div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-5">
          <div>
            <div className="font-bold">Start free, scope small</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2"><li><b>Free 15-minute workflow assessment</b> and a walkthrough with synthetic data.</li><li><b>Bounded remote pilot</b> around one event, with a named school owner and fixed dates. Real data only after your lawful-basis, safeguarding and processor review.</li></ul>
            <div className="mt-3 font-bold">What we don’t claim</div>
            <p className="text-ink-2">This is not a compliance certificate or legal advice. We can restrict links and exports in the managed workflow; we can’t recall screenshots or copies that leave it. Face matching needs legal review and human fallback.</p>
            <div className="mt-3 text-ink-2">{st.contactEmail || st.contactPhone ? <>Contact: {[st.contactEmail, st.contactPhone].filter(Boolean).join(' · ')}</> : <>Contact: dpdpaforschools.in</>}</div>
          </div>
          <div className="text-center"><Qr value={qrFor(st.waNumber, st.eventTag, 'Principal')} size={130} /><div className="mt-1 max-w-[140px] text-[10px] text-ink-3">{st.waNumber ? 'Scan to WhatsApp us' : 'Scan to open the demo'}<br />{!st.waNumber && appUrl()}</div></div>
        </div>
      </article>
    </section>
  )
}
