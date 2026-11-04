import * as React from 'react'
import { useDemo } from '../store'
import { evaluate, PURPOSES } from '../data'
import { Chip, PhotoView, Switch, fmtD } from '../ui'
import { Zoom } from './Zoom'
import { Languages, ZoomIn } from 'lucide-react'

export function Parent() {
  const s = useDemo()
  const [zoom, setZoom] = React.useState<string | null>(null)
  React.useEffect(() => { const h = (e: Event) => setZoom((e as CustomEvent<string>).detail); window.addEventListener('open-zoom', h); return () => window.removeEventListener('open-zoom', h) }, [])
  const child = s.students.find((x) => x.id === s.childId)!
  const mine = s.photos.filter((p) => p.faces.some((f) => f.studentId === child.id))
  const last = s.audit.filter((a) => a.actor.startsWith('Guardian · ' + child.guardian) && a.action.startsWith('Permission')).slice(-1)[0]
  const hi = s.lang === 'hi'
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="rounded-[2.4rem] border-[10px] border-navy bg-paper shadow-[0_24px_60px_rgba(20,33,61,.25)]">
        <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-navy/20" />
        <div className="max-h-[680px] overflow-y-auto px-4 pb-6 pt-3">
          <div className="flex items-center justify-between"><div className="eyebrow">Parent console</div><Chip tone="gold">Prototype</Chip></div>
          <h3 className="mt-1 text-xl font-bold">{hi ? `${child.name} की फ़ोटो` : `${child.name}’s photos`}</h3>
          <div className="mt-2 flex items-center gap-2">
            <select aria-label="Child" value={child.id} onChange={(e) => s.setChild(e.target.value)} className="h-10 flex-1 rounded-xl border border-line bg-white px-2 text-sm">
              {s.students.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.guardian}</option>)}
            </select>
            <button type="button" onClick={() => s.setLang(hi ? 'en' : 'hi')} className="flex h-10 items-center gap-1 rounded-xl border border-line bg-white px-3 text-sm font-semibold"><Languages className="size-4" />{hi ? 'EN' : 'हिन्दी'}</button>
          </div>
          <p className="mt-3 text-sm text-ink-2">{hi ? 'स्कूल आपके बच्चे की तस्वीरें इन उपयोगों के लिए ही इस्तेमाल करेगा, जो आप चुनेंगे।' : 'The school will use your child’s photos only for the purposes you choose below.'}</p>
          <div className="mt-3 space-y-2.5">
            {PURPOSES.map((p) => (
              <div key={p.key} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3">
                <div className="min-w-0 flex-1"><div className={`text-sm font-bold ${hi ? 'leading-relaxed' : ''}`}>{hi ? p.labelHi : p.label}</div><div className="text-xs text-ink-3">{p.example}</div></div>
                <Switch checked={child.perms[p.key]} onChange={(v) => s.setPerm(child.id, p.key, v)} label={p.label} />
              </div>))}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Notice v1.2 · {last ? `Last change ${fmtD(last.t)}` : 'No changes yet'} · You can change this any time; it is as easy to withdraw as to give. Copies already shared outside the school can’t be recalled.</p>
          <div className="mt-4 eyebrow">{hi ? 'आपके बच्चे की तस्वीरें' : 'Photos with your child'}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {mine.map((p) => { const e = evaluate(p, s.students, !!s.published[p.id]); return (
              <button key={p.id} type="button" onClick={() => { s.openPhoto(p.id); setZoom(p.id) }} className="relative text-left">
                <PhotoView photo={p} students={s.students} mode="parent" highlightId={child.id} />
                <span className="absolute bottom-1 left-1 rounded-md bg-navy/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">{e.people.filter(Boolean).length > 1 ? 'Other children blurred' : 'Only your child'}</span>
                <ZoomIn className="absolute right-1.5 top-1.5 size-4 text-white drop-shadow" />
              </button>) })}
            {mine.length === 0 && <p className="col-span-2 text-sm text-ink-3">No photos yet.</p>}
          </div>
        </div>
      </div>
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
