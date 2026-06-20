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

export type NewProjectTab = 'details' | 'presets'
export type Theme = 'light' | 'dark'
export type Accent = 'forest' | 'ember' | 'indigo'
export type ProjectStatus = 'Active' | 'Draft' | 'Archived'
export type ProjectVisibility = 'private' | 'publicRead' | 'publicEdit'
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
  visibility: ProjectVisibility
  canEdit: boolean
  canManage: boolean
  objectTypes: ProjectObjectType[]
}

export type TemplatePackScope = 'mine' | 'public' | 'favorites'

export type TemplatePackSummary = {
  attributeCount: number
  catalogCount: number
  structureCount: number
}

export type TemplatePack = {
  id: number
  name: string
  description: string | null
  isPublic: boolean
  isFavorite: boolean
  ownerUserId: number
  ownerDisplayName: string
  sourceProjectId: number | null
  sourceProjectName: string | null
  updatedAt: string
  summary: TemplatePackSummary
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
  surnameForm: string | null
  description: string | null
  age: string | null
  role: string | null
  currentStatus: string | null
  imagePath: string | null
  typeKey: string
  attributes: ObjectAttribute[]
  hierarchySelections: ObjectHierarchySelection[]
  catalogSelections: ObjectCatalogSelection[]
  ownedItems: ObjectReference[]
  owners: ObjectReference[]
  territoryPlaces: ObjectReference[]
  organizationsOnTerritory: ObjectReference[]
  ownerOrganizations: ObjectReference[]
  ownedTerritories: ObjectReference[]
  hierarchyParents: ObjectReference[]
  hierarchyChildren: ObjectReference[]
  galleryImages: ObjectGalleryImage[]
  outgoingCharacterRelationships: CharacterRelationship[]
  incomingCharacterRelationships: CharacterRelationship[]
}

export type StoryObjectSummary = Pick<
  StoryObject,
  | 'id'
  | 'name'
  | 'surname'
  | 'surnameForm'
  | 'description'
  | 'age'
  | 'role'
  | 'currentStatus'
  | 'imagePath'
  | 'typeKey'
  | 'attributes'
>

export type StructureOwnerKind = 'project' | 'catalog' | 'object'
export type StructureApplicationScope = 'characters' | 'items' | 'locations' | 'organizations' | 'catalogEntries'
export type StructureLayoutKind = 'levels' | 'tree' | 'graph'
export type StructureNodeBindingMode = 'none'
export type StructureCatalogSyncMode = 'manual'

export type Structure = {
  id: number
  projectId: number
  name: string
  description: string | null
  ownerKind: StructureOwnerKind
  ownerId: number | null
  applicationScope: StructureApplicationScope
  layoutKind: StructureLayoutKind
  nodeBindingMode: StructureNodeBindingMode
  catalogSyncMode: StructureCatalogSyncMode
  linkedCatalogId: number | null
  timelineReferenceCount: number
  nodes: StructureNode[]
  edges: StructureEdge[]
}

export type StructureSummary = Omit<Structure, 'nodes' | 'edges'> & {
  nodeCount: number
  edgeCount: number
  usageCount: number
}

export type StructureNode = {
  id: number
  parentNodeId: number | null
  linkedCatalogEntryId: number | null
  linkedCatalogEntryGroupId: number | null
  name: string
  description: string | null
  nodeType: string | null
  color: string | null
  iconKey: string | null
  levelIndex: number
  sortOrder: number
}

export type StructureEdge = {
  id: number
  sourceNodeId: number
  targetNodeId: number
  relationType: string
  description: string | null
  sortOrder: number
}

export type StructureUsage = {
  id: number
  projectId: number
  structureId: number
  structureName: string
  targetKind: StructureOwnerKind
  targetId: number
  displayName: string | null
  notes: string | null
  isPrimary: boolean
}

export type StructureAssignment = {
  id: number
  projectId: number
  structureUsageId: number
  structureId: number
  structureName: string
  structureNodeId: number
  structureNodeName: string
  targetKind: 'storyObject' | 'catalogEntry'
  targetId: number
  targetName: string
  targetTypeKey: ObjectTypeKey | 'catalogEntry'
  storyObjectId: number | null
  storyObjectName: string | null
  storyObjectTypeKey: ObjectTypeKey | null
  roleLabel: string | null
  notes: string | null
  sortOrder: number
}

export type StructureDraft = {
  name: string
  description: string
  ownerKind: StructureOwnerKind
  ownerId: number | null
  applicationScope: StructureApplicationScope
  layoutKind: StructureLayoutKind
  nodeBindingMode: StructureNodeBindingMode
  catalogSyncMode: StructureCatalogSyncMode
  linkedCatalogId: number | null
  nodes: StructureNodeDraft[]
  edges: StructureEdgeDraft[]
}

export type StructureDetailsDraft = Pick<StructureDraft, 'name' | 'description'>

export type StructureUsageDraft = {
  targetKind: StructureOwnerKind
  targetId: number
  displayName: string
  notes: string
  isPrimary: boolean
}

export type StructureAssignmentDraft = {
  structureNodeId: number
  storyObjectId?: number | null
  targetKind?: 'storyObject' | 'catalogEntry'
  targetId?: number | null
  roleLabel: string
  notes: string
  sortOrder: number
}

export type StructureNodeDraft = {
  clientId: string
  parentClientId: string | null
  linkedCatalogEntryId: number | null
  linkedCatalogEntryGroupId: number | null
  name: string
  description: string
  nodeType: string
  color: string
  iconKey: string
  levelIndex: number
  sortOrder: number
}

export type StructureNodeDetailsDraft = Pick<StructureNodeDraft, 'name' | 'description' | 'nodeType' | 'color' | 'iconKey'>

export type StructureEdgeDraft = {
  sourceClientId: string
  targetClientId: string
  relationType: string
  description: string
  sortOrder: number
}

export type ObjectGalleryImage = {
  id: number
  imagePath: string
  caption: string | null
  sortOrder: number
}

export type ObjectReference = {
  id: number
  name: string
  imagePath: string | null
  typeKey: string
}

export type CharacterRelationship = {
  id: number
  character: ObjectReference
  relationType: string
  strength: number
  tension: number
  isBidirectional: boolean
  description: string | null
  direction: 'outgoing' | 'incoming'
}

export type RelationGraph = {
  nodes: RelationGraphNode[]
  edges: RelationGraphEdge[]
}

export type RelationGraphNode = {
  id: number
  name: string
  surname: string | null
  surnameForm: string | null
  imagePath: string | null
  typeKey: ObjectTypeKey
}

export type RelationGraphEdge = {
  id: string
  sourceId: number
  targetId: number
  relationType: string
  category: string
  strength: number | null
  tension: number | null
  isBidirectional: boolean
  description: string | null
}

export type RelationGraphLayout = {
  id: number
  projectId: number
  graphKey: string
  algorithmVersion: string
  isDefault: boolean
  isStale: boolean
  generatedAt: string
  items: RelationGraphLayoutItem[]
}

export type RelationGraphLayoutItem = {
  id: number
  storyObjectId: number
  x: number
  y: number
  width: number
  height: number
  isPinned: boolean
}

export type RelationGraphLayoutDraft = {
  graphKey?: string | null
  items: RelationGraphLayoutItemDraft[]
}

export type RelationGraphLayoutItemDraft = {
  storyObjectId: number
  x: number
  y: number
  width: number
  height: number
  isPinned: boolean
}

export type DraftCharacterRelationship = {
  id?: number | null
  sourceCharacterId: string
  targetCharacterId: string
  relationType: string
  strength: string
  tension: string
  isBidirectional: boolean
  description: string
  direction: 'outgoing' | 'incoming'
}

export type RelationLinkDraft = {
  sourceCharacterId: string
  targetCharacterId: string
  relationType: string
  strength: string
  tension: string
  isBidirectional: boolean
  description: string
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

export type DraftCatalogSelection = {
  targetType: CatalogSelectionTargetType
  catalogId: string
  catalogEntryGroupId: string
  catalogEntryId: string
}

export type CatalogSelectionTargetType = 'catalog' | 'group' | 'entry'

export type ObjectHierarchySelection = {
  groupId: number
  groupName: string
  nodes: ObjectHierarchyNodeSelection[]
}

export type ObjectCatalogSelection = {
  targetType: CatalogSelectionTargetType
  catalogId: number
  catalogName: string
  catalogEntryGroupId: number | null
  catalogEntryGroupName: string | null
  catalogEntryId: number | null
  catalogEntryName: string | null
}

export type ObjectHierarchyNodeSelection = {
  id: number
  name: string
}

export type AttributeGroup = {
  id: number
  typeKey: ObjectTypeKey
  name: string
  iconKey: string | null
}

export type AttributeDefinition = {
  id: number
  typeKey: ObjectTypeKey
  name: string
  dataType: AttributeDataType
  groupName: string | null
  iconKey: string | null
  minValue: number | null
  maxValue: number | null
  unit: string | null
  options: string[]
}

export type AttributeDefinitionDraft = {
  name: string
  dataType: AttributeDataType
  groupName: string
  iconKey?: string
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
  | { kind: 'timelineEvent'; item: TimelineEvent }
  | null

export type StoredSettings = {
  language?: Language
  theme?: Theme
  accent?: Accent
}

export type AuthUser = {
  id: number
  email: string
  displayName: string
  avatarImagePath: string | null
  createdAt: string
  updatedAt: string | null
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

export type TimelineEvent = {
  id: number
  timelineId: number
  parentEventId: number | null
  title: string
  eventType: TimelineEventType
  description: string | null
  startLabel: string | null
  endLabel: string | null
  startValue: number | null
  endValue: number | null
  category: string | null
  color: string | null
  imagePath: string | null
  galleryImages: TimelineEventGalleryImage[]
  participants: TimelineParticipant[]
  changes: TimelineChange[]
}

export type TimelineEventGalleryImage = {
  id: number
  imagePath: string
  caption: string | null
  sortOrder: number
}

export type TimelineInfo = {
  id: number
  projectId: number
  name: string
  mode: TimelineMode
  isDefault: boolean
  updatedAt: string
}

export type TimelineMode = 'chapters' | 'freeform' | 'dated'

export type TimelineEventType = 'point' | 'duration' | 'era' | 'chapter'

export type TimelineEventLinkType = 'precedes' | 'causes' | 'simultaneous' | 'partOf' | 'related'

export type TimelineLayout = {
  id: number
  timelineId: number
  algorithmVersion: string
  isStale: boolean
  generatedAt: string
  items: TimelineLayoutItem[]
}

export type TimelineLayoutItem = {
  id: number
  timelineEventId: number
  x: number
  y: number
  width: number
  height: number
  lane: number
  layer: number
  isPinned: boolean
}

export type TimelineLayoutRules = {
  schemaVersion: number
  projectId: number
  algorithmVersion: string
  coordinateStorage: 'project-file' | string
  layoutStateFile: string
  ruleSourceFile: string
  directionPolicy: string
  eventSidePolicy: string
  durationPriorityPolicy: string
  durationOverlapPolicy: string
  durationPointPolicy: string
  independentPointPolicy: string
  horizontalLinkPolicy: string
  verticalLinkPolicy: string
  pointLabelPolicy: string
  eraInteractionPolicy: string
  axisY: number
  eraY: number
  eraHeight: number
  chapterY: number
  chapterHeight: number
  durationTitleHeight: number
  durationPointBandHeight: number
  durationGap: number
  laneStep: number
  pointSize: number
  minimumDurationWidth: number
  updatedAt: string
}

export type TimelineEventLink = {
  id: number
  sourceEventId: number
  targetEventId: number
  linkType: TimelineEventLinkType
  description: string | null
}

export type TimelineEventLinkDraft = {
  sourceEventId: string
  targetEventId: string
  linkType: TimelineEventLinkType
  description: string
}

export type TimelineParticipant = {
  id: number
  targetType: string
  targetId: number
  role: string | null
}

export type TimelineChange = {
  id: number
  changeType: TimelineChangeType
  targetType: string
  targetId: number
  fieldKey: string | null
  fieldName: string | null
  oldValueJson: string | null
  newValueJson: string | null
  effectiveFromLabel: string | null
  effectiveToLabel: string | null
  effectiveFromValue: number | null
  effectiveToValue: number | null
  notes: string | null
}

export type TimelineEventDraft = {
  title: string
  eventType: TimelineEventType
  parentEventId: string
  description: string
  startLabel: string
  endLabel: string
  startValue: string
  endValue: string
  category: string
  color: string
  imagePath: string | null
  participants: TimelineParticipantDraft[]
  changes: TimelineChangeDraft[]
}

export type TimelineParticipantDraft = {
  targetType: string
  targetId: string
  role: string
}

export type TimelineChangeDraft = {
  changeType: TimelineChangeType
  targetType: string
  targetId: string
  fieldName: string
  oldValue: string
  newValue: string
  notes: string
}

export type TimelineChangeType =
  | 'field'
  | 'attribute'
  | 'relationship'
  | 'ownership'
  | 'catalogSelection'
  | 'hierarchySelection'
  | 'location'
  | 'structureAssignment'
  | 'status'
  | 'custom'
