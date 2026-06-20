import { useEffect, type ReactNode } from 'react'

import { objectSections } from '../domain/stylePreviewConfig'
import type { PreviewLanguage, PreviewText, PreviewTheme } from '../domain/stylePreviewI18n'
import { savePreviewState } from '../domain/stylePreviewStateStorage'
import type { PreviewSection, PreviewTab } from '../domain/stylePreviewRouting'
import type { DetailMode, GroupDisplayMode } from '../domain/stylePreviewUiTypes'
import type { ObjectTypeKey } from '../../types'

export const getStylePreviewObjectSectionLabel = (
  sectionKey: ObjectTypeKey,
  ui: PreviewText,
) => {
  const section = objectSections.find((item) => item.key === sectionKey)
  return section === undefined ? sectionKey : ui[section.labelKey]
}

export const toggleNumberSelection = (values: number[], value: number) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

export function usePersistStylePreviewState({
  activeSection,
  activeTab,
  detailMode,
  groupDisplayMode,
  isObjectPageOpen,
  previewLanguage,
  previewTheme,
  selectedObjectId,
  selectedProjectId,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  detailMode: DetailMode
  groupDisplayMode: GroupDisplayMode
  isObjectPageOpen: boolean
  previewLanguage: PreviewLanguage
  previewTheme: PreviewTheme
  selectedObjectId: number | null
  selectedProjectId: number | null
}) {
  useEffect(() => {
    savePreviewState({
      activeSection,
      activeTab,
      detailMode,
      groupDisplayMode,
      isObjectPageOpen,
      previewLanguage,
      previewTheme,
      selectedObjectId,
      selectedProjectId,
    })
  }, [
    activeSection,
    activeTab,
    detailMode,
    groupDisplayMode,
    isObjectPageOpen,
    previewLanguage,
    previewTheme,
    selectedObjectId,
    selectedProjectId,
  ])
}

export function useResetStructureDetailPanel({
  activeSection,
  activeTab,
  detailMode,
  setStructureDetailPanel,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  detailMode: DetailMode
  setStructureDetailPanel: (panel: ReactNode | null) => void
}) {
  useEffect(() => {
    if (activeTab !== 'database' || activeSection !== 'structures' || detailMode !== 'panel') {
      setStructureDetailPanel(null)
    }
  }, [activeSection, activeTab, detailMode, setStructureDetailPanel])
}

export function useResetProjectSearchOnShellChange({
  activeSection,
  isProfilePageOpen,
  isSettingsPageOpen,
  setProjectSearchQuery,
}: {
  activeSection: PreviewSection
  isProfilePageOpen: boolean
  isSettingsPageOpen: boolean
  setProjectSearchQuery: (query: string) => void
}) {
  useEffect(() => {
    if (isProfilePageOpen || isSettingsPageOpen || activeSection === 'exports') {
      setProjectSearchQuery('')
    }
  }, [activeSection, isProfilePageOpen, isSettingsPageOpen, setProjectSearchQuery])
}

export function useCloseStylePreviewFloatingMenus({
  setIsSettingsOpen,
}: {
  setIsSettingsOpen: (isOpen: boolean) => void
}) {
  useEffect(() => {
    const closeFloatingMenus = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-profile') === null) {
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeFloatingMenus)
    return () => document.removeEventListener('pointerdown', closeFloatingMenus)
  }, [setIsSettingsOpen])
}
