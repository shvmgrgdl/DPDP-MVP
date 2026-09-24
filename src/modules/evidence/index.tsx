import { Routes, Route } from 'react-router'
import { EvidenceVault } from './EvidenceVault'

export default function Module() {
  return (
    <Routes>
      <Route index element={<EvidenceVault />} />
    </Routes>
  )
}
