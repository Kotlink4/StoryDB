import type {
  CharacterRelationship,
  ObjectCatalogSelection,
  ObjectTypeKey,
  StructureAssignment,
} from '../../types'

export type CatalogSelectionSnapshot = {
  targetType: ObjectCatalogSelection['targetType']
  catalogId: number
  catalogEntryGroupId: number | null
  catalogEntryId: number | null
}

export type HierarchySelectionSnapshot = {
  groupId: number
  nodeIds: number[]
}

export type RelationshipSnapshot = {
  direction: CharacterRelationship['direction']
  characterId: number
  relationType: string
  strength: number
  tension: number
  isBidirectional: boolean
  description: string
}

export type StructureAssignmentSnapshot = {
  id: number
  projectId: number
  structureUsageId: number
  structureId: number
  structureName: string
  structureNodeId: number
  structureNodeName: string
  targetKind?: StructureAssignment['targetKind']
  targetId?: number
  targetName?: string
  targetTypeKey?: StructureAssignment['targetTypeKey']
  storyObjectId: number | null
  storyObjectName: string | null
  storyObjectTypeKey: ObjectTypeKey | null
  roleLabel: string | null
  notes: string | null
  sortOrder: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

export function isCatalogSelectionSnapshot(value: unknown): value is CatalogSelectionSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.targetType === 'catalog' || value.targetType === 'group' || value.targetType === 'entry') &&
    isNumber(value.catalogId) &&
    isNullableNumber(value.catalogEntryGroupId) &&
    isNullableNumber(value.catalogEntryId)
  )
}

export function isHierarchySelectionSnapshot(value: unknown): value is HierarchySelectionSnapshot {
  return (
    isRecord(value) &&
    isNumber(value.groupId) &&
    Array.isArray(value.nodeIds) &&
    value.nodeIds.every(isNumber)
  )
}

export function isRelationshipSnapshot(value: unknown): value is RelationshipSnapshot {
  return (
    isRecord(value) &&
    (value.direction === 'outgoing' || value.direction === 'incoming') &&
    isNumber(value.characterId) &&
    typeof value.relationType === 'string' &&
    isNumber(value.strength) &&
    isNumber(value.tension) &&
    typeof value.isBidirectional === 'boolean' &&
    typeof value.description === 'string'
  )
}

function isObjectTypeKey(value: unknown): value is ObjectTypeKey {
  return (
    value === 'characters' ||
    value === 'items' ||
    value === 'places' ||
    value === 'organizations' ||
    value === 'hierarchy'
  )
}

export function isStructureAssignmentSnapshot(value: unknown): value is StructureAssignmentSnapshot {
  return (
    isRecord(value) &&
    isNumber(value.id) &&
    isNumber(value.projectId) &&
    isNumber(value.structureUsageId) &&
    isNumber(value.structureId) &&
    isString(value.structureName) &&
    isNumber(value.structureNodeId) &&
    isString(value.structureNodeName) &&
    (value.storyObjectId === null || isNumber(value.storyObjectId)) &&
    isNullableString(value.storyObjectName) &&
    (value.storyObjectTypeKey === null || isObjectTypeKey(value.storyObjectTypeKey)) &&
    (value.targetKind === undefined || value.targetKind === 'storyObject' || value.targetKind === 'catalogEntry') &&
    (value.targetId === undefined || isNumber(value.targetId)) &&
    (value.targetName === undefined || isString(value.targetName)) &&
    (value.targetTypeKey === undefined || value.targetTypeKey === 'catalogEntry' || isObjectTypeKey(value.targetTypeKey)) &&
    isNullableString(value.roleLabel) &&
    isNullableString(value.notes) &&
    isNumber(value.sortOrder)
  )
}
