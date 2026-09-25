import { PageHeader, Card, Chip, Button } from '@/design/ui'
import { LEGAL } from '@/data/reference'
import { Check, X, Scale, CalendarClock, ShieldCheck, Users, Camera, BookOpen } from 'lucide-react'

const DO = [
  { t: 'Tell parents clearly', d: 'A short notice, in English or Hindi, of what data you collect and why.' },
  { t: 'Get verified parent consent', d: 'For children, a verified parent must agree to uses beyond core schooling, such as photos on Instagram.' },
  { t: 'Let parents change their mind', d: 'Withdrawing must be as easy as agreeing, and you must then stop that use.' },
  { t: 'Keep data safe', d: 'Reasonable security: access control, logs, backups, and contracts with vendors.' },
  { t: 'Report breaches', d: 'Tell affected parents and the Data Protection Board; detailed report within 72 hours.' },
  { t: 'Answer parent requests', d: 'Access, correction, deletion and complaints, within set timelines.' },
  { t: 'Delete when done', d: 'Don’t keep data longer than needed, unless another law requires it.' },
  { t: 'Name a privacy contact', d: 'Someone parents can reach with privacy questions.' },
]

const EXEMPT = [
  { t: 'Attendance, academics & behaviour tracking for education', ok: true },
  { t: 'Campus CCTV for child safety', ok: true },
  { t: 'Bus location tracking during travel', ok: true },
  { t: 'Photos on social media, website or brochures', ok: false },
  { t: 'Paid advertising using children', ok: false },
  { t: 'Sharing data with EdTech apps for their own use', ok: false },
]

const PENALTIES = [
  { amt: '₹250 crore', t: 'Failing to keep data reasonably secure' },
  { amt: '₹200 crore', t: 'Not reporting a breach to parents and the Board' },
  { amt: '₹200 crore', t: 'Breaking the extra rules for children’s data' },
  { amt: '₹50 crore', t: 'Other breaches of the Act' },
]

const GLOSSARY = [
  ['DPDP Act', 'Digital Personal Data Protection Act, 2023: India’s data protection law. Its Rules were notified in November 2025.'],
  ['Data Fiduciary', 'The organisation that decides how data is used. Here, that is your school.'],
  ['Data Principal', 'The person the data is about. For a child, the parent acts for them.'],
  ['Consent', 'A parent’s clear, specific “yes” to a particular use. It can be withdrawn at any time.'],
  ['Verifiable parental consent', 'Confirming the person consenting really is the child’s parent, e.g. matched to admission records.'],
  ['Data Processor', 'A vendor handling data for the school: ERP, bus app, photographer, CCTV company.'],
  ['Data Protection Board', 'The government body that receives breach reports and handles complaints and penalties.'],
  ['Privacy contact', 'The person parents contact about privacy. Every school needs one.'],
  ['DPO', 'Data Protection Officer. Legally required only if a school is notified as a Significant Data Fiduciary.'],
  ['Significant Data Fiduciary (SDF)', 'A class the government may notify for extra duties: DPO, independent audit and annual DPIA. Ordinary schools are not notified today.'],
  ['Purpose', 'The reason data is used, e.g. “yearbook” or “Instagram”. Consent is given per purpose.'],
  ['Personal data breach', 'Any unauthorised access, loss or disclosure, e.g. a lost laptop or a wrong email.'],
]

export default function Guide() {
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="For school owners" title="DPDP in 2 minutes" subtitle="What India’s data protection law asks of your school, in plain words, and what School DPDP OS does about it." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Scale className="size-6 text-azure" />
          <div className="mt-3 font-semibold">What it is</div>
          <p className="mt-1 text-sm text-ink-2">A law protecting everyone’s personal data. Schools hold a lot of it: names, marks, health notes, photos, bus locations.</p>
        </Card>
        <Card className="p-5">
          <Users className="size-6 text-azure" />
          <div className="mt-3 font-semibold">Why schools feel it most</div>
          <p className="mt-1 text-sm text-ink-2">Almost all your data is about children, and children get extra protection, including verified parent consent.</p>
        </Card>
        <Card className="p-5">
          <CalendarClock className="size-6 text-azure" />
          <div className="mt-3 font-semibold">When</div>
          <p className="mt-1 text-sm text-ink-2">Rules notified 13 Nov 2025. Full obligations apply from <b>{LEGAL.fullObligationsLabel}</b>. Parents’ expectations apply now.</p>
        </Card>
      </div>

      <h2 className="mt-10 font-display text-[22px] font-semibold">What the law asks: 8 things</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DO.map((d, i) => (
          <Card key={d.t} className="flex gap-4 p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-azure-50 text-sm font-bold text-azure">{i + 1}</span>
            <div><div className="font-semibold">{d.t}</div><p className="mt-0.5 text-sm text-ink-2">{d.d}</p></div>
          </Card>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-ok"><ShieldCheck className="size-4" /> School DPDP OS sets up and runs all eight for you; each area appears on your Home screen.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-[20px] font-semibold">Good news: school exemptions</h2>
          <p className="mt-1 text-sm text-ink-2">The Rules exempt some everyday school activity from the extra child-tracking restrictions. You don’t need consent forms for these, just a documented purpose.</p>
          <ul className="mt-4 space-y-2.5">
            {EXEMPT.map((e) => (
              <li key={e.t} className="flex items-start gap-3 text-sm">
                {e.ok ? <Check className="mt-0.5 size-4 shrink-0 text-ok" /> : <X className="mt-0.5 size-4 shrink-0 text-risk" />}
                <span>{e.t} <span className="text-ink-3">{e.ok ? '— exempt' : '— needs parent consent'}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-sunken p-3 text-sm text-ink-2"><Camera className="size-4 shrink-0 text-azure" /> <span>Photos and marketing are <b>not</b> exempt. That’s why Media Safe matters.</span></p>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-[20px] font-semibold">What’s at stake</h2>
          <p className="mt-1 text-sm text-ink-2">Maximum penalties per breach under the Act. Reputation with parents usually matters more.</p>
          <div className="mt-4 divide-y divide-line">
            {PENALTIES.map((p) => (
              <div key={p.t} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm">{p.t}</span><span className="whitespace-nowrap font-display text-lg font-semibold text-risk">up to {p.amt}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line p-3 text-sm text-ink-2">
            <Chip tone="azure" size="sm">Common myth</Chip>
            <p className="mt-2">“Every school must appoint a DPO.” <b>Not true.</b> A statutory DPO is needed only if a school is notified as a Significant Data Fiduciary. Every school needs a named <b>privacy contact</b>, and our Managed Privacy Desk provides one.</p>
          </div>
        </Card>
      </div>

      <h2 className="mt-10 font-display text-[22px] font-semibold">Glossary</h2>
      <Card className="mt-4 divide-y divide-line">
        {GLOSSARY.map(([t, d]) => (
          <div key={t} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[240px_1fr]">
            <div className="font-semibold">{t}</div><div className="text-sm text-ink-2">{d}</div>
          </div>
        ))}
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-6 text-white">
        <div>
          <div className="font-display text-xl font-semibold">See it working in your school</div>
          <p className="text-sm text-white/75">Start with your Home screen, then follow a photo from upload to Instagram.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" to="/home">Go to Home</Button>
          <Button to="/publish" icon={<BookOpen className="size-4" />}>Try Publish Guard</Button>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-3">{LEGAL.disclaimer}</p>
    </div>
  )
}
