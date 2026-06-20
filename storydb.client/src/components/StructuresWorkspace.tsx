import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  assignObjectToStructureRequest,
  createStructureRequest,
  deleteStructureRequest,
  fetchStructure,
  fetchStructureAssignments,
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
  Structure,
  StructureAssignment,
  StructureDraft,
  StructureEdgeDraft,
  StructureSummary,
  StructureUsage,
  StoryProject,
} from '../types'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { DetailMode } from '../style-preview/domain/stylePreviewUiTypes'
import { PreviewDialog } from './StylePreviewPrimitives'
import { StructureCreatePanel } from './structure-workspace/StructureCreatePanel'
import { StructureDetailEditor } from './structure-workspace/StructureDetailEditor'
import { StructureDossierPage } from './structure-workspace/StructureDossierPage'
import { StructureEdgeDossier, StructureNodeDossier } from './structure-workspace/StructureDossierPanels'
import { StructureOverviewList } from './structure-workspace/StructureOverviewList'
import { StructureWorkspaceHeader } from './structure-workspace/StructureWorkspaceHeader'
import {
  clearNodeCatalogBindings,
  emptyStructureDraft,
  getStructureEdgeKey,
  toStructureDraft,
  type StructureWorkspacePage,
} from './structure-workspace/structureDraftUtils'
import {
  buildStructureCatalogEntryOptions,
  buildStructureWorkspacePages,
  findSelectedStructureEdge,
  findSelectedStructureNode,
} from './structure-workspace/structureWorkspaceModel'
import { useStructureAssignmentMaps } from './structure-workspace/useStructureAssignmentMaps'
import { useStructureAssignmentSelection } from './structure-workspace/useStructureAssignmentSelection'
import { useStructureDetailPanel } from './structure-workspace/useStructureDetailPanel'
import { useStructureDraftMutators } from './structure-workspace/useStructureDraftMutators'

export function StructuresWorkspace({
  catalogs,
  catalogEntriesByCatalogId,
  errorMessage,
  detailMode,
  selectedProject,
  snapshotStructures,
  snapshotStructureUsages,
  ui,
  onDetailPanelChange,
  onError,
  onMessage,
}: {
  catalogs: Catalog[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  errorMessage: string
  detailMode: DetailMode
  selectedProject: StoryProject
  snapshotStructures: Structure[] | null
  snapshotStructureUsages: StructureUsage[] | null
  ui: PreviewText
  onDetailPanelChange: (panel: ReactNode | null) => void
  onError: (message: string) => void
  onMessage: (message: string) => void
}) {
  const [draft, setDraft] = useState<StructureDraft>(() => emptyStructureDraft(selectedProject.id))
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailSaving, setIsDetailSaving] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [structures, setStructures] = useState<StructureSummary[]>([])
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<StructureDraft | null>(null)
  const [activeStructurePage, setActiveStructurePage] = useState<StructureWorkspacePage>('overview')
  const [systemMode, setSystemMode] = useState<'view' | 'edit'>('view')
  const [schemaMode, setSchemaMode] = useState<'view' | 'edit'>('view')
  const [selectedStructureNodeClientId, setSelectedStructureNodeClientId] = useState<string | null>(null)
  const [selectedStructureEdgeKey, setSelectedStructureEdgeKey] = useState<string | null>(null)
  const [selectedStructureAssignments, setSelectedStructureAssignments] = useState<StructureAssignment[]>([])
  const [selectedStructureUsages, setSelectedStructureUsages] = useState<StructureUsage[]>([])
  const [selectedStructureTimelineReferenceCount, setSelectedStructureTimelineReferenceCount] = useState(0)
  const availableCatalogs = catalogs
  const catalogEntryOptions = useMemo(
    () => buildStructureCatalogEntryOptions(catalogs, catalogEntriesByCatalogId),
    [catalogEntriesByCatalogId, catalogs],
  )
  const {
    addDraftEdge,
    addDraftNode,
    addSelectedEdge,
    addSelectedNode,
    removeDraftEdge,
    removeDraftNode,
    removeSelectedEdge,
    removeSelectedNode,
    updateDraft,
    updateDraftEdge,
    updateDraftNode,
    updateSelectedDraft,
    updateSelectedEdge,
    updateSelectedNode,
  } = useStructureDraftMutators({
    defaultEdgeType: ui.structureEdgeDefaultType,
    setDraft,
    setSelectedDraft,
  })
  const {
    assignmentCatalogEntryId,
    assignmentNodeId,
    assignmentRoleLabel,
    assignmentUsageId,
    resetAssignmentSelection,
    setAssignmentCatalogEntryId,
    setAssignmentNodeId,
    setAssignmentRoleLabel,
    setAssignmentUsageId,
  } = useStructureAssignmentSelection({
    catalogEntryOptions,
    selectedDraft,
    usages: selectedStructureUsages,
  })
  const canSaveStructure =
    draft.name.trim().length > 0 &&
    !isSaving
  const snapshotStructureSummaries = useMemo(
    () =>
      snapshotStructures?.map((structure) => ({
        ...structure,
        edgeCount: structure.edges.length,
        nodeCount: structure.nodes.length,
        usageCount: snapshotStructureUsages?.filter((usage) => usage.structureId === structure.id).length ?? 0,
      })) ?? null,
    [snapshotStructureUsages, snapshotStructures],
  )

  const loadStructures = useCallback(async () => {
    if (snapshotStructureSummaries !== null) {
      setStructures(snapshotStructureSummaries)
      return
    }

    setStructures(await fetchStructures(selectedProject.id))
  }, [selectedProject.id, snapshotStructureSummaries])

  useEffect(() => {
    setDraft(emptyStructureDraft(selectedProject.id))
    setSelectedStructureId(null)
    setSelectedDraft(null)
    setActiveStructurePage('overview')
    setSelectedStructureNodeClientId(null)
    setSelectedStructureEdgeKey(null)
    setSelectedStructureAssignments([])
    setSelectedStructureUsages([])
    setSelectedStructureTimelineReferenceCount(0)
    resetAssignmentSelection()
    setSystemMode('view')
    setSchemaMode('view')
    void loadStructures().catch(() => onError(errorMessage))
  }, [errorMessage, loadStructures, onError, resetAssignmentSelection, selectedProject.id])

  const saveStructure = async () => {
    if (!canSaveStructure) {
      return
    }

    setIsSaving(true)
    try {
      const ownerKind = draft.ownerKind
      const createdStructure = await createStructureRequest(selectedProject.id, {
        ...draft,
        nodeBindingMode: 'none',
        linkedCatalogId: null,
        catalogSyncMode: 'manual',
        nodes: clearNodeCatalogBindings(draft.nodes),
        ownerId: ownerKind === 'project' ? null : draft.ownerId,
      })
      setDraft(emptyStructureDraft(selectedProject.id))
      await loadStructures()
      setSelectedStructureId(createdStructure.id)
      setSelectedDraft(toStructureDraft(createdStructure))
      setActiveStructurePage('system')
      setSystemMode('view')
      setSchemaMode('view')
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
        setSelectedStructureNodeClientId(null)
        setSelectedStructureEdgeKey(null)
        setSelectedStructureAssignments([])
        setSelectedStructureUsages([])
        setSelectedStructureTimelineReferenceCount(0)
      }
      await loadStructures()
      onMessage(ui.deleted)
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    }
  }

  const openStructure = async (structureId: number) => {
    setSelectedStructureId(structureId)
    setIsDetailLoading(true)
    try {
      const [structure, assignments] = await Promise.all([
        fetchStructure(selectedProject.id, structureId),
        fetchStructureAssignments(selectedProject.id, { structureId }),
      ])
      const usages = await fetchStructureUsages(selectedProject.id, { structureId })
      setSelectedDraft(toStructureDraft(structure))
      setSelectedStructureAssignments(assignments)
      setSelectedStructureUsages(usages)
      setSelectedStructureTimelineReferenceCount(structure.timelineReferenceCount)
      setSystemMode('view')
      setSchemaMode('view')
      setActiveStructurePage((currentPage) => (currentPage === 'overview' ? 'system' : currentPage))
    } catch (error) {
      onError(getApiErrorMessage(error, errorMessage))
    } finally {
      setIsDetailLoading(false)
    }
  }

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
      setSystemMode('view')
      setSchemaMode('view')
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
      setSystemMode('view')
      setSchemaMode('view')
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

  const assignCatalogEntryToStructure = async () => {
    if (
      selectedStructureId === null ||
      assignmentUsageId.trim().length === 0 ||
      assignmentNodeId.trim().length === 0 ||
      assignmentCatalogEntryId.trim().length === 0 ||
      isDetailSaving
    ) {
      return
    }

    setIsDetailSaving(true)
    try {
      await assignObjectToStructureRequest(selectedProject.id, Number(assignmentUsageId), {
        structureNodeId: Number(assignmentNodeId),
        targetKind: 'catalogEntry',
        targetId: Number(assignmentCatalogEntryId),
        roleLabel: assignmentRoleLabel,
        notes: '',
        sortOrder: selectedStructureAssignments.length,
      })
      setAssignmentRoleLabel('')
      setSelectedStructureAssignments(await fetchStructureAssignments(selectedProject.id, { structureId: selectedStructureId }))
      onMessage(ui.saved)
    } catch (error) {
      onError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsDetailSaving(false)
    }
  }

  const {
    assignmentsByNodeId: selectedAssignmentsByNodeId,
    countsByNodeId: selectedAssignmentCountsByNodeId,
    countsByUsageId: selectedAssignmentCountsByUsageId,
  } = useStructureAssignmentMaps(selectedStructureAssignments)
  const hasSelectedStructureAssignments = selectedStructureAssignments.length > 0
  const hasSelectedStructureTimelineReferences = selectedStructureTimelineReferenceCount > 0
  const isSelectedTopologyLocked = hasSelectedStructureAssignments || hasSelectedStructureTimelineReferences
  const selectedStructureNode = findSelectedStructureNode(selectedDraft, selectedStructureNodeClientId)
  const canRenderStructureNodeDossier = selectedDraft !== null && selectedStructureNode !== null
  const closeSelectedStructureNode = useCallback(() => setSelectedStructureNodeClientId(null), [])
  const closeSelectedStructureEdge = useCallback(() => setSelectedStructureEdgeKey(null), [])
  const openSelectedStructureEdge = useCallback((edge: StructureEdgeDraft) => {
    setSelectedStructureEdgeKey(getStructureEdgeKey(edge))
    setSelectedStructureNodeClientId(null)
  }, [])
  const renderSelectedStructureNodeDossier = (showCloseButton = true) =>
    canRenderStructureNodeDossier ? (
      <StructureNodeDossier
        assignmentsByNodeId={selectedAssignmentsByNodeId}
        draft={selectedDraft}
        node={selectedStructureNode}
        showCloseButton={showCloseButton}
        ui={ui}
        onOpenEdge={openSelectedStructureEdge}
        onClose={closeSelectedStructureNode}
      />
    ) : null
  const selectedStructureEdge = findSelectedStructureEdge(selectedDraft, selectedStructureEdgeKey)
  const canRenderStructureEdgeDossier = selectedDraft !== null && selectedStructureEdge !== null
  const renderSelectedStructureEdgeDossier = (showCloseButton = true) =>
    canRenderStructureEdgeDossier ? (
      <StructureEdgeDossier
        draft={selectedDraft}
        edge={selectedStructureEdge}
        showCloseButton={showCloseButton}
        ui={ui}
        onClose={closeSelectedStructureEdge}
      />
    ) : null

  useStructureDetailPanel({
    activePage: activeStructurePage,
    assignmentsByNodeId: selectedAssignmentsByNodeId,
    detailMode,
    onCloseEdge: closeSelectedStructureEdge,
    onCloseNode: closeSelectedStructureNode,
    onDetailPanelChange,
    onOpenEdge: openSelectedStructureEdge,
    selectedDraft,
    selectedEdge: selectedStructureEdge,
    selectedNode: selectedStructureNode,
    ui,
  })

  const structurePages = buildStructureWorkspacePages(ui)
  const selectedStructurePages = structurePages.filter((page) => page.key !== 'overview' && page.key !== 'create')
  const isSelectedStructurePage = selectedStructurePages.some((page) => page.key === activeStructurePage)
  if (
    activeStructurePage === 'schema' &&
    detailMode === 'page' &&
    selectedDraft !== null &&
    canRenderStructureNodeDossier
  ) {
    return (
      <StructureDossierPage
        title={selectedStructureNode?.name.trim() || ui.structureNodeDossier}
        ui={ui}
        onBack={() => setSelectedStructureNodeClientId(null)}
      >
        {renderSelectedStructureNodeDossier(false)}
      </StructureDossierPage>
    )
  }

  if (
    activeStructurePage === 'schema' &&
    detailMode === 'page' &&
    selectedDraft !== null &&
    canRenderStructureEdgeDossier
  ) {
    return (
      <StructureDossierPage
        title={selectedStructureEdge?.relationType.trim() || ui.structureEdgeDefaultType}
        ui={ui}
        onBack={() => setSelectedStructureEdgeKey(null)}
      >
        {renderSelectedStructureEdgeDossier(false)}
      </StructureDossierPage>
    )
  }

  return (
    <section className="sp-database-main sp-structures-workspace">
      <StructureWorkspaceHeader
        activePage={activeStructurePage}
        isSelectedStructurePage={isSelectedStructurePage}
        selectedPages={selectedStructurePages}
        ui={ui}
        onCreate={() => setActiveStructurePage('create')}
        onPageChange={setActiveStructurePage}
      />

      {activeStructurePage === 'create' && (
        <StructureCreatePanel
          canSaveStructure={canSaveStructure}
          draft={draft}
          isSaving={isSaving}
          selectedProject={selectedProject}
          ui={ui}
          onDraftChange={updateDraft}
          onEdgeAdd={addDraftEdge}
          onEdgeChange={updateDraftEdge}
          onEdgeRemove={removeDraftEdge}
          onNodeAdd={addDraftNode}
          onNodeChange={updateDraftNode}
          onNodeRemove={removeDraftNode}
          onSave={() => void saveStructure()}
        />
      )}

      {activeStructurePage === 'overview' && (
        <StructureOverviewList
          selectedStructureId={selectedStructureId}
          structures={structures}
          ui={ui}
          onCreate={() => setActiveStructurePage('create')}
          onDelete={(structure) => void deleteStructure(structure)}
          onOpen={(structureId) => void openStructure(structureId)}
        />
      )}

      {isSelectedStructurePage && (
        <StructureDetailEditor
          activeStructurePage={activeStructurePage}
          assignmentCatalogEntryId={assignmentCatalogEntryId}
          assignmentNodeId={assignmentNodeId}
          assignmentRoleLabel={assignmentRoleLabel}
          assignmentUsageId={assignmentUsageId}
          availableCatalogs={availableCatalogs}
          catalogEntryOptions={catalogEntryOptions}
          hasSelectedStructureAssignments={hasSelectedStructureAssignments}
          hasSelectedStructureTimelineReferences={hasSelectedStructureTimelineReferences}
          isDetailLoading={isDetailLoading}
          isDetailSaving={isDetailSaving}
          isSelectedTopologyLocked={isSelectedTopologyLocked}
          schemaMode={schemaMode}
          selectedAssignmentCountsByNodeId={selectedAssignmentCountsByNodeId}
          selectedAssignmentCountsByUsageId={selectedAssignmentCountsByUsageId}
          selectedAssignmentsByNodeId={selectedAssignmentsByNodeId}
          selectedDraft={selectedDraft}
          selectedProject={selectedProject}
          selectedStructureAssignments={selectedStructureAssignments}
          selectedStructureNodeClientId={selectedStructureNodeClientId}
          selectedStructureTimelineReferenceCount={selectedStructureTimelineReferenceCount}
          selectedStructureUsages={selectedStructureUsages}
          systemMode={systemMode}
          ui={ui}
          onAssignmentCatalogEntryIdChange={setAssignmentCatalogEntryId}
          onAssignmentNodeIdChange={setAssignmentNodeId}
          onAssignmentRoleLabelChange={setAssignmentRoleLabel}
          onAssignmentUsageIdChange={setAssignmentUsageId}
          onCatalogEntryAssign={() => void assignCatalogEntryToStructure()}
          onSchemaModeChange={setSchemaMode}
          onSelectedDraftChange={updateSelectedDraft}
          onSelectedEdgeAdd={addSelectedEdge}
          onSelectedEdgeChange={updateSelectedEdge}
          onSelectedEdgeRemove={removeSelectedEdge}
          onSelectedNodeAdd={addSelectedNode}
          onSelectedNodeChange={updateSelectedNode}
          onSelectedNodeClientIdChange={(clientId) => {
            setSelectedStructureEdgeKey(null)
            setSelectedStructureNodeClientId(clientId)
          }}
          onSelectedNodeDetailsSave={(clientId) => void saveSelectedNodeDetails(clientId)}
          onSelectedNodeRemove={removeSelectedNode}
          onSelectedStructureDetailsSave={() => void saveSelectedStructureDetails()}
          onSelectedStructureSave={() => void saveSelectedStructure()}
          onSystemModeChange={setSystemMode}
        />
      )}
      {detailMode === 'modal' && canRenderStructureNodeDossier && (
        <PreviewDialog title={ui.structureNodeDossier} onClose={() => setSelectedStructureNodeClientId(null)}>
          {renderSelectedStructureNodeDossier(false)}
        </PreviewDialog>
      )}
      {detailMode === 'modal' && canRenderStructureEdgeDossier && (
        <PreviewDialog title={ui.structureEdges} onClose={() => setSelectedStructureEdgeKey(null)}>
          {renderSelectedStructureEdgeDossier(false)}
        </PreviewDialog>
      )}
    </section>
  )
}
