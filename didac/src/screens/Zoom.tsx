import * as React from 'react'
import { X, Eye, ShieldAlert } from 'lucide-react'
import { useDemo, verifyChain } from '../store'
import { evaluate } from '../data'
import { Chip, PhotoView, StateChip, fmtD } from '../ui'

/** Photo zoom: who opened, when, and the audit trail — only events the managed workflow actually observed. */
export function Zoom({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const { photos, students, published, audit, viewer, childId } = useDemo()
  const photo = photos.find((p) => p.id === photoId)!
  const ev = evaluate(photo, students, !!published[photoId])
  React.useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const trail = audit.filter((a) => a.photoId === photoId).slice().reverse()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-0 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={photo.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-paper md:max-h-[92vh] md:flex-row md:rounded-3xl">
        <div className="min-h-0 flex-1 overflow-auto bg-navy p-3 md:p-5">
          <PhotoView photo={photo} students={students} mode={viewer === 'parent' ? 'parent' : viewer === 'admin' ? 'admin' : 'plain'} ev={ev} highlightId={viewer === 'parent' ? childId : undefined} />
          <p className="mt-2 text-xs text-white/70">{photo.title} · uploaded by {photo.uploadedBy}</p>
        </div>
        <aside className="flex w-full flex-col gap-3 overflow-auto p-4 md:w-[340px]">
          <div className="flex items-start justify-between gap-2">
            <div><div className="eyebrow">Photo activity</div><div className="text-lg font-bold">Who opened it, when</div></div>
            <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-xl hover:bg-sand"><X className="size-5" /></button>
          </div>
          <StateChip ev={ev} />
          <ol className="space-y-2">
            {trail.length === 0 && <li className="text-sm text-ink-3">No activity recorded yet.</li>}
            {trail.map((a) => (
              <li key={a.n} className="rounded-xl border border-line bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">{a.action}</span><span className="text-xs text-ink-3">{fmtD(a.t)}</span></div>
                <div className="text-xs text-ink-2">{a.actor}</div>
                <div className="mt-0.5 text-xs text-ink-3">{a.detail}</div>
                <div className="mt-1 font-mono text-[10px] text-ink-3">#{a.n} · {a.hash.slice(0, 12)}…</div>
              </li>
            ))}
          </ol>
          <div className="mt-auto rounded-xl border border-line bg-sand p-3 text-xs text-ink-2">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><ShieldAlert className="size-4 text-gold" /> What this does not prove</div>
            It records events inside this managed workflow. It cannot show who took a screenshot, forwarded a downloaded file, or leaked a copy elsewhere.
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-3"><Eye className="size-3.5" /> Chain {verifyChain(audit) ? 'verified' : 'broken'} · <Chip tone="gold">Prototype</Chip></div>
        </aside>
      </div>
    </div>
  )
}
