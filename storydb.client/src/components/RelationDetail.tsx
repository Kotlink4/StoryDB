import { getObjectFullName, relationGraphNodeToStoryObject } from '../objectDisplay'
import { getRelationCategoryLabel, getRelationLabel } from '../relationDisplay'
import type { PreviewText } from '../stylePreviewI18n'
import type { RelationGraph, RelationGraphEdge, StoryObject } from '../types'
import { ObjectPortrait } from './StylePreviewPrimitives'

const getRelationEndpointObject = (
  edge: RelationGraphEdge,
  graph: RelationGraph,
  objects: StoryObject[],
  endpoint: 'source' | 'target',
) => {
  const targetId = endpoint === 'source' ? edge.sourceId : edge.targetId
  const storyObject = objects.find((item) => item.id === targetId)

  if (storyObject !== undefined) {
    return storyObject
  }

  const graphNode = graph.nodes.find((node) => node.id === targetId)

  return graphNode === undefined ? null : relationGraphNodeToStoryObject(graphNode)
}

function RelationEndpointButton({
  storyObject,
  ui,
  onOpen,
}: {
  storyObject: StoryObject | null
  ui: PreviewText
  onOpen: (storyObject: StoryObject) => void
}) {
  if (storyObject === null) {
    return <span className="sp-relation-endpoint missing">{ui.objectUnknown}</span>
  }

  return (
    <button className="sp-relation-endpoint" type="button" onClick={() => onOpen(storyObject)}>
      <ObjectPortrait storyObject={storyObject} />
      <span>
        <strong>{getObjectFullName(storyObject)}</strong>
        <em>{storyObject.typeKey}</em>
      </span>
    </button>
  )
}

function RelationMeter({ label, value }: { label: string; value: number | null }) {
  const normalizedValue = Math.max(0, Math.min(100, value ?? 0))

  return (
    <div className="sp-relation-meter">
      <span>{label}</span>
      <div>
        <i style={{ width: `${normalizedValue}%` }} />
      </div>
      <strong>{value === null ? '-' : `${normalizedValue}%`}</strong>
    </div>
  )
}

export function RelationDetail({
  edge,
  graph,
  objects,
  ui,
  onClose,
  onOpenObject,
}: {
  edge: RelationGraphEdge
  graph: RelationGraph
  objects: StoryObject[]
  ui: PreviewText
  onClose?: () => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  const sourceObject = getRelationEndpointObject(edge, graph, objects, 'source')
  const targetObject = getRelationEndpointObject(edge, graph, objects, 'target')
  const directionLabel = edge.isBidirectional ? ui.relationBidirectional : ui.relationOneWay
  const categoryLabel = getRelationCategoryLabel(edge.category, ui)

  return (
    <div className="sp-detail-card sp-relation-detail">
      <div className="sp-relation-detail-head">
        <div>
          <span>{categoryLabel}</span>
          <h2>{getRelationLabel(edge.relationType, ui)}</h2>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="sp-relation-route">
        <RelationEndpointButton storyObject={sourceObject} ui={ui} onOpen={onOpenObject} />
        <strong>{edge.isBidirectional ? '↔' : '→'}</strong>
        <RelationEndpointButton storyObject={targetObject} ui={ui} onOpen={onOpenObject} />
      </div>

      <div className="sp-fields">
        <div>
          <span>{ui.objectType}</span>
          <strong>{getRelationLabel(edge.relationType, ui)}</strong>
        </div>
        <div>
          <span>{ui.relationDirection}</span>
          <strong>{directionLabel}</strong>
        </div>
        <div>
          <span>{ui.catalog}</span>
          <strong>{categoryLabel}</strong>
        </div>
      </div>

      <section className="sp-panel">
        <h3>{ui.relationParameters}</h3>
        <RelationMeter label={ui.relationStrength} value={edge.strength} />
        <RelationMeter label={ui.relationTension} value={edge.tension} />
      </section>

      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>{edge.description?.trim() || ui.unknownDescription}</p>
      </section>
    </div>
  )
}
