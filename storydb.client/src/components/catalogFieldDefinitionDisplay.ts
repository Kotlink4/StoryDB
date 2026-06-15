import type { Catalog, CatalogFieldDataType, CatalogFieldDefinition } from '../types'
import type { PreviewLanguage } from '../style-preview/domain/stylePreviewI18n'

export const catalogFieldDataTypeLabels: Record<CatalogFieldDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  longText: { ru: 'Длинный текст', en: 'Long text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
  entryReference: { ru: 'Ссылка на запись', en: 'Entry link' },
  multipleEntryReference: { ru: 'Несколько ссылок', en: 'Multiple links' },
}

export const formatCatalogFieldDefinition = (
  field: CatalogFieldDefinition,
  catalogs: Catalog[],
  language: PreviewLanguage,
) => {
  const parts = [catalogFieldDataTypeLabels[field.dataType][language]]

  if (field.dataType === 'number') {
    const bounds = [field.minValue ?? '', field.maxValue ?? ''].join(' - ').trim()
    if (bounds.length > 0) {
      parts.push(bounds)
    }
  }

  if (field.dataType === 'select' && field.options.length > 0) {
    parts.push(field.options.join(', '))
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    parts.push(catalogs.find((catalog) => catalog.id === field.referenceCatalogId)?.name ?? '-')
  }

  return parts.join(' · ')
}
