import { getRelationCategoryLabel } from '../../style-preview/domain/relationDisplay'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { RelationGraph, StoryObject, Structure } from '../../types'
import {
  relationGraphCategories,
  type RelationGraphMode,
} from './RelationGraphFlow'

export type RelationPageGraphKind = 'relations' | 'structure'

type RelationsPageControlsProps = {
  activeGraph: RelationGraph
  focusOptions: RelationGraph['nodes']
  focusedObjectId: number | null
  focusedStructureNodeId: number | null
  graphKind: RelationPageGraphKind
  graphKey: string
  graphMode: RelationGraphMode
  isLayoutGenerating: boolean
  layoutButtonLabel: string
  layoutStatus: string
  objects: StoryObject[]
  selectedStructure: Structure | null
  structureFocusOptions: RelationGraph['nodes']
  structures: Structure[]
  ui: PreviewText
  visibleGraph: RelationGraph
  onCreateRelation: () => void
  onFocusedObjectIdChange: (objectId: number | null) => void
  onFocusedStructureNodeIdChange: (nodeId: number | null) => void
  onGenerateLayout: (graphKey: string, graph: RelationGraph) => void
  onGraphKindChange: (kind: RelationPageGraphKind) => void
  onGraphModeChange: (mode: RelationGraphMode) => void
  onSelectedStructureIdChange: (structureId: number | null) => void
}

export function RelationsPageControls({
  activeGraph,
  focusOptions,
  focusedObjectId,
  focusedStructureNodeId,
  graphKind,
  graphKey,
  graphMode,
  isLayoutGenerating,
  layoutButtonLabel,
  layoutStatus,
  objects,
  selectedStructure,
  structureFocusOptions,
  structures,
  ui,
  visibleGraph,
  onCreateRelation,
  onFocusedObjectIdChange,
  onFocusedStructureNodeIdChange,
  onGenerateLayout,
  onGraphKindChange,
  onGraphModeChange,
  onSelectedStructureIdChange,
}: RelationsPageControlsProps) {
  const graphModeOptions: Array<{ label: string; value: RelationGraphMode }> = [
    { label: ui.graphModeAll, value: 'all' },
    ...relationGraphCategories.map((category) => ({
      label: getRelationCategoryLabel(category, ui),
      value: category,
    })),
  ]
  const graphSummary = graphKind === 'structure'
    ? `${activeGraph.nodes.length} ${ui.structureNodesCount} · ${activeGraph.edges.length} ${ui.relationsCount} · ${layoutStatus}`
    : `${visibleGraph.nodes.length} ${ui.objectsCount} · ${visibleGraph.edges.length} ${ui.relationsCount} · ${layoutStatus}`

  return (
    <div className="sp-relations-overlay-head">
      <div>
        <h2>{ui.relations}</h2>
        <p>{graphSummary}</p>
      </div>
      <div className="sp-relations-overlay-actions">
        <label className="sp-graph-control">
          <span>{ui.graphMode}</span>
          <select value={graphKind} onChange={(event) => onGraphKindChange(event.target.value as RelationPageGraphKind)}>
            <option value="relations">{ui.graphModeRelations}</option>
            <option value="structure">{ui.graphModeStructureDevice}</option>
          </select>
        </label>
        {graphKind === 'relations' && (
          <>
            <label className="sp-graph-control">
              <span>{ui.filteredGraphView}</span>
              <select value={graphMode} onChange={(event) => onGraphModeChange(event.target.value as RelationGraphMode)}>
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
                  onFocusedObjectIdChange(event.target.value.trim().length === 0 ? null : Number(event.target.value))
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
                  onSelectedStructureIdChange(event.target.value.trim().length === 0 ? null : Number(event.target.value))
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
              <span>{ui.graphFocus}</span>
              <select
                value={focusedStructureNodeId ?? ''}
                onChange={(event) =>
                  onFocusedStructureNodeIdChange(
                    event.target.value.trim().length === 0 ? null : Number(event.target.value),
                  )
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
  )
}
