import type {
  Catalog,
  CatalogEntry,
  StructureAssignment,
  StructureDraft,
  StructureUsage,
  StoryProject,
} from '../../types'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'

type StructureObjectsPanelProps = {
  assignmentCatalogEntryId: string
  assignmentNodeId: string
  assignmentRoleLabel: string
  assignmentUsageId: string
  availableCatalogs: Catalog[]
  catalogEntryOptions: Array<{ catalog: Catalog; entry: CatalogEntry }>
  isDetailSaving: boolean
  selectedAssignmentCountsByUsageId: Map<number, number>
  selectedAssignmentsByNodeId: Map<number, StructureAssignment[]>
  selectedDraft: StructureDraft
  selectedProject: StoryProject
  selectedStructureAssignments: StructureAssignment[]
  selectedStructureUsages: StructureUsage[]
  ui: PreviewText
  onAssignmentCatalogEntryIdChange: (entryId: string) => void
  onAssignmentNodeIdChange: (nodeId: string) => void
  onAssignmentRoleLabelChange: (roleLabel: string) => void
  onAssignmentUsageIdChange: (usageId: string) => void
  onCatalogEntryAssign: () => void
}

function getStructureUsageTargetLabel({
  availableCatalogs,
  selectedProject,
  ui,
  usage,
}: {
  availableCatalogs: Catalog[]
  selectedProject: StoryProject
  ui: PreviewText
  usage: StructureUsage
}) {
  if (usage.targetKind === 'project') {
    return selectedProject.name
  }

  if (usage.targetKind === 'catalog') {
    return availableCatalogs.find((catalog) => catalog.id === usage.targetId)?.name ?? ui.structureOwnerCatalog
  }

  return usage.displayName ?? `${ui.structureOwnerObject} #${usage.targetId}`
}

export function StructureObjectsPanel({
  assignmentCatalogEntryId,
  assignmentNodeId,
  assignmentRoleLabel,
  assignmentUsageId,
  availableCatalogs,
  catalogEntryOptions,
  isDetailSaving,
  selectedAssignmentCountsByUsageId,
  selectedAssignmentsByNodeId,
  selectedDraft,
  selectedProject,
  selectedStructureAssignments,
  selectedStructureUsages,
  ui,
  onAssignmentCatalogEntryIdChange,
  onAssignmentNodeIdChange,
  onAssignmentRoleLabelChange,
  onAssignmentUsageIdChange,
  onCatalogEntryAssign,
}: StructureObjectsPanelProps) {
  const getUsageLabel = (usage: StructureUsage) =>
    getStructureUsageTargetLabel({ availableCatalogs, selectedProject, ui, usage })

  return (
    <div className="sp-structure-membership">
      <div className="sp-structure-nodes-head">
        <div>
          <h3>{ui.structurePageObjects}</h3>
        </div>
      </div>
      {selectedStructureUsages.length > 0 && (
        <div className="sp-structure-usage-list">
          {selectedStructureUsages.map((usage) => {
            const assignmentCount = selectedAssignmentCountsByUsageId.get(usage.id) ?? 0

            return (
              <article className="sp-structure-usage-card" key={usage.id}>
                <div>
                  <strong>{getUsageLabel(usage)}</strong>
                  <span>{usage.displayName ?? usage.structureName}</span>
                </div>
                <div className="sp-tags">
                  {usage.isPrimary && <span>{ui.primary}</span>}
                  <span>{usage.targetKind}</span>
                  <span>{ui.structureAssignmentCount}: {assignmentCount}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {selectedDraft.applicationScope === 'catalogEntries' && (
        <section className="sp-editor-block">
          <strong>{ui.structureAssignmentEditor}</strong>
          <p className="sp-editor-hint">{ui.structureAssignmentEditorHint}</p>
          <div className="sp-editor-row multi">
            <select value={assignmentUsageId} onChange={(event) => onAssignmentUsageIdChange(event.target.value)}>
              {selectedStructureUsages.length === 0 && <option value="">{ui.structureUsages}</option>}
              {selectedStructureUsages.map((usage) => (
                <option key={usage.id} value={usage.id}>
                  {getUsageLabel(usage)}
                </option>
              ))}
            </select>
            <select value={assignmentNodeId} onChange={(event) => onAssignmentNodeIdChange(event.target.value)}>
              {selectedDraft.nodes.length === 0 && <option value="">{ui.structureNodes}</option>}
              {selectedDraft.nodes
                .filter((node) => /^\d+$/.test(node.clientId))
                .map((node) => (
                  <option key={node.clientId} value={node.clientId}>
                    {node.name || ui.structureNode}
                  </option>
                ))}
            </select>
            <select
              value={assignmentCatalogEntryId}
              onChange={(event) => onAssignmentCatalogEntryIdChange(event.target.value)}
            >
              {catalogEntryOptions.length === 0 && <option value="">{ui.chooseEntry}</option>}
              {catalogEntryOptions.map(({ catalog, entry }) => (
                <option key={entry.id} value={entry.id}>
                  {catalog.name} / {entry.name}
                </option>
              ))}
            </select>
            <input
              placeholder={ui.role}
              value={assignmentRoleLabel}
              onChange={(event) => onAssignmentRoleLabelChange(event.target.value)}
            />
            <button
              className="sp-button primary"
              type="button"
              disabled={
                isDetailSaving ||
                assignmentUsageId.trim().length === 0 ||
                assignmentNodeId.trim().length === 0 ||
                assignmentCatalogEntryId.trim().length === 0
              }
              onClick={onCatalogEntryAssign}
            >
              {ui.structureAssignObject}
            </button>
          </div>
        </section>
      )}
      {selectedStructureAssignments.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noStructureAssignments}</strong>
          <span>{ui.structureAssignmentEditorHint}</span>
        </div>
      ) : (
        <div className="sp-structure-assignment-list separated">
          {selectedDraft.nodes.map((node) => {
            const nodeId = /^\d+$/.test(node.clientId) ? Number(node.clientId) : null
            const assignments = nodeId === null ? [] : selectedAssignmentsByNodeId.get(nodeId) ?? []
            if (assignments.length === 0) {
              return null
            }

            return (
              <section className="sp-panel-subtle" key={node.clientId}>
                <div className="sp-structure-nodes-head">
                  <div>
                    <h3>{node.name || ui.structureNode}</h3>
                    <p>{node.nodeType || ui.structureNodeDossier}</p>
                  </div>
                  <span className="sp-count-pill">{assignments.length}</span>
                </div>
                <div className="sp-structure-assignment-list">
                  {assignments.map((assignment) => (
                    <div className="sp-row" key={assignment.id}>
                      <div>
                        <strong>{assignment.targetName}</strong>
                        <span>{assignment.roleLabel || assignment.targetTypeKey}</span>
                      </div>
                      <span>{assignment.structureName}</span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
