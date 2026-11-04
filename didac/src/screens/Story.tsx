import * as React from 'react'
import { Play, Pause, RotateCcw, Repeat, Check, X, Lock, Download } from 'lucide-react'
import { Btn, Chip, PhotoView, SectionTitle, Switch, ProtoTag } from '../ui'
import { PHOTOS0, STUDENTS0 } from '../data'
import { go } from '../nav'

const SCENE = 15
const SCENES = [
  { title: 'School event', line: 'Annual Day. Hundreds of photos in one afternoon, from staff and a photographer.' },
  { title: 'Parent permission', line: 'Each guardian signs in with a school-issued ID — no name or phone number — and chooses, purpose by purpose: private album, inside school, website and social.' },
  { title: 'School review', line: 'Before anything goes public, every face is checked. One restricted child blocks the photo; an unknown face goes to a person.' },
  { title: 'Controlled sharing', line: 'Approved photos are released. Everything else stays in the private parent album, where each parent sees only their child.' },
  { title: 'Protected & traceable', line: 'Photos and records are encrypted. Every photo on screen carries the viewer’s ID and the live time, so a leaked copy can be traced.' },
  { title: 'Evidence', line: 'Every choice, review and approval is recorded in order — so the school can show what was decided and why.' },
]
const diyaOff = STUDENTS0.map((s) => (s.id === 'S2' ? { ...s, perms: { ...s.perms, public: false } } : s))

function Scene({ i }: { i: number }) {
  if (i === 0) return (
    <div className="grid size-full place-items-center bg-navy p-4"><div className="relative w-full max-w-2xl overflow-hidden rounded-2xl"><div style={{ animation: 'kb 15s ease-out both' }}><PhotoView photo={PHOTOS0[0]} students={STUDENTS0} /></div>
      <div className="pop absolute bottom-3 left-3 flex gap-2"><Chip tone="gold">3 photos in this demo</Chip><Chip tone="muted">…hundreds in real life</Chip></div></div></div>)
  if (i === 1) return (
    <div className="grid size-full place-items-center bg-navy p-4"><div className="pop w-64 rounded-[2rem] border-8 border-white/20 bg-paper p-3 text-ink">
      <div className="eyebrow">Guardian G-••••</div>
      {['Private parent album', 'Inside school', 'Website & social media'].map((l, k) => (
        <div key={l} className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2.5 text-sm font-semibold">{l}<Switch checked={k < 1} onChange={() => {}} label={l} /></div>))}
      <div className="pop mt-2 rounded-lg bg-gold-50 p-2 text-xs font-semibold text-gold" style={{ animationDelay: '4s' }}>Saved with notice version and time</div></div></div>)
  if (i === 2) return (
    <div className="grid size-full place-items-center bg-navy p-4"><div className="relative w-full max-w-2xl">
      <PhotoView photo={PHOTOS0[0]} students={diyaOff} mode="admin" blurRestricted />
      <div className="pop absolute bottom-3 left-3 right-3 flex flex-wrap gap-2" style={{ animationDelay: '3s' }}><Chip tone="risk"><X className="size-3" /> D••a: private album only</Chip><Chip tone="warn">1 unknown face → human review</Chip></div></div></div>)
  if (i === 3) return (
    <div className="grid size-full place-items-center bg-navy p-4"><div className="grid w-full max-w-2xl grid-cols-3 gap-3">
      {[[PHOTOS0[1], 'Public · approved', 'ok'], [PHOTOS0[2], 'Parent album only', 'muted'], [PHOTOS0[0], 'Held for review', 'warn']].map(([p, l, t], k) => (
        <div key={k} className="pop" style={{ animationDelay: `${k * 1.5}s` }}><PhotoView photo={p as typeof PHOTOS0[0]} students={diyaOff} /><div className="mt-1.5"><Chip tone={t as 'ok'}>{t === 'ok' ? <Check className="size-3" /> : <Lock className="size-3" />}{l as string}</Chip></div></div>))}
    </div></div>)
  if (i === 4) return (
    <div className="grid size-full place-items-center bg-navy p-4"><div className="relative w-full max-w-2xl">
      <PhotoView photo={PHOTOS0[1]} students={STUDENTS0} />
      <div className="pop absolute left-3 top-3 flex gap-2" style={{ animationDelay: '1s' }}><Chip tone="ok"><Lock className="size-3" /> AES-256 encrypted</Chip><Chip tone="muted">TLS in transit</Chip></div>
      <div className="pop absolute bottom-3 left-3 right-3 flex flex-wrap gap-2" style={{ animationDelay: '4s' }}><Chip tone="gold">Viewer ID · time · trace ID on every photo</Chip><Chip tone="muted">Every view logged</Chip></div></div></div>)
  return (
    <div className="grid size-full place-items-center bg-navy p-6 text-white"><div className="w-full max-w-md space-y-2">
      {['A guardian withdrew public use', 'Face 4 reviewed: not a student', 'Choir photo approved for website', 'Parent opened their child’s album'].map((t, k) => (
        <div key={t} className="pop rounded-xl border border-white/15 bg-white/5 p-3 text-sm" style={{ animationDelay: `${k * 1.2}s` }}><span className="font-mono text-[10px] text-gold">#{k + 3} · {['9c41ab07', 'e2d85f13', '4b7a60cd', 'a03e91f8'][k]}…</span><div>{t}</div></div>))}
      <div className="pop pt-3 text-center" style={{ animationDelay: '7s' }}><div className="text-lg font-bold">Free 15-minute workflow assessment</div><div className="text-xs text-white/70">We can’t recall copies that leave the managed workflow — and we say so.</div></div></div></div>)
}

export function Story({ bare = false }: { bare?: boolean }) {
  const [t, setT] = React.useState(0)
  const [playing, setPlaying] = React.useState(bare)
  const [loop, setLoop] = React.useState(!bare)
  const total = SCENE * SCENES.length
  React.useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT((x) => { const n = x + 0.1; if (n >= total) { if (loop) return 0; setPlaying(false); return total - 0.1 } return n }), 100)
    return () => clearInterval(id)
  }, [playing, loop, total])
  const scene = Math.min(SCENES.length - 1, Math.floor(t / SCENE))
  if (bare) return (
    <div className="relative h-dvh w-screen overflow-hidden bg-navy"><style>{`@keyframes kb{from{transform:scale(1)}to{transform:scale(1.08)}}`}</style><div key={scene} className="absolute inset-0"><Scene i={scene} /></div><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/80 to-transparent p-8 pt-16 text-white"><div className="text-sm font-bold uppercase tracking-widest text-gold">Scene {scene + 1} · {SCENES[scene].title}</div><p className="mt-1 max-w-3xl text-xl">{SCENES[scene].line}</p></div><div className="absolute left-4 top-4"><ProtoTag /></div><div className="absolute inset-x-0 bottom-0 flex gap-1 p-0">{SCENES.map((x, i) => <span key={x.title} className="h-1 flex-1 bg-white/10"><span className="block h-full bg-gold" style={{ width: `${i < scene ? 100 : i === scene ? ((t - i * SCENE) / SCENE) * 100 : 0}%` }} /></span>)}</div></div>
  )
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <SectionTitle eyebrow="Explainer · 90 seconds" title="From school event to evidence" sub="Five scenes: school event → parent permission → school review → controlled sharing → evidence. Plays on loop at the booth." />
      <div className="card overflow-hidden">
        <div className="relative aspect-video w-full overflow-hidden bg-navy">
          <style>{`@keyframes kb{from{transform:scale(1)}to{transform:scale(1.08)}}`}</style>
          <div key={scene} className="absolute inset-0"><Scene i={scene} /></div>
          <div className="absolute left-3 top-3"><ProtoTag /></div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/80 to-transparent p-4 pt-10 text-white"><div className="text-[11px] font-bold uppercase tracking-widest text-gold">Scene {scene + 1} · {SCENES[scene].title}</div><p className="mt-1 max-w-2xl text-sm md:text-base">{SCENES[scene].line}</p></div>
          {!playing && <button type="button" onClick={() => setPlaying(true)} aria-label="Play story" className="absolute inset-0 grid place-items-center bg-navy/50"><span className="grid size-20 place-items-center rounded-full bg-gold text-white shadow-xl"><Play className="size-9 translate-x-0.5" /></span></button>}
        </div>
        <div className="flex items-center gap-3 p-3">
          <Btn variant="outline" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</Btn>
          <Btn variant="ghost" onClick={() => { setT(0); setPlaying(true) }} aria-label="Restart"><RotateCcw className="size-4" /></Btn>
          <div className="flex flex-1 gap-1.5">{SCENES.map((s, i) => (
            <button key={s.title} type="button" aria-label={s.title} onClick={() => setT(i * SCENE)} className="h-2 flex-1 overflow-hidden rounded-full bg-sand"><span className="block h-full bg-gold" style={{ width: `${i < scene ? 100 : i === scene ? ((t - i * SCENE) / SCENE) * 100 : 0}%` }} /></button>))}</div>
          <button type="button" onClick={() => setLoop(!loop)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${loop ? 'bg-gold-50 text-gold' : 'text-ink-3'}`}><Repeat className="size-3.5" /> Loop</button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><a href="video/mediaguard-explainer.mp4" download className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d6cdb8] bg-white px-4 text-sm font-semibold"><Download className="size-4" /> Download the video (MP4)</a><Btn variant="gold" onClick={() => go('demo')}>Try it yourself</Btn></div>
    </section>
  )
}
