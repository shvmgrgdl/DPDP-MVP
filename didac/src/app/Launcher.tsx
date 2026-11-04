import * as React from 'react'
import { Smartphone, LayoutDashboard, Camera, Presentation, ChevronRight, Images, Play, RotateCcw, Download, Share } from 'lucide-react'
import { useDemo, type AppRole } from '../store'
import { go } from '../nav'
import { Chip } from '../ui'

const MARK = <svg viewBox="0 0 32 32" className="size-20"><rect width="32" height="32" rx="8" fill="#c8921a" /><path d="M16 6.5l8 3v6.2c0 5-3.4 8.6-8 10.3-4.6-1.7-8-5.3-8-10.3V9.5l8-3z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12.2 16.2l2.6 2.6 5-5.2" fill="none" stroke="#14213d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>

export function Launcher() {
  const setRole = useDemo((s) => s.setRole)
  const [splash, setSplash] = React.useState(!sessionStorage.getItem('splashed'))
  React.useEffect(() => { if (!splash) return; const t = setTimeout(() => { sessionStorage.setItem('splashed', '1'); setSplash(false) }, 1500); return () => clearTimeout(t) }, [splash])
  const [prompt, setPrompt] = React.useState<(Event & { prompt: () => void }) | null>(null)
  React.useEffect(() => { const h = (e: Event) => { e.preventDefault(); setPrompt(e as Event & { prompt: () => void }) }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h) }, [])
  const ios = /iphone|ipad/i.test(navigator.userAgent) && !(navigator as unknown as { standalone?: boolean }).standalone
  if (splash) return <div className="grid min-h-dvh place-items-center bg-navy text-white"><div className="pop flex flex-col items-center text-center">{MARK}<h1 className="mt-5 text-2xl font-bold">DPDPA for Schools</h1><p className="mt-1 text-sm text-white/60">MediaGuard</p></div></div>
  const tiles: [AppRole, string, string, React.ReactNode][] = [
    ['parent', 'Parent app', 'Sign in with a school-issued ID, read the notice, set choices, see your child’s photos', <Smartphone key="a" className="size-6" />],
    ['admin', 'School admin', 'Review queue, permissions, requests, evidence', <LayoutDashboard key="b" className="size-6" />],
    ['gallery', 'School gallery', 'The web app: private gallery and the public website preview', <Images key="g" className="size-6" />],
    ['photographer', 'Photographer', 'Event-limited upload with face matching', <Camera key="c" className="size-6" />],
    ['booth', 'Booth kit', 'Pitch, 90-second story, DPDP map, comparison, FAQs, pilot & QR', <Presentation key="d" className="size-6" />],
  ]
  return (
    <div className="min-h-dvh bg-navy px-5 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3"><div className="size-12 shrink-0 [&>svg]:size-12">{MARK}</div><div><div className="text-lg font-bold">DPDPA for Schools</div><div className="text-xs text-white/60">MediaGuard · consent-driven school media</div></div></div>
        <h1 className="mt-8 text-3xl font-bold leading-tight">Open the app as…</h1>
        <p className="mt-1 text-sm text-white/70">One workspace, many people. Whatever a parent chooses shows up for the school instantly.</p>
        <button type="button" onClick={() => { setRole('booth'); go('demo') }} className="mt-6 flex w-full items-center gap-4 rounded-3xl bg-gold p-4 text-left text-white transition active:scale-[.99]"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Play className="size-6" /></span><span className="flex-1"><span className="block text-[17px] font-bold">Start the 3-minute guided demo</span><span className="block text-xs text-white/85">One group photo, three people, one record — step by step</span></span><ChevronRight className="size-5" /></button>
        <div className="mt-3 space-y-3">
          {tiles.map(([r, t, d, i]) => (
            <button key={t} type="button" onClick={() => { setRole(r); if (r === 'booth') go('home') }} className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[.06] p-4 text-left transition active:scale-[.99] hover:bg-white/10">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">{i}</span>
              <span className="flex-1"><span className="block text-[17px] font-bold">{t}</span><span className="block text-xs text-white/65">{d}</span></span><ChevronRight className="size-5 text-white/40" />
            </button>))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {prompt && <button type="button" onClick={() => prompt.prompt()} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-xs font-semibold"><Download className="size-4" /> Install app</button>}
          <button type="button" onClick={() => { if (confirm('Reset demo data (photos, choices, log) for the next visitor? Leads are kept.')) useDemo.getState().resetDemo() }} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-xs font-semibold"><RotateCcw className="size-4" /> Reset demo</button>
        </div>
        {ios && <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/60"><Share className="size-3.5" /> On iPhone/iPad: tap Share → Add to Home Screen</p>}
        <div className="mt-5 flex justify-center"><Chip tone="gold">Prototype · synthetic data · fictional school</Chip></div>
      </div>
    </div>
  )
}
