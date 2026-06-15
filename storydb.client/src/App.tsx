import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { StylePreview } from './style-preview/StylePreview'

const LegacyApp = lazy(() => import('./legacy-app/LegacyApp'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/style-preview/*" element={<StylePreview />} />
        <Route
          path="/"
          element={(
            <Suspense fallback={<div className="sp-empty">Loading...</div>}>
              <LegacyApp />
            </Suspense>
          )}
        />
        <Route
          path="/projects/:projectId"
          element={(
            <Suspense fallback={<div className="sp-empty">Loading...</div>}>
              <LegacyApp />
            </Suspense>
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}
