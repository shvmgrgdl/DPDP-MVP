import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { PageHeader, Tabs } from '@/design/ui'
import { useApp } from '@/store/app'
import Overview from './pages/Overview'
import Purposes from './pages/Purposes'
import Notices from './pages/Notices'
import Permissions from './pages/Permissions'
import Verification from './pages/Verification'
import Campaign from './pages/Campaign'

const SECTIONS = [
  { value: '', label: 'Overview' },
  { value: 'purposes', label: 'Purposes' },
  { value: 'notices', label: 'Notices' },
  { value: 'permissions', label: 'Permissions' },
  { value: 'verification', label: 'Verification' },
  { value: 'campaign', label: 'Campaign' },
] as const

function Layout() {
  const loc = useLocation()
  const navigate = useNavigate()
  const notices = useApp((s) => s.notices)
  const guardians = useApp((s) => s.guardians)
  const draftCount = notices.filter((n) => n.status === 'draft').length
  const pendingCount = guardians.filter((g) => !g.onboarded).length
  const badge: Partial<Record<string, number>> = { notices: draftCount, permissions: pendingCount }

  const seg = loc.pathname.split('/')[2] ?? ''

  return (
    <div>
      <PageHeader
        eyebrow="Privacy Hub"
        title="Notices & permissions"
        subtitle="What parents were told, what they chose, and how verified consent is captured — purpose by purpose."
      />
      <Tabs
        value={seg}
        onValueChange={(v) => navigate(v ? `/privacy/${v}` : '/privacy')}
        tabs={SECTIONS.map((s) => ({ value: s.value, label: s.label, count: badge[s.value] || undefined }))}
        className="mb-6"
      />
      <Outlet />
    </div>
  )
}

export default function Module() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="purposes" element={<Purposes />} />
        <Route path="notices" element={<Notices />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="verification" element={<Verification />} />
        <Route path="campaign" element={<Campaign />} />
      </Route>
      <Route path="*" element={<Navigate to="/privacy" replace />} />
    </Routes>
  )
}
