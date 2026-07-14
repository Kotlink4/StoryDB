import {
  fetchStructure,
  fetchStructureAssignments,
  fetchStructures,
  fetchStructureUsages,
} from '../../api'
import type {
  Structure,
  StructureAssignment,
  StructureSummary,
  StructureUsage,
} from '../../types'

export type OrganizationStructureData = {
  availableStructures: StructureSummary[]
  structureAssignments: Record<number, StructureAssignment[]>
  structureDetails: Record<number, Structure>
  structureUsages: StructureUsage[]
}

export async function loadOrganizationStructureData(
  projectId: number,
  storyObjectId: number,
): Promise<OrganizationStructureData> {
  const [availableStructures, structureUsages] = await Promise.all([
    fetchStructures(projectId),
    fetchStructureUsages(projectId, {
      targetKind: 'object',
      targetId: storyObjectId,
    }),
  ])
  const detailEntries = await Promise.all(
    structureUsages.map(async (usage) => {
      const structure = await fetchStructure(projectId, usage.structureId)
      return [usage.structureId, structure] as const
    }),
  )
  const structureDetails = Object.fromEntries(detailEntries)
  const characterStructureUsages = structureUsages.filter(
    (usage) => structureDetails[usage.structureId]?.applicationScope === 'characters',
  )
  const assignmentEntries = await Promise.all(
    characterStructureUsages.map(async (usage) => {
      const assignments = await fetchStructureAssignments(projectId, {
        structureUsageId: usage.id,
      })
      return [usage.id, assignments] as const
    }),
  )

  return {
    availableStructures: availableStructures.filter((structure) => structure.applicationScope === 'characters'),
    structureAssignments: Object.fromEntries(assignmentEntries),
    structureDetails,
    structureUsages: characterStructureUsages,
  }
}
