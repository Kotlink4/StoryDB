import type { AttributeDataType, AttributeDefinition, ObjectAttribute } from '../../types'

export const attributeDataTypeLabels: Record<AttributeDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
}

export const groupAttributesByDefinition = (
  attributes: ObjectAttribute[],
  definitions: AttributeDefinition[],
  defaultGroupName: string,
) => {
  const buckets = new Map<string, { name: string; attributes: ObjectAttribute[] }>()

  attributes.forEach((attribute) => {
    const definition = definitions.find(
      (item) => item.id === attribute.attributeDefinitionId || item.name === attribute.name,
    )
    const groupName = definition?.groupName?.trim() || defaultGroupName

    if (!buckets.has(groupName)) {
      buckets.set(groupName, { name: groupName, attributes: [] })
    }

    buckets.get(groupName)?.attributes.push(attribute)
  })

  return Array.from(buckets.values())
}
