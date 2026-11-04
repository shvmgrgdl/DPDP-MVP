import * as React from 'react'
import { Download, WifiOff } from 'lucide-react'
import { current, go, ROUTES, type Route } from './nav'
import { Home } from './screens/Home'
import { Story } from './screens/Story'
import { Demo } from './screens/Demo'
import { Law, Compare, Faq } from './screens/Info'
import { Pilot, Leads } from './screens/Pilot'

const MARK = <svg viewBox="0 0 32 32" className="size-8"><rect width="32" height="32" rx="8" fill="#c8921a" /><path d="M16 6.5l8 3v6.2c0 5-3.4 8.6-8 10.3-4.6-1.7-8-5.3-8-10.3V9.5l8-3z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12.2 16.2l2.6 2.6 5-5.2" fill="none" stroke="#14213d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function App() {
  const [route, setRoute] = React.useState<Route>(current())
  const [offline, setOffline] = React.useState(!navigator.onLine)
  const [prompt, setPrompt] = React.useState<(Event & { prompt: () => void }) | null>(null)
  React.useEffect(() => {
    const h = () => setRoute(current()), on = () => setOffline(false), off = () => setOffline(true)
    const bip = (e: Event) => { e.preventDefault(); setPrompt(e as Event & { prompt: () => void }) }
    window.addEventListener('hashchange', h); window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener('beforeinstallprompt', bip)
    return () => { window.removeEventListener('hashchange', h); window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('beforeinstallprompt', bip) }
  }, [])
  const page = { home: <Home />, story: <Story />, demo: <Demo />, law: <Law />, compare: <Compare />, faq: <Faq />, pilot: <Pilot />, leads: <Leads /> }[route]
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
          <button type="button" onClick={() => go('home')} className="flex items-center gap-2 text-left" aria-label="Home">{MARK}<span className="leading-tight"><span className="block whitespace-nowrap text-sm font-bold">DPDPA for Schools</span><span className="block whitespace-nowrap text-[11px] text-ink-3">MediaGuard demo · DIDAC 2026</span></span></button>
          <nav aria-label="Sections" className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 md:order-none md:mx-0 md:ml-auto md:w-auto md:px-0">
            {ROUTES.map((r) => <button key={r.key} type="button" onClick={() => go(r.key)} className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${route === r.key ? 'bg-navy text-white' : 'text-ink-2 hover:bg-sand'}`}>{r.label}</button>)}
          </nav>
          {prompt && <button type="button" onClick={() => prompt.prompt()} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-gold px-3 text-sm font-semibold text-white"><Download className="size-4" /> Install</button>}
        </div>
        {offline && <div className="flex items-center justify-center gap-1.5 bg-gold-50 py-1 text-xs font-semibold text-gold"><WifiOff className="size-3.5" /> Offline — the demo still works</div>}
      </header>
      <main>{page}</main>
      <footer className="no-print border-t border-line px-4 py-6 text-center text-xs text-ink-3">
        Prototype with synthetic data and a fictional school. Not legal advice, not a certification. <button type="button" className="underline" onClick={() => go('leads')}>Team</button>
      </footer>
    </div>
  )
}
