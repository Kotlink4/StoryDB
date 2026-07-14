import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  assignObjectToStructureRequest,
  assignStructureRequest,
  createStructureRequest,
  deleteStructureAssignmentRequest,
  deleteStructureUsageRequest,
  fetchStructureAssignments,
  getApiErrorMessage,
  makeStructureUsageIndividualRequest,
  updateStructureAssignmentRequest,
  updateStructureUsageRequest,
} from '../../api'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  ObjectTypeKey,
  StoryObject,
  Structure,
  StructureAssignment,
  StructureNodeDraft,
  StructureSummary,
  StructureUsage,
} from '../../types'
import { loadOrganizationStructureData } from './organizationStructureData'
import { OrganizationStructureNodeDraftList } from './OrganizationStructureNodeDraftList'
import { OrganizationStructureUsageList } from './OrganizationStructureUsageList'
import {
  createEmptyOrganizationStructureNodeDraft,
  createStarterOrganizationNodes,
  emptyStructureNodes,
  prepareOrganizationStructureNodes,
} from './structurePanelUtils'
export function OrganizationStructureView({
  mode = 'readonly',
  objectsByType,
  selectedProjectId,
  storyObject,
  ui,
  onAssignmentsChange,
  onStructureWorkspaceChange,
}: {
  mode?: 'readonly' | 'editor'
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  selectedProjectId: number | null
  storyObject: StoryObject
  ui: PreviewText
  onAssignmentsChange?: (storyObjectId: number, assignments: StructureAssignment[]) => void
  onStructureWorkspaceChange?: () => void | Promise<void>
}) {
  const [availableStructures, setAvailableStructures] = useState<StructureSummary[]>([])
  const [assignmentObjectId, setAssignmentObjectId] = useState('')
  const [assignmentRoleLabel, setAssignmentRoleLabel] = useState('')
  const [assignmentStructureNodeId, setAssignmentStructureNodeId] = useState('')
  const [assignmentUsageId, setAssignmentUsageId] = useState('')
  const [individualStructureNodes, setIndividualStructureNodes] = useState<StructureNodeDraft[]>(() =>
    createStarterOrganizationNodes(ui),
  )
  const [isIndividualStructureBuilderOpen, setIsIndividualStructureBuilderOpen] = useState(false)
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [structureAssignments, setStructureAssignments] = useState<Record<number, StructureAssignment[]>>({})
  const [structureDetails, setStructureDetails] = useState<Record<number, Structure>>({})
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditorMode = mode === 'editor'
  const unassignedStructures = availableStructures.filter(
    (structure) => !structureUsages.some((usage) => usage.structureId === structure.id),
  )
  const assignableObjects = useMemo(
    () =>
      [...objectsByType.characters]
        .sort((left, right) => left.name.localeCompare(right.name)),
    [objectsByType.characters],
  )
  const assignmentUsage = structureUsages.find((usage) => String(usage.id) === assignmentUsageId) ?? null
  const assignmentStructure = assignmentUsage === null ? null : structureDetails[assignmentUsage.structureId] ?? null
  const assignmentNodes = assignmentStructure?.nodes ?? emptyStructureNodes
  const canCreateIndividualStructure =
    !isSaving && individualStructureNodes.some((node) => node.name.trim().length > 0)

  const refreshAssignmentsForStoryObjects = useCallback(
    async (storyObjectIds: number[]) => {
      if (selectedProjectId === null || onAssignmentsChange === undefined) {
        return
      }

      const uniqueStoryObjectIds = Array.from(new Set(storyObjectIds.filter((id) => id > 0)))
      await Promise.all(
        uniqueStoryObjectIds.map(async (storyObjectId) => {
          const assignments = await fetchStructureAssignments(selectedProjectId, { storyObjectId })
          onAssignmentsChange(storyObjectId, assignments)
        }),
      )
    },
    [onAssignmentsChange, selectedProjectId],
  )

  const loadStructureData = useCallback(async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const loadedData = await loadOrganizationStructureData(selectedProjectId, storyObject.id)
      setAvailableStructures(loadedData.availableStructures)
      setStructureUsages(loadedData.structureUsages)
      setStructureDetails(loadedData.structureDetails)
      setStructureAssignments(loadedData.structureAssignments)
      setSelectedStructureId((currentId) =>
        currentId.trim().length > 0 &&
        loadedData.availableStructures.some((structure) => String(structure.id) === currentId) &&
        !loadedData.structureUsages.some((usage) => String(usage.structureId) === currentId)
          ? currentId
          : String(
              loadedData.availableStructures.find(
                (structure) => !loadedData.structureUsages.some((usage) => usage.structureId === structure.id),
              )?.id ?? '',
            ),
      )
      setAssignmentUsageId((currentUsageId) =>
        loadedData.structureUsages.some((usage) => String(usage.id) === currentUsageId)
          ? currentUsageId
          : String(loadedData.structureUsages[0]?.id ?? ''),
      )
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignFailed))
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId, storyObject.id, ui.structureAssignFailed])

  const refreshStructureWorkspace = useCallback(async () => {
    await loadStructureData()
    await onStructureWorkspaceChange?.()
  }, [loadStructureData, onStructureWorkspaceChange])

  useEffect(() => {
    void loadStructureData()
  }, [loadStructureData])

  useEffect(() => {
    setIndividualStructureNodes(createStarterOrganizationNodes(ui))
    setIsIndividualStructureBuilderOpen(false)
  }, [storyObject.id, ui])

  useEffect(() => {
    setAssignmentObjectId((currentObjectId) =>
      assignableObjects.some((object) => String(object.id) === currentObjectId)
        ? currentObjectId
        : String(assignableObjects[0]?.id ?? ''),
    )
  }, [assignableObjects])

  useEffect(() => {
    setAssignmentStructureNodeId((currentNodeId) =>
      assignmentNodes.some((node) => String(node.id) === currentNodeId)
        ? currentNodeId
        : String(assignmentNodes[0]?.id ?? ''),
    )
  }, [assignmentNodes])

  const assignExistingStructure = async () => {
    if (selectedProjectId === null || selectedStructureId.trim().length === 0 || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await assignStructureRequest(selectedProjectId, Number(selectedStructureId), {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: '',
        isPrimary: structureUsages.length === 0,
      })
      setIsIndividualStructureBuilderOpen(false)
      await refreshStructureWorkspace()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const createIndividualStructure = async () => {
    if (selectedProjectId === null || !canCreateIndividualStructure) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const nodes = prepareOrganizationStructureNodes(individualStructureNodes)
      const structure = await createStructureRequest(selectedProjectId, {
        name: `${storyObject.name} - ${ui.structure}`,
        description: '',
        ownerKind: 'object',
        ownerId: storyObject.id,
        applicationScope: 'characters',
        layoutKind: 'levels',
        nodeBindingMode: 'none',
        catalogSyncMode: 'manual',
        linkedCatalogId: null,
        nodes,
        edges: [],
      })
      await assignStructureRequest(selectedProjectId, structure.id, {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: '',
        isPrimary: structureUsages.length === 0,
      })
      setIndividualStructureNodes(createStarterOrganizationNodes(ui))
      setIsIndividualStructureBuilderOpen(false)
      await refreshStructureWorkspace()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureCreateFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateIndividualStructureNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setIndividualStructureNodes((currentNodes) =>
      currentNodes.map((node) => (node.clientId === clientId ? { ...node, ...patch } : node)),
    )

  const addIndividualStructureNode = () =>
    setIndividualStructureNodes((currentNodes) => [
      ...currentNodes,
      createEmptyOrganizationStructureNodeDraft(currentNodes.length, currentNodes),
    ])

  const removeIndividualStructureNode = (clientId: string) =>
    setIndividualStructureNodes((currentNodes) =>
      currentNodes
        .filter((node) => node.clientId !== clientId)
        .map((node) => ({
          ...node,
          parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
        })),
    )

  const resetIndividualStructureNodes = () => setIndividualStructureNodes(createStarterOrganizationNodes(ui))

  const makeUsageIndividual = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const affectedStoryObjectIds = (structureAssignments[usage.id] ?? [])
        .map((assignment) => assignment.storyObjectId ?? assignment.targetId)
      await makeStructureUsageIndividualRequest(selectedProjectId, usage.id)
      await refreshStructureWorkspace()
      await refreshAssignmentsForStoryObjects(affectedStoryObjectIds)
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureMakeIndividualFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateUsagePrimaryState = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving || usage.isPrimary) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateStructureUsageRequest(selectedProjectId, usage.id, {
        targetKind: usage.targetKind,
        targetId: usage.targetId,
        displayName: usage.displayName ?? '',
        notes: usage.notes ?? '',
        isPrimary: true,
      })
      await refreshStructureWorkspace()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureUsageUpdateFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const disconnectUsage = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await deleteStructureUsageRequest(selectedProjectId, usage.id)
      await refreshStructureWorkspace()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureDisconnectFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const createAssignment = async () => {
    if (
      selectedProjectId === null ||
      assignmentUsage === null ||
      assignmentObjectId.trim().length === 0 ||
      assignmentStructureNodeId.trim().length === 0 ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const assignments = structureAssignments[assignmentUsage.id] ?? []
      const assignment = await assignObjectToStructureRequest(selectedProjectId, assignmentUsage.id, {
        structureNodeId: Number(assignmentStructureNodeId),
        storyObjectId: Number(assignmentObjectId),
        targetKind: 'storyObject',
        targetId: Number(assignmentObjectId),
        roleLabel: assignmentRoleLabel,
        notes: '',
        sortOrder: assignments.length,
      })
      setAssignmentRoleLabel('')
      await refreshStructureWorkspace()
      await refreshAssignmentsForStoryObjects([assignment.storyObjectId ?? assignment.targetId])
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAssignment = async (assignment: StructureAssignment) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const affectedStoryObjectId = assignment.storyObjectId ?? assignment.targetId
      await deleteStructureAssignmentRequest(selectedProjectId, assignment.id)
      await refreshStructureWorkspace()
      await refreshAssignmentsForStoryObjects([affectedStoryObjectId])
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentDeleteFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateAssignmentRole = async (assignment: StructureAssignment, nextRoleLabel: string) => {
    if (selectedProjectId === null || isSaving || nextRoleLabel.trim() === (assignment.roleLabel ?? '')) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updatedAssignment = await updateStructureAssignmentRequest(selectedProjectId, assignment.id, {
        structureNodeId: assignment.structureNodeId,
        storyObjectId: assignment.storyObjectId,
        targetKind: assignment.targetKind,
        targetId: assignment.targetId,
        roleLabel: nextRoleLabel,
        notes: assignment.notes ?? '',
        sortOrder: assignment.sortOrder,
      })
      await refreshStructureWorkspace()
      await refreshAssignmentsForStoryObjects([updatedAssignment.storyObjectId ?? updatedAssignment.targetId])
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedProjectId === null) {
    return (
      <section className="sp-panel sp-organization-structure-empty">
        <h3>{ui.structure}</h3>
        <p>{ui.projectNotSelected}</p>
      </section>
    )
  }

  return (
    <section className="sp-panel sp-organization-structure">
      <h3>{ui.structure}</h3>
      <p>{ui.organizationStructureUsageHint}</p>

      {error !== null && <p className="sp-editor-error">{error}</p>}
      {isLoading && <p className="sp-editor-hint">{ui.loading}</p>}

      {isEditorMode && (
        <div className="sp-structure-connect-panel">
          <label>
            {ui.structureTemplate}
            <select
              disabled={unassignedStructures.length === 0 || isSaving}
              value={selectedStructureId}
              onChange={(event) => setSelectedStructureId(event.target.value)}
            >
              {unassignedStructures.length === 0 ? (
                <option value="">{ui.noStructures}</option>
              ) : (
                unassignedStructures.map((structure) => (
                  <option key={structure.id} value={structure.id}>
                    {structure.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="sp-detail-actions">
            <button
              className="sp-button primary"
              disabled={unassignedStructures.length === 0 || isSaving}
              type="button"
              onClick={() => void assignExistingStructure()}
            >
              {ui.structureAssignExisting}
            </button>
            <button
              className="sp-button"
              disabled={isSaving}
              type="button"
              onClick={() => setIsIndividualStructureBuilderOpen((isOpen) => !isOpen)}
            >
              {isIndividualStructureBuilderOpen ? ui.cancel : ui.structureCreateIndividual}
            </button>
          </div>
          {isIndividualStructureBuilderOpen && (
            <div className="sp-organization-structure-builder">
              <div className="sp-structure-nodes-head">
                <div>
                  <h3>{ui.structureQuickBuilder}</h3>
                  <p>{ui.structureQuickBuilderHint}</p>
                </div>
                <div className="sp-detail-actions">
                  <button className="sp-button" disabled={isSaving} type="button" onClick={addIndividualStructureNode}>
                    {ui.structureAddNode}
                  </button>
                  <button className="sp-button" disabled={isSaving} type="button" onClick={resetIndividualStructureNodes}>
                    {ui.structureResetStarterNodes}
                  </button>
                </div>
              </div>
              <OrganizationStructureNodeDraftList
                nodes={individualStructureNodes}
                ui={ui}
                onNodeChange={updateIndividualStructureNode}
                onNodeRemove={removeIndividualStructureNode}
              />
              <div className="sp-detail-actions">
                <button
                  className="sp-button primary"
                  disabled={!canCreateIndividualStructure}
                  type="button"
                  onClick={() => void createIndividualStructure()}
                >
                  {ui.structureCreateIndividual}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isEditorMode && structureUsages.length > 0 && (
        <div className="sp-structure-assignment-editor">
          <div>
            <strong>{ui.structureAssignmentEditor}</strong>
            <p className="sp-editor-hint">{ui.organizationStructureAssignmentEditorHint}</p>
          </div>
          <div className="sp-structure-membership-controls">
            <label>
              {ui.structure}
              <select
                disabled={structureUsages.length === 0 || isSaving}
                value={assignmentUsageId}
                onChange={(event) => setAssignmentUsageId(event.target.value)}
              >
                {structureUsages.map((usage) => (
                  <option key={usage.id} value={usage.id}>
                    {usage.displayName ?? usage.structureName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {ui.structureNode}
              <select
                disabled={assignmentNodes.length === 0 || isSaving}
                value={assignmentStructureNodeId}
                onChange={(event) => setAssignmentStructureNodeId(event.target.value)}
              >
                {assignmentNodes.length === 0 ? (
                  <option value="">{ui.noStructureNodes}</option>
                ) : (
                  assignmentNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.character}
              <select
                disabled={assignableObjects.length === 0 || isSaving}
                value={assignmentObjectId}
                onChange={(event) => setAssignmentObjectId(event.target.value)}
              >
                {assignableObjects.length === 0 ? (
                  <option value="">{ui.noAvailableObjects}</option>
                ) : (
                  assignableObjects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.role}
              <input value={assignmentRoleLabel} onChange={(event) => setAssignmentRoleLabel(event.target.value)} />
            </label>
            <button
              className="sp-button primary"
              disabled={
                assignmentUsage === null ||
                assignmentStructureNodeId.trim().length === 0 ||
                assignmentObjectId.trim().length === 0 ||
                isSaving
              }
              type="button"
              onClick={() => void createAssignment()}
            >
              {isSaving ? ui.saving : ui.structureAssignObject}
            </button>
          </div>
        </div>
      )}

      <OrganizationStructureUsageList
        isSaving={isSaving}
        mode={mode}
        structureAssignments={structureAssignments}
        structureDetails={structureDetails}
        structureUsages={structureUsages}
        ui={ui}
        onAssignmentDelete={(assignment) => void deleteAssignment(assignment)}
        onAssignmentRoleUpdate={(assignment, roleLabel) => void updateAssignmentRole(assignment, roleLabel)}
        onUsageDisconnect={(usage) => void disconnectUsage(usage)}
        onUsageIndividualize={(usage) => void makeUsageIndividual(usage)}
        onUsagePrimary={(usage) => void updateUsagePrimaryState(usage)}
      />
    </section>
  )
}

