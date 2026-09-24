import * as React from 'react'
import { Link } from 'react-router'
import * as Pop from '@radix-ui/react-popover'
import { Check, ChevronRight, Globe, Lock, Minus, Printer, Search, Undo2, Users, X } from 'lucide-react'
import type { FaceInstance, MediaAsset, PermissionStatus, Student, Verdict } from '@/data/types'
import type { Summary } from '@/engine/permission'
import { MEDIA_PURPOSES, VERDICT_META } from '@/data/reference'
import { Avatar, Chip } from '@/design/ui'
import { coverBox } from '@/design/media'
import { InstagramIcon } from '@/design/brand-icons'
import { useApp, pkey } from '@/store/app'
import { cn } from '@/lib/utils'
import { DEST_KEYS, DEST_LABEL, PURPOSE_SHORT, STATUS_TONE, STATUS_WORD, searchStudents, useClassLabel, type MediaDest } from './lib'

export const DEST_ICON: Record<MediaDest, React.ReactNode> = {
  instagram: <InstagramIcon className="size-4" />, website: <Globe className="size-4" />, print: <Printer className="size-4" />, 'private-gallery': <Users className="size-4" />,
}

export function DestSwitch({ value, onChange, className }: { value: MediaDest; onChange: (d: MediaDest) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Where will this be shared?" className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-sunken p-1', className)}>
      {DEST_KEYS.map((k) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all',
            value === k ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:bg-surface/60 hover:text-ink')}>
          {DEST_ICON[k]}{DEST_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

/** Square crop centred on one face (no overlays on the child). */
export function FaceCrop({ asset, face, size = 96, zoom = 1.9, className }: { asset: MediaAsset; face: FaceInstance; size?: number; zoom?: number; className?: string }) {
  const [x, y, w, h] = face.box
  const W = asset.w, H = asset.h
  const s = Math.min(Math.max(w * W, h * H) * zoom, W, H)
  const x0 = Math.min(Math.max((x + w / 2) * W - s / 2, 0), W - s)
  const y0 = Math.min(Math.max((y + h / 2) * H - s / 2, 0), H - s)
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-2xl bg-sunken', className)} style={{ width: size, height: size }}>
      <img src={asset.src} alt="" loading="lazy" draggable={false} className="absolute max-w-none"
        style={{ width: `${(W / s) * 100}%`, left: `${(-x0 / s) * 100}%`, top: `${(-y0 / s) * 100}%` }} />
    </div>
  )
}

/** Soft outline around one face inside a PhotoFaces container of the given aspect. */
export function FaceOutline({ asset, face, aspect }: { asset: MediaAsset; face: FaceInstance; aspect: number }) {
  const p = coverBox(face.box, asset.w / asset.h, aspect, 0.2)
  return <span className="pointer-events-none absolute rounded-[40%] border-2 border-white shadow-[0_0_0_2px_rgba(29,78,216,.55)]" style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }} />
}

const statusIcon: Record<PermissionStatus, React.ReactNode> = {
  granted: <Check className="size-3.5" strokeWidth={2.5} />, denied: <X className="size-3.5" strokeWidth={2.5} />,
  withdrawn: <Undo2 className="size-3.5" strokeWidth={2.25} />, pending: <Minus className="size-3.5" strokeWidth={2.25} />,
}
export function StatusChip({ status, size = 'md', children }: { status: PermissionStatus; size?: 'sm' | 'md'; children?: React.ReactNode }) {
  return <Chip tone={STATUS_TONE[status]} icon={statusIcon[status]} size={size}>{children ?? STATUS_WORD[status]}</Chip>
}

/** A child's five media choices as plain chips. */
export function PermissionChips({ studentId, className }: { studentId: string; className?: string }) {
  const permissions = useApp((s) => s.permissions)
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {MEDIA_PURPOSES.map((p) => {
        const st = permissions[pkey(studentId, p.key)]?.status ?? 'pending'
        return (
          <span key={p.key} title={`${p.label}: ${STATUS_WORD[st]}`}>
            <StatusChip status={st}>{PURPOSE_SHORT[p.key]}</StatusChip>
          </span>
        )
      })}
    </div>
  )
}

export function ProtectedChip() {
  return <Chip tone="risk" icon={<Lock className="size-3.5" />}>Protected — never published</Chip>
}

/* ---------- verdict summary ---------- */
export const VERDICT_ORDER: Verdict[] = ['ready', 'needs-blur', 'keep-private', 'check-faces']
export const VERDICT_DOT: Record<Verdict, string> = { ready: 'bg-ok', 'needs-blur': 'bg-marigold', 'keep-private': 'bg-risk', 'check-faces': 'bg-info' }

export function SummaryBar({ s, className }: { s: Summary; className?: string }) {
  return (
    <div className={cn('flex h-2 overflow-hidden rounded-full bg-sunken', className)}>
      {VERDICT_ORDER.map((v) => s[v] > 0 && <div key={v} className={cn('h-full transition-all duration-700', VERDICT_DOT[v])} style={{ width: `${(s[v] / Math.max(1, s.total)) * 100}%` }} />)}
    </div>
  )
}
export function SummaryLegend({ s, className }: { s: Summary; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-1.5', className)}>
      {VERDICT_ORDER.map((v) => (
        <div key={v} className={cn('flex items-center gap-2 text-[12.5px]', s[v] ? 'text-ink-2' : 'text-ink-3')}>
          <span className={cn('size-2 shrink-0 rounded-full', VERDICT_DOT[v], !s[v] && 'opacity-30')} />
          <span className="num font-semibold text-ink">{s[v]}</span>
          <span className="truncate">{VERDICT_META[v].label}</span>
        </div>
      ))}
    </div>
  )
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3.5" />}
          {it.to ? <Link to={it.to} className="rounded px-1 py-0.5 font-medium text-ink-2 hover:bg-sunken hover:text-ink">{it.label}</Link> : <span className="px-1 font-medium text-ink">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  )
}

/** Searchable student picker (popover). Suggestions come from Class 5B. */
export function StudentPicker({ onPick, scope, children }: { onPick: (s: Student) => void; scope?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const students = useApp((s) => s.students)
  const classLabel = useClassLabel()
  const suggested = React.useMemo(() => students.filter((s) => s.classId === (scope ?? '5B')).sort((a, b) => Number(!!b.hero) - Number(!!a.hero)).slice(0, 6), [students, scope])
  const list = q.trim() ? searchStudents(students, q, scope, 8) : suggested
  return (
    <Pop.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQ('') }}>
      <Pop.Trigger asChild>{children}</Pop.Trigger>
      <Pop.Portal>
        <Pop.Content sideOffset={8} align="start" className="z-50 w-[320px] rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search students"
              className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/20" />
          </div>
          <div className="label-caps px-2 pb-1 pt-3">{q.trim() ? 'Matches' : `Suggested · Class ${scope ?? '5B'}`}</div>
          <ul className="max-h-72 overflow-y-auto">
            {list.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => { onPick(s); setOpen(false); setQ('') }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-sunken focus:bg-sunken focus:outline-none">
                  <Avatar name={s.name} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{s.name}</span>
                  <span className="text-xs text-ink-3">{classLabel(s.classId)}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-2 py-4 text-center text-sm text-ink-3">No student called “{q}”.</li>}
          </ul>
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}
