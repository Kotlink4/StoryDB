import { useEffect, type Dispatch, type SetStateAction } from 'react'

import type {
  RelationGraph,
  RelationGraphLayout,
  Structure,
  StructureAssignment,
  StructureUsage,
} from '../../types'
import { writeProjectClientCachePatch } from '../domain/projectClientCache'
import { loadRelationWorkspaceData } from './workspaceDataLoaders'

export function useStylePreviewRelationWorkspaceData({
  graphLoadFailedMessage,
  loadRelationGraphLayout,
  selectedProjectId,
  setRelationGraph,
  setRelationGraphLayout,
  setStructureAssignments,
  setStructures,
  setStructureUsages,
  showErrorMessage,
}: {
  graphLoadFailedMessage: string
  loadRelationGraphLayout: (graphKey?: string | null) => Promise<void>
  selectedProjectId: number | null
  setRelationGraph: Dispatch<SetStateAction<RelationGraph>>
  setRelationGraphLayout: Dispatch<SetStateAction<RelationGraphLayout | null>>
  setStructureAssignments: Dispatch<SetStateAction<StructureAssignment[]>>
  setStructures: Dispatch<SetStateAction<Structure[]>>
  setStructureUsages: Dispatch<SetStateAction<StructureUsage[]>>
  showErrorMessage: (message: string) => void
}) {
  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setRelationGraph({ nodes: [], edges: [] })
      setRelationGraphLayout(null)
      setStructureAssignments([])
      setStructures([])
      setStructureUsages([])
      return undefined
    }

    const loadRelationGraphData = async () => {
      const projectId = selectedProjectId
      const loadedWorkspace = await loadRelationWorkspaceData(projectId)

      if (!isActive) {
        return
      }

      setRelationGraph(loadedWorkspace.relationGraph)
      if (!loadedWorkspace.graphLoaded) {
        showErrorMessage(graphLoadFailedMessage)
      }

      setStructureAssignments(loadedWorkspace.structureAssignments)
      setStructures(loadedWorkspace.structures)
      setStructureUsages(loadedWorkspace.structureUsages)
      void writeProjectClientCachePatch(projectId, {
        ...(loadedWorkspace.graphLoaded ? { relationGraph: loadedWorkspace.relationGraph } : {}),
        structureAssignments: loadedWorkspace.structureAssignments,
        structures: loadedWorkspace.structures,
        structureUsages: loadedWorkspace.structureUsages,
      })
    }

    void loadRelationGraphData()
    void loadRelationGraphLayout('relations:all')

    return () => {
      isActive = false
    }
  }, [
    graphLoadFailedMessage,
    loadRelationGraphLayout,
    selectedProjectId,
    setRelationGraph,
    setRelationGraphLayout,
    setStructureAssignments,
    setStructures,
    setStructureUsages,
    showErrorMessage,
  ])
}
