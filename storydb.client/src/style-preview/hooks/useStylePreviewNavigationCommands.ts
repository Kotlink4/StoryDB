import type { Dispatch, SetStateAction } from 'react'

import {
  isObjectSection,
  isPreviewObjectSection,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type {
  PreviewSection,
  PreviewTab,
} from '../domain/stylePreviewRouting'
import type {
  ObjectTypeKey,
  StoryObject,
  TimelineEvent,
} from '../../types'
import type { DetailMode } from '../domain/stylePreviewUiTypes'

type NavigateToPreview = (
  projectId: number | null,
  tab?: PreviewTab,
  section?: PreviewSection,
  objectId?: number | null,
  catalogId?: number | null,
  replace?: boolean,
) => void

type UseStylePreviewNavigationCommandsOptions = {
  activeSection: PreviewSection
  detailMode: DetailMode
  navigateToPreview: NavigateToPreview
  objectsByType: Partial<Record<ObjectTypeKey, StoryObject[]>>
  selectedProjectId: number | null
  setActiveSection: Dispatch<SetStateAction<PreviewSection>>
  setActiveTab: Dispatch<SetStateAction<PreviewTab>>
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsObjectPageOpen: Dispatch<SetStateAction<boolean>>
  setIsRelationPageOpen: Dispatch<SetStateAction<boolean>>
  setIsTimelineEventPageOpen: Dispatch<SetStateAction<boolean>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setSelectedCatalogEntryId: Dispatch<SetStateAction<number | null>>
  setSelectedObjectId: Dispatch<SetStateAction<number | null>>
  setSelectedRelationEdgeId: Dispatch<SetStateAction<string | null>>
  setSelectedRelationObjectId: Dispatch<SetStateAction<number | null>>
  setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
}

export function useStylePreviewNavigationCommands({
  activeSection,
  detailMode,
  navigateToPreview,
  objectsByType,
  selectedProjectId,
  setActiveSection,
  setActiveTab,
  setDialog,
  setIsObjectPageOpen,
  setIsRelationPageOpen,
  setIsTimelineEventPageOpen,
  setObjects,
  setSelectedCatalogEntryId,
  setSelectedObjectId,
  setSelectedRelationEdgeId,
  setSelectedRelationObjectId,
  setSelectedTimelineEventId,
}: UseStylePreviewNavigationCommandsOptions) {
  const openObjectDetail = (storyObject: StoryObject) => {
    const targetSection = isPreviewObjectSection(storyObject.typeKey)
      ? storyObject.typeKey
      : isObjectSection(activeSection)
        ? activeSection
        : 'characters'

    setSelectedCatalogEntryId(null)
    setActiveTab('database')
    setActiveSection(targetSection)
    setObjects((currentObjects) => {
      const baseObjects = targetSection === activeSection ? currentObjects : objectsByType[targetSection] ?? []

      return baseObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? baseObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...baseObjects]
    })
    setSelectedObjectId(storyObject.id)
    setIsObjectPageOpen(detailMode === 'page')
    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', targetSection, storyObject.id)
    }
  }

  const openRelationDetail = (edgeId: string) => {
    setSelectedRelationEdgeId(edgeId)
    setSelectedRelationObjectId(null)
    setActiveTab('relations')
    setIsRelationPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('relationDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'relations', activeSection)
    }
  }

  const openRelationObjectDetail = (storyObject: StoryObject) => {
    if (detailMode === 'page') {
      openObjectDetail(storyObject)
      return
    }

    setSelectedCatalogEntryId(null)
    setSelectedRelationEdgeId(null)
    setSelectedRelationObjectId(storyObject.id)
    setSelectedObjectId(storyObject.id)
    setActiveTab('relations')
    setIsRelationPageOpen(false)
    setIsObjectPageOpen(false)
    setObjects((currentObjects) =>
      currentObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? currentObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...currentObjects],
    )

    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }
  }

  const openTimelineEventDetail = (eventId: number) => {
    setSelectedTimelineEventId(eventId)
    setActiveTab('timeline')
    setIsObjectPageOpen(false)
    setIsRelationPageOpen(false)
    setIsTimelineEventPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('timelineEventDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'timeline', activeSection)
    }
  }

  const openTimelineEventFromDossier = (event: TimelineEvent) => {
    openTimelineEventDetail(event.id)
  }

  return {
    openObjectDetail,
    openRelationDetail,
    openRelationObjectDetail,
    openTimelineEventDetail,
    openTimelineEventFromDossier,
  }
}
