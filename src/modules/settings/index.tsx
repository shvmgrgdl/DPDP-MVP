import { Routes, Route, Navigate } from 'react-router'
import Layout from './Layout'
import Profile from './Profile'
import People from './People'
import Notifications from './Notifications'
import Languages from './Languages'
import Integrations from './Integrations'
import Plan from './Plan'
import Credits from './Credits'

export default function Module() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="people" element={<People />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="languages" element={<Languages />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="plan" element={<Plan />} />
        <Route path="credits" element={<Credits />} />
        <Route path="*" element={<Navigate to="profile" replace />} />
      </Route>
    </Routes>
  )
}
