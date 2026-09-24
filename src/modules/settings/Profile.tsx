import * as React from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Select, Button, Chip } from '@/design/ui'
import { useApp } from '@/store/app'

const BOARDS = ['CBSE', 'ICSE', 'IB', 'Cambridge', 'State board']

export default function Profile() {
  const school = useApp((s) => s.school)
  const updateSchool = useApp((s) => s.updateSchool)
  const [draft, setDraft] = React.useState({ name: school.name, city: school.city, board: school.board })
  const fileRef = React.useRef<HTMLInputElement>(null)
  const dirty = draft.name !== school.name || draft.city !== school.city || draft.board !== school.board

  const onLogo = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => { updateSchool({ logoDataUrl: String(r.result) }); toast.success('Logo updated') }
    r.readAsDataURL(f)
  }
  const save = () => {
    updateSchool({ name: draft.name, shortName: draft.name.split(' ')[0] || draft.name, city: draft.city, board: draft.board })
    toast.success('School profile saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionTitle>School profile</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="School name"><Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
          <Field label="City"><Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} /></Field>
          <Field label="Board"><Select value={draft.board} onChange={(e) => setDraft((d) => ({ ...d, board: e.target.value }))} options={BOARDS.map((b) => ({ value: b, label: b }))} /></Field>
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {school.logoDataUrl ? <img src={school.logoDataUrl} alt="" className="size-10 rounded-lg border border-line object-contain" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-sunken text-[11px] text-ink-3">None</div>}
              <Button type="button" variant="secondary" size="sm" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>Upload</Button>
              {school.logoDataUrl && <Button type="button" variant="ghost" size="sm" onClick={() => updateSchool({ logoDataUrl: undefined })}>Remove</Button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end"><Button onClick={save} disabled={!dirty}>Save changes</Button></div>
      </Card>
      <Card className="p-6">
        <SectionTitle>Status & contact</SectionTitle>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-3">Significant Data Fiduciary status</dt><dd className="mt-1"><Chip tone="muted" icon={false}>{school.sdfStatus === 'not-notified' ? 'Not notified' : school.sdfStatus}</Chip></dd></div>
          <div><dt className="text-ink-3">Privacy contact</dt><dd className="mt-1 text-ink">{school.privacyContact.name} · {school.privacyContact.email}</dd></div>
        </dl>
      </Card>
    </div>
  )
}
