import { Navigate, Route, Routes } from 'react-router'
import { Home } from './Home'
import { AreaDetail } from './AreaDetail'

/** Coverage Centre — mounted at /home/*. */
export default function CoverageModule() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="areas/:area" element={<AreaDetail />} />
      <Route path="areas" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
