import * as React from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Card, SectionTitle, Chip, Avatar, Button, Dialog, Field, Input, Select, type Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import type { Person, RoleKey } from '@/data/types'
import { ROLE, ROLES } from '@/roles/roles'

const ROLE_TONE: Record<RoleKey, Tone> = {
  chairman: 'azure', principal: 'azure', office: 'info', marketing: 'expert', teacher: 'ok',
  photographer: 'muted', parent: 'muted', it: 'info', desk: 'expert', partner: 'expert',
}

let localSeq = 1
function addPerson(p: Omit<Person, 'id'>) {
  useApp.setState((s) => ({ people: [...s.people, { ...p, id: `P-${String(localSeq++).padStart(3, '0')}` }] }))
}

export default function People() {
  const people = useApp((s) => s.people)
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', role: 'office' as RoleKey, title: '', email: '' })

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Add a name and email first.'); return }
    addPerson({ ...form })
    toast.success(`${form.name} added`)
    setOpen(false)
    setForm({ name: '', role: 'office', title: '', email: '' })
  }

  return (
    <Card className="p-6">
      <SectionTitle action={<Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Add person</Button>}>People & roles</SectionTitle>
      <div className="divide-y divide-line">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-3">
            <Avatar name={p.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
              <div className="truncate text-[12.5px] text-ink-3">{p.title} · {p.email}{p.scope ? ` · Class ${p.scope}` : ''}</div>
            </div>
            <Chip tone={ROLE_TONE[p.role]}>{ROLE[p.role].label.split(' (')[0]}</Chip>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Add a person" description="Visible only in this demo session."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Add</Button></>}>
        <div className="grid gap-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Role"><Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleKey }))} options={ROLES.filter((r) => !r.mobile).map((r) => ({ value: r.key, label: r.label }))} /></Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Vice Principal" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        </div>
      </Dialog>
    </Card>
  )
}
