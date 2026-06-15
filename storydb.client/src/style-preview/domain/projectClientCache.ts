import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphLayout,
  Structure,
  StructureAssignment,
  StructureUsage,
  StoryObject,
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from '../../types'

const cacheDatabaseName = 'storydb-client-cache'
const cacheDatabaseVersion = 1
const projectSnapshotsStoreName = 'projectSnapshots'
const projectCacheSchemaVersion = 1

export type ProjectClientCacheSnapshot = {
  schemaVersion: number
  projectId: number
  cachedAt: string
  objectsByType?: Partial<Record<ObjectTypeKey, StoryObject[]>>
  catalogs?: Catalog[]
  catalogEntriesByCatalogId?: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId?: Record<number, CatalogEntryGroup[]>
  catalogFieldsByCatalogId?: Record<number, CatalogFieldDefinition[]>
  attributeDefinitionsByType?: Partial<Record<ObjectTypeKey, AttributeDefinition[]>>
  attributeGroupsByType?: Partial<Record<ObjectTypeKey, AttributeGroup[]>>
  relationGraph?: RelationGraph
  relationGraphLayout?: RelationGraphLayout | null
  structures?: Structure[]
  structureAssignments?: StructureAssignment[]
  structureUsages?: StructureUsage[]
  timelineEvents?: TimelineEvent[]
  timelineInfo?: TimelineInfo | null
  timelineLayout?: TimelineLayout | null
  timelineLayoutRules?: TimelineLayoutRules | null
  timelineLinks?: TimelineEventLink[]
}

export type ProjectClientCachePatch = Omit<
  Partial<ProjectClientCacheSnapshot>,
  'cachedAt' | 'projectId' | 'schemaVersion'
>

const canUseIndexedDb = () => typeof indexedDB !== 'undefined'

const openProjectCacheDatabase = () =>
  new Promise<IDBDatabase | null>((resolve) => {
    if (!canUseIndexedDb()) {
      resolve(null)
      return
    }

    const request = indexedDB.open(cacheDatabaseName, cacheDatabaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(projectSnapshotsStoreName)) {
        database.createObjectStore(projectSnapshotsStoreName, { keyPath: 'projectId' })
      }
    }
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve(request.result)
  })

const closeDatabase = (database: IDBDatabase | null) => {
  database?.close()
}

const toRecordKey = (key: IDBValidKey) => (typeof key === 'number' ? key : Number(key))

const mergeRecord = <TValue>(
  current: Record<number, TValue> | undefined,
  patch: Record<number, TValue> | undefined,
) => ({
  ...(current ?? {}),
  ...(patch ?? {}),
})

export const readProjectClientCache = async (projectId: number): Promise<ProjectClientCacheSnapshot | null> => {
  const database = await openProjectCacheDatabase()
  if (database === null) {
    return null
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(projectSnapshotsStoreName, 'readonly')
    const store = transaction.objectStore(projectSnapshotsStoreName)
    const request = store.get(projectId)

    request.onerror = () => {
      closeDatabase(database)
      resolve(null)
    }
    request.onsuccess = () => {
      closeDatabase(database)
      const value = request.result as ProjectClientCacheSnapshot | undefined
      resolve(value?.schemaVersion === projectCacheSchemaVersion ? value : null)
    }
  })
}

export const writeProjectClientCachePatch = async (
  projectId: number,
  patch: ProjectClientCachePatch,
): Promise<void> => {
  const database = await openProjectCacheDatabase()
  if (database === null) {
    return
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(projectSnapshotsStoreName, 'readwrite')
    const store = transaction.objectStore(projectSnapshotsStoreName)
    const request = store.get(projectId)

    request.onerror = () => {
      closeDatabase(database)
      resolve()
    }
    request.onsuccess = () => {
      const current = request.result as ProjectClientCacheSnapshot | undefined
      const nextSnapshot: ProjectClientCacheSnapshot = {
        ...(current?.schemaVersion === projectCacheSchemaVersion ? current : {}),
        ...patch,
        projectId,
        schemaVersion: projectCacheSchemaVersion,
        cachedAt: new Date().toISOString(),
        objectsByType: {
          ...(current?.objectsByType ?? {}),
          ...(patch.objectsByType ?? {}),
        },
        catalogEntriesByCatalogId: mergeRecord(current?.catalogEntriesByCatalogId, patch.catalogEntriesByCatalogId),
        catalogGroupsByCatalogId: mergeRecord(current?.catalogGroupsByCatalogId, patch.catalogGroupsByCatalogId),
        catalogFieldsByCatalogId: mergeRecord(current?.catalogFieldsByCatalogId, patch.catalogFieldsByCatalogId),
        attributeDefinitionsByType: {
          ...(current?.attributeDefinitionsByType ?? {}),
          ...(patch.attributeDefinitionsByType ?? {}),
        },
        attributeGroupsByType: {
          ...(current?.attributeGroupsByType ?? {}),
          ...(patch.attributeGroupsByType ?? {}),
        },
      }

      store.put(nextSnapshot)
    }
    transaction.oncomplete = () => {
      closeDatabase(database)
      resolve()
    }
    transaction.onerror = () => {
      closeDatabase(database)
      resolve()
    }
  })
}

export const deleteProjectClientCache = async (projectId: number): Promise<void> => {
  const database = await openProjectCacheDatabase()
  if (database === null) {
    return
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(projectSnapshotsStoreName, 'readwrite')
    transaction.objectStore(projectSnapshotsStoreName).delete(projectId)
    transaction.oncomplete = () => {
      closeDatabase(database)
      resolve()
    }
    transaction.onerror = () => {
      closeDatabase(database)
      resolve()
    }
  })
}

export const getCachedRecordIds = <TValue>(record: Record<number, TValue> | undefined) =>
  Object.keys(record ?? {}).map(toRecordKey).filter((id) => Number.isInteger(id) && id > 0)
