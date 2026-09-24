import * as React from 'react'
import { ShieldCheck, ShieldAlert, FlaskConical, RotateCcw, Play } from 'lucide-react'
import type { Evidence } from '@/data/types'
import { useApp } from '@/store/app'
import { Dialog, Button, Chip } from '@/design/ui'
import { cn } from '@/lib/utils'
import { verifyChain, tamperedCopy, type ChainVerification } from './lib'

export function VerifyChainDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const liveEvidence = useApp((s) => s.evidence)
  const techOverlay = useApp((s) => s.techOverlay)
  const setUI = useApp((s) => s.setUI)
  const [tampered, setTampered] = React.useState<{ records: Evidence[]; targetId: string } | null>(null)
  const dataset = tampered?.records ?? liveEvidence
  const [verified, setVerified] = React.useState<ChainVerification | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [running, setRunning] = React.useState(false)

  const start = (records: Evidence[]) => { setVerified(verifyChain(records)); setProgress(0); setRunning(true) }

  React.useEffect(() => {
    if (!running) return
    const N = dataset.length
    const step = Math.max(1, Math.ceil(N / 50))
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + step
        if (next >= N) { clearInterval(timer); setRunning(false); return N }
        return next
      })
    }, 16)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  React.useEffect(() => { if (open && !verified && !running) start(dataset) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setTampered(null); start(liveEvidence) }
  const simulate = () => {
    const { copy, targetId } = tamperedCopy(liveEvidence)
    setTampered({ records: copy, targetId })
    start(copy)
  }

  const N = dataset.length
  const done = !running && progress >= N && verified
  const brokenAt = verified?.brokenAt ?? -1
  const isBroken = brokenAt >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange} wide
      title="Verify the evidence chain"
      description="Every record's fingerprint is built from the one before it. We recompute every fingerprint from the very first record and compare it to what's stored.">
      <div className="rounded-xl border border-line bg-sunken p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-ink">{running ? `Checking ${Math.min(progress, N)} of ${N}…` : done ? `Checked ${N} of ${N}` : `${N} records in the ledger`}</span>
          {tampered && <Chip tone="risk" size="sm">Simulated tampering active</Chip>}
        </div>
        <div className="mt-3 flex flex-wrap gap-[3px]">
          {dataset.map((e, i) => {
            const checked = i < progress
            const ok = verified?.results[i]?.ok
            return (
              <button key={e.id} type="button" aria-label={e.id} title={e.id}
                onClick={() => setUI({ evidenceDrawer: e.id })}
                className={cn('block size-[9px] rounded-[2px] transition-colors duration-200',
                  !checked ? 'bg-line-strong' : ok ? 'bg-ok' : 'bg-risk')} />
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-line-strong" /> Not yet checked</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-ok" /> Fingerprint matches</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-risk" /> Fingerprint mismatch</span>
        </div>
      </div>

      {done && (
        <div className={cn('mt-4 flex items-start gap-3 rounded-xl p-4', isBroken ? 'bg-risk-bg' : 'bg-ok-bg')}>
          {isBroken ? <ShieldAlert className="mt-0.5 size-5 shrink-0 text-risk" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />}
          <div className="text-sm">
            {isBroken ? (
              <>
                <div className="font-semibold text-risk">Chain breaks at {verified!.results[brokenAt].id}</div>
                <p className="mt-0.5 text-ink-2">
                  {tampered && tampered.targetId === verified!.results[brokenAt].id ? 'Its content was edited after it was signed, so ' : 'Its stored fingerprint '}
                  it no longer matches the fingerprint computed from its content. {N - brokenAt - 1 > 0 ? `The ${N - brokenAt - 1} record${N - brokenAt - 1 === 1 ? '' : 's'} after it can no longer be trusted either — that's what makes the chain tamper-evident.` : ''}
                </p>
              </>
            ) : (
              <div className="font-semibold text-ok">✓ All {N} records intact.</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {techOverlay && <Button variant="secondary" size="sm" icon={<FlaskConical className="size-4" />} onClick={simulate} disabled={running}>Simulate tampering</Button>}
          {tampered && <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={reset} disabled={running}>Reset to real ledger</Button>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          <Button icon={<Play className="size-4" />} onClick={() => start(dataset)} disabled={running}>Verify again</Button>
        </div>
      </div>
    </Dialog>
  )
}
