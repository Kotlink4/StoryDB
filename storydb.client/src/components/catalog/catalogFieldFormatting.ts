import type { Catalog, CatalogFieldDefinition } from '../../types'

export const formatCatalogFieldValue = (field: CatalogFieldDefinition, catalogs: Catalog[]) => {
  if (field.dataType === 'number') {
    const bounds = [field.minValue ?? '', field.maxValue ?? ''].join(' - ').trim()
    return bounds || '-'
  }

  if (field.dataType === 'select') {
    return field.options.join(', ') || '-'
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    return catalogs.find((catalog) => catalog.id === field.referenceCatalogId)?.name ?? '-'
  }

  return field.isRequired ? '*' : '-'
}
