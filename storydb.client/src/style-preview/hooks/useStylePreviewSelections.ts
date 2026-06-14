import { useMemo } from 'react'

import { fallbackObjectTypes } from '../domain/stylePreviewConfig'
import type {
  Catalog,
  CatalogEntry,
  CatalogFieldDefinition,
  ObjectTypeKey,
  RelationGraph,
  StoryObject,
  StoryProject,
  TimelineEvent,
} from '../../types'

type UseStylePreviewSelectionsOptions = {
  catalogEntries: CatalogEntry[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogFieldsByCatalogId: Record<number, CatalogFieldDefinition[]>
  catalogs: Catalog[]
  editingCatalogId: number | null
  editingTimelineEventId: number | null
  objects: StoryObject[]
  projects: StoryProject[]
  relationGraph: RelationGraph
  selectedCatalogEntryId: number | null
  selectedCatalogId: number | null
  selectedObjectId: number | null
  selectedProjectId: number | null
  selectedRelationEdgeId: string | null
  selectedTimelineEventId: number | null
  timelineEvents: TimelineEvent[]
}

export function useStylePreviewSelections({
  catalogEntries,
  catalogEntriesByCatalogId,
  catalogFieldsByCatalogId,
  catalogs,
  editingCatalogId,
  editingTimelineEventId,
  objects,
  projects,
  relationGraph,
  selectedCatalogEntryId,
  selectedCatalogId,
  selectedObjectId,
  selectedProjectId,
  selectedRelationEdgeId,
  selectedTimelineEventId,
  timelineEvents,
}: UseStylePreviewSelectionsOptions) {
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const visibleObjects = useMemo(
    () => (selectedProjectId === null ? [] : objects),
    [objects, selectedProjectId],
  )

  const visibleCatalogs = useMemo(
    () => (selectedProjectId === null ? [] : catalogs),
    [catalogs, selectedProjectId],
  )

  const visibleTimelineEvents = useMemo(
    () => (selectedProjectId === null ? [] : timelineEvents),
    [selectedProjectId, timelineEvents],
  )

  const timelineDraftParentOptions = useMemo(
    () =>
      visibleTimelineEvents.filter(
        (event) =>
          event.id !== editingTimelineEventId &&
          (event.eventType === 'duration' || event.eventType === 'era'),
      ),
    [editingTimelineEventId, visibleTimelineEvents],
  )

  const selectedTimelineEvent = useMemo(
    () => visibleTimelineEvents.find((event) => event.id === selectedTimelineEventId) ?? null,
    [selectedTimelineEventId, visibleTimelineEvents],
  )

  const selectedObject = useMemo(
    () => visibleObjects.find((storyObject) => storyObject.id === selectedObjectId) ?? null,
    [selectedObjectId, visibleObjects],
  )

  const selectedRelationEdge = useMemo(
    () => relationGraph.edges.find((edge) => edge.id === selectedRelationEdgeId) ?? null,
    [relationGraph.edges, selectedRelationEdgeId],
  )

  const selectedCatalog = useMemo(
    () => visibleCatalogs.find((catalog) => catalog.id === selectedCatalogId) ?? visibleCatalogs[0] ?? null,
    [selectedCatalogId, visibleCatalogs],
  )

  const selectedCatalogFields = useMemo(
    () => (selectedCatalog === null ? [] : catalogFieldsByCatalogId[selectedCatalog.id] ?? []),
    [catalogFieldsByCatalogId, selectedCatalog],
  )

  const catalogDialogFields = useMemo(() => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    return targetCatalogId === null ? [] : catalogFieldsByCatalogId[targetCatalogId] ?? []
  }, [catalogFieldsByCatalogId, editingCatalogId, selectedCatalog])

  const selectedCatalogEntry = useMemo(
    () =>
      catalogEntries.find((entry) => entry.id === selectedCatalogEntryId) ??
      Object.values(catalogEntriesByCatalogId)
        .flat()
        .find((entry) => entry.id === selectedCatalogEntryId) ??
      null,
    [catalogEntries, catalogEntriesByCatalogId, selectedCatalogEntryId],
  )

  const enabledObjectTypes = useMemo<ObjectTypeKey[]>(() => {
    if (selectedProject === null) {
      return fallbackObjectTypes
    }

    const enabled = selectedProject.objectTypes
      .filter((objectType) => objectType.isEnabled && objectType.key !== 'hierarchy')
      .map((objectType) => objectType.key)

    return enabled.length === 0 ? fallbackObjectTypes : enabled
  }, [selectedProject])

  return {
    catalogDialogFields,
    enabledObjectTypes,
    selectedCatalog,
    selectedCatalogEntry,
    selectedCatalogFields,
    selectedObject,
    selectedProject,
    selectedRelationEdge,
    selectedTimelineEvent,
    timelineDraftParentOptions,
    visibleCatalogs,
    visibleObjects,
    visibleTimelineEvents,
  }
}
