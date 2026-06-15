import type { PreviewText } from './stylePreviewI18n'
import type { RelationGraphEdge } from '../../types'

export const getObjectRelationLabels = (ui: PreviewText): Record<string, string> => ({
  hierarchyParent: ui.hierarchyParentLabel,
  locatedOnTerritory: ui.territoryLocationLabel,
  organizationMembership: ui.organizationMembership,
  territoryOwner: ui.territoryOwnerLabel,
})

export const getRelationLabel = (relationType: string, ui: PreviewText) =>
  getObjectRelationLabels(ui)[relationType] ?? relationType

export const getRelationCategoryLabel = (category: RelationGraphEdge['category'], ui: PreviewText) => {
  if (category === 'character') {
    return ui.relationCharacters
  }

  if (category === 'ownership') {
    return ui.relationOwnership
  }

  if (category === 'membership') {
    return ui.relationMembership
  }

  if (category === 'object') {
    return ui.relationObject
  }

  return category
}
