import { useMemo } from 'react'

import type { StructureAssignment } from '../../types'

export const useStructureAssignmentMaps = (assignments: StructureAssignment[]) =>
  useMemo(() => {
    const countsByNodeId = new Map<number, number>()
    const assignmentsByNodeId = new Map<number, StructureAssignment[]>()
    const countsByUsageId = new Map<number, number>()

    assignments.forEach((assignment) => {
      countsByNodeId.set(
        assignment.structureNodeId,
        (countsByNodeId.get(assignment.structureNodeId) ?? 0) + 1,
      )
      assignmentsByNodeId.set(assignment.structureNodeId, [
        ...(assignmentsByNodeId.get(assignment.structureNodeId) ?? []),
        assignment,
      ])
      countsByUsageId.set(
        assignment.structureUsageId,
        (countsByUsageId.get(assignment.structureUsageId) ?? 0) + 1,
      )
    })

    return {
      assignmentsByNodeId,
      countsByNodeId,
      countsByUsageId,
    }
  }, [assignments])
