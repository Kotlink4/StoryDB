import { getOrganizationSurname } from '../../style-preview/domain/objectDisplay'
import type {
  AttributeDefinition,
  DraftAttribute,
  ObjectTypeKey,
  StoryObject,
} from '../../types'
import type { ImageCropMode } from '../ImageInputs'

export type GroupedDraftAttribute = {
  items: { attribute: DraftAttribute; index: number }[]
  name: string
}

export function buildOrganizationSurnameOptions(organizations: StoryObject[]) {
  return Array.from(
    organizations.reduce((options, organization) => {
      const surname = getOrganizationSurname(organization)
      if (surname.length > 0 && !options.has(surname)) {
        options.set(surname, organization.name)
      }

      return options
    }, new Map<string, string>()),
  ).sort(([leftSurname], [rightSurname]) => leftSurname.localeCompare(rightSurname))
}

export function getObjectImageCropMode(activeType: ObjectTypeKey): ImageCropMode {
  return activeType === 'characters' ? 'portrait' : activeType === 'places' ? 'landscape' : 'square'
}

export function getObjectImageClassName(activeType: ObjectTypeKey) {
  return activeType === 'characters'
    ? 'object-image object-portrait'
    : activeType === 'places'
      ? 'object-image object-landscape'
      : 'object-image object-square'
}

export function getDraftAttributeGroupName(
  attribute: DraftAttribute,
  attributeDefinitions: AttributeDefinition[],
  mainLabel: string,
) {
  const definition = attributeDefinitions.find((item) => item.name === attribute.name)
  return definition?.groupName?.trim() || mainLabel
}

export function groupDraftAttributes(
  draftAttributes: DraftAttribute[],
  attributeDefinitions: AttributeDefinition[],
  mainLabel: string,
) {
  return Array.from(
    draftAttributes.reduce((groups, attribute, index) => {
      const groupName = getDraftAttributeGroupName(attribute, attributeDefinitions, mainLabel)
      const group = groups.get(groupName) ?? { name: groupName, items: [] as GroupedDraftAttribute['items'] }

      group.items.push({ attribute, index })
      groups.set(groupName, group)

      return groups
    }, new Map<string, GroupedDraftAttribute>()),
  ).map(([, group]) => group)
}
