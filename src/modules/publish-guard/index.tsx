import { Navigate, Route, Routes } from 'react-router'
import { MotionConfig } from 'motion/react'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import PublishPage from './PublishPage'
import BlurStudio from './BlurStudio'
import LivePosts from './LivePosts'

/**
 * Publish Guard: /publish (destination check + safe-set export), /publish/blur/:assetId (Blur Studio), /publish/live.
 * Guest roles (photographer, parent, partner) and class-scoped teachers never see the school-wide library here;
 * oversight roles without the publish ability get a read-only view (export buttons are disabled).
 */
export default function PublishGuard() {
  const role = useApp((s) => s.role)
  const def = ROLE[role]
  if (def.nav.length === 0 || def.mobile || def.scope) return <Navigate to={def.home} replace />
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route index element={<PublishPage />} />
        <Route path="blur/:assetId" element={<BlurStudio />} />
        <Route path="live" element={<LivePosts />} />
        <Route path="*" element={<Navigate to="/publish" replace />} />
      </Routes>
    </MotionConfig>
  )
}
