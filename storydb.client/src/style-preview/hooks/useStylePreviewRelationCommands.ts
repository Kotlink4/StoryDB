import type { Dispatch, SetStateAction } from 'react'

import {
  fetchObject,
  fetchRelationGraph,
  saveRelationGraphLayoutRequest,
  updateObjectRequest,
} from '../../api'
import {
  calculateRelationLayout,
  relationNodeHeight,
  relationNodeWidth,
} from '../domain/relationLayout'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type {
  DraftCharacterRelationship,
  RelationGraph,
  RelationGraphLayout,
  RelationLinkDraft,
  StoryObject,
} from '../../types'
import { validateRelationLinkDraft } from '../../validation'

type RelationCommandMessages = {
  characterRelationshipCreateFailed: string
  graphGenerateFailed: string
  graphNodeSaveFailed: string
}

type UseStylePreviewRelationCommandsOptions = {
  linkableObjects: StoryObject[]
  messages: RelationCommandMessages
  relationGraphLayout: RelationGraphLayout | null
  relationLinkDraft: RelationLinkDraft
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsRelationLayoutGenerating: Dispatch<SetStateAction<boolean>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setRelationGraph: Dispatch<SetStateAction<RelationGraph>>
  setRelationGraphLayout: Dispatch<SetStateAction<RelationGraphLayout | null>>
  setRelationLinkDraft: Dispatch<SetStateAction<RelationLinkDraft>>
  showErrorMessage: (message: string) => void
}

export function useStylePreviewRelationCommands({
  linkableObjects,
  messages,
  relationGraphLayout,
  relationLinkDraft,
  selectedProjectId,
  setDialog,
  setIsRelationLayoutGenerating,
  setObjects,
  setRelationGraph,
  setRelationGraphLayout,
  setRelationLinkDraft,
  showErrorMessage,
}: UseStylePreviewRelationCommandsOptions) {
  const saveCharacterRelationLink = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateRelationLinkDraft(relationLinkDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectId = selectedProjectId
    const sourceCharacterId = Number(relationLinkDraft.sourceCharacterId)
    const targetCharacterId = Number(relationLinkDraft.targetCharacterId)

    try {
      const sourceObject = await fetchObject(projectId, sourceCharacterId)
      const existingRelationships: DraftCharacterRelationship[] = [
        ...sourceObject.outgoingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(sourceObject.id),
          targetCharacterId: String(relationship.character.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'outgoing' as const,
        })),
        ...sourceObject.incomingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(relationship.character.id),
          targetCharacterId: String(sourceObject.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'incoming' as const,
        })),
      ]
      const savedObject = await updateObjectRequest(
        projectId,
        sourceObject.id,
        sourceObject.name,
        sourceObject.surname ?? '',
        sourceObject.surnameForm ?? '',
        sourceObject.description ?? '',
        sourceObject.age ?? '',
        sourceObject.role ?? '',
        sourceObject.currentStatus ?? '',
        sourceObject.imagePath,
        sourceObject.attributes.map((attribute) => ({
          name: attribute.name,
          value: attribute.value ?? '',
        })),
        sourceObject.hierarchySelections.map((selection) => ({
          groupId: selection.groupId,
          nodeIds: selection.nodes.map((node) => node.id),
        })),
        sourceObject.catalogSelections.map((selection) => ({
          targetType: selection.targetType,
          catalogId: String(selection.catalogId),
          catalogEntryGroupId:
            selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
          catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
        })),
        sourceObject.ownedItems.map((item) => item.id),
        sourceObject.owners.map((owner) => owner.id),
        sourceObject.territoryPlaces.map((place) => place.id),
        sourceObject.ownerOrganizations.map((organization) => organization.id),
        sourceObject.hierarchyParents.map((parent) => parent.id),
        [
          ...existingRelationships,
          {
            id: null,
            sourceCharacterId: String(sourceCharacterId),
            targetCharacterId: String(targetCharacterId),
            relationType: relationLinkDraft.relationType.trim(),
            strength: relationLinkDraft.strength,
            tension: relationLinkDraft.tension,
            isBidirectional: relationLinkDraft.isBidirectional,
            description: relationLinkDraft.description,
            direction: 'outgoing' as const,
          },
        ],
      )
      const graph = await fetchRelationGraph(projectId)

      setObjects((currentObjects) =>
        currentObjects.map((storyObject) => (storyObject.id === savedObject.id ? savedObject : storyObject)),
      )
      setRelationGraph(graph)
      setRelationGraphLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setRelationLinkDraft({
        sourceCharacterId: '',
        targetCharacterId: '',
        relationType: '',
        strength: '50',
        tension: '0',
        isBidirectional: true,
        description: '',
      })
      setDialog(null)
    } catch {
      showErrorMessage(messages.characterRelationshipCreateFailed)
    }
  }

  const generateRelationGraphLayout = async (graphKey: string, activeGraph: RelationGraph) => {
    if (selectedProjectId === null || activeGraph.nodes.length === 0) {
      return
    }

    setIsRelationLayoutGenerating(true)
    try {
      const positions = await calculateRelationLayout(activeGraph, linkableObjects)
      const layout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        graphKey,
        items: activeGraph.nodes.map((node) => {
          const position = positions.get(node.id) ?? { x: 0, y: 0 }

          return {
            storyObjectId: node.id,
            x: position.x,
            y: position.y,
            width: relationNodeWidth,
            height: relationNodeHeight,
            isPinned: false,
          }
        }),
      })
      setRelationGraphLayout(layout)
    } catch {
      showErrorMessage(messages.graphGenerateFailed)
    } finally {
      setIsRelationLayoutGenerating(false)
    }
  }

  const saveRelationGraphNodePosition = async (
    graphKey: string,
    activeGraph: RelationGraph,
    storyObjectId: number,
    position: {
      x: number
      y: number
    },
  ) => {
    if (selectedProjectId === null) {
      return
    }

    const graphNodeIds = new Set(activeGraph.nodes.map((node) => node.id))
    const existingItems = new Map(
      (relationGraphLayout?.items ?? [])
        .filter((item) => graphNodeIds.has(item.storyObjectId))
        .map((item) => [item.storyObjectId, item]),
    )
    const currentItem = existingItems.get(storyObjectId)

    existingItems.set(storyObjectId, {
      id: currentItem?.id ?? 0,
      storyObjectId,
      x: position.x,
      y: position.y,
      width: currentItem?.width ?? relationNodeWidth,
      height: currentItem?.height ?? relationNodeHeight,
      isPinned: true,
    })

    const optimisticLayout: RelationGraphLayout = {
      id: relationGraphLayout?.id ?? 0,
      projectId: selectedProjectId,
      graphKey,
      algorithmVersion: relationGraphLayout?.algorithmVersion ?? 'relation-elk-v1',
      isDefault: true,
      isStale: relationGraphLayout?.isStale ?? false,
      generatedAt: relationGraphLayout?.generatedAt ?? new Date().toISOString(),
      items: Array.from(existingItems.values()),
    }
    setRelationGraphLayout(optimisticLayout)

    try {
      const savedLayout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        graphKey,
        items: optimisticLayout.items.map((item) => ({
          storyObjectId: item.storyObjectId,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          isPinned: item.isPinned,
        })),
      })
      setRelationGraphLayout(savedLayout)
    } catch {
      showErrorMessage(messages.graphNodeSaveFailed)
    }
  }

  return {
    generateRelationGraphLayout,
    saveCharacterRelationLink,
    saveRelationGraphNodePosition,
  }
}
