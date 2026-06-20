import type { RelationGraphNode, StoryObject } from '../../types'

export const getObjectFullName = (storyObject: Pick<StoryObject, 'name' | 'surname'>) =>
  [storyObject.name, storyObject.surname?.trim()].filter(Boolean).join(' ')

export const getOrganizationSurname = (organization: Pick<StoryObject, 'name' | 'surnameForm'>) =>
  organization.surnameForm?.trim() || organization.name.trim()

export const relationGraphNodeToStoryObject = (node: RelationGraphNode): StoryObject => ({
  id: node.id,
  name: node.name,
  surname: node.surname,
  surnameForm: node.surnameForm,
  description: null,
  age: null,
  role: null,
  currentStatus: null,
  imagePath: node.imagePath,
  typeKey: node.typeKey,
  attributes: [],
  hierarchySelections: [],
  catalogSelections: [],
  ownedItems: [],
  owners: [],
  territoryPlaces: [],
  organizationsOnTerritory: [],
  ownerOrganizations: [],
  ownedTerritories: [],
  hierarchyParents: [],
  hierarchyChildren: [],
  galleryImages: [],
  outgoingCharacterRelationships: [],
  incomingCharacterRelationships: [],
})
