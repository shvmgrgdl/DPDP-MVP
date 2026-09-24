import { Navigate, Route, Routes, useParams } from 'react-router'
import { SearchX } from 'lucide-react'
import { Button, Card, Empty } from '@/design/ui'
import { useApp } from '@/store/app'
import { Home } from './Home'
import { Gallery } from './Gallery'
import { ProofCard } from './ProofCard'
import { Review } from './Review'
import { StudentPage } from './Student'

/** Remount per photo so face selection and blur preview reset on prev/next. */
function ProofCardRoute() {
  const { assetId } = useParams()
  return <ProofCard key={assetId} />
}

function Missing() {
  return <Card><Empty icon={<SearchX className="size-6" />} title="This page isn’t here" body="Head back to Media Safe to find photos, events and students." action={<Button to="/media">Back to Media Safe</Button>} /></Card>
}

export default function MediaSafe() {
  const role = useApp((s) => s.role)
  // Photographers are upload-only and never see names.
  if (role === 'photographer') return <Navigate to="/media/upload/portal" replace />
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="events/:eventId" element={<Gallery />} />
      <Route path="photos/:assetId" element={<ProofCardRoute />} />
      <Route path="review" element={<Review />} />
      <Route path="students/:studentId" element={<StudentPage />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  )
}
