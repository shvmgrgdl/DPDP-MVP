import { Routes, Route } from 'react-router'
import { Overview } from './Overview'
import { Vendors } from './Vendors'
import { Security } from './Security'
import { Incidents } from './Incidents'
import { IncidentDetail } from './IncidentDetail'
import { Retention } from './Retention'
import { Access } from './Access'
import { Training } from './Training'
import { DataMap } from './DataMap'

export default function Module() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="vendors" element={<Vendors />} />
      <Route path="security" element={<Security />} />
      <Route path="incidents" element={<Incidents />} />
      <Route path="incidents/:id" element={<IncidentDetail />} />
      <Route path="retention" element={<Retention />} />
      <Route path="access" element={<Access />} />
      <Route path="training" element={<Training />} />
      <Route path="data-map" element={<DataMap />} />
    </Routes>
  )
}
