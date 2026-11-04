import * as React from 'react'
import { Camera, Check, Lock, Loader2, ScanFace, Users, ShieldAlert } from 'lucide-react'
import { useDemo } from '../store'
import { Chip } from '../ui'
import { PhoneShell } from './PhoneShell'

const STAGES = ['Uploading to the event workspace', 'Detecting faces', 'Matching to the roster', 'Holding unmatched faces for review']
export function PhotographerApp() {
  const s = useDemo()
  const [run, setRun] = React.useState(-1)
  const done = s.photos.some((p) => p.id === 'P4')
  React.useEffect(() => { s.setViewer('gallery') }, [])
  React.useEffect(() => {
    if (run < 0 || run >= STAGES.length) return
    const id = setTimeout(() => { if (run === STAGES.length - 1) s.upload(); setRun(run + 1) }, 1100)
    return () => clearTimeout(id)
  }, [run])
  return (
    <PhoneShell>
      <header className="bg-navy px-4 py-4 text-white"><div className="text-[11px] font-bold uppercase tracking-widest text-gold">Photographer · Studio Lens</div><div className="text-lg font-bold">Annual Day · Sunrise Public School</div></header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="card flex items-start gap-3 p-3.5"><Lock className="mt-0.5 size-5 text-gold" /><div className="text-sm"><b>Event-limited access</b><div className="text-xs text-ink-2">You can upload to this event only. Access expires 14 Nov. You cannot see guardian choices or the student roster.</div></div></div>
        <div className="eyebrow">Camera roll · 1 new batch</div>
        <div className="grid grid-cols-3 gap-2">{['media/annual-day-15.jpg', 'media/annual-day-03.jpg', 'media/annual-day-12.jpg'].map((src, i) => <div key={src} className="relative aspect-square overflow-hidden rounded-xl"><img src={src} alt="" className="size-full object-cover" />{i === 0 && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-gold text-white"><Check className="size-3" /></span>}</div>)}</div>
        <button type="button" disabled={run >= 0 || done} onClick={() => setRun(0)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-[15px] font-bold text-white disabled:opacity-40"><Camera className="size-5" />{done ? 'Uploaded' : 'Upload 1 selected photo'}</button>
        {run >= 0 && <div className="card space-y-2.5 p-3.5">{STAGES.map((l, i) => <div key={l} className="flex items-center gap-2.5 text-sm">{i < run || done ? <Check className="size-4 text-ok" /> : i === run ? <Loader2 className="size-4 animate-spin text-gold" /> : <span className="size-4 rounded-full border border-line" />}<span className={i > run && !done ? 'text-ink-3' : ''}>{l}</span></div>)}</div>}
        {done && <div className="pop rounded-2xl bg-warn-bg p-3.5 text-sm text-warn"><div className="flex items-center gap-2 font-bold"><ScanFace className="size-4" />1 face needs review</div><div className="text-xs">The school’s admin will decide who it is. Nothing is posted until then.</div></div>}
        <div className="grid grid-cols-2 gap-2 text-xs"><div className="card p-3"><Users className="mb-1 size-4 text-gold" /><b>{s.photos.length} photos</b><div className="text-ink-3">in this event</div></div><div className="card p-3"><ShieldAlert className="mb-1 size-4 text-gold" /><b>Local copies</b><div className="text-ink-3">delete from your phone after upload</div></div></div>
        <button type="button" onClick={() => s.setRole(null)} className="min-h-11 w-full text-sm font-semibold text-ink-2">Switch app</button>
        <div className="text-center"><Chip tone="gold">Prototype · synthetic data</Chip></div>
      </div>
    </PhoneShell>
  )
}
