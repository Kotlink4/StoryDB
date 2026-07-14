import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { StructureAssignment, StructureDraft, StructureEdgeDraft, StructureNodeDraft } from '../../types'
export function StructureEdgeDossier({
  draft,
  edge,
  showCloseButton = true,
  ui,
  onClose,
}: {
  draft: StructureDraft
  edge: StructureEdgeDraft
  showCloseButton?: boolean
  ui: PreviewText
  onClose: () => void
}) {
  const sourceNode = draft.nodes.find((node) => node.clientId === edge.sourceClientId) ?? null
  const targetNode = draft.nodes.find((node) => node.clientId === edge.targetClientId) ?? null

  return (
    <section className="sp-detail-card sp-structure-edge-dossier">
      <div className="sp-detail-card-head">
        <div>
          <span>{ui.structureEdges}</span>
          <h2>{edge.relationType.trim() || ui.structureEdgeDefaultType}</h2>
        </div>
        {showCloseButton && (
          <button className="sp-icon-button" type="button" aria-label={ui.close} title={ui.close} onClick={onClose}>
            x
          </button>
        )}
      </div>
      <section>
        <h3>{ui.description}</h3>
        <p>{edge.description.trim() || ui.noDescription}</p>
      </section>
      <div className="sp-detail-grid">
        <div className="sp-detail-field">
          <span>{ui.structureEdgeSource}</span>
          <strong>{sourceNode?.name.trim() || ui.structureNode}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureEdgeTarget}</span>
          <strong>{targetNode?.name.trim() || ui.structureNode}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureSortOrder}</span>
          <strong>{edge.sortOrder + 1}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.objectType}</span>
          <strong>{ui.relations}</strong>
        </div>
      </div>
      <section>
        <h3>{ui.structurePreview}</h3>
        <div className="sp-structure-route-preview">
          <div className="sp-structure-route active">
            <span>{sourceNode?.name.trim() || ui.structureNode}</span>
            <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
            <span>{targetNode?.name.trim() || ui.structureNode}</span>
          </div>
        </div>
      </section>
    </section>
  )
}

export function StructureNodeDossier({
  assignmentsByNodeId,
  draft,
  node,
  showCloseButton = true,
  ui,
  onOpenEdge,
  onClose,
}: {
  assignmentsByNodeId?: Map<number, StructureAssignment[]>
  draft: StructureDraft
  node: StructureNodeDraft
  showCloseButton?: boolean
  ui: PreviewText
  onOpenEdge: (edge: StructureEdgeDraft) => void
  onClose: () => void
}) {
  const parentNode =
    node.parentClientId === null ? null : draft.nodes.find((currentNode) => currentNode.clientId === node.parentClientId) ?? null
  const childNodes = draft.nodes
    .filter((currentNode) => currentNode.parentClientId === node.clientId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
  const incomingEdges = draft.edges.filter((edge) => edge.targetClientId === node.clientId)
  const outgoingEdges = draft.edges.filter((edge) => edge.sourceClientId === node.clientId)
  const assignments = /^\d+$/.test(node.clientId)
    ? assignmentsByNodeId?.get(Number(node.clientId)) ?? []
    : []

  return (
    <section className="sp-detail-card sp-structure-node-dossier">
      <div className="sp-detail-card-head">
        <div>
          <span>{ui.structureNodeDossier}</span>
          <h2>{node.name.trim() || ui.structureNode}</h2>
        </div>
        {showCloseButton && (
          <button className="sp-icon-button" type="button" aria-label={ui.close} title={ui.close} onClick={onClose}>
            x
          </button>
        )}
      </div>
      <section>
        <h3>{ui.description}</h3>
        <p>{node.description.trim() || ui.noDescription}</p>
      </section>
      <div className="sp-detail-grid">
        <div className="sp-detail-field">
          <span>{ui.structureNodeType}</span>
          <strong>{node.nodeType.trim() || '-'}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureLevelIndex}</span>
          <strong>{node.levelIndex + 1}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureParentNode}</span>
          <strong>{parentNode?.name.trim() || '-'}</strong>
        </div>
        <div className="sp-detail-field">
          <span>{ui.structureAssignmentCount}</span>
          <strong>{assignments.length}</strong>
        </div>
      </div>
      {childNodes.length > 0 && (
        <section>
          <h3>{ui.relations}</h3>
          <div className="sp-tags">
            {childNodes.map((childNode) => (
              <span key={childNode.clientId}>{childNode.name.trim() || ui.structureNode}</span>
            ))}
          </div>
        </section>
      )}
      {(incomingEdges.length > 0 || outgoingEdges.length > 0) && (
        <section>
          <h3>{ui.structureEdges}</h3>
          <div className="sp-structure-route-preview">
            {[...incomingEdges, ...outgoingEdges].map((edge, index) => (
              <button
                className="sp-structure-route"
                key={`${edge.sourceClientId}-${edge.targetClientId}-${index}`}
                type="button"
                onClick={() => onOpenEdge(edge)}
              >
                <span>{draft.nodes.find((currentNode) => currentNode.clientId === edge.sourceClientId)?.name || ui.structureNode}</span>
                <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
                <span>{draft.nodes.find((currentNode) => currentNode.clientId === edge.targetClientId)?.name || ui.structureNode}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {assignments.length > 0 && (
        <section>
          <h3>{ui.structureNodeMembers}</h3>
          <div className="sp-structure-assignment-list">
            {assignments.map((assignment) => (
              <div className="sp-row" key={assignment.id}>
                <div>
                  <strong>{assignment.targetName}</strong>
                  <span>{assignment.roleLabel || assignment.targetTypeKey}</span>
                </div>
                <span>{assignment.notes || assignment.structureName}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

export function StructureMapPreview({
  draft,
  ui,
  selectedNodeClientId = null,
  onSelectedNodeClientIdChange = () => {},
}: {
  draft: StructureDraft
  ui: PreviewText
  selectedNodeClientId?: string | null
  onSelectedNodeClientIdChange?: (clientId: string | null) => void
}) {
  const nodes = draft.nodes
  const validNodeIds = new Set(nodes.map((node) => node.clientId))
  const validEdges = draft.edges.filter(
    (edge) =>
      validNodeIds.has(edge.sourceClientId) &&
      validNodeIds.has(edge.targetClientId) &&
      edge.sourceClientId !== edge.targetClientId,
  )
  const focusedEdges =
    selectedNodeClientId === null
      ? validEdges
      : validEdges.filter(
          (edge) => edge.sourceClientId === selectedNodeClientId || edge.targetClientId === selectedNodeClientId,
        )
  const focusedNodeIds = new Set<string>(
    selectedNodeClientId === null
      ? nodes.map((node) => node.clientId)
      : [
          selectedNodeClientId,
          ...focusedEdges.flatMap((edge) => [edge.sourceClientId, edge.targetClientId]),
        ],
  )
  const levelIndexes = Array.from(new Set(nodes.map((node) => node.levelIndex))).sort((left, right) => left - right)
  const getNodeName = (clientId: string) =>
    nodes.find((node) => node.clientId === clientId)?.name.trim() || ui.structureNode
  const orderedFocusedEdges = focusedEdges.toSorted(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      getNodeName(left.sourceClientId).localeCompare(getNodeName(right.sourceClientId)) ||
      getNodeName(left.targetClientId).localeCompare(getNodeName(right.targetClientId)),
  )

  return (
    <section className="sp-structure-map-preview">
      <div className="sp-structure-map-head">
        <div>
          <h3>{ui.structurePreview}</h3>
          <p>{ui.structurePreviewHint}</p>
        </div>
        <div className="sp-tags">
          <span>{ui.structureLayoutKind}: {draft.layoutKind}</span>
          <span>{ui.structureNodesCount}: {nodes.length}</span>
          <span>{ui.relationsCount}: {validEdges.length}</span>
        </div>
      </div>

      {selectedNodeClientId !== null && (
        <div className="sp-structure-focus-bar">
          <span>{ui.structureFocusedNode}: {getNodeName(selectedNodeClientId)}</span>
          <button className="sp-button" type="button" onClick={() => onSelectedNodeClientIdChange(null)}>
            {ui.structureFocusReset}
          </button>
        </div>
      )}

      <div className="sp-structure-level-preview">
        {levelIndexes.map((levelIndex) => (
          <section key={levelIndex}>
            <strong>{ui.structureLevelIndex} {levelIndex + 1}</strong>
            <div>
              {nodes
                .filter((node) => node.levelIndex === levelIndex)
                .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
                .map((node) => (
                  <button
                    className={
                      selectedNodeClientId === node.clientId
                        ? 'active'
                        : focusedNodeIds.has(node.clientId)
                          ? ''
                          : 'muted'
                    }
                    key={node.clientId}
                    type="button"
                    onClick={() =>
                      onSelectedNodeClientIdChange(selectedNodeClientId === node.clientId ? null : node.clientId)
                    }
                  >
                    <span>{node.name.trim() || ui.structureNode}</span>
                    {node.nodeType.trim().length > 0 && <small>{node.nodeType}</small>}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>

      {orderedFocusedEdges.length > 0 && (
        <div className="sp-structure-route-preview" aria-label={ui.structureEdges}>
          {orderedFocusedEdges.map((edge, index) => (
            <div
              className={
                selectedNodeClientId !== null &&
                (edge.sourceClientId === selectedNodeClientId || edge.targetClientId === selectedNodeClientId)
                  ? 'sp-structure-route active'
                  : 'sp-structure-route'
              }
              key={`${edge.sourceClientId}-${edge.targetClientId}-${edge.sortOrder}-${index}`}
            >
              <span>{getNodeName(edge.sourceClientId)}</span>
              <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
              <span>{getNodeName(edge.targetClientId)}</span>
            </div>
          ))}
        </div>
      )}

    </section>
  )
}

