import * as React from 'react'
import { toast } from 'sonner'
import { Check, X, Send, RefreshCw, Ban, KeyRound } from 'lucide-react'
import { useApp } from '@/store/app'
import type { Vendor } from '@/data/types'
import { PageHeader, Card, Chip, Button, Sheet, Tip, Divider } from '@/design/ui'
import { addDays, cn, fmtDate, fmtDateTime, relDays } from '@/lib/utils'
import { CLAUSES, RISK_TONE, sendClauseAddendum } from './shared'

function ClauseDots({ vendor, labelled }: { vendor: Vendor; labelled?: boolean }) {
  return (
    <div className={cn('flex items-center gap-1.5', labelled && 'flex-col items-stretch gap-2')}>
      {CLAUSES.map((c) => {
        const has = vendor.contract[c.key]
        const dot = (
          <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', has ? 'bg-ok-bg text-ok' : 'bg-risk-bg text-risk')}>
            {has ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
          </span>
        )
        return labelled ? (
          <div key={c.key} className="flex items-center gap-2 text-[13px] text-ink-2">{dot}{c.label}</div>
        ) : (
          <Tip key={c.key} content={c.label}>{dot}</Tip>
        )
      })}
    </div>
  )
}

function PhotographerToken({ vendor }: { vendor: Vendor & { access: NonNullable<Vendor['access']> } }) {
  const updateVendor = useApp((s) => s.updateVendor)
  const a = vendor.access
  const expired = new Date(a.expiresAt).getTime() < Date.now()
  const status = a.revoked ? { label: 'Revoked', tone: 'risk' as const } : expired ? { label: 'Expired', tone: 'warn' as const } : { label: 'Active', tone: 'ok' as const }
  return (
    <div className="rounded-lg border border-line bg-sunken p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[12px] text-ink-2"><KeyRound className="size-3.5 text-ink-3" /> {a.token}</span>
        <Chip tone={status.tone} size="sm" icon={false}>{status.label}</Chip>
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3">{a.scope}</p>
      <p className="text-[12px] text-ink-3">Expires {fmtDateTime(a.expiresAt)}</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} disabled={a.revoked}
          onClick={() => { updateVendor(vendor.id, { access: { ...a, expiresAt: addDays(new Date(Math.max(new Date(a.expiresAt).getTime(), Date.now())).toISOString(), 7), revoked: false } }); toast.success(`${vendor.name} access extended by 7 days`) }}>
          Extend 7 days
        </Button>
        <Button size="sm" variant="danger" icon={<Ban className="size-3.5" />} disabled={a.revoked}
          onClick={() => { updateVendor(vendor.id, { access: { ...a, revoked: true } }); toast.success(`${vendor.name} access revoked`) }}>
          Revoke
        </Button>
      </div>
    </div>
  )
}

function VendorCard({ vendor, onOpen }: { vendor: Vendor; onOpen: () => void }) {
  const tasks = useApp((s) => s.tasks)
  const missing = CLAUSES.filter((c) => !vendor.contract[c.key])
  const addendumSent = tasks.some((t) => t.kind === 'contract' && t.status === 'open' && t.title.includes(vendor.name))
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-left hover:underline">
          <div className="truncate text-[15px] font-semibold text-ink">{vendor.name}</div>
          <div className="text-xs text-ink-3">{vendor.category} · {vendor.service}</div>
        </button>
        <Chip tone={RISK_TONE[vendor.riskTier]} size="sm" icon={false} className="shrink-0 capitalize">{vendor.riskTier} risk</Chip>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {vendor.dataShared.slice(0, 3).map((d) => <Chip key={d} tone="muted" size="sm" icon={false}>{d}</Chip>)}
        {vendor.dataShared.length > 3 && <span className="self-center text-[11px] text-ink-3">+{vendor.dataShared.length - 3} more</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div><div className="text-ink-3">Storage</div><div className="font-medium text-ink-2">{vendor.storageLocation}</div></div>
        <div><div className="text-ink-3">Review due</div><div className="font-medium text-ink-2">{relDays(vendor.reviewDue)}</div></div>
      </div>
      <Divider className="my-3" />
      <div className="flex items-center justify-between">
        <ClauseDots vendor={vendor} />
        <span className="text-[11px] text-ink-3">{5 - missing.length}/5 clauses</span>
      </div>
      {vendor.access && <div className="mt-3"><PhotographerToken vendor={vendor as Vendor & { access: NonNullable<Vendor['access']> }} /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onOpen}>View details</Button>
        {missing.length > 0 && (
          <Button size="sm" variant={addendumSent ? 'secondary' : 'primary'} disabled={addendumSent} icon={<Send className="size-3.5" />}
            onClick={() => { sendClauseAddendum(vendor); toast.success(`Clause addendum sent to ${vendor.name}`) }}>
            {addendumSent ? 'Addendum sent' : 'Send clause addendum'}
          </Button>
        )}
      </div>
    </Card>
  )
}

function VendorSheet({ vendor, onOpenChange }: { vendor: Vendor | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={!!vendor} onOpenChange={onOpenChange} title={vendor?.name ?? ''} description={vendor ? `${vendor.category} · ${vendor.status}` : undefined} width={460}>
      {vendor && (
        <div className="space-y-5">
          <div><div className="label-caps mb-1.5">Service</div><p className="text-sm text-ink-2">{vendor.service}</p></div>
          <div><div className="label-caps mb-1.5">Data shared</div><div className="flex flex-wrap gap-1.5">{vendor.dataShared.map((d) => <Chip key={d} tone="muted" size="sm" icon={false}>{d}</Chip>)}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="label-caps mb-1">Risk tier</div><Chip tone={RISK_TONE[vendor.riskTier]} size="sm" icon={false} className="capitalize">{vendor.riskTier}</Chip></div>
            <div><div className="label-caps mb-1">Storage location</div><p className="text-sm text-ink-2">{vendor.storageLocation}</p></div>
            <div><div className="label-caps mb-1">Review due</div><p className="text-sm text-ink-2">{fmtDate(vendor.reviewDue)}</p></div>
            <div><div className="label-caps mb-1">Status</div><p className="text-sm capitalize text-ink-2">{vendor.status}</p></div>
          </div>
          {vendor.access && <div><div className="label-caps mb-1.5">Photographer access</div><PhotographerToken vendor={vendor as Vendor & { access: NonNullable<Vendor['access']> }} /></div>}
          <div>
            <div className="label-caps mb-2">Contract clauses</div>
            <ClauseDots vendor={vendor} labelled />
          </div>
          {Object.values(vendor.contract).some((c) => !c) && (
            <Button className="w-full" icon={<Send className="size-4" />} onClick={() => { sendClauseAddendum(vendor); toast.success(`Clause addendum sent to ${vendor.name}`) }}>Send clause addendum</Button>
          )}
        </div>
      )}
    </Sheet>
  )
}

export function Vendors() {
  const vendors = useApp((s) => s.vendors)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const detail = vendors.find((v) => v.id === openId) ?? null

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Vendors"
        subtitle="Every app and vendor that touches student data, what they receive, and whether the right contract clauses are in place." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((v) => <VendorCard key={v.id} vendor={v} onOpen={() => setOpenId(v.id)} />)}
      </div>
      <VendorSheet vendor={detail} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  )
}
