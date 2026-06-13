import type { RelationGraphNode, StoryObject } from './types'

export const getObjectFullName = (storyObject: Pick<StoryObject, 'name' | 'surname'>) =>
  [storyObject.name, storyObject.surname?.trim()].filter(Boolean).join(' ')

export const relationGraphNodeToStoryObject = (node: RelationGraphNode): StoryObject => ({
  id: node.id,
  name: node.name,
  surname: node.surname,
  description: null,
  age: null,
  role: null,
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
