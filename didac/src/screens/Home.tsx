import { ArrowRight, Play, FileSearch, FolderSync, ShieldCheck } from 'lucide-react'
import { Btn, Chip, PhotoView } from '../ui'
import { PHOTOS0, STUDENTS0 } from '../data'
import { go } from '../nav'

export function Home() {
  return (
    <div>
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-[1.1fr_.9fr] md:py-16">
          <div className="pop">
            <Chip tone="gold" className="mb-4">DPDPA for Schools · MediaGuard (working name)</Chip>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">Consent-driven school media management</h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">Parent permissions, controlled sharing, accountable records.</p>
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gold">One question</div>
              <p className="mt-1 text-lg font-semibold leading-snug">Who verifies a child’s media permissions before your school publishes Annual Day or sports-event photographs?</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn variant="gold" onClick={() => go('demo')}>See it in 2 minutes <ArrowRight className="size-4" /></Btn>
              <Btn variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => go('story')}><Play className="size-4" /> Watch the 90-second story</Btn>
              <Btn variant="ghost" className="text-white hover:bg-white/10" onClick={() => go('pilot')}>Free 15-minute assessment</Btn>
            </div>
          </div>
          <div className="relative hidden md:block">
            <PhotoView photo={PHOTOS0[0]} students={STUDENTS0.map((s, i) => (i === 1 ? { ...s, perms: { ...s.perms, public: false } } : s))} mode="admin" blurRestricted ev={undefined} className="shadow-2xl ring-1 ring-white/20" />
            <div className="absolute -bottom-4 left-4 right-4 rounded-xl bg-white p-3 text-sm text-ink shadow-xl"><b>Public use blocked.</b> One guardian chose “private parent album only.” <span className="text-ink-3">Prototype · synthetic data</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="eyebrow mb-2">The gap, in three steps</div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [FileSearch, 'Media is a gap in DPDP readiness', 'Student photos are among the most visible personal data a school handles, and the easiest to send to a website, Instagram or a parent group.'],
            [FolderSync, 'Everyday tools don’t check permissions', 'WhatsApp and Google Drive move files — they don’t know what each guardian allowed. Permissions sit in a form or spreadsheet, apart from the photos.'],
            [ShieldCheck, 'We run the workflow, within clear limits', 'Check permissions, review exceptions, control managed sharing and keep an evidence trail. We can’t recall copies that leave the workflow — and we say so.'],
          ].map(([Icon, t, b], i) => { const I = Icon as typeof FileSearch; return (
            <div key={i} className="card p-5">
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-gold-50 text-gold"><I className="size-5" /></div>
              <div className="text-xs font-bold text-ink-3">0{i + 1}</div>
              <div className="mt-1 font-bold">{t as string}</div>
              <p className="mt-1 text-sm text-ink-2">{b as string}</p>
            </div>) })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/40 bg-gold-50 p-4 text-sm"><Chip tone="gold">Timing</Chip><span className="font-semibold text-ink">Schools should prepare ahead of the main DPDP provisions scheduled to take effect on 13 May 2027.</span><button type="button" onClick={() => go('law')} className="font-bold text-gold underline">See the DPDP map</button></div>
        <div className="mt-4 card flex flex-wrap items-center justify-between gap-4 p-5">
          <div><div className="font-bold">What you’ll see</div><p className="text-sm text-ink-2">A prototype with synthetic children: school gallery, parent app on a phone, admin console on a laptop, photo activity trail, and an honest comparison.</p></div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => go('onepager')}>One-pager</Btn><Btn variant="outline" onClick={() => go('law')}>DPDP Act map</Btn><Btn variant="outline" onClick={() => go('faq')}>FAQs</Btn>
          </div>
        </div>
      </section>
    </div>
  )
}
