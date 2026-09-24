import * as React from 'react'
import Fuse from 'fuse.js'
import { Search, X } from 'lucide-react'
import { useApp } from '@/store/app'
import { Avatar, Input } from '@/design/ui'
import { cn } from '@/lib/utils'

/** Fuzzy child search over all 1,512 students → picks the student and their first guardian. */
export function StudentPicker({ studentId, onChange }: { studentId?: string; onChange: (studentId: string) => void }) {
  const students = useApp((s) => s.students)
  const classes = useApp((s) => s.classes)
  const guardians = useApp((s) => s.guardians)
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const fuse = React.useMemo(() => new Fuse(students, { keys: ['name', 'admissionNo'], threshold: 0.32, minMatchCharLength: 2 }), [students])
  const selected = students.find((s) => s.id === studentId)
  const classLabel = (id: string) => classes.find((c) => c.id === id)?.label ?? id

  const hits = q.trim().length >= 2 ? fuse.search(q.trim(), { limit: 8 }).map((r) => r.item) : students.filter((s) => s.hero).slice(0, 6)

  if (selected && !open) {
    const g = guardians.find((x) => x.id === selected.guardianIds[0])
    return (
      <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-sunken px-3 py-2">
        <Avatar name={selected.name} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{selected.name}</div>
          <div className="truncate text-xs text-ink-3">{classLabel(selected.classId)} · Parent: {g?.name ?? '—'}</div>
        </div>
        <button type="button" onClick={() => { setOpen(true); setQ('') }} className="shrink-0 text-xs font-semibold text-azure hover:underline">Change</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input autoFocus={open} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)}
          placeholder="Search child by name or admission no…" className="pl-9 pr-8" />
        {selected && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"><X className="size-4" /></button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {!q.trim() && <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Frequently contacted</div>}
          {hits.length === 0 && <div className="px-3 py-4 text-center text-sm text-ink-3">No matching student.</div>}
          {hits.map((s) => {
            const g = guardians.find((x) => x.id === s.guardianIds[0])
            return (
              <button type="button" key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); setQ('') }}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sunken', s.id === studentId && 'bg-azure-50')}>
                <Avatar name={s.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{s.name} <span className="font-mono text-[11px] text-ink-3">{s.admissionNo}</span></div>
                  <div className="truncate text-xs text-ink-3">{classLabel(s.classId)} · Parent: {g?.name ?? '—'}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
