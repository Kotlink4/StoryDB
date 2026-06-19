import { getObjectFullName } from '../../style-preview/domain/objectDisplay'
import { getRelationCategoryLabel, getRelationLabel } from '../../style-preview/domain/relationDisplay'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { RelationGraph, StoryObject, Structure, StructureAssignment } from '../../types'
import type { StructureGraphTarget } from './RelationFlowTypes'

export function StructureGraphTargetDetail({
  assignments,
  objects,
  structure,
  target,
  ui,
  onClose,
}: {
  assignments: StructureAssignment[]
  objects: StoryObject[]
  structure: Structure
  target: StructureGraphTarget
  ui: PreviewText
  onClose?: () => void
}) {
  const objectsById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const title = structure.nodes.find((node) => node.id === target.id)?.name ?? ui.structureNode
  const description = structure.nodes.find((node) => node.id === target.id)?.description ?? null
  const nodeAssignments = assignments.filter((assignment) => assignment.structureNodeId === target.id)

  return (
    <section className="sp-detail-card sp-structure-target-dossier">
      <div className="sp-detail-card-head">
        <div>
          <span>{ui.structureNodeDossier}</span>
          <h2>{title}</h2>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose} aria-label={ui.close}>
            x
          </button>
        )}
      </div>
      <div className="sp-detail-grid">
        <div className="sp-detail-field">
          <span>{ui.structure}</span>
          <strong>{structure.name}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.objectType}</span>
          <strong>{ui.structureNode}</strong>
        </div>
      </div>
      <section>
        <h3>{ui.description}</h3>
        <p>{description?.trim() || ui.noDescription}</p>
      </section>
      {nodeAssignments.length > 0 && (
        <section>
          <h3>{ui.structureNodeMembers}</h3>
          <div className="sp-structure-assignment-list">
            {nodeAssignments.map((assignment) => {
              const storyObject =
                assignment.targetKind === 'storyObject' && assignment.storyObjectId !== null
                  ? objectsById.get(assignment.storyObjectId)
                  : undefined
              return (
                <div className="sp-row" key={assignment.id}>
                  <div>
                    <strong>{storyObject === undefined ? assignment.targetName : getObjectFullName(storyObject)}</strong>
                    <span>{assignment.roleLabel || assignment.targetTypeKey}</span>
                  </div>
                  <span>{assignment.notes || assignment.structureNodeName}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}

export function StructureGraphEdgeDetail({
  edge,
  nodes,
  structure,
  ui,
  onClose,
}: {
  edge: RelationGraph['edges'][number]
  nodes: RelationGraph['nodes']
  structure: Structure
  ui: PreviewText
  onClose?: () => void
}) {
  const sourceNode = nodes.find((node) => node.id === edge.sourceId)
  const targetNode = nodes.find((node) => node.id === edge.targetId)

  return (
    <section className="sp-detail-card sp-structure-target-dossier">
      <div className="sp-detail-card-head">
        <div>
          <span>{ui.relations}</span>
          <h2>{getRelationLabel(edge.relationType, ui)}</h2>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose} aria-label={ui.close}>
            x
          </button>
        )}
      </div>
      <div className="sp-detail-grid">
        <div className="sp-detail-field">
          <span>{ui.structure}</span>
          <strong>{structure.name}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.relationDirection}</span>
          <strong>{edge.isBidirectional ? ui.relationBidirectional : `${sourceNode?.name ?? edge.sourceId} -> ${targetNode?.name ?? edge.targetId}`}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureEdgeSource}</span>
          <strong>{sourceNode?.name ?? edge.sourceId}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureEdgeTarget}</span>
          <strong>{targetNode?.name ?? edge.targetId}</strong>
        </div>
      </div>
      <section>
        <h3>{ui.description}</h3>
        <p>{edge.description?.trim() || ui.noDescription}</p>
      </section>
      <section>
        <h3>{ui.objectType}</h3>
        <div className="sp-tags">
          <span>{getRelationCategoryLabel(edge.category, ui)}</span>
          <span>{edge.id}</span>
        </div>
      </section>
    </section>
  )
}
