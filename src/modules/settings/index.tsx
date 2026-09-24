import { Routes, Route } from 'react-router'
import { PageHeader, Card, Empty } from '@/design/ui'

function Placeholder() {
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" />
      <Card><Empty title="Being built" body="This module is part of the first draft build." /></Card>
    </div>
  )
}

export default function Module() {
  return (
    <Routes>
      <Route path="*" element={<Placeholder />} />
    </Routes>
  )
}
