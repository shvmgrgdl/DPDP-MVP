import { createHashRouter, Navigate } from 'react-router'
import { AppShell } from '@/shell/AppShell'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'

function RoleHome() {
  const role = useApp((s) => s.role)
  return <Navigate to={ROLE[role].home} replace />
}

const mod = (loader: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await loader()).default })

export const router = createHashRouter([
  { path: '/login', lazy: mod(() => import('@/modules/auth')) },
  { path: '/privacy-centre/*', lazy: mod(() => import('@/modules/privacy-hub/PublicPrivacyCentre')) },
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: RoleHome },
      { path: 'home/*', lazy: mod(() => import('@/modules/coverage')) },
      { path: 'readiness/*', lazy: mod(() => import('@/modules/readiness')) },
      { path: 'privacy/*', lazy: mod(() => import('@/modules/privacy-hub')) },
      { path: 'media/upload/*', lazy: mod(() => import('@/modules/media-upload')) },
      { path: 'media/*', lazy: mod(() => import('@/modules/media-safe')) },
      { path: 'publish/*', lazy: mod(() => import('@/modules/publish-guard')) },
      { path: 'video/*', lazy: mod(() => import('@/modules/video-studio')) },
      { path: 'requests/*', lazy: mod(() => import('@/modules/requests')) },
      { path: 'trust/*', lazy: mod(() => import('@/modules/trust-centre')) },
      { path: 'evidence/*', lazy: mod(() => import('@/modules/evidence')) },
      { path: 'experts/*', lazy: mod(() => import('@/modules/experts')) },
      { path: 'ask/*', lazy: mod(() => import('@/modules/ask')) },
      { path: 'settings/*', lazy: mod(() => import('@/modules/settings')) },
      { path: 'tech/*', lazy: mod(() => import('@/modules/tech')) },
      { path: 'parent/*', lazy: mod(() => import('@/modules/parent-app')) },
      { path: 'reports/*', lazy: mod(() => import('@/modules/coverage/reports')) },
      { path: '*', lazy: mod(() => import('@/modules/NotFound')) },
    ],
  },
])
