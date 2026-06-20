import { useEffect, type Dispatch, type SetStateAction } from 'react'

import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphLayout,
  Structure,
  StructureAssignment,
  StructureUsage,
  StoryObject,
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from '../../types'
import { readProjectClientCache } from '../domain/projectClientCache'
import { isObjectSection } from '../domain/stylePreviewConfig'
import type { PreviewSection } from '../domain/stylePreviewRouting'

export function useStylePreviewClientCache({
  activeSection,
  selectedCatalogId,
  selectedProjectId,
  setAttributeDefinitions,
  setAttributeGroups,
  setCatalogEntries,
  setCatalogEntriesByCatalogId,
  setCatalogFieldsByCatalogId,
  setCatalogGroups,
  setCatalogGroupsByCatalogId,
  setCatalogs,
  setObjects,
  setObjectsByType,
  setRelationGraph,
  setRelationGraphLayout,
  setSelectedCatalogId,
  setStructureAssignments,
  setStructures,
  setStructureUsages,
  setTimelineEvents,
  setTimelineInfo,
  setTimelineLayout,
  setTimelineLayoutRules,
  setTimelineLinks,
}: {
  activeSection: PreviewSection
  selectedCatalogId: number | null
  selectedProjectId: number | null
  setAttributeDefinitions: Dispatch<SetStateAction<AttributeDefinition[]>>
  setAttributeGroups: Dispatch<SetStateAction<AttributeGroup[]>>
  setCatalogEntries: Dispatch<SetStateAction<CatalogEntry[]>>
  setCatalogEntriesByCatalogId: Dispatch<SetStateAction<Record<number, CatalogEntry[]>>>
  setCatalogFieldsByCatalogId: Dispatch<SetStateAction<Record<number, CatalogFieldDefinition[]>>>
  setCatalogGroups: Dispatch<SetStateAction<CatalogEntryGroup[]>>
  setCatalogGroupsByCatalogId: Dispatch<SetStateAction<Record<number, CatalogEntryGroup[]>>>
  setCatalogs: Dispatch<SetStateAction<Catalog[]>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setObjectsByType: Dispatch<SetStateAction<Record<ObjectTypeKey, StoryObject[]>>>
  setRelationGraph: Dispatch<SetStateAction<RelationGraph>>
  setRelationGraphLayout: Dispatch<SetStateAction<RelationGraphLayout | null>>
  setSelectedCatalogId: Dispatch<SetStateAction<number | null>>
  setStructureAssignments: Dispatch<SetStateAction<StructureAssignment[]>>
  setStructures: Dispatch<SetStateAction<Structure[]>>
  setStructureUsages: Dispatch<SetStateAction<StructureUsage[]>>
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineInfo: Dispatch<SetStateAction<TimelineInfo | null>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  setTimelineLayoutRules: Dispatch<SetStateAction<TimelineLayoutRules | null>>
  setTimelineLinks: Dispatch<SetStateAction<TimelineEventLink[]>>
}) {
  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      return undefined
    }

    readProjectClientCache(selectedProjectId).then((snapshot) => {
      if (!isActive || snapshot === null) {
        return
      }

      if (snapshot.objectsByType !== undefined) {
        setObjectsByType((currentObjectsByType) => ({
          ...currentObjectsByType,
          ...snapshot.objectsByType,
        }))

        if (isObjectSection(activeSection)) {
          setObjects(snapshot.objectsByType[activeSection] ?? [])
        }
      }

      if (snapshot.catalogs !== undefined) {
        setCatalogs(snapshot.catalogs)
        setSelectedCatalogId((currentId) =>
          currentId !== null && snapshot.catalogs?.some((catalog) => catalog.id === currentId)
            ? currentId
            : snapshot.catalogs?.[0]?.id ?? currentId,
        )
      }

      if (snapshot.catalogEntriesByCatalogId !== undefined) {
        setCatalogEntriesByCatalogId(snapshot.catalogEntriesByCatalogId)
        if (selectedCatalogId !== null) {
          setCatalogEntries(snapshot.catalogEntriesByCatalogId[selectedCatalogId] ?? [])
        }
      }

      if (snapshot.catalogGroupsByCatalogId !== undefined) {
        setCatalogGroupsByCatalogId(snapshot.catalogGroupsByCatalogId)
        if (selectedCatalogId !== null) {
          setCatalogGroups(snapshot.catalogGroupsByCatalogId[selectedCatalogId] ?? [])
        }
      }

      if (snapshot.catalogFieldsByCatalogId !== undefined) {
        setCatalogFieldsByCatalogId(snapshot.catalogFieldsByCatalogId)
      }

      const attributeType = isObjectSection(activeSection) ? activeSection : 'characters'
      if (snapshot.attributeDefinitionsByType?.[attributeType] !== undefined) {
        setAttributeDefinitions(snapshot.attributeDefinitionsByType[attributeType])
      }
      if (snapshot.attributeGroupsByType?.[attributeType] !== undefined) {
        setAttributeGroups(snapshot.attributeGroupsByType[attributeType])
      }

      if (snapshot.relationGraph !== undefined) {
        setRelationGraph(snapshot.relationGraph)
      }
      if (snapshot.relationGraphLayout !== undefined) {
        setRelationGraphLayout(snapshot.relationGraphLayout)
      }
      if (snapshot.structureAssignments !== undefined) {
        setStructureAssignments(snapshot.structureAssignments)
      }
      if (snapshot.structures !== undefined) {
        setStructures(snapshot.structures)
      }
      if (snapshot.structureUsages !== undefined) {
        setStructureUsages(snapshot.structureUsages)
      }
      if (snapshot.timelineEvents !== undefined) {
        setTimelineEvents(snapshot.timelineEvents)
      }
      if (snapshot.timelineInfo !== undefined) {
        setTimelineInfo(snapshot.timelineInfo)
      }
      if (snapshot.timelineLayout !== undefined) {
        setTimelineLayout(snapshot.timelineLayout)
      }
      if (snapshot.timelineLayoutRules !== undefined) {
        setTimelineLayoutRules(snapshot.timelineLayoutRules)
      }
      if (snapshot.timelineLinks !== undefined) {
        setTimelineLinks(snapshot.timelineLinks)
      }
    })

    return () => {
      isActive = false
    }
  }, [
    activeSection,
    selectedCatalogId,
    selectedProjectId,
    setAttributeDefinitions,
    setAttributeGroups,
    setCatalogEntries,
    setCatalogEntriesByCatalogId,
    setCatalogFieldsByCatalogId,
    setCatalogGroups,
    setCatalogGroupsByCatalogId,
    setCatalogs,
    setObjects,
    setObjectsByType,
    setRelationGraph,
    setRelationGraphLayout,
    setSelectedCatalogId,
    setStructureAssignments,
    setStructures,
    setStructureUsages,
    setTimelineEvents,
    setTimelineInfo,
    setTimelineLayout,
    setTimelineLayoutRules,
    setTimelineLinks,
  ])
}
