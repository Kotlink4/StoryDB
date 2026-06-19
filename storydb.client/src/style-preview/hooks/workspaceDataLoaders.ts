import {
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogEntries,
  fetchCatalogEntryGroups,
  fetchCatalogFieldDefinitions,
  fetchCatalogs,
  fetchObjectSummaries,
  fetchRelationGraph,
  fetchStructure,
  fetchStructureAssignments,
  fetchStructures,
  fetchStructureUsages,
} from '../../api'
import { storyObjectSummariesToListItems } from '../domain/storyObjectSummaries'
import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  ObjectTypeKey,
  RelationGraph,
  Structure,
  StructureAssignment,
  StructureUsage,
  StoryObject,
} from '../../types'

type ObjectEditorWorkspaceData = {
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
}

type RelationWorkspaceData = {
  graphLoaded: boolean
  relationGraph: RelationGraph
  structureAssignments: StructureAssignment[]
  structures: Structure[]
  structureUsages: StructureUsage[]
}

type TextLinkTargetsData = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogs: Catalog[] | null
  objectsByTypePatch: Partial<Record<ObjectTypeKey, StoryObject[]>>
}

type CatalogWorkspaceData = {
  catalogEntries: CatalogEntry[]
  catalogFields: CatalogFieldDefinition[]
  catalogGroups: CatalogEntryGroup[]
}

const fulfilledEntries = <TValue>(results: PromiseSettledResult<readonly [number, TValue[]]>[]) =>
  Object.fromEntries(
    results
      .filter((result): result is PromiseFulfilledResult<readonly [number, TValue[]]> => result.status === 'fulfilled')
      .map((result) => result.value),
  )

export async function loadObjectEditorWorkspaceData(
  projectId: number,
  typeKey: ObjectTypeKey,
): Promise<ObjectEditorWorkspaceData> {
  const [
    definitionsResult,
    groupsResult,
    catalogsResult,
    charactersResult,
    itemsResult,
    placesResult,
    organizationsResult,
  ] = await Promise.allSettled([
    fetchAttributeDefinitions(projectId, typeKey),
    fetchAttributeGroups(projectId, typeKey),
    fetchCatalogs(projectId),
    fetchObjectSummaries(projectId, 'characters'),
    fetchObjectSummaries(projectId, 'items'),
    fetchObjectSummaries(projectId, 'places'),
    fetchObjectSummaries(projectId, 'organizations'),
  ])

  const catalogs = catalogsResult.status === 'fulfilled' ? catalogsResult.value : []
  const [entriesByCatalogResults, groupsByCatalogResults] = await Promise.all([
    Promise.allSettled(
      catalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
    ),
    Promise.allSettled(
      catalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntryGroups(projectId, catalog.id)] as const),
    ),
  ])

  return {
    attributeDefinitions: definitionsResult.status === 'fulfilled' ? definitionsResult.value : [],
    attributeGroups: groupsResult.status === 'fulfilled' ? groupsResult.value : [],
    catalogEntriesByCatalogId: fulfilledEntries<CatalogEntry>(entriesByCatalogResults),
    catalogGroupsByCatalogId: fulfilledEntries<CatalogEntryGroup>(groupsByCatalogResults),
    catalogs,
    objectsByType: {
      characters:
        charactersResult.status === 'fulfilled' ? storyObjectSummariesToListItems(charactersResult.value) : [],
      items: itemsResult.status === 'fulfilled' ? storyObjectSummariesToListItems(itemsResult.value) : [],
      places: placesResult.status === 'fulfilled' ? storyObjectSummariesToListItems(placesResult.value) : [],
      organizations:
        organizationsResult.status === 'fulfilled'
          ? storyObjectSummariesToListItems(organizationsResult.value)
          : [],
      hierarchy: [],
    },
  }
}

export async function loadRelationWorkspaceData(projectId: number): Promise<RelationWorkspaceData> {
  const [graphResult, assignmentsResult, structuresResult, usagesResult] = await Promise.allSettled([
    fetchRelationGraph(projectId),
    fetchStructureAssignments(projectId),
    fetchStructures(projectId).then((structureSummaries) =>
      Promise.all(structureSummaries.map((structure) => fetchStructure(projectId, structure.id))),
    ),
    fetchStructureUsages(projectId),
  ])

  return {
    graphLoaded: graphResult.status === 'fulfilled',
    relationGraph: graphResult.status === 'fulfilled' ? graphResult.value : { nodes: [], edges: [] },
    structureAssignments: assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [],
    structures: structuresResult.status === 'fulfilled' ? structuresResult.value : [],
    structureUsages: usagesResult.status === 'fulfilled' ? usagesResult.value : [],
  }
}

export async function loadTextLinkTargetsData(projectId: number): Promise<TextLinkTargetsData> {
  const [charactersResult, itemsResult, placesResult, organizationsResult, catalogsResult] =
    await Promise.allSettled([
      fetchObjectSummaries(projectId, 'characters'),
      fetchObjectSummaries(projectId, 'items'),
      fetchObjectSummaries(projectId, 'places'),
      fetchObjectSummaries(projectId, 'organizations'),
      fetchCatalogs(projectId),
    ])

  const objectsByTypePatch: Partial<Record<ObjectTypeKey, StoryObject[]>> = {
    ...(charactersResult.status === 'fulfilled'
      ? { characters: storyObjectSummariesToListItems(charactersResult.value) }
      : {}),
    ...(itemsResult.status === 'fulfilled' ? { items: storyObjectSummariesToListItems(itemsResult.value) } : {}),
    ...(placesResult.status === 'fulfilled' ? { places: storyObjectSummariesToListItems(placesResult.value) } : {}),
    ...(organizationsResult.status === 'fulfilled'
      ? { organizations: storyObjectSummariesToListItems(organizationsResult.value) }
      : {}),
  }

  if (catalogsResult.status !== 'fulfilled') {
    return {
      catalogEntriesByCatalogId: {},
      catalogs: null,
      objectsByTypePatch,
    }
  }

  const entriesByCatalogResults = await Promise.allSettled(
    catalogsResult.value.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
  )

  return {
    catalogEntriesByCatalogId: fulfilledEntries<CatalogEntry>(entriesByCatalogResults),
    catalogs: catalogsResult.value,
    objectsByTypePatch,
  }
}

export async function loadCatalogWorkspaceData(
  projectId: number,
  catalogId: number,
): Promise<CatalogWorkspaceData> {
  const [catalogEntries, catalogGroups, catalogFields] = await Promise.all([
    fetchCatalogEntries(projectId, catalogId),
    fetchCatalogEntryGroups(projectId, catalogId),
    fetchCatalogFieldDefinitions(projectId, catalogId),
  ])

  return {
    catalogEntries,
    catalogFields,
    catalogGroups,
  }
}
