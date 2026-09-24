import { NavLink, Outlet } from 'react-router'
import { PageHeader } from '@/design/ui'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { path: 'profile', label: 'School profile' },
  { path: 'people', label: 'People & roles' },
  { path: 'notifications', label: 'Notifications' },
  { path: 'languages', label: 'Languages' },
  { path: 'integrations', label: 'Integrations' },
  { path: 'plan', label: 'Plan' },
  { path: 'credits', label: 'Image credits' },
]

export default function Layout() {
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" subtitle="School profile, people, notifications and how this demo is put together." />
      <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl bg-sunken p-1">
        {SECTIONS.map((s) => (
          <NavLink key={s.path} to={s.path}
            className={({ isActive }) => cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors', isActive ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink')}>
            {s.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
