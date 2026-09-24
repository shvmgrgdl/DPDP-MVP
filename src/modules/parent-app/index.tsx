import { Routes, Route, Navigate, Outlet } from 'react-router'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import Home from './pages/Home'
import Setup from './pages/Setup'
import Choices from './pages/Choices'
import Photos from './pages/Photos'
import RequestsPage from './pages/Requests'
import History from './pages/History'

function TabLayout() {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}

export default function Module() {
  return (
    <Routes>
      <Route path="setup" element={<Setup />} />
      <Route element={<TabLayout />}>
        <Route index element={<Home />} />
        <Route path="choices" element={<Choices />} />
        <Route path="photos" element={<Photos />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/parent" replace />} />
    </Routes>
  )
}
