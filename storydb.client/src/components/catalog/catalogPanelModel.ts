import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogPanelPage,
} from '../../types'

export function getCatalogPanelPageTitle({
  activeCatalog,
  activeCatalogEntry,
  activeCatalogEntryGroup,
  catalogEntryDraftName,
  editingCatalogEntryId,
  page,
  t,
}: {
  activeCatalog: Catalog | null
  activeCatalogEntry: CatalogEntry | null
  activeCatalogEntryGroup: CatalogEntryGroup | null
  catalogEntryDraftName: string
  editingCatalogEntryId: number | null
  page: CatalogPanelPage
  t: Record<string, string>
}) {
  if (page === 'template') {
    return t.catalogTemplate
  }
  if (page === 'entryForm') {
    return editingCatalogEntryId === null
      ? t.newCatalogEntry
      : `${t.edit}: ${catalogEntryDraftName || t.catalogEntryName}`
  }
  if (page === 'entry') {
    return activeCatalogEntry?.name ?? t.catalogEntryName
  }
  if (page === 'group') {
    return activeCatalogEntryGroup?.name ?? t.attributeGroup
  }

  return activeCatalog?.name ?? t.newCatalog
}

export function getCatalogPanelPageKicker({
  activeCatalog,
  page,
  t,
}: {
  activeCatalog: Catalog | null
  page: CatalogPanelPage
  t: Record<string, string>
}) {
  return page === 'catalog' ? t.catalogs : activeCatalog?.name ?? t.catalogs
}
