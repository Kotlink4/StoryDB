import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { LegacyApp } from './legacy-app/LegacyApp'
import { StylePreview } from './style-preview/StylePreview'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/style-preview/*" element={<StylePreview />} />
        <Route path="/" element={<LegacyApp />} />
        <Route path="/projects/:projectId" element={<LegacyApp />} />
      </Routes>
    </BrowserRouter>
  )
}
