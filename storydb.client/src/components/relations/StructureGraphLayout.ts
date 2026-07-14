import type { Edge } from '@xyflow/react'

import type { RelationGraph, Structure, StructureAssignment } from '../../types'
import type { RelationsFlowNode, StructureFlowNodeKind } from './RelationFlowTypes'

const structureNodeLayoutIdBase = 1_000_000_000
const catalogEntryAssignmentLayoutIdBase = 2_000_000_000
const structureNodeColumnWidth = 340
const structureNodeRowHeight = 210
const structureNodeMapPaddingX = 80
const structureNodeMapPaddingY = 80
const structureSiblingGroupGapSlots = 0.65

export const getStructureNodeLayoutId = (nodeId: number) => structureNodeLayoutIdBase + nodeId

export const getStructureAssignmentTargetKey = (assignment: StructureAssignment) =>
  `${assignment.targetKind}:${assignment.targetId}`

export const getStructureAssignmentTargetLayoutId = (assignment: StructureAssignment) =>
  assignment.targetKind === 'storyObject' && assignment.storyObjectId !== null
    ? assignment.storyObjectId
    : catalogEntryAssignmentLayoutIdBase + assignment.targetId

export type LevelPlacementState = {
  lastGroupKey: string | null
  nextSlot: number
}

export const getStructureMapPosition = (
  levelIndex: number,
  slot: number,
  levelSpans: Map<number, number>,
) => {
  const currentLevelSpan = levelSpans.get(levelIndex) ?? 1
  const maxLevelSpan = Math.max(...levelSpans.values(), 1)
  const levelWidth = Math.max(0, currentLevelSpan - 1) * structureNodeColumnWidth
  const maxWidth = Math.max(0, maxLevelSpan - 1) * structureNodeColumnWidth
  const levelOffsetX = (maxWidth - levelWidth) / 2

  return {
    x: structureNodeMapPaddingX + levelOffsetX + slot * structureNodeColumnWidth,
    y: structureNodeMapPaddingY + levelIndex * structureNodeRowHeight,
  }
}

export const getNextGroupedLevelSlot = (
  placements: Map<number, LevelPlacementState>,
  levelIndex: number,
  groupKey: string,
) => {
  const placement = placements.get(levelIndex) ?? { lastGroupKey: null, nextSlot: 0 }
  if (placement.lastGroupKey !== null && placement.lastGroupKey !== groupKey) {
    placement.nextSlot += structureSiblingGroupGapSlots
  }

  const slot = placement.nextSlot
  placement.nextSlot += 1
  placement.lastGroupKey = groupKey
  placements.set(levelIndex, placement)
  return slot
}

const getPlacementLevelSpans = (placements: Map<number, LevelPlacementState>) =>
  new Map(Array.from(placements.entries()).map(([levelIndex, placement]) => [levelIndex, Math.max(1, placement.nextSlot)]))

const getStructureNodeGroupKey = (node: Structure['nodes'][number]) =>
  node.parentNodeId === null ? 'structure-root' : `structure-parent:${node.parentNodeId}`

export const getGroupedStructureNodeKey = getStructureNodeGroupKey

export const getOrderedStructureNodes = (structure: Structure) => {
  const orderIndexById = new Map<number, number>()
  const orderedNodes: Structure['nodes'] = []
  const levels = Array.from(new Set(structure.nodes.map((node) => node.levelIndex))).sort((left, right) => left - right)

  levels.forEach((levelIndex) => {
    const levelNodes = structure.nodes
      .filter((node) => node.levelIndex === levelIndex)
      .toSorted((left, right) => {
        const leftParentIndex = left.parentNodeId === null ? -1 : orderIndexById.get(left.parentNodeId) ?? Number.MAX_SAFE_INTEGER
        const rightParentIndex = right.parentNodeId === null ? -1 : orderIndexById.get(right.parentNodeId) ?? Number.MAX_SAFE_INTEGER

        return (
          leftParentIndex - rightParentIndex ||
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name)
        )
      })

    levelNodes.forEach((node, index) => {
      orderIndexById.set(node.id, index)
      orderedNodes.push(node)
    })
  })

  return orderedNodes
}

export const getStructureVisualLevelIndexes = (orderedStructureNodes: Structure['nodes']) => {
  const visualIndexByLevel = new Map(
    Array.from(new Set(orderedStructureNodes.map((node) => node.levelIndex)))
      .sort((left, right) => left - right)
      .map((levelIndex, visualIndex) => [levelIndex, visualIndex]),
  )

  return new Map(
    orderedStructureNodes.map((node) => [node.id, visualIndexByLevel.get(node.levelIndex) ?? node.levelIndex]),
  )
}

export const getStructureGraphLevelSpans = ({
  getNodeLevelIndex,
  orderedStructureAssignments,
  orderedStructureNodes,
  structureNodesById,
}: {
  getNodeLevelIndex?: (node: Structure['nodes'][number]) => number
  orderedStructureAssignments: StructureAssignment[]
  orderedStructureNodes: Structure['nodes']
  structureNodesById: Map<number, Structure['nodes'][number]>
}) => {
  const resolveNodeLevelIndex = getNodeLevelIndex ?? ((node: Structure['nodes'][number]) => node.levelIndex)
  const placements = new Map<number, LevelPlacementState>()
  orderedStructureNodes.forEach((node) => {
    getNextGroupedLevelSlot(placements, resolveNodeLevelIndex(node), getStructureNodeGroupKey(node))
  })

  const placedAssignmentTargetKeys = new Set<string>()
  orderedStructureAssignments.forEach((assignment) => {
    const structureNode = structureNodesById.get(assignment.structureNodeId)
    const targetKey = getStructureAssignmentTargetKey(assignment)
    if (structureNode === undefined || placedAssignmentTargetKeys.has(targetKey)) {
      return
    }

    placedAssignmentTargetKeys.add(targetKey)
    getNextGroupedLevelSlot(
      placements,
      resolveNodeLevelIndex(structureNode) + 1,
      `assignment-parent:${assignment.structureNodeId}`,
    )
  })

  return getPlacementLevelSpans(placements)
}

export type StructureFlowResult = {
  edges: Edge[]
  graphEdges: RelationGraph['edges']
  graphNodes: RelationGraph['nodes']
  nodeKinds: Map<number, StructureFlowNodeKind>
  nodes: RelationsFlowNode[]
}

export const centerStructureParentsByChildren = (flow: StructureFlowResult): StructureFlowResult => {
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]))
  const childIdsByParentId = new Map<string, string[]>()

  flow.edges.forEach((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    if (source === undefined || target === undefined || target.position.y <= source.position.y) {
      return
    }

    childIdsByParentId.set(edge.source, [...(childIdsByParentId.get(edge.source) ?? []), edge.target])
  })

  const nodesByLevel = new Map<number, RelationsFlowNode[]>()
  flow.nodes.forEach((node) => {
    const level = Math.round(node.position.y)
    nodesByLevel.set(level, [...(nodesByLevel.get(level) ?? []), node])
  })

  const nextPositionById = new Map(flow.nodes.map((node) => [node.id, { ...node.position }]))
  const levels = Array.from(nodesByLevel.keys()).sort((left, right) => right - left)
  levels.forEach((level) => {
    const levelNodes = nodesByLevel.get(level) ?? []
    const desiredXById = new Map<string, number>()

    levelNodes.forEach((node) => {
      const childXs = (childIdsByParentId.get(node.id) ?? [])
        .map((childId) => nextPositionById.get(childId)?.x)
        .filter((x): x is number => x !== undefined)

      if (childXs.length === 0) {
        desiredXById.set(node.id, nextPositionById.get(node.id)?.x ?? node.position.x)
        return
      }

      desiredXById.set(node.id, (Math.min(...childXs) + Math.max(...childXs)) / 2)
    })

    const sortedNodes = levelNodes.toSorted((left, right) => {
      const leftX = desiredXById.get(left.id) ?? left.position.x
      const rightX = desiredXById.get(right.id) ?? right.position.x
      return leftX - rightX || left.id.localeCompare(right.id)
    })

    let previousX = Number.NEGATIVE_INFINITY
    sortedNodes.forEach((node) => {
      const desiredX = desiredXById.get(node.id) ?? node.position.x
      const x = Math.max(desiredX, previousX + structureNodeColumnWidth)
      nextPositionById.set(node.id, { ...node.position, x })
      previousX = x
    })
  })

  return {
    ...flow,
    nodes: flow.nodes.map((node) => ({
      ...node,
      position: nextPositionById.get(node.id) ?? node.position,
    })),
  }
}

export const normalizeMergedStructureFlow = (
  nodes: RelationsFlowNode[],
  edges: Edge[],
  graphNodes: RelationGraph['nodes'],
  graphEdges: RelationGraph['edges'],
  nodeKinds: Map<number, StructureFlowNodeKind>,
) => {
  const normalizeId = (id: number) => id
  const normalizedGraphNodes: RelationGraph['nodes'] = []
  const addedGraphNodeIds = new Set<number>()
  graphNodes.forEach((node) => {
    const normalizedId = normalizeId(node.id)
    if (normalizedId !== node.id || addedGraphNodeIds.has(normalizedId)) {
      return
    }

    addedGraphNodeIds.add(normalizedId)
    normalizedGraphNodes.push(node)
  })

  const normalizedNodes: RelationsFlowNode[] = []
  const addedFlowNodeIds = new Set<string>()
  nodes.forEach((node) => {
    const normalizedId = normalizeId(Number(node.id))
    if (normalizedId !== Number(node.id) || addedFlowNodeIds.has(String(normalizedId))) {
      return
    }

    addedFlowNodeIds.add(String(normalizedId))
    normalizedNodes.push(node)
  })

  const normalizedNodeKinds = new Map<number, StructureFlowNodeKind>()
  nodeKinds.forEach((kind, nodeId) => {
    const normalizedId = normalizeId(nodeId)
    if (!normalizedNodeKinds.has(normalizedId) || kind === 'structure') {
      normalizedNodeKinds.set(normalizedId, kind)
    }
  })

  const normalizedGraphEdges: RelationGraph['edges'] = []
  const addedGraphEdgeKeys = new Set<string>()
  graphEdges.forEach((edge) => {
    const sourceId = normalizeId(edge.sourceId)
    const targetId = normalizeId(edge.targetId)
    if (sourceId === targetId) {
      return
    }

    const edgeKey = `${sourceId}->${targetId}:${edge.category}:${edge.relationType}`
    if (addedGraphEdgeKeys.has(edgeKey)) {
      return
    }

    addedGraphEdgeKeys.add(edgeKey)
    normalizedGraphEdges.push({ ...edge, sourceId, targetId })
  })

  const normalizedFlowEdges: Edge[] = []
  const addedFlowEdgeKeys = new Set<string>()
  edges.forEach((edge) => {
    const source = String(normalizeId(Number(edge.source)))
    const target = String(normalizeId(Number(edge.target)))
    if (source === target) {
      return
    }

    const edgeKey = `${source}->${target}:${edge.label ?? ''}:${edge.style?.stroke ?? ''}`
    if (addedFlowEdgeKeys.has(edgeKey)) {
      return
    }

    addedFlowEdgeKeys.add(edgeKey)
    normalizedFlowEdges.push({
      ...edge,
      source,
      sourceHandle: 'source-bottom',
      target,
      targetHandle: 'target-top',
    })
  })

  return {
    edges: normalizedFlowEdges,
    graphEdges: normalizedGraphEdges,
    graphNodes: normalizedGraphNodes,
    nodeKinds: normalizedNodeKinds,
    nodes: normalizedNodes,
  }
}
