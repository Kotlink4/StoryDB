import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  buildStylePreviewPath,
  parseStylePreviewPath,
  previewRouteBase,
  type PreviewSection,
  type PreviewTab,
} from '../domain/stylePreviewRouting'

type RouteState = ReturnType<typeof parseStylePreviewPath>

type SetValue<T> = Dispatch<SetStateAction<T>>

export const useStylePreviewRouting = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = useMemo(() => parseStylePreviewPath(location.pathname), [location.pathname])
  const navigateToPreview = useCallback(
    (
      projectId: number | null,
      tab: PreviewTab = 'database',
      section: PreviewSection = 'characters',
      objectId: number | null = null,
      catalogId: number | null = null,
      replace = false,
    ) => {
      navigate(buildStylePreviewPath(projectId, tab, section, objectId, catalogId), { replace })
    },
    [navigate],
  )

  return { navigate, navigateToPreview, routeState }
}

export const useStylePreviewRouteSync = ({
  routeState,
  setActiveSection,
  setActiveTab,
  setIsObjectPageOpen,
  setIsProfilePageOpen,
  setIsSettingsPageOpen,
  setSelectedCatalogId,
  setSelectedObjectId,
  setSelectedProjectId,
}: {
  routeState: RouteState
  setActiveSection: SetValue<PreviewSection>
  setActiveTab: SetValue<PreviewTab>
  setIsObjectPageOpen: SetValue<boolean>
  setIsProfilePageOpen: SetValue<boolean>
  setIsSettingsPageOpen: SetValue<boolean>
  setSelectedCatalogId: (catalogId: number | null) => void
  setSelectedObjectId: SetValue<number | null>
  setSelectedProjectId: (projectId: number | null) => void
}) => {
  useEffect(() => {
    let isActive = true

    queueMicrotask(() => {
      if (!isActive) {
        return
      }

      if (routeState.projectId !== null) {
        setSelectedProjectId(routeState.projectId)
      }

      if (routeState.activeTab !== null) {
        setActiveTab(routeState.activeTab)
      }

      if (routeState.activeSection !== null) {
        setActiveSection(routeState.activeSection)
        setIsSettingsPageOpen(false)
        setIsProfilePageOpen(false)
      }

      setIsSettingsPageOpen(routeState.utilityPage === 'settings')
      setIsProfilePageOpen(routeState.utilityPage === 'profile')

      setSelectedObjectId(routeState.objectId)
      setIsObjectPageOpen(routeState.objectId !== null)

      if (routeState.catalogId !== null) {
        setSelectedCatalogId(routeState.catalogId)
      }
    })

    return () => {
      isActive = false
    }
  }, [
    routeState.activeSection,
    routeState.activeTab,
    routeState.catalogId,
    routeState.objectId,
    routeState.projectId,
    routeState.utilityPage,
    setActiveSection,
    setActiveTab,
    setIsObjectPageOpen,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
    setSelectedCatalogId,
    setSelectedObjectId,
    setSelectedProjectId,
  ])
}

export const useStylePreviewProfileRedirect = ({
  currentUser,
  isLoadingProjects,
  navigate,
  routeState,
  setIsProfilePageOpen,
  setIsSettingsPageOpen,
  setSelectedObjectId,
  setSelectedProjectId,
}: {
  currentUser: unknown
  isLoadingProjects: boolean
  navigate: ReturnType<typeof useNavigate>
  routeState: RouteState
  setIsProfilePageOpen: SetValue<boolean>
  setIsSettingsPageOpen: SetValue<boolean>
  setSelectedObjectId: SetValue<number | null>
  setSelectedProjectId: (projectId: number | null) => void
}) => {
  useEffect(() => {
    if (isLoadingProjects || currentUser !== null) {
      return
    }

    setIsSettingsPageOpen(false)
    setIsProfilePageOpen(true)
    setSelectedProjectId(null)
    setSelectedObjectId(null)

    if (routeState.utilityPage !== 'profile') {
      navigate(`${previewRouteBase}/profile`, { replace: true })
    }
  }, [
    currentUser,
    isLoadingProjects,
    navigate,
    routeState.utilityPage,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
    setSelectedObjectId,
    setSelectedProjectId,
  ])

  useEffect(() => {
    if (
      !isLoadingProjects &&
      routeState.utilityPage === null &&
      routeState.projectId === null
    ) {
      setIsSettingsPageOpen(false)
      setIsProfilePageOpen(true)
      navigate(`${previewRouteBase}/profile`, { replace: true })
    }
  }, [
    isLoadingProjects,
    navigate,
    routeState.projectId,
    routeState.utilityPage,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
  ])
}
