import { MarkerType, Position, type Edge } from '@xyflow/react'

import { getObjectFullName } from '../../style-preview/domain/objectDisplay'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { relationCategoryColorTokens, relationLabelBackgroundToken } from '../../style-preview/domain/styleRuntimeTokens'
import type { RelationGraph, RelationGraphNode, StoryObject, Structure, StructureAssignment } from '../../types'
import type { RelationsFlowNode, StructureFlowNodeKind, StructureGraphMode, StructureGraphTarget } from './RelationFlowTypes'
import {
  centerStructureParentsByChildren,
  getGroupedStructureNodeKey,
  getNextGroupedLevelSlot,
  getOrderedStructureNodes,
  getStructureAssignmentTargetKey,
  getStructureAssignmentTargetLayoutId,
  getStructureGraphLevelSpans,
  getStructureMapPosition,
  getStructureNodeLayoutId,
  getStructureVisualLevelIndexes,
  normalizeMergedStructureFlow,
  type LevelPlacementState,
} from './StructureGraphLayout'

export const buildStructureFlow = (
  structure: Structure | null,
  assignments: StructureAssignment[],
  objects: StoryObject[],
  onSelect: (storyObject: StoryObject) => void,
  onSelectStructureTarget: (target: StructureGraphTarget) => void,
  layoutPositions: Map<number, { x: number; y: number }>,
  mode: StructureGraphMode,
  focusedNodeId: number | null,
  ui: PreviewText,
) => {
  if (structure === null) {
    return {
      nodes: [] as RelationsFlowNode[],
      edges: [] as Edge[],
      graph: { nodes: [], edges: [] } as RelationGraph,
      allGraph: { nodes: [], edges: [] } as RelationGraph,
    }
  }

  const nodes: RelationsFlowNode[] = []
  const edges: Edge[] = []
  const graphNodes: RelationGraph['nodes'] = []
  const graphEdges: RelationGraph['edges'] = []
  const nodeKinds = new Map<number, StructureFlowNodeKind>()
  const structureNodesById = new Map(structure.nodes.map((node) => [node.id, node]))
  const objectsById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const orderedStructureNodes = getOrderedStructureNodes(structure)
  const visualLevelIndexes = getStructureVisualLevelIndexes(orderedStructureNodes)
  const getVisualLevelIndex = (node: Structure['nodes'][number]) =>
    visualLevelIndexes.get(node.id) ?? node.levelIndex
  const structureAssignments = assignments.filter((assignment) => assignment.structureId === structure.id)
  const orderedStructureAssignments = structureAssignments.toSorted((left, right) =>
    left.structureNodeName.localeCompare(right.structureNodeName) ||
    left.sortOrder - right.sortOrder ||
    left.targetName.localeCompare(right.targetName),
  )
  const levelSpans = getStructureGraphLevelSpans({
    getNodeLevelIndex: getVisualLevelIndex,
    orderedStructureAssignments,
    orderedStructureNodes,
    structureNodesById,
  })
  const levelPlacements = new Map<number, LevelPlacementState>()

  const addGraphEdge = (
    id: string,
    sourceId: number,
    targetId: number,
    relationType: string,
    category: string,
    description: string | null = null,
  ) => {
    graphEdges.push({
      id,
      sourceId,
      targetId,
      relationType,
      category,
      strength: null,
      tension: null,
      isBidirectional: false,
      description,
    })
  }

  orderedStructureNodes
    .forEach((node) => {
      const layoutId = getStructureNodeLayoutId(node.id)
      const visualLevelIndex = getVisualLevelIndex(node)
      const levelSlot = getNextGroupedLevelSlot(levelPlacements, visualLevelIndex, getGroupedStructureNodeKey(node))
      nodeKinds.set(layoutId, 'structure')
      graphNodes.push({
        id: layoutId,
        name: node.name,
        surname: null,
        surnameForm: null,
        imagePath: null,
        typeKey: 'hierarchy',
      })
      nodes.push({
        id: String(layoutId),
        type: 'structureNode',
        position: getStructureMapPosition(visualLevelIndex, levelSlot, levelSpans),
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          title: node.name,
          subtitle: ui.structureNode,
          meta: node.nodeType?.trim() || `${ui.structureLevelIndex} ${node.levelIndex + 1}`,
          description: node.description?.trim() || null,
          kind: 'structure',
          color: node.color?.trim() || relationCategoryColorTokens.structure,
          target: { kind: 'structureNode', id: node.id },
          onSelectTarget: onSelectStructureTarget,
        },
      })
    })

  const explicitEdgeKeys = new Set<string>()
  structure.edges.forEach((edge) => {
    if (!structureNodesById.has(edge.sourceNodeId) || !structureNodesById.has(edge.targetNodeId)) {
      return
    }

    const sourceNode = structureNodesById.get(edge.sourceNodeId)
    const targetNode = structureNodesById.get(edge.targetNodeId)
    if (sourceNode === undefined || targetNode === undefined) {
      return
    }

    if (
      targetNode.parentNodeId !== null &&
      targetNode.parentNodeId !== sourceNode.id &&
      sourceNode.levelIndex < targetNode.levelIndex - 1
    ) {
      return
    }

    explicitEdgeKeys.add(`${edge.sourceNodeId}:${edge.targetNodeId}`)
    addGraphEdge(
      `structure-edge:${edge.id}`,
      getStructureNodeLayoutId(edge.sourceNodeId),
      getStructureNodeLayoutId(edge.targetNodeId),
      edge.relationType || ui.structureEdgeDefaultType,
      'structure',
      edge.description,
    )
    edges.push({
      id: `structure-edge:${edge.id}`,
      source: String(getStructureNodeLayoutId(edge.sourceNodeId)),
      target: String(getStructureNodeLayoutId(edge.targetNodeId)),
      type: 'straight',
      label: edge.relationType || ui.structureEdgeDefaultType,
      markerEnd: { type: MarkerType.ArrowClosed, color: relationCategoryColorTokens.structure },
      style: {
        stroke: relationCategoryColorTokens.structure,
        strokeWidth: 2.5,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 10,
      labelBgStyle: {
        fill: relationLabelBackgroundToken,
        fillOpacity: 0.92,
      },
      labelStyle: {
        fill: relationCategoryColorTokens.structure,
        fontSize: 12,
        fontWeight: 800,
      },
    })
  })

  structure.nodes.forEach((node) => {
    if (node.parentNodeId === null || explicitEdgeKeys.has(`${node.parentNodeId}:${node.id}`)) {
      return
    }

    edges.push({
      id: `structure-parent:${node.parentNodeId}:${node.id}`,
      source: String(getStructureNodeLayoutId(node.parentNodeId)),
      target: String(getStructureNodeLayoutId(node.id)),
      type: 'straight',
      label: ui.structureParentNode,
      markerEnd: { type: MarkerType.ArrowClosed, color: relationCategoryColorTokens.structure },
      style: {
        stroke: relationCategoryColorTokens.structure,
        strokeDasharray: '8 6',
        strokeWidth: 2,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 10,
      labelBgStyle: {
        fill: relationLabelBackgroundToken,
        fillOpacity: 0.92,
      },
      labelStyle: {
        fill: relationCategoryColorTokens.structure,
        fontSize: 11,
        fontWeight: 800,
      },
    })
    addGraphEdge(
      `structure-parent:${node.parentNodeId}:${node.id}`,
      getStructureNodeLayoutId(node.parentNodeId),
      getStructureNodeLayoutId(node.id),
      ui.structureParentNode,
      'structure',
    )
  })

  const assignmentCountsByTargetKey = new Map<string, number>()
  structureAssignments.forEach((assignment) => {
    const targetKey = getStructureAssignmentTargetKey(assignment)
    assignmentCountsByTargetKey.set(
      targetKey,
      (assignmentCountsByTargetKey.get(targetKey) ?? 0) + 1,
    )
  })

  const addedAssignmentTargetKeys = new Set<string>()
  orderedStructureAssignments
    .forEach((assignment) => {
      const structureNode = structureNodesById.get(assignment.structureNodeId)
      const targetLayoutId = getStructureAssignmentTargetLayoutId(assignment)
      const targetKey = getStructureAssignmentTargetKey(assignment)
      const storyObject =
        assignment.targetKind === 'storyObject' && assignment.storyObjectId !== null
          ? objectsById.get(assignment.storyObjectId)
          : undefined
      if (structureNode === undefined || (assignment.targetKind === 'storyObject' && storyObject === undefined)) {
        return
      }

      if (!addedAssignmentTargetKeys.has(targetKey)) {
        addedAssignmentTargetKeys.add(targetKey)
        nodeKinds.set(targetLayoutId, 'assignmentObject')
        graphNodes.push({
          id: targetLayoutId,
          name: storyObject === undefined ? assignment.targetName : getObjectFullName(storyObject),
          surname: storyObject?.surname ?? null,
          surnameForm: storyObject?.surnameForm ?? null,
          imagePath: storyObject?.imagePath ?? null,
          typeKey: (storyObject?.typeKey as RelationGraphNode['typeKey'] | undefined) ?? 'hierarchy',
        })
        const assignmentLevel = getVisualLevelIndex(structureNode) + 1
        const levelSlot = getNextGroupedLevelSlot(
          levelPlacements,
          assignmentLevel,
          `assignment-parent:${assignment.structureNodeId}`,
        )
        if (storyObject === undefined) {
          nodes.push({
            id: String(targetLayoutId),
            type: 'structureNode',
            position: getStructureMapPosition(assignmentLevel, levelSlot, levelSpans),
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: {
              title: assignment.targetName,
              subtitle: ui.entry,
              meta: assignment.roleLabel?.trim() || assignment.targetTypeKey,
              description: assignment.notes,
              kind: 'assignmentObject',
              color: relationCategoryColorTokens.object,
              target: null,
              onSelectTarget: onSelectStructureTarget,
            },
          })
        } else {
          nodes.push({
            id: String(targetLayoutId),
            type: 'relationObject',
            position: getStructureMapPosition(assignmentLevel, levelSlot, levelSpans),
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: {
              storyObject,
              relationCount: assignmentCountsByTargetKey.get(targetKey) ?? 1,
              onSelect,
            },
          })
        }
      }

      const edgeId = `structure-assignment:${assignment.id}`
      edges.push({
        id: edgeId,
        source: String(getStructureNodeLayoutId(assignment.structureNodeId)),
        target: String(targetLayoutId),
        type: 'straight',
        label: assignment.roleLabel?.trim() || ui.structureMembership,
        markerEnd: { type: MarkerType.ArrowClosed, color: relationCategoryColorTokens.structure },
        style: {
          stroke: relationCategoryColorTokens.structure,
          strokeWidth: 2.2,
        },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 10,
        labelBgStyle: {
          fill: relationLabelBackgroundToken,
          fillOpacity: 0.92,
        },
        labelStyle: {
          fill: relationCategoryColorTokens.structure,
          fontSize: 12,
          fontWeight: 800,
        },
      })
      addGraphEdge(
        edgeId,
        getStructureNodeLayoutId(assignment.structureNodeId),
        targetLayoutId,
        assignment.roleLabel?.trim() || ui.structureMembership,
        'structure',
        assignment.notes,
      )
    })

  const normalizedFlow = mode === 'all'
    ? normalizeMergedStructureFlow(nodes, edges, graphNodes, graphEdges, nodeKinds)
    : {
        edges: edges.map((edge) => ({
          ...edge,
          sourceHandle: 'source-bottom',
          targetHandle: 'target-top',
        })),
        graphEdges,
        graphNodes,
        nodeKinds,
        nodes,
      }
  const centeredFlow = centerStructureParentsByChildren(normalizedFlow)
  const positionedFlow = applyStructureLayoutPositions(centeredFlow, layoutPositions)

  const visibleNodeIds = new Set<number>()
  positionedFlow.graphNodes.forEach((node) => {
    const kind = positionedFlow.nodeKinds.get(node.id)
    if (
      mode === 'all' ||
      (mode === 'structure' && kind === 'structure') ||
      (mode === 'assignments' && (kind === 'structure' || kind === 'assignmentObject'))
    ) {
      visibleNodeIds.add(node.id)
    }
  })

  let visibleGraphEdges = positionedFlow.graphEdges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId))
  if (focusedNodeId !== null && positionedFlow.graphNodes.some((node) => node.id === focusedNodeId)) {
    const focusedEdges = positionedFlow.graphEdges.filter((edge) => edge.sourceId === focusedNodeId || edge.targetId === focusedNodeId)
    visibleNodeIds.clear()
    visibleNodeIds.add(focusedNodeId)
    focusedEdges.forEach((edge) => {
      visibleNodeIds.add(edge.sourceId)
      visibleNodeIds.add(edge.targetId)
    })
    visibleGraphEdges = focusedEdges
  }

  const visibleGraph = {
    nodes: positionedFlow.graphNodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: visibleGraphEdges,
  }
  const visibleEdgeIds = new Set(visibleGraphEdges.map((edge) => edge.id))

  return {
    nodes: positionedFlow.nodes.filter((node) => visibleNodeIds.has(Number(node.id))),
    edges: positionedFlow.edges.filter((edge) => visibleEdgeIds.has(edge.id)),
    graph: visibleGraph,
    allGraph: {
      nodes: positionedFlow.graphNodes,
      edges: positionedFlow.graphEdges,
    },
  }
}

const applyStructureLayoutPositions = (
  flow: {
    edges: Edge[]
    graphEdges: RelationGraph['edges']
    graphNodes: RelationGraph['nodes']
    nodeKinds: Map<number, StructureFlowNodeKind>
    nodes: RelationsFlowNode[]
  },
  layoutPositions: Map<number, { x: number; y: number }>,
) => {
  if (layoutPositions.size === 0) {
    return flow
  }

  return {
    ...flow,
    nodes: flow.nodes.map((node) => ({
      ...node,
      position: layoutPositions.get(Number(node.id)) ?? node.position,
    })),
  }
}

export const getStructureGraphKey = (
  structureId: number,
  mode: StructureGraphMode,
  focusedStructureNodeId: number | null,
) =>
  focusedStructureNodeId === null
    ? `structure:${structureId}:${mode}`
    : `structure:${structureId}:${mode}:focus:${focusedStructureNodeId}`

