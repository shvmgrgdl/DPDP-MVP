import * as React from 'react'
import { toast } from 'sonner'
import { Send, FileUp, Paperclip } from 'lucide-react'
import { Sheet, Button, Field, Textarea, Select, Empty } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp, personName } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { EXPERTS } from '@/data/reference'
import type { ExpertRequest } from '@/data/types'
import { fmtDateTime, addDays, nowIso, cn } from '@/lib/utils'
import { StatusStepper } from './parts'
import { STATUS_STEPS } from './data'

type Mode = 'view' | 'desk' | 'partner'

/** Full request detail: status stepper, attached evidence, message thread (+ desk status control / partner report upload). */
export function RequestDetail({ id, onClose, mode = 'view' }: { id: string | null; onClose: () => void; mode?: Mode }) {
  const req = useApp((s) => s.experts.find((x) => x.id === id))
  const evidence = useApp((s) => s.evidence)
  const updateExpert = useApp((s) => s.updateExpert)
  const addEvidence = useApp((s) => s.addEvidence)
  const addTask = useApp((s) => s.addTask)
  const role = useApp((s) => s.role)
  const [reply, setReply] = React.useState('')
  const [findings, setFindings] = React.useState('')
  const [fileName, setFileName] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const meId = ROLE[role].person

  React.useEffect(() => { setReply(''); setFindings(''); setFileName('') }, [id])
  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [req?.messages.length])

  const canReport = mode === 'partner' && !!req && req.status !== 'report-shared' && req.status !== 'closed'

  const send = () => {
    if (!reply.trim() || !req) return
    updateExpert(req.id, {}, { from: meId, text: reply.trim() })
    setReply('')
  }

  const uploadReport = () => {
    if (!req) return
    const items = findings.split('\n').map((l) => l.trim()).filter(Boolean)
    const evId = addEvidence({ type: 'expert', title: `Report shared for ${req.title}`, actor: meId, refs: [req.id], payload: { file: fileName || 'report.pdf', findings: items.length } })
    updateExpert(req.id, { status: 'report-shared', attachments: [...req.attachments, evId] },
      { from: meId, text: `Report uploaded${fileName ? ` (${fileName})` : ''}.${items.length ? ` ${items.length} finding${items.length === 1 ? '' : 's'} turned into tasks.` : ''}` })
    items.forEach((f) => addTask({ title: f, area: 'assurance', ownerId: 'U-OFFICE', dueAt: addDays(nowIso(), 14), link: '/experts', kind: 'general' }))
    toast.success('Report shared with the school')
    setFindings(''); setFileName('')
  }

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()} title={req?.title ?? 'Request'}
      description={req ? `${EXPERTS.find((e) => e.kind === req.kind)?.title} · ${req.partner}` : undefined} width={540}>
      {!req ? <Empty title="Request not found" /> : (
        <div className="space-y-6">
          <StatusStepper status={req.status} />
          {mode === 'desk' && (
            <Field label="Update status" hint="Recorded as a message to the requester.">
              <Select value={req.status} onChange={(e) => {
                const key = e.target.value as ExpertRequest['status']
                const label = STATUS_STEPS.find((s) => s.key === key)?.label ?? key
                updateExpert(req.id, { status: key }, { from: meId, text: `Status set to “${label}”` })
              }} options={STATUS_STEPS.map((s) => ({ value: s.key, label: s.label }))} />
            </Field>
          )}
          <div>
            <div className="label-caps mb-2 flex items-center gap-1.5"><Paperclip className="size-3.5" /> Attached evidence</div>
            {req.attachments.length ? (
              <div className="flex flex-wrap gap-1.5">
                {req.attachments.map((a) => {
                  const title = evidence.find((e) => e.id === a)?.title
                  return <EvidenceLink key={a} id={a} className="inline-flex max-w-[240px] truncate rounded-full bg-sunken px-2.5 py-1">{title ?? a}</EvidenceLink>
                })}
              </div>
            ) : <p className="text-sm text-ink-3">None attached.</p>}
          </div>
          {canReport && (
            <div className="rounded-xl border border-line bg-sunken p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink"><FileUp className="size-4" /> Upload report</div>
              <p className="mb-3 text-[12.5px] text-ink-2">Attach the report and list findings — each line becomes a task for the school.</p>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>{fileName || 'Choose file'}</Button>
              <Textarea className="mt-3" placeholder={'Findings, one per line — e.g.\nUpdate CCTV signage at the north gate'} value={findings} onChange={(e) => setFindings(e.target.value)} />
              <Button className="mt-3" size="sm" onClick={uploadReport} disabled={!fileName}>Share report</Button>
            </div>
          )}
          <div>
            <div className="label-caps mb-2">Messages</div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-line bg-sunken/50 p-3">
              {req.messages.length === 0 && <p className="px-1 py-2 text-sm text-ink-3">No messages yet.</p>}
              {req.messages.map((m, i) => {
                const mine = m.from === meId
                return (
                  <div key={i} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-xl px-3 py-2', mine ? 'bg-navy text-white' : 'border border-line bg-surface')}>
                      <div className={cn('text-[11px] font-semibold', mine ? 'text-white/70' : 'text-ink-3')}>{personName(m.from)} · {fmtDateTime(m.at)}</div>
                      <div className={cn('text-[13px]', mine ? 'text-white' : 'text-ink')}>{m.text}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <Textarea className="min-h-[60px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={mode === 'partner' ? 'Message the school…' : 'Send a message…'} />
              <Button size="md" icon={<Send className="size-4" />} onClick={send} disabled={!reply.trim()}>Send</Button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
