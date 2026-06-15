import { useMemo } from 'react'

import type { CatalogEntryLinkTarget } from '../../components/CatalogEntryDetail'
import type { TextLinkTarget } from '../../components/LinkedText'
import { getObjectFullName, getOrganizationSurname } from '../domain/objectDisplay'
import type {
  CatalogEntry,
  ObjectTypeKey,
  StoryObject,
} from '../../types'

type UseStylePreviewLinkTargetsOptions = {
  catalogEntries: CatalogEntry[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  onOpenCatalogEntry: (entry: CatalogEntry, catalogId?: number) => void
  onOpenObject: (storyObject: StoryObject) => void
  objectsByType: Partial<Record<ObjectTypeKey, StoryObject[]>>
  selectedCatalog: { id: number } | null
  selectedCatalogEntry: CatalogEntry | null
  selectedRelationObjectId: number | null
  selectedObject: StoryObject | null
  visibleObjects: StoryObject[]
}

export function useStylePreviewLinkTargets({
  catalogEntries,
  catalogEntriesByCatalogId,
  onOpenCatalogEntry,
  onOpenObject,
  objectsByType,
  selectedCatalog,
  selectedCatalogEntry,
  selectedRelationObjectId,
  selectedObject,
  visibleObjects,
}: UseStylePreviewLinkTargetsOptions) {
  const linkableObjects = useMemo(() => {
    const objectsById = new Map<number, StoryObject>()

    Object.values(objectsByType).flat().forEach((storyObject) => objectsById.set(storyObject.id, storyObject))
    visibleObjects.forEach((storyObject) => objectsById.set(storyObject.id, storyObject))
    if (selectedObject !== null) {
      objectsById.set(selectedObject.id, selectedObject)
    }

    return Array.from(objectsById.values())
  }, [objectsByType, selectedObject, visibleObjects])

  const selectedRelationObject = useMemo(
    () =>
      selectedRelationObjectId === null
        ? null
        : linkableObjects.find((storyObject) => storyObject.id === selectedRelationObjectId) ?? null,
    [linkableObjects, selectedRelationObjectId],
  )

  const catalogEntryLinkTargets = useMemo(() => {
    const entriesById = new Map<number, CatalogEntryLinkTarget>()

    Object.entries(catalogEntriesByCatalogId).forEach(([catalogId, entries]) => {
      entries.forEach((entry) => entriesById.set(entry.id, { catalogId: Number(catalogId), entry }))
    })

    if (selectedCatalog !== null) {
      catalogEntries.forEach((entry) => entriesById.set(entry.id, { catalogId: selectedCatalog.id, entry }))
    }

    if (selectedCatalog !== null && selectedCatalogEntry !== null) {
      entriesById.set(selectedCatalogEntry.id, { catalogId: selectedCatalog.id, entry: selectedCatalogEntry })
    }

    return Array.from(entriesById.values())
  }, [catalogEntries, catalogEntriesByCatalogId, selectedCatalog, selectedCatalogEntry])

  const catalogEntryLinksById = useMemo(
    () => new Map(catalogEntryLinkTargets.map((target) => [target.entry.id, target])),
    [catalogEntryLinkTargets],
  )

  const textLinkTargets = useMemo(() => {
    const targets: TextLinkTarget[] = []

    linkableObjects.forEach((storyObject) => {
      const labels = [storyObject.name, storyObject.surname ?? '', getObjectFullName(storyObject)]

      labels
        .map((label) => label.trim())
        .filter((label, index, labelsList) => label.length > 0 && labelsList.indexOf(label) === index)
        .forEach((label) => {
          targets.push({
            key: `object-${storyObject.id}-${label}`,
            label,
            onOpen: () => onOpenObject(storyObject),
          })
        })

      if (storyObject.typeKey === 'organizations') {
        const organizationSurname = getOrganizationSurname(storyObject)
        if (organizationSurname.length > 0 && organizationSurname !== storyObject.name.trim()) {
          targets.push({
            key: `organization-surname-${storyObject.id}-${organizationSurname}`,
            label: organizationSurname,
            onOpen: () => onOpenObject(storyObject),
          })
        }
      }
    })

    catalogEntryLinkTargets.forEach(({ catalogId, entry }) => {
      targets.push({
        key: `catalog-entry-${catalogId}-${entry.id}`,
        label: entry.name,
        onOpen: () => onOpenCatalogEntry(entry, catalogId),
      })
    })

    return targets
  }, [catalogEntryLinkTargets, linkableObjects, onOpenCatalogEntry, onOpenObject])

  return {
    catalogEntryLinksById,
    linkableObjects,
    selectedRelationObject,
    textLinkTargets,
  }
}
