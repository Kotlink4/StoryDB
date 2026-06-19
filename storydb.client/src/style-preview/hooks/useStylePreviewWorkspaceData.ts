import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import {
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogs,
  fetchObject,
  fetchObjectSummaries,
  fetchRelationGraphLayout,
  fetchTimelineEventLinks,
  fetchTimelineEvents,
  fetchTimelineInfo,
  fetchTimelineLayout,
  fetchTimelineLayoutRules,
} from '../../api'
import { readProjectClientCache, writeProjectClientCachePatch } from '../domain/projectClientCache'
import { storyObjectSummariesToListItems } from '../domain/storyObjectSummaries'
import { isObjectSection, isPreviewObjectSection } from '../domain/stylePreviewConfig'
import type { PreviewSection } from '../domain/stylePreviewRouting'
import {
  loadCatalogWorkspaceData,
  loadObjectEditorWorkspaceData,
  loadRelationWorkspaceData,
  loadTextLinkTargetsData,
} from './workspaceDataLoaders'
import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  HierarchyGroup,
  HierarchyNode,
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

type WorkspaceMessages = {
  graphLayoutLoadMissing: string
  graphLoadFailed: string
  objectLoadFailed: string
  projectDataLoadFailed: string
  projectsCatalogsLoadFailed: string
}

type UseStylePreviewWorkspaceDataOptions = {
  activeSection: PreviewSection
  initialCatalogId: number | null
  messages: WorkspaceMessages
  selectedObjectId: number | null
  selectedProjectId: number | null
  setSelectedObjectId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
  showMessage: (message: string) => void
}

const emptyObjectsByType: Record<ObjectTypeKey, StoryObject[]> = {
  characters: [],
  items: [],
  places: [],
  organizations: [],
  hierarchy: [],
}

export function useStylePreviewWorkspaceData({
  activeSection,
  initialCatalogId,
  messages,
  selectedObjectId,
  selectedProjectId,
  setSelectedObjectId,
  showErrorMessage,
  showMessage,
}: UseStylePreviewWorkspaceDataOptions) {
  const [objects, setObjects] = useState<StoryObject[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [timelineLinks, setTimelineLinks] = useState<TimelineEventLink[]>([])
  const [timelineInfo, setTimelineInfo] = useState<TimelineInfo | null>(null)
  const [timelineLayout, setTimelineLayout] = useState<TimelineLayout | null>(null)
  const [timelineLayoutRules, setTimelineLayoutRules] = useState<TimelineLayoutRules | null>(null)
  const [relationGraph, setRelationGraph] = useState<RelationGraph>({ nodes: [], edges: [] })
  const [relationGraphLayout, setRelationGraphLayout] = useState<RelationGraphLayout | null>(null)
  const [structureAssignments, setStructureAssignments] = useState<StructureAssignment[]>([])
  const [structures, setStructures] = useState<Structure[]>([])
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([])
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [selectedAttributeGroupId, setSelectedAttributeGroupId] = useState<number | null>(null)
  const [hierarchyGroups, setHierarchyGroups] = useState<HierarchyGroup[]>([])
  const [hierarchyNodesByGroupId, setHierarchyNodesByGroupId] = useState<Record<number, HierarchyNode[]>>({})
  const [objectsByType, setObjectsByType] = useState<Record<ObjectTypeKey, StoryObject[]>>(emptyObjectsByType)
  const [catalogEntriesByCatalogId, setCatalogEntriesByCatalogId] = useState<Record<number, CatalogEntry[]>>({})
  const [catalogGroupsByCatalogId, setCatalogGroupsByCatalogId] = useState<Record<number, CatalogEntryGroup[]>>({})
  const [catalogFieldsByCatalogId, setCatalogFieldsByCatalogId] = useState<Record<number, CatalogFieldDefinition[]>>({})
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(initialCatalogId)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogGroups, setCatalogGroups] = useState<CatalogEntryGroup[]>([])
  const relationLayoutRequestId = useRef(0)

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
  }, [activeSection, selectedCatalogId, selectedProjectId])

  const loadRelationGraphLayout = useCallback(
    async (graphKey?: string | null) => {
      if (selectedProjectId === null) {
        relationLayoutRequestId.current += 1
        setRelationGraphLayout(null)
        return
      }

      const requestId = relationLayoutRequestId.current + 1
      relationLayoutRequestId.current = requestId
      setRelationGraphLayout(null)
      try {
        const layout = await fetchRelationGraphLayout(selectedProjectId, graphKey)
        if (requestId === relationLayoutRequestId.current) {
          setRelationGraphLayout(layout)
          void writeProjectClientCachePatch(selectedProjectId, { relationGraphLayout: layout })
        }
      } catch {
        if (requestId === relationLayoutRequestId.current) {
          setRelationGraphLayout(null)
          showMessage(messages.graphLayoutLoadMissing)
        }
      }
    },
    [messages.graphLayoutLoadMissing, selectedProjectId, showMessage],
  )

  useEffect(() => {
    let isActive = true

  if (selectedProjectId === null) {
      setRelationGraph({ nodes: [], edges: [] })
      setRelationGraphLayout(null)
      setStructureAssignments([])
      setStructures([])
      setStructureUsages([])
      return undefined
    }

    const loadRelationGraphData = async () => {
      const projectId = selectedProjectId
      const loadedWorkspace = await loadRelationWorkspaceData(projectId)

      if (!isActive) {
        return
      }

      setRelationGraph(loadedWorkspace.relationGraph)
      if (!loadedWorkspace.graphLoaded) {
        showErrorMessage(messages.graphLoadFailed)
      }

      setStructureAssignments(loadedWorkspace.structureAssignments)
      setStructures(loadedWorkspace.structures)
      setStructureUsages(loadedWorkspace.structureUsages)
      void writeProjectClientCachePatch(projectId, {
        ...(loadedWorkspace.graphLoaded ? { relationGraph: loadedWorkspace.relationGraph } : {}),
        structureAssignments: loadedWorkspace.structureAssignments,
        structures: loadedWorkspace.structures,
        structureUsages: loadedWorkspace.structureUsages,
      })
    }

    void loadRelationGraphData()

    void loadRelationGraphLayout('relations:all')

    return () => {
      isActive = false
    }
  }, [loadRelationGraphLayout, messages.graphLoadFailed, selectedProjectId, showErrorMessage])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setObjectsByType(emptyObjectsByType)
      setCatalogEntriesByCatalogId({})
      return undefined
    }

    const loadTextLinkTargets = async () => {
      const projectId = selectedProjectId
      const loadedTargets = await loadTextLinkTargetsData(projectId)

      if (!isActive) {
        return
      }

      setObjectsByType((currentObjectsByType) => ({
        ...currentObjectsByType,
        ...loadedTargets.objectsByTypePatch,
      }))
      void writeProjectClientCachePatch(projectId, {
        objectsByType: loadedTargets.objectsByTypePatch,
        ...(loadedTargets.catalogs !== null ? { catalogs: loadedTargets.catalogs } : {}),
      })

      if (loadedTargets.catalogs === null) {
        return
      }

      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        ...loadedTargets.catalogEntriesByCatalogId,
      }))
      void writeProjectClientCachePatch(projectId, {
        catalogEntriesByCatalogId: loadedTargets.catalogEntriesByCatalogId,
      })
    }

    void loadTextLinkTargets()

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setCatalogs([])
      return undefined
    }

    fetchCatalogs(selectedProjectId)
      .then((loadedCatalogs) => {
        if (!isActive) {
          return
        }

        setCatalogs(loadedCatalogs)
        void writeProjectClientCachePatch(selectedProjectId, { catalogs: loadedCatalogs })
        setSelectedCatalogId((currentId) =>
          currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : currentId,
        )
      })
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.projectsCatalogsLoadFailed)
        }
      })

    return () => {
      isActive = false
    }
  }, [messages.projectsCatalogsLoadFailed, selectedProjectId, showErrorMessage])

  useEffect(() => {
    setSelectedAttributeGroupId((currentGroupId) =>
      currentGroupId !== null && attributeGroups.some((group) => group.id === currentGroupId)
        ? currentGroupId
        : null,
    )
  }, [attributeGroups])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setTimelineInfo(null)
      setTimelineLayout(null)
      setTimelineLayoutRules(null)
      setTimelineLinks([])
      return undefined
    }

    const loadWorkspace = async () => {
      if (isObjectSection(activeSection)) {
        const [loadedObjects, definitions, groups] = await Promise.all([
          fetchObjectSummaries(selectedProjectId, activeSection).then(storyObjectSummariesToListItems),
          fetchAttributeDefinitions(selectedProjectId, activeSection),
          fetchAttributeGroups(selectedProjectId, activeSection),
        ])
        if (isActive) {
          setObjects(loadedObjects)
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          void writeProjectClientCachePatch(selectedProjectId, {
            objectsByType: {
              [activeSection]: loadedObjects,
            },
            attributeDefinitionsByType: {
              [activeSection]: definitions,
            },
            attributeGroupsByType: {
              [activeSection]: groups,
            },
          })
          setSelectedObjectId((currentId) =>
            currentId !== null && loadedObjects.some((storyObject) => storyObject.id === currentId)
              ? currentId
              : null,
          )
        }
      } else if (activeSection === 'attributes') {
        const [definitions, groups] = await Promise.all([
          fetchAttributeDefinitions(selectedProjectId, 'characters'),
          fetchAttributeGroups(selectedProjectId, 'characters'),
        ])
        if (isActive) {
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          setObjects([])
          void writeProjectClientCachePatch(selectedProjectId, {
            attributeDefinitionsByType: {
              characters: definitions,
            },
            attributeGroupsByType: {
              characters: groups,
            },
          })
        }
      } else {
        const loadedCatalogs = await fetchCatalogs(selectedProjectId)
        if (isActive) {
          setCatalogs(loadedCatalogs)
          void writeProjectClientCachePatch(selectedProjectId, { catalogs: loadedCatalogs })
          setSelectedCatalogId((currentId) =>
            currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
              ? currentId
              : loadedCatalogs[0]?.id ?? null,
          )
        }
      }

      const [loadedEvents, loadedTimelineInfo, loadedTimelineLayout, loadedTimelineLinks, loadedTimelineRules] = await Promise.all([
        fetchTimelineEvents(selectedProjectId),
        fetchTimelineInfo(selectedProjectId),
        fetchTimelineLayout(selectedProjectId),
        fetchTimelineEventLinks(selectedProjectId),
        fetchTimelineLayoutRules(selectedProjectId),
      ])
      if (isActive) {
        setTimelineEvents(loadedEvents)
        setTimelineInfo(loadedTimelineInfo)
        setTimelineLayout(loadedTimelineLayout)
        setTimelineLinks(loadedTimelineLinks)
        setTimelineLayoutRules(loadedTimelineRules)
        void writeProjectClientCachePatch(selectedProjectId, {
          timelineEvents: loadedEvents,
          timelineInfo: loadedTimelineInfo,
          timelineLayout: loadedTimelineLayout,
          timelineLayoutRules: loadedTimelineRules,
          timelineLinks: loadedTimelineLinks,
        })
      }
    }

    loadWorkspace()
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.projectDataLoadFailed)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, messages.projectDataLoadFailed, selectedProjectId, setSelectedObjectId, showErrorMessage])

  useEffect(() => {
    let isActive = true

    if (
      selectedProjectId === null ||
      selectedObjectId === null ||
      selectedObjectId <= 0 ||
      !isObjectSection(activeSection)
    ) {
      return undefined
    }

    fetchObject(selectedProjectId, selectedObjectId)
      .then((loadedObject) => {
        if (!isActive) {
          return
        }

        let nextObjectsForCache: StoryObject[] = []
        setObjects((currentObjects) => {
          nextObjectsForCache = currentObjects.some((storyObject) => storyObject.id === loadedObject.id)
            ? currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject))
            : [loadedObject, ...currentObjects]

          return nextObjectsForCache
        })
        const loadedSection = isPreviewObjectSection(loadedObject.typeKey) ? loadedObject.typeKey : activeSection
        if (isObjectSection(loadedSection)) {
          setObjectsByType((currentObjectsByType) => ({
            ...currentObjectsByType,
            [loadedSection]: (() => {
              const currentTypeObjects = currentObjectsByType[loadedSection] ?? []
              return currentTypeObjects.some((storyObject) => storyObject.id === loadedObject.id)
                ? currentTypeObjects.map((storyObject) =>
                    storyObject.id === loadedObject.id ? loadedObject : storyObject,
                  )
                : [loadedObject, ...currentTypeObjects]
            })(),
          }))
          if (loadedSection === activeSection) {
            void writeProjectClientCachePatch(selectedProjectId, {
              objectsByType: {
                [loadedSection]: nextObjectsForCache,
              },
            })
          }
        }
      })
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.objectLoadFailed)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, messages.objectLoadFailed, selectedObjectId, selectedProjectId, showErrorMessage])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null || selectedCatalogId === null || activeSection !== 'catalogs') {
      setCatalogEntries([])
      setCatalogGroups([])
      return undefined
    }

    const loadCatalogWorkspace = async () => {
      const projectId = selectedProjectId
      const catalogId = selectedCatalogId
      const loadedWorkspace = await loadCatalogWorkspaceData(projectId, catalogId)

      if (isActive) {
        setCatalogEntries(loadedWorkspace.catalogEntries)
        setCatalogGroups(loadedWorkspace.catalogGroups)
        setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
          ...currentFieldsByCatalogId,
          [catalogId]: loadedWorkspace.catalogFields,
        }))
        void writeProjectClientCachePatch(projectId, {
          catalogEntriesByCatalogId: {
            [catalogId]: loadedWorkspace.catalogEntries,
          },
          catalogGroupsByCatalogId: {
            [catalogId]: loadedWorkspace.catalogGroups,
          },
          catalogFieldsByCatalogId: {
            [catalogId]: loadedWorkspace.catalogFields,
          },
        })
      }
    }

    loadCatalogWorkspace().catch(() => {
      if (isActive) {
        showErrorMessage(messages.projectDataLoadFailed)
      }
    })

    return () => {
      isActive = false
    }
  }, [activeSection, messages.projectDataLoadFailed, selectedCatalogId, selectedProjectId, showErrorMessage])

  const loadObjectEditorData = useCallback(
    async (typeKey: ObjectTypeKey) => {
      if (selectedProjectId === null) {
        return
      }

      const projectId = selectedProjectId
      const loadedWorkspace = await loadObjectEditorWorkspaceData(projectId, typeKey)

      setAttributeDefinitions(loadedWorkspace.attributeDefinitions)
      setAttributeGroups(loadedWorkspace.attributeGroups)
      setCatalogs(loadedWorkspace.catalogs)
      setHierarchyGroups([])
      setObjectsByType(loadedWorkspace.objectsByType)
      setCatalogEntriesByCatalogId(loadedWorkspace.catalogEntriesByCatalogId)
      setCatalogGroupsByCatalogId(loadedWorkspace.catalogGroupsByCatalogId)
      setHierarchyNodesByGroupId({})
      void writeProjectClientCachePatch(projectId, {
        attributeDefinitionsByType: {
          [typeKey]: loadedWorkspace.attributeDefinitions,
        },
        attributeGroupsByType: {
          [typeKey]: loadedWorkspace.attributeGroups,
        },
        catalogs: loadedWorkspace.catalogs,
        objectsByType: loadedWorkspace.objectsByType,
        catalogEntriesByCatalogId: loadedWorkspace.catalogEntriesByCatalogId,
        catalogGroupsByCatalogId: loadedWorkspace.catalogGroupsByCatalogId,
      })
    },
    [selectedProjectId],
  )

  return {
    attributeDefinitions,
    attributeGroups,
    catalogEntries,
    catalogEntriesByCatalogId,
    catalogFieldsByCatalogId,
    catalogGroups,
    catalogGroupsByCatalogId,
    catalogs,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    loadRelationGraphLayout,
    loadObjectEditorData,
    objects,
    objectsByType,
    relationGraph,
    relationGraphLayout,
    selectedAttributeGroupId,
    selectedCatalogId,
    setAttributeDefinitions,
    setAttributeGroups,
    setCatalogEntries,
    setCatalogEntriesByCatalogId,
    setCatalogFieldsByCatalogId,
    setCatalogGroups,
    setCatalogGroupsByCatalogId,
    setCatalogs,
    setHierarchyGroups,
    setHierarchyNodesByGroupId,
    setObjects,
    setObjectsByType,
    setRelationGraph,
    setRelationGraphLayout,
    setSelectedAttributeGroupId,
    setSelectedCatalogId,
    setTimelineEvents,
    setTimelineLayout,
    setTimelineLinks,
    structureAssignments,
    structures,
    structureUsages,
    timelineEvents,
    timelineInfo,
    timelineLayout,
    timelineLayoutRules,
    timelineLinks,
  }
}
