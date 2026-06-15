import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { RelationGraph, RelationGraphLayout, RelationGraphNode, StoryObject } from '../types'
import { ObjectPortrait } from './StylePreviewPrimitives'

const relationGraphCategories = ['character', 'membership', 'ownership', 'object', 'structure'] as const

type RelationGraphCategory = typeof relationGraphCategories[number]
type RelationGraphMode = 'all' | RelationGraphCategory

type RelationNodeData = {
  storyObject: StoryObject
  relationCount: number
  onSelect: (storyObject: StoryObject) => void
}

type RelationObjectFlowNode = Node<RelationNodeData, 'relationObject'>

const relationNodeTypes = {
  relationObject: RelationObjectNode,
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

export type RelationsPageProps = {
  graph: RelationGraph
  isLayoutGenerating: boolean
  layout: RelationGraphLayout | null
  objects: StoryObject[]
  selectedEdgeId: string | null
  ui: PreviewText
  onCreateRelation: () => void
  onGenerateLayout: (graphKey: string, graph: RelationGraph) => void
  onGraphKeyChange: (graphKey: string) => void
  onSaveNodePosition: (graphKey: string, graph: RelationGraph, storyObjectId: number, position: { x: number; y: number }) => void
  onSelectEdge: (edgeId: string) => void
  onSelect: (storyObject: StoryObject) => void
}

export function RelationsPage({
  graph,
  isLayoutGenerating,
  layout,
  objects,
  selectedEdgeId,
  ui,
  onCreateRelation,
  onGenerateLayout,
  onGraphKeyChange,
  onSaveNodePosition,
  onSelectEdge,
  onSelect,
}: RelationsPageProps) {
  const [graphMode, setGraphMode] = useState<RelationGraphMode>('all')
  const [focusedObjectId, setFocusedObjectId] = useState<number | null>(null)
  const visibleGraph = useMemo(
    () => getVisibleRelationGraph(graph, graphMode, focusedObjectId),
    [focusedObjectId, graph, graphMode],
  )
  const graphKey = useMemo(() => getRelationGraphKey(graphMode, focusedObjectId), [focusedObjectId, graphMode])
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
  const [flowNodes, setFlowNodes] = useState(nodes)
  const relationTypes = Array.from(new Set(visibleGraph.edges.map((edge) => getRelationLabel(edge.relationType, ui)))).sort()
  const focusOptions = [...graph.nodes].sort((left, right) => left.name.localeCompare(right.name))
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
  const layoutButtonLabel = activeLayout === null ? ui.layoutGenerate : activeLayout.isStale ? ui.layoutUpdate : ui.layoutRegenerate
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as RelationObjectFlowNode[]),
    [],
  )

  useEffect(() => {
    setFlowNodes(nodes)
  }, [nodes])

  useEffect(() => {
    onGraphKeyChange(graphKey)
  }, [graphKey, onGraphKeyChange])

  useEffect(() => {
    if (focusedObjectId !== null && !graph.nodes.some((node) => node.id === focusedObjectId)) {
      setFocusedObjectId(null)
    }
  }, [focusedObjectId, graph.nodes])

  return (
    <div className="sp-relations-page">
      <div className="sp-relations-overlay-head">
        <div>
          <h2>{ui.relations}</h2>
          <p>
            {visibleGraph.nodes.length} {ui.objectsCount} · {visibleGraph.edges.length} {ui.relationsCount} · {layoutStatus}
          </p>
        </div>
        <div className="sp-relations-overlay-actions">
          <label className="sp-graph-control">
            <span>{ui.graphMode}</span>
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
          <button
            className="sp-button"
            type="button"
            disabled={objects.filter((storyObject) => storyObject.typeKey === 'characters').length < 2}
            onClick={onCreateRelation}
          >
            {ui.linkCharacters}
          </button>
          <button
            className="sp-button"
            type="button"
            disabled={isLayoutGenerating || visibleGraph.nodes.length === 0}
            onClick={() => onGenerateLayout(graphKey, visibleGraph)}
          >
            {isLayoutGenerating ? ui.layoutGenerating : layoutButtonLabel}
          </button>
        </div>
      </div>
      <div className="sp-relations-workspace">
        <aside className="sp-relations-legend">
          <strong>{ui.relations}</strong>
          <span className="sp-legend-line character">{ui.relationCharacters}</span>
          <span className="sp-legend-line membership">{ui.relationMembership}</span>
          <span className="sp-legend-line ownership">{ui.relationOwnership}</span>
          <span className="sp-legend-line object">{ui.relationObject}</span>
          <span className="sp-legend-line structure">{ui.relationStructure}</span>
          <p>{ui.relationHelp}</p>
          {relationTypes.length > 0 && (
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
              <strong>{ui.noObjects}</strong>
              <span>{ui.noRelationships}</span>
            </div>
          ) : (
            <ReactFlow
              edges={edges}
              fitView
              maxZoom={1.6}
              minZoom={0.2}
              nodes={flowNodes}
              nodeTypes={relationNodeTypes}
              onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
              onNodeDragStop={(_, node) => onSaveNodePosition(graphKey, visibleGraph, Number(node.id), node.position)}
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


