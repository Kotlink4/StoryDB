import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

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
  StructureAssignment,
  StructureDraft,
  StructureEdgeDraft,
  StructureNodeDraft,
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
import {
  addStructureDraftEdge,
  addStructureDraftNode,
  clearNodeCatalogBindings,
  emptyStructureDraft,
  getStructureEdgeKey,
  removeStructureDraftEdge,
  removeStructureDraftNode,
  toStructureDraft,
  updateStructureDraftEdge,
  updateStructureDraftNode,
  type StructureWorkspacePage,
} from './structure-workspace/structureDraftUtils'
import { useStructureAssignmentMaps } from './structure-workspace/useStructureAssignmentMaps'

export function StructuresWorkspace({
  catalogs,
  catalogEntriesByCatalogId,
  errorMessage,
  detailMode,
  selectedProject,
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
  const [assignmentUsageId, setAssignmentUsageId] = useState('')
  const [assignmentNodeId, setAssignmentNodeId] = useState('')
  const [assignmentCatalogEntryId, setAssignmentCatalogEntryId] = useState('')
  const [assignmentRoleLabel, setAssignmentRoleLabel] = useState('')
  const availableCatalogs = catalogs
  const catalogEntryOptions = useMemo(
    () =>
      catalogs.flatMap((catalog) =>
        (catalogEntriesByCatalogId[catalog.id] ?? []).map((entry) => ({ catalog, entry })),
      ),
    [catalogEntriesByCatalogId, catalogs],
  )
  const canSaveStructure =
    draft.name.trim().length > 0 &&
    !isSaving

  const loadStructures = useCallback(async () => {
    setStructures(await fetchStructures(selectedProject.id))
  }, [selectedProject.id])

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
    setAssignmentUsageId('')
    setAssignmentNodeId('')
    setAssignmentCatalogEntryId('')
    setAssignmentRoleLabel('')
    setSystemMode('view')
    setSchemaMode('view')
    void loadStructures().catch(() => onError(errorMessage))
  }, [errorMessage, loadStructures, onError, selectedProject.id])

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

  const updateDraft = (patch: Partial<StructureDraft>) => setDraft((currentDraft) => ({ ...currentDraft, ...patch }))

  const updateDraftNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setDraft((currentDraft) => updateStructureDraftNode(currentDraft, clientId, patch))

  const addDraftNode = () =>
    setDraft(addStructureDraftNode)

  const updateDraftEdge = (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
    setDraft((currentDraft) => updateStructureDraftEdge(currentDraft, edgeIndex, patch))

  const addDraftEdge = () =>
    setDraft((currentDraft) => addStructureDraftEdge(currentDraft, ui.structureEdgeDefaultType))

  const removeDraftEdge = (edgeIndex: number) =>
    setDraft((currentDraft) => removeStructureDraftEdge(currentDraft, edgeIndex))

  const removeDraftNode = (clientId: string) =>
    setDraft((currentDraft) => removeStructureDraftNode(currentDraft, clientId))

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

  const updateSelectedDraft = (patch: Partial<StructureDraft>) =>
    setSelectedDraft((currentDraft) => (currentDraft === null ? currentDraft : { ...currentDraft, ...patch }))

  const updateSelectedNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : updateStructureDraftNode(currentDraft, clientId, patch),
    )

  const addSelectedNode = () =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : addStructureDraftNode(currentDraft),
    )

  const updateSelectedEdge = (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : updateStructureDraftEdge(currentDraft, edgeIndex, patch),
    )

  const addSelectedEdge = () =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : addStructureDraftEdge(currentDraft, ui.structureEdgeDefaultType),
    )

  const removeSelectedEdge = (edgeIndex: number) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : removeStructureDraftEdge(currentDraft, edgeIndex),
    )

  const removeSelectedNode = (clientId: string) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : removeStructureDraftNode(currentDraft, clientId),
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
  useEffect(() => {
    setAssignmentUsageId((currentUsageId) =>
      selectedStructureUsages.some((usage) => String(usage.id) === currentUsageId)
        ? currentUsageId
        : String(selectedStructureUsages[0]?.id ?? ''),
    )
  }, [selectedStructureUsages])

  useEffect(() => {
    const nodeIds = selectedDraft?.nodes
      .map((node) => (/^\d+$/.test(node.clientId) ? node.clientId : ''))
      .filter((nodeId) => nodeId.length > 0) ?? []
    setAssignmentNodeId((currentNodeId) =>
      nodeIds.includes(currentNodeId) ? currentNodeId : nodeIds[0] ?? '',
    )
  }, [selectedDraft])

  useEffect(() => {
    const entryIds = catalogEntryOptions.map(({ entry }) => String(entry.id))
    setAssignmentCatalogEntryId((currentEntryId) =>
      entryIds.includes(currentEntryId) ? currentEntryId : entryIds[0] ?? '',
    )
  }, [catalogEntryOptions])

  const hasSelectedStructureAssignments = selectedStructureAssignments.length > 0
  const hasSelectedStructureTimelineReferences = selectedStructureTimelineReferenceCount > 0
  const isSelectedTopologyLocked = hasSelectedStructureAssignments || hasSelectedStructureTimelineReferences
  const selectedStructureNode =
    selectedDraft === null || selectedStructureNodeClientId === null
      ? null
      : selectedDraft.nodes.find((node) => node.clientId === selectedStructureNodeClientId) ?? null
  const canRenderStructureNodeDossier = selectedDraft !== null && selectedStructureNode !== null
  const renderSelectedStructureNodeDossier = (showCloseButton = true) =>
    canRenderStructureNodeDossier ? (
      <StructureNodeDossier
        assignmentsByNodeId={selectedAssignmentsByNodeId}
        draft={selectedDraft}
        node={selectedStructureNode}
        showCloseButton={showCloseButton}
        ui={ui}
        onOpenEdge={(edge) => {
          setSelectedStructureEdgeKey(getStructureEdgeKey(edge))
          setSelectedStructureNodeClientId(null)
        }}
        onClose={() => setSelectedStructureNodeClientId(null)}
      />
    ) : null
  const selectedStructureEdge =
    selectedDraft === null || selectedStructureEdgeKey === null
      ? null
      : selectedDraft.edges.find((edge) => getStructureEdgeKey(edge) === selectedStructureEdgeKey) ?? null
  const canRenderStructureEdgeDossier = selectedDraft !== null && selectedStructureEdge !== null
  const renderSelectedStructureEdgeDossier = (showCloseButton = true) =>
    canRenderStructureEdgeDossier ? (
      <StructureEdgeDossier
        draft={selectedDraft}
        edge={selectedStructureEdge}
        showCloseButton={showCloseButton}
        ui={ui}
        onClose={() => setSelectedStructureEdgeKey(null)}
      />
    ) : null

  useEffect(() => {
    if (detailMode !== 'panel' || activeStructurePage !== 'schema' || selectedDraft === null) {
      onDetailPanelChange(null)
      return
    }

    if (selectedStructureNode !== null) {
      onDetailPanelChange(
        <StructureNodeDossier
          assignmentsByNodeId={selectedAssignmentsByNodeId}
          draft={selectedDraft}
          node={selectedStructureNode}
          showCloseButton
          ui={ui}
          onOpenEdge={(edge) => {
            setSelectedStructureEdgeKey(getStructureEdgeKey(edge))
            setSelectedStructureNodeClientId(null)
          }}
          onClose={() => setSelectedStructureNodeClientId(null)}
        />,
      )
      return
    }

    if (selectedStructureEdge !== null) {
      onDetailPanelChange(
        <StructureEdgeDossier
          draft={selectedDraft}
          edge={selectedStructureEdge}
          showCloseButton
          ui={ui}
          onClose={() => setSelectedStructureEdgeKey(null)}
        />,
      )
      return
    }

    onDetailPanelChange(null)
  }, [
    activeStructurePage,
    detailMode,
    onDetailPanelChange,
    selectedAssignmentsByNodeId,
    selectedDraft,
    selectedStructureEdge,
    selectedStructureNode,
    ui,
  ])

  useEffect(() => () => onDetailPanelChange(null), [onDetailPanelChange])

  const structurePages: Array<{ key: StructureWorkspacePage; label: string; description: string }> = [
    { key: 'overview', label: ui.structurePageOverview, description: ui.structurePageOverviewHint },
    { key: 'create', label: ui.structurePageCreate, description: ui.structurePageCreateHint },
    { key: 'system', label: ui.structurePageSystem, description: ui.structurePageSystemHint },
    { key: 'schema', label: ui.structurePageSchema, description: ui.structurePageSchemaHint },
    { key: 'objects', label: ui.structurePageObjects, description: ui.structurePageObjectsHint },
  ]
  const selectedStructurePages = structurePages.filter((page) => page.key !== 'overview' && page.key !== 'create')
  const isSelectedStructurePage = selectedStructurePages.some((page) => page.key === activeStructurePage)
  const activeStructurePageDescription =
    structurePages.find((page) => page.key === activeStructurePage)?.description ?? ui.structuresDescription
  if (
    activeStructurePage === 'schema' &&
    detailMode === 'page' &&
    selectedDraft !== null &&
    canRenderStructureNodeDossier
  ) {
    return (
      <StructureDossierPage
        description={ui.structurePageSchemaHint}
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
        description={ui.structureEdgesHint}
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
      <div className="sp-workspace-head">
        <div>
          <h2>{ui.structures}</h2>
          <p>{activeStructurePageDescription}</p>
        </div>
        {activeStructurePage === 'overview' && (
          <button className="sp-button primary" type="button" onClick={() => setActiveStructurePage('create')}>
            {ui.create}
          </button>
        )}
        {activeStructurePage === 'create' && (
          <button className="sp-button" type="button" onClick={() => setActiveStructurePage('overview')}>
            {ui.back}
          </button>
        )}
        {isSelectedStructurePage && (
          <button
            className="sp-icon-button sp-page-back-button"
            type="button"
            aria-label={ui.back}
            title={ui.back}
            onClick={() => setActiveStructurePage('overview')}
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        )}
      </div>

      {isSelectedStructurePage && (
      <div className="sp-tabs sp-structure-task-tabs" role="tablist" aria-label={ui.structures}>
        {selectedStructurePages.map((page) => (
          <button
            className={activeStructurePage === page.key ? 'active' : ''}
            key={page.key}
            type="button"
            onClick={() => setActiveStructurePage(page.key)}
          >
            {page.label}
          </button>
        ))}
      </div>
      )}

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
          activeStructurePageDescription={activeStructurePageDescription}
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
