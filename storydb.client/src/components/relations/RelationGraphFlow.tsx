import {
  MarkerType,
  Position,
  type Edge,
  type EdgeTypes,
  type Node,
} from '@xyflow/react'

import { relationGraphNodeToStoryObject } from '../../style-preview/domain/objectDisplay'
import { getRelationLabel } from '../../style-preview/domain/relationDisplay'
import {
  getRelationDegrees,
  getRelationGraphNodes,
  getRelationHandleIds,
} from '../../style-preview/domain/relationLayout'
import {
  defaultRelationColorToken,
  relationCategoryColorTokens,
  relationLabelBackgroundToken,
} from '../../style-preview/domain/styleRuntimeTokens'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { RelationGraph, RelationGraphNode, StoryObject } from '../../types'
import { RelationObjectNode, StructureNode } from './RelationFlowNodes'
import type { RelationObjectFlowNode } from './RelationFlowTypes'
import { ParallelEdge, type RelationsFlowEdge } from './RelationParallelEdge'

export const relationGraphCategories = ['character', 'membership', 'ownership', 'object', 'structure'] as const

export type RelationGraphCategory = typeof relationGraphCategories[number]
export type RelationGraphMode = 'all' | RelationGraphCategory

export const relationEdgeTypes: EdgeTypes = {
  parallel: ParallelEdge,
}

export const relationNodeTypes = {
  relationObject: RelationObjectNode,
  structureNode: StructureNode,
}

const getEdgeEndpointBucket = (edge: Edge, endpoint: 'source' | 'target') => {
  const nodeId = endpoint === 'source' ? edge.source : edge.target
  const handleId = endpoint === 'source' ? edge.sourceHandle : edge.targetHandle
  return `${endpoint}:${nodeId}:${handleId ?? 'auto'}`
}

const compareEdgesByEndpoint = (first: Edge, second: Edge, endpoint: 'source' | 'target') => {
  const firstOther = endpoint === 'source' ? first.target : first.source
  const secondOther = endpoint === 'source' ? second.target : second.source

  return firstOther.localeCompare(secondOther) || first.id.localeCompare(second.id)
}

const mapParallelEndpointIndexes = (edges: Edge[], endpoint: 'source' | 'target') => {
  const groups = new Map<string, Edge[]>()
  edges.forEach((edge) => {
    const bucket = getEdgeEndpointBucket(edge, endpoint)
    groups.set(bucket, [...(groups.get(bucket) ?? []), edge])
  })

  const indexByEdgeId = new Map<string, number>()
  const countByEdgeId = new Map<string, number>()
  groups.forEach((group) => {
    group
      .toSorted((first, second) => compareEdgesByEndpoint(first, second, endpoint))
      .forEach((edge, index, sortedGroup) => {
        indexByEdgeId.set(edge.id, index)
        countByEdgeId.set(edge.id, sortedGroup.length)
      })
  })

  return { countByEdgeId, indexByEdgeId }
}

const mapHierarchyCorridorIndexes = (edges: Edge[], nodes: Node[]) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const levelGroups = new Map<string, Edge[]>()

  edges.forEach((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    if (source === undefined || target === undefined) {
      return
    }

    const sourceLevel = Math.round(source.position.y)
    const targetLevel = Math.round(target.position.y)
    const groupKey = `${sourceLevel}:${targetLevel}`
    levelGroups.set(groupKey, [...(levelGroups.get(groupKey) ?? []), edge])
  })

  const indexByEdgeId = new Map<string, number>()
  const countByEdgeId = new Map<string, number>()

  levelGroups.forEach((group) => {
    const sourceIds = Array.from(new Set(group.map((edge) => edge.source))).toSorted((firstId, secondId) => {
      const first = nodeById.get(firstId)
      const second = nodeById.get(secondId)
      const firstX = first?.position.x ?? 0
      const secondX = second?.position.x ?? 0

      return firstX - secondX || firstId.localeCompare(secondId)
    })
    const sourceIndexById = new Map(sourceIds.map((sourceId, index) => [sourceId, index]))

    group.forEach((edge) => {
      indexByEdgeId.set(edge.id, sourceIndexById.get(edge.source) ?? 0)
      countByEdgeId.set(edge.id, sourceIds.length)
    })
  })

  return { countByEdgeId, indexByEdgeId }
}

export const applyParallelEdgeRouting = (edges: Edge[], nodes: Node[]): RelationsFlowEdge[] => {
  const sourceRouting = mapParallelEndpointIndexes(edges, 'source')
  const targetRouting = mapParallelEndpointIndexes(edges, 'target')
  const corridorRouting = mapHierarchyCorridorIndexes(edges, nodes)

  return edges.map((edge) => ({
    ...edge,
    type: 'parallel',
    data: {
      ...(edge.data ?? {}),
      hierarchyCorridorCount: corridorRouting.countByEdgeId.get(edge.id) ?? 1,
      hierarchyCorridorIndex: corridorRouting.indexByEdgeId.get(edge.id) ?? 0,
      isHierarchyRoute: true,
      parallelSourceCount: sourceRouting.countByEdgeId.get(edge.id) ?? 1,
      parallelSourceIndex: sourceRouting.indexByEdgeId.get(edge.id) ?? 0,
      parallelTargetCount: targetRouting.countByEdgeId.get(edge.id) ?? 1,
      parallelTargetIndex: targetRouting.indexByEdgeId.get(edge.id) ?? 0,
    },
  }))
}

export const getRelationGraphKey = (mode: RelationGraphMode, focusedObjectId: number | null) => {
  if (mode === 'all' && focusedObjectId === null) {
    return 'relations:all'
  }

  return focusedObjectId === null
    ? `relations:${mode}`
    : `relations:${mode}:focus:${focusedObjectId}`
}

export const getVisibleRelationGraph = (
  graph: RelationGraph,
  mode: RelationGraphMode,
  focusedObjectId: number | null,
): RelationGraph => {
  const modeEdges = mode === 'all'
    ? graph.edges
    : graph.edges.filter((edge) => edge.category === mode)

  const visibleEdges = focusedObjectId === null
    ? modeEdges
    : modeEdges.filter((edge) => edge.sourceId === focusedObjectId || edge.targetId === focusedObjectId)

  if (mode === 'all' && focusedObjectId === null) {
    return { nodes: graph.nodes, edges: visibleEdges }
  }

  const visibleNodeIds = new Set<number>()
  visibleEdges.forEach((edge) => {
    visibleNodeIds.add(edge.sourceId)
    visibleNodeIds.add(edge.targetId)
  })

  if (focusedObjectId !== null && graph.nodes.some((node) => node.id === focusedObjectId)) {
    visibleNodeIds.add(focusedObjectId)
  }

  return {
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: visibleEdges,
  }
}

export const buildRelationFlow = (
  graph: RelationGraph,
  objects: StoryObject[],
  onSelect: (storyObject: StoryObject) => void,
  layoutPositions: Map<number, { x: number; y: number }>,
  selectedEdgeId: string | null,
  ui: PreviewText,
) => {
  const objectById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const graphNodes = getRelationGraphNodes(graph, objects)
  const degree = getRelationDegrees(graph, graphNodes)

  const centerNode = graphNodes.reduce<RelationGraphNode | null>((bestNode, node) => {
    if (bestNode === null) {
      return node
    }

    return (degree.get(node.id) ?? 0) > (degree.get(bestNode.id) ?? 0) ? node : bestNode
  }, null)
  const centerId = centerNode?.id ?? null
  const neighborIds = new Set<number>()

  if (centerId !== null) {
    graph.edges.forEach((edge) => {
      if (edge.sourceId === centerId) {
        neighborIds.add(edge.targetId)
      }
      if (edge.targetId === centerId) {
        neighborIds.add(edge.sourceId)
      }
    })
  }

  const positions = new Map<number, { x: number; y: number }>()
  if (centerNode !== null && graph.edges.length > 0) {
    positions.set(centerNode.id, { x: 520, y: 300 })
    const neighbors = graphNodes.filter((node) => neighborIds.has(node.id))
    const rest = graphNodes.filter((node) => node.id !== centerNode.id && !neighborIds.has(node.id))

    neighbors.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(neighbors.length, 1)
      positions.set(node.id, {
        x: 520 + Math.cos(angle) * 360,
        y: 300 + Math.sin(angle) * 230,
      })
    })

    rest.forEach((node, index) => {
      positions.set(node.id, {
        x: 80 + (index % 5) * 250,
        y: 650 + Math.floor(index / 5) * 150,
      })
    })
  } else {
    graphNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: 80 + (index % 4) * 260,
        y: 90 + Math.floor(index / 4) * 150,
      })
    })
  }

  const getNodePosition = (nodeId: number) => layoutPositions.get(nodeId) ?? positions.get(nodeId) ?? { x: 0, y: 0 }
  const nodes: RelationObjectFlowNode[] = graphNodes.map((node) => ({
    id: String(node.id),
    type: 'relationObject',
    position: getNodePosition(node.id),
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      storyObject: objectById.get(node.id) ?? relationGraphNodeToStoryObject(node),
      relationCount: degree.get(node.id) ?? 0,
      onSelect,
    },
  }))

  const edges: Edge[] = graph.edges.map((edge) => {
    const color = relationCategoryColorTokens[edge.category] ?? defaultRelationColorToken
    const strength = edge.strength ?? 55
    const { sourceHandle, targetHandle } = getRelationHandleIds(getNodePosition(edge.sourceId), getNodePosition(edge.targetId))
    const isSelected = selectedEdgeId === edge.id

    return {
      id: edge.id,
      source: String(edge.sourceId),
      sourceHandle,
      target: String(edge.targetId),
      targetHandle,
      type: 'straight',
      animated: (edge.tension ?? 0) >= 65,
      selected: isSelected,
      label: getRelationLabel(edge.relationType, ui),
      markerEnd: { type: MarkerType.ArrowClosed, color },
      markerStart: edge.isBidirectional ? { type: MarkerType.ArrowClosed, color } : undefined,
      style: {
        stroke: color,
        strokeWidth: Math.max(isSelected ? 4 : 2, Math.min(isSelected ? 8 : 6, (isSelected ? 3 : 2) + strength / 28)),
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 10,
      labelBgStyle: {
        fill: relationLabelBackgroundToken,
        fillOpacity: 0.92,
      },
      labelStyle: {
        fill: color,
        fontSize: 12,
        fontWeight: 800,
      },
    }
  })

  return { nodes, edges }
}
