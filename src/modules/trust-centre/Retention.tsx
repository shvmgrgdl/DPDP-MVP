import * as React from 'react'
import { toast } from 'sonner'
import { Archive, Trash2, ImageOff, CheckCircle2 } from 'lucide-react'
import { useApp, personName } from '@/store/app'
import { PageHeader, Card, Button, Dialog, Field, Textarea } from '@/design/ui'
import { cn, fmtDate, relDays } from '@/lib/utils'
import { reviewClassOf2023 } from './shared'

function ReviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [action, setAction] = React.useState<'archive' | 'delete'>('archive')
  const [note, setNote] = React.useState('')
  const confirm = () => {
    const { certificate } = reviewClassOf2023(action, note)
    toast.success(`${action === 'archive' ? 'Archived' : 'Deleted'} — deletion certificate ${certificate} saved to Evidence`)
    onOpenChange(false); setNote('')
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Review Class of 2023 media" description="412 event photos and videos are past their 3-year review date. Choose what happens to them."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={action === 'delete' ? 'danger' : 'primary'} onClick={confirm}>{action === 'archive' ? 'Archive & issue certificate' : 'Delete & issue certificate'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setAction('archive')} className={cn('rounded-xl border p-4 text-left', action === 'archive' ? 'border-azure bg-azure-50' : 'border-line-strong hover:bg-sunken')}>
          <Archive className={cn('size-5', action === 'archive' ? 'text-azure' : 'text-ink-3')} />
          <div className="mt-2 text-sm font-semibold text-ink">Archive</div>
          <div className="mt-0.5 text-xs text-ink-2">Move out of active storage. Kept, but no longer used or shared.</div>
        </button>
        <button type="button" onClick={() => setAction('delete')} className={cn('rounded-xl border p-4 text-left', action === 'delete' ? 'border-risk bg-risk-bg' : 'border-line-strong hover:bg-sunken')}>
          <Trash2 className={cn('size-5', action === 'delete' ? 'text-risk' : 'text-ink-3')} />
          <div className="mt-2 text-sm font-semibold text-ink">Delete</div>
          <div className="mt-0.5 text-xs text-ink-2">Permanently remove all 412 items. Cannot be undone.</div>
        </button>
      </div>
      <div className="mt-4"><Field label="Note (optional)" hint="Goes on the deletion certificate"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Kept a copy of the front cover for the yearbook archive" /></Field></div>
    </Dialog>
  )
}

export function Retention() {
  const retention = useApp((s) => s.retention)
  const ob19 = useApp((s) => s.obligations.find((o) => o.id === 'OB-19'))
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const ret02 = retention.find((r) => r.id === 'RET-02')
  const needsReview = ob19?.status === 'action-due'

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Retention & deletion" subtitle="How long each kind of record is kept, and why — deleted or archived with proof when its time is up." />

      {ret02 && (
        needsReview ? (
          <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-warn/30 bg-warn-bg/40 p-5">
            <div className="flex items-start gap-3">
              <ImageOff className="mt-0.5 size-5 shrink-0 text-warn" />
              <div>
                <div className="text-sm font-semibold text-ink">Class of 2023 media review — due {relDays(ret02.nextReview)}</div>
                <p className="mt-0.5 text-sm text-ink-2">412 event photos and videos have passed their 3-year retention window. Archive or delete them to close this out.</p>
              </div>
            </div>
            <Button variant="navy" onClick={() => setReviewOpen(true)}>Review now</Button>
          </Card>
        ) : (
          <Card className="mb-6 flex items-start gap-3 border-ok/30 bg-ok-bg/40 p-5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
            <div><div className="text-sm font-semibold text-ink">Class of 2023 media reviewed</div><p className="mt-0.5 text-sm text-ink-2">{ret02.exception}</p></div>
          </Card>
        )
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.3fr_1.5fr_1.3fr_120px_150px] gap-3 border-b border-line bg-sunken/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <div>Category</div><div>Retention</div><div>Basis</div><div>Owner</div><div>Next review</div>
        </div>
        {retention.map((r) => (
          <div key={r.id} className="border-b border-line px-4 py-3.5 text-[13px] last:border-0">
            <div className="grid grid-cols-[1.3fr_1.5fr_1.3fr_120px_150px] items-start gap-3">
              <div className="font-medium text-ink">{r.category}</div>
              <div className="text-ink-2">{r.retention}</div>
              <div className="text-ink-3">{r.basis}</div>
              <div className="text-ink-2">{personName(r.ownerId)}</div>
              <div className="text-ink-2">{fmtDate(r.nextReview)}</div>
            </div>
            {r.exception && <p className="mt-1.5 text-xs text-ink-3">{r.exception}</p>}
          </div>
        ))}
      </Card>
      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  )
}
