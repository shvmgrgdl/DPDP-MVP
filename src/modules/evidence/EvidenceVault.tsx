import * as React from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Search, FileDown, ShieldCheck, ChevronRight, X } from 'lucide-react'
import { useApp, personName } from '@/store/app'
import type { Evidence } from '@/data/types'
import { PageHeader, Card, Chip, Empty, Button, Input, Mono } from '@/design/ui'
import { fmtDateTime, relDays, cn } from '@/lib/utils'
import { EVIDENCE_TYPES, EVIDENCE_TYPE_META, buildAuditPack, downloadBytes } from './lib'
import { VerifyChainDialog } from './VerifyChainDialog'

async function exportAuditPack() {
  const s = useApp.getState()
  await new Promise((r) => setTimeout(r, 450))
  const bytes = buildAuditPack({ schoolName: s.school.name, generatedAt: fmtDateTime(new Date().toISOString()), evidence: s.evidence, obligations: s.obligations, vendors: s.vendors })
  downloadBytes(bytes, `${s.school.shortName.replace(/\s+/g, '-')}-DPDP-audit-pack-${new Date().toISOString().slice(0, 10)}.zip`)
  s.addEvidence({ type: 'export', title: `Audit pack exported — ${s.evidence.length} evidence records, ${s.obligations.length} obligations, ${s.vendors.length} vendors`, actor: s.role, refs: [] })
}

export function EvidenceVault() {
  const evidence = useApp((s) => s.evidence)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = React.useState('')
  const [verifyOpen, setVerifyOpen] = React.useState(false)
  const typeParam = params.get('type')
  const typeFilter = (typeParam && EVIDENCE_TYPES.includes(typeParam as Evidence['type'])) ? (typeParam as Evidence['type']) : 'all'
  const setTypeFilter = (t: Evidence['type'] | 'all') => setParams(t === 'all' ? {} : { type: t }, { replace: true })

  const counts = React.useMemo(() => evidence.reduce<Record<string, number>>((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc }, {}), [evidence])
  const needle = q.trim().toLowerCase()
  const list = React.useMemo(() => {
    return evidence
      .filter((e) => typeFilter === 'all' || e.type === typeFilter)
      .filter((e) => !needle || [e.id, e.title, e.type, personName(e.actor), e.refs.join(' ')].join(' ').toLowerCase().includes(needle))
      .slice().sort((a, b) => +new Date(b.at) - +new Date(a.at))
  }, [evidence, typeFilter, needle])

  return (
    <div>
      <PageHeader eyebrow="Evidence" title="Evidence vault"
        subtitle="Every decision — a permission, a publication, a request, a review — leaves a tamper-evident record here, chained to the one before it."
        actions={<>
          <Button variant="secondary" icon={<ShieldCheck className="size-4" />} onClick={() => setVerifyOpen(true)}>Verify chain</Button>
          <Button icon={<FileDown className="size-4" />} onClick={() => toast.promise(exportAuditPack(), { loading: 'Building audit pack…', success: 'Audit pack downloaded', error: 'Could not build the audit pack' })}>Export audit pack</Button>
        </>} />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, person, ID…" className="pl-9 pr-8" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"><X className="size-4" /></button>}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setTypeFilter('all')} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold transition-colors', typeFilter === 'all' ? 'bg-azure text-white' : 'bg-sunken text-ink-2 hover:bg-line')}>
          All <span className="opacity-70">{evidence.length}</span>
        </button>
        {EVIDENCE_TYPES.map((t) => {
          const meta = EVIDENCE_TYPE_META[t]
          const Icon = meta.icon
          const active = typeFilter === t
          return (
            <button key={t} type="button" onClick={() => setTypeFilter(active ? 'all' : t)}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors', active ? 'bg-azure text-white' : 'bg-sunken text-ink-2 hover:bg-line')}>
              <Icon className="size-3.5" /> {meta.label} <span className="opacity-70">{counts[t] ?? 0}</span>
            </button>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        {list.length === 0 && <Empty icon={<Search className="size-6" />} title="No matching records" body="Try a different search term or clear the type filter." />}
        {list.map((e) => {
          const meta = EVIDENCE_TYPE_META[e.type]
          const Icon = meta.icon
          return (
            <button type="button" key={e.id} onClick={() => useApp.getState().setUI({ evidenceDrawer: e.id })}
              className="flex w-full items-center gap-3.5 border-b border-line px-4 py-3.5 text-left last:border-0 hover:bg-sunken">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-azure-50 text-azure"><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{e.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                  <span>{personName(e.actor)}</span><span>·</span><span>{fmtDateTime(e.at)}</span><span>·</span><span>{relDays(e.at)}</span>
                  <span>·</span><Mono>{e.id}</Mono>
                </div>
              </div>
              <Chip tone="muted" size="sm" icon={false} className="hidden shrink-0 sm:inline-flex">{meta.label}</Chip>
              <ChevronRight className="size-4 shrink-0 text-ink-3" />
            </button>
          )
        })}
      </Card>

      <VerifyChainDialog open={verifyOpen} onOpenChange={setVerifyOpen} />
    </div>
  )
}
