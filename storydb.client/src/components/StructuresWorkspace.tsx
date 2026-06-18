import { useCallback, useEffect, useState } from 'react'

import {
  createCatalogRequest,
  createCatalogEntryGroupRequest,
  createCatalogEntryRequest,
  createStructureRequest,
  deleteStructureRequest,
  applyStructureCatalogSync,
  applyStructureCatalogAssignmentSync,
  fetchStructure,
  fetchStructureAssignments,
  fetchStructureCatalogAssignmentSyncPreview,
  fetchStructureCatalogSyncPreview,
  fetchStructureUsages,
  fetchStructures,
  getApiErrorMessage,
  updateStructureDetailsRequest,
  updateStructureNodeDetailsRequest,
  updateStructureRequest,
} from '../api'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  Structure,
  StructureAssignment,
  StructureCatalogAssignmentSyncPreview,
  StructureCatalogSyncMode,
  StructureCatalogSyncPreview,
  StructureDraft,
  StructureEdgeDraft,
  StructureLayoutKind,
  StructureNodeDraft,
  StructureNodeBindingMode,
  StructureOwnerKind,
  StructureSummary,
  StructureUsage,
  StoryProject,
} from '../types'
import { buildCatalogGroupTree, formatCatalogGroupTreeLabel } from '../domain/catalogGroupTree'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { KebabMenu, SectionIcon } from './StylePreviewPrimitives'

type StructureCatalogMode = 'none' | 'existing' | 'new'

const isCatalogSyncModeAvailable = (
  mode: StructureCatalogSyncMode,
  nodeBindingMode: StructureNodeBindingMode,
  linkedCatalogId: number | null,
) => {
  if (mode === 'manual') {
    return true
  }

  if (linkedCatalogId === null) {
    return false
  }

  if (mode === 'catalogEntries') {
    return nodeBindingMode === 'catalogEntry' || nodeBindingMode === 'mixed'
  }

  if (mode === 'catalogGroups') {
    return nodeBindingMode === 'catalogEntryGroup' || nodeBindingMode === 'mixed'
  }

  return nodeBindingMode === 'mixed'
}

const normalizeCatalogSyncMode = (
  mode: StructureCatalogSyncMode,
  nodeBindingMode: StructureNodeBindingMode,
  linkedCatalogId: number | null,
): StructureCatalogSyncMode =>
  isCatalogSyncModeAvailable(mode, nodeBindingMode, linkedCatalogId) ? mode : 'manual'

const normalizeNodesForBindingMode = (
  nodes: StructureNodeDraft[],
  nodeBindingMode: StructureNodeBindingMode,
) =>
  nodes.map((node) => {
    if (nodeBindingMode === 'none') {
      return { ...node, linkedCatalogEntryId: null, linkedCatalogEntryGroupId: null }
    }

    if (nodeBindingMode === 'catalogEntry') {
      return { ...node, linkedCatalogEntryGroupId: null }
    }

    if (nodeBindingMode === 'catalogEntryGroup') {
      return { ...node, linkedCatalogEntryId: null }
    }

    return node
  })

const clearNodeCatalogBindings = (nodes: StructureNodeDraft[]) =>
  nodes.map((node) => ({
    ...node,
    linkedCatalogEntryId: null,
    linkedCatalogEntryGroupId: null,
  }))

const sortStructureNodesForCatalogCreation = (nodes: StructureNodeDraft[]) =>
  [...nodes]
    .filter((node) => node.name.trim().length > 0)
    .sort((left, right) => left.levelIndex - right.levelIndex || left.sortOrder - right.sortOrder)

const createCatalogEntriesForStructureNodes = async (
  projectId: number,
  catalogId: number,
  nodes: StructureNodeDraft[],
) => {
  const createdEntries: CatalogEntry[] = []
  const entryIdsByClientId = new Map<string, number>()

  for (const node of sortStructureNodesForCatalogCreation(nodes)) {
    const parentEntryId =
      node.parentClientId === null ? null : entryIdsByClientId.get(node.parentClientId) ?? null
    const createdEntry = await createCatalogEntryRequest(
      projectId,
      catalogId,
      {
        name: node.name.trim(),
        description: node.description,
        imagePath: null,
        entryGroupId: '',
        parentEntryIds: parentEntryId === null ? [] : [parentEntryId],
        fieldValues: {},
      },
      [],
    )
    createdEntries.push(createdEntry)
    entryIdsByClientId.set(node.clientId, createdEntry.id)
  }

  return {
    createdEntries,
    nodes: nodes.map((node) => ({
      ...node,
      linkedCatalogEntryId: entryIdsByClientId.get(node.clientId) ?? node.linkedCatalogEntryId,
      linkedCatalogEntryGroupId: null,
    })),
  }
}

const createCatalogGroupsForStructureNodes = async (
  projectId: number,
  catalogId: number,
  nodes: StructureNodeDraft[],
) => {
  const createdGroups: CatalogEntryGroup[] = []
  const groupIdsByClientId = new Map<string, number>()

  for (const node of sortStructureNodesForCatalogCreation(nodes)) {
    const parentGroupId =
      node.parentClientId === null ? null : groupIdsByClientId.get(node.parentClientId) ?? null
    const createdGroup = await createCatalogEntryGroupRequest(
      projectId,
      catalogId,
      node.name.trim(),
      parentGroupId === null ? [] : [parentGroupId],
    )
    createdGroups.push(createdGroup)
    groupIdsByClientId.set(node.clientId, createdGroup.id)
  }

  return {
    createdGroups,
    nodes: nodes.map((node) => ({
      ...node,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: groupIdsByClientId.get(node.clientId) ?? node.linkedCatalogEntryGroupId,
    })),
  }
}

const emptyStructureDraft = (projectId: number): StructureDraft => ({
  name: '',
  description: '',
  ownerKind: 'project',
  ownerId: projectId,
  layoutKind: 'levels',
  nodeBindingMode: 'mixed',
  catalogSyncMode: 'manual',
  linkedCatalogId: null,
  nodes: [],
  edges: [],
})

const createEmptyStructureNodeDraft = (sortOrder: number): StructureNodeDraft => ({
  clientId: `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  parentClientId: null,
  linkedCatalogEntryId: null,
  linkedCatalogEntryGroupId: null,
  name: '',
  description: '',
  nodeType: '',
  color: '',
  iconKey: '',
  levelIndex: 0,
  sortOrder,
})

const getFirstDifferentNodeClientId = (nodes: StructureNodeDraft[], clientId: string) =>
  nodes.find((node) => node.clientId !== clientId)?.clientId ?? ''

const createEmptyStructureEdgeDraft = (
  nodes: StructureNodeDraft[],
  sortOrder: number,
  relationType: string,
): StructureEdgeDraft => {
  const sourceClientId = nodes[0]?.clientId ?? ''

  return {
    sourceClientId,
    targetClientId: getFirstDifferentNodeClientId(nodes, sourceClientId),
    relationType,
    description: '',
    sortOrder,
  }
}

const toStructureDraft = (structure: Structure): StructureDraft => ({
  name: structure.name,
  description: structure.description ?? '',
  ownerKind: structure.ownerKind,
  ownerId: structure.ownerId,
  layoutKind: structure.layoutKind,
  nodeBindingMode: structure.nodeBindingMode,
  catalogSyncMode: structure.catalogSyncMode,
  linkedCatalogId: structure.linkedCatalogId,
  nodes: structure.nodes.map((node) => ({
    clientId: String(node.id),
    parentClientId: node.parentNodeId === null ? null : String(node.parentNodeId),
    linkedCatalogEntryId: node.linkedCatalogEntryId,
    linkedCatalogEntryGroupId: node.linkedCatalogEntryGroupId,
    name: node.name,
    description: node.description ?? '',
    nodeType: node.nodeType ?? '',
    color: node.color ?? '',
    iconKey: node.iconKey ?? '',
    levelIndex: node.levelIndex,
    sortOrder: node.sortOrder,
  })),
  edges: structure.edges.map((edge) => ({
    sourceClientId: String(edge.sourceNodeId),
    targetClientId: String(edge.targetNodeId),
    relationType: edge.relationType,
    description: edge.description ?? '',
    sortOrder: edge.sortOrder,
  })),
})

export function StructuresWorkspace({
  catalogs,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  errorMessage,
  selectedProject,
  ui,
  onError,
  onCatalogCreated,
  onCatalogEntriesCreated,
  onCatalogGroupsCreated,
  onMessage,
}: {
  catalogs: Catalog[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  errorMessage: string
  selectedProject: StoryProject
  ui: PreviewText
  onError: (message: string) => void
  onCatalogCreated?: (catalog: Catalog) => void
  onCatalogEntriesCreated?: (catalogId: number, entries: CatalogEntry[]) => void
  onCatalogGroupsCreated?: (catalogId: number, groups: CatalogEntryGroup[]) => void
  onMessage: (message: string) => void
}) {
  const [draft, setDraft] = useState<StructureDraft>(() => emptyStructureDraft(selectedProject.id))
  const [catalogMode, setCatalogMode] = useState<StructureCatalogMode>('none')
  const [newCatalogName, setNewCatalogName] = useState('')
  const [createdCatalogs, setCreatedCatalogs] = useState<Catalog[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailSaving, setIsDetailSaving] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isCatalogSyncLoading, setIsCatalogSyncLoading] = useState(false)
  const [structures, setStructures] = useState<StructureSummary[]>([])
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<StructureDraft | null>(null)
  const [selectedStructureAssignments, setSelectedStructureAssignments] = useState<StructureAssignment[]>([])
  const [selectedStructureUsages, setSelectedStructureUsages] = useState<StructureUsage[]>([])
  const [selectedStructureTimelineReferenceCount, setSelectedStructureTimelineReferenceCount] = useState(0)
  const [assignmentSyncPreviewsByUsageId, setAssignmentSyncPreviewsByUsageId] = useState<
    Record<number, StructureCatalogAssignmentSyncPreview>
  >({})
  const [assignmentSyncLoadingUsageId, setAssignmentSyncLoadingUsageId] = useState<number | null>(null)
  const [catalogSyncPreview, setCatalogSyncPreview] = useState<StructureCatalogSyncPreview | null>(null)
  const availableCatalogs = [
    ...catalogs,
    ...createdCatalogs.filter((catalog) => !catalogs.some((existingCatalog) => existingCatalog.id === catalog.id)),
  ]
  const canSaveStructure =
    draft.name.trim().length > 0 &&
    !isSaving &&
    (catalogMode !== 'existing' || draft.linkedCatalogId !== null) &&
    (catalogMode !== 'new' || (newCatalogName.trim().length > 0 || draft.name.trim().length > 0))
  const draftSyncCatalogId = draft.linkedCatalogId ?? (catalogMode === 'new' ? 0 : null)

  const loadStructures = useCallback(async () => {
    setStructures(await fetchStructures(selectedProject.id))
  }, [selectedProject.id])

  useEffect(() => {
    setDraft(emptyStructureDraft(selectedProject.id))
    setCatalogMode('none')
    setNewCatalogName('')
    setCreatedCatalogs([])
    setSelectedStructureId(null)
    setSelectedDraft(null)
    setSelectedStructureAssignments([])
    setSelectedStructureUsages([])
    setSelectedStructureTimelineReferenceCount(0)
    setAssignmentSyncPreviewsByUsageId({})
    setCatalogSyncPreview(null)
    void loadStructures().catch(() => onError(errorMessage))
  }, [errorMessage, loadStructures, onError, selectedProject.id])

  const saveStructure = async () => {
    if (!canSaveStructure) {
      return
    }

    setIsSaving(true)
    try {
      let linkedCatalogId = catalogMode === 'existing' ? draft.linkedCatalogId : null
      let nodes = draft.nodes

      if (catalogMode === 'new') {
        const shouldCreateGroups = draft.nodeBindingMode === 'catalogEntryGroup'
        const shouldCreateHierarchicalEntries =
          draft.nodeBindingMode === 'catalogEntry' || draft.nodeBindingMode === 'mixed'
        const createdCatalog = await createCatalogRequest(
          selectedProject.id,
          newCatalogName.trim() || draft.name.trim(),
          draft.description,
          shouldCreateGroups || shouldCreateHierarchicalEntries,
          shouldCreateGroups ? 'groups' : 'entries',
        )
        linkedCatalogId = createdCatalog.id
        setCreatedCatalogs((currentCatalogs) => [...currentCatalogs, createdCatalog])
        onCatalogCreated?.(createdCatalog)

        if (shouldCreateGroups) {
          const result = await createCatalogGroupsForStructureNodes(selectedProject.id, createdCatalog.id, nodes)
          nodes = result.nodes
          onCatalogGroupsCreated?.(createdCatalog.id, result.createdGroups)
        } else if (shouldCreateHierarchicalEntries) {
          const result = await createCatalogEntriesForStructureNodes(selectedProject.id, createdCatalog.id, nodes)
          nodes = result.nodes
          onCatalogEntriesCreated?.(createdCatalog.id, result.createdEntries)
        }
      }

      const ownerKind = draft.ownerKind
      const createdStructure = await createStructureRequest(selectedProject.id, {
        ...draft,
        linkedCatalogId,
        catalogSyncMode: normalizeCatalogSyncMode(draft.catalogSyncMode, draft.nodeBindingMode, linkedCatalogId),
        nodes,
        ownerId: ownerKind === 'catalog' ? linkedCatalogId : draft.ownerId,
      })
      setDraft(emptyStructureDraft(selectedProject.id))
      setCatalogMode('none')
      setNewCatalogName('')
      await loadStructures()
      setSelectedStructureId(createdStructure.id)
      setSelectedDraft(toStructureDraft(createdStructure))
      setSelectedStructureTimelineReferenceCount(createdStructure.timelineReferenceCount)
      onMessage(ui.saved)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStructure = async (structure: StructureSummary) => {
    try {
      await deleteStructureRequest(selectedProject.id, structure.id)
      if (selectedStructureId === structure.id) {
        setSelectedStructureId(null)
        setSelectedDraft(null)
        setSelectedStructureAssignments([])
        setSelectedStructureUsages([])
        setSelectedStructureTimelineReferenceCount(0)
        setAssignmentSyncPreviewsByUsageId({})
        setCatalogSyncPreview(null)
      }
      await loadStructures()
      onMessage(ui.deleted)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    }
  }

  const updateDraft = (patch: Partial<StructureDraft>) => setDraft((currentDraft) => ({ ...currentDraft, ...patch }))

  const updateDraftNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.map((node) => (node.clientId === clientId ? { ...node, ...patch } : node)),
    }))

  const addDraftNode = () =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      nodes: [...currentDraft.nodes, createEmptyStructureNodeDraft(currentDraft.nodes.length)],
    }))

  const updateDraftEdge = (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      edges: currentDraft.edges.map((edge, index) => (index === edgeIndex ? { ...edge, ...patch } : edge)),
    }))

  const addDraftEdge = () =>
    setDraft((currentDraft) =>
      currentDraft.nodes.length < 2
        ? currentDraft
        : {
            ...currentDraft,
            edges: [
              ...currentDraft.edges,
              createEmptyStructureEdgeDraft(
                currentDraft.nodes,
                currentDraft.edges.length,
                ui.structureEdgeDefaultType,
              ),
            ],
          },
    )

  const removeDraftEdge = (edgeIndex: number) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      edges: currentDraft.edges.filter((_, index) => index !== edgeIndex),
    }))

  const removeDraftNode = (clientId: string) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes
        .filter((node) => node.clientId !== clientId)
        .map((node) => ({
          ...node,
          parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
        })),
      edges: currentDraft.edges.filter(
        (edge) => edge.sourceClientId !== clientId && edge.targetClientId !== clientId,
      ),
    }))

  const openStructure = async (structureId: number) => {
    setSelectedStructureId(structureId)
    setIsDetailLoading(true)
    try {
      const [structure, assignments] = await Promise.all([
        fetchStructure(selectedProject.id, structureId),
        fetchStructureAssignments(selectedProject.id, { structureId }),
      ])
      const usages = await fetchStructureUsages(selectedProject.id, { structureId })
      const assignmentSyncPreviewEntries =
        structure.linkedCatalogId === null
          ? []
          : await Promise.all(
              usages.map(async (usage) => {
                try {
                  const preview = await fetchStructureCatalogAssignmentSyncPreview(selectedProject.id, usage.id)
                  return [usage.id, preview] as const
                } catch {
                  return null
                }
              }),
            )
      setSelectedDraft(toStructureDraft(structure))
      setSelectedStructureAssignments(assignments)
      setSelectedStructureUsages(usages)
      setSelectedStructureTimelineReferenceCount(structure.timelineReferenceCount)
      setAssignmentSyncPreviewsByUsageId(
        Object.fromEntries(assignmentSyncPreviewEntries.filter((entry) => entry !== null)),
      )
      setCatalogSyncPreview(null)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsDetailLoading(false)
    }
  }

  const updateSelectedDraft = (patch: Partial<StructureDraft>) =>
    setSelectedDraft((currentDraft) => {
      setCatalogSyncPreview(null)
      return currentDraft === null ? currentDraft : { ...currentDraft, ...patch }
    })

  const updateSelectedNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: currentDraft.nodes.map((node) =>
              node.clientId === clientId ? { ...node, ...patch } : node,
            ),
          },
    )

  const addSelectedNode = () =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: [...currentDraft.nodes, createEmptyStructureNodeDraft(currentDraft.nodes.length)],
          },
    )

  const updateSelectedEdge = (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            edges: currentDraft.edges.map((edge, index) => (index === edgeIndex ? { ...edge, ...patch } : edge)),
          },
    )

  const addSelectedEdge = () =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null || currentDraft.nodes.length < 2
        ? currentDraft
        : {
            ...currentDraft,
            edges: [
              ...currentDraft.edges,
              createEmptyStructureEdgeDraft(
                currentDraft.nodes,
                currentDraft.edges.length,
                ui.structureEdgeDefaultType,
              ),
            ],
          },
    )

  const removeSelectedEdge = (edgeIndex: number) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            edges: currentDraft.edges.filter((_, index) => index !== edgeIndex),
          },
    )

  const removeSelectedNode = (clientId: string) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: currentDraft.nodes
              .filter((node) => node.clientId !== clientId)
              .map((node) => ({
                ...node,
                parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
              })),
            edges: currentDraft.edges.filter(
              (edge) => edge.sourceClientId !== clientId && edge.targetClientId !== clientId,
            ),
          },
    )

  const saveSelectedStructure = async () => {
    if (
      selectedStructureId === null ||
      selectedDraft === null ||
      selectedDraft.name.trim().length === 0 ||
      selectedStructureAssignments.length > 0
    ) {
      return
    }

    setIsDetailSaving(true)
    try {
      const updatedStructure = await updateStructureRequest(selectedProject.id, selectedStructureId, selectedDraft)
      setSelectedDraft(toStructureDraft(updatedStructure))
      setSelectedStructureTimelineReferenceCount(updatedStructure.timelineReferenceCount)
      setSelectedStructureAssignments(await fetchStructureAssignments(selectedProject.id, { structureId: selectedStructureId }))
      setSelectedStructureUsages(await fetchStructureUsages(selectedProject.id, { structureId: selectedStructureId }))
      await loadStructures()
      onMessage(ui.saved)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsDetailSaving(false)
    }
  }

  const saveSelectedStructureDetails = async () => {
    if (selectedStructureId === null || selectedDraft === null || selectedDraft.name.trim().length === 0) {
      return
    }

    setIsDetailSaving(true)
    try {
      const updatedStructure = await updateStructureDetailsRequest(selectedProject.id, selectedStructureId, {
        name: selectedDraft.name,
        description: selectedDraft.description,
      })
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : {
              ...currentDraft,
              name: updatedStructure.name,
              description: updatedStructure.description ?? '',
            },
      )
      setSelectedStructureTimelineReferenceCount(updatedStructure.timelineReferenceCount)
      setSelectedStructureAssignments(await fetchStructureAssignments(selectedProject.id, { structureId: selectedStructureId }))
      setSelectedStructureUsages(await fetchStructureUsages(selectedProject.id, { structureId: selectedStructureId }))
      await loadStructures()
      onMessage(ui.saved)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsDetailSaving(false)
    }
  }

  const saveSelectedNodeDetails = async (clientId: string) => {
    if (selectedStructureId === null || selectedDraft === null || !/^\d+$/.test(clientId)) {
      return
    }

    const node = selectedDraft.nodes.find((currentNode) => currentNode.clientId === clientId)
    if (node === undefined || node.name.trim().length === 0) {
      return
    }

    setIsDetailSaving(true)
    try {
      const updatedNode = await updateStructureNodeDetailsRequest(
        selectedProject.id,
        selectedStructureId,
        Number(clientId),
        {
          name: node.name,
          description: node.description,
          nodeType: node.nodeType,
          color: node.color,
          iconKey: node.iconKey,
        },
      )
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : {
              ...currentDraft,
              nodes: currentDraft.nodes.map((currentNode) =>
                currentNode.clientId === clientId
                  ? {
                      ...currentNode,
                      name: updatedNode.name,
                      description: updatedNode.description ?? '',
                      nodeType: updatedNode.nodeType ?? '',
                      color: updatedNode.color ?? '',
                      iconKey: updatedNode.iconKey ?? '',
                    }
                  : currentNode,
              ),
            },
      )
      await loadStructures()
      onMessage(ui.saved)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsDetailSaving(false)
    }
  }

  const previewSelectedCatalogSync = async () => {
    if (selectedStructureId === null || selectedDraft === null || selectedDraft.catalogSyncMode === 'manual') {
      return
    }

    setIsCatalogSyncLoading(true)
    try {
      setCatalogSyncPreview(await fetchStructureCatalogSyncPreview(selectedProject.id, selectedStructureId))
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsCatalogSyncLoading(false)
    }
  }

  const applySelectedCatalogSync = async () => {
    if (selectedStructureId === null || selectedDraft === null || selectedDraft.catalogSyncMode === 'manual') {
      return
    }

    setIsCatalogSyncLoading(true)
    try {
      const result = await applyStructureCatalogSync(selectedProject.id, selectedStructureId)
      setSelectedDraft(toStructureDraft(result.structure))
      setSelectedStructureTimelineReferenceCount(result.structure.timelineReferenceCount)
      setSelectedStructureAssignments(await fetchStructureAssignments(selectedProject.id, { structureId: selectedStructureId }))
      setSelectedStructureUsages(await fetchStructureUsages(selectedProject.id, { structureId: selectedStructureId }))
      setCatalogSyncPreview(null)
      await loadStructures()
      onMessage(ui.structureCatalogSyncApplied)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsCatalogSyncLoading(false)
    }
  }

  const syncStructureUsageAssignments = async (usage: StructureUsage) => {
    if (selectedStructureId === null) {
      return
    }

    setAssignmentSyncLoadingUsageId(usage.id)
    try {
      await applyStructureCatalogAssignmentSync(selectedProject.id, usage.id)
      const [assignments, preview] = await Promise.all([
        fetchStructureAssignments(selectedProject.id, { structureId: selectedStructureId }),
        fetchStructureCatalogAssignmentSyncPreview(selectedProject.id, usage.id),
      ])
      setSelectedStructureAssignments(assignments)
      setAssignmentSyncPreviewsByUsageId((currentPreviews) => ({
        ...currentPreviews,
        [usage.id]: preview,
      }))
      await loadStructures()
      onMessage(ui.structureCatalogAssignmentSync)
    } catch (error) {
      onError(getApiErrorMessage(error, ui.structureCatalogAssignmentSyncFailed))
    } finally {
      setAssignmentSyncLoadingUsageId(null)
    }
  }

  const selectedAssignmentCountsByNodeId = new Map<number, number>()
  const selectedAssignmentsByNodeId = new Map<number, StructureAssignment[]>()
  const selectedAssignmentCountsByUsageId = new Map<number, number>()
  selectedStructureAssignments.forEach((assignment) => {
    selectedAssignmentCountsByNodeId.set(
      assignment.structureNodeId,
      (selectedAssignmentCountsByNodeId.get(assignment.structureNodeId) ?? 0) + 1,
    )
    selectedAssignmentsByNodeId.set(assignment.structureNodeId, [
      ...(selectedAssignmentsByNodeId.get(assignment.structureNodeId) ?? []),
      assignment,
    ])
    selectedAssignmentCountsByUsageId.set(
      assignment.structureUsageId,
      (selectedAssignmentCountsByUsageId.get(assignment.structureUsageId) ?? 0) + 1,
    )
  })
  const hasSelectedStructureAssignments = selectedStructureAssignments.length > 0
  const hasSelectedStructureTimelineReferences = selectedStructureTimelineReferenceCount > 0
  const isSelectedTopologyLocked = hasSelectedStructureAssignments || hasSelectedStructureTimelineReferences
  const getStructureUsageTargetLabel = (usage: StructureUsage) => {
    if (usage.targetKind === 'project') {
      return selectedProject.name
    }

    if (usage.targetKind === 'catalog') {
      return availableCatalogs.find((catalog) => catalog.id === usage.targetId)?.name ?? ui.structureOwnerCatalog
    }

    return usage.displayName ?? `${ui.structureOwnerObject} #${usage.targetId}`
  }

  return (
    <section className="sp-database-main sp-structures-workspace">
      <div className="sp-workspace-head">
        <div>
          <h2>{ui.structures}</h2>
          <p>{ui.structuresDescription}</p>
        </div>
      </div>

      <div className="sp-structure-editor sp-panel">
        <div className="sp-form">
          <label>
            {ui.name}
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </label>
          <label>
            {ui.description}
            <input
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
            />
          </label>
          <label>
            {ui.structureOwnerKind}
            <select
              value={draft.ownerKind}
              onChange={(event) => {
                const ownerKind = event.target.value as StructureOwnerKind
                const nextCatalogId = draft.linkedCatalogId ?? availableCatalogs[0]?.id ?? null
                updateDraft({
                  ownerKind,
                  linkedCatalogId: ownerKind === 'catalog' ? nextCatalogId : draft.linkedCatalogId,
                  ownerId: ownerKind === 'project' ? selectedProject.id : nextCatalogId,
                })
                if (ownerKind === 'catalog' && catalogMode === 'none') {
                  setCatalogMode(nextCatalogId === null ? 'new' : 'existing')
                }
              }}
            >
              <option value="project">{ui.structureOwnerProject}</option>
              <option value="catalog">{ui.structureOwnerCatalog}</option>
            </select>
          </label>
          <label>
            {ui.structureLayoutKind}
            <select
              value={draft.layoutKind}
              onChange={(event) => updateDraft({ layoutKind: event.target.value as StructureLayoutKind })}
            >
              <option value="levels">{ui.structureLayoutLevels}</option>
              <option value="tree">{ui.structureLayoutTree}</option>
              <option value="graph">{ui.structureLayoutGraph}</option>
            </select>
          </label>
          <label>
            {ui.structureBindingMode}
            <select
              value={draft.nodeBindingMode}
              onChange={(event) => {
                const nodeBindingMode = event.target.value as StructureNodeBindingMode
                updateDraft({
                  nodeBindingMode,
                  catalogSyncMode: normalizeCatalogSyncMode(draft.catalogSyncMode, nodeBindingMode, draftSyncCatalogId),
                  nodes: normalizeNodesForBindingMode(draft.nodes, nodeBindingMode),
                })
              }}
            >
              <option value="none">{ui.structureBindingNone}</option>
              <option value="catalogEntry">{ui.structureBindingCatalogEntry}</option>
              <option value="catalogEntryGroup">{ui.structureBindingCatalogEntryGroup}</option>
              <option value="mixed">{ui.structureBindingMixed}</option>
            </select>
          </label>
          <label>
            {ui.structureCatalogMode}
            <select
              value={catalogMode}
              onChange={(event) => {
                const mode = event.target.value as StructureCatalogMode
                const nextCatalogId = mode === 'existing' ? draft.linkedCatalogId ?? availableCatalogs[0]?.id ?? null : null
                setCatalogMode(mode)
                updateDraft({
                  linkedCatalogId: nextCatalogId,
                  ownerId: draft.ownerKind === 'catalog' ? nextCatalogId : draft.ownerId,
                  catalogSyncMode: normalizeCatalogSyncMode(draft.catalogSyncMode, draft.nodeBindingMode, nextCatalogId),
                  nodes: nextCatalogId === draft.linkedCatalogId ? draft.nodes : clearNodeCatalogBindings(draft.nodes),
                })
              }}
            >
              <option value="none">{ui.structureCatalogNone}</option>
              <option value="existing">{ui.structureCatalogExisting}</option>
              <option value="new">{ui.structureCatalogNew}</option>
            </select>
          </label>
          {catalogMode === 'existing' && (
            <label>
              {ui.structureLinkedCatalog}
              <select
                value={draft.linkedCatalogId ?? ''}
                onChange={(event) => {
                  const catalogId = event.target.value === '' ? null : Number(event.target.value)
                  updateDraft({
                    linkedCatalogId: catalogId,
                    ownerId: draft.ownerKind === 'catalog' ? catalogId : draft.ownerId,
                    catalogSyncMode: normalizeCatalogSyncMode(draft.catalogSyncMode, draft.nodeBindingMode, catalogId),
                    nodes: catalogId === draft.linkedCatalogId ? draft.nodes : clearNodeCatalogBindings(draft.nodes),
                  })
                }}
              >
                <option value="">{ui.catalogNoSelection}</option>
                {availableCatalogs.map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {catalogMode === 'new' && (
            <label>
              {ui.structureNewCatalogName}
              <input
                value={newCatalogName}
                placeholder={draft.name || ui.structureNewCatalogPlaceholder}
                onChange={(event) => setNewCatalogName(event.target.value)}
              />
            </label>
          )}
          <CatalogSyncModeSelect
            ui={ui}
            value={draft.catalogSyncMode}
            nodeBindingMode={draft.nodeBindingMode}
            linkedCatalogId={draftSyncCatalogId}
            onChange={(catalogSyncMode) => updateDraft({ catalogSyncMode })}
          />
          <p className="sp-form-hint">{ui.structureCatalogHint}</p>
        </div>
        <div className="sp-detail-actions">
          <button className="sp-button" type="button" disabled={isSaving} onClick={addDraftNode}>
            {ui.structureAddNode}
          </button>
          <button className="sp-button primary" type="button" disabled={!canSaveStructure} onClick={() => void saveStructure()}>
            {isSaving ? ui.saving : ui.create}
          </button>
        </div>
        {draft.nodes.length > 0 && (
          <>
            <StructureMapPreview draft={draft} ui={ui} />
            <StructureNodeDraftList
              nodes={draft.nodes}
              ui={ui}
              linkedCatalogId={draft.linkedCatalogId}
              nodeBindingMode={draft.nodeBindingMode}
              catalogEntriesByCatalogId={catalogEntriesByCatalogId}
              catalogGroupsByCatalogId={catalogGroupsByCatalogId}
              onNodeChange={updateDraftNode}
              onNodeRemove={removeDraftNode}
            />
            <StructureEdgeDraftSection
              edges={draft.edges}
              nodes={draft.nodes}
              ui={ui}
              onEdgeAdd={addDraftEdge}
              onEdgeChange={updateDraftEdge}
              onEdgeRemove={removeDraftEdge}
            />
          </>
        )}
      </div>

      {structures.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noStructures}</strong>
          <span>{ui.structuresDescription}</span>
        </div>
      ) : (
        <div className="sp-cards sp-structure-list">
          {structures.map((structure) => {
            const linkedCatalog = availableCatalogs.find((catalog) => catalog.id === structure.linkedCatalogId)
            const canDeleteStructure = structure.usageCount === 0 && structure.timelineReferenceCount === 0

            return (
              <article
                className={`sp-card compact${structure.id === selectedStructureId ? ' selected' : ''}`}
                key={structure.id}
              >
                <div className="sp-card-menu">
                  <KebabMenu
                    ui={ui}
                    onDelete={canDeleteStructure ? () => void deleteStructure(structure) : undefined}
                  />
                </div>
                <button className="sp-card-main" type="button" onClick={() => void openStructure(structure.id)}>
                  <div className="sp-structure-icon">
                    <SectionIcon name="structures" />
                  </div>
                  <div className="sp-card-body">
                    <h3>{structure.name}</h3>
                    <p>{structure.description ?? ui.noDescription}</p>
                    <div className="sp-tags">
                      <span>{structure.layoutKind}</span>
                      <span>{ui.structureNodesCount}: {structure.nodeCount}</span>
                      <span>{ui.structureUsageCount}: {structure.usageCount}</span>
                      {structure.timelineReferenceCount > 0 && (
                        <span>{ui.structureTimelineReferenceCount}: {structure.timelineReferenceCount}</span>
                      )}
                      {linkedCatalog !== undefined && (
                        <span>{ui.structureLinkedCatalog}: {linkedCatalog.name}</span>
                      )}
                    </div>
                  </div>
                </button>
              </article>
            )
          })}
        </div>
      )}

      <div className="sp-structure-detail-editor sp-panel">
        {selectedDraft === null ? (
          <div className="sp-empty compact">
            <strong>{isDetailLoading ? ui.loading : ui.structureSelectToEdit}</strong>
            <span>{ui.structureEditorHint}</span>
          </div>
        ) : (
          <>
            <div className="sp-workspace-head compact">
              <div>
                <h3>{selectedDraft.name || ui.structure}</h3>
                <p>{ui.structureEditorHint}</p>
              </div>
              <button
                className="sp-button primary"
                type="button"
                disabled={isDetailSaving || selectedDraft.name.trim().length === 0 || isSelectedTopologyLocked}
                onClick={() => void saveSelectedStructure()}
              >
                {isDetailSaving ? ui.saving : ui.save}
              </button>
            </div>
            {isSelectedTopologyLocked && (
              <div className="sp-note">
                <strong>{ui.structureTopologyLocked}</strong>
                <span>{ui.structureTopologyLockedHint}</span>
                <div className="sp-tags">
                  {hasSelectedStructureAssignments && (
                    <span>{ui.structureAssignmentCount}: {selectedStructureAssignments.length}</span>
                  )}
                  {hasSelectedStructureTimelineReferences && (
                    <span>
                      {ui.structureTimelineReferenceCount}: {selectedStructureTimelineReferenceCount}
                    </span>
                  )}
                </div>
                <div className="sp-detail-actions">
                  <button
                    className="sp-button"
                    disabled={isDetailSaving || selectedDraft.name.trim().length === 0}
                    type="button"
                    onClick={() => void saveSelectedStructureDetails()}
                  >
                    {isDetailSaving ? ui.saving : ui.structureDetailsSave}
                  </button>
                </div>
              </div>
            )}

            <div className="sp-form">
              <label>
                {ui.name}
                <input
                  value={selectedDraft.name}
                  onChange={(event) => updateSelectedDraft({ name: event.target.value })}
                />
              </label>
              <label>
                {ui.description}
                <input
                  value={selectedDraft.description}
                  onChange={(event) => updateSelectedDraft({ description: event.target.value })}
                />
              </label>
              <label>
                {ui.structureOwnerKind}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.ownerKind}
                  onChange={(event) => {
                    const ownerKind = event.target.value as StructureOwnerKind
                    updateSelectedDraft({
                      ownerKind,
                      ownerId:
                        ownerKind === 'project'
                          ? selectedProject.id
                          : ownerKind === 'catalog'
                            ? selectedDraft.linkedCatalogId ?? availableCatalogs[0]?.id ?? null
                            : selectedDraft.ownerId,
                    })
                  }}
                >
                  <option value="project">{ui.structureOwnerProject}</option>
                  <option value="catalog">{ui.structureOwnerCatalog}</option>
                  {selectedDraft.ownerKind === 'object' && (
                    <option value="object">{ui.structureOwnerObject}</option>
                  )}
                </select>
              </label>
              <label>
                {ui.structureLayoutKind}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.layoutKind}
                  onChange={(event) => updateSelectedDraft({ layoutKind: event.target.value as StructureLayoutKind })}
                >
                  <option value="levels">{ui.structureLayoutLevels}</option>
                  <option value="tree">{ui.structureLayoutTree}</option>
                  <option value="graph">{ui.structureLayoutGraph}</option>
                </select>
              </label>
              <label>
                {ui.structureBindingMode}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.nodeBindingMode}
                  onChange={(event) =>
                    updateSelectedDraft({
                      nodeBindingMode: event.target.value as StructureNodeBindingMode,
                      catalogSyncMode: normalizeCatalogSyncMode(
                        selectedDraft.catalogSyncMode,
                        event.target.value as StructureNodeBindingMode,
                        selectedDraft.linkedCatalogId,
                      ),
                      nodes: normalizeNodesForBindingMode(
                        selectedDraft.nodes,
                        event.target.value as StructureNodeBindingMode,
                      ),
                    })
                  }
                >
                  <option value="none">{ui.structureBindingNone}</option>
                  <option value="catalogEntry">{ui.structureBindingCatalogEntry}</option>
                  <option value="catalogEntryGroup">{ui.structureBindingCatalogEntryGroup}</option>
                  <option value="mixed">{ui.structureBindingMixed}</option>
                </select>
              </label>
              <label>
                {ui.structureLinkedCatalog}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.linkedCatalogId ?? ''}
                  onChange={(event) => {
                    const catalogId = event.target.value === '' ? null : Number(event.target.value)
                    updateSelectedDraft({
                      linkedCatalogId: catalogId,
                      ownerId: selectedDraft.ownerKind === 'catalog' ? catalogId : selectedDraft.ownerId,
                      catalogSyncMode: normalizeCatalogSyncMode(
                        selectedDraft.catalogSyncMode,
                        selectedDraft.nodeBindingMode,
                        catalogId,
                      ),
                      nodes:
                        catalogId === selectedDraft.linkedCatalogId
                          ? selectedDraft.nodes
                          : clearNodeCatalogBindings(selectedDraft.nodes),
                    })
                  }}
                >
                  <option value="">{ui.catalogNoSelection}</option>
                  {availableCatalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
              </label>
              <CatalogSyncModeSelect
                ui={ui}
                value={selectedDraft.catalogSyncMode}
                nodeBindingMode={selectedDraft.nodeBindingMode}
                linkedCatalogId={selectedDraft.linkedCatalogId}
                disabled={isSelectedTopologyLocked}
                onChange={(catalogSyncMode) => updateSelectedDraft({ catalogSyncMode })}
              />
            </div>

            {selectedDraft.catalogSyncMode !== 'manual' && (
              <div className="sp-structure-sync sp-panel-subtle">
                <div>
                  <strong>{ui.structureCatalogSync}</strong>
                  <p>{ui.structureCatalogSyncHint}</p>
                </div>
                <div className="sp-detail-actions">
                  <button
                    className="sp-button"
                    type="button"
                    disabled={isCatalogSyncLoading || isDetailSaving}
                    onClick={() => void previewSelectedCatalogSync()}
                  >
                    {isCatalogSyncLoading ? ui.loading : ui.structureCatalogSyncPreview}
                  </button>
                  <button
                    className="sp-button primary"
                    type="button"
                    disabled={isCatalogSyncLoading || isDetailSaving || isSelectedTopologyLocked}
                    onClick={() => void applySelectedCatalogSync()}
                  >
                    {ui.structureCatalogSyncApply}
                  </button>
                </div>
                {catalogSyncPreview !== null && (
                  <div className="sp-tags">
                    <span>{ui.structureCatalogSyncExisting}: {catalogSyncPreview.existingNodeCount}</span>
                    <span>{ui.structureCatalogSyncMissing}: {catalogSyncPreview.missingNodeCount}</span>
                    {catalogSyncPreview.nodes.slice(0, 8).map((node) => (
                      <span key={`${node.sourceKind}-${node.sourceId}`}>
                        {node.action === 'create' ? '+ ' : ''}{node.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedStructureUsages.length > 0 && (
              <div className="sp-structure-sync sp-panel-subtle">
                <div>
                  <strong>{ui.structureUsages}</strong>
                  <p>{ui.structureUsagesHint}</p>
                </div>
                <div className="sp-structure-usage-list">
                  {selectedStructureUsages.map((usage) => {
                    const preview = assignmentSyncPreviewsByUsageId[usage.id] ?? null
                    const assignmentCount = selectedAssignmentCountsByUsageId.get(usage.id) ?? 0
                    const canSyncAssignments =
                      selectedDraft.linkedCatalogId !== null &&
                      preview !== null &&
                      preview.missingAssignmentCount > 0

                    return (
                      <article className="sp-structure-usage-card" key={usage.id}>
                        <div>
                          <strong>{usage.displayName ?? usage.structureName}</strong>
                          <span>{getStructureUsageTargetLabel(usage)}</span>
                        </div>
                        <div className="sp-tags">
                          {usage.isPrimary && <span>{ui.primary}</span>}
                          <span>{usage.targetKind}</span>
                          <span>{ui.structureAssignmentCount}: {assignmentCount}</span>
                          {preview !== null && (
                            <>
                              <span>{ui.structureCatalogAssignmentSyncMissing}: {preview.missingAssignmentCount}</span>
                              <span>{ui.structureCatalogAssignmentSyncExisting}: {preview.existingAssignmentCount}</span>
                            </>
                          )}
                        </div>
                        <button
                          className="sp-button"
                          disabled={!canSyncAssignments || assignmentSyncLoadingUsageId === usage.id}
                          type="button"
                          onClick={() => void syncStructureUsageAssignments(usage)}
                        >
                          {assignmentSyncLoadingUsageId === usage.id ? ui.loading : ui.structureCatalogAssignmentSync}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="sp-structure-nodes">
              <div className="sp-structure-nodes-head">
                <div>
                  <h3>{ui.structureNodes}</h3>
                  <p>{ui.structureNodesHint}</p>
                </div>
                <button className="sp-button" disabled={isSelectedTopologyLocked} type="button" onClick={addSelectedNode}>
                  {ui.structureAddNode}
                </button>
              </div>

              {selectedDraft.nodes.length === 0 ? (
                <div className="sp-empty compact">
                  <strong>{ui.noStructureNodes}</strong>
                  <span>{ui.structureNodesHint}</span>
                </div>
              ) : (
                <>
                  <StructureMapPreview
                    draft={selectedDraft}
                    ui={ui}
                    catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                    catalogGroupsByCatalogId={catalogGroupsByCatalogId}
                    assignmentCountsByNodeId={selectedAssignmentCountsByNodeId}
                    assignmentsByNodeId={selectedAssignmentsByNodeId}
                  />
                  <StructureNodeDraftList
                    nodes={selectedDraft.nodes}
                    ui={ui}
                    linkedCatalogId={selectedDraft.linkedCatalogId}
                    nodeBindingMode={selectedDraft.nodeBindingMode}
                    catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                    catalogGroupsByCatalogId={catalogGroupsByCatalogId}
                    assignmentCountsByNodeId={selectedAssignmentCountsByNodeId}
                    onNodeChange={updateSelectedNode}
                    onNodeDetailsSave={(clientId) => void saveSelectedNodeDetails(clientId)}
                    onNodeRemove={removeSelectedNode}
                    isNodeDetailsSaving={isDetailSaving}
                    isTopologyLocked={isSelectedTopologyLocked}
                  />
                  <StructureEdgeDraftSection
                    edges={selectedDraft.edges}
                    nodes={selectedDraft.nodes}
                    ui={ui}
                    onEdgeAdd={addSelectedEdge}
                    onEdgeChange={updateSelectedEdge}
                    onEdgeRemove={removeSelectedEdge}
                    isTopologyLocked={isSelectedTopologyLocked}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function CatalogSyncModeSelect({
  ui,
  value,
  nodeBindingMode,
  linkedCatalogId,
  disabled = false,
  onChange,
}: {
  ui: PreviewText
  value: StructureCatalogSyncMode
  nodeBindingMode: StructureNodeBindingMode
  linkedCatalogId: number | null
  disabled?: boolean
  onChange: (value: StructureCatalogSyncMode) => void
}) {
  const options: Array<{ value: StructureCatalogSyncMode; label: string }> = [
    { value: 'manual', label: ui.structureCatalogSyncManual },
    { value: 'catalogEntries', label: ui.structureCatalogSyncEntries },
    { value: 'catalogGroups', label: ui.structureCatalogSyncGroups },
    { value: 'catalogTree', label: ui.structureCatalogSyncTree },
  ]

  return (
    <label>
      {ui.structureCatalogSyncMode}
      <select
        disabled={disabled}
        value={normalizeCatalogSyncMode(value, nodeBindingMode, linkedCatalogId)}
        onChange={(event) => onChange(event.target.value as StructureCatalogSyncMode)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={!isCatalogSyncModeAvailable(option.value, nodeBindingMode, linkedCatalogId)}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StructureMapPreview({
  draft,
  ui,
  catalogEntriesByCatalogId = {},
  catalogGroupsByCatalogId = {},
  assignmentCountsByNodeId,
  assignmentsByNodeId,
}: {
  draft: StructureDraft
  ui: PreviewText
  catalogEntriesByCatalogId?: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId?: Record<number, CatalogEntryGroup[]>
  assignmentCountsByNodeId?: Map<number, number>
  assignmentsByNodeId?: Map<number, StructureAssignment[]>
}) {
  const [focusedNodeClientId, setFocusedNodeClientId] = useState<string | null>(null)
  const nodes = draft.nodes
  const focusedNode = focusedNodeClientId === null
    ? null
    : nodes.find((node) => node.clientId === focusedNodeClientId) ?? null
  const validNodeIds = new Set(nodes.map((node) => node.clientId))
  const validEdges = draft.edges.filter(
    (edge) =>
      validNodeIds.has(edge.sourceClientId) &&
      validNodeIds.has(edge.targetClientId) &&
      edge.sourceClientId !== edge.targetClientId,
  )
  const focusedEdges =
    focusedNodeClientId === null
      ? validEdges
      : validEdges.filter(
          (edge) => edge.sourceClientId === focusedNodeClientId || edge.targetClientId === focusedNodeClientId,
        )
  const focusedNodeIds = new Set<string>(
    focusedNodeClientId === null
      ? nodes.map((node) => node.clientId)
      : [
          focusedNodeClientId,
          ...focusedEdges.flatMap((edge) => [edge.sourceClientId, edge.targetClientId]),
        ],
  )
  const levelIndexes = Array.from(new Set(nodes.map((node) => node.levelIndex))).sort((left, right) => left - right)
  const getNodeName = (clientId: string) =>
    nodes.find((node) => node.clientId === clientId)?.name.trim() || ui.structureNode
  const focusedParent = focusedNode?.parentClientId === null || focusedNode?.parentClientId === undefined
    ? null
    : nodes.find((node) => node.clientId === focusedNode.parentClientId) ?? null
  const focusedChildren = focusedNode === null
    ? []
    : nodes
        .filter((node) => node.parentClientId === focusedNode.clientId)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
  const focusedIncomingEdges = focusedNode === null
    ? []
    : validEdges.filter((edge) => edge.targetClientId === focusedNode.clientId)
  const focusedOutgoingEdges = focusedNode === null
    ? []
    : validEdges.filter((edge) => edge.sourceClientId === focusedNode.clientId)
  const focusedCatalogEntry = focusedNode?.linkedCatalogEntryId === null || focusedNode?.linkedCatalogEntryId === undefined
    ? null
    : (draft.linkedCatalogId === null ? [] : catalogEntriesByCatalogId[draft.linkedCatalogId] ?? [])
        .find((entry) => entry.id === focusedNode.linkedCatalogEntryId) ?? null
  const focusedCatalogGroup = focusedNode?.linkedCatalogEntryGroupId === null || focusedNode?.linkedCatalogEntryGroupId === undefined
    ? null
    : (draft.linkedCatalogId === null ? [] : catalogGroupsByCatalogId[draft.linkedCatalogId] ?? [])
        .find((group) => group.id === focusedNode.linkedCatalogEntryGroupId) ?? null
  const focusedAssignmentCount =
    focusedNode !== null && /^\d+$/.test(focusedNode.clientId)
      ? assignmentCountsByNodeId?.get(Number(focusedNode.clientId)) ?? 0
      : null
  const focusedAssignments =
    focusedNode !== null && /^\d+$/.test(focusedNode.clientId)
      ? assignmentsByNodeId?.get(Number(focusedNode.clientId)) ?? []
      : []

  return (
    <section className="sp-structure-map-preview">
      <div className="sp-structure-map-head">
        <div>
          <h3>{ui.structurePreview}</h3>
          <p>{ui.structurePreviewHint}</p>
        </div>
        <div className="sp-tags">
          <span>{ui.structureLayoutKind}: {draft.layoutKind}</span>
          <span>{ui.structureNodesCount}: {nodes.length}</span>
          <span>{ui.relationsCount}: {validEdges.length}</span>
        </div>
      </div>

      {focusedNodeClientId !== null && (
        <div className="sp-structure-focus-bar">
          <span>{ui.structureFocusedNode}: {getNodeName(focusedNodeClientId)}</span>
          <button className="sp-button" type="button" onClick={() => setFocusedNodeClientId(null)}>
            {ui.structureFocusReset}
          </button>
        </div>
      )}

      {focusedNode !== null && (
        <article className="sp-structure-node-dossier">
          <div>
            <span>{ui.structureNodeDossier}</span>
            <h4>{focusedNode.name.trim() || ui.structureNode}</h4>
            <p>{focusedNode.description.trim() || ui.noDescription}</p>
          </div>
          <dl>
            <div>
              <dt>{ui.structureNodeType}</dt>
              <dd>{focusedNode.nodeType.trim() || '-'}</dd>
            </div>
            <div>
              <dt>{ui.structureLevelIndex}</dt>
              <dd>{focusedNode.levelIndex + 1}</dd>
            </div>
            <div>
              <dt>{ui.structureParentNode}</dt>
              <dd>{focusedParent?.name.trim() || '-'}</dd>
            </div>
            <div>
              <dt>{ui.structureChildNodes}</dt>
              <dd>{focusedChildren.length}</dd>
            </div>
            <div>
              <dt>{ui.relationsCount}</dt>
              <dd>{focusedIncomingEdges.length + focusedOutgoingEdges.length}</dd>
            </div>
            {focusedAssignmentCount !== null && (
              <div>
                <dt>{ui.structureAssignmentCount}</dt>
                <dd>{focusedAssignmentCount}</dd>
              </div>
            )}
          </dl>
          {(focusedCatalogEntry !== null || focusedCatalogGroup !== null || focusedChildren.length > 0) && (
            <div className="sp-tags">
              {focusedCatalogEntry !== null && (
                <span>{ui.structureLinkedCatalogEntry}: {focusedCatalogEntry.name}</span>
              )}
              {focusedCatalogGroup !== null && (
                <span>{ui.structureLinkedCatalogGroup}: {focusedCatalogGroup.name}</span>
              )}
              {focusedChildren.slice(0, 6).map((childNode) => (
                <span key={childNode.clientId}>{childNode.name.trim() || ui.structureNode}</span>
              ))}
            </div>
          )}
          {focusedAssignments.length > 0 && (
            <div className="sp-structure-node-members">
              <strong>{ui.structureNodeMembers}</strong>
              <div className="sp-tags">
                {focusedAssignments.slice(0, 8).map((assignment) => (
                  <span key={assignment.id}>
                    {assignment.storyObjectName}
                    {assignment.roleLabel === null || assignment.roleLabel.trim().length === 0
                      ? ''
                      : ` · ${assignment.roleLabel}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      )}

      <div className="sp-structure-level-preview">
        {levelIndexes.map((levelIndex) => (
          <section key={levelIndex}>
            <strong>{ui.structureLevelIndex} {levelIndex + 1}</strong>
            <div>
              {nodes
                .filter((node) => node.levelIndex === levelIndex)
                .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
                .map((node) => (
                  <button
                    className={
                      focusedNodeClientId === node.clientId
                        ? 'active'
                        : focusedNodeIds.has(node.clientId)
                          ? ''
                          : 'muted'
                    }
                    key={node.clientId}
                    type="button"
                    onClick={() =>
                      setFocusedNodeClientId((currentNodeClientId) =>
                        currentNodeClientId === node.clientId ? null : node.clientId,
                      )
                    }
                  >
                    <span>{node.name.trim() || ui.structureNode}</span>
                    {node.nodeType.trim().length > 0 && <small>{node.nodeType}</small>}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>

      {validEdges.length > 0 && (
        <div className="sp-structure-route-preview">
          {focusedEdges.length === 0 ? (
            <p>{ui.noStructureEdges}</p>
          ) : (
            focusedEdges
              .sort((left, right) => left.sortOrder - right.sortOrder || left.relationType.localeCompare(right.relationType))
              .map((edge, edgeIndex) => (
                <div className="sp-structure-route" key={`${edge.sourceClientId}-${edge.targetClientId}-${edgeIndex}`}>
                  <span>{getNodeName(edge.sourceClientId)}</span>
                  <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
                  <span>{getNodeName(edge.targetClientId)}</span>
                </div>
              ))
          )}
        </div>
      )}
    </section>
  )
}

function StructureNodeDraftList({
  nodes,
  ui,
  linkedCatalogId,
  nodeBindingMode,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  assignmentCountsByNodeId,
  onNodeChange,
  onNodeDetailsSave,
  onNodeRemove,
  isNodeDetailsSaving = false,
  isTopologyLocked = false,
}: {
  nodes: StructureNodeDraft[]
  ui: PreviewText
  linkedCatalogId: number | null
  nodeBindingMode: StructureNodeBindingMode
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  assignmentCountsByNodeId?: Map<number, number>
  onNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onNodeDetailsSave?: (clientId: string) => void
  onNodeRemove: (clientId: string) => void
  isNodeDetailsSaving?: boolean
  isTopologyLocked?: boolean
}) {
  const catalogEntries = linkedCatalogId === null ? [] : catalogEntriesByCatalogId[linkedCatalogId] ?? []
  const catalogGroups = linkedCatalogId === null ? [] : catalogGroupsByCatalogId[linkedCatalogId] ?? []
  const catalogGroupTree = buildCatalogGroupTree(catalogGroups)
  const canBindEntries = linkedCatalogId !== null && (nodeBindingMode === 'catalogEntry' || nodeBindingMode === 'mixed')
  const canBindGroups =
    linkedCatalogId !== null && (nodeBindingMode === 'catalogEntryGroup' || nodeBindingMode === 'mixed')
  const linkedEntryClientIds = new Map(
    nodes
      .filter((node) => node.linkedCatalogEntryId !== null)
      .map((node) => [node.linkedCatalogEntryId!, node.clientId]),
  )
  const linkedGroupClientIds = new Map(
    nodes
      .filter((node) => node.linkedCatalogEntryGroupId !== null)
      .map((node) => [node.linkedCatalogEntryGroupId!, node.clientId]),
  )

  return (
    <div className="sp-structure-node-list">
      {nodes.map((node) => (
        <article className="sp-structure-node-row" key={node.clientId}>
          <label>
            {ui.name}
            <input
              value={node.name}
              onChange={(event) => onNodeChange(node.clientId, { name: event.target.value })}
            />
          </label>
          <label>
            {ui.description}
            <input
              value={node.description}
              onChange={(event) => onNodeChange(node.clientId, { description: event.target.value })}
            />
          </label>
          <label>
            {ui.structureParentNode}
            <select
              disabled={isTopologyLocked}
              value={node.parentClientId ?? ''}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  parentClientId: event.target.value === '' ? null : event.target.value,
                })
              }
            >
              <option value="">{ui.noGroup}</option>
              {nodes
                .filter((parentNode) => parentNode.clientId !== node.clientId)
                .map((parentNode) => (
                  <option key={parentNode.clientId} value={parentNode.clientId}>
                    {parentNode.name || ui.structureNode}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ui.structureNodeType}
            <input
              value={node.nodeType}
              onChange={(event) => onNodeChange(node.clientId, { nodeType: event.target.value })}
            />
          </label>
          {canBindEntries && (
            <label>
              {ui.structureLinkedCatalogEntry}
              <select
                disabled={isTopologyLocked}
                value={node.linkedCatalogEntryId ?? ''}
                onChange={(event) =>
                  onNodeChange(node.clientId, {
                    linkedCatalogEntryId: event.target.value === '' ? null : Number(event.target.value),
                    linkedCatalogEntryGroupId: null,
                  })
                }
              >
                <option value="">{ui.catalogNoSelection}</option>
                {catalogEntries.map((entry) => {
                  const linkedClientId = linkedEntryClientIds.get(entry.id)
                  const isUsedByAnotherNode = linkedClientId !== undefined && linkedClientId !== node.clientId
                  return (
                  <option disabled={isUsedByAnotherNode} key={entry.id} value={entry.id}>
                    {isUsedByAnotherNode ? `${entry.name} (${ui.structureCatalogLinkAlreadyUsed})` : entry.name}
                  </option>
                  )
                })}
              </select>
            </label>
          )}
          {canBindGroups && (
            <label>
              {ui.structureLinkedCatalogGroup}
              <select
                disabled={isTopologyLocked}
                value={node.linkedCatalogEntryGroupId ?? ''}
                onChange={(event) =>
                  onNodeChange(node.clientId, {
                    linkedCatalogEntryId: null,
                    linkedCatalogEntryGroupId: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              >
                <option value="">{ui.catalogNoSelection}</option>
                {catalogGroupTree.map(({ group, depth }) => {
                  const linkedClientId = linkedGroupClientIds.get(group.id)
                  const isUsedByAnotherNode = linkedClientId !== undefined && linkedClientId !== node.clientId
                  const label = formatCatalogGroupTreeLabel(group, depth)
                  return (
                  <option disabled={isUsedByAnotherNode} key={group.id} value={group.id}>
                    {isUsedByAnotherNode ? `${label} (${ui.structureCatalogLinkAlreadyUsed})` : label}
                  </option>
                  )
                })}
              </select>
            </label>
          )}
          <label>
            {ui.structureLevelIndex}
            <input
              disabled={isTopologyLocked}
              min="0"
              type="number"
              value={node.levelIndex}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  levelIndex: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </label>
          <label>
            {ui.structureSortOrder}
            <input
              disabled={isTopologyLocked}
              min="0"
              type="number"
              value={node.sortOrder}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  sortOrder: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </label>
          {assignmentCountsByNodeId !== undefined && /^\d+$/.test(node.clientId) && (
            <div className="sp-tags">
              <span>
                {ui.structureAssignmentCount}: {assignmentCountsByNodeId.get(Number(node.clientId)) ?? 0}
              </span>
            </div>
          )}
          <div className="sp-structure-node-actions">
            {onNodeDetailsSave !== undefined && /^\d+$/.test(node.clientId) && (
              <button
                className="sp-button"
                disabled={isNodeDetailsSaving || node.name.trim().length === 0}
                type="button"
                onClick={() => onNodeDetailsSave(node.clientId)}
              >
                {ui.structureNodeDetailsSave}
              </button>
            )}
            <button
              className="sp-button danger"
              disabled={isTopologyLocked}
              type="button"
              onClick={() => onNodeRemove(node.clientId)}
            >
              {ui.delete}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function StructureEdgeDraftSection({
  edges,
  nodes,
  ui,
  onEdgeAdd,
  onEdgeChange,
  onEdgeRemove,
  isTopologyLocked = false,
}: {
  edges: StructureEdgeDraft[]
  nodes: StructureNodeDraft[]
  ui: PreviewText
  onEdgeAdd: () => void
  onEdgeChange: (edgeIndex: number, patch: Partial<StructureEdgeDraft>) => void
  onEdgeRemove: (edgeIndex: number) => void
  isTopologyLocked?: boolean
}) {
  const canCreateEdge = nodes.length > 1 && !isTopologyLocked
  const getNodeName = (clientId: string) =>
    nodes.find((node) => node.clientId === clientId)?.name.trim() || ui.structureNode

  return (
    <section className="sp-structure-edges">
      <div className="sp-structure-nodes-head">
        <div>
          <h3>{ui.structureEdges}</h3>
          <p>{ui.structureEdgesHint}</p>
        </div>
        <button className="sp-button" disabled={!canCreateEdge} type="button" onClick={onEdgeAdd}>
          {ui.structureAddEdge}
        </button>
      </div>

      {edges.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noStructureEdges}</strong>
          <span>{canCreateEdge ? ui.structureEdgesHint : ui.structureEdgesNeedNodes}</span>
        </div>
      ) : (
        <div className="sp-structure-edge-list">
          {edges.map((edge, edgeIndex) => (
            <article className="sp-structure-edge-row" key={`${edge.sourceClientId}-${edge.targetClientId}-${edgeIndex}`}>
              <label>
                {ui.structureEdgeSource}
                <select
                  disabled={isTopologyLocked}
                  value={edge.sourceClientId}
                  onChange={(event) => {
                    const sourceClientId = event.target.value
                    onEdgeChange(edgeIndex, {
                      sourceClientId,
                      targetClientId:
                        edge.targetClientId === sourceClientId
                          ? getFirstDifferentNodeClientId(nodes, sourceClientId)
                          : edge.targetClientId,
                    })
                  }}
                >
                  {nodes.map((node) => (
                    <option key={node.clientId} value={node.clientId}>
                      {node.name.trim() || ui.structureNode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {ui.structureEdgeTarget}
                <select
                  disabled={isTopologyLocked}
                  value={edge.targetClientId}
                  onChange={(event) => onEdgeChange(edgeIndex, { targetClientId: event.target.value })}
                >
                  {nodes
                    .filter((node) => node.clientId !== edge.sourceClientId)
                    .map((node) => (
                      <option key={node.clientId} value={node.clientId}>
                        {node.name.trim() || ui.structureNode}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {ui.relationType}
                <input
                  disabled={isTopologyLocked}
                  value={edge.relationType}
                  placeholder={ui.structureEdgeTypePlaceholder}
                  onChange={(event) => onEdgeChange(edgeIndex, { relationType: event.target.value })}
                />
              </label>
              <label>
                {ui.description}
                <input
                  disabled={isTopologyLocked}
                  value={edge.description}
                  onChange={(event) => onEdgeChange(edgeIndex, { description: event.target.value })}
                />
              </label>
              <label>
                {ui.structureSortOrder}
                <input
                  disabled={isTopologyLocked}
                  min="0"
                  type="number"
                  value={edge.sortOrder}
                  onChange={(event) =>
                    onEdgeChange(edgeIndex, {
                      sortOrder: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </label>
              <div className="sp-structure-edge-preview">
                <span>{getNodeName(edge.sourceClientId)}</span>
                <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
                <span>{getNodeName(edge.targetClientId)}</span>
              </div>
              <div className="sp-structure-node-actions">
                <button
                  className="sp-button danger"
                  disabled={isTopologyLocked}
                  type="button"
                  onClick={() => onEdgeRemove(edgeIndex)}
                >
                  {ui.delete}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
