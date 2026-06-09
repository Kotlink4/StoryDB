import type { FormEvent } from 'react'
import type { HierarchyGroup, HierarchyNode } from '../types'

type HierarchyPanelProps = {
  activeGroup: HierarchyGroup | null
  editingNodeId: number | null
  nodeDescription: string
  nodeName: string
  nodeParentIds: number[]
  nodes: HierarchyNode[]
  t: Record<string, string>
  onCreateGroup: () => void
  onDeleteGroup: (group: HierarchyGroup) => void
  onDeleteNode: (node: HierarchyNode) => void
  onEditNode: (node: HierarchyNode) => void
  onGroupNameChange: (group: HierarchyGroup, name: string) => void
  onNodeDescriptionChange: (value: string) => void
  onNodeNameChange: (value: string) => void
  onResetNodeDraft: () => void
  onSaveNode: (event: FormEvent) => void
  onToggleParent: (nodeId: number) => void
}

export function HierarchyPanel({
  activeGroup,
  editingNodeId,
  nodeDescription,
  nodeName,
  nodeParentIds,
  nodes,
  t,
  onCreateGroup,
  onDeleteGroup,
  onDeleteNode,
  onEditNode,
  onGroupNameChange,
  onNodeDescriptionChange,
  onNodeNameChange,
  onResetNodeDraft,
  onSaveNode,
  onToggleParent,
}: HierarchyPanelProps) {
  return (
    <section className="hierarchy-panel">
      <header className="hierarchy-panel-header">
        <div>
          <p className="setting-label">{t.hierarchy}</p>
          <h2>{activeGroup?.name ?? t.noHierarchyGroups}</h2>
        </div>
        <button className="primary-action compact" type="button" onClick={onCreateGroup}>
          + {t.createAttributeGroup}
        </button>
      </header>

      {activeGroup === null ? (
        <section className="empty-state compact" aria-live="polite">
          <h2>{t.noHierarchyGroups}</h2>
          <p>{t.hierarchyPlaceholder}</p>
        </section>
      ) : (
        <>
          <section className="hierarchy-group-editor">
            <label className="project-name-field">
              <span>{t.attributeGroup}</span>
              <input
                key={activeGroup.id}
                type="text"
                defaultValue={activeGroup.name}
                onBlur={(event) => onGroupNameChange(activeGroup, event.target.value)}
              />
            </label>
            <button
              className="secondary-action compact danger-action"
              type="button"
              onClick={() => onDeleteGroup(activeGroup)}
            >
              {t.delete}
            </button>
          </section>

          <form className="hierarchy-node-form" onSubmit={onSaveNode}>
            <label className="project-name-field">
              <span>{t.hierarchyNodeName}</span>
              <input
                type="text"
                value={nodeName}
                onChange={(event) => onNodeNameChange(event.target.value)}
                placeholder={t.hierarchyNodeName}
              />
            </label>
            <label className="project-name-field hierarchy-node-description">
              <span>{t.description}</span>
              <textarea
                value={nodeDescription}
                onChange={(event) => onNodeDescriptionChange(event.target.value)}
                placeholder={t.descriptionPlaceholder}
              />
            </label>
            <fieldset className="hierarchy-parent-picker">
              <legend>{t.hierarchyParents}</legend>
              {nodes
                .filter((node) => node.id !== editingNodeId)
                .map((node) => (
                  <label key={node.id}>
                    <input
                      type="checkbox"
                      checked={nodeParentIds.includes(node.id)}
                      onChange={() => onToggleParent(node.id)}
                    />
                    <span>{node.name}</span>
                  </label>
                ))}
              {nodes.length === 0 && <p>{t.noHierarchyNodes}</p>}
            </fieldset>
            <div className="hierarchy-node-actions">
              {editingNodeId !== null && (
                <button className="secondary-action compact" type="button" onClick={onResetNodeDraft}>
                  {t.cancel}
                </button>
              )}
              <button className="primary-action compact" type="submit">
                {editingNodeId === null ? t.addAttribute : t.save}
              </button>
            </div>
          </form>

          <section className="hierarchy-node-list" aria-label={t.hierarchyNodes}>
            {nodes.map((node) => {
              const parentNames = node.parentNodeIds
                .map((parentId) => nodes.find((parent) => parent.id === parentId)?.name)
                .filter(Boolean)
                .join(', ')
              const childNames = node.childNodeIds
                .map((childId) => nodes.find((child) => child.id === childId)?.name)
                .filter(Boolean)
                .join(', ')

              return (
                <article className="hierarchy-node-card" key={node.id}>
                  <div>
                    <h3>{node.name}</h3>
                    {node.description !== null && <p>{node.description}</p>}
                    <dl>
                      <div>
                        <dt>{t.hierarchyParents}</dt>
                        <dd>{parentNames || '-'}</dd>
                      </div>
                      <div>
                        <dt>{t.hierarchyNodes}</dt>
                        <dd>{childNames || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="table-actions">
                    <button type="button" onClick={() => onEditNode(node)}>
                      {t.edit}
                    </button>
                    <button type="button" onClick={() => onDeleteNode(node)}>
                      {t.delete}
                    </button>
                  </div>
                </article>
              )
            })}
            {nodes.length === 0 && (
              <section className="empty-state compact" aria-live="polite">
                <h2>{t.noHierarchyNodes}</h2>
              </section>
            )}
          </section>
        </>
      )}
    </section>
  )
}
