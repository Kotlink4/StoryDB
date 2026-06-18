import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { getObjectFullName, relationGraphNodeToStoryObject } from '../style-preview/domain/objectDisplay'
import { getRelationCategoryLabel, getRelationLabel } from '../style-preview/domain/relationDisplay'
import {
  getRelationDegrees,
  getRelationGraphNodes,
  getRelationHandleIds,
} from '../style-preview/domain/relationLayout'
import {
  defaultRelationColorToken,
  relationCategoryColorTokens,
  relationLabelBackgroundToken,
} from '../style-preview/domain/styleRuntimeTokens'
import { buildCatalogGroupTree } from '../domain/catalogGroupTree'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  RelationGraph,
  RelationGraphLayout,
  RelationGraphNode,
  StoryObject,
  Structure,
  StructureAssignment,
} from '../types'
import { ObjectPortrait } from './StylePreviewPrimitives'

const relationGraphCategories = ['character', 'membership', 'ownership', 'object', 'structure'] as const

type RelationGraphCategory = typeof relationGraphCategories[number]
type RelationGraphMode = 'all' | RelationGraphCategory
type RelationPageGraphKind = 'relations' | 'structure'
type StructureGraphMode = 'all' | 'structure' | 'catalog' | 'assignments'

type RelationNodeData = {
  storyObject: StoryObject
  relationCount: number
  onSelect: (storyObject: StoryObject) => void
}

type RelationObjectFlowNode = Node<RelationNodeData, 'relationObject'>

type StructureFlowNodeKind = 'structure' | 'catalogEntry' | 'catalogGroup' | 'assignmentObject'

type StructureNodeData = {
  title: string
  subtitle: string
  meta: string
  description: string | null
  kind: StructureFlowNodeKind
  color: string
}

type StructureFlowNode = Node<StructureNodeData, 'structureNode'>
type RelationsFlowNode = RelationObjectFlowNode | StructureFlowNode

const relationNodeTypes = {
  relationObject: RelationObjectNode,
  structureNode: StructureNode,
}

const relationHandlePositions = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
]

const getRelationGraphKey = (mode: RelationGraphMode, focusedObjectId: number | null) => {
  if (mode === 'all' && focusedObjectId === null) {
    return 'relations:all'
  }

  return focusedObjectId === null
    ? `relations:${mode}`
    : `relations:${mode}:focus:${focusedObjectId}`
}

const getVisibleRelationGraph = (
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

function RelationObjectNode({ data }: NodeProps<RelationObjectFlowNode>) {
  return (
    <button className="sp-flow-node" type="button" onClick={() => data.onSelect(data.storyObject)}>
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`source-${handle.id}`}
          key={`source-${handle.id}`}
          position={handle.position}
          type="source"
        />
      ))}
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`target-${handle.id}`}
          key={`target-${handle.id}`}
          position={handle.position}
          type="target"
        />
      ))}
      <ObjectPortrait storyObject={data.storyObject} />
      <div>
        <strong>{getObjectFullName(data.storyObject)}</strong>
        <span>{data.storyObject.typeKey}</span>
      </div>
      <em>{data.relationCount}</em>
    </button>
  )
}

function StructureNode({ data }: NodeProps<StructureFlowNode>) {
  return (
    <div
      className={`sp-structure-flow-node ${data.kind}`}
      style={{ '--node-color': data.color } as CSSProperties}
      title={data.description === null ? data.title : `${data.title}\n${data.description}`}
    >
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`source-${handle.id}`}
          key={`source-${handle.id}`}
          position={handle.position}
          type="source"
        />
      ))}
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`target-${handle.id}`}
          key={`target-${handle.id}`}
          position={handle.position}
          type="target"
        />
      ))}
      <span>{data.subtitle}</span>
      <strong>{data.title}</strong>
      {data.description !== null && <p>{data.description}</p>}
      <em>{data.meta}</em>
    </div>
  )
}

const buildRelationFlow = (
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

const structureNodeLayoutIdBase = 1_000_000_000
const catalogGroupLayoutIdBase = 1_100_000_000
const catalogEntryLayoutIdBase = 1_200_000_000
const getStructureNodeLayoutId = (nodeId: number) => structureNodeLayoutIdBase + nodeId
const getCatalogGroupLayoutId = (groupId: number) => catalogGroupLayoutIdBase + groupId
const getCatalogEntryLayoutId = (entryId: number) => catalogEntryLayoutIdBase + entryId

const buildStructureFlow = (
  structure: Structure | null,
  catalog: Catalog | null,
  catalogEntries: CatalogEntry[],
  catalogGroups: CatalogEntryGroup[],
  assignments: StructureAssignment[],
  objects: StoryObject[],
  onSelect: (storyObject: StoryObject) => void,
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
  const linkedEntryIds = new Set(
    structure.nodes
      .map((node) => node.linkedCatalogEntryId)
      .filter((entryId): entryId is number => entryId !== null),
  )
  const linkedGroupIds = new Set(
    structure.nodes
      .map((node) => node.linkedCatalogEntryGroupId)
      .filter((groupId): groupId is number => groupId !== null),
  )
  const entriesById = new Map(catalogEntries.map((entry) => [entry.id, entry]))
  const groupsById = new Map(catalogGroups.map((group) => [group.id, group]))
  const maxStructureLevel = Math.max(...structure.nodes.map((node) => node.levelIndex), 0)

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

  structure.nodes
    .toSorted((left, right) => left.levelIndex - right.levelIndex || left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
    .forEach((node, index) => {
      const layoutId = getStructureNodeLayoutId(node.id)
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
        position: layoutPositions.get(layoutId) ?? {
          x: 80 + node.levelIndex * 290,
          y: 80 + index * 92,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          title: node.name,
          subtitle: ui.structureNode,
          meta: node.nodeType?.trim() || `${ui.structureLevelIndex} ${node.levelIndex + 1}`,
          description: node.description?.trim() || null,
          kind: 'structure',
          color: node.color?.trim() || relationCategoryColorTokens.structure,
        },
      })
    })

  const explicitEdgeKeys = new Set<string>()
  structure.edges.forEach((edge) => {
    if (!structureNodesById.has(edge.sourceNodeId) || !structureNodesById.has(edge.targetNodeId)) {
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

  const structureAssignments = assignments.filter((assignment) => assignment.structureId === structure.id)
  const assignmentCountsByObjectId = new Map<number, number>()
  structureAssignments.forEach((assignment) => {
    assignmentCountsByObjectId.set(
      assignment.storyObjectId,
      (assignmentCountsByObjectId.get(assignment.storyObjectId) ?? 0) + 1,
    )
  })

  const assignmentsByNodeId = new Map<number, StructureAssignment[]>()
  structureAssignments.forEach((assignment) => {
    assignmentsByNodeId.set(assignment.structureNodeId, [
      ...(assignmentsByNodeId.get(assignment.structureNodeId) ?? []),
      assignment,
    ])
  })

  const addedAssignmentObjectIds = new Set<number>()
  structureAssignments
    .toSorted((left, right) =>
      left.structureNodeName.localeCompare(right.structureNodeName) ||
      left.sortOrder - right.sortOrder ||
      left.storyObjectName.localeCompare(right.storyObjectName),
    )
    .forEach((assignment) => {
      const storyObject = objectsById.get(assignment.storyObjectId)
      const structureNode = structureNodesById.get(assignment.structureNodeId)
      if (storyObject === undefined || structureNode === undefined) {
        return
      }

      if (!addedAssignmentObjectIds.has(storyObject.id)) {
        addedAssignmentObjectIds.add(storyObject.id)
        nodeKinds.set(storyObject.id, 'assignmentObject')
        graphNodes.push({
          id: storyObject.id,
          name: getObjectFullName(storyObject),
          surname: storyObject.surname,
          surnameForm: storyObject.surnameForm,
          imagePath: storyObject.imagePath,
          typeKey: storyObject.typeKey as RelationGraphNode['typeKey'],
        })
        const siblingIndex = assignmentsByNodeId.get(assignment.structureNodeId)?.findIndex(
          (currentAssignment) => currentAssignment.storyObjectId === assignment.storyObjectId,
        ) ?? 0
        nodes.push({
          id: String(storyObject.id),
          type: 'relationObject',
          position: layoutPositions.get(storyObject.id) ?? {
            x: 80 + (structureNode.levelIndex + 1) * 290,
            y: 84 + structure.nodes.indexOf(structureNode) * 92 + siblingIndex * 82,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            storyObject,
            relationCount: assignmentCountsByObjectId.get(storyObject.id) ?? 1,
            onSelect,
          },
        })
      }

      const edgeId = `structure-assignment:${assignment.id}`
      edges.push({
        id: edgeId,
        source: String(getStructureNodeLayoutId(assignment.structureNodeId)),
        target: String(storyObject.id),
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
        storyObject.id,
        assignment.roleLabel?.trim() || ui.structureMembership,
        'structure',
        assignment.notes,
      )
    })

  if (catalog !== null) {
    buildCatalogGroupTree(catalogGroups)
      .forEach(({ group, depth }, index) => {
        const layoutId = getCatalogGroupLayoutId(group.id)
        nodeKinds.set(layoutId, 'catalogGroup')
        graphNodes.push({
          id: layoutId,
          name: group.name,
          surname: null,
          surnameForm: null,
          imagePath: null,
          typeKey: 'hierarchy',
        })
        nodes.push({
          id: String(layoutId),
          type: 'structureNode',
          position: layoutPositions.get(layoutId) ?? {
            x: 80 + Math.max(2, maxStructureLevel + 1) * 290 + depth * 80,
            y: 80 + index * 86,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            title: group.name,
            subtitle: ui.catalogHierarchyGroups,
            meta: linkedGroupIds.has(group.id) ? ui.structureLinkedCatalogGroup : catalog.name,
            description: null,
            kind: 'catalogGroup',
            color: '#38bdf8',
          },
        })
      })

    catalogEntries
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .forEach((entry, index) => {
        const layoutId = getCatalogEntryLayoutId(entry.id)
        nodeKinds.set(layoutId, 'catalogEntry')
        graphNodes.push({
          id: layoutId,
          name: entry.name,
          surname: null,
          surnameForm: null,
          imagePath: entry.imagePath,
          typeKey: 'hierarchy',
        })
        nodes.push({
          id: String(layoutId),
          type: 'structureNode',
          position: layoutPositions.get(layoutId) ?? {
            x: 80 + Math.max(3, maxStructureLevel + 2) * 290,
            y: 80 + index * 86,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            title: entry.name,
            subtitle: ui.catalogHierarchyEntries,
            meta: linkedEntryIds.has(entry.id) ? ui.structureLinkedCatalogEntry : catalog.name,
            description: entry.description?.trim() || null,
            kind: 'catalogEntry',
            color: '#22c55e',
          },
        })
      })

    catalogGroups.forEach((group) => {
      group.parentGroupIds.forEach((parentGroupId) => {
        if (!groupsById.has(parentGroupId)) {
          return
        }

        edges.push({
          id: `catalog-group-parent:${parentGroupId}:${group.id}`,
          source: String(getCatalogGroupLayoutId(parentGroupId)),
          target: String(getCatalogGroupLayoutId(group.id)),
          type: 'straight',
          label: ui.structureParentNode,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
          style: { stroke: '#38bdf8', strokeDasharray: '8 6', strokeWidth: 1.8 },
        })
        addGraphEdge(
          `catalog-group-parent:${parentGroupId}:${group.id}`,
          getCatalogGroupLayoutId(parentGroupId),
          getCatalogGroupLayoutId(group.id),
          ui.structureParentNode,
          'membership',
        )
      })
    })

    catalogEntries.forEach((entry) => {
      if (entry.entryGroupId !== null && groupsById.has(entry.entryGroupId)) {
        edges.push({
          id: `catalog-group-entry:${entry.entryGroupId}:${entry.id}`,
          source: String(getCatalogGroupLayoutId(entry.entryGroupId)),
          target: String(getCatalogEntryLayoutId(entry.id)),
          type: 'straight',
          label: ui.group,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
          style: { stroke: '#38bdf8', strokeWidth: 1.8 },
        })
        addGraphEdge(
          `catalog-group-entry:${entry.entryGroupId}:${entry.id}`,
          getCatalogGroupLayoutId(entry.entryGroupId),
          getCatalogEntryLayoutId(entry.id),
          ui.group,
          'membership',
        )
      }

      entry.parentEntryIds.forEach((parentEntryId) => {
        if (!entriesById.has(parentEntryId)) {
          return
        }

        edges.push({
          id: `catalog-entry-parent:${parentEntryId}:${entry.id}`,
          source: String(getCatalogEntryLayoutId(parentEntryId)),
          target: String(getCatalogEntryLayoutId(entry.id)),
          type: 'straight',
          label: ui.hierarchyParentLabel,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
          style: { stroke: '#22c55e', strokeDasharray: '8 6', strokeWidth: 1.8 },
        })
        addGraphEdge(
          `catalog-entry-parent:${parentEntryId}:${entry.id}`,
          getCatalogEntryLayoutId(parentEntryId),
          getCatalogEntryLayoutId(entry.id),
          ui.hierarchyParentLabel,
          'object',
        )
      })
    })
  }

  structure.nodes.forEach((node) => {
    if (node.linkedCatalogEntryGroupId !== null && groupsById.has(node.linkedCatalogEntryGroupId)) {
      edges.push({
        id: `structure-catalog-group:${node.id}:${node.linkedCatalogEntryGroupId}`,
        source: String(getStructureNodeLayoutId(node.id)),
        target: String(getCatalogGroupLayoutId(node.linkedCatalogEntryGroupId)),
        type: 'straight',
        label: ui.structureLinkedCatalogGroup,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        style: { stroke: '#38bdf8', strokeWidth: 2.2 },
      })
      addGraphEdge(
        `structure-catalog-group:${node.id}:${node.linkedCatalogEntryGroupId}`,
        getStructureNodeLayoutId(node.id),
        getCatalogGroupLayoutId(node.linkedCatalogEntryGroupId),
        ui.structureLinkedCatalogGroup,
        'membership',
      )
    }

    if (node.linkedCatalogEntryId !== null && entriesById.has(node.linkedCatalogEntryId)) {
      edges.push({
        id: `structure-catalog-entry:${node.id}:${node.linkedCatalogEntryId}`,
        source: String(getStructureNodeLayoutId(node.id)),
        target: String(getCatalogEntryLayoutId(node.linkedCatalogEntryId)),
        type: 'straight',
        label: ui.structureLinkedCatalogEntry,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        style: { stroke: '#22c55e', strokeWidth: 2.2 },
      })
      addGraphEdge(
        `structure-catalog-entry:${node.id}:${node.linkedCatalogEntryId}`,
        getStructureNodeLayoutId(node.id),
        getCatalogEntryLayoutId(node.linkedCatalogEntryId),
        ui.structureLinkedCatalogEntry,
        'object',
      )
    }
  })

  const visibleNodeIds = new Set<number>()
  graphNodes.forEach((node) => {
    const kind = nodeKinds.get(node.id)
    if (
      mode === 'all' ||
      (mode === 'structure' && kind === 'structure') ||
      (mode === 'catalog' && (kind === 'catalogEntry' || kind === 'catalogGroup')) ||
      (mode === 'assignments' && (kind === 'structure' || kind === 'assignmentObject'))
    ) {
      visibleNodeIds.add(node.id)
    }
  })

  let visibleGraphEdges = graphEdges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId))
  if (focusedNodeId !== null && graphNodes.some((node) => node.id === focusedNodeId)) {
    const focusedEdges = graphEdges.filter((edge) => edge.sourceId === focusedNodeId || edge.targetId === focusedNodeId)
    visibleNodeIds.clear()
    visibleNodeIds.add(focusedNodeId)
    focusedEdges.forEach((edge) => {
      visibleNodeIds.add(edge.sourceId)
      visibleNodeIds.add(edge.targetId)
    })
    visibleGraphEdges = focusedEdges
  }

  const visibleGraph = {
    nodes: graphNodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: visibleGraphEdges,
  }
  const visibleEdgeIds = new Set(visibleGraphEdges.map((edge) => edge.id))

  return {
    nodes: nodes.filter((node) => visibleNodeIds.has(Number(node.id))),
    edges: edges.filter((edge) => visibleEdgeIds.has(edge.id)),
    graph: visibleGraph,
    allGraph: {
      nodes: graphNodes,
      edges: graphEdges,
    },
  }
}

const getStructureGraphKey = (
  structureId: number,
  mode: StructureGraphMode,
  focusedStructureNodeId: number | null,
) =>
  focusedStructureNodeId === null
    ? `structure:${structureId}:${mode}`
    : `structure:${structureId}:${mode}:focus:${focusedStructureNodeId}`

export type RelationsPageProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  graph: RelationGraph
  isLayoutGenerating: boolean
  layout: RelationGraphLayout | null
  objects: StoryObject[]
  selectedEdgeId: string | null
  structureAssignments: StructureAssignment[]
  structures: Structure[]
  ui: PreviewText
  onCreateRelation: () => void
  onGenerateLayout: (graphKey: string, graph: RelationGraph) => void
  onGraphKeyChange: (graphKey: string) => void
  onSaveNodePosition: (graphKey: string, graph: RelationGraph, storyObjectId: number, position: { x: number; y: number }) => void
  onSelectEdge: (edgeId: string) => void
  onSelect: (storyObject: StoryObject) => void
}

export function RelationsPage({
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  graph,
  isLayoutGenerating,
  layout,
  objects,
  selectedEdgeId,
  structureAssignments,
  structures,
  ui,
  onCreateRelation,
  onGenerateLayout,
  onGraphKeyChange,
  onSaveNodePosition,
  onSelectEdge,
  onSelect,
}: RelationsPageProps) {
  const [graphKind, setGraphKind] = useState<RelationPageGraphKind>('relations')
  const [graphMode, setGraphMode] = useState<RelationGraphMode>('all')
  const [focusedObjectId, setFocusedObjectId] = useState<number | null>(null)
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null)
  const [structureGraphMode, setStructureGraphMode] = useState<StructureGraphMode>('all')
  const [focusedStructureNodeId, setFocusedStructureNodeId] = useState<number | null>(null)
  const selectedStructure = useMemo(
    () =>
      selectedStructureId === null
        ? structures[0] ?? null
        : structures.find((structure) => structure.id === selectedStructureId) ?? structures[0] ?? null,
    [selectedStructureId, structures],
  )
  const selectedStructureCatalog = useMemo(
    () =>
      selectedStructure?.linkedCatalogId === null || selectedStructure?.linkedCatalogId === undefined
        ? null
        : catalogs.find((catalog) => catalog.id === selectedStructure.linkedCatalogId) ?? null,
    [catalogs, selectedStructure],
  )
  const visibleGraph = useMemo(
    () => getVisibleRelationGraph(graph, graphMode, focusedObjectId),
    [focusedObjectId, graph, graphMode],
  )
  const graphKey = useMemo(
    () => graphKind === 'structure' && selectedStructure !== null
      ? getStructureGraphKey(selectedStructure.id, structureGraphMode, focusedStructureNodeId)
      : getRelationGraphKey(graphMode, focusedObjectId),
    [focusedObjectId, focusedStructureNodeId, graphKind, graphMode, selectedStructure, structureGraphMode],
  )
  const activeLayout = layout?.graphKey === graphKey ? layout : null
  const layoutPositions = useMemo(
    () =>
      new Map(
        activeLayout?.items.map((item) => [
          item.storyObjectId,
          {
            x: item.x,
            y: item.y,
          },
        ]) ?? [],
      ),
    [activeLayout],
  )
  const { nodes, edges } = useMemo(
    () => buildRelationFlow(visibleGraph, objects, onSelect, layoutPositions, selectedEdgeId, ui),
    [layoutPositions, objects, onSelect, selectedEdgeId, ui, visibleGraph],
  )
  const structureFlow = useMemo(
    () =>
      buildStructureFlow(
        selectedStructure,
        selectedStructureCatalog,
        selectedStructureCatalog === null ? [] : catalogEntriesByCatalogId[selectedStructureCatalog.id] ?? [],
        selectedStructureCatalog === null ? [] : catalogGroupsByCatalogId[selectedStructureCatalog.id] ?? [],
        structureAssignments,
        objects,
        onSelect,
        layoutPositions,
        structureGraphMode,
        focusedStructureNodeId,
        ui,
      ),
    [
      catalogEntriesByCatalogId,
      catalogGroupsByCatalogId,
      focusedStructureNodeId,
      layoutPositions,
      objects,
      onSelect,
      selectedStructure,
      selectedStructureCatalog,
      structureGraphMode,
      structureAssignments,
      ui,
    ],
  )
  const activeNodes = graphKind === 'structure' ? structureFlow.nodes : nodes
  const activeEdges = graphKind === 'structure' ? structureFlow.edges : edges
  const activeGraph = graphKind === 'structure' ? structureFlow.graph : visibleGraph
  const [flowNodes, setFlowNodes] = useState<RelationsFlowNode[]>(activeNodes)
  const relationTypes = Array.from(new Set(visibleGraph.edges.map((edge) => getRelationLabel(edge.relationType, ui)))).sort()
  const focusOptions = [...graph.nodes].sort((left, right) => left.name.localeCompare(right.name))
  const structureFocusOptions = structureFlow.allGraph.nodes.toSorted((left, right) => left.name.localeCompare(right.name))
  const graphModeOptions: Array<{ label: string; value: RelationGraphMode }> = [
    { label: ui.graphModeAll, value: 'all' },
    ...relationGraphCategories.map((category) => ({
      label: getRelationCategoryLabel(category, ui),
      value: category,
    })),
  ]
  const layoutStatus =
    activeLayout === null
      ? ui.layoutNotGenerated
      : activeLayout.isStale
        ? ui.layoutStale
        : ui.layoutSaved
  const layoutButtonLabel =
    activeLayout === null ? ui.layoutGenerate : activeLayout.isStale ? ui.layoutUpdate : ui.layoutRegenerate
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as RelationsFlowNode[]),
    [],
  )

  useEffect(() => {
    setFlowNodes(activeNodes)
  }, [activeNodes])

  useEffect(() => {
    onGraphKeyChange(graphKey)
  }, [graphKey, onGraphKeyChange])

  useEffect(() => {
    if (focusedObjectId !== null && !graph.nodes.some((node) => node.id === focusedObjectId)) {
      setFocusedObjectId(null)
    }
  }, [focusedObjectId, graph.nodes])

  useEffect(() => {
    if (selectedStructureId !== null && !structures.some((structure) => structure.id === selectedStructureId)) {
      setSelectedStructureId(null)
    }
  }, [selectedStructureId, structures])

  useEffect(() => {
    if (focusedStructureNodeId !== null && !structureFlow.allGraph.nodes.some((node) => node.id === focusedStructureNodeId)) {
      setFocusedStructureNodeId(null)
    }
  }, [focusedStructureNodeId, structureFlow.allGraph.nodes])

  return (
    <div className="sp-relations-page">
      <div className="sp-relations-overlay-head">
        <div>
          <h2>{ui.relations}</h2>
          <p>
            {graphKind === 'structure'
              ? `${activeGraph.nodes.length} ${ui.structureNodesCount} · ${activeGraph.edges.length} ${ui.relationsCount} · ${layoutStatus}`
              : `${visibleGraph.nodes.length} ${ui.objectsCount} · ${visibleGraph.edges.length} ${ui.relationsCount} · ${layoutStatus}`}
          </p>
        </div>
        <div className="sp-relations-overlay-actions">
          <label className="sp-graph-control">
            <span>{ui.graphMode}</span>
            <select value={graphKind} onChange={(event) => setGraphKind(event.target.value as RelationPageGraphKind)}>
              <option value="relations">{ui.graphModeRelations}</option>
              <option value="structure">{ui.graphModeStructureDevice}</option>
            </select>
          </label>
          {graphKind === 'relations' && (
            <>
              <label className="sp-graph-control">
                <span>{ui.filteredGraphView}</span>
                <select value={graphMode} onChange={(event) => setGraphMode(event.target.value as RelationGraphMode)}>
                  {graphModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sp-graph-control">
                <span>{ui.graphFocus}</span>
                <select
                  value={focusedObjectId ?? ''}
                  onChange={(event) =>
                    setFocusedObjectId(event.target.value.trim().length === 0 ? null : Number(event.target.value))
                  }
                >
                  <option value="">{ui.graphFocusAll}</option>
                  {focusOptions.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {graphKind === 'structure' && (
            <>
              <label className="sp-graph-control">
                <span>{ui.structure}</span>
                <select
                  value={selectedStructure?.id ?? ''}
                  onChange={(event) =>
                    setSelectedStructureId(event.target.value.trim().length === 0 ? null : Number(event.target.value))
                  }
                >
                  {structures.length === 0 && <option value="">{ui.noStructures}</option>}
                  {structures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sp-graph-control">
                <span>{ui.filteredGraphView}</span>
                <select
                  value={structureGraphMode}
                  onChange={(event) => setStructureGraphMode(event.target.value as StructureGraphMode)}
                >
                  <option value="all">{ui.structureGraphModeAll}</option>
                  <option value="structure">{ui.structureNodes}</option>
                  <option value="catalog">{ui.catalogs}</option>
                  <option value="assignments">{ui.structureMembership}</option>
                </select>
              </label>
              <label className="sp-graph-control">
                <span>{ui.graphFocus}</span>
                <select
                  value={focusedStructureNodeId ?? ''}
                  onChange={(event) =>
                    setFocusedStructureNodeId(event.target.value.trim().length === 0 ? null : Number(event.target.value))
                  }
                >
                  <option value="">{ui.graphFocusAll}</option>
                  {structureFocusOptions.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            className="sp-button"
            type="button"
            hidden={graphKind === 'structure'}
            disabled={objects.filter((storyObject) => storyObject.typeKey === 'characters').length < 2}
            onClick={onCreateRelation}
          >
            {ui.linkCharacters}
          </button>
          <button
            className="sp-button"
            type="button"
            disabled={isLayoutGenerating || activeGraph.nodes.length === 0}
            onClick={() => onGenerateLayout(graphKey, activeGraph)}
          >
            {isLayoutGenerating ? ui.layoutGenerating : layoutButtonLabel}
          </button>
        </div>
      </div>
      <div className="sp-relations-workspace">
        <aside className="sp-relations-legend">
          <strong>{ui.relations}</strong>
          {graphKind === 'relations' ? (
            <>
              <span className="sp-legend-line character">{ui.relationCharacters}</span>
              <span className="sp-legend-line membership">{ui.relationMembership}</span>
              <span className="sp-legend-line ownership">{ui.relationOwnership}</span>
              <span className="sp-legend-line object">{ui.relationObject}</span>
              <span className="sp-legend-line structure">{ui.relationStructure}</span>
              <p>{ui.relationHelp}</p>
            </>
          ) : (
            <>
              <span className="sp-legend-line structure">{ui.structureNodes}</span>
              <span className="sp-legend-line membership">{ui.catalogHierarchyGroups}</span>
              <span className="sp-legend-line object">{ui.catalogHierarchyEntries}</span>
              <span className="sp-legend-line structure">{ui.structureMembership}</span>
              <p>{ui.structureGraphHelp}</p>
            </>
          )}
          {graphKind === 'relations' && relationTypes.length > 0 && (
            <div className="sp-relation-types">
              {relationTypes.map((relationType) => (
                <span key={relationType}>{relationType}</span>
              ))}
            </div>
          )}
        </aside>
        <div className="sp-graph">
          {flowNodes.length === 0 ? (
            <div className="sp-empty">
              <strong>{graphKind === 'structure' ? ui.noStructures : ui.noObjects}</strong>
              <span>{graphKind === 'structure' ? ui.structuresDescription : ui.noRelationships}</span>
            </div>
          ) : (
            <ReactFlow
              edges={activeEdges}
              fitView
              maxZoom={1.6}
              minZoom={0.2}
              nodes={flowNodes}
              nodeTypes={relationNodeTypes}
              onEdgeClick={(_, edge) => {
                if (graphKind === 'relations') {
                  onSelectEdge(edge.id)
                }
              }}
              onNodeDragStop={(_, node) => {
                onSaveNodePosition(graphKey, activeGraph, Number(node.id), node.position)
              }}
              onNodesChange={onNodesChange}
            >
              <Background color="var(--sp-grid-line)" gap={32} variant={BackgroundVariant.Lines} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  )
}


