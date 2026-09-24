import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import * as DD from '@radix-ui/react-dropdown-menu'
import * as Pop from '@radix-ui/react-popover'
import {
  Home, Compass, ScrollText, Images, ShieldCheck, Clapperboard, Inbox, Building2, FileCheck2, Users, MessageCircle, Settings, Cpu,
  Search, Bell, ChevronDown, Check, HelpCircle, Smartphone,
} from 'lucide-react'
import { useApp } from '@/store/app'
import { ROLES, ROLE, NAV_META, type NavKey } from '@/roles/roles'
import { Avatar } from '@/design/ui'
import { PhoneFrame } from '@/design/media'
import { cn, fmtDateTime } from '@/lib/utils'
import { EvidenceDrawer } from './EvidenceDrawer'
import { DemoDirector } from './DemoDirector'
import { CommandPalette } from './CommandPalette'
import { StoryBar } from './StoryBar'

const NAV_ICON: Record<NavKey, React.ReactNode> = {
  home: <Home className="size-[18px]" />, readiness: <Compass className="size-[18px]" />, privacy: <ScrollText className="size-[18px]" />,
  media: <Images className="size-[18px]" />, publish: <ShieldCheck className="size-[18px]" />, video: <Clapperboard className="size-[18px]" />,
  requests: <Inbox className="size-[18px]" />, trust: <Building2 className="size-[18px]" />, evidence: <FileCheck2 className="size-[18px]" />,
  experts: <Users className="size-[18px]" />, ask: <MessageCircle className="size-[18px]" />, settings: <Settings className="size-[18px]" />, tech: <Cpu className="size-[18px]" />,
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#131B2E" />
      <path d="M16 6.5l8 3v6.2c0 5-3.4 8.6-8 10.3-4.6-1.7-8-5.3-8-10.3V9.5l8-3z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.2 16.2l2.6 2.6 5-5.2" fill="none" stroke="#7FB3FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sidebar() {
  const role = useApp((s) => s.role)
  const school = useApp((s) => s.school)
  const setUI = useApp((s) => s.setUI)
  const tasks = useApp((s) => s.tasks)
  const requests = useApp((s) => s.requests)
  const clicks = React.useRef(0)
  const def = ROLE[role]
  const badge: Partial<Record<NavKey, number>> = {
    requests: requests.filter((r) => !['resolved', 'closed'].includes(r.status)).length,
    home: tasks.filter((t) => t.status === 'open' && t.kind === 'approval').length,
  }
  return (
    <aside className="no-print sticky top-0 hidden h-screen lg:flex w-[248px] shrink-0 flex-col border-r border-line bg-[#fbfaf7]">
      <button type="button" className="flex items-center gap-3 px-5 pt-5 pb-4 text-left"
        onClick={() => { clicks.current++; if (clicks.current >= 5) { clicks.current = 0; setUI({ directorOpen: true }) } }}>
        <BrandMark />
        <div className="leading-tight">
          <div className="font-display text-[17px] font-semibold text-ink">School DPDP OS</div>
          <div className="text-[11px] text-ink-3">Privacy, handled.</div>
        </div>
      </button>
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
        {school.logoDataUrl ? <img src={school.logoDataUrl} alt="" className="size-8 rounded-lg object-contain" /> : <div className="flex size-8 items-center justify-center rounded-lg bg-[#fdf0d9] text-[#8a5300] font-display font-bold">{school.shortName[0]}</div>}
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-ink">{school.name}</div>
          <div className="truncate text-[11px] text-ink-3">{school.city} · {school.board}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Main">
        {def.nav.map((k) => (
          <NavLink key={k} to={NAV_META[k].path}
            className={({ isActive }) => cn('group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
              isActive ? 'bg-navy text-white' : 'text-ink-2 hover:bg-sunken hover:text-ink')}>
            {NAV_ICON[k]}
            <span className="flex-1">{NAV_META[k].label}</span>
            {!!badge[k] && <span className="rounded-full bg-marigold px-1.5 text-[11px] font-bold text-navy">{badge[k]}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <button type="button" onClick={() => setUI({ paletteOpen: true })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink-2 hover:bg-sunken">
          <HelpCircle className="size-[18px]" /> Help & guided tour
        </button>
        <p className="px-3 pt-2 text-[10.5px] leading-snug text-ink-3">Not legal advice. Templates reviewed by empanelled privacy counsel.</p>
      </div>
    </aside>
  )
}

function RoleSwitcher() {
  const role = useApp((s) => s.role)
  const setRole = useApp((s) => s.setRole)
  const navigate = useNavigate()
  return (
    <DD.Root>
      <DD.Trigger className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-1.5 pl-3 pr-2.5 text-[13px] font-semibold text-ink hover:bg-sunken">
        <span className="text-ink-3 font-medium">Viewing as</span> {ROLE[role].label.split(' (')[0]} <ChevronDown className="size-4 text-ink-3" />
      </DD.Trigger>
      <DD.Portal>
        <DD.Content align="end" sideOffset={8} className="z-50 w-[360px] rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
          <div className="px-3 pb-2 pt-1.5 text-[12px] text-ink-3">Switch roles to see exactly what each person can see.</div>
          {ROLES.map((r) => (
            <DD.Item key={r.key} onSelect={() => { setRole(r.key); navigate(r.home) }}
              className={cn('flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 outline-none data-[highlighted]:bg-sunken', r.key === role && 'bg-azure-50')}>
              <div className="mt-0.5 flex size-5 items-center justify-center">{r.key === role ? <Check className="size-4 text-azure" /> : r.mobile ? <Smartphone className="size-4 text-ink-3" /> : null}</div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">{r.label}</div>
                <div className="text-[12px] text-ink-3">{r.blurb}</div>
              </div>
            </DD.Item>
          ))}
        </DD.Content>
      </DD.Portal>
    </DD.Root>
  )
}

function Notifications() {
  const role = useApp((s) => s.role)
  const all = useApp((s) => s.notifications)
  const markAllRead = useApp((s) => s.markAllRead)
  const navigate = useNavigate()
  const items = all.filter((n) => n.roles.includes(role))
  const unread = items.filter((n) => !n.read).length
  return (
    <Pop.Root>
      <Pop.Trigger className="relative rounded-full p-2 text-ink-2 hover:bg-sunken" aria-label="Notifications">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-risk text-[10px] font-bold text-white">{unread}</span>}
      </Pop.Trigger>
      <Pop.Portal>
        <Pop.Content align="end" sideOffset={8} className="z-50 w-[380px] rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button type="button" className="text-xs font-semibold text-azure" onClick={markAllRead}>Mark all read</button>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {items.length === 0 && <div className="px-3 py-6 text-center text-sm text-ink-3">You’re all caught up.</div>}
            {items.map((n) => (
              <button type="button" key={n.id} onClick={() => n.link && navigate(n.link)} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-sunken">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-line-strong' : 'bg-azure')} />
                <span className="min-w-0">
                  <span className="block text-[13px] text-ink">{n.text}</span>
                  <span className="text-[11px] text-ink-3">{fmtDateTime(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}

function TopBar() {
  const role = useApp((s) => s.role)
  const people = useApp((s) => s.people)
  const guardians = useApp((s) => s.guardians)
  const setUI = useApp((s) => s.setUI)
  const def = ROLE[role]
  const person = people.find((p) => p.id === def.person) ?? guardians.find((g) => g.id === def.person)
  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 lg:hidden"><BrandMark size={28} /><span className="font-display font-semibold">School DPDP OS</span></div>
      <button type="button" onClick={() => setUI({ paletteOpen: true })}
        className="hidden md:flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-ink-3 hover:border-line-strong">
        <Search className="size-4" /> Search students, photos, requests… <kbd className="ml-auto rounded border border-line px-1.5 text-[11px]">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <RoleSwitcher />
        <Notifications />
        {person && <Avatar name={person.name} size={34} />}
      </div>
    </header>
  )
}

/** Layout for guest roles (photographer, partner) and the parent phone. */
function GuestFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="min-h-full">
      <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-6 backdrop-blur">
        <BrandMark size={28} /><span className="font-display font-semibold">School DPDP OS</span>
        <span className="rounded-full bg-sunken px-2.5 py-1 text-[12px] font-semibold text-ink-2">{label}</span>
        <div className="ml-auto flex items-center gap-2"><RoleSwitcher /></div>
      </header>
      {children}
    </div>
  )
}

export function AppShell() {
  const role = useApp((s) => s.role)
  const loc = useLocation()
  const def = ROLE[role]
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); useApp.getState().setUI({ paletteOpen: true }) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); useApp.getState().setUI({ directorOpen: true }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const overlays = (<><EvidenceDrawer /><DemoDirector /><CommandPalette /><StoryBar /></>)

  if (def.mobile && loc.pathname.startsWith('/parent')) {
    return (
      <GuestFrame label="Parent app">
        <div className="flex flex-col items-center gap-6 px-6 py-8 xl:flex-row xl:items-start xl:justify-center xl:gap-16">
          <div className="hidden max-w-xs pt-16 xl:block">
            <div className="label-caps">What parents see</div>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight">One calm screen for every choice.</h2>
            <p className="mt-3 text-[15px] text-ink-2">Parents verify once, read a short notice in English or Hindi, and choose purpose by purpose. Every change is recorded with a timestamp and flows to the school instantly.</p>
          </div>
          <div className="md:block"><PhoneFrame><Outlet /></PhoneFrame></div>
        </div>
        {overlays}
      </GuestFrame>
    )
  }
  if (def.nav.length === 0) {
    return (<GuestFrame label={def.label}><main className="mx-auto max-w-[1200px] px-6 py-8"><Outlet /></main>{overlays}</GuestFrame>)
  }
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      </div>
      {overlays}
    </div>
  )
}
