import { Navigate, Route, Routes } from 'react-router'
import PublishPage from './PublishPage'
import BlurStudio from './BlurStudio'
import LivePosts from './LivePosts'

/** Publish Guard: /publish (destination check + safe-set export), /publish/blur/:assetId (Blur Studio), /publish/live. */
export default function PublishGuard() {
  return (
    <Routes>
      <Route index element={<PublishPage />} />
      <Route path="blur/:assetId" element={<BlurStudio />} />
      <Route path="live" element={<LivePosts />} />
      <Route path="*" element={<Navigate to="/publish" replace />} />
    </Routes>
  )
}
