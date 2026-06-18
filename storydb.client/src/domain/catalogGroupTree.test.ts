import { describe, expect, it } from 'vitest'

import type { CatalogEntry, CatalogEntryGroup } from '../types'
import {
  buildCatalogGroupTree,
  countCatalogEntriesInGroupTree,
  formatCatalogGroupTreeLabel,
  getCatalogGroupDescendantIds,
} from './catalogGroupTree'

const makeGroup = (id: number, name: string, parentGroupIds: number[] = []): CatalogEntryGroup => ({
  id,
  name,
  parentGroupIds,
})

const makeEntry = (id: number, name: string, entryGroupId: number | null): CatalogEntry => ({
  id,
  name,
  description: null,
  imagePath: null,
  entryGroupId,
  entryGroupName: null,
  parentEntryIds: [],
  fieldValues: [],
})

describe('catalog group tree helpers', () => {
  it('orders nested groups and counts entries from descendants', () => {
    const groups = [
      makeGroup(2, 'Elves', [1]),
      makeGroup(1, 'Humanoids'),
      makeGroup(3, 'High elves', [2]),
      makeGroup(4, 'Demons'),
    ]
    const entries = [
      makeEntry(1, 'Common elf', 2),
      makeEntry(2, 'High elf', 3),
      makeEntry(3, 'Demon', 4),
      makeEntry(4, 'Ungrouped', null),
    ]

    const tree = buildCatalogGroupTree(groups)

    expect(tree.map((item) => [item.group.name, item.depth])).toEqual([
      ['Humanoids', 0],
      ['Elves', 1],
      ['High elves', 2],
      ['Demons', 0],
    ])
    expect(formatCatalogGroupTreeLabel(tree[2].group, tree[2].depth)).toBe('    - High elves')
    expect([...getCatalogGroupDescendantIds(groups, 1)]).toEqual([1, 2, 3])
    expect(countCatalogEntriesInGroupTree(entries, groups, 1)).toBe(2)
  })

  it('keeps cyclic or disconnected groups renderable', () => {
    const groups = [
      makeGroup(1, 'A', [2]),
      makeGroup(2, 'B', [1]),
      makeGroup(3, 'C', [999]),
    ]

    const tree = buildCatalogGroupTree(groups)

    expect(tree.map((item) => item.group.name).sort()).toEqual(['A', 'B', 'C'])
    expect(tree).toHaveLength(3)
  })
})
