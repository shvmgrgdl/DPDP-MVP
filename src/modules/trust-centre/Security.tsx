import * as React from 'react'
import { toast } from 'sonner'
import { Upload, ShieldCheck } from 'lucide-react'
import { useApp, personName } from '@/store/app'
import type { Control } from '@/data/types'
import { PageHeader, Card, Chip, Kpi, Button, Avatar } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { addControlEvidence, CONTROL_STATUS_META } from './shared'

function ControlRow({ control }: { control: Control }) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const owner = personName(control.ownerId)
  const meta = CONTROL_STATUS_META[control.status]
  const onFile = (f?: File) => {
    if (!f) return
    addControlEvidence(control.id, `Evidence uploaded for “${control.title}”: ${f.name}`, { filename: f.name, size: f.size, type: f.type || 'unknown' })
    toast.success(`Evidence attached to “${control.title}”`)
    if (fileRef.current) fileRef.current.value = ''
  }
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{control.title}</span>
            <Chip tone={meta.tone} size="sm">{meta.label}</Chip>
          </div>
          <p className="mt-1 text-sm text-ink-2">{control.detail}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-3">
            <span>{control.ruleRef}</span>
            <span className="flex items-center gap-1.5"><Avatar name={owner} size={16} /> {owner}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              Evidence: {control.evidenceIds.map((id, i) => <React.Fragment key={id}>{i > 0 && ','} <EvidenceLink id={id} /></React.Fragment>)}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>Upload evidence</Button>
        </div>
      </div>
    </Card>
  )
}

export function Security() {
  const controls = useApp((s) => s.controls)
  const inPlace = controls.filter((c) => c.status === 'in-place').length
  const partial = controls.filter((c) => c.status === 'partial').length
  const missing = controls.filter((c) => c.status === 'missing').length

  return (
    <div>
      <PageHeader eyebrow="Trust Centre" title="Security safeguards"
        subtitle="The “reasonable security safeguards” DPDP Rule 6 expects — encryption, access control, logs, backups and training — each with an owner and evidence." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="In place" value={inPlace} tone="ok" icon={<ShieldCheck className="size-4" />} />
        <Kpi label="Partly in place" value={partial} tone={partial ? 'warn' : 'ok'} />
        <Kpi label="Missing" value={missing} tone={missing ? 'risk' : 'ok'} />
      </div>
      <div className="space-y-3">
        {controls.map((c) => <ControlRow key={c.id} control={c} />)}
      </div>
    </div>
  )
}
