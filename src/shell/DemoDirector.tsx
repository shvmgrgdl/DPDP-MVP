import * as React from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useApp } from '@/store/app'
import { Dialog, Button, Field, Input, Switch, Select } from '@/design/ui'
import { STORY } from './story'
import { RotateCcw, Upload, Play } from 'lucide-react'

/** Hidden presenter panel: Ctrl/⌘+Shift+D or 5 clicks on the logo. */
export function DemoDirector() {
  const open = useApp((s) => s.directorOpen)
  const setUI = useApp((s) => s.setUI)
  const school = useApp((s) => s.school)
  const updateSchool = useApp((s) => s.updateSchool)
  const people = useApp((s) => s.people)
  const resetDemo = useApp((s) => s.resetDemo)
  const techOverlay = useApp((s) => s.techOverlay)
  const navigate = useNavigate()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [chair, setChair] = React.useState(people.find((p) => p.id === 'U-CHAIR')?.name ?? '')

  const onLogo = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => updateSchool({ logoDataUrl: String(r.result) })
    r.readAsDataURL(f)
  }
  return (
    <Dialog open={open} onOpenChange={(v) => setUI({ directorOpen: v })} title="Demo Director" description="Personalise before the meeting. Only you see this panel." wide>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="School name"><Input value={school.name} onChange={(e) => updateSchool({ name: e.target.value, shortName: e.target.value.split(' ')[0] })} /></Field>
        <Field label="City"><Input value={school.city} onChange={(e) => updateSchool({ city: e.target.value })} /></Field>
        <Field label="Board"><Select value={school.board} onChange={(e) => updateSchool({ board: e.target.value })} options={['CBSE', 'ICSE', 'IB', 'Cambridge', 'State board'].map((v) => ({ value: v, label: v }))} /></Field>
        <Field label="Chairman’s name">
          <Input value={chair} onChange={(e) => { setChair(e.target.value); useApp.setState({ people: useApp.getState().people.map((p) => (p.id === 'U-CHAIR' ? { ...p, name: e.target.value } : p)) }) }} />
        </Field>
        <Field label="School logo">
          <div className="flex items-center gap-3">
            {school.logoDataUrl && <img src={school.logoDataUrl} alt="" className="size-10 rounded-lg border border-line object-contain" />}
            <Button variant="secondary" size="sm" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>Upload logo</Button>
            {school.logoDataUrl && <Button variant="ghost" size="sm" onClick={() => updateSchool({ logoDataUrl: undefined })}>Remove</Button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
          </div>
        </Field>
        <Field label="Media caption"><Input value={school.mediaCaption} onChange={(e) => updateSchool({ mediaCaption: e.target.value })} /></Field>
        <div className="flex items-center justify-between rounded-xl border border-line p-3 md:col-span-2">
          <div><div className="text-sm font-semibold">Tech overlays</div><div className="text-xs text-ink-3">Show IDs, hashes and API hints for technical visitors.</div></div>
          <Switch checked={techOverlay} onCheckedChange={(v) => setUI({ techOverlay: v })} label="Tech overlays" />
        </div>
      </div>
      <div className="mt-6">
        <div className="label-caps mb-2">Jump to a scene</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {STORY.map((s, i) => (
            <button type="button" key={s.title} onClick={() => { useApp.getState().setRole(s.role); navigate(s.path); setUI({ storyStep: i, directorOpen: false }) }}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-sunken">
              <span className="flex size-7 items-center justify-center rounded-full bg-azure-50 text-xs font-bold text-azure">{i + 1}</span>
              <span className="text-sm font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-2">
        <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => { resetDemo(); navigate('/home'); toast.success('Demo reset to a clean state') }}>Reset demo data</Button>
        <Button variant="navy" icon={<Play className="size-4" />} onClick={() => { const s = STORY[0]; useApp.getState().setRole(s.role); navigate(s.path); setUI({ storyStep: 0, directorOpen: false }) }}>Start story mode</Button>
      </div>
    </Dialog>
  )
}
