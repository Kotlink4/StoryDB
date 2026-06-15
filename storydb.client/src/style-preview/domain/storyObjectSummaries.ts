import type { StoryObject, StoryObjectSummary } from '../../types'

export const storyObjectSummaryToListItem = (summary: StoryObjectSummary): StoryObject => ({
  ...summary,
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
  organizationStructureLevels: [],
  galleryImages: [],
  outgoingCharacterRelationships: [],
  incomingCharacterRelationships: [],
})

export const storyObjectSummariesToListItems = (summaries: StoryObjectSummary[]) =>
  summaries.map(storyObjectSummaryToListItem)
