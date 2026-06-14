import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import 'react-advanced-cropper/dist/style.css'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  addObjectGalleryImageRequest,
  addTimelineEventGalleryImageRequest,
  createAttributeDefinitionRequest,
  createAttributeGroupRequest,
  createCatalogEntryRequest,
  createCatalogEntryGroupRequest,
  createCatalogFieldDefinitionRequest,
  createCatalogRequest,
  createObjectRequest,
  createProjectRequest,
  createTimelineEventRequest,
  createTimelineEventLinkRequest,
  deleteAttributeDefinitionRequest,
  deleteAttributeGroupRequest,
  deleteCatalogEntryRequest,
  deleteObjectGalleryImageRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogFieldDefinitionRequest,
  deleteCatalogRequest,
  deleteObjectRequest,
  deleteProjectRequest,
  deleteTimelineEventRequest,
  deleteTimelineEventGalleryImageRequest,
  deleteTimelineEventLinkRequest,
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogs,
  fetchCatalogEntries,
  fetchCatalogFieldDefinitions,
  fetchCatalogEntryGroups,
  fetchCurrentUser,
  fetchObject,
  fetchObjects,
  fetchProjects,
  fetchRelationGraph,
  fetchRelationGraphLayout,
  fetchTimelineEvents,
  fetchTimelineEventLinks,
  fetchTimelineInfo,
  fetchTimelineLayout,
  fetchTimelineLayoutRules,
  generateTimelineLayoutRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  resolveAssetUrl,
  saveRelationGraphLayoutRequest,
  updateObjectRequest,
  updateAttributeDefinitionRequest,
  updateAttributeGroupRequest,
  updateCurrentUserRequest,
  updateCatalogEntryRequest,
  updateCatalogEntryGroupRequest,
  updateCatalogFieldDefinitionRequest,
  updateCatalogRequest,
  updateProjectRequest,
  updateTimelineEventRequest,
  uploadImageRequest,
} from './api'
import { AttributesWorkspace } from './components/AttributesWorkspace'
import { CatalogEntryDialog, CatalogGroupDialog } from './components/CatalogDialogs'
import {
  CatalogEditorDialog,
  type CatalogDialogTab,
} from './components/CatalogEditorDialog'
import {
  CatalogEntryDetail,
  type CatalogEntryLinkTarget,
} from './components/CatalogEntryDetail'
import { AttributeGroupDialog } from './components/AttributeGroupDialog'
import { AuthDialog } from './components/AuthDialog'
import { CatalogsWorkspace } from './components/CatalogsWorkspace'
import { DeletePreviewDialog } from './components/DeletePreviewDialog'
import { CoverDropzone } from './components/ImageInputs'
import type { TextLinkTarget } from './components/LinkedText'
import { ObjectCardsWorkspace } from './components/ObjectCardsWorkspace'
import { ObjectDetail } from './components/ObjectDetail'
import { ObjectEditor } from './components/ObjectEditor'
import { ProfileSummaryDialog } from './components/ProfileSummaryDialog'
import { ProjectDialog, type ProjectDialogTab } from './components/ProjectDialog'
import { RelationDetail } from './components/RelationDetail'
import { RelationLinkDialog } from './components/RelationLinkDialog'
import {
  calculateRelationLayout,
  relationNodeHeight,
  relationNodeWidth,
  RelationsPage,
} from './components/RelationsPage'
import { ProfilePage } from './components/StylePreviewProfilePage'
import { PreviewDialog } from './components/StylePreviewPrimitives'
import {
  StylePreviewProjectbar,
  StylePreviewSidebar,
  StylePreviewTopbar,
} from './components/StylePreviewShell'
import { SettingsPage } from './components/StylePreviewSettingsPage'
import { TimelineEventDetail } from './components/TimelineEventDetail'
import { TimelineEventDialog } from './components/TimelineEventDialog'
import { TimelineLinkDialog } from './components/TimelineLinkDialog'
import { TimelinePage } from './components/TimelinePage'
import {
  previewMessages,
  previewText,
  type PreviewLanguage,
  type PreviewTheme,
} from './stylePreviewI18n'
import {
  buildStylePreviewPath,
  parseStylePreviewPath,
  previewRouteBase,
  type PreviewSection,
  type PreviewTab,
} from './stylePreviewRouting'
import {
  emptyAttributeDefinitionDraft,
  emptyCatalogFieldDraft,
  emptyTimelineEventDraft,
  fallbackObjectTypes,
  getProjectObjectTypeKeys,
  isObjectSection,
  isPreviewObjectSection,
  objectSections,
  type PreviewDialogKind,
} from './stylePreviewConfig'
import { toTimelineEventDraft } from './stylePreviewTimelineDrafts'
import { readPreviewState, savePreviewState } from './stylePreviewStateStorage'
import type {
  DetailMode,
  DraftTimelineParticipation,
  GroupDisplayMode,
  ObjectDossierTab,
  ObjectEditorTab,
} from './stylePreviewUiTypes'
import { getObjectFullName } from './objectDisplay'
import { buildObjectTimelineChanges } from './objectTimelineChanges'
import { getRelationLabel } from './relationDisplay'
import { usePreviewToast } from './usePreviewToast'
import type {
  AuthUser,
  AttributeDefinition,
  AttributeDefinitionDraft,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphLayout,
  RelationLinkDraft,
  StoryObject,
  StoryProject,
  TimelineEvent,
  TimelineEventDraft,
  TimelineEventLink,
  TimelineEventLinkDraft,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from './types'
import {
  getTimelineEventValidationMessage,
  validateAttributeDefinitionDraft,
  validateAttributeGroupDraft,
  validateAuthDraft,
  validateCatalogDraft,
  validateCatalogEntryDraft,
  validateCatalogFieldDraft,
  validateCatalogGroupDraft,
  validateObjectDraft,
  validateProfileDraft,
  validateProjectDraft,
  validateRelationLinkDraft,
  validateTimelineLinkDraft,
} from './validation'
import './StylePreview.css'

export function StylePreview() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialPreviewState = useMemo(() => readPreviewState(), [])
  const routeState = useMemo(() => parseStylePreviewPath(location.pathname), [location.pathname])
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    routeState.projectId ?? initialPreviewState.selectedProjectId ?? null,
  )
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<number | null>(null)
  const [projectDialogTab, setProjectDialogTab] = useState<ProjectDialogTab>('details')
  const [projectName, setProjectName] = useState('')
  const [projectCoverImagePath, setProjectCoverImagePath] = useState<string | null>(null)
  const [projectPresetKeys, setProjectPresetKeys] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<PreviewTab>(routeState.activeTab ?? initialPreviewState.activeTab ?? 'database')
  const [activeSection, setActiveSection] = useState<PreviewSection>(
    routeState.activeSection ?? initialPreviewState.activeSection ?? 'characters',
  )
  const [objects, setObjects] = useState<StoryObject[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [timelineLinks, setTimelineLinks] = useState<TimelineEventLink[]>([])
  const [timelineInfo, setTimelineInfo] = useState<TimelineInfo | null>(null)
  const [timelineLayout, setTimelineLayout] = useState<TimelineLayout | null>(null)
  const [timelineLayoutRules, setTimelineLayoutRules] = useState<TimelineLayoutRules | null>(null)
  const [isTimelineGenerating, setIsTimelineGenerating] = useState(false)
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<number | null>(null)
  const [editingTimelineEventId, setEditingTimelineEventId] = useState<number | null>(null)
  const [pendingDeleteTimelineEventId, setPendingDeleteTimelineEventId] = useState<number | null>(null)
  const [relationGraph, setRelationGraph] = useState<RelationGraph>({ nodes: [], edges: [] })
  const [relationGraphLayout, setRelationGraphLayout] = useState<RelationGraphLayout | null>(null)
  const [isRelationLayoutGenerating, setIsRelationLayoutGenerating] = useState(false)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(
    routeState.objectId ?? initialPreviewState.selectedObjectId ?? null,
  )
  const [selectedRelationEdgeId, setSelectedRelationEdgeId] = useState<string | null>(null)
  const [selectedRelationObjectId, setSelectedRelationObjectId] = useState<number | null>(null)
  const [detailMode, setDetailMode] = useState<DetailMode>(initialPreviewState.detailMode ?? 'panel')
  const [groupDisplayMode, setGroupDisplayMode] = useState<GroupDisplayMode>(
    initialPreviewState.groupDisplayMode ?? 'blocks',
  )
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>(initialPreviewState.previewTheme ?? 'light')
  const [previewLanguage, setPreviewLanguage] = useState<PreviewLanguage>(initialPreviewState.previewLanguage ?? 'ru')
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(routeState.utilityPage === 'settings')
  const [isProfilePageOpen, setIsProfilePageOpen] = useState(routeState.utilityPage === 'profile')
  const [isObjectPageOpen, setIsObjectPageOpen] = useState(
    routeState.objectId !== null || initialPreviewState.isObjectPageOpen === true,
  )
  const [isRelationPageOpen, setIsRelationPageOpen] = useState(false)
  const [isTimelineEventPageOpen, setIsTimelineEventPageOpen] = useState(false)
  const [activeObjectMenuId, setActiveObjectMenuId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PreviewDialogKind>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarImagePath, setProfileAvatarImagePath] = useState<string | null>(null)
  const [profileProjectQuery, setProfileProjectQuery] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [editingObjectId, setEditingObjectId] = useState<number | null>(null)
  const [objectName, setObjectName] = useState('')
  const [objectSurname, setObjectSurname] = useState('')
  const [objectRole, setObjectRole] = useState('')
  const [objectAge, setObjectAge] = useState('')
  const [objectDescription, setObjectDescription] = useState('')
  const [objectImagePath, setObjectImagePath] = useState<string | null>(null)
  const [objectEditorTab, setObjectEditorTab] = useState<ObjectEditorTab>('main')
  const [dossierTab, setDossierTab] = useState<ObjectDossierTab>('main')
  const [dossierTimelineEventId, setDossierTimelineEventId] = useState('')
  const [draftAttributes, setDraftAttributes] = useState<DraftAttribute[]>([])
  const [draftHierarchySelections, setDraftHierarchySelections] = useState<DraftHierarchySelection[]>([])
  const [draftCatalogSelections, setDraftCatalogSelections] = useState<DraftCatalogSelection[]>([])
  const [draftCharacterRelationships, setDraftCharacterRelationships] = useState<DraftCharacterRelationship[]>([])
  const [ownedItemIds, setOwnedItemIds] = useState<number[]>([])
  const [ownerCharacterIds, setOwnerCharacterIds] = useState<number[]>([])
  const [territoryPlaceIds, setTerritoryPlaceIds] = useState<number[]>([])
  const [ownerOrganizationIds, setOwnerOrganizationIds] = useState<number[]>([])
  const [parentObjectIds, setParentObjectIds] = useState<number[]>([])
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([])
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [selectedAttributeGroupId, setSelectedAttributeGroupId] = useState<number | null>(null)
  const [attributeGroupName, setAttributeGroupName] = useState('')
  const [attributeGroupIconKey, setAttributeGroupIconKey] = useState('')
  const [editingAttributeGroupId, setEditingAttributeGroupId] = useState<number | null>(null)
  const [editingAttributeDefinitionId, setEditingAttributeDefinitionId] = useState<number | null>(null)
  const [pendingDeleteAttributeGroupId, setPendingDeleteAttributeGroupId] = useState<number | null>(null)
  const [pendingDeleteAttributeDefinitionId, setPendingDeleteAttributeDefinitionId] = useState<number | null>(null)
  const [attributeDefinitionDraft, setAttributeDefinitionDraft] = useState<AttributeDefinitionDraft>(
    emptyAttributeDefinitionDraft,
  )
  const [hierarchyGroups, setHierarchyGroups] = useState<HierarchyGroup[]>([])
  const [hierarchyNodesByGroupId, setHierarchyNodesByGroupId] = useState<Record<number, HierarchyNode[]>>({})
  const [objectsByType, setObjectsByType] = useState<Record<ObjectTypeKey, StoryObject[]>>({
    characters: [],
    items: [],
    places: [],
    organizations: [],
    hierarchy: [],
  })
  const [catalogEntriesByCatalogId, setCatalogEntriesByCatalogId] = useState<Record<number, CatalogEntry[]>>({})
  const [catalogGroupsByCatalogId, setCatalogGroupsByCatalogId] = useState<Record<number, CatalogEntryGroup[]>>({})
  const [catalogFieldsByCatalogId, setCatalogFieldsByCatalogId] = useState<Record<number, CatalogFieldDefinition[]>>({})
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null)
  const [galleryImageCaption, setGalleryImageCaption] = useState('')
  const [timelineGalleryImagePath, setTimelineGalleryImagePath] = useState<string | null>(null)
  const [timelineGalleryImageCaption, setTimelineGalleryImageCaption] = useState('')
  const [editorTimelineEventId, setEditorTimelineEventId] = useState('')
  const [saveObjectAsTimelineChange, setSaveObjectAsTimelineChange] = useState(false)
  const [draftTimelineParticipations, setDraftTimelineParticipations] = useState<DraftTimelineParticipation[]>([])
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(routeState.catalogId)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogGroups, setCatalogGroups] = useState<CatalogEntryGroup[]>([])
  const [catalogName, setCatalogName] = useState('')
  const [catalogDescription, setCatalogDescription] = useState('')
  const [catalogSupportsHierarchy, setCatalogSupportsHierarchy] = useState(false)
  const [catalogHierarchyMode, setCatalogHierarchyMode] = useState<CatalogHierarchyMode>('entries')
  const [catalogDialogTab, setCatalogDialogTab] = useState<CatalogDialogTab>('main')
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null)
  const [editingCatalogFieldId, setEditingCatalogFieldId] = useState<number | null>(null)
  const [catalogFieldDraft, setCatalogFieldDraft] = useState<CatalogFieldDraft>(emptyCatalogFieldDraft)
  const [pendingDeleteCatalogId, setPendingDeleteCatalogId] = useState<number | null>(null)
  const [catalogGroupName, setCatalogGroupName] = useState('')
  const [catalogGroupParentIds, setCatalogGroupParentIds] = useState<number[]>([])
  const [editingCatalogGroupId, setEditingCatalogGroupId] = useState<number | null>(null)
  const [selectedCatalogGroupId, setSelectedCatalogGroupId] = useState<number | null>(null)
  const [editingCatalogEntryId, setEditingCatalogEntryId] = useState<number | null>(null)
  const [selectedCatalogEntryId, setSelectedCatalogEntryId] = useState<number | null>(null)
  const [pendingDeleteCatalogEntryId, setPendingDeleteCatalogEntryId] = useState<number | null>(null)
  const [catalogEntryDraft, setCatalogEntryDraft] = useState<CatalogEntryDraft>({
    name: '',
    description: '',
    imagePath: null,
    entryGroupId: '',
    parentEntryIds: [],
    fieldValues: {},
  })
  const [timelineDraft, setTimelineDraft] = useState<TimelineEventDraft>(emptyTimelineEventDraft)
  const [timelineLinkDraft, setTimelineLinkDraft] = useState<TimelineEventLinkDraft>({
    sourceEventId: '',
    targetEventId: '',
    linkType: 'precedes',
    description: '',
  })
  const [relationLinkDraft, setRelationLinkDraft] = useState<RelationLinkDraft>({
    sourceCharacterId: '',
    targetCharacterId: '',
    relationType: '',
    strength: '50',
    tension: '0',
    isBidirectional: true,
    description: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isObjectSaving, setIsObjectSaving] = useState(false)
  const { dismissMessage, message, messageTone, showErrorMessage, showMessage } = usePreviewToast()
  const ui = previewText[previewLanguage]
  const messages = previewMessages[previewLanguage]
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const currentUserAvatarUrl = resolveAssetUrl(currentUser?.avatarImagePath ?? null)
  const visibleObjects = useMemo(
    () => (selectedProjectId === null ? [] : objects),
    [objects, selectedProjectId],
  )
  const visibleCatalogs = useMemo(
    () => (selectedProjectId === null ? [] : catalogs),
    [catalogs, selectedProjectId],
  )
  const visibleTimelineEvents = useMemo(
    () => (selectedProjectId === null ? [] : timelineEvents),
    [selectedProjectId, timelineEvents],
  )
  const timelineDraftParentOptions = useMemo(
    () =>
      visibleTimelineEvents.filter(
        (event) =>
          event.id !== editingTimelineEventId &&
          (event.eventType === 'duration' || event.eventType === 'era'),
      ),
    [editingTimelineEventId, visibleTimelineEvents],
  )
  const selectedTimelineEvent = useMemo(
    () => visibleTimelineEvents.find((event) => event.id === selectedTimelineEventId) ?? null,
    [selectedTimelineEventId, visibleTimelineEvents],
  )
  const selectedObject = useMemo(
    () => visibleObjects.find((storyObject) => storyObject.id === selectedObjectId) ?? null,
    [selectedObjectId, visibleObjects],
  )
  const selectedRelationEdge = useMemo(
    () => relationGraph.edges.find((edge) => edge.id === selectedRelationEdgeId) ?? null,
    [relationGraph.edges, selectedRelationEdgeId],
  )
  const selectedCatalog = useMemo(
    () => visibleCatalogs.find((catalog) => catalog.id === selectedCatalogId) ?? visibleCatalogs[0] ?? null,
    [selectedCatalogId, visibleCatalogs],
  )
  const selectedCatalogFields = useMemo(
    () => (selectedCatalog === null ? [] : catalogFieldsByCatalogId[selectedCatalog.id] ?? []),
    [catalogFieldsByCatalogId, selectedCatalog],
  )
  const catalogDialogFields = useMemo(() => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    return targetCatalogId === null ? [] : catalogFieldsByCatalogId[targetCatalogId] ?? []
  }, [catalogFieldsByCatalogId, editingCatalogId, selectedCatalog])
  const selectedCatalogEntry = useMemo(
    () =>
      catalogEntries.find((entry) => entry.id === selectedCatalogEntryId) ??
      Object.values(catalogEntriesByCatalogId)
        .flat()
        .find((entry) => entry.id === selectedCatalogEntryId) ??
      null,
    [catalogEntries, catalogEntriesByCatalogId, selectedCatalogEntryId],
  )
  const enabledObjectTypes = useMemo(() => {
    if (selectedProject === null) {
      return fallbackObjectTypes
    }

    const enabled = selectedProject.objectTypes
      .filter((objectType) => objectType.isEnabled && objectType.key !== 'hierarchy')
      .map((objectType) => objectType.key)

    return enabled.length === 0 ? fallbackObjectTypes : enabled
  }, [selectedProject])
  const getObjectSectionLabel = (sectionKey: ObjectTypeKey) => {
    const section = objectSections.find((item) => item.key === sectionKey)
    return section === undefined ? sectionKey : ui[section.labelKey]
  }

  const navigateToPreview = useCallback(
    (
      projectId: number | null,
      tab: PreviewTab = 'database',
      section: PreviewSection = 'characters',
      objectId: number | null = null,
      catalogId: number | null = null,
      replace = false,
    ) => {
      navigate(buildStylePreviewPath(projectId, tab, section, objectId, catalogId), { replace })
    },
    [navigate],
  )

  useEffect(() => {
    let isActive = true

    queueMicrotask(() => {
      if (!isActive) {
        return
      }

      if (routeState.projectId !== null) {
        setSelectedProjectId(routeState.projectId)
      }

      if (routeState.activeTab !== null) {
        setActiveTab(routeState.activeTab)
      }

      if (routeState.activeSection !== null) {
        setActiveSection(routeState.activeSection)
        setIsSettingsPageOpen(false)
        setIsProfilePageOpen(false)
      }

      setIsSettingsPageOpen(routeState.utilityPage === 'settings')
      setIsProfilePageOpen(routeState.utilityPage === 'profile')

      setSelectedObjectId(routeState.objectId)
      setIsObjectPageOpen(routeState.objectId !== null)

      if (routeState.catalogId !== null) {
        setSelectedCatalogId(routeState.catalogId)
      }
    })

    return () => {
      isActive = false
    }
  }, [
    routeState.activeSection,
    routeState.activeTab,
    routeState.catalogId,
    routeState.objectId,
    routeState.projectId,
    routeState.utilityPage,
  ])

  const navigateToWorkspace = (
    tab: PreviewTab,
    section: PreviewSection = activeSection,
    objectId: number | null = null,
    catalogId: number | null = selectedCatalogId,
  ) => {
    setIsSettingsPageOpen(false)
    setIsProfilePageOpen(false)
    if (tab !== 'relations') {
      setSelectedRelationEdgeId(null)
      setSelectedRelationObjectId(null)
      setIsRelationPageOpen(false)
    }
    if (tab !== 'timeline') {
      setSelectedTimelineEventId(null)
      setIsTimelineEventPageOpen(false)
    }
    navigateToPreview(selectedProjectId, tab, section, objectId, catalogId)
  }

  const loadProjects = useCallback(async () => {
    const user = await fetchCurrentUser()
    setCurrentUser(user)
    if (user === null) {
      setProjects([])
      setSelectedProjectId(null)
      return
    }

    const loadedProjects = await fetchProjects()
    setProjects(loadedProjects)
    setSelectedProjectId((currentId) =>
      routeState.projectId !== null && loadedProjects.some((project) => project.id === routeState.projectId)
        ? routeState.projectId
        : currentId !== null && loadedProjects.some((project) => project.id === currentId)
        ? currentId
        : initialPreviewState.selectedProjectId !== undefined &&
            loadedProjects.some((project) => project.id === initialPreviewState.selectedProjectId)
          ? initialPreviewState.selectedProjectId
          : loadedProjects[0]?.id ?? null,
    )
  }, [initialPreviewState.selectedProjectId, routeState.projectId])

  useEffect(() => {
    let isActive = true
    void Promise.resolve()
      .then(loadProjects)
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.apiUnavailable)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [loadProjects])

  useEffect(() => {
    if (
      routeState.utilityPage === null &&
      routeState.projectId === null &&
      selectedProjectId !== null &&
      projects.length > 0
    ) {
      navigateToPreview(selectedProjectId, activeTab, activeSection, selectedObjectId, selectedCatalogId, true)
    }
  }, [
    activeSection,
    activeTab,
    navigateToPreview,
    projects.length,
    routeState.projectId,
    routeState.utilityPage,
    selectedCatalogId,
    selectedObjectId,
    selectedProjectId,
  ])

  useEffect(() => {
    setProfileDisplayName(currentUser?.displayName ?? '')
    setProfileEmail(currentUser?.email ?? '')
    setProfileAvatarImagePath(currentUser?.avatarImagePath ?? null)
  }, [currentUser])

  useEffect(() => {
    savePreviewState({
      activeSection,
      activeTab,
      detailMode,
      groupDisplayMode,
      isObjectPageOpen,
      previewLanguage,
      previewTheme,
      selectedObjectId,
      selectedProjectId,
    })
  }, [activeSection, activeTab, detailMode, groupDisplayMode, isObjectPageOpen, previewLanguage, previewTheme, selectedObjectId, selectedProjectId])

  useEffect(() => {
    const closeFloatingMenus = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-card-menu, .sp-profile') === null) {
        setActiveObjectMenuId(null)
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeFloatingMenus)
    return () => document.removeEventListener('pointerdown', closeFloatingMenus)
  }, [])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setRelationGraph({ nodes: [], edges: [] })
      setRelationGraphLayout(null)
      return undefined
    }

    fetchRelationGraph(selectedProjectId)
      .then((graph) => {
        if (isActive) {
          setRelationGraph(graph)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraph({ nodes: [], edges: [] })
          showErrorMessage(messages.graphLoadFailed)
        }
      })

    fetchRelationGraphLayout(selectedProjectId)
      .then((layout) => {
        if (isActive) {
          setRelationGraphLayout(layout)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraphLayout(null)
          showMessage(messages.graphLayoutLoadMissing)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setObjectsByType({
        characters: [],
        items: [],
        places: [],
        organizations: [],
        hierarchy: [],
      })
      setCatalogEntriesByCatalogId({})
      return undefined
    }

    const loadTextLinkTargets = async () => {
      const projectId = selectedProjectId
      const [charactersResult, itemsResult, placesResult, organizationsResult, catalogsResult] =
        await Promise.allSettled([
          fetchObjects(projectId, 'characters'),
          fetchObjects(projectId, 'items'),
          fetchObjects(projectId, 'places'),
          fetchObjects(projectId, 'organizations'),
          fetchCatalogs(projectId),
        ])

      if (!isActive) {
        return
      }

      setObjectsByType((currentObjectsByType) => ({
        ...currentObjectsByType,
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : currentObjectsByType.characters,
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : currentObjectsByType.items,
        places: placesResult.status === 'fulfilled' ? placesResult.value : currentObjectsByType.places,
        organizations:
          organizationsResult.status === 'fulfilled' ? organizationsResult.value : currentObjectsByType.organizations,
      }))

      if (catalogsResult.status !== 'fulfilled') {
        return
      }

      const entriesByCatalogResults = await Promise.allSettled(
        catalogsResult.value.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
      )

      if (!isActive) {
        return
      }

      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        ...Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      }))
    }

    void loadTextLinkTargets()

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setCatalogs([])
      return undefined
    }

    fetchCatalogs(selectedProjectId)
      .then((loadedCatalogs) => {
        if (!isActive) {
          return
        }

        setCatalogs(loadedCatalogs)
        setSelectedCatalogId((currentId) =>
          currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : currentId,
        )
      })
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.projectsCatalogsLoadFailed)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    setSelectedAttributeGroupId((currentGroupId) =>
      currentGroupId !== null && attributeGroups.some((group) => group.id === currentGroupId)
        ? currentGroupId
        : null,
    )
  }, [attributeGroups])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setTimelineInfo(null)
      setTimelineLayout(null)
      setTimelineLayoutRules(null)
      setTimelineLinks([])
      return undefined
    }

    const loadWorkspace = async () => {
      if (isObjectSection(activeSection)) {
        const [loadedObjects, definitions, groups] = await Promise.all([
          fetchObjects(selectedProjectId, activeSection),
          fetchAttributeDefinitions(selectedProjectId, activeSection),
          fetchAttributeGroups(selectedProjectId, activeSection),
        ])
        if (isActive) {
          setObjects(loadedObjects)
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          setSelectedObjectId((currentId) =>
            currentId !== null && loadedObjects.some((storyObject) => storyObject.id === currentId)
              ? currentId
              : null,
          )
        }
      } else if (activeSection === 'attributes') {
        const [definitions, groups] = await Promise.all([
          fetchAttributeDefinitions(selectedProjectId, 'characters'),
          fetchAttributeGroups(selectedProjectId, 'characters'),
        ])
        if (isActive) {
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          setObjects([])
        }
      } else {
        const loadedCatalogs = await fetchCatalogs(selectedProjectId)
        if (isActive) {
          setCatalogs(loadedCatalogs)
          setSelectedCatalogId((currentId) =>
            currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
              ? currentId
              : loadedCatalogs[0]?.id ?? null,
          )
        }
      }

      const [loadedEvents, loadedTimelineInfo, loadedTimelineLayout, loadedTimelineLinks, loadedTimelineRules] = await Promise.all([
        fetchTimelineEvents(selectedProjectId),
        fetchTimelineInfo(selectedProjectId),
        fetchTimelineLayout(selectedProjectId),
        fetchTimelineEventLinks(selectedProjectId),
        fetchTimelineLayoutRules(selectedProjectId),
      ])
      if (isActive) {
        setTimelineEvents(loadedEvents)
        setTimelineInfo(loadedTimelineInfo)
        setTimelineLayout(loadedTimelineLayout)
        setTimelineLinks(loadedTimelineLinks)
        setTimelineLayoutRules(loadedTimelineRules)
      }
    }

    loadWorkspace()
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.projectDataLoadFailed)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (
      selectedProjectId === null ||
      selectedObjectId === null ||
      selectedObjectId <= 0 ||
      !isObjectSection(activeSection)
    ) {
      return undefined
    }

    fetchObject(selectedProjectId, selectedObjectId)
      .then((loadedObject) => {
        if (!isActive) {
          return
        }

        setObjects((currentObjects) =>
          currentObjects.some((storyObject) => storyObject.id === loadedObject.id)
            ? currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject))
            : [loadedObject, ...currentObjects],
        )
      })
      .catch(() => {
        if (isActive) {
          showErrorMessage(messages.objectLoadFailed)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedObjectId, selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null || selectedCatalogId === null || activeSection !== 'catalogs') {
      setCatalogEntries([])
      setCatalogGroups([])
      return undefined
    }

    const loadCatalogWorkspace = async () => {
      const [loadedEntries, loadedGroups, loadedFields] = await Promise.all([
        fetchCatalogEntries(selectedProjectId, selectedCatalogId),
        fetchCatalogEntryGroups(selectedProjectId, selectedCatalogId),
        fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalogId),
      ])

      if (isActive) {
        setCatalogEntries(loadedEntries)
        setCatalogGroups(loadedGroups)
        setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
          ...currentFieldsByCatalogId,
          [selectedCatalogId]: loadedFields,
        }))
      }
    }

    loadCatalogWorkspace().catch(() => {
      if (isActive) {
        showErrorMessage(messages.projectDataLoadFailed)
      }
    })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedCatalogId, selectedProjectId])

  const loadObjectEditorData = useCallback(
    async (typeKey: ObjectTypeKey) => {
      if (selectedProjectId === null) {
        return
      }

      const projectId = selectedProjectId
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
        fetchObjects(projectId, 'characters'),
        fetchObjects(projectId, 'items'),
        fetchObjects(projectId, 'places'),
        fetchObjects(projectId, 'organizations'),
      ])

      const loadedCatalogs = catalogsResult.status === 'fulfilled' ? catalogsResult.value : []

      const [entriesByCatalogResults, groupsByCatalogResults] = await Promise.all([
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
        ),
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntryGroups(projectId, catalog.id)] as const),
        ),
      ])

      setAttributeDefinitions(definitionsResult.status === 'fulfilled' ? definitionsResult.value : [])
      setAttributeGroups(groupsResult.status === 'fulfilled' ? groupsResult.value : [])
      setCatalogs(loadedCatalogs)
      setHierarchyGroups([])
      setObjectsByType({
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : [],
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : [],
        places: placesResult.status === 'fulfilled' ? placesResult.value : [],
        organizations: organizationsResult.status === 'fulfilled' ? organizationsResult.value : [],
        hierarchy: [],
      })
      setCatalogEntriesByCatalogId(
        Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setCatalogGroupsByCatalogId(
        Object.fromEntries(
          groupsByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntryGroup[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setHierarchyNodesByGroupId({})
    },
    [selectedProjectId],
  )

  const submitAuth = async () => {
    const validationMessage = validateAuthDraft(
      authEmail,
      authPassword,
      authMode === 'register' ? authDisplayName : null,
    )
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const user =
        authMode === 'login'
          ? await loginRequest(authEmail, authPassword)
          : await registerRequest(authEmail, authPassword, authDisplayName)
      setCurrentUser(user)
      setDialog(null)
      await loadProjects()
    } catch {
      showErrorMessage(messages.loginFailed)
    }
  }

  const logout = async () => {
    await logoutRequest()
    setCurrentUser(null)
    setProjects([])
    setSelectedProjectId(null)
    setObjects([])
    setIsProfilePageOpen(false)
    setIsSettingsPageOpen(false)
    navigate(previewRouteBase)
  }

  const resetProjectForm = () => {
    setEditingProjectId(null)
    setProjectName('')
    setProjectCoverImagePath(null)
    setProjectPresetKeys([])
    setProjectDialogTab('details')
  }

  const openCreateProjectDialog = () => {
    resetProjectForm()
    setDialog('project')
  }

  const openEditProjectDialog = (project: StoryProject) => {
    setEditingProjectId(project.id)
    setProjectName(project.name)
    setProjectCoverImagePath(project.coverImagePath)
    setProjectPresetKeys([])
    setProjectDialogTab('details')
    setDialog('project')
  }

  const saveProject = async () => {
    const validationMessage = validateProjectDraft(projectName.trim(), projectCoverImagePath)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectToEdit = editingProjectId === null ? null : projects.find((project) => project.id === editingProjectId) ?? null
    const enabledObjectTypeKeys = getProjectObjectTypeKeys(projectToEdit)

    try {
      const saved =
        projectToEdit === null
          ? await createProjectRequest(projectName.trim(), projectCoverImagePath, enabledObjectTypeKeys, projectPresetKeys)
          : await updateProjectRequest(projectToEdit, projectName.trim(), projectCoverImagePath, enabledObjectTypeKeys, projectPresetKeys)

      setProjects((currentProjects) =>
        projectToEdit === null
          ? [saved, ...currentProjects]
          : currentProjects.map((project) => (project.id === saved.id ? saved : project)),
      )
      setSelectedProjectId(saved.id)
      navigateToPreview(saved.id, 'database', 'characters')
      resetProjectForm()
      setDialog(null)
    } catch {
      showErrorMessage(messages.projectSaveFailed)
    }
  }

  const deletePendingProject = async () => {
    if (pendingDeleteProjectId === null) {
      return
    }

    try {
      await deleteProjectRequest(pendingDeleteProjectId)
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== pendingDeleteProjectId))

      if (selectedProjectId === pendingDeleteProjectId) {
        const nextProject = projects.find((project) => project.id !== pendingDeleteProjectId) ?? null
        setSelectedProjectId(nextProject?.id ?? null)
        navigateToPreview(nextProject?.id ?? null, 'database', 'characters')
      }

      setPendingDeleteProjectId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.projectDeleteFailed)
    }
  }

  const uploadProfileAvatar = async (file: File) => {
    try {
      const result = await uploadImageRequest(file)
      setProfileAvatarImagePath(result.path)
    } catch {
      showErrorMessage(messages.profileAvatarUploadFailed)
    }
  }

  const saveProfile = async () => {
    if (isProfileSaving || currentUser === null) {
      return
    }

    const validationMessage = validateProfileDraft(profileEmail, profileDisplayName, profileAvatarImagePath)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      setIsProfileSaving(true)
      const updatedUser = await updateCurrentUserRequest(profileEmail, profileDisplayName, profileAvatarImagePath)
      setCurrentUser(updatedUser)
      showMessage(messages.profileSaved)
    } catch {
      showErrorMessage(messages.profileSaveFailed)
    } finally {
      setIsProfileSaving(false)
    }
  }

  const createObject = async () => {
    if (selectedProjectId === null || !isObjectSection(activeSection)) {
      return
    }

    const validationMessage = validateObjectDraft(
      objectName,
      '',
      objectDescription,
      objectAge,
      objectRole,
      objectImagePath,
    )
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const created = await createObjectRequest(
        selectedProjectId,
        activeSection,
        objectName,
        '',
        objectDescription,
        objectAge,
        objectRole,
        objectImagePath,
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      )
      setObjects((currentObjects) => [created, ...currentObjects])
      setSelectedObjectId(created.id)
      setDialog(null)
      setObjectName('')
      setObjectRole('')
      setObjectAge('')
      setObjectDescription('')
      setObjectImagePath(null)
    } catch {
      showErrorMessage(messages.objectCreateFailed)
    }
  }

  const uploadObjectImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setObjectImagePath(result.path)
    } catch {
      showErrorMessage(messages.imageUploadFailed)
    }
  }

  void createObject

  const resetObjectForm = () => {
    setEditingObjectId(null)
    setObjectName('')
    setObjectSurname('')
    setObjectRole('')
    setObjectAge('')
    setObjectDescription('')
    setObjectImagePath(null)
    setObjectEditorTab('main')
    setDraftAttributes([])
    setDraftHierarchySelections([])
    setDraftCatalogSelections([])
    setDraftCharacterRelationships([])
    setOwnedItemIds([])
    setOwnerCharacterIds([])
    setTerritoryPlaceIds([])
    setOwnerOrganizationIds([])
    setParentObjectIds([])
    setEditorTimelineEventId('')
    setSaveObjectAsTimelineChange(false)
    setDraftTimelineParticipations([])
  }

  const openCreateObjectDialog = () => {
    resetObjectForm()
    if (isObjectSection(activeSection)) {
      void loadObjectEditorData(activeSection)
    }
    setDialog('object')
  }

  const openEditObjectDialog = async (storyObject: StoryObject) => {
    let objectToEdit = storyObject
    const editorTypeKey = isObjectSection(activeSection)
      ? activeSection
      : isPreviewObjectSection(storyObject.typeKey)
        ? storyObject.typeKey
        : 'characters'

    void loadObjectEditorData(editorTypeKey)

    if (selectedProjectId !== null && storyObject.id > 0) {
      try {
        objectToEdit = await fetchObject(selectedProjectId, storyObject.id)
        setObjects((currentObjects) =>
          currentObjects.map((currentObject) => (currentObject.id === objectToEdit.id ? objectToEdit : currentObject)),
        )
      } catch {
        showErrorMessage(messages.objectEditorLoadFailed)
      }
    }

    setEditingObjectId(objectToEdit.id)
    setObjectName(objectToEdit.name)
    setObjectSurname(objectToEdit.surname ?? '')
    setObjectRole(objectToEdit.role ?? '')
    setObjectAge(objectToEdit.age ?? '')
    setObjectDescription(objectToEdit.description ?? '')
    setObjectImagePath(objectToEdit.imagePath)
    setObjectEditorTab('main')
    setDraftAttributes(objectToEdit.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value ?? '' })))
    setDraftHierarchySelections(
      objectToEdit.hierarchySelections.map((selection) => ({
        groupId: selection.groupId,
        nodeIds: selection.nodes.map((node) => node.id),
      })),
    )
    setDraftCatalogSelections(
      objectToEdit.catalogSelections.map((selection) => ({
        targetType: selection.targetType,
        catalogId: String(selection.catalogId),
        catalogEntryGroupId: selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
        catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
      })),
    )
    setDraftCharacterRelationships(
      [
        ...objectToEdit.outgoingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(objectToEdit.id),
          targetCharacterId: String(relationship.character.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'outgoing' as const,
        })),
        ...objectToEdit.incomingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(relationship.character.id),
          targetCharacterId: String(objectToEdit.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'incoming' as const,
        })),
      ],
    )
    setOwnedItemIds(objectToEdit.ownedItems.map((item) => item.id))
    setOwnerCharacterIds(objectToEdit.owners.map((owner) => owner.id))
    setTerritoryPlaceIds(objectToEdit.territoryPlaces.map((place) => place.id))
    setOwnerOrganizationIds(objectToEdit.ownerOrganizations.map((organization) => organization.id))
    setParentObjectIds(objectToEdit.hierarchyParents.map((parent) => parent.id))
    setDraftTimelineParticipations(
      timelineEvents
        .filter((event) =>
          event.participants.some(
            (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
          ),
        )
        .map((event) => ({
          timelineEventId: String(event.id),
          role:
            event.participants.find(
              (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
            )?.role ?? '',
        })),
    )
    setDialog('object')
  }

  const syncObjectTimelineParticipations = async (
    projectId: number,
    objectId: number,
    participations: DraftTimelineParticipation[],
  ) => {
    const desiredRolesByEventId = new Map<number, string>()

    participations.forEach((participation) => {
      const eventId = Number(participation.timelineEventId)
      if (Number.isInteger(eventId) && eventId > 0) {
        desiredRolesByEventId.set(eventId, participation.role)
      }
    })

    const eventsToUpdate = timelineEvents.filter((event) => {
      const currentParticipant = event.participants.find(
        (participant) => participant.targetType === 'storyObject' && participant.targetId === objectId,
      )
      const nextRole = desiredRolesByEventId.get(event.id)

      if (currentParticipant === undefined) {
        return nextRole !== undefined
      }

      return nextRole === undefined || (currentParticipant.role ?? '') !== nextRole
    })

    if (eventsToUpdate.length === 0) {
      return
    }

    const updatedEvents = await Promise.all(
      eventsToUpdate.map((event) => {
        const nextParticipants = event.participants
          .filter((participant) => !(participant.targetType === 'storyObject' && participant.targetId === objectId))
          .map((participant) => ({
            targetType: participant.targetType,
            targetId: String(participant.targetId),
            role: participant.role ?? '',
          }))
        const nextRole = desiredRolesByEventId.get(event.id)

        if (nextRole !== undefined) {
          nextParticipants.push({
            targetType: 'storyObject',
            targetId: String(objectId),
            role: nextRole,
          })
        }

        return updateTimelineEventRequest(projectId, event.id, {
          ...toTimelineEventDraft(event),
          participants: nextParticipants,
        })
      }),
    )

    const updatedEventsById = new Map(updatedEvents.map((event) => [event.id, event]))
    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => updatedEventsById.get(event.id) ?? event),
    )
    setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
  }

  const saveObject = async () => {
    if (isObjectSaving || selectedProjectId === null || !isObjectSection(activeSection)) {
      return
    }

    const validationMessage = validateObjectDraft(
      objectName,
      objectSurname,
      objectDescription,
      objectAge,
      objectRole,
      objectImagePath,
    )
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectId = selectedProjectId
    const section = activeSection
    const objectId = editingObjectId
    const previousObject = selectedObject
    const selectedObjectIdBeforeSave = selectedObjectId
    const shouldSelectSavedObject = objectId !== null && selectedObjectIdBeforeSave === objectId
    const timelineParticipationsToSave = draftTimelineParticipations

    if (saveObjectAsTimelineChange) {
      const targetEventId = Number(editorTimelineEventId)
      const baseObject =
        objectId === null
          ? null
          : previousObject?.id === objectId
            ? previousObject
            : objects.find((storyObject) => storyObject.id === objectId) ?? null
      const targetEvent = timelineEvents.find((event) => event.id === targetEventId) ?? null

      if (objectId === null || baseObject === null) {
        showErrorMessage(messages.projectTimelineChangeNeedsObject)
        return
      }

      if (!Number.isInteger(targetEventId) || targetEventId <= 0 || targetEvent === null) {
        showErrorMessage(messages.projectTimelineChangeNeedsEvent)
        return
      }

      const objectChanges = buildObjectTimelineChanges({
        baseObject,
        draftAttributes,
        draftCatalogSelections,
        draftCharacterRelationships,
        draftHierarchySelections,
        objectAge,
        objectDescription,
        objectImagePath,
        objectName,
        objectRole,
        objectSurname,
        ownedItemIds,
        ownerCharacterIds,
        ownerOrganizationIds,
        parentObjectIds,
        targetObjectId: objectId,
        territoryPlaceIds,
      })

      if (objectChanges.length === 0) {
        showErrorMessage(messages.projectTimelineChangeNoChanges)
        return
      }

      try {
        setIsObjectSaving(true)
        const changedFieldNames = new Set(objectChanges.map((change) => `${change.changeType}:${change.fieldName}`))
        const eventDraft = toTimelineEventDraft(targetEvent)
        const retainedChanges = eventDraft.changes.filter(
          (change) =>
            !(
              change.targetType === 'storyObject' &&
              Number(change.targetId) === objectId &&
              changedFieldNames.has(`${change.changeType}:${change.fieldName}`)
            ),
        )
        const participationRole =
          timelineParticipationsToSave.find((participation) => participation.timelineEventId === String(targetEvent.id))
            ?.role ?? ''
        const participants = [
          ...eventDraft.participants.filter(
            (participant) => !(participant.targetType === 'storyObject' && Number(participant.targetId) === objectId),
          ),
          { targetType: 'storyObject', targetId: String(objectId), role: participationRole },
        ]
        const savedEvent = await updateTimelineEventRequest(projectId, targetEvent.id, {
          ...eventDraft,
          participants,
          changes: [...retainedChanges, ...objectChanges],
        })

        setTimelineEvents((currentEvents) =>
          currentEvents.map((event) => (event.id === savedEvent.id ? savedEvent : event)),
        )
        setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
        setSelectedTimelineEventId(savedEvent.id)
        setDialog(null)
        resetObjectForm()
        showMessage(messages.timelineChangeSaved)
      } catch {
        showErrorMessage(messages.timelineChangeSaveFailed)
      } finally {
        setIsObjectSaving(false)
      }

      return
    }

    const temporaryObjectId = objectId === null ? -Date.now() : objectId
    const optimisticObject =
      objectId === null || (previousObject !== null && previousObject.id === objectId)
        ? {
            ...(previousObject ?? {
              id: temporaryObjectId,
              typeKey: section,
              hierarchySelections: [],
              catalogSelections: [],
              ownedItems: [],
              owners: [],
              territoryPlaces: [],
              organizationsOnTerritory: [],
              ownerOrganizations: [],
              ownedTerritories: [],
              hierarchyParents: [],
              hierarchyChildren: [],
              galleryImages: [],
              outgoingCharacterRelationships: [],
              incomingCharacterRelationships: [],
            }),
            id: temporaryObjectId,
            name: objectName.trim(),
            surname: objectSurname.trim() || null,
            description: objectDescription.trim() || null,
            age: objectAge.trim() || null,
            role: objectRole.trim() || null,
            imagePath: objectImagePath,
            attributes: draftAttributes
              .map((attribute, index) => {
                const name = attribute.name.trim()
                const existingAttribute = previousObject?.attributes.find(
                  (currentAttribute) => currentAttribute.name.toLowerCase() === name.toLowerCase(),
                )
                const definition = attributeDefinitions.find(
                  (currentDefinition) => currentDefinition.name.toLowerCase() === name.toLowerCase(),
                )

                return {
                  id: existingAttribute?.id ?? -(index + 1),
                  attributeDefinitionId: existingAttribute?.attributeDefinitionId ?? definition?.id ?? 0,
                  name,
                  value: attribute.value.trim() || null,
                }
              })
              .filter((attribute) => attribute.name.length > 0),
          }
        : null

    setIsObjectSaving(true)
    if (optimisticObject !== null) {
      setObjects((currentObjects) =>
        objectId === null
          ? [optimisticObject, ...currentObjects]
          : currentObjects.map((storyObject) => (storyObject.id === optimisticObject.id ? optimisticObject : storyObject)),
      )
      if (shouldSelectSavedObject) {
        setSelectedObjectId(optimisticObject.id)
      }
      setDialog(null)
      resetObjectForm()
    }

    try {
      const saved =
        objectId === null
          ? await createObjectRequest(
              projectId,
              section,
              objectName,
              objectSurname,
              objectDescription,
              objectAge,
              objectRole,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )
          : await updateObjectRequest(
              projectId,
              objectId,
              objectName,
              objectSurname,
              objectDescription,
              objectAge,
              objectRole,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )

      const mergeSavedSummary = (storyObject: StoryObject): StoryObject => ({
        ...storyObject,
        id: saved.id,
        name: saved.name,
        surname: saved.surname,
        description: saved.description,
        age: saved.age,
        role: saved.role,
        imagePath: saved.imagePath,
        typeKey: saved.typeKey,
        attributes: saved.attributes,
      })

      setObjects((currentObjects) =>
        objectId === null
          ? currentObjects.map((storyObject) => (storyObject.id === temporaryObjectId ? mergeSavedSummary(storyObject) : storyObject))
          : currentObjects.map((storyObject) => (storyObject.id === saved.id ? mergeSavedSummary(storyObject) : storyObject)),
      )
      if (shouldSelectSavedObject) {
        setSelectedObjectId(saved.id)
        navigateToPreview(projectId, 'database', section, saved.id)
      } else {
        navigateToPreview(projectId, 'database', section, selectedObjectIdBeforeSave)
      }
      if (optimisticObject === null) {
        setDialog(null)
        resetObjectForm()
      }
      try {
        await syncObjectTimelineParticipations(projectId, saved.id, timelineParticipationsToSave)
      } catch {
        showErrorMessage(messages.objectTimelineParticipationUpdateFailed)
      }
      void fetchObject(projectId, saved.id)
        .then((loadedObject) => {
          setObjects((currentObjects) =>
            currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject)),
          )
        })
        .catch(() => undefined)
      void fetchRelationGraph(projectId)
        .then((graph) => {
          setRelationGraph(graph)
          setRelationGraphLayout((currentLayout) =>
            currentLayout === null ? null : { ...currentLayout, isStale: true },
          )
        })
        .catch(() => {
          showErrorMessage(messages.objectRelationGraphUpdateFailed)
        })
    } catch {
      if (optimisticObject !== null && previousObject !== null) {
        setObjects((currentObjects) =>
          currentObjects.map((storyObject) => (storyObject.id === previousObject.id ? previousObject : storyObject)),
        )
        setSelectedObjectId(previousObject.id)
      } else if (optimisticObject !== null) {
        setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== optimisticObject.id))
        setSelectedObjectId(null)
      }
      showErrorMessage(messages.objectSaveFailed)
    } finally {
      setIsObjectSaving(false)
    }
  }

  const deleteSelectedObject = async () => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      await deleteObjectRequest(selectedProjectId, selectedObject.id)
      setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== selectedObject.id))
      setRelationGraph((currentGraph) => ({
        nodes: currentGraph.nodes.filter((node) => node.id !== selectedObject.id),
        edges: currentGraph.edges.filter(
          (edge) => edge.sourceId !== selectedObject.id && edge.targetId !== selectedObject.id,
        ),
      }))
      setRelationGraphLayout((currentLayout) =>
        currentLayout === null
          ? null
          : {
              ...currentLayout,
              isStale: true,
              items: currentLayout.items.filter((item) => item.storyObjectId !== selectedObject.id),
            },
      )
      setSelectedObjectId(null)
      navigateToPreview(selectedProjectId, 'database', activeSection)
      setDialog(null)
    } catch {
      showErrorMessage(messages.objectDeleteFailed)
    }
  }

  const toggleNumberSelection = (values: number[], value: number) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

  const updateSelectedObject = (updatedObject: StoryObject) => {
    setObjects((currentObjects) =>
      currentObjects.map((storyObject) => (storyObject.id === updatedObject.id ? updatedObject : storyObject)),
    )
    setSelectedObjectId(updatedObject.id)
  }

  const addGalleryImage = async () => {
    if (selectedProjectId === null || selectedObject === null || galleryImagePath === null) {
      return
    }

    try {
      const updatedObject = await addObjectGalleryImageRequest(
        selectedProjectId,
        selectedObject.id,
        galleryImagePath,
        galleryImageCaption,
      )
      updateSelectedObject(updatedObject)
      setGalleryImagePath(null)
      setGalleryImageCaption('')
    } catch {
      showErrorMessage(messages.galleryImageAddFailed)
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      const updatedObject = await deleteObjectGalleryImageRequest(selectedProjectId, selectedObject.id, imageId)
      updateSelectedObject(updatedObject)
    } catch {
      showErrorMessage(messages.galleryImageDeleteFailed)
    }
  }

  const openObjectDetail = (storyObject: StoryObject) => {
    const targetSection = isPreviewObjectSection(storyObject.typeKey)
      ? storyObject.typeKey
      : isObjectSection(activeSection)
        ? activeSection
        : 'characters'

    setSelectedCatalogEntryId(null)
    setActiveTab('database')
    setActiveSection(targetSection)
    setObjects((currentObjects) => {
      const baseObjects = targetSection === activeSection ? currentObjects : objectsByType[targetSection] ?? []

      return baseObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? baseObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...baseObjects]
    })
    setSelectedObjectId(storyObject.id)
    setIsObjectPageOpen(detailMode === 'page')
    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', targetSection, storyObject.id)
    }
  }

  const openRelationDetail = (edgeId: string) => {
    setSelectedRelationEdgeId(edgeId)
    setSelectedRelationObjectId(null)
    setActiveTab('relations')
    setIsRelationPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('relationDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'relations', activeSection)
    }
  }

  const openRelationObjectDetail = (storyObject: StoryObject) => {
    if (detailMode === 'page') {
      openObjectDetail(storyObject)
      return
    }

    setSelectedCatalogEntryId(null)
    setSelectedRelationEdgeId(null)
    setSelectedRelationObjectId(storyObject.id)
    setSelectedObjectId(storyObject.id)
    setActiveTab('relations')
    setIsRelationPageOpen(false)
    setIsObjectPageOpen(false)
    setObjects((currentObjects) =>
      currentObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? currentObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...currentObjects],
    )

    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }
  }

  const openTimelineEventDetail = (eventId: number) => {
    setSelectedTimelineEventId(eventId)
    setActiveTab('timeline')
    setIsObjectPageOpen(false)
    setIsRelationPageOpen(false)
    setIsTimelineEventPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('timelineEventDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'timeline', activeSection)
    }
  }

  const openTimelineEventFromDossier = (event: TimelineEvent) => {
    openTimelineEventDetail(event.id)
  }

  const saveAttributeGroup = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeGroupDraft(attributeGroupName, attributeGroupIconKey)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const previousGroupName =
        editingAttributeGroupId === null
          ? null
          : attributeGroups.find((group) => group.id === editingAttributeGroupId)?.name ?? null
      const saved =
        editingAttributeGroupId === null
          ? await createAttributeGroupRequest(selectedProjectId, 'characters', attributeGroupName, attributeGroupIconKey)
          : await updateAttributeGroupRequest(
              selectedProjectId,
              'characters',
              editingAttributeGroupId,
              attributeGroupName,
              attributeGroupIconKey,
            )
      setAttributeGroups((currentGroups) =>
        editingAttributeGroupId === null
          ? [...currentGroups, saved]
          : currentGroups.map((group) => (group.id === saved.id ? saved : group)),
      )
      if (previousGroupName !== null) {
        setAttributeDefinitions((currentDefinitions) =>
          currentDefinitions.map((definition) =>
            definition.groupName === previousGroupName ? { ...definition, groupName: saved.name } : definition,
          ),
        )
      }
      setSelectedAttributeGroupId(saved.id)
      setAttributeGroupName('')
      setAttributeGroupIconKey('')
      setEditingAttributeGroupId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeGroupCreateFailed)
    }
  }

  const saveAttributeDefinition = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeDefinitionDraft(attributeDefinitionDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const selectedGroup = attributeGroups.find((group) => group.id === selectedAttributeGroupId)
    const groupName = selectedGroup?.name ?? attributeDefinitionDraft.groupName

    try {
      const saved =
        editingAttributeDefinitionId === null
          ? await createAttributeDefinitionRequest(selectedProjectId, 'characters', {
              ...attributeDefinitionDraft,
              groupName,
            })
          : await updateAttributeDefinitionRequest(selectedProjectId, 'characters', editingAttributeDefinitionId, {
              ...attributeDefinitionDraft,
              groupName,
            })
      setAttributeDefinitions((currentDefinitions) =>
        editingAttributeDefinitionId === null
          ? [...currentDefinitions, saved]
          : currentDefinitions.map((definition) => (definition.id === saved.id ? saved : definition)),
      )
      setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
      setEditingAttributeDefinitionId(null)
    } catch {
      showErrorMessage(messages.attributeCreateFailed)
    }
  }

  const openEditAttributeGroup = (group: AttributeGroup) => {
    setEditingAttributeGroupId(group.id)
    setAttributeGroupName(group.name)
    setAttributeGroupIconKey(group.iconKey ?? '')
    setDialog('attributeGroup')
  }

  const openEditAttributeDefinition = (definition: AttributeDefinition) => {
    setEditingAttributeDefinitionId(definition.id)
    setSelectedAttributeGroupId(
      attributeGroups.find((group) => group.name === definition.groupName)?.id ?? null,
    )
    setAttributeDefinitionDraft({
      name: definition.name,
      dataType: definition.dataType,
      groupName: definition.groupName ?? '',
      iconKey: definition.iconKey ?? '',
      minValue: definition.minValue === null ? '' : String(definition.minValue),
      maxValue: definition.maxValue === null ? '' : String(definition.maxValue),
      unit: definition.unit ?? '',
      optionsText: definition.options.join(', '),
    })
  }

  const deletePendingAttributeGroup = async () => {
    if (selectedProjectId === null || pendingDeleteAttributeGroupId === null) {
      return
    }

    const group = attributeGroups.find((item) => item.id === pendingDeleteAttributeGroupId)
    try {
      await deleteAttributeGroupRequest(selectedProjectId, pendingDeleteAttributeGroupId)
      setAttributeGroups((currentGroups) => currentGroups.filter((item) => item.id !== pendingDeleteAttributeGroupId))
      if (group !== undefined) {
        setAttributeDefinitions((currentDefinitions) =>
          currentDefinitions.filter((definition) => definition.groupName !== group.name),
        )
      }
      setSelectedAttributeGroupId((currentId) => (currentId === pendingDeleteAttributeGroupId ? null : currentId))
      setPendingDeleteAttributeGroupId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeGroupDeleteFailed)
    }
  }

  const deletePendingAttributeDefinition = async () => {
    if (selectedProjectId === null || pendingDeleteAttributeDefinitionId === null) {
      return
    }

    try {
      await deleteAttributeDefinitionRequest(selectedProjectId, pendingDeleteAttributeDefinitionId)
      setAttributeDefinitions((currentDefinitions) =>
        currentDefinitions.filter((definition) => definition.id !== pendingDeleteAttributeDefinitionId),
      )
      setPendingDeleteAttributeDefinitionId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeDeleteFailed)
    }
  }

  const saveCatalog = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateCatalogDraft(catalogName, catalogDescription)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogId === null
          ? await createCatalogRequest(
              selectedProjectId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? catalogHierarchyMode : 'entries',
            )
          : await updateCatalogRequest(
              selectedProjectId,
              editingCatalogId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? catalogHierarchyMode : 'entries',
            )
      setCatalogs((currentCatalogs) =>
        editingCatalogId === null
          ? [...currentCatalogs, saved]
          : currentCatalogs.map((catalog) => (catalog.id === saved.id ? saved : catalog)),
      )
      setSelectedCatalogId(saved.id)
      setCatalogName('')
      setCatalogDescription('')
      setCatalogSupportsHierarchy(false)
      setCatalogHierarchyMode('entries')
      setEditingCatalogId(null)
      setDialog(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, saved.id)
    } catch {
      showErrorMessage(messages.catalogCreateFailed)
    }
  }

  const deleteSelectedCatalog = async () => {
    if (selectedProjectId === null) {
      return
    }

    const targetCatalog =
      visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog
    if (targetCatalog === null) {
      return
    }

    try {
      await deleteCatalogRequest(selectedProjectId, targetCatalog.id)
      setCatalogs((currentCatalogs) => currentCatalogs.filter((catalog) => catalog.id !== targetCatalog.id))
      setSelectedCatalogId(null)
      setCatalogEntries([])
      setCatalogGroups([])
      setPendingDeleteCatalogId(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs')
      setDialog(null)
    } catch {
      showErrorMessage(messages.catalogDeleteFailed)
    }
  }

  const saveCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogGroupDraft(catalogGroupName)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogGroupId === null
          ? await createCatalogEntryGroupRequest(
              selectedProjectId,
              selectedCatalog.id,
              catalogGroupName,
              selectedCatalog.supportsHierarchy && selectedCatalog.hierarchyMode === 'groups' ? catalogGroupParentIds : [],
            )
          : await updateCatalogEntryGroupRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogGroupId,
              catalogGroupName,
              selectedCatalog.supportsHierarchy && selectedCatalog.hierarchyMode === 'groups' ? catalogGroupParentIds : [],
            )
      setCatalogGroups((currentGroups) =>
        editingCatalogGroupId === null
          ? [...currentGroups, saved]
          : currentGroups.map((group) => (group.id === saved.id ? saved : group)),
      )
      setSelectedCatalogGroupId(saved.id)
      setCatalogGroupName('')
      setCatalogGroupParentIds([])
      setEditingCatalogGroupId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.catalogGroupCreateFailed)
    }
  }

  const saveCatalogField = async () => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    const validationMessage = validateCatalogFieldDraft(catalogFieldDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogFieldId === null
          ? await createCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, catalogFieldDraft)
          : await updateCatalogFieldDefinitionRequest(
              selectedProjectId,
              targetCatalogId,
              editingCatalogFieldId,
              catalogFieldDraft,
            )

      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]:
          editingCatalogFieldId === null
            ? [...(currentFieldsByCatalogId[targetCatalogId] ?? []), saved]
            : (currentFieldsByCatalogId[targetCatalogId] ?? []).map((field) =>
                field.id === saved.id ? saved : field,
              ),
      }))
      setCatalogFieldDraft(emptyCatalogFieldDraft)
      setEditingCatalogFieldId(null)
    } catch {
      showErrorMessage(messages.templateFieldSaveFailed)
    }
  }

  const editCatalogField = (field: CatalogFieldDefinition) => {
    setEditingCatalogFieldId(field.id)
    setCatalogFieldDraft({
      name: field.name,
      dataType: field.dataType,
      isRequired: field.isRequired,
      minValue: field.minValue === null ? '' : String(field.minValue),
      maxValue: field.maxValue === null ? '' : String(field.maxValue),
      optionsText: field.options.join(', '),
      referenceCatalogId: field.referenceCatalogId === null ? '' : String(field.referenceCatalogId),
    })
    setCatalogDialogTab('template')
  }

  const deleteCatalogField = async (fieldId: number) => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    try {
      await deleteCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, fieldId)
      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]: (currentFieldsByCatalogId[targetCatalogId] ?? []).filter((field) => field.id !== fieldId),
      }))
      setCatalogEntries((currentEntries) =>
        currentEntries.map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [targetCatalogId]: (currentEntriesByCatalogId[targetCatalogId] ?? []).map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      }))
      setCatalogEntryDraft((draft) => {
        const fieldValues = { ...draft.fieldValues }
        delete fieldValues[fieldId]
        return { ...draft, fieldValues }
      })
      if (editingCatalogFieldId === fieldId) {
        setEditingCatalogFieldId(null)
        setCatalogFieldDraft(emptyCatalogFieldDraft)
      }
    } catch {
      showErrorMessage(messages.templateFieldDeleteFailed)
    }
  }

  const saveCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogEntryDraft(catalogEntryDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const fieldDefinitions =
        catalogFieldsByCatalogId[selectedCatalog.id] ?? (await fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalog.id))
      const draftForSave: CatalogEntryDraft = {
        ...catalogEntryDraft,
        parentEntryIds:
          selectedCatalog.supportsHierarchy && selectedCatalog.hierarchyMode !== 'groups'
            ? catalogEntryDraft.parentEntryIds
            : [],
      }
      const saved =
        editingCatalogEntryId === null
          ? await createCatalogEntryRequest(selectedProjectId, selectedCatalog.id, draftForSave, fieldDefinitions)
          : await updateCatalogEntryRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogEntryId,
              draftForSave,
              fieldDefinitions,
            )
      setCatalogEntries((currentEntries) =>
        editingCatalogEntryId === null
          ? [saved, ...currentEntries]
          : currentEntries.map((entry) => (entry.id === saved.id ? saved : entry)),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]:
          editingCatalogEntryId === null
            ? [saved, ...(currentEntriesByCatalogId[selectedCatalog.id] ?? [])]
            : (currentEntriesByCatalogId[selectedCatalog.id] ?? []).map((entry) =>
                entry.id === saved.id ? saved : entry,
              ),
      }))
      setCatalogEntryDraft({
        name: '',
        description: '',
        imagePath: null,
        entryGroupId: '',
        parentEntryIds: [],
        fieldValues: {},
      })
      setEditingCatalogEntryId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.catalogEntryCreateFailed)
    }
  }

  const deleteSelectedCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null || selectedCatalogGroupId === null) {
      return
    }

    try {
      await deleteCatalogEntryGroupRequest(selectedProjectId, selectedCatalog.id, selectedCatalogGroupId)
      setCatalogGroups((currentGroups) => currentGroups.filter((group) => group.id !== selectedCatalogGroupId))
      setSelectedCatalogGroupId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.catalogGroupDeleteFailed)
    }
  }

  const openEditCatalog = (catalog: Catalog) => {
    setEditingCatalogId(catalog.id)
    setCatalogName(catalog.name)
    setCatalogDescription(catalog.description ?? '')
    setCatalogSupportsHierarchy(catalog.supportsHierarchy)
    setCatalogHierarchyMode(catalog.hierarchyMode)
    setCatalogDialogTab('main')
    setEditingCatalogFieldId(null)
    setCatalogFieldDraft(emptyCatalogFieldDraft)
    if (selectedProjectId !== null) {
      void fetchCatalogFieldDefinitions(selectedProjectId, catalog.id)
        .then((fields) =>
          setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
            ...currentFieldsByCatalogId,
            [catalog.id]: fields,
          })),
        )
        .catch(() => showErrorMessage(messages.catalogTemplateLoadFailed))
    }
    setDialog('catalog')
  }

  const openEditCatalogGroup = (group: CatalogEntryGroup) => {
    setEditingCatalogGroupId(group.id)
    setCatalogGroupName(group.name)
    setCatalogGroupParentIds(group.parentGroupIds)
    setDialog('catalogGroup')
  }

  const openEditCatalogEntry = (entry: CatalogEntry) => {
    setEditingCatalogEntryId(entry.id)
    setCatalogEntryDraft({
      name: entry.name,
      description: entry.description ?? '',
      imagePath: entry.imagePath,
      entryGroupId: entry.entryGroupId === null ? '' : String(entry.entryGroupId),
      parentEntryIds: entry.parentEntryIds,
      fieldValues: Object.fromEntries(
        entry.fieldValues.map((fieldValue) => [
          fieldValue.fieldDefinitionId,
          fieldValue.referencedEntryIds.length > 0
            ? fieldValue.referencedEntryIds.join(',')
            : fieldValue.value ?? '',
        ]),
      ),
    })
    setDialog('catalogEntry')
  }

  const openCatalogEntryDetail = (entry: CatalogEntry, catalogId?: number) => {
    const catalogEntryBucket = Object.entries(catalogEntriesByCatalogId).find(([, entries]) =>
      entries.some((catalogEntry) => catalogEntry.id === entry.id),
    )
    const targetCatalogId =
      catalogId ?? (catalogEntryBucket === undefined ? selectedCatalog?.id ?? null : Number(catalogEntryBucket[0]))

    setSelectedObjectId(null)
    setActiveTab('database')
    setActiveSection('catalogs')
    setIsObjectPageOpen(false)
    if (targetCatalogId !== null && Number.isFinite(targetCatalogId)) {
      setSelectedCatalogId(targetCatalogId)
      setCatalogEntries((catalogEntriesByCatalogId[targetCatalogId] ?? [entry]).map((catalogEntry) =>
        catalogEntry.id === entry.id ? entry : catalogEntry,
      ))
    }
    setSelectedCatalogEntryId(entry.id)
    if (detailMode === 'modal') {
      setDialog('catalogEntryDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, targetCatalogId)
    }
  }

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
            onOpen: () => openObjectDetail(storyObject),
          })
        })
    })

    catalogEntryLinkTargets.forEach(({ catalogId, entry }) => {
      targets.push({
        key: `catalog-entry-${catalogId}-${entry.id}`,
        label: entry.name,
        onOpen: () => openCatalogEntryDetail(entry, catalogId),
      })
    })

    return targets
  }, [catalogEntryLinkTargets, linkableObjects, openCatalogEntryDetail, openObjectDetail])

  const deletePendingCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null || pendingDeleteCatalogEntryId === null) {
      return
    }

    try {
      await deleteCatalogEntryRequest(selectedProjectId, selectedCatalog.id, pendingDeleteCatalogEntryId)
      setCatalogEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== pendingDeleteCatalogEntryId))
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]: (currentEntriesByCatalogId[selectedCatalog.id] ?? []).filter(
          (entry) => entry.id !== pendingDeleteCatalogEntryId,
        ),
      }))
      setSelectedCatalogEntryId((currentId) => (currentId === pendingDeleteCatalogEntryId ? null : currentId))
      setPendingDeleteCatalogEntryId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.catalogEntryDeleteFailed)
    }
  }

  const openTimelineEventEditor = (event: TimelineEvent | null = null) => {
    setEditingTimelineEventId(event?.id ?? null)
    setTimelineDraft(event === null ? emptyTimelineEventDraft : toTimelineEventDraft(event))
    setDialog('timelineEvent')
  }

  const updateTimelineDraftEventType = (eventType: TimelineEventDraft['eventType']) => {
    const isRangeEvent = eventType === 'duration' || eventType === 'era'

    setTimelineDraft((draft) => ({
      ...draft,
      eventType,
      parentEventId: eventType === 'point' ? draft.parentEventId : '',
      endLabel: isRangeEvent ? draft.endLabel : '',
      endValue: isRangeEvent ? draft.endValue : '',
    }))
  }

  const saveTimelineEvent = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = getTimelineEventValidationMessage(timelineDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingTimelineEventId === null
          ? await createTimelineEventRequest(selectedProjectId, timelineDraft)
          : await updateTimelineEventRequest(selectedProjectId, editingTimelineEventId, timelineDraft)
      setTimelineEvents((currentEvents) =>
        editingTimelineEventId === null
          ? [...currentEvents, saved]
          : currentEvents.map((event) => (event.id === saved.id ? saved : event)),
      )
      setSelectedTimelineEventId(saved.id)
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setTimelineDraft(emptyTimelineEventDraft)
      setEditingTimelineEventId(null)
      setDialog(null)
      setActiveTab('timeline')
    } catch {
      showErrorMessage(messages.eventCreateFailed)
    }
  }

  const updateSelectedTimelineEvent = (updatedEvent: TimelineEvent) => {
    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    )
    setSelectedTimelineEventId(updatedEvent.id)
  }

  const addTimelineGalleryImage = async () => {
    if (selectedProjectId === null || selectedTimelineEvent === null || timelineGalleryImagePath === null) {
      return
    }

    try {
      const updatedEvent = await addTimelineEventGalleryImageRequest(
        selectedProjectId,
        selectedTimelineEvent.id,
        timelineGalleryImagePath,
        timelineGalleryImageCaption,
      )
      updateSelectedTimelineEvent(updatedEvent)
      setTimelineGalleryImagePath(null)
      setTimelineGalleryImageCaption('')
    } catch {
      showErrorMessage(messages.galleryEventImageAddFailed)
    }
  }

  const deleteTimelineGalleryImage = async (imageId: number) => {
    if (selectedProjectId === null || selectedTimelineEvent === null) {
      return
    }

    try {
      const updatedEvent = await deleteTimelineEventGalleryImageRequest(
        selectedProjectId,
        selectedTimelineEvent.id,
        imageId,
      )
      updateSelectedTimelineEvent(updatedEvent)
    } catch {
      showErrorMessage(messages.galleryEventImageDeleteFailed)
    }
  }

  const uploadTimelineGalleryImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setTimelineGalleryImagePath(result.path)
    } catch {
      showErrorMessage(messages.galleryEventImageUploadFailed)
    }
  }

  const deletePendingTimelineEvent = async () => {
    if (selectedProjectId === null || pendingDeleteTimelineEventId === null) {
      return
    }

    try {
      await deleteTimelineEventRequest(selectedProjectId, pendingDeleteTimelineEventId)
      setTimelineEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== pendingDeleteTimelineEventId),
      )
      setTimelineLinks((currentLinks) =>
        currentLinks.filter(
          (link) =>
            link.sourceEventId !== pendingDeleteTimelineEventId &&
            link.targetEventId !== pendingDeleteTimelineEventId,
        ),
      )
      setSelectedTimelineEventId((currentId) => (currentId === pendingDeleteTimelineEventId ? null : currentId))
      setEditingTimelineEventId((currentId) => (currentId === pendingDeleteTimelineEventId ? null : currentId))
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setPendingDeleteTimelineEventId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.eventDeleteFailed)
    }
  }

  const saveTimelineLink = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateTimelineLinkDraft(timelineLinkDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const created = await createTimelineEventLinkRequest(selectedProjectId, timelineLinkDraft)
      setTimelineLinks((currentLinks) => [...currentLinks, created])
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setTimelineLinkDraft({
        sourceEventId: '',
        targetEventId: '',
        linkType: 'precedes',
        description: '',
      })
      setDialog(null)
    } catch {
      showErrorMessage(messages.relationLinkCreateFailed)
    }
  }

  const saveCharacterRelationLink = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateRelationLinkDraft(relationLinkDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectId = selectedProjectId
    const sourceCharacterId = Number(relationLinkDraft.sourceCharacterId)
    const targetCharacterId = Number(relationLinkDraft.targetCharacterId)

    try {
      const sourceObject = await fetchObject(projectId, sourceCharacterId)
      const existingRelationships: DraftCharacterRelationship[] = [
        ...sourceObject.outgoingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(sourceObject.id),
          targetCharacterId: String(relationship.character.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'outgoing' as const,
        })),
        ...sourceObject.incomingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(relationship.character.id),
          targetCharacterId: String(sourceObject.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'incoming' as const,
        })),
      ]
      const savedObject = await updateObjectRequest(
        projectId,
        sourceObject.id,
        sourceObject.name,
        sourceObject.surname ?? '',
        sourceObject.description ?? '',
        sourceObject.age ?? '',
        sourceObject.role ?? '',
        sourceObject.imagePath,
        sourceObject.attributes.map((attribute) => ({
          name: attribute.name,
          value: attribute.value ?? '',
        })),
        sourceObject.hierarchySelections.map((selection) => ({
          groupId: selection.groupId,
          nodeIds: selection.nodes.map((node) => node.id),
        })),
        sourceObject.catalogSelections.map((selection) => ({
          targetType: selection.targetType,
          catalogId: String(selection.catalogId),
          catalogEntryGroupId:
            selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
          catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
        })),
        sourceObject.ownedItems.map((item) => item.id),
        sourceObject.owners.map((owner) => owner.id),
        sourceObject.territoryPlaces.map((place) => place.id),
        sourceObject.ownerOrganizations.map((organization) => organization.id),
        sourceObject.hierarchyParents.map((parent) => parent.id),
        [
          ...existingRelationships,
          {
            id: null,
            sourceCharacterId: String(sourceCharacterId),
            targetCharacterId: String(targetCharacterId),
            relationType: relationLinkDraft.relationType.trim(),
            strength: relationLinkDraft.strength,
            tension: relationLinkDraft.tension,
            isBidirectional: relationLinkDraft.isBidirectional,
            description: relationLinkDraft.description,
            direction: 'outgoing' as const,
          },
        ],
      )
      const graph = await fetchRelationGraph(projectId)

      setObjects((currentObjects) =>
        currentObjects.map((storyObject) => (storyObject.id === savedObject.id ? savedObject : storyObject)),
      )
      setRelationGraph(graph)
      setRelationGraphLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setRelationLinkDraft({
        sourceCharacterId: '',
        targetCharacterId: '',
        relationType: '',
        strength: '50',
        tension: '0',
        isBidirectional: true,
        description: '',
      })
      setDialog(null)
    } catch {
      showErrorMessage(messages.characterRelationshipCreateFailed)
    }
  }

  const deleteTimelineLink = async (linkId: number) => {
    if (selectedProjectId === null) {
      return
    }

    try {
      await deleteTimelineEventLinkRequest(selectedProjectId, linkId)
      setTimelineLinks((currentLinks) => currentLinks.filter((link) => link.id !== linkId))
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
    } catch {
      showErrorMessage(messages.relationLinkDeleteFailed)
    }
  }

  const generateTimelineLayout = async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsTimelineGenerating(true)
    try {
      const layout = await generateTimelineLayoutRequest(selectedProjectId)
      setTimelineLayout(layout)
    } catch {
      showErrorMessage(messages.timelineGenerateFailed)
    } finally {
      setIsTimelineGenerating(false)
    }
  }

  const generateRelationGraphLayout = async () => {
    if (selectedProjectId === null || relationGraph.nodes.length === 0) {
      return
    }

    setIsRelationLayoutGenerating(true)
    try {
      const positions = await calculateRelationLayout(relationGraph, linkableObjects)
      const layout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        items: relationGraph.nodes.map((node) => {
          const position = positions.get(node.id) ?? { x: 0, y: 0 }

          return {
            storyObjectId: node.id,
            x: position.x,
            y: position.y,
            width: relationNodeWidth,
            height: relationNodeHeight,
            isPinned: false,
          }
        }),
      })
      setRelationGraphLayout(layout)
    } catch {
      showErrorMessage(messages.graphGenerateFailed)
    } finally {
      setIsRelationLayoutGenerating(false)
    }
  }

  const saveRelationGraphNodePosition = async (
    storyObjectId: number,
    position: {
      x: number
      y: number
    },
  ) => {
    if (selectedProjectId === null) {
      return
    }

    const graphNodeIds = new Set(relationGraph.nodes.map((node) => node.id))
    const existingItems = new Map(
      (relationGraphLayout?.items ?? [])
        .filter((item) => graphNodeIds.has(item.storyObjectId))
        .map((item) => [item.storyObjectId, item]),
    )
    const currentItem = existingItems.get(storyObjectId)

    existingItems.set(storyObjectId, {
      id: currentItem?.id ?? 0,
      storyObjectId,
      x: position.x,
      y: position.y,
      width: currentItem?.width ?? relationNodeWidth,
      height: currentItem?.height ?? relationNodeHeight,
      isPinned: true,
    })

    const optimisticLayout: RelationGraphLayout = {
      id: relationGraphLayout?.id ?? 0,
      projectId: selectedProjectId,
      algorithmVersion: relationGraphLayout?.algorithmVersion ?? 'relation-elk-v1',
      isDefault: true,
      isStale: relationGraphLayout?.isStale ?? false,
      generatedAt: relationGraphLayout?.generatedAt ?? new Date().toISOString(),
      items: Array.from(existingItems.values()),
    }
    setRelationGraphLayout(optimisticLayout)

    try {
      const savedLayout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        items: optimisticLayout.items.map((item) => ({
          storyObjectId: item.storyObjectId,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          isPinned: item.isPinned,
        })),
      })
      setRelationGraphLayout(savedLayout)
    } catch {
      showErrorMessage(messages.graphNodeSaveFailed)
    }
  }

  const renderContent = () => {
    if (isProfilePageOpen) {
      return (
        <ProfilePage
          avatarDropzone={
            <CoverDropzone
              className="avatar"
              imagePath={profileAvatarImagePath}
              label={ui.avatar}
              ui={ui}
              onFileSelected={(file) => void uploadProfileAvatar(file)}
            />
          }
          currentUser={currentUser}
          displayName={profileDisplayName}
          email={profileEmail}
          isSaving={isProfileSaving}
          projectQuery={profileProjectQuery}
          projects={projects}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onCreateProject={openCreateProjectDialog}
          onDeleteProject={(project) => {
            setPendingDeleteProjectId(project.id)
            setDialog('confirmDeleteProject')
          }}
          onDisplayNameChange={setProfileDisplayName}
          onEditProject={openEditProjectDialog}
          onEmailChange={setProfileEmail}
          onOpenProject={(project) => {
            setIsProfilePageOpen(false)
            navigateToPreview(project.id, 'database', 'characters')
          }}
          onProjectQueryChange={setProfileProjectQuery}
          onSave={() => void saveProfile()}
        />
      )
    }

    if (isSettingsPageOpen) {
      return (
        <SettingsPage
          detailMode={detailMode}
          groupDisplayMode={groupDisplayMode}
          previewLanguage={previewLanguage}
          previewTheme={previewTheme}
          ui={ui}
          onDetailModeChange={setDetailMode}
          onGroupDisplayModeChange={setGroupDisplayMode}
          onLanguageChange={setPreviewLanguage}
          onThemeChange={setPreviewTheme}
        />
      )
    }

    if (selectedProject === null) {
      return (
        <div className="sp-empty">
          <strong>{currentUser === null ? ui.signInRequired : ui.projectNoProjects}</strong>
          <span>
            {currentUser === null
              ? ui.signInRequiredHint
              : ui.projectCreateUnavailableHint}
          </span>
        </div>
      )
    }

    if (activeTab === 'relations') {
      if (detailMode === 'page' && isRelationPageOpen && selectedRelationEdge !== null) {
        return (
          <div className="sp-object-page">
            <div className="sp-content-head">
              <div>
                <h2>{getRelationLabel(selectedRelationEdge.relationType, ui)}</h2>
                <p>{ui.relationStandalonePage}</p>
              </div>
              <button
                className="sp-button sp-back-button"
                type="button"
                onClick={() => setIsRelationPageOpen(false)}
              >
                {ui.returnToGraph}
              </button>
            </div>
            <RelationDetail
              edge={selectedRelationEdge}
              graph={relationGraph}
              objects={linkableObjects}
              ui={ui}
              onClose={() => setIsRelationPageOpen(false)}
              onOpenObject={openRelationObjectDetail}
            />
          </div>
        )
      }

      return (
        <RelationsPage
          graph={relationGraph}
          isLayoutGenerating={isRelationLayoutGenerating}
          layout={relationGraphLayout}
          objects={linkableObjects}
          selectedEdgeId={selectedRelationEdgeId}
          ui={ui}
          onCreateRelation={() => setDialog('relationLink')}
          onGenerateLayout={() => void generateRelationGraphLayout()}
          onSaveNodePosition={(storyObjectId, position) => void saveRelationGraphNodePosition(storyObjectId, position)}
          onSelectEdge={openRelationDetail}
          onSelect={openRelationObjectDetail}
        />
      )
    }

    if (activeTab === 'timeline') {
      if (detailMode === 'page' && isTimelineEventPageOpen && selectedTimelineEvent !== null) {
        return (
          <div className="sp-object-page">
            <div className="sp-content-head">
              <div>
                <h2>{selectedTimelineEvent.title}</h2>
                <p>{ui.timelineEventStandalonePage}</p>
              </div>
              <button
                className="sp-button sp-back-button"
                type="button"
                onClick={() => setIsTimelineEventPageOpen(false)}
              >
                {ui.returnToTimeline}
              </button>
            </div>
            <TimelineEventDetail
              event={selectedTimelineEvent}
              events={visibleTimelineEvents}
              galleryImageCaption={timelineGalleryImageCaption}
              galleryImagePath={timelineGalleryImagePath}
              links={timelineLinks}
              objects={linkableObjects}
              ui={ui}
              onAddGalleryImage={() => void addTimelineGalleryImage()}
              onClose={() => setIsTimelineEventPageOpen(false)}
              onDelete={(eventId) => {
                setPendingDeleteTimelineEventId(eventId)
                setDialog('confirmDeleteTimelineEvent')
              }}
              onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
              onEdit={openTimelineEventEditor}
              onGalleryCaptionChange={setTimelineGalleryImageCaption}
              onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
              onOpenEvent={openTimelineEventDetail}
              onOpenObject={openObjectDetail}
            />
          </div>
        )
      }

      return (
        <TimelinePage
          events={visibleTimelineEvents}
          isGenerating={isTimelineGenerating}
          layout={timelineLayout}
          layoutRules={timelineLayoutRules}
          links={timelineLinks}
          selectedEvent={selectedTimelineEvent}
          timeline={timelineInfo}
          ui={ui}
          onCreate={() => openTimelineEventEditor()}
          onCreateLink={() => setDialog('timelineLink')}
          onDeleteLink={(linkId) => void deleteTimelineLink(linkId)}
          onGenerate={() => void generateTimelineLayout()}
          onSelectEvent={openTimelineEventDetail}
        />
      )
    }

    if (detailMode === 'page' && isObjectPageOpen && selectedObject !== null) {
      return (
        <div className="sp-object-page">
          <div className="sp-content-head">
            <div>
              <h2>{selectedObject.name}</h2>
              <p>{ui.objectStandalonePage}</p>
            </div>
            <button
              className="sp-button sp-back-button"
              type="button"
              onClick={() => navigateToPreview(selectedProjectId, 'database', activeSection)}
            >
              {ui.returnToPanel}
            </button>
          </div>
          <ObjectDetail
            activeTab={dossierTab}
            attributeDefinitions={attributeDefinitions}
            attributeGroups={attributeGroups}
            dossierTimelineEventId={dossierTimelineEventId}
            galleryImageCaption={galleryImageCaption}
            galleryImagePath={galleryImagePath}
            storyObject={selectedObject}
            textLinkTargets={textLinkTargets}
            timelineEvents={timelineEvents}
            ui={ui}
            onAddGalleryImage={() => void addGalleryImage()}
            onDelete={() => setDialog('confirmDeleteObject')}
            onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
            onEdit={() => openEditObjectDialog(selectedObject)}
            onGalleryCaptionChange={setGalleryImageCaption}
            onGalleryImageUpload={async (file) => {
              if (file !== null) {
                const result = await uploadImageRequest(file, selectedProjectId)
                setGalleryImagePath(result.path)
              }
            }}
            onDossierTimelineEventIdChange={setDossierTimelineEventId}
            onOpenTimelineEvent={openTimelineEventFromDossier}
            onTabChange={setDossierTab}
          />
        </div>
      )
    }

    if (activeSection === 'catalogs' && detailMode === 'page' && selectedCatalogEntry !== null) {
      return (
        <div className="sp-object-page">
          <div className="sp-content-head">
            <div>
              <h2>{selectedCatalogEntry.name}</h2>
              <p>{selectedCatalog?.name ?? ui.catalog}</p>
            </div>
            <button className="sp-button sp-back-button" type="button" onClick={() => setSelectedCatalogEntryId(null)}>
              {ui.back}
            </button>
          </div>
          <CatalogEntryDetail
            catalog={selectedCatalog}
            catalogEntryLinksById={catalogEntryLinksById}
            fieldDefinitions={selectedCatalogFields}
            entry={selectedCatalogEntry}
            textLinkTargets={textLinkTargets}
            ui={ui}
            onDelete={() => {
              setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
              setDialog('confirmDeleteCatalogEntry')
            }}
            onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
          />
        </div>
      )
    }

    if (activeSection === 'catalogs') {
      return (
        <CatalogsWorkspace
          catalogEntries={catalogEntries}
          catalogGroups={catalogGroups}
          catalogs={visibleCatalogs}
          groupDisplayMode={groupDisplayMode}
          selectedCatalog={selectedCatalog}
          selectedCatalogGroupId={selectedCatalogGroupId}
          textLinkTargets={textLinkTargets}
          ui={ui}
          onDeleteEntry={(entry) => {
            setPendingDeleteCatalogEntryId(entry.id)
            setDialog('confirmDeleteCatalogEntry')
          }}
          onEditCatalog={(catalog) => openEditCatalog(catalog)}
          onEditEntry={(entry) => openEditCatalogEntry(entry)}
          onEditGroup={(group) => openEditCatalogGroup(group)}
          onCreateGroup={() => {
            setCatalogGroupName('')
            setCatalogGroupParentIds([])
            setEditingCatalogGroupId(null)
            setDialog('catalogGroup')
          }}
          onCreateEntry={() => {
            setCatalogEntryDraft({
              name: '',
              description: '',
              imagePath: null,
              entryGroupId: selectedCatalogGroupId === null ? '' : String(selectedCatalogGroupId),
              parentEntryIds: [],
              fieldValues: {},
            })
            setEditingCatalogEntryId(null)
            setDialog('catalogEntry')
          }}
          onDeleteCatalog={() => {
            setPendingDeleteCatalogId(selectedCatalog?.id ?? null)
            setDialog('confirmDeleteCatalog')
          }}
          onDeleteGroup={(groupId) => {
            setSelectedCatalogGroupId(groupId)
            setDialog('confirmDeleteCatalogGroup')
          }}
          onSelectCatalog={(catalogId) => navigateToPreview(selectedProjectId, 'database', 'catalogs', null, catalogId)}
          onOpenEntry={openCatalogEntryDetail}
          onSelectGroup={setSelectedCatalogGroupId}
        />
      )
    }

    if (activeSection === 'attributes') {
      return (
        <AttributesWorkspace
          attributeDefinitionDraft={attributeDefinitionDraft}
          attributeDefinitions={attributeDefinitions}
          attributeGroupIconKey={attributeGroupIconKey}
          attributeGroupName={attributeGroupName}
          attributeGroups={attributeGroups}
          groupDisplayMode={groupDisplayMode}
          editingAttributeDefinitionId={editingAttributeDefinitionId}
          language={previewLanguage}
          selectedAttributeGroupId={selectedAttributeGroupId}
          ui={ui}
          onCancelAttributeEdit={() => {
            setEditingAttributeDefinitionId(null)
            setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
          }}
          onAttributeDefinitionDraftChange={setAttributeDefinitionDraft}
          onAttributeGroupIconChange={setAttributeGroupIconKey}
          onAttributeGroupNameChange={setAttributeGroupName}
          onCreateAttribute={() => void saveAttributeDefinition()}
          onCreateGroup={() => void saveAttributeGroup()}
          onDeleteAttribute={(definition) => {
            setPendingDeleteAttributeDefinitionId(definition.id)
            setDialog('confirmDeleteAttribute')
          }}
          onDeleteGroup={(group) => {
            setPendingDeleteAttributeGroupId(group.id)
            setDialog('confirmDeleteAttributeGroup')
          }}
          onEditAttribute={openEditAttributeDefinition}
          onEditGroup={openEditAttributeGroup}
          onSelectGroup={setSelectedAttributeGroupId}
        />
      )
    }

    const objectSectionLabel = isObjectSection(activeSection) ? getObjectSectionLabel(activeSection) : ui.catalogs

    return (
      <ObjectCardsWorkspace
        activeObjectMenuId={activeObjectMenuId}
        currentUser={currentUser}
        layoutMode={layoutMode}
        sectionTitle={isObjectSection(activeSection) ? objectSectionLabel : ui.database}
        selectedObjectId={selectedObject?.id ?? null}
        ui={ui}
        viewSectionLabel={objectSectionLabel}
        visibleObjects={visibleObjects}
        onCreateObject={openCreateObjectDialog}
        onDeleteObject={(storyObject) => {
          setSelectedObjectId(storyObject.id)
          setDialog('confirmDeleteObject')
        }}
        onEditObject={openEditObjectDialog}
        onLayoutModeChange={setLayoutMode}
        onObjectMenuChange={setActiveObjectMenuId}
        onOpenObject={openObjectDetail}
      />
    )
  }

  return (
    <main
      className={`style-preview theme-${previewTheme} tab-${activeTab}`}
      lang={previewLanguage}
    >
      <div className="sp-shell">
        <StylePreviewTopbar
          activeTab={activeTab}
          currentUser={currentUser}
          currentUserAvatarUrl={currentUserAvatarUrl}
          isSettingsOpen={isSettingsOpen}
          ui={ui}
          onCreateObject={openCreateObjectDialog}
          onLogin={() => setDialog('auth')}
          onLogout={() => void logout()}
          onNavigateTab={(tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId)}
          onOpenProfile={() => {
            setIsSettingsOpen(false)
            setIsProfilePageOpen(true)
            setIsSettingsPageOpen(false)
            setDialog(null)
            navigate(`${previewRouteBase}/profile`)
          }}
          onOpenSettings={() => {
            setIsSettingsOpen(false)
            setIsProfilePageOpen(false)
            setIsSettingsPageOpen(true)
            setDialog(null)
            navigate(`${previewRouteBase}/settings`)
          }}
          onToggleSettingsMenu={() => setIsSettingsOpen((value) => !value)}
        />

        <StylePreviewProjectbar
          activeTab={activeTab}
          currentUser={currentUser}
          projects={projects}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onCreateObject={openCreateObjectDialog}
          onNavigateProject={(projectId) => navigateToPreview(projectId, 'database', 'characters', null, null)}
          onNavigateTab={(tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId)}
        />

        <div
          className={`sp-workspace ${
            isSettingsPageOpen || isProfilePageOpen
              ? 'utility-page'
              : ''
          } ${
            !isSettingsPageOpen && !isProfilePageOpen && activeTab === 'timeline'
              ? 'no-sidebar'
              : ''
          } ${
            !isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            ((activeTab === 'database' &&
              (selectedObject !== null || (activeSection === 'catalogs' && selectedCatalogEntry !== null))) ||
              (activeTab === 'relations' && (selectedRelationEdge !== null || selectedRelationObject !== null)) ||
              (activeTab === 'timeline' && selectedTimelineEvent !== null))
              ? 'with-detail'
              : ''
          }`}
        >
          {activeTab !== 'timeline' && (
            <StylePreviewSidebar
              activeSection={activeSection}
              activeTab={activeTab}
              attributeGroups={attributeGroups}
              catalogGroups={catalogGroups}
              currentUser={currentUser}
              enabledObjectTypes={enabledObjectTypes}
              groupDisplayMode={groupDisplayMode}
              selectedAttributeGroupId={selectedAttributeGroupId}
              selectedCatalog={selectedCatalog}
              selectedCatalogGroupId={selectedCatalogGroupId}
              selectedProject={selectedProject}
              ui={ui}
              visibleCatalogs={visibleCatalogs}
              visibleObjectsCount={visibleObjects.length}
              visibleTimelineEventsCount={visibleTimelineEvents.length}
              onCreateCatalog={() => {
                setEditingCatalogId(null)
                setCatalogName('')
                setCatalogDescription('')
                setCatalogSupportsHierarchy(false)
                setCatalogHierarchyMode('entries')
                setCatalogDialogTab('main')
                setEditingCatalogFieldId(null)
                setCatalogFieldDraft(emptyCatalogFieldDraft)
                setDialog('catalog')
              }}
              onCreateCatalogGroup={() => {
                setCatalogGroupName('')
                setCatalogGroupParentIds([])
                setEditingCatalogGroupId(null)
                setDialog('catalogGroup')
              }}
              onCreateObject={openCreateObjectDialog}
              onDeleteAttributeGroup={(group) => {
                setPendingDeleteAttributeGroupId(group.id)
                setDialog('confirmDeleteAttributeGroup')
              }}
              onDeleteCatalog={(catalog) => {
                setPendingDeleteCatalogId(catalog.id)
                setDialog('confirmDeleteCatalog')
              }}
              onDeleteCatalogGroup={(group) => {
                setSelectedCatalogGroupId(group.id)
                setDialog('confirmDeleteCatalogGroup')
              }}
              onEditAttributeGroup={openEditAttributeGroup}
              onEditCatalog={openEditCatalog}
              onEditCatalogGroup={openEditCatalogGroup}
              onNavigateTab={(tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId)}
              onNavigateWorkspace={navigateToWorkspace}
              onSelectAttributeGroup={setSelectedAttributeGroupId}
              onSelectCatalogGroup={setSelectedCatalogGroupId}
            />
          )}

          <section
            className={`sp-content${activeTab === 'timeline' ? ' timeline-content' : ''}${activeTab === 'relations' ? ' relations-content' : ''}`}
          >
            {isLoading ? <div className="sp-empty">{ui.loading}</div> : renderContent()}
          </section>

          {!isSettingsPageOpen && !isProfilePageOpen && detailMode === 'panel' && activeTab === 'database' && selectedObject !== null && (
            <aside className="sp-detail">
              <ObjectDetail
                activeTab={dossierTab}
                attributeDefinitions={attributeDefinitions}
                attributeGroups={attributeGroups}
                dossierTimelineEventId={dossierTimelineEventId}
                galleryImageCaption={galleryImageCaption}
                galleryImagePath={galleryImagePath}
                storyObject={selectedObject}
                textLinkTargets={textLinkTargets}
                timelineEvents={timelineEvents}
                ui={ui}
                onAddGalleryImage={() => void addGalleryImage()}
                onDelete={() => setDialog('confirmDeleteObject')}
                onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
                onEdit={() => openEditObjectDialog(selectedObject)}
                onGalleryCaptionChange={setGalleryImageCaption}
                onGalleryImageUpload={async (file) => {
                  if (file !== null) {
                    const result = await uploadImageRequest(file, selectedProjectId)
                    setGalleryImagePath(result.path)
                  }
                }}
                onDossierTimelineEventIdChange={setDossierTimelineEventId}
                onOpenTimelineEvent={openTimelineEventFromDossier}
                onTabChange={setDossierTab}
              />
            </aside>
          )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'relations' &&
            selectedRelationObject !== null && (
              <aside className="sp-detail">
                <ObjectDetail
                  activeTab={dossierTab}
                  attributeDefinitions={attributeDefinitions}
                  attributeGroups={attributeGroups}
                  dossierTimelineEventId={dossierTimelineEventId}
                  galleryImageCaption={galleryImageCaption}
                  galleryImagePath={galleryImagePath}
                  storyObject={selectedRelationObject}
                  textLinkTargets={textLinkTargets}
                  timelineEvents={timelineEvents}
                  ui={ui}
                  onAddGalleryImage={() => void addGalleryImage()}
                  onDelete={() => {
                    setSelectedObjectId(selectedRelationObject.id)
                    setDialog('confirmDeleteObject')
                  }}
                  onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
                  onEdit={() => openEditObjectDialog(selectedRelationObject)}
                  onGalleryCaptionChange={setGalleryImageCaption}
                  onGalleryImageUpload={async (file) => {
                    if (file !== null) {
                      const result = await uploadImageRequest(file, selectedProjectId)
                      setGalleryImagePath(result.path)
                    }
                  }}
                  onDossierTimelineEventIdChange={setDossierTimelineEventId}
                  onOpenTimelineEvent={openTimelineEventFromDossier}
                  onTabChange={setDossierTab}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'relations' &&
            selectedRelationEdge !== null && (
              <aside className="sp-detail">
                <RelationDetail
                  edge={selectedRelationEdge}
                  graph={relationGraph}
                  objects={linkableObjects}
                  ui={ui}
                  onClose={() => setSelectedRelationEdgeId(null)}
                  onOpenObject={openRelationObjectDetail}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'timeline' &&
            selectedTimelineEvent !== null && (
              <aside className="sp-detail">
                <TimelineEventDetail
                  event={selectedTimelineEvent}
                  events={visibleTimelineEvents}
                  galleryImageCaption={timelineGalleryImageCaption}
                  galleryImagePath={timelineGalleryImagePath}
                  links={timelineLinks}
                  objects={linkableObjects}
                  ui={ui}
                  onAddGalleryImage={() => void addTimelineGalleryImage()}
                  onClose={() => setSelectedTimelineEventId(null)}
                  onDelete={(eventId) => {
                    setPendingDeleteTimelineEventId(eventId)
                    setDialog('confirmDeleteTimelineEvent')
                  }}
                  onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
                  onEdit={openTimelineEventEditor}
                  onGalleryCaptionChange={setTimelineGalleryImageCaption}
                  onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
                  onOpenEvent={openTimelineEventDetail}
                  onOpenObject={openObjectDetail}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'database' &&
            activeSection === 'catalogs' &&
            selectedObject === null &&
            selectedCatalogEntry !== null && (
              <aside className="sp-detail">
                <CatalogEntryDetail
                  catalog={selectedCatalog}
                  catalogEntryLinksById={catalogEntryLinksById}
                  fieldDefinitions={selectedCatalogFields}
                  entry={selectedCatalogEntry}
                  textLinkTargets={textLinkTargets}
                  ui={ui}
                  onDelete={() => {
                    setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
                    setDialog('confirmDeleteCatalogEntry')
                  }}
                  onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
                />
              </aside>
            )}
        </div>
      </div>

      {message !== null && (
        <button className={`sp-toast ${messageTone}`} type="button" onClick={dismissMessage}>
          {message}
        </button>
      )}

      {dialog === 'auth' && (
        <AuthDialog
          displayName={authDisplayName}
          email={authEmail}
          mode={authMode}
          password={authPassword}
          ui={ui}
          onCancel={() => setDialog(null)}
          onDisplayNameChange={setAuthDisplayName}
          onEmailChange={setAuthEmail}
          onModeChange={setAuthMode}
          onPasswordChange={setAuthPassword}
          onSubmit={() => void submitAuth()}
        />
      )}

      {dialog === 'profile' && (
        <ProfileSummaryDialog
          currentUser={currentUser}
          ui={ui}
          onCancel={() => setDialog(null)}
          onLogout={() => void logout()}
        />
      )}

      {dialog === 'project' && (
        <ProjectDialog
          editingProjectId={editingProjectId}
          projectCoverImagePath={projectCoverImagePath}
          projectDialogTab={projectDialogTab}
          projectName={projectName}
          projectPresetKeys={projectPresetKeys}
          ui={ui}
          onCancel={() => setDialog(null)}
          onCoverFileSelected={(file) => {
            void uploadImageRequest(file, editingProjectId).then((result) => {
              setProjectCoverImagePath(result.path)
            }).catch(() => {
              showErrorMessage(messages.coverUploadFailed)
            })
          }}
          onProjectDialogTabChange={setProjectDialogTab}
          onProjectNameChange={setProjectName}
          onProjectPresetKeysChange={setProjectPresetKeys}
          onSave={() => void saveProject()}
        />
      )}

      {dialog === 'confirmDeleteProject' && pendingDeleteProjectId !== null && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={projects.find((project) => project.id === pendingDeleteProjectId)?.name ?? ui.project}
          hint={ui.projectDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deletePendingProject()}
        />
      )}

      {dialog === 'object' && (
        <PreviewDialog title={editingObjectId === null ? ui.newObject : ui.editor} onClose={() => setDialog(null)}>
          <ObjectEditor
            activeType={isObjectSection(activeSection) ? activeSection : 'characters'}
            attributeDefinitions={attributeDefinitions}
            attributeGroups={attributeGroups}
            catalogEntriesByCatalogId={catalogEntriesByCatalogId}
            catalogGroupsByCatalogId={catalogGroupsByCatalogId}
            catalogs={catalogs}
            draftAttributes={draftAttributes}
            draftCatalogSelections={draftCatalogSelections}
            draftCharacterRelationships={draftCharacterRelationships}
            draftHierarchySelections={draftHierarchySelections}
            draftTimelineParticipations={draftTimelineParticipations}
            editingObjectId={editingObjectId}
            editorTimelineEventId={editorTimelineEventId}
            hierarchyGroups={hierarchyGroups}
            hierarchyNodesByGroupId={hierarchyNodesByGroupId}
            objectAge={objectAge}
            objectDescription={objectDescription}
            objectEditorTab={objectEditorTab}
            objectImagePath={objectImagePath}
            objectName={objectName}
            objectRole={objectRole}
            objectSurname={objectSurname}
            objectsByType={objectsByType}
            ownedItemIds={ownedItemIds}
            ownerCharacterIds={ownerCharacterIds}
            ownerOrganizationIds={ownerOrganizationIds}
            saveObjectAsTimelineChange={saveObjectAsTimelineChange}
            timelineEvents={timelineEvents}
            territoryPlaceIds={territoryPlaceIds}
            ui={ui}
            isSaving={isObjectSaving}
            onCancel={() => setDialog(null)}
            onDraftAttributesChange={setDraftAttributes}
            onDraftCatalogSelectionsChange={setDraftCatalogSelections}
            onDraftCharacterRelationshipsChange={setDraftCharacterRelationships}
            onDraftHierarchySelectionsChange={setDraftHierarchySelections}
            onDraftTimelineParticipationsChange={setDraftTimelineParticipations}
            onEditorTimelineEventIdChange={setEditorTimelineEventId}
            onImageUpload={uploadObjectImage}
            onObjectAgeChange={setObjectAge}
            onObjectDescriptionChange={setObjectDescription}
            onObjectEditorTabChange={setObjectEditorTab}
            onObjectNameChange={setObjectName}
            onObjectRoleChange={setObjectRole}
            onObjectSurnameChange={setObjectSurname}
            onOwnedItemIdsChange={setOwnedItemIds}
            onOwnerCharacterIdsChange={setOwnerCharacterIds}
            onOwnerOrganizationIdsChange={setOwnerOrganizationIds}
            onSave={() => void saveObject()}
            onSaveObjectAsTimelineChange={setSaveObjectAsTimelineChange}
            onTerritoryPlaceIdsChange={setTerritoryPlaceIds}
            toggleNumberSelection={toggleNumberSelection}
          />
        </PreviewDialog>
      )}

      {dialog === 'objectLegacy' && (
        <PreviewDialog title={ui.newObject} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              {ui.firstName}
              <ObjectEditor
                activeType={isObjectSection(activeSection) ? activeSection : 'characters'}
                attributeDefinitions={attributeDefinitions}
                attributeGroups={attributeGroups}
                catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                catalogGroupsByCatalogId={catalogGroupsByCatalogId}
                catalogs={catalogs}
                draftAttributes={draftAttributes}
                draftCatalogSelections={draftCatalogSelections}
                draftCharacterRelationships={draftCharacterRelationships}
                draftHierarchySelections={draftHierarchySelections}
                draftTimelineParticipations={draftTimelineParticipations}
                editingObjectId={editingObjectId}
                editorTimelineEventId={editorTimelineEventId}
                hierarchyGroups={hierarchyGroups}
                hierarchyNodesByGroupId={hierarchyNodesByGroupId}
                objectAge={objectAge}
                objectDescription={objectDescription}
                objectEditorTab={objectEditorTab}
                objectImagePath={objectImagePath}
                objectName={objectName}
                objectRole={objectRole}
                objectSurname={objectSurname}
                objectsByType={objectsByType}
                ownedItemIds={ownedItemIds}
                ownerCharacterIds={ownerCharacterIds}
                ownerOrganizationIds={ownerOrganizationIds}
                saveObjectAsTimelineChange={saveObjectAsTimelineChange}
                timelineEvents={timelineEvents}
                territoryPlaceIds={territoryPlaceIds}
                ui={ui}
                isSaving={isObjectSaving}
                onCancel={() => setDialog(null)}
                onDraftAttributesChange={setDraftAttributes}
                onDraftCatalogSelectionsChange={setDraftCatalogSelections}
                onDraftCharacterRelationshipsChange={setDraftCharacterRelationships}
                onDraftHierarchySelectionsChange={setDraftHierarchySelections}
                onDraftTimelineParticipationsChange={setDraftTimelineParticipations}
                onEditorTimelineEventIdChange={setEditorTimelineEventId}
                onImageUpload={uploadObjectImage}
                onObjectAgeChange={setObjectAge}
                onObjectDescriptionChange={setObjectDescription}
                onObjectEditorTabChange={setObjectEditorTab}
                onObjectNameChange={setObjectName}
                onObjectRoleChange={setObjectRole}
                onObjectSurnameChange={setObjectSurname}
                onOwnedItemIdsChange={setOwnedItemIds}
                onOwnerCharacterIdsChange={setOwnerCharacterIds}
                onOwnerOrganizationIdsChange={setOwnerOrganizationIds}
                onSave={() => void saveObject()}
                onSaveObjectAsTimelineChange={setSaveObjectAsTimelineChange}
                onTerritoryPlaceIdsChange={setTerritoryPlaceIds}
                toggleNumberSelection={toggleNumberSelection}
              />
              <input className="sp-legacy-object-input" value={objectName} onChange={(event) => setObjectName(event.target.value)} />
            </label>
            <label>
              {ui.surname}
              <input value={objectSurname} onChange={(event) => setObjectSurname(event.target.value)} />
            </label>
            <label>
              {ui.role}
              <input value={objectRole} onChange={(event) => setObjectRole(event.target.value)} />
            </label>
            <label>
              {ui.yearAge}
              <input value={objectAge} onChange={(event) => setObjectAge(event.target.value)} />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={objectImagePath}
              label={ui.image}
              ui={ui}
              onFileSelected={(file) => void uploadObjectImage(file)}
            />
            <label className="wide">
              {ui.description}
              <textarea value={objectDescription} onChange={(event) => setObjectDescription(event.target.value)} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                {ui.cancel}
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveObject()}>
                {ui.save}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'detail' && selectedObject !== null && (
        <PreviewDialog title={`${ui.dossier}: ${selectedObject.name}`} onClose={() => setDialog(null)}>
          <ObjectDetail
            activeTab={dossierTab}
            attributeDefinitions={attributeDefinitions}
            attributeGroups={attributeGroups}
            dossierTimelineEventId={dossierTimelineEventId}
            galleryImageCaption={galleryImageCaption}
            galleryImagePath={galleryImagePath}
            storyObject={selectedObject}
            textLinkTargets={textLinkTargets}
            timelineEvents={timelineEvents}
            ui={ui}
            onAddGalleryImage={() => void addGalleryImage()}
            onDelete={() => setDialog('confirmDeleteObject')}
            onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
            onEdit={() => openEditObjectDialog(selectedObject)}
            onGalleryCaptionChange={setGalleryImageCaption}
            onGalleryImageUpload={async (file) => {
              if (file !== null) {
                const result = await uploadImageRequest(file, selectedProjectId)
                setGalleryImagePath(result.path)
              }
            }}
            onDossierTimelineEventIdChange={setDossierTimelineEventId}
            onOpenTimelineEvent={openTimelineEventFromDossier}
            onTabChange={setDossierTab}
          />
        </PreviewDialog>
      )}
      {dialog === 'relationDetail' && selectedRelationEdge !== null && (
        <PreviewDialog
          title={`${ui.relations}: ${getRelationLabel(selectedRelationEdge.relationType, ui)}`}
          onClose={() => {
            setDialog(null)
            setSelectedRelationEdgeId(null)
          }}
        >
          <RelationDetail
            edge={selectedRelationEdge}
            graph={relationGraph}
            objects={linkableObjects}
            ui={ui}
            onClose={() => {
              setDialog(null)
              setSelectedRelationEdgeId(null)
            }}
            onOpenObject={openRelationObjectDetail}
          />
        </PreviewDialog>
      )}
      {dialog === 'timelineEventDetail' && selectedTimelineEvent !== null && (
        <PreviewDialog
          title={`${ui.timelineEvent}: ${selectedTimelineEvent.title}`}
          onClose={() => {
            setDialog(null)
            setSelectedTimelineEventId(null)
          }}
        >
          <TimelineEventDetail
            event={selectedTimelineEvent}
            events={visibleTimelineEvents}
            galleryImageCaption={timelineGalleryImageCaption}
            galleryImagePath={timelineGalleryImagePath}
            links={timelineLinks}
            objects={linkableObjects}
            ui={ui}
            onAddGalleryImage={() => void addTimelineGalleryImage()}
            onClose={() => {
              setDialog(null)
              setSelectedTimelineEventId(null)
            }}
            onDelete={(eventId) => {
              setPendingDeleteTimelineEventId(eventId)
              setDialog('confirmDeleteTimelineEvent')
            }}
            onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
            onEdit={openTimelineEventEditor}
            onGalleryCaptionChange={setTimelineGalleryImageCaption}
            onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
            onOpenEvent={openTimelineEventDetail}
            onOpenObject={openObjectDetail}
          />
        </PreviewDialog>
      )}
      {dialog === 'confirmDeleteObject' && selectedObject !== null && (
        <DeletePreviewDialog
          title={ui.deleteObject}
          itemName={selectedObject.name}
          hint={ui.deleteObjectHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deleteSelectedObject()}
        />
      )}

      {dialog === 'attributeGroup' && (
        <AttributeGroupDialog
          title={editingAttributeGroupId === null ? ui.newGroup : ui.edit}
          groupName={attributeGroupName}
          iconKey={attributeGroupIconKey}
          ui={ui}
          onCancel={() => setDialog(null)}
          onIconKeyChange={setAttributeGroupIconKey}
          onNameChange={setAttributeGroupName}
          onSave={() => void saveAttributeGroup()}
        />
      )}

      {dialog === 'confirmDeleteAttributeGroup' && (
        <DeletePreviewDialog
          title={ui.deleteGroup}
          itemName={attributeGroups.find((group) => group.id === pendingDeleteAttributeGroupId)?.name ?? ui.group}
          hint={ui.groupDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deletePendingAttributeGroup()}
        />
      )}

      {dialog === 'confirmDeleteAttribute' && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={attributeDefinitions.find((definition) => definition.id === pendingDeleteAttributeDefinitionId)?.name ?? ui.attributes}
          hint={ui.attributeDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deletePendingAttributeDefinition()}
        />
      )}

      {dialog === 'catalog' && (
        <CatalogEditorDialog
          catalogDescription={catalogDescription}
          catalogDialogFields={catalogDialogFields}
          catalogDialogTab={catalogDialogTab}
          catalogFieldDraft={catalogFieldDraft}
          catalogHierarchyMode={catalogHierarchyMode}
          catalogName={catalogName}
          catalogSupportsHierarchy={catalogSupportsHierarchy}
          editingCatalogFieldId={editingCatalogFieldId}
          editingCatalogId={editingCatalogId}
          language={previewLanguage}
          ui={ui}
          visibleCatalogs={visibleCatalogs}
          onCancel={() => setDialog(null)}
          onCancelCatalogFieldEdit={() => {
            setEditingCatalogFieldId(null)
            setCatalogFieldDraft(emptyCatalogFieldDraft)
          }}
          onCatalogDescriptionChange={setCatalogDescription}
          onCatalogDialogTabChange={setCatalogDialogTab}
          onCatalogFieldDraftChange={setCatalogFieldDraft}
          onCatalogHierarchyModeChange={setCatalogHierarchyMode}
          onCatalogNameChange={setCatalogName}
          onCatalogSupportsHierarchyChange={(supportsHierarchy) => {
            setCatalogSupportsHierarchy(supportsHierarchy)
            if (!supportsHierarchy) {
              setCatalogHierarchyMode('entries')
            }
          }}
          onDeleteCatalogField={(fieldId) => void deleteCatalogField(fieldId)}
          onEditCatalogField={editCatalogField}
          onSaveCatalog={() => void saveCatalog()}
          onSaveCatalogField={() => void saveCatalogField()}
        />
      )}

      {dialog === 'catalogGroup' && selectedCatalog !== null && (
        <CatalogGroupDialog
          catalog={selectedCatalog}
          catalogGroupName={catalogGroupName}
          catalogGroupParentIds={catalogGroupParentIds}
          catalogGroups={catalogGroups}
          editingCatalogGroupId={editingCatalogGroupId}
          ui={ui}
          onCancel={() => setDialog(null)}
          onCatalogGroupNameChange={setCatalogGroupName}
          onCatalogGroupParentIdsChange={setCatalogGroupParentIds}
          onSave={() => void saveCatalogGroup()}
        />
      )}

      {dialog === 'catalogEntry' && selectedCatalog !== null && (
        <CatalogEntryDialog
          catalog={selectedCatalog}
          catalogEntries={catalogEntries}
          catalogEntriesByCatalogId={catalogEntriesByCatalogId}
          catalogEntryDraft={catalogEntryDraft}
          catalogGroups={catalogGroups}
          editingCatalogEntryId={editingCatalogEntryId}
          fieldDefinitions={selectedCatalogFields}
          language={previewLanguage}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onCancel={() => setDialog(null)}
          onCatalogEntryDraftChange={setCatalogEntryDraft}
          onSave={() => void saveCatalogEntry()}
        />
      )}

      {dialog === 'catalogEntryDetail' && selectedCatalogEntry !== null && (
        <PreviewDialog title={selectedCatalogEntry.name} onClose={() => setDialog(null)}>
          <CatalogEntryDetail
            catalog={selectedCatalog}
            catalogEntryLinksById={catalogEntryLinksById}
            fieldDefinitions={selectedCatalogFields}
            entry={selectedCatalogEntry}
            textLinkTargets={textLinkTargets}
            ui={ui}
            onDelete={() => {
              setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
              setDialog('confirmDeleteCatalogEntry')
            }}
            onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
          />
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteCatalogEntry' && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={catalogEntries.find((entry) => entry.id === pendingDeleteCatalogEntryId)?.name ?? ui.entry}
          hint={ui.catalogEntryDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deletePendingCatalogEntry()}
        />
      )}

      {dialog === 'confirmDeleteCatalog' && (visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog) !== null && (
        <DeletePreviewDialog
          title={ui.deleteCatalog}
          itemName={(visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog)?.name ?? ui.catalog}
          hint={ui.catalogDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deleteSelectedCatalog()}
        />
      )}

      {dialog === 'confirmDeleteCatalogGroup' && (
        <DeletePreviewDialog
          title={ui.deleteGroup}
          itemName={catalogGroups.find((group) => group.id === selectedCatalogGroupId)?.name ?? ui.group}
          hint={ui.catalogGroupDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deleteSelectedCatalogGroup()}
        />
      )}

      {dialog === 'timelineLink' && (
        <TimelineLinkDialog
          draft={timelineLinkDraft}
          events={timelineEvents}
          ui={ui}
          onCancel={() => setDialog(null)}
          onDraftChange={setTimelineLinkDraft}
          onSave={() => void saveTimelineLink()}
        />
      )}

      {dialog === 'relationLink' && (
        <RelationLinkDialog
          characters={objectsByType.characters}
          draft={relationLinkDraft}
          ui={ui}
          onCancel={() => setDialog(null)}
          onDraftChange={setRelationLinkDraft}
          onSave={() => void saveCharacterRelationLink()}
        />
      )}

      {dialog === 'timelineEvent' && (
        <TimelineEventDialog
          draft={timelineDraft}
          editingTimelineEventId={editingTimelineEventId}
          linkableObjects={linkableObjects}
          parentOptions={timelineDraftParentOptions}
          ui={ui}
          onCancel={() => setDialog(null)}
          onCoverFileSelected={async (file) => {
            try {
              const result = await uploadImageRequest(file, selectedProjectId)
              setTimelineDraft((draft) => ({ ...draft, imagePath: result.path }))
            } catch {
              showErrorMessage(messages.eventCoverUploadFailed)
            }
          }}
          onDraftChange={setTimelineDraft}
          onEventTypeChange={updateTimelineDraftEventType}
          onSave={() => void saveTimelineEvent()}
        />
      )}

      {dialog === 'confirmDeleteTimelineEvent' && (
        <DeletePreviewDialog
          title={ui.deleteTimelineEvent}
          itemName={timelineEvents.find((event) => event.id === pendingDeleteTimelineEventId)?.title ?? ui.timelineEvent}
          hint={ui.deleteTimelineEventHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deletePendingTimelineEvent()}
        />
      )}
    </main>
  )
}

