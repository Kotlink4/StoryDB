import { useCallback, type Dispatch, type SetStateAction } from 'react'

import type {
  StructureDraft,
  StructureEdgeDraft,
  StructureNodeDraft,
} from '../../types'
import {
  addStructureDraftEdge,
  addStructureDraftNode,
  removeStructureDraftEdge,
  removeStructureDraftNode,
  updateStructureDraftEdge,
  updateStructureDraftNode,
} from './structureDraftUtils'

export function useStructureDraftMutators({
  defaultEdgeType,
  setDraft,
  setSelectedDraft,
}: {
  defaultEdgeType: string
  setDraft: Dispatch<SetStateAction<StructureDraft>>
  setSelectedDraft: Dispatch<SetStateAction<StructureDraft | null>>
}) {
  const updateDraft = useCallback(
    (patch: Partial<StructureDraft>) => setDraft((currentDraft) => ({ ...currentDraft, ...patch })),
    [setDraft],
  )

  const updateDraftNode = useCallback(
    (clientId: string, patch: Partial<StructureNodeDraft>) =>
      setDraft((currentDraft) => updateStructureDraftNode(currentDraft, clientId, patch)),
    [setDraft],
  )

  const addDraftNode = useCallback(() => setDraft(addStructureDraftNode), [setDraft])

  const updateDraftEdge = useCallback(
    (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
      setDraft((currentDraft) => updateStructureDraftEdge(currentDraft, edgeIndex, patch)),
    [setDraft],
  )

  const addDraftEdge = useCallback(
    () => setDraft((currentDraft) => addStructureDraftEdge(currentDraft, defaultEdgeType)),
    [defaultEdgeType, setDraft],
  )

  const removeDraftEdge = useCallback(
    (edgeIndex: number) => setDraft((currentDraft) => removeStructureDraftEdge(currentDraft, edgeIndex)),
    [setDraft],
  )

  const removeDraftNode = useCallback(
    (clientId: string) => setDraft((currentDraft) => removeStructureDraftNode(currentDraft, clientId)),
    [setDraft],
  )

  const updateSelectedDraft = useCallback(
    (patch: Partial<StructureDraft>) =>
      setSelectedDraft((currentDraft) => (currentDraft === null ? currentDraft : { ...currentDraft, ...patch })),
    [setSelectedDraft],
  )

  const updateSelectedNode = useCallback(
    (clientId: string, patch: Partial<StructureNodeDraft>) =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : updateStructureDraftNode(currentDraft, clientId, patch),
      ),
    [setSelectedDraft],
  )

  const addSelectedNode = useCallback(
    () =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : addStructureDraftNode(currentDraft),
      ),
    [setSelectedDraft],
  )

  const updateSelectedEdge = useCallback(
    (edgeIndex: number, patch: Partial<StructureEdgeDraft>) =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : updateStructureDraftEdge(currentDraft, edgeIndex, patch),
      ),
    [setSelectedDraft],
  )

  const addSelectedEdge = useCallback(
    () =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : addStructureDraftEdge(currentDraft, defaultEdgeType),
      ),
    [defaultEdgeType, setSelectedDraft],
  )

  const removeSelectedEdge = useCallback(
    (edgeIndex: number) =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : removeStructureDraftEdge(currentDraft, edgeIndex),
      ),
    [setSelectedDraft],
  )

  const removeSelectedNode = useCallback(
    (clientId: string) =>
      setSelectedDraft((currentDraft) =>
        currentDraft === null
          ? currentDraft
          : removeStructureDraftNode(currentDraft, clientId),
      ),
    [setSelectedDraft],
  )

  return {
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
  }
}
