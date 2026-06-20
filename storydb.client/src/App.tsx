import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'

const AdminApp = lazy(() => import('./admin-app/AdminApp'))
const StylePreview = lazy(() => import('./style-preview/StylePreview').then((module) => ({ default: module.StylePreview })))

function ProjectRedirect() {
  const { projectId } = useParams()
  const normalizedProjectId = Number(projectId)

  return Number.isInteger(normalizedProjectId) && normalizedProjectId > 0
    ? <Navigate replace to={`/style-preview/projects/${normalizedProjectId}/database/characters`} />
    : <Navigate replace to="/style-preview" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/style-preview/*"
          element={(
            <Suspense fallback={<div className="sp-empty">Loading...</div>}>
              <StylePreview />
            </Suspense>
          )}
        />
        <Route
          path="/admin/*"
          element={(
            <Suspense fallback={<div className="sp-empty">Loading...</div>}>
              <AdminApp />
            </Suspense>
          )}
        />
        <Route
          path="/"
          element={<Navigate replace to="/style-preview" />}
        />
        <Route
          path="/projects/:projectId"
          element={<ProjectRedirect />}
        />
      </Routes>
    </BrowserRouter>
  )
}
