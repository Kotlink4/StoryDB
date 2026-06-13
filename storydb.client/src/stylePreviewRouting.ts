import type { ObjectTypeKey } from './types'

export type PreviewTab = 'database' | 'relations' | 'timeline'
export type UtilityPage = 'profile' | 'settings' | null
export type PreviewSection = ObjectTypeKey | 'attributes' | 'catalogs'

export const previewRouteBase = '/style-preview'

const objectRouteSections: ObjectTypeKey[] = ['characters', 'items', 'places', 'organizations']

const parsePositiveNumber = (value: string | undefined) => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const isStylePreviewObjectSection = (value: string | undefined): value is ObjectTypeKey =>
  objectRouteSections.some((section) => section === value)

export const buildStylePreviewPath = (
  projectId: number | null,
  tab: PreviewTab = 'database',
  section: PreviewSection = 'characters',
  objectId: number | null = null,
  catalogId: number | null = null,
) => {
  if (projectId === null) {
    return previewRouteBase
  }

  if (tab === 'relations' || tab === 'timeline') {
    return `${previewRouteBase}/projects/${projectId}/${tab}`
  }

  if (section === 'catalogs') {
    return catalogId === null
      ? `${previewRouteBase}/projects/${projectId}/catalogs`
      : `${previewRouteBase}/projects/${projectId}/catalogs/${catalogId}`
  }

  if (section === 'attributes') {
    return `${previewRouteBase}/projects/${projectId}/attributes`
  }

  const sectionPath = `${previewRouteBase}/projects/${projectId}/database/${section}`

  return objectId === null ? sectionPath : `${sectionPath}/objects/${objectId}`
}

export const parseStylePreviewPath = (pathname: string) => {
  const parts = pathname
    .replace(new RegExp(`^${previewRouteBase}/?`), '')
    .split('/')
    .filter(Boolean)
  const projectId = parts[0] === 'projects' ? parsePositiveNumber(parts[1]) : null
  const routeKind = parts[2]

  if (projectId === null) {
    return {
      activeSection: null,
      activeTab: null,
      catalogId: null,
      objectId: null,
      projectId: null,
      utilityPage:
        parts[0] === 'profile' ? 'profile' as UtilityPage : parts[0] === 'settings' ? 'settings' as UtilityPage : null,
    }
  }

  if (routeKind === 'relations' || routeKind === 'timeline') {
    return {
      activeSection: null,
      activeTab: routeKind as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
      utilityPage: null,
    }
  }

  if (routeKind === 'catalogs') {
    return {
      activeSection: 'catalogs' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: parsePositiveNumber(parts[3]),
      objectId: null,
      projectId,
      utilityPage: null,
    }
  }

  if (routeKind === 'attributes') {
    return {
      activeSection: 'attributes' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
      utilityPage: null,
    }
  }

  if (routeKind === 'database') {
    const activeSection = isStylePreviewObjectSection(parts[3]) ? parts[3] : 'characters'

    return {
      activeSection,
      activeTab: 'database' as PreviewTab,
      catalogId: null,
      objectId: parts[4] === 'objects' ? parsePositiveNumber(parts[5]) : null,
      projectId,
      utilityPage: null,
    }
  }

  return {
    activeSection: 'characters' as PreviewSection,
    activeTab: 'database' as PreviewTab,
    catalogId: null,
    objectId: null,
    projectId,
    utilityPage: null,
  }
}
