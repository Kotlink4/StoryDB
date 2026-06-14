import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

import {
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogEntries,
  fetchCatalogEntryGroups,
  fetchCatalogFieldDefinitions,
  fetchCatalogs,
  fetchObject,
  fetchObjects,
  fetchRelationGraph,
  fetchRelationGraphLayout,
  fetchTimelineEventLinks,
  fetchTimelineEvents,
  fetchTimelineInfo,
  fetchTimelineLayout,
  fetchTimelineLayoutRules,
} from '../../api'
import { isObjectSection } from '../domain/stylePreviewConfig'
import type { PreviewSection } from '../domain/stylePreviewRouting'
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

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setRelationGraph({ nodes: [], edges: [] })
      setRelationGraphLayout(null)
      return undefined
    }

    fetchRelationGraph(selectedProjectId)
      .then((graph) => {
        if (isActive) {
          setRelationGraph(graph)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraph({ nodes: [], edges: [] })
          showErrorMessage(messages.graphLoadFailed)
        }
      })

    fetchRelationGraphLayout(selectedProjectId)
      .then((layout) => {
        if (isActive) {
          setRelationGraphLayout(layout)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraphLayout(null)
          showMessage(messages.graphLayoutLoadMissing)
        }
      })

    return () => {
      isActive = false
    }
  }, [messages.graphLayoutLoadMissing, messages.graphLoadFailed, selectedProjectId, showErrorMessage, showMessage])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setObjectsByType(emptyObjectsByType)
      setCatalogEntriesByCatalogId({})
      return undefined
    }

    const loadTextLinkTargets = async () => {
      const projectId = selectedProjectId
      const [charactersResult, itemsResult, placesResult, organizationsResult, catalogsResult] =
        await Promise.allSettled([
          fetchObjects(projectId, 'characters'),
          fetchObjects(projectId, 'items'),
          fetchObjects(projectId, 'places'),
          fetchObjects(projectId, 'organizations'),
          fetchCatalogs(projectId),
        ])

      if (!isActive) {
        return
      }

      setObjectsByType((currentObjectsByType) => ({
        ...currentObjectsByType,
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : currentObjectsByType.characters,
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : currentObjectsByType.items,
        places: placesResult.status === 'fulfilled' ? placesResult.value : currentObjectsByType.places,
        organizations:
          organizationsResult.status === 'fulfilled' ? organizationsResult.value : currentObjectsByType.organizations,
      }))

      if (catalogsResult.status !== 'fulfilled') {
        return
      }

      const entriesByCatalogResults = await Promise.allSettled(
        catalogsResult.value.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
      )

      if (!isActive) {
        return
      }

      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        ...Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      }))
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
          fetchObjects(selectedProjectId, activeSection),
          fetchAttributeDefinitions(selectedProjectId, activeSection),
          fetchAttributeGroups(selectedProjectId, activeSection),
        ])
        if (isActive) {
          setObjects(loadedObjects)
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
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
        }
      } else {
        const loadedCatalogs = await fetchCatalogs(selectedProjectId)
        if (isActive) {
          setCatalogs(loadedCatalogs)
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

        setObjects((currentObjects) =>
          currentObjects.some((storyObject) => storyObject.id === loadedObject.id)
            ? currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject))
            : [loadedObject, ...currentObjects],
        )
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
      const [loadedEntries, loadedGroups, loadedFields] = await Promise.all([
        fetchCatalogEntries(selectedProjectId, selectedCatalogId),
        fetchCatalogEntryGroups(selectedProjectId, selectedCatalogId),
        fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalogId),
      ])

      if (isActive) {
        setCatalogEntries(loadedEntries)
        setCatalogGroups(loadedGroups)
        setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
          ...currentFieldsByCatalogId,
          [selectedCatalogId]: loadedFields,
        }))
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
      const [
        definitionsResult,
        groupsResult,
        catalogsResult,
        charactersResult,
        itemsResult,
        placesResult,
        organizationsResult,
      ] = await Promise.allSettled([
        fetchAttributeDefinitions(projectId, typeKey),
        fetchAttributeGroups(projectId, typeKey),
        fetchCatalogs(projectId),
        fetchObjects(projectId, 'characters'),
        fetchObjects(projectId, 'items'),
        fetchObjects(projectId, 'places'),
        fetchObjects(projectId, 'organizations'),
      ])

      const loadedCatalogs = catalogsResult.status === 'fulfilled' ? catalogsResult.value : []

      const [entriesByCatalogResults, groupsByCatalogResults] = await Promise.all([
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
        ),
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntryGroups(projectId, catalog.id)] as const),
        ),
      ])

      setAttributeDefinitions(definitionsResult.status === 'fulfilled' ? definitionsResult.value : [])
      setAttributeGroups(groupsResult.status === 'fulfilled' ? groupsResult.value : [])
      setCatalogs(loadedCatalogs)
      setHierarchyGroups([])
      setObjectsByType({
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : [],
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : [],
        places: placesResult.status === 'fulfilled' ? placesResult.value : [],
        organizations: organizationsResult.status === 'fulfilled' ? organizationsResult.value : [],
        hierarchy: [],
      })
      setCatalogEntriesByCatalogId(
        Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setCatalogGroupsByCatalogId(
        Object.fromEntries(
          groupsByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntryGroup[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setHierarchyNodesByGroupId({})
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
    timelineEvents,
    timelineInfo,
    timelineLayout,
    timelineLayoutRules,
    timelineLinks,
  }
}
