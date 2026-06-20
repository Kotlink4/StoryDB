import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { Structure, StructureApplicationScope, StructureNodeDraft } from '../../types'

export const emptyStructureNodes: Structure['nodes'] = []

export const getStructureApplicationScopeForObject = (typeKey: string): StructureApplicationScope | null => {
  if (typeKey === 'places') {
    return 'locations'
  }

  if (typeKey === 'characters' || typeKey === 'items' || typeKey === 'organizations') {
    return typeKey
  }

  return null
}

const createNextOrganizationNodeClientId = (nodes: StructureNodeDraft[]) => {
  const existingIds = new Set(nodes.map((node) => node.clientId))
  let nextIndex = nodes.length + 1

  while (existingIds.has(`organization-node-${nextIndex}`)) {
    nextIndex += 1
  }

  return `organization-node-${nextIndex}`
}

export const createEmptyOrganizationStructureNodeDraft = (
  sortOrder: number,
  existingNodes: StructureNodeDraft[] = [],
): StructureNodeDraft => ({
  clientId: createNextOrganizationNodeClientId(existingNodes),
  parentClientId: null,
  linkedCatalogEntryId: null,
  linkedCatalogEntryGroupId: null,
  name: '',
  description: '',
  nodeType: '',
  color: '',
  iconKey: '',
  levelIndex: 0,
  sortOrder,
})

export function createStarterOrganizationNodes(ui: PreviewText): StructureNodeDraft[] {
  return [
    {
      clientId: 'starter-leadership',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterLeadership,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 0,
      sortOrder: 0,
    },
    {
      clientId: 'starter-core',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterCore,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 1,
      sortOrder: 0,
    },
    {
      clientId: 'starter-outer',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterOuter,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 2,
      sortOrder: 0,
    },
  ]
}

export function prepareOrganizationStructureNodes(nodes: StructureNodeDraft[]): StructureNodeDraft[] {
  const validClientIds = new Set(
    nodes
      .filter((node) => node.name.trim().length > 0)
      .map((node) => node.clientId),
  )

  return nodes
    .filter((node) => node.name.trim().length > 0)
    .map((node, index) => ({
      ...node,
      parentClientId:
        node.parentClientId !== null && validClientIds.has(node.parentClientId)
          ? node.parentClientId
          : null,
      sortOrder: node.sortOrder >= 0 ? node.sortOrder : index,
    }))
}
