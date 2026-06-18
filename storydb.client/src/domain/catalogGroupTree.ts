import type { CatalogEntry, CatalogEntryGroup } from '../types'

export type CatalogGroupTreeItem = {
  group: CatalogEntryGroup
  depth: number
}

export const buildCatalogGroupTree = (groups: CatalogEntryGroup[]): CatalogGroupTreeItem[] => {
  const groupsById = new Map(groups.map((group) => [group.id, group]))
  const originalIndexById = new Map(groups.map((group, index) => [group.id, index]))
  const primaryParentByGroupId = new Map<number, number>()

  for (const group of groups) {
    const primaryParentId = group.parentGroupIds.find((parentId) => groupsById.has(parentId))
    if (primaryParentId !== undefined) {
      primaryParentByGroupId.set(group.id, primaryParentId)
    }
  }

  const childIdsByParentId = new Map<number, number[]>()
  for (const [groupId, parentId] of primaryParentByGroupId) {
    childIdsByParentId.set(parentId, [...(childIdsByParentId.get(parentId) ?? []), groupId])
  }

  const sortGroupIds = (groupIds: number[]) =>
    [...groupIds].sort((leftId, rightId) => (originalIndexById.get(leftId) ?? 0) - (originalIndexById.get(rightId) ?? 0))
  const rootIds = sortGroupIds(groups.filter((group) => !primaryParentByGroupId.has(group.id)).map((group) => group.id))
  const result: CatalogGroupTreeItem[] = []
  const visited = new Set<number>()

  const visit = (groupId: number, depth: number) => {
    const group = groupsById.get(groupId)
    if (group === undefined || visited.has(groupId)) {
      return
    }

    visited.add(groupId)
    result.push({ group, depth })

    for (const childId of sortGroupIds(childIdsByParentId.get(groupId) ?? [])) {
      visit(childId, depth + 1)
    }
  }

  for (const rootId of rootIds) {
    visit(rootId, 0)
  }

  for (const group of groups) {
    visit(group.id, 0)
  }

  return result
}

export const formatCatalogGroupTreeLabel = (group: CatalogEntryGroup, depth: number) =>
  `${'  '.repeat(depth)}${depth > 0 ? '- ' : ''}${group.name}`

export const getCatalogGroupDescendantIds = (groups: CatalogEntryGroup[], groupId: number) => {
  const childrenByParentId = new Map<number, number[]>()
  for (const group of groups) {
    for (const parentId of group.parentGroupIds) {
      childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), group.id])
    }
  }

  const result = new Set<number>([groupId])
  const stack = [...(childrenByParentId.get(groupId) ?? [])]

  while (stack.length > 0) {
    const currentId = stack.pop()
    if (currentId === undefined || result.has(currentId)) {
      continue
    }

    result.add(currentId)
    stack.push(...(childrenByParentId.get(currentId) ?? []))
  }

  return result
}

export const countCatalogEntriesInGroupTree = (
  entries: CatalogEntry[],
  groups: CatalogEntryGroup[],
  groupId: number,
) => {
  const groupIds = getCatalogGroupDescendantIds(groups, groupId)
  return entries.filter((entry) => entry.entryGroupId !== null && groupIds.has(entry.entryGroupId)).length
}
