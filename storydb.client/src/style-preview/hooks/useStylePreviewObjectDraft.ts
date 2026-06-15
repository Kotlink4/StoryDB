import { useState } from 'react'

import type { DraftTimelineParticipation, ObjectEditorTab } from '../domain/stylePreviewUiTypes'
import type {
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  StoryObject,
  TimelineEvent,
} from '../../types'

export function useStylePreviewObjectDraft() {
  const [editingObjectId, setEditingObjectId] = useState<number | null>(null)
  const [objectName, setObjectName] = useState('')
  const [objectSurname, setObjectSurname] = useState('')
  const [objectSurnameForm, setObjectSurnameForm] = useState('')
  const [objectRole, setObjectRole] = useState('')
  const [objectCurrentStatus, setObjectCurrentStatus] = useState('')
  const [objectAge, setObjectAge] = useState('')
  const [objectDescription, setObjectDescription] = useState('')
  const [objectImagePath, setObjectImagePath] = useState<string | null>(null)
  const [objectEditorTab, setObjectEditorTab] = useState<ObjectEditorTab>('main')
  const [draftAttributes, setDraftAttributes] = useState<DraftAttribute[]>([])
  const [draftHierarchySelections, setDraftHierarchySelections] = useState<DraftHierarchySelection[]>([])
  const [draftCatalogSelections, setDraftCatalogSelections] = useState<DraftCatalogSelection[]>([])
  const [draftCharacterRelationships, setDraftCharacterRelationships] = useState<DraftCharacterRelationship[]>([])
  const [ownedItemIds, setOwnedItemIds] = useState<number[]>([])
  const [ownerCharacterIds, setOwnerCharacterIds] = useState<number[]>([])
  const [territoryPlaceIds, setTerritoryPlaceIds] = useState<number[]>([])
  const [ownerOrganizationIds, setOwnerOrganizationIds] = useState<number[]>([])
  const [parentObjectIds, setParentObjectIds] = useState<number[]>([])
  const [editorTimelineEventId, setEditorTimelineEventId] = useState('')
  const [saveObjectAsTimelineChange, setSaveObjectAsTimelineChange] = useState(false)
  const [draftTimelineParticipations, setDraftTimelineParticipations] = useState<DraftTimelineParticipation[]>([])

  const resetObjectForm = () => {
    setEditingObjectId(null)
    setObjectName('')
    setObjectSurname('')
    setObjectSurnameForm('')
    setObjectRole('')
    setObjectCurrentStatus('')
    setObjectAge('')
    setObjectDescription('')
    setObjectImagePath(null)
    setObjectEditorTab('main')
    setDraftAttributes([])
    setDraftHierarchySelections([])
    setDraftCatalogSelections([])
    setDraftCharacterRelationships([])
    setOwnedItemIds([])
    setOwnerCharacterIds([])
    setTerritoryPlaceIds([])
    setOwnerOrganizationIds([])
    setParentObjectIds([])
    setEditorTimelineEventId('')
    setSaveObjectAsTimelineChange(false)
    setDraftTimelineParticipations([])
  }

  const fillObjectForm = (objectToEdit: StoryObject, timelineEvents: TimelineEvent[]) => {
    setEditingObjectId(objectToEdit.id)
    setObjectName(objectToEdit.name)
    setObjectSurname(objectToEdit.surname ?? '')
    setObjectSurnameForm(objectToEdit.surnameForm ?? '')
    setObjectRole(objectToEdit.role ?? '')
    setObjectCurrentStatus(objectToEdit.currentStatus ?? '')
    setObjectAge(objectToEdit.age ?? '')
    setObjectDescription(objectToEdit.description ?? '')
    setObjectImagePath(objectToEdit.imagePath)
    setObjectEditorTab('main')
    setDraftAttributes(objectToEdit.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value ?? '' })))
    setDraftHierarchySelections(
      objectToEdit.hierarchySelections.map((selection) => ({
        groupId: selection.groupId,
        nodeIds: selection.nodes.map((node) => node.id),
      })),
    )
    setDraftCatalogSelections(
      objectToEdit.catalogSelections.map((selection) => ({
        targetType: selection.targetType,
        catalogId: String(selection.catalogId),
        catalogEntryGroupId: selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
        catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
      })),
    )
    setDraftCharacterRelationships([
      ...objectToEdit.outgoingCharacterRelationships.map((relationship) => ({
        id: relationship.id,
        sourceCharacterId: String(objectToEdit.id),
        targetCharacterId: String(relationship.character.id),
        relationType: relationship.relationType,
        strength: String(relationship.strength),
        tension: String(relationship.tension),
        isBidirectional: relationship.isBidirectional,
        description: relationship.description ?? '',
        direction: 'outgoing' as const,
      })),
      ...objectToEdit.incomingCharacterRelationships.map((relationship) => ({
        id: relationship.id,
        sourceCharacterId: String(relationship.character.id),
        targetCharacterId: String(objectToEdit.id),
        relationType: relationship.relationType,
        strength: String(relationship.strength),
        tension: String(relationship.tension),
        isBidirectional: relationship.isBidirectional,
        description: relationship.description ?? '',
        direction: 'incoming' as const,
      })),
    ])
    setOwnedItemIds(objectToEdit.ownedItems.map((item) => item.id))
    setOwnerCharacterIds(objectToEdit.owners.map((owner) => owner.id))
    setTerritoryPlaceIds(objectToEdit.territoryPlaces.map((place) => place.id))
    setOwnerOrganizationIds(objectToEdit.ownerOrganizations.map((organization) => organization.id))
    setParentObjectIds(objectToEdit.hierarchyParents.map((parent) => parent.id))
    setDraftTimelineParticipations(
      timelineEvents
        .filter((event) =>
          event.participants.some(
            (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
          ),
        )
        .map((event) => ({
          timelineEventId: String(event.id),
          role:
            event.participants.find(
              (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
            )?.role ?? '',
        })),
    )
  }

  return {
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    draftTimelineParticipations,
    editingObjectId,
    editorTimelineEventId,
    fillObjectForm,
    objectAge,
    objectCurrentStatus,
    objectDescription,
    objectEditorTab,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    parentObjectIds,
    resetObjectForm,
    saveObjectAsTimelineChange,
    setDraftAttributes,
    setDraftCatalogSelections,
    setDraftCharacterRelationships,
    setDraftHierarchySelections,
    setDraftTimelineParticipations,
    setEditorTimelineEventId,
    setObjectAge,
    setObjectCurrentStatus,
    setObjectDescription,
    setObjectEditorTab,
    setObjectImagePath,
    setObjectName,
    setObjectRole,
    setObjectSurname,
    setObjectSurnameForm,
    setOwnedItemIds,
    setOwnerCharacterIds,
    setOwnerOrganizationIds,
    setParentObjectIds,
    setSaveObjectAsTimelineChange,
    setTerritoryPlaceIds,
    territoryPlaceIds,
  }
}
