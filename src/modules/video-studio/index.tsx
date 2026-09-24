import { Routes, Route } from 'react-router'
import { Library } from './Library'
import { Studio } from './Studio'

/** Video Studio: /video (library) and /video/:assetId (privacy studio). */
export default function Module() {
  return (
    <Routes>
      <Route index element={<Library />} />
      <Route path=":assetId" element={<Studio />} />
      <Route path="*" element={<Library />} />
    </Routes>
  )
}
