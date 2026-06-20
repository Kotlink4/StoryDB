import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogEntry,
  StructureDraft,
  StructureEdgeDraft,
  StructureNodeDraft,
} from '../../types'
import {
  getStructureEdgeKey,
  type StructureWorkspacePage,
} from './structureDraftUtils'

export type StructureCatalogEntryOption = {
  catalog: Catalog
  entry: CatalogEntry
}

export type StructureWorkspacePageItem = {
  description: string
  key: StructureWorkspacePage
  label: string
}

export function buildStructureCatalogEntryOptions(
  catalogs: Catalog[],
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>,
): StructureCatalogEntryOption[] {
  return catalogs.flatMap((catalog) =>
    (catalogEntriesByCatalogId[catalog.id] ?? []).map((entry) => ({ catalog, entry })),
  )
}

export function getNextStructureUsageId(currentUsageId: string, usages: Array<{ id: number }>) {
  return usages.some((usage) => String(usage.id) === currentUsageId)
    ? currentUsageId
    : String(usages[0]?.id ?? '')
}

export function getNextStructureNodeId(currentNodeId: string, draft: StructureDraft | null) {
  const nodeIds = draft?.nodes
    .map((node) => (/^\d+$/.test(node.clientId) ? node.clientId : ''))
    .filter((nodeId) => nodeId.length > 0) ?? []

  return nodeIds.includes(currentNodeId) ? currentNodeId : nodeIds[0] ?? ''
}

export function getNextStructureCatalogEntryId(
  currentEntryId: string,
  catalogEntryOptions: StructureCatalogEntryOption[],
) {
  const entryIds = catalogEntryOptions.map(({ entry }) => String(entry.id))
  return entryIds.includes(currentEntryId) ? currentEntryId : entryIds[0] ?? ''
}

export function findSelectedStructureNode(
  draft: StructureDraft | null,
  selectedNodeClientId: string | null,
): StructureNodeDraft | null {
  return draft === null || selectedNodeClientId === null
    ? null
    : draft.nodes.find((node) => node.clientId === selectedNodeClientId) ?? null
}

export function findSelectedStructureEdge(
  draft: StructureDraft | null,
  selectedEdgeKey: string | null,
): StructureEdgeDraft | null {
  return draft === null || selectedEdgeKey === null
    ? null
    : draft.edges.find((edge) => getStructureEdgeKey(edge) === selectedEdgeKey) ?? null
}

export function buildStructureWorkspacePages(ui: PreviewText): StructureWorkspacePageItem[] {
  return [
    { key: 'overview', label: ui.structurePageOverview, description: ui.structurePageOverviewHint },
    { key: 'create', label: ui.structurePageCreate, description: ui.structurePageCreateHint },
    { key: 'system', label: ui.structurePageSystem, description: ui.structurePageSystemHint },
    { key: 'schema', label: ui.structurePageSchema, description: ui.structurePageSchemaHint },
    { key: 'objects', label: ui.structurePageObjects, description: ui.structurePageObjectsHint },
  ]
}

export function getActiveStructurePageDescription(
  pages: StructureWorkspacePageItem[],
  activePage: StructureWorkspacePage,
  fallback: string,
) {
  return pages.find((page) => page.key === activePage)?.description ?? fallback
}
