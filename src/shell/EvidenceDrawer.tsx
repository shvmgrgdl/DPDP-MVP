import { Fragment } from 'react'
import { useApp, personName } from '@/store/app'
import { Sheet, Mono, Chip } from '@/design/ui'
import { fmtDateTime } from '@/lib/utils'
import { Link2, ShieldCheck } from 'lucide-react'

/** Global drawer: open with useApp.getState().setUI({ evidenceDrawer: id }). */
export function EvidenceDrawer() {
  const id = useApp((s) => s.evidenceDrawer)
  const evidence = useApp((s) => s.evidence)
  const setUI = useApp((s) => s.setUI)
  const idx = evidence.findIndex((e) => e.id === id)
  const e = idx >= 0 ? evidence[idx] : undefined
  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && setUI({ evidenceDrawer: null })} title="Evidence record" description="Every decision leaves a tamper-evident record.">
      {!e ? (
        <p className="text-sm text-ink-2">Record {id} is part of a batch record (parent onboarding). Open the Evidence vault to see the batch.</p>
      ) : (
        <div className="space-y-5">
          <div>
            <Chip tone="azure">{e.type}</Chip>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{e.title}</h3>
            <p className="mt-1 text-sm text-ink-2">{fmtDateTime(e.at)} · by {personName(e.actor)}</p>
          </div>
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-ink-3">Evidence ID</dt><dd><Mono>{e.id}</Mono></dd>
            <dt className="text-ink-3">Linked to</dt><dd className="flex flex-wrap gap-1.5">{e.refs.length ? e.refs.map((r) => <Mono key={r} className="rounded bg-sunken px-1.5 py-0.5">{r}</Mono>) : '—'}</dd>
            {e.payload && Object.entries(e.payload).map(([k, v]) => (<Fragment key={k}><dt className="text-ink-3 capitalize">{k}</dt><dd className="text-ink">{String(v)}</dd></Fragment>))}
          </dl>
          <div className="rounded-xl border border-line bg-sunken p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ok"><ShieldCheck className="size-4" /> Tamper-evident</div>
            <p className="mt-1 text-xs text-ink-2">Each record includes the fingerprint of the one before it. Changing any past record breaks the chain.</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs"><span className="w-20 text-ink-3">Fingerprint</span><Mono className="truncate">{e.hash.slice(0, 32)}…</Mono></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-20 text-ink-3">Previous</span><Mono className="truncate">{e.prevHash.slice(0, 32)}…</Mono></div>
              <div className="flex items-center gap-2 text-xs"><Link2 className="size-3.5 text-ink-3" /><span className="text-ink-3">Position {idx + 1} of {evidence.length} in the school ledger</span></div>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
