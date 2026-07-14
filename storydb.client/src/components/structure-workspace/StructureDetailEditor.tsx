import type {
  Catalog,
  CatalogEntry,
  StructureApplicationScope,
  StructureAssignment,
  StructureDraft,
  StructureEdgeDraft,
  StructureLayoutKind,
  StructureNodeDraft,
  StructureOwnerKind,
  StructureUsage,
  StoryProject,
} from '../../types'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { StructureMapPreview } from './StructureDossierPanels'
import { StructureEdgeDraftSection, StructureNodeDraftList } from './StructureDraftSections'
import { StructureObjectsPanel } from './StructureObjectsPanel'
import {
  getStructureApplicationScopeLabel,
  structureApplicationScopes,
  type StructureWorkspacePage,
} from './structureDraftUtils'

export function StructureDetailEditor({
  activeStructurePage,
  assignmentCatalogEntryId,
  assignmentNodeId,
  assignmentRoleLabel,
  assignmentUsageId,
  availableCatalogs,
  catalogEntryOptions,
  hasSelectedStructureAssignments,
  hasSelectedStructureTimelineReferences,
  isDetailLoading,
  isDetailSaving,
  isSelectedTopologyLocked,
  schemaMode,
  selectedAssignmentCountsByNodeId,
  selectedAssignmentCountsByUsageId,
  selectedAssignmentsByNodeId,
  selectedDraft,
  selectedProject,
  selectedStructureAssignments,
  selectedStructureNodeClientId,
  selectedStructureTimelineReferenceCount,
  selectedStructureUsages,
  systemMode,
  ui,
  onAssignmentCatalogEntryIdChange,
  onAssignmentNodeIdChange,
  onAssignmentRoleLabelChange,
  onAssignmentUsageIdChange,
  onCatalogEntryAssign,
  onSchemaModeChange,
  onSelectedDraftChange,
  onSelectedEdgeAdd,
  onSelectedEdgeChange,
  onSelectedEdgeRemove,
  onSelectedNodeAdd,
  onSelectedNodeChange,
  onSelectedNodeClientIdChange,
  onSelectedNodeDetailsSave,
  onSelectedNodeRemove,
  onSelectedStructureSave,
  onSelectedStructureDetailsSave,
  onSystemModeChange,
}: {
  activeStructurePage: StructureWorkspacePage
  assignmentCatalogEntryId: string
  assignmentNodeId: string
  assignmentRoleLabel: string
  assignmentUsageId: string
  availableCatalogs: Catalog[]
  catalogEntryOptions: Array<{ catalog: Catalog; entry: CatalogEntry }>
  hasSelectedStructureAssignments: boolean
  hasSelectedStructureTimelineReferences: boolean
  isDetailLoading: boolean
  isDetailSaving: boolean
  isSelectedTopologyLocked: boolean
  schemaMode: 'view' | 'edit'
  selectedAssignmentCountsByNodeId: Map<number, number>
  selectedAssignmentCountsByUsageId: Map<number, number>
  selectedAssignmentsByNodeId: Map<number, StructureAssignment[]>
  selectedDraft: StructureDraft | null
  selectedProject: StoryProject
  selectedStructureAssignments: StructureAssignment[]
  selectedStructureNodeClientId: string | null
  selectedStructureTimelineReferenceCount: number
  selectedStructureUsages: StructureUsage[]
  systemMode: 'view' | 'edit'
  ui: PreviewText
  onAssignmentCatalogEntryIdChange: (entryId: string) => void
  onAssignmentNodeIdChange: (nodeId: string) => void
  onAssignmentRoleLabelChange: (roleLabel: string) => void
  onAssignmentUsageIdChange: (usageId: string) => void
  onCatalogEntryAssign: () => void
  onSchemaModeChange: (mode: 'view' | 'edit') => void
  onSelectedDraftChange: (patch: Partial<StructureDraft>) => void
  onSelectedEdgeAdd: () => void
  onSelectedEdgeChange: (edgeIndex: number, patch: Partial<StructureEdgeDraft>) => void
  onSelectedEdgeRemove: (edgeIndex: number) => void
  onSelectedNodeAdd: () => void
  onSelectedNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onSelectedNodeClientIdChange: (clientId: string | null) => void
  onSelectedNodeDetailsSave: (clientId: string) => void
  onSelectedNodeRemove: (clientId: string) => void
  onSelectedStructureSave: () => void
  onSelectedStructureDetailsSave: () => void
  onSystemModeChange: (mode: 'view' | 'edit') => void
}) {
  return (
    <div className="sp-structure-detail-editor sp-panel">
      {selectedDraft === null ? (
        <div className="sp-empty compact">
          <strong>{isDetailLoading ? ui.loading : ui.structureSelectToEdit}</strong>
          <span>{ui.structurePageSelectHint}</span>
        </div>
      ) : (
        <>
          <div className="sp-workspace-head compact">
            <div>
              <h3>{selectedDraft.name || ui.structure}</h3>
            </div>
            {activeStructurePage === 'system' && systemMode === 'view' && (
              <button className="sp-button primary" type="button" onClick={() => onSystemModeChange('edit')}>
                {ui.edit}
              </button>
            )}
            {activeStructurePage === 'system' && systemMode === 'edit' && (
              <div className="sp-inline-actions">
                <button className="sp-button" type="button" onClick={() => onSystemModeChange('view')}>
                  {ui.cancel}
                </button>
                <button
                  className="sp-button primary"
                  type="button"
                  disabled={isDetailSaving || selectedDraft.name.trim().length === 0}
                  onClick={isSelectedTopologyLocked ? onSelectedStructureDetailsSave : onSelectedStructureSave}
                >
                  {isDetailSaving ? ui.saving : ui.save}
                </button>
              </div>
            )}
            {activeStructurePage === 'schema' && schemaMode === 'view' && (
              <button className="sp-button primary" type="button" onClick={() => onSchemaModeChange('edit')}>
                {ui.edit}
              </button>
            )}
            {activeStructurePage === 'schema' && schemaMode === 'edit' && (
              <div className="sp-inline-actions">
                <button className="sp-button" type="button" onClick={() => onSchemaModeChange('view')}>
                  {ui.cancel}
                </button>
                <button
                  className="sp-button primary"
                  type="button"
                  disabled={isDetailSaving || selectedDraft.name.trim().length === 0 || hasSelectedStructureTimelineReferences}
                  onClick={onSelectedStructureSave}
                >
                  {isDetailSaving ? ui.saving : ui.save}
                </button>
              </div>
            )}
          </div>
          {activeStructurePage === 'schema' && isSelectedTopologyLocked && (
            <div className="sp-note">
              <strong>{ui.structureTopologyLocked}</strong>
              <div className="sp-tags">
                {hasSelectedStructureAssignments && (
                  <span>{ui.structureAssignmentCount}: {selectedStructureAssignments.length}</span>
                )}
                {hasSelectedStructureTimelineReferences && (
                  <span>
                    {ui.structureTimelineReferenceCount}: {selectedStructureTimelineReferenceCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {activeStructurePage === 'system' && systemMode === 'view' && (
            <div className="sp-structure-system-overview">
              <div className="sp-detail-field wide">
                <span>{ui.description}</span>
                <strong>{selectedDraft.description.trim() || ui.noDescription}</strong>
              </div>
              <div className="sp-detail-grid compact">
                <div className="sp-detail-field">
                  <span>{ui.structureOwnerKind}</span>
                  <strong>
                    {selectedDraft.ownerKind === 'project'
                      ? ui.structureOwnerProject
                      : selectedDraft.ownerKind === 'catalog'
                        ? ui.structureOwnerCatalog
                        : ui.structureOwnerObject}
                  </strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureApplicationScope}</span>
                  <strong>{getStructureApplicationScopeLabel(selectedDraft.applicationScope, ui)}</strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureLayoutKind}</span>
                  <strong>
                    {selectedDraft.layoutKind === 'levels'
                      ? ui.structureLayoutLevels
                      : selectedDraft.layoutKind === 'tree'
                        ? ui.structureLayoutTree
                        : ui.structureLayoutGraph}
                  </strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureNodes}</span>
                  <strong>{selectedDraft.nodes.length}</strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureEdges}</span>
                  <strong>{selectedDraft.edges.length}</strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureUsageCount}</span>
                  <strong>{selectedStructureUsages.length}</strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureAssignmentCount}</span>
                  <strong>{selectedStructureAssignments.length}</strong>
                </div>
                <div className="sp-detail-field">
                  <span>{ui.structureTimelineReferenceCount}</span>
                  <strong>{selectedStructureTimelineReferenceCount}</strong>
                </div>
              </div>
            </div>
          )}

          {activeStructurePage === 'system' && systemMode === 'edit' && (
            <div className="sp-form">
              <label>
                {ui.name}
                <input
                  value={selectedDraft.name}
                  onChange={(event) => onSelectedDraftChange({ name: event.target.value })}
                />
              </label>
              <label>
                {ui.description}
                <input
                  value={selectedDraft.description}
                  onChange={(event) => onSelectedDraftChange({ description: event.target.value })}
                />
              </label>
              <label>
                {ui.structureOwnerKind}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.ownerKind}
                  onChange={(event) => {
                    const ownerKind = event.target.value as StructureOwnerKind
                    onSelectedDraftChange({
                      ownerKind,
                      ownerId:
                        ownerKind === 'project'
                          ? selectedProject.id
                          : selectedDraft.ownerId,
                      linkedCatalogId: null,
                    })
                  }}
                >
                  <option value="project">{ui.structureOwnerProject}</option>
                  {selectedDraft.ownerKind === 'object' && (
                    <option value="object">{ui.structureOwnerObject}</option>
                  )}
                </select>
              </label>
              <label>
                {ui.structureLayoutKind}
                <select
                  disabled={isSelectedTopologyLocked}
                  value={selectedDraft.layoutKind}
                  onChange={(event) => onSelectedDraftChange({ layoutKind: event.target.value as StructureLayoutKind })}
                >
                  <option value="levels">{ui.structureLayoutLevels}</option>
                  <option value="tree">{ui.structureLayoutTree}</option>
                  <option value="graph">{ui.structureLayoutGraph}</option>
                </select>
              </label>
              <label>
                {ui.structureApplicationScope}
                <select
                  value={selectedDraft.applicationScope}
                  onChange={(event) => {
                    const applicationScope = event.target.value as StructureApplicationScope
                    onSelectedDraftChange({
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
          )}

          {activeStructurePage === 'objects' && (
            <StructureObjectsPanel
              assignmentCatalogEntryId={assignmentCatalogEntryId}
              assignmentNodeId={assignmentNodeId}
              assignmentRoleLabel={assignmentRoleLabel}
              assignmentUsageId={assignmentUsageId}
              availableCatalogs={availableCatalogs}
              catalogEntryOptions={catalogEntryOptions}
              isDetailSaving={isDetailSaving}
              selectedAssignmentCountsByUsageId={selectedAssignmentCountsByUsageId}
              selectedAssignmentsByNodeId={selectedAssignmentsByNodeId}
              selectedDraft={selectedDraft}
              selectedProject={selectedProject}
              selectedStructureAssignments={selectedStructureAssignments}
              selectedStructureUsages={selectedStructureUsages}
              ui={ui}
              onAssignmentCatalogEntryIdChange={onAssignmentCatalogEntryIdChange}
              onAssignmentNodeIdChange={onAssignmentNodeIdChange}
              onAssignmentRoleLabelChange={onAssignmentRoleLabelChange}
              onAssignmentUsageIdChange={onAssignmentUsageIdChange}
              onCatalogEntryAssign={onCatalogEntryAssign}
            />
          )}

          {activeStructurePage === 'schema' && (
            <div className="sp-structure-nodes">
              <div className="sp-structure-nodes-head">
                <div>
                  <h3>{ui.structureNodes}</h3>
                  <p>{ui.structureNodesHint}</p>
                </div>
                {schemaMode === 'edit' && (
                  <button
                    className="sp-button"
                    disabled={hasSelectedStructureTimelineReferences}
                    type="button"
                    onClick={onSelectedNodeAdd}
                  >
                    {ui.structureAddNode}
                  </button>
                )}
              </div>

              {selectedDraft.nodes.length === 0 ? (
                <div className="sp-empty compact">
                  <strong>{ui.noStructureNodes}</strong>
                  <span>{ui.structureNodesHint}</span>
                </div>
              ) : (
                <>
                  <StructureMapPreview
                    draft={selectedDraft}
                    ui={ui}
                    selectedNodeClientId={selectedStructureNodeClientId}
                    onSelectedNodeClientIdChange={onSelectedNodeClientIdChange}
                  />
                  {schemaMode === 'edit' && (
                    <>
                      <StructureNodeDraftList
                        nodes={selectedDraft.nodes}
                        ui={ui}
                        assignmentCountsByNodeId={selectedAssignmentCountsByNodeId}
                        onNodeChange={onSelectedNodeChange}
                        onNodeDetailsSave={onSelectedNodeDetailsSave}
                        onNodeRemove={onSelectedNodeRemove}
                        isNodeDetailsSaving={isDetailSaving}
                        isTopologyLocked={hasSelectedStructureTimelineReferences}
                      />
                      <StructureEdgeDraftSection
                        edges={selectedDraft.edges}
                        nodes={selectedDraft.nodes}
                        ui={ui}
                        onEdgeAdd={onSelectedEdgeAdd}
                        onEdgeChange={onSelectedEdgeChange}
                        onEdgeRemove={onSelectedEdgeRemove}
                        isTopologyLocked={isSelectedTopologyLocked}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
