import * as React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Card, Button, Chip, Field, Select, Textarea, Input, Empty, type Tone } from '@/design/ui'
import { useApp } from '@/store/app'
import { LEGAL } from '@/data/reference'
import type { RequestStatus, RequestType } from '@/data/types'
import { addDays, fmtDate, relDays } from '@/lib/utils'
import { useActiveFamily } from '../family'
import { Bi, tr, useLang } from '../i18n'
import { PARENT_REQUEST_TYPES, REQUEST_TYPE_LABEL } from '../requestTypes'

const STATUS_META: Record<RequestStatus, { en: string; hi: string; tone: Tone }> = {
  new: { en: 'Received', hi: 'प्राप्त हुआ', tone: 'info' },
  verifying: { en: 'Verifying', hi: 'सत्यापन जारी', tone: 'warn' },
  'in-progress': { en: 'In progress', hi: 'प्रक्रिया में', tone: 'azure' },
  'waiting-parent': { en: 'Waiting on you', hi: 'आपकी प्रतीक्षा', tone: 'warn' },
  resolved: { en: 'Resolved', hi: 'हल हो गया', tone: 'ok' },
  closed: { en: 'Closed', hi: 'बंद', tone: 'muted' },
}

export default function RequestsPage() {
  const lang = useLang()
  const { guardian, children } = useActiveFamily()
  const requests = useApp((s) => s.requests)
  const [type, setType] = useState<RequestType>('access')
  const [studentId, setStudentId] = useState(children[0]?.id ?? '')
  const [nominee, setNominee] = useState('')
  const [summary, setSummary] = useState('')

  const activeMeta = PARENT_REQUEST_TYPES.find((t) => t.key === type)!
  const activeChild = children.find((c) => c.id === studentId) ?? children[0]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeChild) return
    const at = new Date().toISOString()
    const parts = [summary.trim() || activeMeta.example]
    if (type === 'nomination' && nominee.trim()) parts.push(`Nominee: ${nominee.trim()}.`)
    const id = useApp.getState().addRequest({
      type,
      guardianId: guardian.id,
      studentId: activeChild.id,
      channel: 'parent-app',
      receivedAt: at,
      dueAt: addDays(at, LEGAL.grievanceMaxDays),
      targetAt: addDays(at, 7),
      ownerId: 'U-OFFICE',
      status: 'new',
      summary: parts.join(' '),
    })
    toast.success(tr(lang, `Request sent · ${id}`, `अनुरोध भेजा गया · ${id}`))
    setSummary('')
    setNominee('')
  }

  const mine = [...requests].filter((r) => r.guardianId === guardian.id).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))

  return (
    <div className="space-y-6">
      <div>
        <div className="label-caps"><Bi en="Requests" hi="अनुरोध" /></div>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink"><Bi en="Ask the school" hi="स्कूल से पूछें" /></h1>
        <p className="mt-1 text-[13px] text-ink-2"><Bi en={`We reply well within ${LEGAL.grievanceMaxDays} days.`} hi={`हम ${LEGAL.grievanceMaxDays} दिनों के भीतर जवाब देते हैं।`} /></p>
      </div>

      <Card className="p-4">
        <form className="space-y-3.5" onSubmit={submit}>
          <Field label={tr(lang, 'What do you need?', 'आपको क्या चाहिए?')}>
            <Select value={type} onChange={(e) => setType(e.target.value as RequestType)} options={PARENT_REQUEST_TYPES.map((t) => ({ value: t.key, label: tr(lang, t.en, t.hi) }))} />
            <p className="mt-1.5 text-[12px] text-ink-3">{tr(lang, activeMeta.example, activeMeta.example)}</p>
          </Field>

          {children.length > 1 && (
            <Field label={tr(lang, 'About which child?', 'किस बच्चे के बारे में?')}>
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} options={children.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
          )}

          {type === 'nomination' && (
            <Field label={tr(lang, 'Nominee name & relation', 'नामांकित व्यक्ति का नाम और संबंध')}>
              <Input value={nominee} onChange={(e) => setNominee(e.target.value)} placeholder={tr(lang, 'e.g. Raj Patel, uncle', 'जैसे राज पटेल, चाचा')} />
            </Field>
          )}

          <Field label={tr(lang, 'Tell us more (optional)', 'हमें और बताएं (वैकल्पिक)')}>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={activeMeta.example} />
          </Field>

          <Button type="submit" size="lg" className="w-full" icon={<Send className="size-4" />}>
            <Bi en="Send request" hi="अनुरोध भेजें" />
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <div className="text-[13px] font-semibold text-ink"><Bi en="Your requests" hi="आपके अनुरोध" /></div>
        {mine.length === 0 ? (
          <Card className="p-0"><Empty title={tr(lang, 'No requests yet', 'अभी कोई अनुरोध नहीं')} body={tr(lang, 'Anything you ask for will show up here with its status.', 'आपके द्वारा किया गया कोई भी अनुरोध यहां स्थिति के साथ दिखेगा।')} /></Card>
        ) : (
          mine.map((r) => {
            const label = REQUEST_TYPE_LABEL[r.type]
            const meta = STATUS_META[r.status]
            const child = children.find((c) => c.id === r.studentId)
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{tr(lang, label.en, label.hi)}{child ? ` · ${child.name.split(' ')[0]}` : ''}</div>
                    <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{r.summary}</div>
                  </div>
                  <Chip tone={meta.tone} size="sm">{tr(lang, meta.en, meta.hi)}</Chip>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                  <span>{fmtDate(r.receivedAt)}</span>
                  {!['resolved', 'closed'].includes(r.status) && <span>{tr(lang, `Due ${relDays(r.dueAt)}`, `${relDays(r.dueAt)} तक देय`)}</span>}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
