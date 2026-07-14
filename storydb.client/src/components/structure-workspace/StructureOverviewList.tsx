import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { StructureSummary } from '../../types'
import { KebabMenu, SectionIcon } from '../StylePreviewPrimitives'

export function StructureOverviewList({
  selectedStructureId,
  structures,
  ui,
  onCreate,
  onDelete,
  onOpen,
}: {
  selectedStructureId: number | null
  structures: StructureSummary[]
  ui: PreviewText
  onCreate: () => void
  onDelete: (structure: StructureSummary) => void
  onOpen: (structureId: number) => void
}) {
  if (structures.length === 0) {
    return (
      <div className="sp-empty compact">
        <strong>{ui.noStructures}</strong>
        <span>{ui.structuresDescription}</span>
        <button className="sp-button primary" type="button" onClick={onCreate}>
          {ui.create}
        </button>
      </div>
    )
  }

  return (
    <div className="sp-cards sp-structure-list">
      {structures.map((structure) => {
        const canDeleteStructure = structure.assignmentCount === 0 && structure.timelineReferenceCount === 0

        return (
          <article
            className={`sp-card compact${structure.id === selectedStructureId ? ' selected' : ''}`}
            key={structure.id}
          >
            <KebabMenu
              className="sp-card-menu"
              ui={ui}
              onDelete={canDeleteStructure ? () => onDelete(structure) : undefined}
            />
            <button className="sp-card-main" type="button" onClick={() => onOpen(structure.id)}>
              <div className="sp-structure-icon">
                <SectionIcon name="structures" />
              </div>
              <div className="sp-card-body">
                <h3>{structure.name}</h3>
                <p>{structure.description ?? ui.noDescription}</p>
                <div className="sp-tags">
                  <span>{structure.layoutKind}</span>
                  <span>{ui.structureNodesCount}: {structure.nodeCount}</span>
                  <span>{ui.structureUsageCount}: {structure.usageCount}</span>
                  {structure.assignmentCount > 0 && (
                    <span>{ui.structureAssignmentCount}: {structure.assignmentCount}</span>
                  )}
                  {structure.timelineReferenceCount > 0 && (
                    <span>{ui.structureTimelineReferenceCount}: {structure.timelineReferenceCount}</span>
                  )}
                </div>
              </div>
            </button>
          </article>
        )
      })}
    </div>
  )
}
