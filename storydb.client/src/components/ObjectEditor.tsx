import type { ReactNode } from 'react'

import { getObjectFullName, getOrganizationSurname } from '../style-preview/domain/objectDisplay'
import {
  getAutomaticOrganizationMembersBySurname,
  getOrganizationMemberItems,
} from '../style-preview/domain/organizationComposition'
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
import { CoverDropzone, type ImageCropMode } from './ImageInputs'
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
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
  const organizationSurnameOptions = Array.from(
    objectsByType.organizations.reduce((options, organization) => {
      const surname = getOrganizationSurname(organization)
      if (surname.length > 0 && !options.has(surname)) {
        options.set(surname, organization.name)
      }

      return options
    }, new Map<string, string>()),
  ).sort(([leftSurname], [rightSurname]) => leftSurname.localeCompare(rightSurname))
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
  const getDraftAttributeGroupName = (attribute: DraftAttribute) => {
    const definition = attributeDefinitions.find((item) => item.name === attribute.name)
    return definition?.groupName?.trim() || ui.main
  }
  const groupedDraftAttributes = Array.from(
    draftAttributes.reduce((groups, attribute, index) => {
      const groupName = getDraftAttributeGroupName(attribute)
      const group = groups.get(groupName) ?? { name: groupName, items: [] as { attribute: DraftAttribute; index: number }[] }

      group.items.push({ attribute, index })
      groups.set(groupName, group)

      return groups
    }, new Map<string, { name: string; items: { attribute: DraftAttribute; index: number }[] }>()),
  ).map(([, group]) => group)
  const removeDraftAttributeGroup = (groupName: string) => {
    onDraftAttributesChange(draftAttributes.filter((attribute) => getDraftAttributeGroupName(attribute) !== groupName))
  }
  const addCatalogSelection = () =>
    onDraftCatalogSelectionsChange([
      ...draftCatalogSelections,
      { targetType: 'catalog', catalogId: '', catalogEntryGroupId: '', catalogEntryId: '' },
    ])
  const addHierarchySelection = () =>
    onDraftHierarchySelectionsChange([...draftHierarchySelections, { groupId: 0, nodeIds: [] }])
  const addRelationship = () =>
    onDraftCharacterRelationshipsChange([
      ...draftCharacterRelationships,
      {
        id: null,
        sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId),
        targetCharacterId: '',
        relationType: '',
        strength: '50',
        tension: '0',
        isBidirectional: true,
        description: '',
        direction: 'outgoing',
      },
    ])
  const updateRelationship = (index: number, patch: Partial<DraftCharacterRelationship>) =>
    onDraftCharacterRelationshipsChange(
      draftCharacterRelationships.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  const getRelationshipCharacterId = (relationship: DraftCharacterRelationship) =>
    relationship.direction === 'incoming' ? relationship.sourceCharacterId : relationship.targetCharacterId
  const updateRelationshipCharacter = (index: number, characterId: string) => {
    const relationship = draftCharacterRelationships[index]

    if (relationship === undefined) {
      return
    }

    updateRelationship(
      index,
      relationship.direction === 'incoming'
        ? { sourceCharacterId: characterId, targetCharacterId: editingObjectId === null ? '' : String(editingObjectId) }
        : { sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId), targetCharacterId: characterId },
    )
  }
  const updateRelationshipDirection = (index: number, direction: DraftCharacterRelationship['direction']) => {
    const relationship = draftCharacterRelationships[index]

    if (relationship === undefined) {
      return
    }

    const relatedCharacterId = getRelationshipCharacterId(relationship)

    updateRelationship(
      index,
      direction === 'incoming'
        ? {
            direction,
            sourceCharacterId: relatedCharacterId,
            targetCharacterId: editingObjectId === null ? '' : String(editingObjectId),
          }
        : {
            direction,
            sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId),
            targetCharacterId: relatedCharacterId,
          },
    )
  }
  const relationshipCharacters = objectsByType.characters.filter((character) => character.id !== editingObjectId)
  const organizationMembers = getAutomaticOrganizationMembersBySurname(objectSurnameForm, objectsByType.characters)
  const organizationMemberItems = getOrganizationMemberItems(organizationMembers)
  const objectImageCropMode: ImageCropMode =
    activeType === 'characters' ? 'portrait' : activeType === 'places' ? 'landscape' : 'square'
  const objectImageClassName =
    activeType === 'characters'
      ? 'object-image object-portrait'
      : activeType === 'places'
        ? 'object-image object-landscape'
        : 'object-image object-square'
  const getTimelineParticipation = (eventId: number) =>
    draftTimelineParticipations.find((participation) => participation.timelineEventId === String(eventId))
  const toggleTimelineParticipation = (eventId: number, isSelected: boolean) => {
    const eventIdText = String(eventId)

    if (isSelected) {
      if (draftTimelineParticipations.some((participation) => participation.timelineEventId === eventIdText)) {
        return
      }

      onDraftTimelineParticipationsChange([
        ...draftTimelineParticipations,
        { timelineEventId: eventIdText, role: '' },
      ])
      return
    }

    onDraftTimelineParticipationsChange(
      draftTimelineParticipations.filter((participation) => participation.timelineEventId !== eventIdText),
    )
  }
  const updateTimelineParticipationRole = (eventId: number, role: string) => {
    const eventIdText = String(eventId)
    const hasParticipation = draftTimelineParticipations.some(
      (participation) => participation.timelineEventId === eventIdText,
    )

    onDraftTimelineParticipationsChange(
      hasParticipation
        ? draftTimelineParticipations.map((participation) =>
            participation.timelineEventId === eventIdText ? { ...participation, role } : participation,
          )
        : [...draftTimelineParticipations, { timelineEventId: eventIdText, role }],
    )
  }

  return (
    <section className="sp-object-editor">
      <div className="sp-object-editor-tabs">
        {[
          ['main', ui.main],
          ['attributes', ui.attributes],
          ['catalogs', ui.catalogs],
          ['relations', ui.relations],
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
        <div className="sp-editor-stack">
          {activeType === 'characters' && (
            <>
              <CollapsibleEditorSection count={draftCharacterRelationships.length} title={ui.relations}>
                <button className="sp-button" type="button" onClick={addRelationship}>
                  {ui.addCharacterRelationship}
                </button>
                {draftCharacterRelationships.map((relationship, index) => (
                  <section className="sp-editor-block sp-relationship-editor" key={`${relationship.id ?? 'new'}-${index}`}>
                    <div className="sp-relationship-grid">
                      <label className="sp-relationship-field">
                        {ui.relationDirection}
                        <select
                          value={relationship.direction}
                          onChange={(event) =>
                            updateRelationshipDirection(index, event.target.value as DraftCharacterRelationship['direction'])
                          }
                        >
                          <option value="outgoing">{ui.fromThisCharacter}</option>
                          <option value="incoming" disabled={editingObjectId === null}>
                            {ui.toThisCharacter}
                          </option>
                        </select>
                      </label>
                      <label className="sp-relationship-field">
                        {ui.character}
                        <select
                          value={getRelationshipCharacterId(relationship)}
                          onChange={(event) => updateRelationshipCharacter(index, event.target.value)}
                        >
                          <option value="">{ui.characters}</option>
                          {relationshipCharacters.map((character) => (
                            <option key={character.id} value={character.id}>
                              {getObjectFullName(character)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="sp-relationship-field">
                        {ui.relationType}
                        <input
                          placeholder={ui.relationTypePlaceholder}
                          value={relationship.relationType}
                          onChange={(event) => updateRelationship(index, { relationType: event.target.value })}
                        />
                      </label>
                      <button
                        className="sp-relationship-delete"
                        type="button"
                        onClick={() =>
                          onDraftCharacterRelationshipsChange(
                            draftCharacterRelationships.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        {ui.delete}
                      </button>
                    </div>
                    <div className="sp-relationship-stats">
                      <label className="sp-relationship-field">
                        {ui.relationStrength}
                        <input
                          min={0}
                          max={100}
                          type="number"
                          value={relationship.strength}
                          onChange={(event) => updateRelationship(index, { strength: event.target.value })}
                        />
                      </label>
                      <label className="sp-relationship-field">
                        {ui.relationTension}
                        <input
                          min={0}
                          max={100}
                          type="number"
                          value={relationship.tension}
                          onChange={(event) => updateRelationship(index, { tension: event.target.value })}
                        />
                      </label>
                      <label className="sp-checkline sp-relationship-toggle">
                        <input
                          checked={relationship.isBidirectional}
                          type="checkbox"
                          onChange={(event) => updateRelationship(index, { isBidirectional: event.target.checked })}
                        />
                        {ui.relationBidirectional}
                      </label>
                    </div>
                    <label className="sp-relationship-description">
                      {ui.relationDescription}
                      <textarea
                        value={relationship.description}
                        onChange={(event) => updateRelationship(index, { description: event.target.value })}
                      />
                    </label>
                  </section>
                ))}
              </CollapsibleEditorSection>
              <CollapsibleEditorSection count={ownedItemIds.length} title={ui.characterOwnsItems}>
                <MultiObjectPicker objects={objectsByType.items} selectedIds={ownedItemIds} ui={ui} onChange={onOwnedItemIdsChange} toggleNumberSelection={toggleNumberSelection} />
              </CollapsibleEditorSection>
            </>
          )}
          {activeType === 'items' && (
            <CollapsibleEditorSection count={ownerCharacterIds.length} title={ui.owners}>
              <MultiObjectPicker objects={objectsByType.characters} selectedIds={ownerCharacterIds} ui={ui} onChange={onOwnerCharacterIdsChange} toggleNumberSelection={toggleNumberSelection} />
            </CollapsibleEditorSection>
          )}
          {activeType === 'places' && (
            <CollapsibleEditorSection count={ownerOrganizationIds.length} title={ui.organizationsOnTerritory}>
              <MultiObjectPicker objects={objectsByType.organizations} selectedIds={ownerOrganizationIds} ui={ui} onChange={onOwnerOrganizationIdsChange} toggleNumberSelection={toggleNumberSelection} />
            </CollapsibleEditorSection>
          )}
          {activeType === 'organizations' && (
            <>
              <CollapsibleEditorSection count={organizationMembers.length} title={ui.organizationMembers}>
                <p className="sp-editor-hint">{ui.organizationSurnameAutoAssignHint}</p>
                <ReadOnlyObjectList emptyText={ui.noOrganizationMembers} objects={organizationMembers} />
              </CollapsibleEditorSection>
              <CollapsibleEditorSection count={organizationMemberItems.length} title={ui.organizationItems}>
                <ReadOnlyObjectList emptyText={ui.noOrganizationItems} objects={organizationMemberItems} />
              </CollapsibleEditorSection>
              <CollapsibleEditorSection count={territoryPlaceIds.length} title={ui.organizationTerritories}>
                <MultiObjectPicker objects={objectsByType.places} selectedIds={territoryPlaceIds} ui={ui} onChange={onTerritoryPlaceIdsChange} toggleNumberSelection={toggleNumberSelection} />
              </CollapsibleEditorSection>
            </>
          )}
        </div>
      )}

      {objectEditorTab === 'timeline' && (
        <div className="sp-editor-stack">
          <label className="sp-checkline">
            <input
              checked={saveObjectAsTimelineChange}
              type="checkbox"
              onChange={(event) => onSaveObjectAsTimelineChange(event.target.checked)}
            />
            {ui.saveTimelineChange}
          </label>
          <select value={editorTimelineEventId} onChange={(event) => onEditorTimelineEventIdChange(event.target.value)}>
            <option value="">{ui.chooseEvent}</option>
            {timelineEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <section className="sp-editor-block">
            <strong>{ui.timelineParticipation}</strong>
            {timelineEvents.length === 0 ? (
              <p className="sp-editor-hint">{ui.noEvents}</p>
            ) : (
              <div className="sp-timeline-participation-list">
                {timelineEvents.map((event) => {
                  const participation = getTimelineParticipation(event.id)
                  const isSelected = participation !== undefined

                  return (
                    <div className="sp-timeline-participation-row" key={event.id}>
                      <label className="sp-checkline">
                        <input
                          checked={isSelected}
                          type="checkbox"
                          onChange={(inputEvent) => toggleTimelineParticipation(event.id, inputEvent.target.checked)}
                        />
                        <span>
                          <strong>{event.title}</strong>
                          <em>{[event.startLabel, event.endLabel].filter(Boolean).join(' - ') || event.category || ui.timelineEvent}</em>
                        </span>
                      </label>
                      <input
                        disabled={!isSelected}
                        placeholder={ui.timelineRolePlaceholder}
                        value={participation?.role ?? ''}
                        onChange={(inputEvent) => updateTimelineParticipationRole(event.id, inputEvent.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
          <p className="sp-editor-hint">
            {ui.timelineParticipationHint}
          </p>
        </div>
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

function MultiObjectPicker({
  objects,
  selectedIds,
  ui,
  onChange,
  toggleNumberSelection,
}: {
  objects: StoryObject[]
  selectedIds: number[]
  ui: PreviewText
  onChange: (ids: number[]) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
  return (
    <div className="sp-checkbox-grid">
      {objects.map((storyObject) => (
        <label key={storyObject.id}>
          <input
            checked={selectedIds.includes(storyObject.id)}
            type="checkbox"
            onChange={() => onChange(toggleNumberSelection(selectedIds, storyObject.id))}
          />
          {storyObject.name}
        </label>
      ))}
      {objects.length === 0 && <span>{ui.noAvailableObjects}</span>}
    </div>
  )
}

function CollapsibleEditorSection({
  children,
  count,
  title,
}: {
  children: ReactNode
  count: number
  title: string
}) {
  return (
    <details className="sp-editor-block sp-collapsible-section" open>
      <summary>
        <span>{title}</span>
        <strong>{count}</strong>
      </summary>
      {children}
    </details>
  )
}

function ReadOnlyObjectList({
  emptyText,
  objects,
}: {
  emptyText: string
  objects: Array<Pick<StoryObject, 'id' | 'name' | 'typeKey'> & { ownerName?: string }>
}) {
  if (objects.length === 0) {
    return <p className="sp-editor-hint">{emptyText}</p>
  }

  return (
    <div className="sp-readonly-object-list">
      {objects.map((storyObject) => (
        <div className="sp-readonly-object-row" key={storyObject.id}>
          <span>{storyObject.ownerName ?? storyObject.typeKey}</span>
          <strong>{storyObject.name}</strong>
        </div>
      ))}
    </div>
  )
}



