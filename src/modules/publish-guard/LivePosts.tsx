import * as React from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CircleCheck, ClipboardCheck, ImageOff, Radio, ShieldCheck, Undo2 } from 'lucide-react'
import { Button, Card, Chip, Dialog, Due, Empty, Kpi, PageHeader, Tabs } from '@/design/ui'
import { EvidenceLink, PhotoFaces } from '@/design/media'
import { DEST } from '@/data/reference'
import type { MediaAsset, Publication, Task } from '@/data/types'
import { decisionTrace, evaluateAsset, type EngineCtx } from '@/engine/permission'
import { personName, useApp } from '@/store/app'
import { useCan, useCtx } from '@/store/hooks'
import { cn, fmtDate, fmtDateTime, relDays } from '@/lib/utils'
import { DestIcon, firstName, purposeLabel } from './shared'

type Filter = 'all' | Publication['status']
const ORDER: Record<Publication['status'], number> = { 'takedown-requested': 0, live: 1, removed: 2 }
const STATUS: Record<Publication['status'], { label: string; tone: 'ok' | 'warn' | 'muted' }> = {
  live: { label: 'Live', tone: 'ok' },
  'takedown-requested': { label: 'Takedown requested', tone: 'warn' },
  removed: { label: 'Removed', tone: 'muted' },
}

/** Why a post was flagged: the most recent parent change that now blocks a child in it. */
function takedownReason(ctx: EngineCtx, pub: Publication, asset: MediaAsset | undefined) {
  if (!asset) return null
  const e = evaluateAsset(ctx, asset, pub.destination)
  const blocked = e.faces.filter((f) => f.state === 'blocked' && f.student)
  const withP = blocked
    .map((f) => ({ f, trace: decisionTrace(ctx, f.student!.id, DEST[pub.destination].purpose) }))
    .sort((a, b) => (b.trace.permission?.at ?? '').localeCompare(a.trace.permission?.at ?? ''))
  const top = withP[0]
  if (!top) return null
  const p = top.trace.permission
  const g = top.trace.guardian
  const verb = p?.status === 'withdrawn' ? 'withdrew permission for' : p?.status === 'denied' ? 'turned off' : p?.status === 'pending' ? 'has not yet allowed' : 'changed their choice for'
  const who = g ? `${g.name} (${firstName(top.f.student!.name)}’s ${g.relation.toLowerCase()})` : `${firstName(top.f.student!.name)}’s parent`
  return { text: `${who} ${verb} “${purposeLabel(pub.destination)}”`, at: p?.at, evidenceId: p?.evidenceId, others: withP.length - 1 }
}

const pubIdIn = (t: Task) => /PUB-\d+/.exec(t.title)?.[0]

export default function LivePosts() {
  const pubs = useApp((s) => s.publications)
  const assets = useApp((s) => s.assets)
  const tasks = useApp((s) => s.tasks)
  const ctx = useCtx()
  const canPublish = useCan('publish')
  const [params, setParams] = useSearchParams()
  const q = params.get('status')
  const filter: Filter = q === 'live' || q === 'takedown-requested' || q === 'removed' ? q : 'all'
  const [confirm, setConfirm] = React.useState<Publication | null>(null)
  const [flash, setFlash] = React.useState<string | null>(null)

  const assetById = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const counts = { live: 0, 'takedown-requested': 0, removed: 0 } as Record<Publication['status'], number>
  for (const p of pubs) counts[p.status]++
  const openTakedowns = tasks.filter((t) => t.kind === 'takedown' && t.status === 'open')

  const rows = React.useMemo(
    () => pubs.filter((p) => filter === 'all' || p.status === filter).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.at.localeCompare(a.at)),
    [pubs, filter],
  )

  const takeDown = (pub: Publication) => {
    const st = useApp.getState()
    st.requestTakedown(pub.id)
    st.tasks.filter((t) => t.kind === 'takedown' && t.status === 'open' && pubIdIn(t) === pub.id).forEach((t) => useApp.getState().completeTask(t.id))
    const ev = useApp.getState().evidence
    const evId = [...ev].reverse().find((e) => e.refs.includes(pub.id) && e.title.includes('taken down'))?.id
    setFlash(pub.id)
    setTimeout(() => setFlash((f) => (f === pub.id ? null : f)), 2400)
    toast.success(`Post ${pub.id} marked as taken down`, {
      description: evId ? `Recorded as ${evId}.` : 'Recorded in the evidence ledger.',
      action: evId ? { label: 'View', onClick: () => useApp.getState().setUI({ evidenceDrawer: evId }) } : undefined,
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Publish Guard"
        title="Live posts"
        subtitle="Everything published through Publish Guard. If a parent changes their choice, affected posts are flagged here automatically."
        actions={<Button variant="secondary" to="/publish" icon={<ArrowLeft className="size-4" />}>Back to Publish Guard</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Live" value={counts.live} tone="ok" icon={<Radio className="size-4 text-ok" />} sub="Cleared when published" />
        <Kpi label="Takedown requested" value={counts['takedown-requested']} tone={counts['takedown-requested'] ? 'warn' : undefined}
          icon={<AlertTriangle className="size-4 text-warn" />} sub={counts['takedown-requested'] ? 'A parent changed their choice' : 'Nothing waiting'} />
        <Kpi label="Removed" value={counts.removed} icon={<CircleCheck className="size-4 text-ink-3" />} sub="Taken down, with evidence" />
      </div>

      {openTakedowns.length > 0 && (
        <Card className="mt-6 border-warn/30 p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <ClipboardCheck className="size-4 text-warn" /> Takedowns to action <span className="text-ink-3 num">({openTakedowns.length})</span>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {openTakedowns.map((t) => {
              const pid = pubIdIn(t)
              const pub = pubs.find((p) => p.id === pid)
              const overdue = new Date(t.dueAt).getTime() < Date.now()
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-ink">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-ink-3">
                      <Due tone={overdue ? 'risk' : 'warn'}>Due {relDays(t.dueAt, new Date().toISOString())}</Due>
                      <span>Owner: {personName(t.ownerId)}</span>
                      <span>Opened {fmtDateTime(t.createdAt)}</span>
                    </div>
                  </div>
                  {pub && pub.status === 'takedown-requested' ? (
                    <Button size="sm" variant="navy" disabled={!canPublish} onClick={() => takeDown(pub)}>Mark as taken down</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => { useApp.getState().completeTask(t.id); toast.success('Task marked done') }}>Mark task done</Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => { const n = new URLSearchParams(params); if (v === 'all') n.delete('status'); else n.set('status', v); setParams(n, { replace: true }) }}
          tabs={[
            { value: 'all', label: 'All', count: pubs.length },
            { value: 'live', label: 'Live', count: counts.live },
            { value: 'takedown-requested', label: 'Takedown requested', count: counts['takedown-requested'] },
            { value: 'removed', label: 'Removed', count: counts.removed },
          ]} />
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="size-3.5 text-ok" />Checked again every time a parent changes a choice</span>
      </div>

      <Card className="mt-3 overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon={<Radio className="size-6" />}
            title={pubs.length ? 'Nothing in this view' : 'Nothing published yet'}
            body={pubs.length ? 'Try another tab.' : 'Export a safe set from Publish Guard and the posts will be listed here, with evidence.'}
            action={!pubs.length ? <Button variant="soft" to="/publish">Open Publish Guard</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {rows.map((p) => (
                <PostRow key={p.id} pub={p} asset={assetById.get(p.assetId)} ctx={ctx} flash={flash === p.id} canPublish={canPublish}
                  onTakeDown={() => (p.status === 'takedown-requested' ? takeDown(p) : setConfirm(p))} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} title="Take this post down?"
        description={confirm ? `${confirm.id} on ${DEST[confirm.destination].label}, published ${fmtDate(confirm.at)}.` : undefined}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="navy" onClick={() => { if (confirm) takeDown(confirm); setConfirm(null) }}>Mark as taken down</Button>
        </>}>
        <p className="text-sm text-ink-2">Remove the post on {confirm ? DEST[confirm.destination].label : 'the channel'} first, then mark it here. We record who did it and when.</p>
      </Dialog>
    </div>
  )
}

function PostRow({ pub, asset, ctx, flash, canPublish, onTakeDown }: {
  pub: Publication; asset?: MediaAsset; ctx: EngineCtx; flash: boolean; canPublish: boolean; onTakeDown: () => void
}) {
  const d = DEST[pub.destination]
  const flagged = pub.status === 'takedown-requested'
  const removed = pub.status === 'removed'
  const reason = flagged ? takedownReason(ctx, pub, asset) : null
  const evals = React.useMemo(() => (asset ? evaluateAsset(ctx, asset, pub.destination).faces : undefined), [asset, ctx, pub.destination])
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={cn('relative grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-3 px-5 py-4 transition-colors md:grid-cols-[64px_minmax(0,1fr)_150px_170px_auto] md:items-center',
        flagged && 'bg-warn-bg/60', flash && 'bg-ok-bg/70')}>
      {flagged && <span className="absolute inset-y-0 left-0 w-1 bg-warn" aria-hidden />}
      <div className={cn('w-16', removed && 'opacity-50 grayscale')}>
        {asset ? (
          <PhotoFaces asset={asset} evals={evals} aspect={1} blurBlocked={pub.variant === 'blurred'} rounded="rounded-lg" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-sunken text-ink-3"><ImageOff className="size-5" /></div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('truncate text-[14px] font-semibold', removed ? 'text-ink-3' : 'text-ink')}>{asset?.title ?? pub.assetId}</span>
          <span className="rounded bg-sunken px-1.5 py-px text-[10.5px] font-semibold text-ink-3">{pub.variant === 'blurred' ? 'Blurred copy' : 'Original'}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-ink-3">
          <span className="font-mono">{pub.id}</span>
          <span>Evidence <EvidenceLink id={pub.evidenceId} className="text-[11.5px]" /></span>
        </div>
        {flagged && (
          <div className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug text-warn">
            <Undo2 className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <span className="font-semibold">A parent changed their choice.</span>{' '}
              <span className="text-ink-2">
                {reason ? <>{reason.text}{reason.at ? ` · ${relDays(reason.at, new Date().toISOString())}` : ''}{reason.others > 0 ? ` (and ${reason.others} more)` : ''}. </> : null}
                This post must come down.
              </span>
              {reason?.evidenceId && <> <EvidenceLink id={reason.evidenceId} className="text-[11.5px]" /></>}
            </span>
          </div>
        )}
      </div>

      <div className="col-start-2 flex items-center gap-2 text-[13px] text-ink-2 md:col-start-auto">
        <span className="flex size-7 items-center justify-center rounded-md bg-sunken"><DestIcon dest={pub.destination} className="size-4" /></span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{d.label}</span>
          <span className="block text-[11.5px] text-ink-3">{fmtDate(pub.at)}</span>
        </span>
      </div>

      <div className="col-start-2 md:col-start-auto">
        <Chip tone={STATUS[pub.status].tone} size="sm">{STATUS[pub.status].label}</Chip>
      </div>

      <div className="col-start-2 md:col-start-auto md:justify-self-end">
        {flagged ? (
          <Button size="sm" variant="navy" onClick={onTakeDown} disabled={!canPublish}>Mark as taken down</Button>
        ) : pub.status === 'live' ? (
          <Button size="sm" variant="ghost" onClick={onTakeDown} disabled={!canPublish}>Take down</Button>
        ) : (
          <span className="text-[12px] text-ink-3">Off the channel</span>
        )}
      </div>
    </motion.li>
  )
}
