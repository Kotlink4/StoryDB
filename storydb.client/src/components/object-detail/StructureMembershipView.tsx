import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  assignObjectToStructureRequest,
  deleteStructureAssignmentRequest,
  fetchStructure,
  fetchStructureAssignments,
  fetchStructureUsages,
  getApiErrorMessage,
  updateStructureAssignmentRequest,
  updateTimelineEventRequest,
} from '../../api'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { toTimelineEventDraft } from '../../style-preview/domain/stylePreviewTimelineDrafts'
import { resolveStructureAssignmentsTemporalState } from '../../style-preview/domain/temporalState'
import type {
  Catalog,
  ObjectTypeKey,
  StoryObject,
  Structure,
  StructureAssignment,
  StructureUsage,
  TimelineChangeDraft,
  TimelineEvent,
} from '../../types'
import { CollapsibleDetailSection } from '../CollapsibleDetailSection'
import { emptyStructureNodes, getStructureApplicationScopeForObject } from './structurePanelUtils'

export function StructureMembershipView({
  catalogs,
  dossierTimelineEventId,
  mode = 'readonly',
  objectsByType,
  selectedProjectId,
  storyObject,
  timelineEvents,
  ui,
  onTimelineEventUpdated,
}: {
  catalogs: Catalog[]
  dossierTimelineEventId: string
  mode?: 'readonly' | 'editor'
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  selectedProjectId: number | null
  storyObject: StoryObject
  timelineEvents: TimelineEvent[]
  ui: PreviewText
  onTimelineEventUpdated?: (event: TimelineEvent) => void
}) {
  const [assignments, setAssignments] = useState<StructureAssignment[]>([])
  const [structureDetails, setStructureDetails] = useState<Record<number, Structure>>({})
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [selectedUsageId, setSelectedUsageId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedUsage = structureUsages.find((usage) => String(usage.id) === selectedUsageId) ?? null
  const selectedStructure = selectedUsage === null ? null : structureDetails[selectedUsage.structureId] ?? null
  const selectedStructureNodes = selectedStructure?.nodes ?? emptyStructureNodes
  const objectsById = useMemo(
    () => new Map(Object.values(objectsByType).flat().map((object) => [object.id, object])),
    [objectsByType],
  )
  const catalogsById = useMemo(
    () => new Map(catalogs.map((catalog) => [catalog.id, catalog])),
    [catalogs],
  )
  const temporalAssignments = useMemo(
    () =>
      resolveStructureAssignmentsTemporalState(assignments, timelineEvents, dossierTimelineEventId, {
        objectsByType,
        storyObjectId: storyObject.id,
        structuresById: structureDetails,
      }),
    [assignments, dossierTimelineEventId, objectsByType, storyObject.id, structureDetails, timelineEvents],
  )
  const selectedTimelineEvent =
    timelineEvents.find((event) => String(event.id) === dossierTimelineEventId) ?? null
  const isTimelineContextActive = selectedTimelineEvent !== null
  const isEditorMode = mode === 'editor'

  const toStructureAssignmentSnapshot = useCallback(
    (assignment: StructureAssignment): StructureAssignment => ({
      id: assignment.id,
      projectId: assignment.projectId,
      structureUsageId: assignment.structureUsageId,
      structureId: assignment.structureId,
      structureName: assignment.structureName,
      structureNodeId: assignment.structureNodeId,
      structureNodeName: assignment.structureNodeName,
      targetKind: assignment.targetKind,
      targetId: assignment.targetId,
      targetName: assignment.targetName,
      targetTypeKey: assignment.targetTypeKey,
      storyObjectId: assignment.storyObjectId,
      storyObjectName: assignment.storyObjectName,
      storyObjectTypeKey: assignment.storyObjectTypeKey,
      roleLabel: assignment.roleLabel,
      notes: assignment.notes,
      sortOrder: assignment.sortOrder,
    }),
    [],
  )

  const getNextLocalAssignmentId = (currentAssignments: StructureAssignment[]) =>
    Math.min(0, ...currentAssignments.map((assignment) => assignment.id)) - 1

  const saveStructureAssignmentsSnapshot = useCallback(
    async (nextAssignments: StructureAssignment[]) => {
      if (selectedProjectId === null || selectedTimelineEvent === null) {
        return false
      }

      const oldSnapshot = temporalAssignments.map(toStructureAssignmentSnapshot)
      const nextSnapshot = nextAssignments.map(toStructureAssignmentSnapshot)
      const oldValue = JSON.stringify(oldSnapshot)
      const newValue = JSON.stringify(nextSnapshot)

      if (oldValue === newValue) {
        return true
      }

      const eventDraft = toTimelineEventDraft(selectedTimelineEvent)
      const retainedChanges = eventDraft.changes.filter(
        (change) =>
          !(
            change.changeType === 'structureAssignment' &&
            change.targetType === 'storyObject' &&
            Number(change.targetId) === storyObject.id &&
            change.fieldName === 'structureAssignments'
          ),
      )
      const participants = eventDraft.participants.some(
        (participant) => participant.targetType === 'storyObject' && Number(participant.targetId) === storyObject.id,
      )
        ? eventDraft.participants
        : [...eventDraft.participants, { targetType: 'storyObject', targetId: String(storyObject.id), role: '' }]
      const snapshotChange: TimelineChangeDraft = {
        changeType: 'structureAssignment',
        targetType: 'storyObject',
        targetId: String(storyObject.id),
        fieldName: 'structureAssignments',
        oldValue,
        newValue,
        notes: '',
      }
      const savedEvent = await updateTimelineEventRequest(selectedProjectId, selectedTimelineEvent.id, {
        ...eventDraft,
        participants,
        changes: [...retainedChanges, snapshotChange],
      })

      onTimelineEventUpdated?.(savedEvent)
      return true
    },
    [
      onTimelineEventUpdated,
      selectedProjectId,
      selectedTimelineEvent,
      storyObject.id,
      temporalAssignments,
      toStructureAssignmentSnapshot,
    ],
  )
  const getUsageLabel = useCallback(
    (usage: StructureUsage) => {
      const targetLabel =
        usage.targetKind === 'project'
          ? ui.structureOwnerProject
          : usage.targetKind === 'catalog'
            ? catalogsById.get(usage.targetId)?.name ?? ui.structureOwnerCatalog
            : objectsById.get(usage.targetId)?.name ?? ui.structureOwnerObject

      return `${usage.displayName ?? usage.structureName} · ${targetLabel}`
    },
    [
      catalogsById,
      objectsById,
      ui.structureOwnerCatalog,
      ui.structureOwnerObject,
      ui.structureOwnerProject,
    ],
  )

  const loadMembershipData = useCallback(async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [loadedAssignments, loadedUsages] = await Promise.all([
        fetchStructureAssignments(selectedProjectId, { storyObjectId: storyObject.id }),
        fetchStructureUsages(selectedProjectId),
      ])
      const uniqueStructureIds = Array.from(new Set(loadedUsages.map((usage) => usage.structureId)))
      const detailEntries = await Promise.all(
        uniqueStructureIds.map(async (structureId) => {
          const structure = await fetchStructure(selectedProjectId, structureId)
          return [structureId, structure] as const
        }),
      )
      const details = Object.fromEntries(detailEntries)
      const storyObjectApplicationScope = getStructureApplicationScopeForObject(storyObject.typeKey)
      const usableUsages = loadedUsages.filter((usage) => {
        const structure = details[usage.structureId]
        return (
          storyObjectApplicationScope !== null &&
          structure !== undefined &&
          structure.nodes.length > 0 &&
          structure.applicationScope === storyObjectApplicationScope
        )
      })

      setAssignments(loadedAssignments)
      setStructureUsages(usableUsages)
      setStructureDetails(details)
      setSelectedUsageId((currentUsageId) =>
        usableUsages.some((usage) => String(usage.id) === currentUsageId)
          ? currentUsageId
          : String(usableUsages[0]?.id ?? ''),
      )
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentLoadFailed))
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId, storyObject.id, storyObject.typeKey, ui.structureAssignmentLoadFailed])

  useEffect(() => {
    void loadMembershipData()
  }, [loadMembershipData])

  useEffect(() => {
    setSelectedNodeId((currentNodeId) =>
      selectedStructureNodes.some((node) => String(node.id) === currentNodeId)
        ? currentNodeId
        : String(selectedStructureNodes[0]?.id ?? ''),
    )
  }, [selectedStructureNodes])

  const createAssignment = async () => {
    if (
      selectedProjectId === null ||
      selectedUsage === null ||
      selectedNodeId.trim().length === 0 ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (isTimelineContextActive) {
        const selectedNode = selectedStructureNodes.find((node) => String(node.id) === selectedNodeId)

        if (selectedNode === undefined || selectedStructure === null) {
          return
        }

        const nextAssignment: StructureAssignment = {
          id: getNextLocalAssignmentId(temporalAssignments),
          projectId: selectedProjectId,
          structureUsageId: selectedUsage.id,
          structureId: selectedUsage.structureId,
          structureName: selectedStructure.name,
          structureNodeId: selectedNode.id,
          structureNodeName: selectedNode.name,
          targetKind: 'storyObject',
          targetId: storyObject.id,
          targetName: storyObject.name,
          targetTypeKey: storyObject.typeKey as ObjectTypeKey,
          storyObjectId: storyObject.id,
          storyObjectName: storyObject.name,
          storyObjectTypeKey: storyObject.typeKey as ObjectTypeKey,
          roleLabel: roleLabel.trim().length === 0 ? null : roleLabel.trim(),
          notes: null,
          sortOrder: temporalAssignments.length,
        }

        await saveStructureAssignmentsSnapshot([...temporalAssignments, nextAssignment])
        setRoleLabel('')
        return
      }

      await assignObjectToStructureRequest(selectedProjectId, selectedUsage.id, {
        structureNodeId: Number(selectedNodeId),
        storyObjectId: storyObject.id,
        roleLabel,
        notes: '',
        sortOrder: assignments.length,
      })
      setRoleLabel('')
      await loadMembershipData()
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
      if (isTimelineContextActive) {
        await saveStructureAssignmentsSnapshot(temporalAssignments.filter((item) => item.id !== assignment.id))
        return
      }

      await deleteStructureAssignmentRequest(selectedProjectId, assignment.id)
      await loadMembershipData()
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
      if (isTimelineContextActive) {
        await saveStructureAssignmentsSnapshot(
          temporalAssignments.map((item) =>
            item.id === assignment.id
              ? { ...item, roleLabel: nextRoleLabel.trim().length === 0 ? null : nextRoleLabel.trim() }
              : item,
          ),
        )
        return
      }

      await updateStructureAssignmentRequest(selectedProjectId, assignment.id, {
        structureNodeId: assignment.structureNodeId,
        storyObjectId: assignment.storyObjectId,
        roleLabel: nextRoleLabel,
        notes: assignment.notes ?? '',
        sortOrder: assignment.sortOrder,
      })
      await loadMembershipData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedProjectId === null) {
    return null
  }

  return (
    <CollapsibleDetailSection count={temporalAssignments.length} title={ui.structureMembership}>
      <div className="sp-structure-membership">
        <p className="sp-editor-hint">{ui.structureMembershipHint}</p>
        {error !== null && <p className="sp-editor-error">{error}</p>}
        {isLoading && <p className="sp-editor-hint">{ui.loading}</p>}

        {temporalAssignments.length === 0 ? (
          <p>{ui.noStructureAssignments}</p>
        ) : (
          <div className="sp-structure-assignment-list">
            {temporalAssignments.map((assignment) => (
              <div className="sp-row" key={assignment.id}>
                <span>{assignment.structureName}</span>
                <strong>
                  {assignment.structureNodeName}
                  <input
                    aria-label={ui.role}
                    defaultValue={assignment.roleLabel ?? ''}
                    disabled={!isEditorMode || isSaving || (!isTimelineContextActive && assignment.id < 0)}
                    placeholder={ui.role}
                    onBlur={(event) => {
                      if (isEditorMode) {
                        void updateAssignmentRole(assignment, event.currentTarget.value)
                      }
                    }}
                  />
                </strong>
                {isEditorMode && (
                  <button
                    className="sp-icon-button"
                    disabled={isSaving || (!isTimelineContextActive && assignment.id < 0)}
                    type="button"
                    onClick={() => void deleteAssignment(assignment)}
                    title={ui.delete}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isEditorMode && (
          <div className="sp-structure-membership-controls">
            <label>
              {ui.structure}
              <select
                disabled={structureUsages.length === 0 || isSaving}
                value={selectedUsageId}
                onChange={(event) => setSelectedUsageId(event.target.value)}
              >
                {structureUsages.length === 0 ? (
                  <option value="">{ui.noStructures}</option>
                ) : (
                  structureUsages.map((usage) => (
                    <option key={usage.id} value={usage.id}>
                      {getUsageLabel(usage)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.structureNode}
              <select
                disabled={selectedStructureNodes.length === 0 || isSaving}
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(event.target.value)}
              >
                {selectedStructureNodes.length === 0 ? (
                  <option value="">{ui.noStructureNodes}</option>
                ) : (
                  selectedStructureNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.role}
              <input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} />
            </label>
            <button
              className="sp-button primary"
              disabled={selectedUsage === null || selectedNodeId.trim().length === 0 || isSaving}
              type="button"
              onClick={() => void createAssignment()}
            >
              {isSaving ? ui.saving : ui.structureAssignObject}
            </button>
          </div>
        )}
      </div>
    </CollapsibleDetailSection>
  )
}
