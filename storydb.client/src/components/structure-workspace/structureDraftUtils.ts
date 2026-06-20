import type {
  Structure,
  StructureApplicationScope,
  StructureDraft,
  StructureEdgeDraft,
  StructureNodeDraft,
} from '../../types'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'

export type StructureWorkspacePage = 'overview' | 'create' | 'system' | 'schema' | 'objects'

export const structureApplicationScopes: StructureApplicationScope[] = [
  'characters',
  'items',
  'locations',
  'organizations',
  'catalogEntries',
]

export const getStructureApplicationScopeLabel = (scope: StructureApplicationScope, ui: PreviewText) => {
  switch (scope) {
    case 'characters':
      return ui.characters
    case 'items':
      return ui.items
    case 'locations':
      return ui.locations
    case 'organizations':
      return ui.organizations
    case 'catalogEntries':
      return ui.catalogEntries
  }
}

export const getStructureEdgeKey = (edge: StructureEdgeDraft) =>
  `${edge.sourceClientId}->${edge.targetClientId}:${edge.sortOrder}:${edge.relationType}`

export const clearNodeCatalogBindings = (nodes: StructureNodeDraft[]) =>
  nodes.map((node) => ({
    ...node,
    linkedCatalogEntryId: null,
    linkedCatalogEntryGroupId: null,
  }))

export const emptyStructureDraft = (projectId: number): StructureDraft => ({
  name: '',
  description: '',
  ownerKind: 'project',
  ownerId: projectId,
  applicationScope: 'characters',
  layoutKind: 'levels',
  nodeBindingMode: 'none',
  catalogSyncMode: 'manual',
  linkedCatalogId: null,
  nodes: [],
  edges: [],
})

const createNextStructureNodeClientId = (nodes: StructureNodeDraft[]) => {
  const existingIds = new Set(nodes.map((node) => node.clientId))
  let nextIndex = nodes.length + 1

  while (existingIds.has(`node-${nextIndex}`)) {
    nextIndex += 1
  }

  return `node-${nextIndex}`
}

export const createEmptyStructureNodeDraft = (
  sortOrder: number,
  existingNodes: StructureNodeDraft[] = [],
): StructureNodeDraft => ({
  clientId: createNextStructureNodeClientId(existingNodes),
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

const getFirstDifferentNodeClientId = (nodes: StructureNodeDraft[], clientId: string) =>
  nodes.find((node) => node.clientId !== clientId)?.clientId ?? ''

export const createEmptyStructureEdgeDraft = (
  nodes: StructureNodeDraft[],
  sortOrder: number,
  relationType: string,
): StructureEdgeDraft => {
  const sourceClientId = nodes[0]?.clientId ?? ''

  return {
    sourceClientId,
    targetClientId: getFirstDifferentNodeClientId(nodes, sourceClientId),
    relationType,
    description: '',
    sortOrder,
  }
}

export const updateStructureDraftNode = (
  draft: StructureDraft,
  clientId: string,
  patch: Partial<StructureNodeDraft>,
): StructureDraft => ({
  ...draft,
  nodes: draft.nodes.map((node) => (node.clientId === clientId ? { ...node, ...patch } : node)),
})

export const addStructureDraftNode = (draft: StructureDraft): StructureDraft => ({
  ...draft,
  nodes: [...draft.nodes, createEmptyStructureNodeDraft(draft.nodes.length, draft.nodes)],
})

export const updateStructureDraftEdge = (
  draft: StructureDraft,
  edgeIndex: number,
  patch: Partial<StructureEdgeDraft>,
): StructureDraft => ({
  ...draft,
  edges: draft.edges.map((edge, index) => (index === edgeIndex ? { ...edge, ...patch } : edge)),
})

export const addStructureDraftEdge = (draft: StructureDraft, relationType: string): StructureDraft =>
  draft.nodes.length < 2
    ? draft
    : {
        ...draft,
        edges: [
          ...draft.edges,
          createEmptyStructureEdgeDraft(
            draft.nodes,
            draft.edges.length,
            relationType,
          ),
        ],
      }

export const removeStructureDraftEdge = (draft: StructureDraft, edgeIndex: number): StructureDraft => ({
  ...draft,
  edges: draft.edges.filter((_, index) => index !== edgeIndex),
})

export const removeStructureDraftNode = (draft: StructureDraft, clientId: string): StructureDraft => ({
  ...draft,
  nodes: draft.nodes
    .filter((node) => node.clientId !== clientId)
    .map((node) => ({
      ...node,
      parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
    })),
  edges: draft.edges.filter(
    (edge) => edge.sourceClientId !== clientId && edge.targetClientId !== clientId,
  ),
})

export const toStructureDraft = (structure: Structure): StructureDraft => ({
  name: structure.name,
  description: structure.description ?? '',
  ownerKind: structure.ownerKind,
  ownerId: structure.ownerId,
  applicationScope: structure.applicationScope,
  layoutKind: structure.layoutKind,
  nodeBindingMode: 'none',
  catalogSyncMode: 'manual',
  linkedCatalogId: null,
  nodes: structure.nodes.map((node) => ({
    clientId: String(node.id),
    parentClientId: node.parentNodeId === null ? null : String(node.parentNodeId),
    linkedCatalogEntryId: null,
    linkedCatalogEntryGroupId: null,
    name: node.name,
    description: node.description ?? '',
    nodeType: node.nodeType ?? '',
    color: node.color ?? '',
    iconKey: node.iconKey ?? '',
    levelIndex: node.levelIndex,
    sortOrder: node.sortOrder,
  })),
  edges: structure.edges.map((edge) => ({
    sourceClientId: String(edge.sourceNodeId),
    targetClientId: String(edge.targetNodeId),
    relationType: edge.relationType,
    description: edge.description ?? '',
    sortOrder: edge.sortOrder,
  })),
})
