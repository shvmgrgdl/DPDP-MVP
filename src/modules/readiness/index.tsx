import { Navigate, Route, Routes } from 'react-router'
import { Readiness } from './Readiness'

/** Readiness Engine — mounted at /readiness/*. */
export default function ReadinessModule() {
  return (
    <Routes>
      <Route index element={<Readiness />} />
      <Route path="*" element={<Navigate to="/readiness" replace />} />
    </Routes>
  )
}
