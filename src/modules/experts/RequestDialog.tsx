import * as React from 'react'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'
import { Dialog, Button, Field, Input, Textarea, Select } from '@/design/ui'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { EXPERTS } from '@/data/reference'
import type { Evidence, ExpertKind } from '@/data/types'
import { fmtDateTime, nowIso } from '@/lib/utils'
import { KIND_EVIDENCE } from './data'

/** "Request" dialog: describe the need, attach evidence (preselected by relevance) → addExpertRequest. */
export function RequestDialog({ open, onOpenChange, defaultKind, prefillTitle, prefillDescription }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultKind?: ExpertKind
  prefillTitle?: string
  prefillDescription?: string
}) {
  const role = useApp((s) => s.role)
  const evidence = useApp((s) => s.evidence)
  const addExpertRequest = useApp((s) => s.addExpertRequest)
  const [kind, setKind] = React.useState<ExpertKind>(defaultKind ?? 'managed-desk')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [picked, setPicked] = React.useState<Set<string>>(new Set())

  // Evidence matching this kind, most recent first — searched across the whole log, not just a
  // recency window (the seed's 40 near-daily access-log entries would otherwise crowd everything
  // else out of "most recent").
  const relevantPool = React.useMemo(
    () => [...evidence].filter((e) => KIND_EVIDENCE[kind].includes(e.type)).sort((a, b) => b.at.localeCompare(a.at)),
    [evidence, kind],
  )
  // Shown list: relevant matches first (so preselected items are always visible), then general recent activity.
  const recent = React.useMemo(() => {
    const byRecency = [...evidence].sort((a, b) => b.at.localeCompare(a.at))
    const seen = new Set<string>()
    const list: Evidence[] = []
    for (const e of relevantPool) { if (list.length >= 6) break; seen.add(e.id); list.push(e) }
    for (const e of byRecency) { if (list.length >= 14) break; if (!seen.has(e.id)) { seen.add(e.id); list.push(e) } }
    return list
  }, [evidence, relevantPool])

  // Reset fields for a new dialog session.
  React.useEffect(() => {
    if (!open) return
    setKind(defaultKind ?? 'managed-desk')
    setTitle(prefillTitle ?? '')
    setDescription(prefillDescription ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultKind])

  // Refresh preselected evidence whenever the chosen kind changes (initial open, or a manual switch).
  React.useEffect(() => {
    if (!open) return
    setPicked(new Set(relevantPool.slice(0, 4).map((e) => e.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind])

  const meta = EXPERTS.find((e) => e.kind === kind)!
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const submit = () => {
    if (!description.trim()) { toast.error('Describe what you need help with first.'); return }
    const meId = ROLE[role].person
    const t = title.trim() || `${meta.title} request`
    addExpertRequest({
      kind, title: t, status: 'requested', partner: meta.who, attachments: [...picked],
      messages: [{ at: nowIso(), from: meId, text: description.trim() }],
    })
    toast.success(`Sent to ${meta.who}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Request expert help" wide
      description="Goes straight to the right partner, with the evidence they'll need."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Send request</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="What kind of help?">
          <Select value={kind} onChange={(e) => setKind(e.target.value as ExpertKind)} options={EXPERTS.map((e) => ({ value: e.kind, label: e.title }))} />
        </Field>
        <Field label="Who this goes to" hint={meta.when}><Input value={meta.who} disabled className="text-ink-2" /></Field>
      </div>
      <div className="mt-4"><Field label="Subject"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${meta.title} request`} /></Field></div>
      <div className="mt-4"><Field label="Describe the need"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening, and what would help?" /></Field></div>
      <div className="mt-4">
        <div className="label-caps mb-2 flex items-center gap-1.5"><Paperclip className="size-3.5" /> Attach evidence ({picked.size} selected)</div>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
          {recent.length === 0 && <p className="px-2 py-3 text-sm text-ink-3">No evidence recorded yet.</p>}
          {recent.map((e) => (
            <label key={e.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-sunken">
              <input type="checkbox" className="mt-1 accent-azure" checked={picked.has(e.id)} onChange={() => toggle(e.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{e.title}</span>
                <span className="text-[11px] text-ink-3">{fmtDateTime(e.at)} · {e.type}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
