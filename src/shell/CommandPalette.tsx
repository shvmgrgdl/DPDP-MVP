import * as React from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router'
import * as DialogP from '@radix-ui/react-dialog'
import { useApp } from '@/store/app'
import { NAV_META } from '@/roles/roles'
import { Search, User, Image as ImageIcon, Inbox, Building2, ArrowRight } from 'lucide-react'

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen)
  const setUI = useApp((s) => s.setUI)
  const students = useApp((s) => s.students)
  const requests = useApp((s) => s.requests)
  const vendors = useApp((s) => s.vendors)
  const events = useApp((s) => s.events)
  const navigate = useNavigate()
  const [q, setQ] = React.useState('')
  const go = (path: string) => { setUI({ paletteOpen: false }); setQ(''); navigate(path) }
  const studentHits = q.length >= 2 ? students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : students.filter((s) => s.hero).slice(0, 5)
  const item = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-sunken'
  return (
    <DialogP.Root open={open} onOpenChange={(v) => setUI({ paletteOpen: v })}>
      <DialogP.Portal>
        <DialogP.Overlay className="fixed inset-0 z-50 bg-navy/25" />
        <DialogP.Content className="fixed left-1/2 top-[14vh] z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
          <DialogP.Title className="sr-only">Search</DialogP.Title>
          <Command shouldFilter={false} label="Search">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-ink-3" />
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search students, events, requests, vendors, pages…" className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
            </div>
            <Command.List className="max-h-[420px] overflow-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">No results.</Command.Empty>
              <Command.Group heading="Students" className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {studentHits.map((s) => (
                  <Command.Item key={s.id} value={s.id} onSelect={() => go(`/media/students/${s.id}`)} className={item}>
                    <User className="size-4 text-ink-3" /> {s.name} <span className="text-ink-3">· Class {s.classId}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Events" className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {events.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase())).map((e) => (
                  <Command.Item key={e.id} value={e.id} onSelect={() => go(`/media/events/${e.id}`)} className={item}><ImageIcon className="size-4 text-ink-3" /> {e.name}</Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Requests" className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {requests.filter((r) => !q || (r.id + r.summary).toLowerCase().includes(q.toLowerCase())).slice(0, 5).map((r) => (
                  <Command.Item key={r.id} value={r.id} onSelect={() => go(`/requests/${r.id}`)} className={item}><Inbox className="size-4 text-ink-3" /> {r.id} · {r.summary}</Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Vendors" className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {vendors.filter((v) => !q || v.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5).map((v) => (
                  <Command.Item key={v.id} value={v.id} onSelect={() => go(`/trust/vendors`)} className={item}><Building2 className="size-4 text-ink-3" /> {v.name}</Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {Object.values(NAV_META).filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase())).map((n) => (
                  <Command.Item key={n.path} value={n.path} onSelect={() => go(n.path)} className={item}><ArrowRight className="size-4 text-ink-3" /> {n.label}</Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogP.Content>
      </DialogP.Portal>
    </DialogP.Root>
  )
}
