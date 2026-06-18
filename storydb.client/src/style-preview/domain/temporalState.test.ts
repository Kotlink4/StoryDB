import { describe, expect, it } from 'vitest'

import { buildProjectSearchGroups } from './projectSearch'
import type { PreviewText } from './stylePreviewI18n'
import {
  resolveObjectsByTypeTemporalState,
  resolveRelationGraphTemporalState,
  resolveStructureAssignmentsTemporalState,
} from './temporalState'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  ObjectTypeKey,
  RelationGraph,
  StoryObject,
  Structure,
  StructureAssignment,
  StructureUsage,
  TimelineChange,
  TimelineEvent,
} from '../../types'

const emptyUi = {
  attributes: 'Attributes',
  catalog: 'Catalog',
  catalogs: 'Catalogs',
  entry: 'Entry',
  group: 'Group',
  main: 'Main',
  relations: 'Relations',
  timeline: 'Timeline',
} as PreviewText

const emptyCatalogEntriesByCatalogId: Record<number, CatalogEntry[]> = {}
const emptyCatalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]> = {}

const makeObject = (
  id: number,
  typeKey: ObjectTypeKey,
  name: string,
  overrides: Partial<StoryObject> = {},
): StoryObject => ({
  id,
  name,
  surname: null,
  surnameForm: null,
  description: null,
  age: null,
  role: null,
  currentStatus: null,
  imagePath: null,
  typeKey,
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
  organizationStructureLevels: [],
  galleryImages: [],
  outgoingCharacterRelationships: [],
  incomingCharacterRelationships: [],
  ...overrides,
})

const makeChange = (
  id: number,
  changeType: TimelineChange['changeType'],
  targetType: string,
  targetId: number,
  fieldName: string,
  newValueJson: string,
): TimelineChange => ({
  id,
  changeType,
  targetType,
  targetId,
  fieldKey: fieldName,
  fieldName,
  oldValueJson: null,
  newValueJson,
  effectiveFromLabel: '100',
  effectiveToLabel: null,
  effectiveFromValue: 100,
  effectiveToValue: null,
  notes: null,
})

const makeEvent = (id: number, startValue: number, changes: TimelineChange[]): TimelineEvent => ({
  id,
  timelineId: 1,
  parentEventId: null,
  title: `Event ${id}`,
  eventType: 'point',
  description: null,
  startLabel: String(startValue),
  endLabel: null,
  startValue,
  endValue: null,
  category: null,
  color: null,
  imagePath: null,
  galleryImages: [],
  participants: [],
  changes,
})

const makeObjectsByType = (objects: StoryObject[]) => ({
  characters: objects.filter((storyObject) => storyObject.typeKey === 'characters'),
  items: objects.filter((storyObject) => storyObject.typeKey === 'items'),
  places: objects.filter((storyObject) => storyObject.typeKey === 'places'),
  organizations: objects.filter((storyObject) => storyObject.typeKey === 'organizations'),
  hierarchy: objects.filter((storyObject) => storyObject.typeKey === 'hierarchy'),
})

describe('temporalState', () => {
  it('resolves object status, catalogs, relations, ownership and location at the selected timeline context', () => {
    const character = makeObject(1, 'characters', 'Lilia', {
      currentStatus: 'Training',
      role: 'Student',
    })
    const sword = makeObject(2, 'items', 'Moon Blade')
    const city = makeObject(3, 'places', 'Capital')
    const ally = makeObject(4, 'characters', 'Ares')
    const objectsByType = makeObjectsByType([character, sword, city, ally])
    const catalogs: Catalog[] = [
      {
        id: 10,
        key: 'factions',
        name: 'Factions',
        description: null,
        isSystem: false,
        supportsHierarchy: false,
        hierarchyMode: 'entries',
      },
    ]
    const catalogEntriesByCatalogId: Record<number, CatalogEntry[]> = {
      10: [
        {
          id: 100,
          entryGroupId: null,
          entryGroupName: null,
          name: 'Royal Guard',
          description: null,
          imagePath: null,
          fieldValues: [],
          parentEntryIds: [],
        },
      ],
    }
    const timelineEvents = [
      makeEvent(1, 100, [
        makeChange(1, 'field', 'storyObject', character.id, 'currentStatus', 'Exiled'),
        makeChange(
          2,
          'catalogSelection',
          'storyObject',
          character.id,
          'catalogSelections',
          JSON.stringify([
            {
              targetType: 'entry',
              catalogId: 10,
              catalogEntryGroupId: null,
              catalogEntryId: 100,
            },
          ]),
        ),
        makeChange(3, 'ownership', 'storyObject', character.id, 'ownedItemIds', JSON.stringify([sword.id])),
        makeChange(4, 'location', 'storyObject', character.id, 'territoryPlaceIds', JSON.stringify([city.id])),
        makeChange(
          5,
          'relationship',
          'storyObject',
          character.id,
          'characterRelationships',
          JSON.stringify([
            {
              direction: 'outgoing',
              characterId: ally.id,
              relationType: 'ally',
              strength: 80,
              tension: 5,
              isBidirectional: true,
              description: 'Shared exile',
            },
          ]),
        ),
      ]),
      makeEvent(2, 120, []),
    ]

    const resolved = resolveObjectsByTypeTemporalState(objectsByType, timelineEvents, '2', {
      catalogEntriesByCatalogId,
      catalogGroupsByCatalogId: emptyCatalogGroupsByCatalogId,
      catalogs,
      hierarchyGroups: [],
      hierarchyNodesByGroupId: {},
    })
    const resolvedCharacter = resolved.characters[0]

    expect(resolvedCharacter.currentStatus).toBe('Exiled')
    expect(resolvedCharacter.catalogSelections[0]?.catalogEntryName).toBe('Royal Guard')
    expect(resolvedCharacter.ownedItems[0]?.name).toBe('Moon Blade')
    expect(resolvedCharacter.territoryPlaces[0]?.name).toBe('Capital')
    expect(resolvedCharacter.outgoingCharacterRelationships[0]?.relationType).toBe('ally')
  })

  it('resolves structure assignment snapshots and rebuilds temporal structure graph edges', () => {
    const character = makeObject(1, 'characters', 'Lilia')
    const organization = makeObject(2, 'organizations', 'House Crowell')
    const objectsByType = makeObjectsByType([character, organization])
    const structure: Structure = {
      id: 7,
      projectId: 1,
      name: 'House hierarchy',
      description: null,
      ownerKind: 'object',
      ownerId: organization.id,
      layoutKind: 'levels',
      nodeBindingMode: 'none',
      catalogSyncMode: 'manual',
      linkedCatalogId: null,
      timelineReferenceCount: 0,
      nodes: [
        {
          id: 70,
          parentNodeId: null,
          linkedCatalogEntryId: null,
          linkedCatalogEntryGroupId: null,
          name: 'Head',
          description: null,
          nodeType: 'rank',
          color: null,
          iconKey: null,
          levelIndex: 0,
          sortOrder: 0,
        },
      ],
      edges: [],
    }
    const usage: StructureUsage = {
      id: 8,
      projectId: 1,
      structureId: structure.id,
      structureName: structure.name,
      targetKind: 'object',
      targetId: organization.id,
      displayName: null,
      notes: null,
      isPrimary: true,
    }
    const baseAssignment: StructureAssignment = {
      id: 9,
      projectId: 1,
      structureUsageId: usage.id,
      structureId: structure.id,
      structureName: structure.name,
      structureNodeId: 70,
      structureNodeName: 'Head',
      storyObjectId: character.id,
      storyObjectName: character.name,
      storyObjectTypeKey: 'characters',
      roleLabel: 'Heir',
      notes: null,
      sortOrder: 0,
    }
    const snapshotAssignment = {
      ...baseAssignment,
      roleLabel: 'Head of House',
    }
    const timelineEvents = [
      makeEvent(1, 100, [
        makeChange(
          1,
          'structureAssignment',
          'storyObject',
          character.id,
          'structureAssignments',
          JSON.stringify([snapshotAssignment]),
        ),
      ]),
      makeEvent(2, 120, []),
    ]

    const resolvedAssignments = resolveStructureAssignmentsTemporalState([baseAssignment], timelineEvents, '2', {
      objectsByType,
      storyObjectId: character.id,
      structuresById: { [structure.id]: structure },
    })
    const graph: RelationGraph = { nodes: [], edges: [] }
    const resolvedGraph = resolveRelationGraphTemporalState(
      graph,
      objectsByType,
      [baseAssignment],
      [usage],
      timelineEvents,
      '2',
      { structuresById: { [structure.id]: structure } },
    )

    expect(resolvedAssignments[0]?.roleLabel).toBe('Head of House')
    expect(resolvedGraph.edges).toContainEqual(
      expect.objectContaining({
        category: 'structure',
        sourceId: character.id,
        targetId: organization.id,
        relationType: 'Head of House',
      }),
    )
  })

  it('searches the resolved current status', () => {
    const storyObject = makeObject(1, 'characters', 'Lilia', {
      currentStatus: 'Exiled heir',
    })
    const groups = buildProjectSearchGroups({
      attributeDefinitions: [],
      attributeGroups: [],
      catalogEntriesByCatalogId: emptyCatalogEntriesByCatalogId,
      catalogGroupsByCatalogId: emptyCatalogGroupsByCatalogId,
      catalogs: [],
      getObjectSectionLabel: () => 'Characters',
      objectsByType: makeObjectsByType([storyObject]),
      query: 'exiled',
      relationGraph: { nodes: [], edges: [] },
      timelineEvents: [],
      ui: emptyUi,
      onOpenAttributes: () => undefined,
      onOpenCatalog: () => undefined,
      onOpenCatalogEntry: () => undefined,
      onOpenObject: () => undefined,
      onOpenRelation: () => undefined,
      onOpenTimelineEvent: () => undefined,
    })

    expect(groups[0]?.results[0]?.title).toBe('Lilia')
    expect(groups[0]?.results[0]?.snippet).toContain('Exiled heir')
  })
})
