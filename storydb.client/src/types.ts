export type Language = 'en' | 'ru'

export type Dialog =
  | 'settings'
  | 'auth'
  | 'newProject'
  | 'editProject'
  | 'character'
  | 'newCharacter'
  | 'editCharacter'
  | null

export type NewProjectTab = 'details' | 'modules'
export type Theme = 'light' | 'dark'
export type Accent = 'forest' | 'ember' | 'indigo'
export type ProjectStatus = 'Active' | 'Draft' | 'Archived'
export type ObjectTypeKey = 'characters' | 'items' | 'places' | 'organizations' | 'hierarchy'
export type WorkspaceSection = ObjectTypeKey | 'attributes' | 'catalogs'
export type WorkspaceTab = 'database' | 'relations' | 'timeline'
export type ModuleSubTab = 'cards' | 'attributes' | 'attributeGroup'
export type LayoutMode = 'grid' | 'list'
export type CatalogPanelPage = 'catalog' | 'group' | 'entry' | 'entryForm' | 'template'
export type AttributeDataType = 'text' | 'number' | 'select'
export type CatalogFieldDataType =
  | 'text'
  | 'longText'
  | 'number'
  | 'select'
  | 'entryReference'
  | 'multipleEntryReference'
export type InlineNameEdit =
  | { kind: 'catalog'; id: number }
  | { kind: 'catalogEntryGroup'; id: number }
  | null

export type StoryProject = {
  id: number
  name: string
  coverImagePath: string | null
  objectCount: number
  updatedAt: string
  objectTypes: ProjectObjectType[]
}

export type ProjectObjectType = {
  key: ObjectTypeKey
  name: string
  isEnabled: boolean
}

export type StoryObject = {
  id: number
  name: string
  surname: string | null
  description: string | null
  age: string | null
  role: string | null
  imagePath: string | null
  typeKey: string
  attributes: ObjectAttribute[]
  hierarchySelections: ObjectHierarchySelection[]
}

export type ObjectAttribute = {
  id: number
  attributeDefinitionId: number
  name: string
  value: string | null
}

export type DraftAttribute = {
  name: string
  value: string
}

export type DraftHierarchySelection = {
  groupId: number
  nodeIds: number[]
}

export type ObjectHierarchySelection = {
  groupId: number
  groupName: string
  nodes: ObjectHierarchyNodeSelection[]
}

export type ObjectHierarchyNodeSelection = {
  id: number
  name: string
}

export type AttributeGroup = {
  id: number
  typeKey: ObjectTypeKey
  name: string
}

export type AttributeDefinition = {
  id: number
  typeKey: ObjectTypeKey
  name: string
  dataType: AttributeDataType
  groupName: string | null
  minValue: number | null
  maxValue: number | null
  unit: string | null
  options: string[]
}

export type AttributeDefinitionDraft = {
  name: string
  dataType: AttributeDataType
  groupName: string
  minValue: string
  maxValue: string
  unit: string
  optionsText: string
}

export type PendingDelete =
  | { kind: 'project'; item: StoryProject }
  | { kind: 'object'; item: StoryObject }
  | { kind: 'catalog'; item: Catalog }
  | { kind: 'catalogEntryGroup'; item: CatalogEntryGroup }
  | { kind: 'catalogEntry'; item: CatalogEntry }
  | null

export type StoredSettings = {
  language?: Language
  theme?: Theme
  accent?: Accent
}


export type HierarchyGroup = {
  id: number
  name: string
  nodeCount: number
}

export type HierarchyNode = {
  id: number
  name: string
  description: string | null
  parentNodeIds: number[]
  childNodeIds: number[]
}

export type Catalog = {
  id: number
  key: string
  name: string
  description: string | null
  isSystem: boolean
  supportsHierarchy: boolean
  hierarchyMode: CatalogHierarchyMode
}

export type CatalogHierarchyMode = 'entries' | 'entriesInGroup' | 'groups'

export type CatalogEntry = {
  id: number
  name: string
  description: string | null
  imagePath: string | null
  entryGroupId: number | null
  entryGroupName: string | null
  parentEntryIds: number[]
  fieldValues: CatalogEntryFieldValue[]
}

export type CatalogEntryFieldValue = {
  fieldDefinitionId: number
  value: string | null
  referencedEntryIds: number[]
}

export type CatalogEntryGroup = {
  id: number
  name: string
  parentGroupIds: number[]
}

export type CatalogFieldDefinition = {
  id: number
  name: string
  dataType: CatalogFieldDataType
  isRequired: boolean
  fieldGroupId: number | null
  fieldGroupName: string | null
  minValue: number | null
  maxValue: number | null
  options: string[]
  referenceCatalogId: number | null
}

export type CatalogFieldDraft = {
  name: string
  dataType: CatalogFieldDataType
  isRequired: boolean
  minValue: string
  maxValue: string
  optionsText: string
  referenceCatalogId: string
}

export type CatalogEntryDraft = {
  name: string
  description: string
  imagePath: string | null
  entryGroupId: string
  parentEntryIds: number[]
  fieldValues: Record<number, string>
}
