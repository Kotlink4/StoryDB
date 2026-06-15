import { getObjectFullName } from './objectDisplay'
import type { PreviewText } from './stylePreviewI18n'
import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  ObjectTypeKey,
  RelationGraph,
  StoryObject,
  TimelineEvent,
} from '../../types'
import type { ProjectSearchResultGroup } from '../../components/ProjectSearchResults'

type ProjectSearchOptions = {
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  query: string
  relationGraph: RelationGraph
  timelineEvents: TimelineEvent[]
  ui: PreviewText
  getObjectSectionLabel: (typeKey: ObjectTypeKey) => string
  onOpenAttributes: () => void
  onOpenCatalog: (catalog: Catalog) => void
  onOpenCatalogEntry: (entry: CatalogEntry, catalogId: number) => void
  onOpenObject: (storyObject: StoryObject) => void
  onOpenRelation: (edgeId: string) => void
  onOpenTimelineEvent: (event: TimelineEvent) => void
}

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? '').toLocaleLowerCase().replace(/\s+/g, ' ').trim()

const includesQuery = (query: string, values: Array<string | null | undefined>) =>
  values.some((value) => normalizeSearchText(value).includes(query))

const compactSnippet = (values: Array<string | null | undefined>) =>
  values
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(' · ')
    .slice(0, 180)

export function buildProjectSearchGroups({
  attributeDefinitions,
  attributeGroups,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  getObjectSectionLabel,
  objectsByType,
  onOpenAttributes,
  onOpenCatalog,
  onOpenCatalogEntry,
  onOpenObject,
  onOpenRelation,
  onOpenTimelineEvent,
  query,
  relationGraph,
  timelineEvents,
  ui,
}: ProjectSearchOptions): ProjectSearchResultGroup[] {
  const normalizedQuery = normalizeSearchText(query)

  if (normalizedQuery.length === 0) {
    return []
  }

  const groups: ProjectSearchResultGroup[] = []

  Object.entries(objectsByType).forEach(([typeKey, typeObjects]) => {
    const objectResults = typeObjects
      .filter((storyObject) =>
        includesQuery(normalizedQuery, [
          getObjectFullName(storyObject),
          storyObject.description,
          storyObject.role,
          storyObject.age,
          storyObject.currentStatus,
          storyObject.typeKey,
          ...storyObject.attributes.flatMap((attribute) => [attribute.name, attribute.value]),
          ...storyObject.catalogSelections.flatMap((selection) => [
            selection.catalogName,
            selection.catalogEntryGroupName,
            selection.catalogEntryName,
          ]),
        ]),
      )
      .map((storyObject) => ({
        id: `object-${storyObject.id}`,
        kind: 'object' as const,
        sectionLabel: getObjectSectionLabel(storyObject.typeKey as ObjectTypeKey),
        title: getObjectFullName(storyObject),
        subtitle: storyObject.role ?? storyObject.typeKey,
        snippet: compactSnippet([
          storyObject.currentStatus,
          storyObject.description,
          ...storyObject.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`),
        ]),
        onOpen: () => onOpenObject(storyObject),
      }))

    if (objectResults.length > 0) {
      groups.push({
        key: `objects-${typeKey}`,
        label: getObjectSectionLabel(typeKey as ObjectTypeKey),
        results: objectResults,
      })
    }
  })

  const catalogResults = catalogs
    .filter((catalog) => includesQuery(normalizedQuery, [catalog.name, catalog.description]))
    .map((catalog) => ({
      id: `catalog-${catalog.id}`,
      kind: 'catalog' as const,
      sectionLabel: ui.catalog,
      title: catalog.name,
      subtitle: ui.catalogs,
      snippet: catalog.description ?? '',
      onOpen: () => onOpenCatalog(catalog),
    }))

  const catalogEntryResults = catalogs.flatMap((catalog) =>
    (catalogEntriesByCatalogId[catalog.id] ?? [])
      .filter((entry) => {
        const group = entry.entryGroupId === null
          ? null
          : (catalogGroupsByCatalogId[catalog.id] ?? []).find((catalogGroup) => catalogGroup.id === entry.entryGroupId)
        return includesQuery(normalizedQuery, [
          catalog.name,
          group?.name,
          entry.name,
          entry.description,
          ...entry.fieldValues.map((fieldValue) => fieldValue.value),
        ])
      })
      .map((entry) => ({
        id: `catalog-entry-${catalog.id}-${entry.id}`,
        kind: 'catalogEntry' as const,
        sectionLabel: catalog.name,
        title: entry.name,
        subtitle: ui.entry,
        snippet: compactSnippet([entry.description, ...entry.fieldValues.map((fieldValue) => fieldValue.value)]),
        onOpen: () => onOpenCatalogEntry(entry, catalog.id),
      })),
  )

  const catalogLikeResults = [...catalogResults, ...catalogEntryResults]
  if (catalogLikeResults.length > 0) {
    groups.push({ key: 'catalogs', label: ui.catalogs, results: catalogLikeResults })
  }

  const attributeResults = [
    ...attributeGroups
      .filter((group) => includesQuery(normalizedQuery, [group.name]))
      .map((group) => ({
        id: `attribute-group-${group.id}`,
        kind: 'attribute' as const,
        sectionLabel: ui.attributes,
        title: group.name,
        subtitle: ui.group,
        snippet: '',
        onOpen: onOpenAttributes,
      })),
    ...attributeDefinitions
      .filter((definition) =>
        includesQuery(normalizedQuery, [definition.name, definition.groupName, definition.dataType]),
      )
      .map((definition) => ({
        id: `attribute-${definition.id}`,
        kind: 'attribute' as const,
        sectionLabel: ui.attributes,
        title: definition.name,
        subtitle: definition.groupName ?? ui.main,
        snippet: definition.dataType,
        onOpen: onOpenAttributes,
      })),
  ]

  if (attributeResults.length > 0) {
    groups.push({ key: 'attributes', label: ui.attributes, results: attributeResults })
  }

  const relationResults = relationGraph.edges
    .filter((edge) => includesQuery(normalizedQuery, [edge.relationType, edge.category]))
    .map((edge) => {
      const source = relationGraph.nodes.find((node) => node.id === edge.sourceId)
      const target = relationGraph.nodes.find((node) => node.id === edge.targetId)

      return {
        id: `relation-${edge.id}`,
        kind: 'relation' as const,
        sectionLabel: ui.relations,
        title: edge.relationType,
        subtitle: [source?.name, target?.name].filter(Boolean).join(' ↔ '),
        snippet: edge.category,
        onOpen: () => onOpenRelation(edge.id),
      }
    })

  if (relationResults.length > 0) {
    groups.push({ key: 'relations', label: ui.relations, results: relationResults })
  }

  const timelineResults = timelineEvents
    .filter((event) =>
      includesQuery(normalizedQuery, [
        event.title,
        event.description,
        event.category,
        event.startLabel,
        event.endLabel,
        event.eventType,
        ...event.participants.map((participant) => participant.role),
        ...event.changes.flatMap((change) => [change.changeType, change.fieldName, change.fieldKey]),
      ]),
    )
    .map((event) => ({
      id: `timeline-event-${event.id}`,
      kind: 'timelineEvent' as const,
      sectionLabel: ui.timeline,
      title: event.title,
      subtitle: [event.startLabel, event.endLabel].filter(Boolean).join(' - ') || event.category || event.eventType,
      snippet: event.description ?? '',
      onOpen: () => onOpenTimelineEvent(event),
    }))

  if (timelineResults.length > 0) {
    groups.push({ key: 'timeline', label: ui.timeline, results: timelineResults })
  }

  return groups
}
