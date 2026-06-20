import { useCallback, useEffect, useState } from 'react'

import type { StructureDraft, StructureUsage } from '../../types'
import {
  getNextStructureCatalogEntryId,
  getNextStructureNodeId,
  getNextStructureUsageId,
  type StructureCatalogEntryOption,
} from './structureWorkspaceModel'

export function useStructureAssignmentSelection({
  catalogEntryOptions,
  selectedDraft,
  usages,
}: {
  catalogEntryOptions: StructureCatalogEntryOption[]
  selectedDraft: StructureDraft | null
  usages: StructureUsage[]
}) {
  const [assignmentUsageId, setAssignmentUsageId] = useState('')
  const [assignmentNodeId, setAssignmentNodeId] = useState('')
  const [assignmentCatalogEntryId, setAssignmentCatalogEntryId] = useState('')
  const [assignmentRoleLabel, setAssignmentRoleLabel] = useState('')

  useEffect(() => {
    setAssignmentUsageId((currentUsageId) => getNextStructureUsageId(currentUsageId, usages))
  }, [usages])

  useEffect(() => {
    setAssignmentNodeId((currentNodeId) => getNextStructureNodeId(currentNodeId, selectedDraft))
  }, [selectedDraft])

  useEffect(() => {
    setAssignmentCatalogEntryId((currentEntryId) =>
      getNextStructureCatalogEntryId(currentEntryId, catalogEntryOptions),
    )
  }, [catalogEntryOptions])

  const resetAssignmentSelection = useCallback(() => {
    setAssignmentUsageId('')
    setAssignmentNodeId('')
    setAssignmentCatalogEntryId('')
    setAssignmentRoleLabel('')
  }, [])

  return {
    assignmentCatalogEntryId,
    assignmentNodeId,
    assignmentRoleLabel,
    assignmentUsageId,
    resetAssignmentSelection,
    setAssignmentCatalogEntryId,
    setAssignmentNodeId,
    setAssignmentRoleLabel,
    setAssignmentUsageId,
  }
}
