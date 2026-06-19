import { useMemo } from 'react'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphEdge,
  StoryObject,
  StructureAssignment,
  StructureUsage,
  TimelineEvent,
} from '../../types'
import { isObjectSection } from '../domain/stylePreviewConfig'
import type { PreviewSection } from '../domain/stylePreviewRouting'
import { resolveObjectsByTypeTemporalState } from '../domain/temporalState'
import { resolveRelationGraphTemporalState } from '../domain/temporalRelationGraph'

type UseStylePreviewTemporalStateOptions = {
  activeSection: PreviewSection
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  dossierTimelineEventId: string
  hierarchyGroups: HierarchyGroup[]
  hierarchyNodesByGroupId: Record<number, HierarchyNode[]>
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  relationGraph: RelationGraph
  selectedObject: StoryObject | null
  selectedObjectId: number | null
  selectedRelationEdgeId: string | null
  structureAssignments: StructureAssignment[]
  structureUsages: StructureUsage[]
  visibleCatalogs: Catalog[]
  visibleTimelineEvents: TimelineEvent[]
}

export function useStylePreviewTemporalState({
  activeSection,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  dossierTimelineEventId,
  hierarchyGroups,
  hierarchyNodesByGroupId,
  objectsByType,
  relationGraph,
  selectedObject,
  selectedObjectId,
  selectedRelationEdgeId,
  structureAssignments,
  structureUsages,
  visibleCatalogs,
  visibleTimelineEvents,
}: UseStylePreviewTemporalStateOptions) {
  const temporalObjectsByType = useMemo(
    () =>
      resolveObjectsByTypeTemporalState(objectsByType, visibleTimelineEvents, dossierTimelineEventId, {
        catalogEntriesByCatalogId,
        catalogGroupsByCatalogId,
        catalogs: visibleCatalogs,
        hierarchyGroups,
        hierarchyNodesByGroupId,
      }),
    [
      catalogEntriesByCatalogId,
      catalogGroupsByCatalogId,
      dossierTimelineEventId,
      hierarchyGroups,
      hierarchyNodesByGroupId,
      objectsByType,
      visibleCatalogs,
      visibleTimelineEvents,
    ],
  )

  const temporalVisibleObjects = useMemo(
    () => Object.values(temporalObjectsByType).flat(),
    [temporalObjectsByType],
  )

  const temporalSectionObjects = useMemo(
    () => (isObjectSection(activeSection) ? temporalObjectsByType[activeSection] ?? [] : temporalVisibleObjects),
    [activeSection, temporalObjectsByType, temporalVisibleObjects],
  )

  const selectedTemporalObject = useMemo(
    () =>
      selectedObjectId === null
        ? null
        : temporalVisibleObjects.find((storyObject) => storyObject.id === selectedObjectId) ?? selectedObject,
    [selectedObject, selectedObjectId, temporalVisibleObjects],
  )

  const temporalRelationGraph = useMemo(
    () =>
      resolveRelationGraphTemporalState(
        relationGraph,
        temporalObjectsByType,
        structureAssignments,
        structureUsages,
        visibleTimelineEvents,
        dossierTimelineEventId,
      ),
    [
      dossierTimelineEventId,
      relationGraph,
      structureAssignments,
      structureUsages,
      temporalObjectsByType,
      visibleTimelineEvents,
    ],
  )

  const selectedTemporalRelationEdge = useMemo<RelationGraphEdge | null>(
    () => temporalRelationGraph.edges.find((edge) => edge.id === selectedRelationEdgeId) ?? null,
    [selectedRelationEdgeId, temporalRelationGraph.edges],
  )

  return {
    selectedTemporalObject,
    selectedTemporalRelationEdge,
    temporalObjectsByType,
    temporalRelationGraph,
    temporalSectionObjects,
    temporalVisibleObjects,
  }
}
