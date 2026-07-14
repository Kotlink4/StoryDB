import { X } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { previewRouteBase } from '../../style-preview/domain/stylePreviewRouting'
import type {
  Structure,
  StructureAssignment,
  StructureUsage,
} from '../../types'

type OrganizationStructureUsageListProps = {
  isSaving: boolean
  mode?: 'readonly' | 'editor'
  structureAssignments: Record<number, StructureAssignment[]>
  structureDetails: Record<number, Structure>
  structureUsages: StructureUsage[]
  ui: PreviewText
  onAssignmentDelete: (assignment: StructureAssignment) => void
  onAssignmentRoleUpdate: (assignment: StructureAssignment, roleLabel: string) => void
  onUsageDisconnect: (usage: StructureUsage) => void
  onUsageIndividualize: (usage: StructureUsage) => void
  onUsagePrimary: (usage: StructureUsage) => void
}

export function OrganizationStructureUsageList({
  isSaving,
  mode = 'readonly',
  structureAssignments,
  structureDetails,
  structureUsages,
  ui,
  onAssignmentDelete,
  onAssignmentRoleUpdate,
  onUsageDisconnect,
  onUsageIndividualize,
  onUsagePrimary,
}: OrganizationStructureUsageListProps) {
  const isEditorMode = mode === 'editor'

  if (structureUsages.length === 0) {
    return (
      <div className="sp-empty compact">
        <strong>{ui.noOrganizationStructure}</strong>
        <span>{ui.structureOptionalHint}</span>
      </div>
    )
  }

  return (
    <div className="sp-organization-structure-levels">
      {structureUsages.map((usage) => {
        const structure = structureDetails[usage.structureId]
        const assignments = structureAssignments[usage.id] ?? []
        const levelIndexes =
          structure === undefined
            ? []
            : Array.from(new Set(structure.nodes.map((node) => node.levelIndex))).sort((left, right) => left - right)

        return (
          <details className="sp-collapsible-section sp-organization-structure-usage" key={usage.id} open>
            <summary>
              <span>{usage.displayName ?? usage.structureName}</span>
              <strong>{usage.isPrimary ? ui.primary : ui.structureTemplate}</strong>
            </summary>
            {structure?.ownerKind === 'object' && (
              <div className="sp-tags sp-structure-usage-meta">
                <span>{ui.structureIndividual}</span>
              </div>
            )}
            {usage.notes !== null && usage.notes.trim().length > 0 && <p>{usage.notes}</p>}
            {structure !== undefined && (
              levelIndexes.length === 0 ? (
                <p>{ui.noStructureNodes}</p>
              ) : (
                <div className="sp-organization-structure-node-preview">
                  {levelIndexes.map((levelIndex) => (
                    <details className="sp-collapsible-section sp-organization-structure-node-level" key={levelIndex} open>
                      <summary>
                        <span>{ui.structureLevelIndex} {levelIndex + 1}</span>
                        <strong>
                          {structure.nodes.filter((node) => node.levelIndex === levelIndex).length}
                        </strong>
                      </summary>
                      <div>
                        {structure.nodes
                          .filter((node) => node.levelIndex === levelIndex)
                          .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
                          .map((node) => {
                            const nodeAssignments = assignments.filter(
                              (assignment) => assignment.structureNodeId === node.id,
                            )

                            return (
                              <article className="sp-structure-node-member-card" key={node.id}>
                                <strong>{node.name}</strong>
                                {nodeAssignments.length === 0 ? (
                                  <span>{ui.noStructureNodeMembers}</span>
                                ) : (
                                  <div>
                                    {nodeAssignments.map((assignment) => (
                                      <span
                                        className={`sp-structure-node-member${isEditorMode ? '' : ' readonly'}`}
                                        key={assignment.id}
                                      >
                                        <span>{assignment.storyObjectName}</span>
                                        {isEditorMode ? (
                                          <>
                                            <input
                                              aria-label={ui.role}
                                              defaultValue={assignment.roleLabel ?? ''}
                                              disabled={isSaving}
                                              placeholder={ui.role}
                                              onBlur={(event) =>
                                                onAssignmentRoleUpdate(assignment, event.currentTarget.value)
                                              }
                                            />
                                            <button
                                              className="sp-icon-button"
                                              disabled={isSaving}
                                              type="button"
                                              onClick={() => onAssignmentDelete(assignment)}
                                              title={ui.delete}
                                            >
                                              <X aria-hidden="true" size={14} />
                                            </button>
                                          </>
                                        ) : (
                                          assignment.roleLabel !== null &&
                                          assignment.roleLabel.trim().length > 0 && (
                                            <span>{assignment.roleLabel}</span>
                                          )
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </article>
                            )
                          })}
                      </div>
                    </details>
                  ))}
                </div>
              )
            )}
            {isEditorMode && (
              <div className="sp-detail-actions">
                <Link
                  className="sp-button"
                  to={`${previewRouteBase}/projects/${usage.projectId}/structures?structureId=${usage.structureId}`}
                >
                  {ui.structureEditSchema}
                </Link>
                {!usage.isPrimary && (
                  <button className="sp-button" disabled={isSaving} type="button" onClick={() => onUsagePrimary(usage)}>
                    {ui.structureMakePrimary}
                  </button>
                )}
                {structure?.ownerKind !== 'object' && (
                  <button
                    className="sp-button"
                    disabled={isSaving}
                    type="button"
                    onClick={() => onUsageIndividualize(usage)}
                  >
                    {ui.structureMakeIndividual}
                  </button>
                )}
                <button
                  className="sp-button danger"
                  disabled={isSaving || assignments.length > 0}
                  type="button"
                  title={assignments.length > 0 ? ui.structureDisconnectWithAssignmentsHint : ui.structureDisconnect}
                  onClick={() => onUsageDisconnect(usage)}
                >
                  {ui.structureDisconnect}
                </button>
              </div>
            )}
          </details>
        )
      })}
    </div>
  )
}
