import { ChevronDown, Check } from 'lucide-react'
import { FAQS, LEGAL_MAP, TIMELINE, type Status } from '../data'
import { Chip, SectionTitle } from '../ui'

const tone: Record<Status, 'ok' | 'info' | 'gold' | 'muted'> = { Prototype: 'gold', Planned: 'info', Service: 'ok', 'Not offered': 'muted' }

export function Law() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle eyebrow="Knowledge about DPDPA" title="MediaGuard × the DPDP Act" sub="How each school-media control maps to the Act. A working interpretation, not legal advice. Wording is pending review by Indian data-protection counsel; confirm for your school." />
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {TIMELINE.map((t, i) => (
          <div key={t.date} className="card p-4"><Chip tone={i === 0 ? 'ok' : 'gold'}>{i === 0 ? 'In force' : 'Scheduled'}</Chip><div className="mt-2 text-xl font-bold">{t.date}</div><div className="font-semibold">{t.title}</div><p className="mt-1 text-sm text-ink-2">{t.body}</p></div>))}
      </div>
      <p className="mb-4 rounded-xl bg-gold-50 p-3 text-sm font-semibold">Schools should prepare ahead of the major provisions scheduled to take effect in May 2027. Not every obligation is in force today.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="bg-sand text-left text-xs text-ink-3"><th className="p-3">Provision</th><th className="p-3">Topic</th><th className="p-3">What the product does</th><th className="p-3">Status</th></tr></thead>
          <tbody>{LEGAL_MAP.map((r) => (
            <tr key={r.ref} className="border-t border-line align-top"><td className="p-3 font-mono text-xs">{r.ref}</td><td className="p-3 font-semibold">{r.topic}</td><td className="p-3 text-ink-2">{r.control}</td><td className="p-3"><Chip tone={tone[r.status]}>{r.status}</Chip></td></tr>))}</tbody>
      </table></div>
      <p className="mt-3 max-w-3xl text-xs text-ink-3">Prototype = shown in this demo with synthetic data. Planned = designed, not built. Service = advisory work with qualified partners. Not offered = we do not claim it. Sources: DPDP Act 2023; commencement notification G.S.R. 843(E); DPDP Rules 2025.</p>
    </section>
  )
}

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle eyebrow="FAQs" title="What school owners ask us" sub="Plain answers, including where our limits are." />
      <div className="space-y-2">
        {FAQS.map((f, i) => (
          <details key={f.q} className="card group p-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">{f.q}<ChevronDown className="size-4 shrink-0 text-ink-3 transition group-open:rotate-180" /></summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.a}</p>
          </details>))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3"><Check className="size-3.5" /> This is general information, not legal advice.</p>
    </section>
  )
}
