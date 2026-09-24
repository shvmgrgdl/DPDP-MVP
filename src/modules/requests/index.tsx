import { Routes, Route } from 'react-router'
import { RequestsList } from './RequestsList'
import { RequestDetail } from './RequestDetail'

export default function Module() {
  return (
    <Routes>
      <Route index element={<RequestsList />} />
      <Route path=":id" element={<RequestDetail />} />
    </Routes>
  )
}
