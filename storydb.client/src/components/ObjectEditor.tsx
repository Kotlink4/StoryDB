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
import { CoverDropzone } from './ImageInputs'
import { ObjectRelationsEditor } from './object-editor/ObjectRelationsEditor'
import { ObjectEditorTimelineTab } from './object-editor/ObjectEditorTimelineTab'
import {
  buildOrganizationSurnameOptions,
  getDraftAttributeGroupName,
  getObjectImageClassName,
  getObjectImageCropMode,
  groupDraftAttributes,
} from './object-editor/objectEditorModel'
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
  const organizationSurnameOptions = buildOrganizationSurnameOptions(objectsByType.organizations)
  const addAttribute = () => onDraftAttributesChange([...draftAttributes, { name: '', value: '' }])
  const addExistingAttribute = (definitionId: string) => {
    const definition = attributeDefinitions.find((item) => item.id === Number(definitionId))
    if (definition === undefined || draftAttributes.some((attribute) => attribute.name === definition.name)) {
      return
    }

    onDraftAttributesChange([...draftAttributes, { name: definition.name, value: '' }])
  }
  const addAttributeGroup = (groupName: string) => {
    const groupDefinitions = attributeDefinitions.filter((definition) =>
      groupName === '__main__' ? definition.groupName === null : definition.groupName === groupName,
    )
    const existingNames = new Set(draftAttributes.map((attribute) => attribute.name))
    const nextAttributes = [
      ...draftAttributes,
      ...groupDefinitions
        .filter((definition) => !existingNames.has(definition.name))
        .map((definition) => ({ name: definition.name, value: '' })),
    ]
    onDraftAttributesChange(nextAttributes)
  }
  const groupedDraftAttributes = groupDraftAttributes(draftAttributes, attributeDefinitions, ui.main)
  const removeDraftAttributeGroup = (groupName: string) => {
    onDraftAttributesChange(
      draftAttributes.filter(
        (attribute) => getDraftAttributeGroupName(attribute, attributeDefinitions, ui.main) !== groupName,
      ),
    )
  }
  const addCatalogSelection = () =>
    onDraftCatalogSelectionsChange([
      ...draftCatalogSelections,
      { targetType: 'catalog', catalogId: '', catalogEntryGroupId: '', catalogEntryId: '' },
    ])
  const addHierarchySelection = () =>
    onDraftHierarchySelectionsChange([...draftHierarchySelections, { groupId: 0, nodeIds: [] }])
  const objectImageCropMode = getObjectImageCropMode(activeType)
  const objectImageClassName = getObjectImageClassName(activeType)
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
        <div className="sp-form">
          <CoverDropzone
            className={objectImageClassName}
            cropMode={objectImageCropMode}
            imagePath={objectImagePath}
            label={ui.image}
            ui={ui}
            onFileSelected={(file) => onImageUpload(file)}
          />
          <label>
            {ui.firstName}
            <input value={objectName} onChange={(event) => onObjectNameChange(event.target.value)} />
          </label>
          {activeType === 'characters' && (
            <>
              <label>
                {ui.surname}
                <input
                  list="sp-organization-surnames"
                  value={objectSurname}
                  onChange={(event) => onObjectSurnameChange(event.target.value)}
                />
              </label>
              <datalist id="sp-organization-surnames">
                {organizationSurnameOptions.map(([surname, organizationName]) => (
                  <option key={`${organizationName}-${surname}`} value={surname}>
                    {organizationName}
                  </option>
                ))}
              </datalist>
              <label>
                {ui.yearAge}
                <input value={objectAge} onChange={(event) => onObjectAgeChange(event.target.value)} />
              </label>
              <label>
                {ui.role}
                <input value={objectRole} onChange={(event) => onObjectRoleChange(event.target.value)} />
              </label>
            </>
          )}
          {activeType === 'organizations' && (
            <label>
              {ui.surnameForm}
              <input value={objectSurnameForm} onChange={(event) => onObjectSurnameFormChange(event.target.value)} />
            </label>
          )}
          <label>
            {ui.currentStatus}
            <input value={objectCurrentStatus} onChange={(event) => onObjectCurrentStatusChange(event.target.value)} />
          </label>
          <label className="wide">
            {ui.description}
            <textarea value={objectDescription} onChange={(event) => onObjectDescriptionChange(event.target.value)} />
          </label>
        </div>
      )}

      {objectEditorTab === 'attributes' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addAttribute}>
            {ui.addAttribute}
          </button>
          <div className="sp-editor-row">
            <select defaultValue="" onChange={(event) => addExistingAttribute(event.target.value)}>
              <option value="">{ui.addExistingAttribute}</option>
              {attributeDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
            <select defaultValue="" onChange={(event) => addAttributeGroup(event.target.value)}>
              <option value="">{ui.addAttributeGroup}</option>
              <option value="__main__">{ui.main}</option>
              {attributeGroups.map((group) => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
            <span className="sp-editor-hint">{ui.valuesForObjectHint}</span>
          </div>
          {groupedDraftAttributes.map((group) => (
            <section className="sp-editor-attribute-group" key={group.name}>
              <div className="sp-attribute-group-head">
                <strong>{group.name}</strong>
                <button type="button" onClick={() => removeDraftAttributeGroup(group.name)}>
                  {ui.delete}
                </button>
              </div>
              {group.items.map(({ attribute, index }) => (
                <div className="sp-editor-row" key={index}>
                  <input
                    list="sp-attribute-definitions"
                    placeholder={ui.firstName}
                    value={attribute.name}
                    onChange={(event) =>
                      onDraftAttributesChange(
                        draftAttributes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    placeholder={ui.attributeValuePlaceholder}
                    value={attribute.value}
                    onChange={(event) =>
                      onDraftAttributesChange(
                        draftAttributes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </section>
          ))}
          <datalist id="sp-attribute-definitions">
            {attributeDefinitions.map((definition) => (
              <option key={definition.id} value={definition.name} />
            ))}
          </datalist>
        </div>
      )}

      {objectEditorTab === 'catalogs' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addCatalogSelection}>
            {ui.addCatalogEntry}
          </button>
          {draftCatalogSelections.map((selection, index) => {
            const catalogId = Number(selection.catalogId)
            return (
              <div className="sp-editor-row multi" key={index}>
                <select
                  value={selection.targetType}
                  onChange={(event) =>
                    onDraftCatalogSelectionsChange(
                      draftCatalogSelections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, targetType: event.target.value as DraftCatalogSelection['targetType'] }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="catalog">{ui.catalog}</option>
                  <option value="group">{ui.group}</option>
                  <option value="entry">{ui.entry}</option>
                </select>
                <select
                  value={selection.catalogId}
                  onChange={(event) =>
                    onDraftCatalogSelectionsChange(
                      draftCatalogSelections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, catalogId: event.target.value, catalogEntryGroupId: '', catalogEntryId: '' }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">{ui.chooseCatalog}</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                {selection.targetType === 'group' && (
                  <select
                    value={selection.catalogEntryGroupId}
                    onChange={(event) =>
                      onDraftCatalogSelectionsChange(
                        draftCatalogSelections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, catalogEntryGroupId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{ui.chooseGroup}</option>
                    {(catalogGroupsByCatalogId[catalogId] ?? []).map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
                {selection.targetType === 'entry' && (
                  <select
                    value={selection.catalogEntryId}
                    onChange={(event) =>
                      onDraftCatalogSelectionsChange(
                        draftCatalogSelections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, catalogEntryId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{ui.chooseEntry}</option>
                    {(catalogEntriesByCatalogId[catalogId] ?? []).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => onDraftCatalogSelectionsChange(draftCatalogSelections.filter((_, itemIndex) => itemIndex !== index))}>
                  {ui.delete}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {objectEditorTab === 'hierarchy' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addHierarchySelection}>
            {ui.addHierarchyGroup}
          </button>
          {draftHierarchySelections.map((selection, index) => (
            <div className="sp-editor-block" key={index}>
              <select
                value={selection.groupId}
                onChange={(event) =>
                  onDraftHierarchySelectionsChange(
                    draftHierarchySelections.map((item, itemIndex) =>
                      itemIndex === index ? { groupId: Number(event.target.value), nodeIds: [] } : item,
                    ),
                  )
                }
              >
                <option value={0}>{ui.chooseGroup}</option>
                {hierarchyGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <div className="sp-checkbox-grid">
                {(hierarchyNodesByGroupId[selection.groupId] ?? []).map((node) => (
                  <label key={node.id}>
                    <input
                      type="checkbox"
                      checked={selection.nodeIds.includes(node.id)}
                      onChange={() =>
                        onDraftHierarchySelectionsChange(
                          draftHierarchySelections.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, nodeIds: toggleNumberSelection(item.nodeIds, node.id) }
                              : item,
                          ),
                        )
                      }
                    />
                    {node.name}
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => onDraftHierarchySelectionsChange(draftHierarchySelections.filter((_, itemIndex) => itemIndex !== index))}>
                {ui.removeGroup}
              </button>
            </div>
          ))}
        </div>
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

