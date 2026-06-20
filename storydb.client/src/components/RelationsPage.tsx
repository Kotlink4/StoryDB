import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft } from 'lucide-react'

import { getRelationLabel } from '../style-preview/domain/relationDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { DetailMode } from '../style-preview/domain/stylePreviewUiTypes'
import type {
  RelationGraph,
  RelationGraphLayout,
  StoryObject,
  Structure,
  StructureAssignment,
} from '../types'
import {
  applyParallelEdgeRouting,
  buildRelationFlow,
  getRelationGraphKey,
  getVisibleRelationGraph,
  relationEdgeTypes,
  relationNodeTypes,
  type RelationGraphMode,
} from './relations/RelationGraphFlow'
import { RelationsPageControls, type RelationPageGraphKind } from './relations/RelationsPageControls'
import { buildStructureFlow, getStructureGraphKey } from './relations/StructureGraphFlow'
import { StructureGraphEdgeDetail, StructureGraphTargetDetail } from './relations/StructureGraphDetails'
import type {
  RelationsFlowNode,
  StructureGraphMode,
  StructureGraphTarget,
} from './relations/RelationFlowTypes'
import { PreviewDialog } from './StylePreviewPrimitives'

export type RelationsPageProps = {
  detailMode: DetailMode
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
  detailMode,
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
  const structureGraphMode: StructureGraphMode = 'all'
  const [focusedStructureNodeId, setFocusedStructureNodeId] = useState<number | null>(null)
  const [selectedStructureTarget, setSelectedStructureTarget] = useState<StructureGraphTarget | null>(null)
  const [selectedStructureEdgeId, setSelectedStructureEdgeId] = useState<string | null>(null)
  const selectedStructure = useMemo(
    () =>
      selectedStructureId === null
        ? structures[0] ?? null
        : structures.find((structure) => structure.id === selectedStructureId) ?? structures[0] ?? null,
    [selectedStructureId, structures],
  )
  const visibleGraph = useMemo(
    () => getVisibleRelationGraph(graph, graphMode, focusedObjectId),
    [focusedObjectId, graph, graphMode],
  )
  const graphKey = useMemo(
    () => graphKind === 'structure' && selectedStructure !== null
      ? getStructureGraphKey(selectedStructure.id, structureGraphMode, focusedStructureNodeId)
      : getRelationGraphKey(graphMode, focusedObjectId),
    [focusedObjectId, focusedStructureNodeId, graphKind, graphMode, selectedStructure],
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
  const selectStructureTarget = useCallback((target: StructureGraphTarget) => {
    setSelectedStructureEdgeId(null)
    setSelectedStructureTarget(target)
  }, [])
  const structureFlow = useMemo(
    () =>
      buildStructureFlow(
        selectedStructure,
        structureAssignments,
        objects,
        onSelect,
        selectStructureTarget,
        layoutPositions,
        structureGraphMode,
        focusedStructureNodeId,
        ui,
      ),
    [
      focusedStructureNodeId,
      layoutPositions,
      objects,
      onSelect,
      selectStructureTarget,
      selectedStructure,
      structureGraphMode,
      structureAssignments,
      ui,
    ],
  )
  const activeNodes = graphKind === 'structure' ? structureFlow.nodes : nodes
  const activeEdges = graphKind === 'structure' ? structureFlow.edges : edges
  const routedEdges = useMemo(
    () => (graphKind === 'structure' ? applyParallelEdgeRouting(activeEdges, activeNodes) : activeEdges),
    [activeEdges, activeNodes, graphKind],
  )
  const activeGraph = graphKind === 'structure' ? structureFlow.graph : visibleGraph
  const [flowNodes, setFlowNodes] = useState<RelationsFlowNode[]>(activeNodes)
  const lastRequestedGraphKeyRef = useRef<string | null>(null)
  const relationTypes = Array.from(new Set(visibleGraph.edges.map((edge) => getRelationLabel(edge.relationType, ui)))).sort()
  const focusOptions = [...graph.nodes].sort((left, right) => left.name.localeCompare(right.name))
  const structureFocusOptions = structureFlow.allGraph.nodes.toSorted((left, right) => left.name.localeCompare(right.name))
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
    if (lastRequestedGraphKeyRef.current === graphKey) {
      return
    }

    lastRequestedGraphKeyRef.current = graphKey
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
    setSelectedStructureTarget(null)
    setSelectedStructureEdgeId(null)
  }, [graphKind, selectedStructure?.id])

  useEffect(() => {
    if (focusedStructureNodeId !== null && !structureFlow.allGraph.nodes.some((node) => node.id === focusedStructureNodeId)) {
      setFocusedStructureNodeId(null)
    }
  }, [focusedStructureNodeId, structureFlow.allGraph.nodes])

  const canRenderStructureTargetDetail =
    graphKind === 'structure' && selectedStructure !== null && selectedStructureTarget !== null
  const selectedStructureEdge =
    graphKind === 'structure' && selectedStructureEdgeId !== null
      ? structureFlow.allGraph.edges.find((edge) => edge.id === selectedStructureEdgeId) ?? null
      : null
  const canRenderStructureEdgeDetail =
    graphKind === 'structure' && selectedStructure !== null && selectedStructureEdge !== null
  const renderStructureTargetDetail = (withClose: boolean) =>
    canRenderStructureTargetDetail ? (
      <StructureGraphTargetDetail
        assignments={structureAssignments}
        objects={objects}
        structure={selectedStructure}
        target={selectedStructureTarget}
        ui={ui}
        onClose={withClose ? () => setSelectedStructureTarget(null) : undefined}
      />
    ) : null
  const renderStructureEdgeDetail = (withClose: boolean) =>
    canRenderStructureEdgeDetail ? (
      <StructureGraphEdgeDetail
        edge={selectedStructureEdge}
        nodes={structureFlow.allGraph.nodes}
        structure={selectedStructure}
        ui={ui}
        onClose={withClose ? () => setSelectedStructureEdgeId(null) : undefined}
      />
    ) : null

  if (detailMode === 'page' && canRenderStructureTargetDetail) {
    return (
      <div className="sp-object-page">
        <div className="sp-content-head">
          <div>
            <h2>{ui.structureNodeDossier}</h2>
            <p>{ui.structureGraphHelp}</p>
          </div>
          <button
            className="sp-icon-button sp-page-back-button"
            type="button"
            aria-label={ui.returnToGraph}
            title={ui.returnToGraph}
            onClick={() => setSelectedStructureTarget(null)}
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        </div>
        {renderStructureTargetDetail(false)}
      </div>
    )
  }

  if (detailMode === 'page' && canRenderStructureEdgeDetail) {
    return (
      <div className="sp-object-page">
        <div className="sp-content-head">
          <div>
            <h2>{getRelationLabel(selectedStructureEdge.relationType, ui)}</h2>
            <p>{ui.structureGraphHelp}</p>
          </div>
          <button
            className="sp-icon-button sp-page-back-button"
            type="button"
            aria-label={ui.returnToGraph}
            title={ui.returnToGraph}
            onClick={() => setSelectedStructureEdgeId(null)}
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        </div>
        {renderStructureEdgeDetail(false)}
      </div>
    )
  }

  return (
    <div className="sp-relations-page">
      <RelationsPageControls
        activeGraph={activeGraph}
        focusOptions={focusOptions}
        focusedObjectId={focusedObjectId}
        focusedStructureNodeId={focusedStructureNodeId}
        graphKind={graphKind}
        graphKey={graphKey}
        graphMode={graphMode}
        isLayoutGenerating={isLayoutGenerating}
        layoutButtonLabel={layoutButtonLabel}
        layoutStatus={layoutStatus}
        objects={objects}
        selectedStructure={selectedStructure}
        structureFocusOptions={structureFocusOptions}
        structures={structures}
        ui={ui}
        visibleGraph={visibleGraph}
        onCreateRelation={onCreateRelation}
        onFocusedObjectIdChange={setFocusedObjectId}
        onFocusedStructureNodeIdChange={setFocusedStructureNodeId}
        onGenerateLayout={onGenerateLayout}
        onGraphKindChange={setGraphKind}
        onGraphModeChange={setGraphMode}
        onSelectedStructureIdChange={setSelectedStructureId}
      />
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
              edgeTypes={relationEdgeTypes}
              edges={routedEdges}
              fitView
              maxZoom={1.6}
              minZoom={0.2}
              nodes={flowNodes}
              nodeTypes={relationNodeTypes}
              onEdgeClick={(_, edge) => {
                if (graphKind === 'relations') {
                  onSelectEdge(edge.id)
                } else {
                  setSelectedStructureTarget(null)
                  setSelectedStructureEdgeId(edge.id)
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
        {detailMode === 'panel' && canRenderStructureTargetDetail && (
          <aside className="sp-detail sp-structure-graph-detail">
            {renderStructureTargetDetail(true)}
          </aside>
        )}
        {detailMode === 'panel' && canRenderStructureEdgeDetail && (
          <aside className="sp-detail sp-structure-graph-detail">
            {renderStructureEdgeDetail(true)}
          </aside>
        )}
      </div>
      {detailMode === 'modal' && canRenderStructureTargetDetail && (
        <PreviewDialog title={ui.structureNodeDossier} onClose={() => setSelectedStructureTarget(null)}>
          {renderStructureTargetDetail(false)}
        </PreviewDialog>
      )}
      {detailMode === 'modal' && canRenderStructureEdgeDetail && (
        <PreviewDialog title={ui.relations} onClose={() => setSelectedStructureEdgeId(null)}>
          {renderStructureEdgeDetail(false)}
        </PreviewDialog>
      )}
    </div>
  )
}


