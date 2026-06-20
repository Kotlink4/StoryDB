import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  assignObjectToStructureRequest,
  deleteStructureAssignmentRequest,
  fetchStructure,
  fetchStructureAssignments,
  fetchStructureUsages,
  getApiErrorMessage,
  updateStructureAssignmentRequest,
} from '../api'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { Catalog, CatalogEntry, Structure, StructureAssignment, StructureUsage } from '../types'
import { CollapsibleDetailSection } from './CollapsibleDetailSection'
import { emptyStructureNodes } from './object-detail/structurePanelUtils'

export function CatalogEntryStructureMembership({
  catalogEntry,
  catalogs,
  selectedProjectId,
  ui,
  onAssignmentsChange,
}: {
  catalogEntry: CatalogEntry | null
  catalogs: Catalog[]
  selectedProjectId: number | null
  ui: PreviewText
  onAssignmentsChange?: (assignments: StructureAssignment[]) => void
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

  const catalogsById = useMemo(() => new Map(catalogs.map((catalog) => [catalog.id, catalog])), [catalogs])
  const selectedUsage = structureUsages.find((usage) => String(usage.id) === selectedUsageId) ?? null
  const selectedStructure = selectedUsage === null ? null : structureDetails[selectedUsage.structureId] ?? null
  const selectedStructureNodes = selectedStructure?.nodes ?? emptyStructureNodes

  const getUsageLabel = useCallback(
    (usage: StructureUsage) => {
      const targetLabel =
        usage.targetKind === 'project'
          ? ui.structureOwnerProject
          : usage.targetKind === 'catalog'
            ? catalogsById.get(usage.targetId)?.name ?? ui.structureOwnerCatalog
            : ui.structureOwnerObject

      return `${usage.displayName ?? usage.structureName} · ${targetLabel}`
    },
    [catalogsById, ui.structureOwnerCatalog, ui.structureOwnerObject, ui.structureOwnerProject],
  )

  const loadMembershipData = useCallback(async () => {
    if (selectedProjectId === null || catalogEntry === null) {
      setAssignments([])
      setStructureUsages([])
      setStructureDetails({})
      return []
    }

    setIsLoading(true)
    setError(null)
    try {
      const [loadedAssignments, loadedUsages] = await Promise.all([
        fetchStructureAssignments(selectedProjectId, {
          targetKind: 'catalogEntry',
          targetId: catalogEntry.id,
        }),
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
      const usableUsages = loadedUsages.filter((usage) => {
        const structure = details[usage.structureId]
        return structure !== undefined && structure.applicationScope === 'catalogEntries' && structure.nodes.length > 0
      })

      setAssignments(loadedAssignments)
      setStructureUsages(usableUsages)
      setStructureDetails(details)
      setSelectedUsageId((currentUsageId) =>
        usableUsages.some((usage) => String(usage.id) === currentUsageId)
          ? currentUsageId
          : String(usableUsages[0]?.id ?? ''),
      )
      return loadedAssignments
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentLoadFailed))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [catalogEntry, selectedProjectId, ui.structureAssignmentLoadFailed])

  useEffect(() => {
    void loadMembershipData()
  }, [loadMembershipData])

  useEffect(() => {
    const existingAssignment =
      selectedUsage === null ? null : assignments.find((assignment) => assignment.structureUsageId === selectedUsage.id) ?? null

    if (
      existingAssignment !== null &&
      selectedStructureNodes.some((node) => node.id === existingAssignment.structureNodeId)
    ) {
      setSelectedNodeId(String(existingAssignment.structureNodeId))
      setRoleLabel(existingAssignment.roleLabel ?? '')
      return
    }

    setSelectedNodeId((currentNodeId) =>
      selectedStructureNodes.some((node) => String(node.id) === currentNodeId)
        ? currentNodeId
        : String(selectedStructureNodes[0]?.id ?? ''),
    )
    setRoleLabel('')
  }, [assignments, selectedStructureNodes, selectedUsage])

  const saveAssignment = async () => {
    if (
      selectedProjectId === null ||
      catalogEntry === null ||
      selectedUsage === null ||
      selectedNodeId.trim().length === 0 ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const existingAssignment = assignments.find((assignment) => assignment.structureUsageId === selectedUsage.id)
      const draft = {
        structureNodeId: Number(selectedNodeId),
        targetKind: 'catalogEntry' as const,
        targetId: catalogEntry.id,
        roleLabel,
        notes: existingAssignment?.notes ?? '',
        sortOrder: existingAssignment?.sortOrder ?? assignments.length,
      }

      if (existingAssignment === undefined) {
        await assignObjectToStructureRequest(selectedProjectId, selectedUsage.id, draft)
      } else {
        await updateStructureAssignmentRequest(selectedProjectId, existingAssignment.id, draft)
      }

      setRoleLabel('')
      const loadedAssignments = await loadMembershipData()
      if (loadedAssignments !== null) {
        onAssignmentsChange?.(loadedAssignments)
      }
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
      await deleteStructureAssignmentRequest(selectedProjectId, assignment.id)
      const loadedAssignments = await loadMembershipData()
      if (loadedAssignments !== null) {
        onAssignmentsChange?.(loadedAssignments)
      }
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentDeleteFailed))
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedProjectId === null) {
    return null
  }

  if (catalogEntry === null) {
    return (
      <section className="sp-form-section wide">
        <h3>{ui.structureMembership}</h3>
        <p className="sp-editor-hint">{ui.structureEditorSaveEntryHint}</p>
      </section>
    )
  }

  return (
    <section className="sp-form-section wide">
      <CollapsibleDetailSection count={assignments.length} title={ui.structureMembership}>
        <div className="sp-structure-membership">
          <p className="sp-editor-hint">{ui.structureCatalogEntryMembershipHint}</p>
          {error !== null && <p className="sp-editor-error">{error}</p>}
          {isLoading && <p className="sp-editor-hint">{ui.loading}</p>}

          {assignments.length === 0 ? (
            <p>{ui.noStructureAssignments}</p>
          ) : (
            <div className="sp-structure-assignment-list">
              {assignments.map((assignment) => (
                <div className="sp-row" key={assignment.id}>
                  <span>{assignment.structureName}</span>
                  <strong>
                    {assignment.structureNodeName}
                    {assignment.roleLabel !== null && <small>{assignment.roleLabel}</small>}
                  </strong>
                  <button
                    className="sp-icon-button"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void deleteAssignment(assignment)}
                    title={ui.delete}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

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
              onClick={() => void saveAssignment()}
            >
              {isSaving ? ui.saving : ui.structureAssignObject}
            </button>
          </div>
        </div>
      </CollapsibleDetailSection>
    </section>
  )
}
