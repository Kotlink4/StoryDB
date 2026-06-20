import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  StructureApplicationScope,
  StructureDraft,
  StructureEdgeDraft,
  StructureLayoutKind,
  StructureNodeDraft,
  StructureOwnerKind,
  StoryProject,
} from '../../types'
import { StructureMapPreview } from './StructureDossierPanels'
import { StructureEdgeDraftSection, StructureNodeDraftList } from './StructureDraftSections'
import { getStructureApplicationScopeLabel, structureApplicationScopes } from './structureDraftUtils'

export function StructureCreatePanel({
  canSaveStructure,
  draft,
  isSaving,
  selectedProject,
  ui,
  onDraftChange,
  onEdgeAdd,
  onEdgeChange,
  onEdgeRemove,
  onNodeAdd,
  onNodeChange,
  onNodeRemove,
  onSave,
}: {
  canSaveStructure: boolean
  draft: StructureDraft
  isSaving: boolean
  selectedProject: StoryProject
  ui: PreviewText
  onDraftChange: (patch: Partial<StructureDraft>) => void
  onEdgeAdd: () => void
  onEdgeChange: (edgeIndex: number, patch: Partial<StructureEdgeDraft>) => void
  onEdgeRemove: (edgeIndex: number) => void
  onNodeAdd: () => void
  onNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onNodeRemove: (clientId: string) => void
  onSave: () => void
}) {
  return (
    <div className="sp-structure-editor sp-panel">
      <div className="sp-form">
        <label>
          {ui.name}
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ name: event.target.value })}
          />
        </label>
        <label>
          {ui.description}
          <input
            value={draft.description}
            onChange={(event) => onDraftChange({ description: event.target.value })}
          />
        </label>
        <label>
          {ui.structureOwnerKind}
          <select
            value={draft.ownerKind}
            onChange={(event) => {
              const ownerKind = event.target.value as StructureOwnerKind
              onDraftChange({
                ownerKind,
                linkedCatalogId: null,
                ownerId: ownerKind === 'project' ? selectedProject.id : draft.ownerId,
              })
            }}
          >
            <option value="project">{ui.structureOwnerProject}</option>
          </select>
        </label>
        <label>
          {ui.structureLayoutKind}
          <select
            value={draft.layoutKind}
            onChange={(event) => onDraftChange({ layoutKind: event.target.value as StructureLayoutKind })}
          >
            <option value="levels">{ui.structureLayoutLevels}</option>
            <option value="tree">{ui.structureLayoutTree}</option>
            <option value="graph">{ui.structureLayoutGraph}</option>
          </select>
        </label>
        <label>
          {ui.structureApplicationScope}
          <select
            value={draft.applicationScope}
            onChange={(event) => {
              const applicationScope = event.target.value as StructureApplicationScope
              onDraftChange({
                applicationScope,
                linkedCatalogId: null,
              })
            }}
          >
            {structureApplicationScopes.map((scope) => (
              <option key={scope} value={scope}>
                {getStructureApplicationScopeLabel(scope, ui)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sp-detail-actions">
        <button className="sp-button" type="button" disabled={isSaving} onClick={onNodeAdd}>
          {ui.structureAddNode}
        </button>
        <button className="sp-button primary" type="button" disabled={!canSaveStructure} onClick={onSave}>
          {isSaving ? ui.saving : ui.create}
        </button>
      </div>
      {draft.nodes.length > 0 && (
        <>
          <StructureMapPreview draft={draft} ui={ui} />
          <StructureNodeDraftList
            nodes={draft.nodes}
            ui={ui}
            onNodeChange={onNodeChange}
            onNodeRemove={onNodeRemove}
          />
          <StructureEdgeDraftSection
            edges={draft.edges}
            nodes={draft.nodes}
            ui={ui}
            onEdgeAdd={onEdgeAdd}
            onEdgeChange={onEdgeChange}
            onEdgeRemove={onEdgeRemove}
          />
        </>
      )}
    </div>
  )
}
