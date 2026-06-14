import type { SectionIconName } from './components/StylePreviewPrimitives'
import { isStylePreviewObjectSection, type PreviewSection } from './stylePreviewRouting'
import type {
  AttributeDefinitionDraft,
  CatalogFieldDraft,
  ObjectTypeKey,
  StoryProject,
  TimelineEventDraft,
} from './types'

export type PreviewDialogKind =
  | 'auth'
  | 'object'
  | 'project'
  | 'profile'
  | 'detail'
  | 'relationDetail'
  | 'relationLink'
  | 'objectLegacy'
  | 'confirmDeleteProject'
  | 'confirmDeleteObject'
  | 'attributeGroup'
  | 'confirmDeleteAttribute'
  | 'confirmDeleteAttributeGroup'
  | 'catalog'
  | 'catalogGroup'
  | 'confirmDeleteCatalog'
  | 'confirmDeleteCatalogGroup'
  | 'catalogEntry'
  | 'catalogEntryDetail'
  | 'confirmDeleteCatalogEntry'
  | 'timelineEvent'
  | 'timelineEventDetail'
  | 'timelineLink'
  | 'confirmDeleteTimelineEvent'
  | null

export const emptyAttributeDefinitionDraft: AttributeDefinitionDraft = {
  name: '',
  dataType: 'text',
  groupName: '',
  iconKey: '',
  minValue: '',
  maxValue: '',
  unit: '',
  optionsText: '',
}

export const emptyCatalogFieldDraft: CatalogFieldDraft = {
  name: '',
  dataType: 'text',
  isRequired: false,
  minValue: '',
  maxValue: '',
  optionsText: '',
  referenceCatalogId: '',
}

export const emptyTimelineEventDraft: TimelineEventDraft = {
  title: '',
  eventType: 'point',
  parentEventId: '',
  description: '',
  startLabel: '',
  endLabel: '',
  startValue: '',
  endValue: '',
  category: '',
  color: '',
  imagePath: null,
  participants: [],
  changes: [],
}

export const objectSections: Array<{
  key: ObjectTypeKey
  labelKey: 'characters' | 'items' | 'places' | 'organizations'
  icon: SectionIconName
}> = [
  { key: 'characters', labelKey: 'characters', icon: 'characters' },
  { key: 'items', labelKey: 'items', icon: 'items' },
  { key: 'places', labelKey: 'places', icon: 'places' },
  { key: 'organizations', labelKey: 'organizations', icon: 'organizations' },
]

export const defaultProjectObjectTypeKeys: ObjectTypeKey[] = ['characters', 'items', 'places', 'organizations']

export const fallbackObjectTypes: ObjectTypeKey[] = ['characters', 'items', 'places', 'organizations']

export const normalizeProjectObjectTypeKeys = (keys: ObjectTypeKey[]) => {
  const uniqueKeys = new Set(keys.filter((key): key is ObjectTypeKey => defaultProjectObjectTypeKeys.includes(key)))

  return defaultProjectObjectTypeKeys.filter((key) => uniqueKeys.has(key))
}

export const getProjectObjectTypeKeys = (project: StoryProject | null) =>
  project === null
    ? [...defaultProjectObjectTypeKeys]
    : normalizeProjectObjectTypeKeys(
        project.objectTypes
          .filter((objectType) => objectType.isEnabled)
          .map((objectType) => objectType.key),
      )

export const isObjectSection = (section: PreviewSection): section is ObjectTypeKey =>
  section !== 'attributes' && section !== 'catalogs'

export const isPreviewObjectSection = isStylePreviewObjectSection
