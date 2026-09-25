import * as React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Lightbulb, Users, ScanFace, FileCheck2, ArrowRight, BookOpen } from 'lucide-react'
import { Sheet, Dialog, Button } from '@/design/ui'
import { explainFor } from './explain'
import { useApp } from '@/store/app'

/** "About this page" — plain-language explainer for every screen. */
export function ExplainButton() {
  const { pathname } = useLocation()
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const e = explainFor(pathname)
  React.useEffect(() => setOpen(false), [pathname])
  if (!e) return null
  const rows = [
    { h: 'What you’re looking at', t: e.what },
    { h: 'Why it matters', t: e.why },
    { h: 'What you need to do', t: e.you },
  ]
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-[#f3d9a4] bg-[#fdf6e7] px-3 py-1.5 text-[13px] font-semibold text-[#8a5300] hover:bg-[#fcefd2]">
        <Lightbulb className="size-4" /> <span className="hidden sm:inline">About this page</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={e.title} description="In plain words" width={440}>
        <div className="space-y-5">
          {rows.map((r) => (
            <div key={r.h}>
              <div className="label-caps">{r.h}</div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{r.t}</p>
            </div>
          ))}
          <div className="rounded-xl bg-sunken p-4 text-sm text-ink-2">
            New to the DPDP Act?
            <Button variant="ghost" size="sm" className="mt-1 px-0" icon={<BookOpen className="size-4" />} onClick={() => { setOpen(false); navigate('/guide') }}>Read DPDP in 2 minutes</Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}

const STEPS = [
  { icon: <Users className="size-7" />, title: 'Parents choose', body: 'Each parent verifies once and chooses, purpose by purpose, how their child’s data and photos may be used, in English or Hindi.' },
  { icon: <ScanFace className="size-7" />, title: 'Every photo is checked', body: 'Before any photo or video leaves the school, each child in it is matched to their parent’s choice. Children without permission are blurred or held back.' },
  { icon: <FileCheck2 className="size-7" />, title: 'Proof for everything', body: 'Every decision is recorded and cannot be altered, so you can show parents, auditors or the Board exactly what was done.' },
]

/** First-run welcome: the whole system in 60 seconds. Reopen from "How it works" in the sidebar. */
export function Welcome() {
  const open = useApp((s) => s.welcomeOpen)
  const setUI = useApp((s) => s.setUI)
  const navigate = useNavigate()
  const close = () => setUI({ welcomeOpen: false, welcomed: true })
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setUI({ welcomeOpen: true }) : close())} wide
      title="Your school’s privacy, handled" description="School DPDP OS in 60 seconds: what it does for you under India’s Digital Personal Data Protection Act.">
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-line bg-[#fbfaf7] p-5">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-azure-50 text-azure">{s.icon}</div>
              <span className="font-display text-3xl font-semibold text-line-strong">{i + 1}</span>
            </div>
            <div className="mt-4 text-[16px] font-semibold text-ink">{s.title}</div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-navy p-5 text-white">
        <div className="font-display text-lg font-semibold">You run the school. We run the privacy operating system.</div>
        <p className="mt-1 text-sm text-white/75">Our privacy desk, lawyers and security partners work inside the same system, so you have one place and one accountable team.</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" icon={<BookOpen className="size-4" />} onClick={() => { close(); navigate('/guide') }}>DPDP in 2 minutes</Button>
        <Button icon={<ArrowRight className="size-4" />} onClick={close}>Show me my school</Button>
      </div>
    </Dialog>
  )
}
