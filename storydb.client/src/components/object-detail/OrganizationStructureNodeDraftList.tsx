import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { StructureNodeDraft } from '../../types'

export function OrganizationStructureNodeDraftList({
  nodes,
  ui,
  onNodeChange,
  onNodeRemove,
}: {
  nodes: StructureNodeDraft[]
  ui: PreviewText
  onNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onNodeRemove: (clientId: string) => void
}) {
  return (
    <div className="sp-structure-node-list compact">
      {nodes.map((node) => (
        <article className="sp-structure-node-row compact" key={node.clientId}>
          <label>
            {ui.name}
            <input
              value={node.name}
              onChange={(event) => onNodeChange(node.clientId, { name: event.target.value })}
            />
          </label>
          <label>
            {ui.structureParentNode}
            <select
              value={node.parentClientId ?? ''}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  parentClientId: event.target.value === '' ? null : event.target.value,
                })
              }
            >
              <option value="">{ui.noGroup}</option>
              {nodes
                .filter((parentNode) => parentNode.clientId !== node.clientId && parentNode.name.trim().length > 0)
                .map((parentNode) => (
                  <option key={parentNode.clientId} value={parentNode.clientId}>
                    {parentNode.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ui.structureLevelIndex}
            <input
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
          <div className="sp-structure-node-actions">
            <button
              className="sp-button danger"
              type="button"
              onClick={() => onNodeRemove(node.clientId)}
            >
              {ui.delete}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
