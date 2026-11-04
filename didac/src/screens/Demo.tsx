import * as React from 'react'
import { LayoutDashboard, Smartphone, Images, RotateCcw, ChevronRight, ChevronLeft, Wand2 } from 'lucide-react'
import { useDemo, type Viewer } from '../store'
import { Btn, ProtoTag, SectionTitle } from '../ui'
import { Admin } from './Admin'
import { ParentApp } from '../app/ParentApp'
import { Gallery } from './Gallery'

interface Step { title: string; body: string; view: Viewer; photo?: string; tab?: 'queue' | 'perms' | 'evidence'; cta?: string; run?: () => void }
const g = () => useDemo.getState()
const STEPS: Step[] = [
  { title: '1 · Annual Day photos arrive', body: 'A photographer uploads the group photo. Diya’s guardian hasn’t set choices yet, so public use is blocked by default; one face is unknown.', view: 'admin', photo: 'P1', tab: 'queue' },
  { title: '2 · A guardian says “private parent album only”', body: 'In the parent app Diya’s guardian verifies, reads the notice and chooses: album yes, inside school no, website & social no. (Or tap to do it for her.)', view: 'parent', cta: 'Do it for me', run: () => { g().setChild('S2'); g().completeOnboarding('S2', { album: true, internal: false, public: false }, false, '9876543210') } },
  { title: '3 · Public publishing is blocked', body: 'The group photo includes Diya, so the gate holds it back — with the reason. Approve stays off.', view: 'admin', photo: 'P1', tab: 'queue' },
  { title: '4 · The unknown child goes to a person', body: 'Unmatched faces are never presumed consented. Click face 4 and decide: a student, or not a student.', view: 'admin', photo: 'P1', tab: 'queue', cta: 'Mark face 4 as an adult', run: () => g().assignFace('P1', 3, 'adult') },
  { title: '5 · The school approves an eligible image', body: 'The choir photo only shows Meera, whose guardian allows public use. The school approves it — decision recorded.', view: 'admin', photo: 'P2', tab: 'queue', cta: 'Approve this photo', run: () => g().approve('P2') },
  { title: '6 · Parents see only their child', body: 'Diya’s guardian sees photos with Diya. Other children are blurred. Each open is logged.', view: 'parent', cta: 'Open a photo', run: () => { g().openPhoto('P3'); window.dispatchEvent(new CustomEvent('open-zoom', { detail: 'P3' })) } },
  { title: '7 · The evidence log', body: 'Every permission, review and approval, chained so edits are detectable. Zoom any photo for who opened it and when.', view: 'admin', tab: 'evidence' },
]

export function Demo() {
  const s = useDemo()
  const [step, setStep] = React.useState(0)
  const [photo, setPhoto] = React.useState('P1')
  const st = STEPS[step]
  const go = (i: number) => {
    const n = STEPS[i]; setStep(i); s.setViewer(n.view)
    if (n.photo) setPhoto(n.photo)
    if (n.tab) setTimeout(() => window.dispatchEvent(new CustomEvent('admin-tab', { detail: n.tab })), 0)
  }
  const views: [Viewer, string, React.ReactNode][] = [['admin', 'Admin · laptop', <LayoutDashboard key="a" className="size-4" />], ['parent', 'Parent · mobile', <Smartphone key="b" className="size-4" />], ['gallery', 'School gallery', <Images key="c" className="size-4" />]]
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow="Live demo · 2–3 minutes" title="One group photo, three permissions, one record" sub="Follow the guided steps, or switch consoles yourself. Everything here is a prototype with synthetic children and a fictional school." />
        <div className="flex items-center gap-2"><ProtoTag /><Btn variant="outline" onClick={() => { s.resetDemo(); go(0) }}><RotateCcw className="size-4" /> Reset</Btn></div>
      </div>

      <div className="card mb-5 p-4">
        <div className="flex items-center gap-1.5" aria-label="Demo progress">
          {STEPS.map((_, i) => <button key={i} type="button" aria-label={`Step ${i + 1}`} onClick={() => go(i)} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-sand'}`} />)}
        </div>
        <div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto]">
          <div><div className="font-bold">{st.title}</div><p className="text-sm text-ink-2">{st.body}</p></div>
          <div className="flex flex-wrap gap-2">
            {st.run && <Btn variant="gold" onClick={st.run}><Wand2 className="size-4" />{st.cta}</Btn>}
            <Btn variant="outline" disabled={step === 0} onClick={() => go(step - 1)} aria-label="Previous step"><ChevronLeft className="size-4" /></Btn>
            <Btn disabled={step === STEPS.length - 1} onClick={() => go(step + 1)}>Next <ChevronRight className="size-4" /></Btn>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-2xl bg-sand p-1.5">
        {views.map(([k, l, i]) => <button key={k} type="button" onClick={() => s.setViewer(k)} className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold ${s.viewer === k ? 'bg-white shadow-sm' : 'text-ink-2'}`}>{i}<span>{l}</span></button>)}
      </div>
      {s.viewer === 'admin' && <Admin focusPhoto={photo} onFocus={setPhoto} />}
      {s.viewer === 'parent' && <ParentApp />}
      {s.viewer === 'gallery' && <Gallery />}
    </section>
  )
}
