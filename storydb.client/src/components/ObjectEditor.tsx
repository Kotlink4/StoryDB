import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { DraftTimelineParticipation, ObjectEditorTab } from '../style-preview/domain/stylePreviewUiTypes'
import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  StoryObject,
  TimelineEvent,
} from '../types'
import { ObjectEditorMainTab } from './object-editor/ObjectEditorMainTab'
import { ObjectEditorAttributesTab } from './object-editor/ObjectEditorAttributesTab'
import { ObjectEditorCatalogsTab } from './object-editor/ObjectEditorCatalogsTab'
import { ObjectEditorHierarchyTab } from './object-editor/ObjectEditorHierarchyTab'
import { ObjectRelationsEditor } from './object-editor/ObjectRelationsEditor'
import { ObjectEditorTimelineTab } from './object-editor/ObjectEditorTimelineTab'
import { StructureMembershipView } from './object-detail/StructureMembershipView'
export function ObjectEditor({
  activeType,
  attributeDefinitions,
  attributeGroups,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  draftTimelineParticipations,
  editingObjectId,
  editorTimelineEventId,
  hierarchyGroups,
  hierarchyNodesByGroupId,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectEditorTab,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectSurnameForm,
  objectsByType,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  saveObjectAsTimelineChange,
  selectedProjectId,
  timelineEvents,
  territoryPlaceIds,
  ui,
  isSaving,
  onCancel,
  onDraftAttributesChange,
  onDraftCatalogSelectionsChange,
  onDraftCharacterRelationshipsChange,
  onDraftHierarchySelectionsChange,
  onDraftTimelineParticipationsChange,
  onEditorTimelineEventIdChange,
  onImageUpload,
  onObjectAgeChange,
  onObjectCurrentStatusChange,
  onObjectDescriptionChange,
  onObjectEditorTabChange,
  onObjectNameChange,
  onObjectRoleChange,
  onObjectSurnameChange,
  onObjectSurnameFormChange,
  onOwnedItemIdsChange,
  onOwnerCharacterIdsChange,
  onOwnerOrganizationIdsChange,
  onSave,
  onSaveObjectAsTimelineChange,
  onTerritoryPlaceIdsChange,
  onTimelineEventUpdated,
  toggleNumberSelection,
}: {
  activeType: ObjectTypeKey
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  draftAttributes: DraftAttribute[]
  draftCatalogSelections: DraftCatalogSelection[]
  draftCharacterRelationships: DraftCharacterRelationship[]
  draftHierarchySelections: DraftHierarchySelection[]
  draftTimelineParticipations: DraftTimelineParticipation[]
  editingObjectId: number | null
  editorTimelineEventId: string
  hierarchyGroups: HierarchyGroup[]
  hierarchyNodesByGroupId: Record<number, HierarchyNode[]>
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectEditorTab: ObjectEditorTab
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectSurnameForm: string
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  saveObjectAsTimelineChange: boolean
  selectedProjectId: number | null
  timelineEvents: TimelineEvent[]
  territoryPlaceIds: number[]
  ui: PreviewText
  isSaving: boolean
  onCancel: () => void
  onDraftAttributesChange: (attributes: DraftAttribute[]) => void
  onDraftCatalogSelectionsChange: (selections: DraftCatalogSelection[]) => void
  onDraftCharacterRelationshipsChange: (relationships: DraftCharacterRelationship[]) => void
  onDraftHierarchySelectionsChange: (selections: DraftHierarchySelection[]) => void
  onDraftTimelineParticipationsChange: (participations: DraftTimelineParticipation[]) => void
  onEditorTimelineEventIdChange: (eventId: string) => void
  onImageUpload: (file: File | null) => void
  onObjectAgeChange: (value: string) => void
  onObjectCurrentStatusChange: (value: string) => void
  onObjectDescriptionChange: (value: string) => void
  onObjectEditorTabChange: (tab: ObjectEditorTab) => void
  onObjectNameChange: (value: string) => void
  onObjectRoleChange: (value: string) => void
  onObjectSurnameChange: (value: string) => void
  onObjectSurnameFormChange: (value: string) => void
  onOwnedItemIdsChange: (ids: number[]) => void
  onOwnerCharacterIdsChange: (ids: number[]) => void
  onOwnerOrganizationIdsChange: (ids: number[]) => void
  onSave: () => void
  onSaveObjectAsTimelineChange: (value: boolean) => void
  onTerritoryPlaceIdsChange: (ids: number[]) => void
  onTimelineEventUpdated?: (event: TimelineEvent) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
  const editingObject =
    editingObjectId === null
      ? null
      : objectsByType[activeType].find((storyObject) => storyObject.id === editingObjectId) ?? null
  return (
    <section className="sp-object-editor">
      <div className="sp-object-editor-tabs">
        {[
          ['main', ui.main],
          ['attributes', ui.attributes],
          ['catalogs', ui.catalogs],
          ['relations', ui.relations],
          ['structure', ui.structure],
          ['timeline', ui.timeline],
        ].map(([tab, label]) => (
          <button
            className={objectEditorTab === tab ? 'active' : ''}
            key={tab}
            type="button"
            onClick={() => onObjectEditorTabChange(tab as ObjectEditorTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {objectEditorTab === 'main' && (
        <ObjectEditorMainTab
          activeType={activeType}
          objectAge={objectAge}
          objectCurrentStatus={objectCurrentStatus}
          objectDescription={objectDescription}
          objectImagePath={objectImagePath}
          objectName={objectName}
          objectRole={objectRole}
          objectSurname={objectSurname}
          objectSurnameForm={objectSurnameForm}
          organizations={objectsByType.organizations}
          ui={ui}
          onImageUpload={onImageUpload}
          onObjectAgeChange={onObjectAgeChange}
          onObjectCurrentStatusChange={onObjectCurrentStatusChange}
          onObjectDescriptionChange={onObjectDescriptionChange}
          onObjectNameChange={onObjectNameChange}
          onObjectRoleChange={onObjectRoleChange}
          onObjectSurnameChange={onObjectSurnameChange}
          onObjectSurnameFormChange={onObjectSurnameFormChange}
        />
      )}

      {objectEditorTab === 'attributes' && (
        <ObjectEditorAttributesTab
          attributeDefinitions={attributeDefinitions}
          attributeGroups={attributeGroups}
          draftAttributes={draftAttributes}
          ui={ui}
          onDraftAttributesChange={onDraftAttributesChange}
        />
      )}

      {objectEditorTab === 'catalogs' && (
        <ObjectEditorCatalogsTab
          catalogEntriesByCatalogId={catalogEntriesByCatalogId}
          catalogGroupsByCatalogId={catalogGroupsByCatalogId}
          catalogs={catalogs}
          draftCatalogSelections={draftCatalogSelections}
          ui={ui}
          onDraftCatalogSelectionsChange={onDraftCatalogSelectionsChange}
        />
      )}

      {objectEditorTab === 'hierarchy' && (
        <ObjectEditorHierarchyTab
          draftHierarchySelections={draftHierarchySelections}
          hierarchyGroups={hierarchyGroups}
          hierarchyNodesByGroupId={hierarchyNodesByGroupId}
          ui={ui}
          onDraftHierarchySelectionsChange={onDraftHierarchySelectionsChange}
          toggleNumberSelection={toggleNumberSelection}
        />
      )}

      {objectEditorTab === 'relations' && (
        <ObjectRelationsEditor
          activeType={activeType}
          draftCharacterRelationships={draftCharacterRelationships}
          editingObjectId={editingObjectId}
          objectSurnameForm={objectSurnameForm}
          objectsByType={objectsByType}
          ownedItemIds={ownedItemIds}
          ownerCharacterIds={ownerCharacterIds}
          ownerOrganizationIds={ownerOrganizationIds}
          territoryPlaceIds={territoryPlaceIds}
          ui={ui}
          onDraftCharacterRelationshipsChange={onDraftCharacterRelationshipsChange}
          onOwnedItemIdsChange={onOwnedItemIdsChange}
          onOwnerCharacterIdsChange={onOwnerCharacterIdsChange}
          onOwnerOrganizationIdsChange={onOwnerOrganizationIdsChange}
          onTerritoryPlaceIdsChange={onTerritoryPlaceIdsChange}
          toggleNumberSelection={toggleNumberSelection}
        />
      )}
      {objectEditorTab === 'structure' && (
        editingObject === null ? (
          <div className="sp-empty compact">
            <strong>{ui.structure}</strong>
            <span>{ui.structureEditorSaveObjectHint}</span>
          </div>
        ) : (
          <StructureMembershipView
            catalogs={catalogs}
            dossierTimelineEventId={editorTimelineEventId}
            mode="editor"
            objectsByType={objectsByType}
            selectedProjectId={selectedProjectId}
            storyObject={editingObject}
            timelineEvents={timelineEvents}
            ui={ui}
            onTimelineEventUpdated={onTimelineEventUpdated}
          />
        )
      )}

      {objectEditorTab === 'timeline' && (
        <ObjectEditorTimelineTab
          draftTimelineParticipations={draftTimelineParticipations}
          editorTimelineEventId={editorTimelineEventId}
          saveObjectAsTimelineChange={saveObjectAsTimelineChange}
          timelineEvents={timelineEvents}
          ui={ui}
          onDraftTimelineParticipationsChange={onDraftTimelineParticipationsChange}
          onEditorTimelineEventIdChange={onEditorTimelineEventIdChange}
          onSaveObjectAsTimelineChange={onSaveObjectAsTimelineChange}
        />
      )}

      <div className="sp-dialog-actions">
        <button className="sp-button" type="button" onClick={onCancel}>
          {ui.cancel}
        </button>
        <button className="sp-button primary" type="button" disabled={isSaving} onClick={onSave}>
          {isSaving ? ui.saving : ui.save}
        </button>
      </div>
    </section>
  )
}

