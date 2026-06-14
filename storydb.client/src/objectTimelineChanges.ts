import type {
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  StoryObject,
  TimelineChangeDraft,
} from './types'

const normalizeTimelineChangeText = (value: string | null | undefined) => {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue.length === 0 ? '' : normalizedValue
}

const stableJson = (value: unknown) => JSON.stringify(value)

export function buildObjectTimelineChanges({
  baseObject,
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  objectAge,
  objectDescription,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  parentObjectIds,
  targetObjectId,
  territoryPlaceIds,
}: {
  baseObject: StoryObject
  draftAttributes: DraftAttribute[]
  draftCatalogSelections: DraftCatalogSelection[]
  draftCharacterRelationships: DraftCharacterRelationship[]
  draftHierarchySelections: DraftHierarchySelection[]
  objectAge: string
  objectDescription: string
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  parentObjectIds: number[]
  targetObjectId: number
  territoryPlaceIds: number[]
}): TimelineChangeDraft[] {
  const changes: TimelineChangeDraft[] = []
  const addChange = (
    changeType: TimelineChangeDraft['changeType'],
    fieldName: string,
    oldValue: string | null | undefined,
    newValue: string | null | undefined,
    notes = '',
  ) => {
    const normalizedOldValue = normalizeTimelineChangeText(oldValue)
    const normalizedNewValue = normalizeTimelineChangeText(newValue)

    if (normalizedOldValue === normalizedNewValue) {
      return
    }

    changes.push({
      changeType,
      targetType: 'storyObject',
      targetId: String(targetObjectId),
      fieldName,
      oldValue: normalizedOldValue,
      newValue: normalizedNewValue,
      notes,
    })
  }

  addChange('field', 'name', baseObject.name, objectName)
  addChange('field', 'surname', baseObject.surname, objectSurname)
  addChange('field', 'description', baseObject.description, objectDescription)
  addChange('field', 'age', baseObject.age, objectAge)
  addChange('field', 'role', baseObject.role, objectRole)
  addChange('field', 'imagePath', baseObject.imagePath, objectImagePath)

  const currentAttributes = new Map(
    baseObject.attributes.map((attribute) => [attribute.name.trim().toLowerCase(), attribute.value ?? '']),
  )
  const nextAttributes = new Map(
    draftAttributes
      .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
      .filter((attribute) => attribute.name.length > 0)
      .map((attribute) => [attribute.name.toLowerCase(), attribute.value] as const),
  )
  const attributeNames = new Set([...currentAttributes.keys(), ...nextAttributes.keys()])

  attributeNames.forEach((attributeKey) => {
    const displayName =
      draftAttributes.find((attribute) => attribute.name.trim().toLowerCase() === attributeKey)?.name.trim() ||
      baseObject.attributes.find((attribute) => attribute.name.trim().toLowerCase() === attributeKey)?.name ||
      attributeKey

    addChange('attribute', displayName, currentAttributes.get(attributeKey), nextAttributes.get(attributeKey))
  })

  const currentCatalogSelections = baseObject.catalogSelections
    .map((selection) => ({
      targetType: selection.targetType,
      catalogId: selection.catalogId,
      catalogEntryGroupId: selection.catalogEntryGroupId,
      catalogEntryId: selection.catalogEntryId,
    }))
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))
  const nextCatalogSelections = draftCatalogSelections
    .filter((selection) => selection.catalogId.trim().length > 0)
    .map((selection) => ({
      targetType: selection.targetType,
      catalogId: Number(selection.catalogId),
      catalogEntryGroupId:
        selection.catalogEntryGroupId.trim().length === 0 ? null : Number(selection.catalogEntryGroupId),
      catalogEntryId: selection.catalogEntryId.trim().length === 0 ? null : Number(selection.catalogEntryId),
    }))
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))

  addChange(
    'catalogSelection',
    'catalogSelections',
    stableJson(currentCatalogSelections),
    stableJson(nextCatalogSelections),
  )

  const currentHierarchySelections = baseObject.hierarchySelections
    .map((selection) => ({
      groupId: selection.groupId,
      nodeIds: selection.nodes.map((node) => node.id).sort((left, right) => left - right),
    }))
    .sort((left, right) => left.groupId - right.groupId)
  const nextHierarchySelections = draftHierarchySelections
    .filter((selection) => selection.groupId > 0)
    .map((selection) => ({
      groupId: selection.groupId,
      nodeIds: [...selection.nodeIds].sort((left, right) => left - right),
    }))
    .sort((left, right) => left.groupId - right.groupId)

  addChange(
    'hierarchySelection',
    'hierarchySelections',
    stableJson(currentHierarchySelections),
    stableJson(nextHierarchySelections),
  )

  addChange(
    'ownership',
    'ownedItemIds',
    stableJson(baseObject.ownedItems.map((item) => item.id).sort((left, right) => left - right)),
    stableJson([...ownedItemIds].sort((left, right) => left - right)),
  )
  addChange(
    'ownership',
    'ownerCharacterIds',
    stableJson(baseObject.owners.map((owner) => owner.id).sort((left, right) => left - right)),
    stableJson([...ownerCharacterIds].sort((left, right) => left - right)),
  )
  addChange(
    'location',
    'territoryPlaceIds',
    stableJson(baseObject.territoryPlaces.map((place) => place.id).sort((left, right) => left - right)),
    stableJson([...territoryPlaceIds].sort((left, right) => left - right)),
  )
  addChange(
    'ownership',
    'ownerOrganizationIds',
    stableJson(baseObject.ownerOrganizations.map((organization) => organization.id).sort((left, right) => left - right)),
    stableJson([...ownerOrganizationIds].sort((left, right) => left - right)),
  )
  addChange(
    'hierarchySelection',
    'parentObjectIds',
    stableJson(baseObject.hierarchyParents.map((parent) => parent.id).sort((left, right) => left - right)),
    stableJson([...parentObjectIds].sort((left, right) => left - right)),
  )

  const currentRelationships = [
    ...baseObject.outgoingCharacterRelationships.map((relationship) => ({
      direction: 'outgoing',
      characterId: relationship.character.id,
      relationType: relationship.relationType,
      strength: relationship.strength,
      tension: relationship.tension,
      isBidirectional: relationship.isBidirectional,
      description: relationship.description ?? '',
    })),
    ...baseObject.incomingCharacterRelationships.map((relationship) => ({
      direction: 'incoming',
      characterId: relationship.character.id,
      relationType: relationship.relationType,
      strength: relationship.strength,
      tension: relationship.tension,
      isBidirectional: relationship.isBidirectional,
      description: relationship.description ?? '',
    })),
  ].sort((left, right) => stableJson(left).localeCompare(stableJson(right)))
  const nextRelationships = draftCharacterRelationships
    .map((relationship) => ({
      direction: relationship.direction,
      characterId: Number(
        relationship.direction === 'incoming' ? relationship.sourceCharacterId : relationship.targetCharacterId,
      ),
      relationType: relationship.relationType.trim(),
      strength: Number(relationship.strength),
      tension: Number(relationship.tension),
      isBidirectional: relationship.isBidirectional,
      description: relationship.description.trim(),
    }))
    .filter((relationship) => Number.isInteger(relationship.characterId) && relationship.characterId > 0)
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))

  addChange('relationship', 'characterRelationships', stableJson(currentRelationships), stableJson(nextRelationships))

  return changes
}
