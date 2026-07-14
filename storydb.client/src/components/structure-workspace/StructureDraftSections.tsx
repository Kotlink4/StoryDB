import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { StructureEdgeDraft, StructureNodeDraft } from '../../types'

const getFirstDifferentNodeClientId = (nodes: StructureNodeDraft[], clientId: string) =>
  nodes.find((node) => node.clientId !== clientId)?.clientId ?? ''
export function StructureNodeDraftList({
  nodes,
  ui,
  assignmentCountsByNodeId,
  onNodeChange,
  onNodeDetailsSave,
  onNodeRemove,
  isNodeDetailsSaving = false,
  isTopologyLocked = false,
}: {
  nodes: StructureNodeDraft[]
  ui: PreviewText
  assignmentCountsByNodeId?: Map<number, number>
  onNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onNodeDetailsSave?: (clientId: string) => void
  onNodeRemove: (clientId: string) => void
  isNodeDetailsSaving?: boolean
  isTopologyLocked?: boolean
}) {
  const childCountsByNodeClientId = new Map<string, number>()
  nodes.forEach((node) => {
    if (node.parentClientId === null) {
      return
    }

    childCountsByNodeClientId.set(
      node.parentClientId,
      (childCountsByNodeClientId.get(node.parentClientId) ?? 0) + 1,
    )
  })

  return (
    <div className="sp-structure-node-list">
      {nodes.map((node) => {
        const assignmentCount = /^\d+$/.test(node.clientId)
          ? assignmentCountsByNodeId?.get(Number(node.clientId)) ?? 0
          : 0
        const childCount = childCountsByNodeClientId.get(node.clientId) ?? 0
        const isNodeLocked = isTopologyLocked || assignmentCount > 0 || childCount > 0

        return (
          <article className={`sp-structure-node-row${isNodeLocked ? ' locked' : ''}`} key={node.clientId}>
            <label>
              {ui.name}
              <input
                disabled={isNodeLocked}
                value={node.name}
                onChange={(event) => onNodeChange(node.clientId, { name: event.target.value })}
              />
            </label>
            <label>
              {ui.description}
              <input
                disabled={isNodeLocked}
                value={node.description}
                onChange={(event) => onNodeChange(node.clientId, { description: event.target.value })}
              />
            </label>
            <label>
              {ui.structureParentNode}
              <select
                disabled={isNodeLocked}
                value={node.parentClientId ?? ''}
                onChange={(event) =>
                  onNodeChange(node.clientId, {
                    parentClientId: event.target.value === '' ? null : event.target.value,
                  })
                }
              >
                <option value="">{ui.noGroup}</option>
                {nodes
                  .filter((parentNode) => parentNode.clientId !== node.clientId)
                  .map((parentNode) => (
                    <option key={parentNode.clientId} value={parentNode.clientId}>
                      {parentNode.name || ui.structureNode}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {ui.structureNodeType}
              <input
                disabled={isNodeLocked}
                value={node.nodeType}
                onChange={(event) => onNodeChange(node.clientId, { nodeType: event.target.value })}
              />
            </label>
            <label>
              {ui.structureLevelIndex}
              <input
                disabled={isNodeLocked}
                min="0"
                type="number"
                value={node.levelIndex}
                onChange={(event) =>
                  onNodeChange(node.clientId, {
                    levelIndex: Math.max(0, Number(event.target.value) || 0),
                  })
                }
              />
            </label>
            <label>
              {ui.structureSortOrder}
              <input
                disabled={isNodeLocked}
                min="0"
                type="number"
                value={node.sortOrder}
                onChange={(event) =>
                  onNodeChange(node.clientId, {
                    sortOrder: Math.max(0, Number(event.target.value) || 0),
                  })
                }
              />
            </label>
            <div className="sp-tags">
              <span>
                {ui.structureAssignmentCount}: {assignmentCount}
              </span>
              <span>
                {ui.structureChildNodes}: {childCount}
              </span>
            </div>
            <div className="sp-structure-node-actions">
              {onNodeDetailsSave !== undefined && /^\d+$/.test(node.clientId) && (
                <button
                  className="sp-button"
                  disabled={isNodeLocked || isNodeDetailsSaving || node.name.trim().length === 0}
                  type="button"
                  onClick={() => onNodeDetailsSave(node.clientId)}
                >
                  {ui.structureNodeDetailsSave}
                </button>
              )}
              <button
                className="sp-button danger"
                disabled={isNodeLocked}
                type="button"
                onClick={() => onNodeRemove(node.clientId)}
              >
                {ui.delete}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function StructureEdgeDraftSection({
  edges,
  nodes,
  ui,
  onEdgeAdd,
  onEdgeChange,
  onEdgeRemove,
  isTopologyLocked = false,
}: {
  edges: StructureEdgeDraft[]
  nodes: StructureNodeDraft[]
  ui: PreviewText
  onEdgeAdd: () => void
  onEdgeChange: (edgeIndex: number, patch: Partial<StructureEdgeDraft>) => void
  onEdgeRemove: (edgeIndex: number) => void
  isTopologyLocked?: boolean
}) {
  const canCreateEdge = nodes.length > 1 && !isTopologyLocked
  const getNodeName = (clientId: string) =>
    nodes.find((node) => node.clientId === clientId)?.name.trim() || ui.structureNode

  return (
    <section className="sp-structure-edges">
      <div className="sp-structure-nodes-head">
        <div>
          <h3>{ui.structureEdges}</h3>
        </div>
        <button className="sp-button" disabled={!canCreateEdge} type="button" onClick={onEdgeAdd}>
          {ui.structureAddEdge}
        </button>
      </div>

      {edges.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noStructureEdges}</strong>
          {!canCreateEdge && <span>{ui.structureEdgesNeedNodes}</span>}
        </div>
      ) : (
        <div className="sp-structure-edge-list">
          {edges.map((edge, edgeIndex) => (
            <article className="sp-structure-edge-row" key={`${edge.sourceClientId}-${edge.targetClientId}-${edgeIndex}`}>
              <label>
                {ui.structureEdgeSource}
                <select
                  disabled={isTopologyLocked}
                  value={edge.sourceClientId}
                  onChange={(event) => {
                    const sourceClientId = event.target.value
                    onEdgeChange(edgeIndex, {
                      sourceClientId,
                      targetClientId:
                        edge.targetClientId === sourceClientId
                          ? getFirstDifferentNodeClientId(nodes, sourceClientId)
                          : edge.targetClientId,
                    })
                  }}
                >
                  {nodes.map((node) => (
                    <option key={node.clientId} value={node.clientId}>
                      {node.name.trim() || ui.structureNode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {ui.structureEdgeTarget}
                <select
                  disabled={isTopologyLocked}
                  value={edge.targetClientId}
                  onChange={(event) => onEdgeChange(edgeIndex, { targetClientId: event.target.value })}
                >
                  {nodes
                    .filter((node) => node.clientId !== edge.sourceClientId)
                    .map((node) => (
                      <option key={node.clientId} value={node.clientId}>
                        {node.name.trim() || ui.structureNode}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {ui.relationType}
                <input
                  disabled={isTopologyLocked}
                  value={edge.relationType}
                  placeholder={ui.structureEdgeTypePlaceholder}
                  onChange={(event) => onEdgeChange(edgeIndex, { relationType: event.target.value })}
                />
              </label>
              <label>
                {ui.description}
                <input
                  disabled={isTopologyLocked}
                  value={edge.description}
                  onChange={(event) => onEdgeChange(edgeIndex, { description: event.target.value })}
                />
              </label>
              <label>
                {ui.structureSortOrder}
                <input
                  disabled={isTopologyLocked}
                  min="0"
                  type="number"
                  value={edge.sortOrder}
                  onChange={(event) =>
                    onEdgeChange(edgeIndex, {
                      sortOrder: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </label>
              <div className="sp-structure-edge-preview">
                <span>{getNodeName(edge.sourceClientId)}</span>
                <strong>{edge.relationType.trim() || ui.structureEdgeDefaultType}</strong>
                <span>{getNodeName(edge.targetClientId)}</span>
              </div>
              <div className="sp-structure-node-actions">
                <button
                  className="sp-button danger"
                  disabled={isTopologyLocked}
                  type="button"
                  onClick={() => onEdgeRemove(edgeIndex)}
                >
                  {ui.delete}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

