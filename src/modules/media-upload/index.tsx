import { Navigate, Route, Routes } from 'react-router'
import { UploadPage } from './UploadPage'
import { PortalPage } from './PortalPage'

/** /media/upload (staff Media X-Ray) and /media/upload/portal (photographer guest portal). */
export default function Module() {
  return (
    <Routes>
      <Route index element={<UploadPage />} />
      <Route path="portal" element={<PortalPage />} />
      <Route path="*" element={<Navigate to="/media/upload" replace />} />
    </Routes>
  )
}
