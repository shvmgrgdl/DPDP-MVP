import { NavLink } from 'react-router'
import { Home, SlidersHorizontal, Images, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang, tr } from './i18n'

const TABS = [
  { to: '/parent', end: true, icon: Home, en: 'Home', hi: 'होम' },
  { to: '/parent/choices', end: false, icon: SlidersHorizontal, en: 'Choices', hi: 'पसंद' },
  { to: '/parent/photos', end: false, icon: Images, en: 'Photos', hi: 'फ़ोटो' },
  { to: '/parent/requests', end: false, icon: Inbox, en: 'Requests', hi: 'अनुरोध' },
] as const

export function TabBar() {
  const lang = useLang()
  return (
    <nav className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur" aria-label="Parent app sections">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => cn('flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors', isActive ? 'text-azure' : 'text-ink-3')}
        >
          {({ isActive }) => (
            <>
              <t.icon className="size-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              <span lang={lang === 'hi' ? 'hi' : undefined}>{tr(lang, t.en, t.hi)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
