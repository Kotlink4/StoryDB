import type { ReactNode } from 'react'

import { getObjectFullName } from '../../style-preview/domain/objectDisplay'
import {
  getAutomaticOrganizationMembersBySurname,
  getOrganizationMemberItems,
} from '../../style-preview/domain/organizationComposition'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  DraftCharacterRelationship,
  ObjectTypeKey,
  StoryObject,
} from '../../types'

export function ObjectRelationsEditor({
  activeType,
  draftCharacterRelationships,
  editingObjectId,
  objectSurnameForm,
  objectsByType,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  territoryPlaceIds,
  ui,
  onDraftCharacterRelationshipsChange,
  onOwnedItemIdsChange,
  onOwnerCharacterIdsChange,
  onOwnerOrganizationIdsChange,
  onTerritoryPlaceIdsChange,
  toggleNumberSelection,
}: {
  activeType: ObjectTypeKey
  draftCharacterRelationships: DraftCharacterRelationship[]
  editingObjectId: number | null
  objectSurnameForm: string
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  territoryPlaceIds: number[]
  ui: PreviewText
  onDraftCharacterRelationshipsChange: (relationships: DraftCharacterRelationship[]) => void
  onOwnedItemIdsChange: (ids: number[]) => void
  onOwnerCharacterIdsChange: (ids: number[]) => void
  onOwnerOrganizationIdsChange: (ids: number[]) => void
  onTerritoryPlaceIdsChange: (ids: number[]) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
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

  return (
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
            <MultiObjectPicker
              objects={objectsByType.items}
              selectedIds={ownedItemIds}
              ui={ui}
              onChange={onOwnedItemIdsChange}
              toggleNumberSelection={toggleNumberSelection}
            />
          </CollapsibleEditorSection>
        </>
      )}
      {activeType === 'items' && (
        <CollapsibleEditorSection count={ownerCharacterIds.length} title={ui.owners}>
          <MultiObjectPicker
            objects={objectsByType.characters}
            selectedIds={ownerCharacterIds}
            ui={ui}
            onChange={onOwnerCharacterIdsChange}
            toggleNumberSelection={toggleNumberSelection}
          />
        </CollapsibleEditorSection>
      )}
      {activeType === 'places' && (
        <CollapsibleEditorSection count={ownerOrganizationIds.length} title={ui.organizationsOnTerritory}>
          <MultiObjectPicker
            objects={objectsByType.organizations}
            selectedIds={ownerOrganizationIds}
            ui={ui}
            onChange={onOwnerOrganizationIdsChange}
            toggleNumberSelection={toggleNumberSelection}
          />
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
            <MultiObjectPicker
              objects={objectsByType.places}
              selectedIds={territoryPlaceIds}
              ui={ui}
              onChange={onTerritoryPlaceIdsChange}
              toggleNumberSelection={toggleNumberSelection}
            />
          </CollapsibleEditorSection>
        </>
      )}
    </div>
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
