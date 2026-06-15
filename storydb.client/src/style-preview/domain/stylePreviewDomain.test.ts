import { describe, expect, it } from 'vitest'

import { getObjectFullName, getOrganizationSurname, relationGraphNodeToStoryObject } from './objectDisplay'
import { getFilteredStoryObjects } from './objectFilters'
import {
  calculateObjectGridColumns,
  calculateObjectListVirtualWindow,
  getObjectGridCardHeight,
} from './objectListVirtualization'
import { storyObjectSummaryToListItem } from './storyObjectSummaries'
import { getInitials } from './previewDisplay'
import { getRelationCategoryLabel, getRelationLabel } from './relationDisplay'
import type { PreviewText } from './stylePreviewI18n'
import { buildStylePreviewPath, parseStylePreviewPath } from './stylePreviewRouting'
import {
  validateAttributeDefinitionDraft,
  validateCatalogFieldDraft,
  validateObjectDraft,
  validateRelationLinkDraft,
  validateTimelineEventDraft,
} from '../../validation'
import type {
  AttributeDefinitionDraft,
  CatalogFieldDraft,
  RelationGraphNode,
  RelationLinkDraft,
  StoryObject,
  StoryObjectSummary,
  TimelineEventDraft,
} from '../../types'

const ui = {
  hierarchyParentLabel: 'Parent',
  organizationMembership: 'Membership',
  relationCharacters: 'Characters',
  relationMembership: 'Membership',
  relationObject: 'Objects',
  relationOwnership: 'Ownership',
  relationStructure: 'Structure',
  territoryLocationLabel: 'Located on',
  territoryOwnerLabel: 'Owner',
} as unknown as PreviewText

const makeTimelineDraft = (overrides: Partial<TimelineEventDraft> = {}): TimelineEventDraft => ({
  title: 'Event',
  eventType: 'point',
  parentEventId: '',
  description: '',
  startLabel: '100',
  endLabel: '',
  startValue: '100',
  endValue: '',
  category: '',
  color: '',
  imagePath: null,
  participants: [],
  changes: [],
  ...overrides,
})

describe('style preview routing', () => {
  it('builds and parses object, catalog, relation and utility routes', () => {
    expect(buildStylePreviewPath(3, 'database', 'characters', 12)).toBe(
      '/style-preview/projects/3/database/characters/objects/12',
    )
    expect(buildStylePreviewPath(3, 'database', 'catalogs', null, 5)).toBe('/style-preview/projects/3/catalogs/5')
    expect(buildStylePreviewPath(3, 'relations')).toBe('/style-preview/projects/3/relations')

    expect(parseStylePreviewPath('/style-preview/projects/3/database/items/objects/9')).toEqual({
      activeSection: 'items',
      activeTab: 'database',
      catalogId: null,
      objectId: 9,
      projectId: 3,
      utilityPage: null,
    })
    expect(parseStylePreviewPath('/style-preview/profile').utilityPage).toBe('profile')
  })
})

describe('style preview display helpers', () => {
  it('formats object names, organization surnames, initials and relation labels', () => {
    const node: RelationGraphNode = {
      id: 1,
      imagePath: null,
      name: 'Lilia',
      surname: 'Crowell',
      surnameForm: null,
      typeKey: 'characters',
    }

    expect(getObjectFullName({ name: 'Lilia', surname: ' Crowell ' })).toBe('Lilia Crowell')
    expect(getOrganizationSurname({ name: 'House Crowell', surnameForm: 'Crowell' })).toBe('Crowell')
    expect(getInitials('House Crowell', 2)).toBe('HC')
    expect(relationGraphNodeToStoryObject(node).currentStatus).toBeNull()
    expect(getRelationLabel('territoryOwner', ui)).toBe('Owner')
    expect(getRelationCategoryLabel('structure', ui)).toBe('Structure')
  })
})

describe('object list virtualization', () => {
  it('calculates responsive grid columns from available width', () => {
    expect(calculateObjectGridColumns(179)).toBe(1)
    expect(calculateObjectGridColumns(388)).toBe(2)
    expect(calculateObjectGridColumns(776)).toBe(4)
  })

  it('uses stable virtual row heights by object type', () => {
    expect(getObjectGridCardHeight('characters')).toBeGreaterThan(getObjectGridCardHeight('places'))
    expect(getObjectGridCardHeight('items')).toBe(getObjectGridCardHeight('organizations'))
    expect(getObjectGridCardHeight(null)).toBeGreaterThan(0)
  })

  it('keeps small object lists unvirtualized', () => {
    expect(
      calculateObjectListVirtualWindow({
        columns: 1,
        itemCount: 20,
        rowHeight: 150,
        scrollTop: 1000,
        viewportHeight: 600,
      }),
    ).toEqual({
      isVirtualized: false,
      startIndex: 0,
      endIndex: 20,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    })
  })

  it('calculates a stable virtual window with overscan', () => {
    expect(
      calculateObjectListVirtualWindow({
        columns: 1,
        itemCount: 200,
        rowHeight: 100,
        overscanRows: 2,
        scrollTop: 1000,
        viewportHeight: 300,
      }),
    ).toEqual({
      isVirtualized: true,
      startIndex: 8,
      endIndex: 15,
      topSpacerHeight: 800,
      bottomSpacerHeight: 18500,
    })
  })

  it('aligns virtual grid windows to complete rows', () => {
    expect(
      calculateObjectListVirtualWindow({
        columns: 4,
        itemCount: 200,
        rowHeight: 100,
        overscanRows: 1,
        scrollTop: 1000,
        viewportHeight: 300,
      }),
    ).toMatchObject({
      isVirtualized: true,
      startIndex: 36,
      endIndex: 56,
    })
  })
})

describe('object summaries', () => {
  it('keeps list items light while preserving card fields', () => {
    const summary: StoryObjectSummary = {
      id: 7,
      name: 'Lilia',
      surname: 'Crowell',
      surnameForm: null,
      description: 'Hero',
      age: '17',
      role: 'Main character',
      currentStatus: 'Active',
      imagePath: '/uploads/cover.webp',
      typeKey: 'characters',
      attributes: [{ id: 1, attributeDefinitionId: 2, name: 'Power', value: '999' }],
    }

    const listItem = storyObjectSummaryToListItem(summary)

    expect(listItem.name).toBe('Lilia')
    expect(listItem.attributes).toHaveLength(1)
    expect(listItem.galleryImages).toEqual([])
    expect(listItem.catalogSelections).toEqual([])
    expect(listItem.outgoingCharacterRelationships).toEqual([])
  })
})

describe('object filters', () => {
  it('filters active objects locally by current status', () => {
    const objects = [
      { id: 1, currentStatus: 'Active' },
      { id: 2, currentStatus: '  ' },
      { id: 3, currentStatus: null },
    ] as StoryObject[]

    expect(getFilteredStoryObjects(objects, 'all').map((storyObject) => storyObject.id)).toEqual([1, 2, 3])
    expect(getFilteredStoryObjects(objects, 'active').map((storyObject) => storyObject.id)).toEqual([1])
  })
})

describe('frontend validation', () => {
  it('validates object current status and image paths', () => {
    expect(validateObjectDraft('Lilia', '', '', '', '', '', 'x'.repeat(121), null)).toContain('Текущий статус')
    expect(validateObjectDraft('Lilia', '', '', '', '', '', 'Active', '/uploads/images/lilia.png')).toBeNull()
    expect(validateObjectDraft('Lilia', '', '', '', '', '', 'Active', '/external/lilia.png')).toContain('Обложка')
  })

  it('validates timeline ranges, references and select options', () => {
    expect(validateTimelineEventDraft(makeTimelineDraft({ eventType: 'duration', startValue: '20', endValue: '10' }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'endValue' })]),
    )

    const attributeDraft: AttributeDefinitionDraft = {
      dataType: 'select',
      groupName: '',
      iconKey: '',
      maxValue: '',
      minValue: '',
      name: 'Rank',
      optionsText: '',
      unit: '',
    }
    expect(validateAttributeDefinitionDraft(attributeDraft)).toContain('вариант')

    const catalogFieldDraft: CatalogFieldDraft = {
      dataType: 'entryReference',
      isRequired: false,
      maxValue: '',
      minValue: '',
      name: 'Parent',
      optionsText: '',
      referenceCatalogId: '',
    }
    expect(validateCatalogFieldDraft(catalogFieldDraft)).toContain('каталог')
  })

  it('validates relation link endpoints and strength ranges', () => {
    const draft: RelationLinkDraft = {
      sourceCharacterId: '1',
      targetCharacterId: '1',
      relationType: 'ally',
      strength: '50',
      tension: '10',
      isBidirectional: true,
      description: '',
    }

    expect(validateRelationLinkDraft(draft)).toContain('самим собой')
    expect(validateRelationLinkDraft({ ...draft, targetCharacterId: '2', strength: '101' })).toContain('от 0 до 100')
    expect(validateRelationLinkDraft({ ...draft, targetCharacterId: '2' })).toBeNull()
  })
})
