import { Routes, Route } from 'react-router'
import Home from './Home'
import Desk from './Desk'
import Partner from './Partner'

export default function Module() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="desk" element={<Desk />} />
      <Route path="partner" element={<Partner />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
