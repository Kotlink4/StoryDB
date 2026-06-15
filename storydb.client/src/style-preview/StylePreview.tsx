import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import 'react-advanced-cropper/dist/style.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveAssetUrl } from '../api'
import { CoverDropzone } from '../components/ImageInputs'
import { StylePreviewContent } from '../components/StylePreviewContent'
import { StylePreviewDialogHost } from '../components/StylePreviewDialogHost'
import { StylePreviewLayout } from '../components/StylePreviewLayout'
import {
  previewMessages,
  previewText,
  type PreviewLanguage,
  type PreviewTheme,
} from './domain/stylePreviewI18n'
import {
  buildStylePreviewPath,
  parseStylePreviewPath,
  previewRouteBase,
  type PreviewSection,
  type PreviewTab,
} from './domain/stylePreviewRouting'
import {
  emptyAttributeDefinitionDraft,
  emptyTimelineEventDraft,
  isObjectSection,
  objectSections,
  type PreviewDialogKind,
} from './domain/stylePreviewConfig'
import { readPreviewState, savePreviewState } from './domain/stylePreviewStateStorage'
import type {
  DetailMode,
  GroupDisplayMode,
  ObjectDossierTab,
} from './domain/stylePreviewUiTypes'
import { usePreviewToast } from './hooks/usePreviewToast'
import { useStylePreviewAuthCommands } from './hooks/useStylePreviewAuthCommands'
import { useStylePreviewAttributeCommands } from './hooks/useStylePreviewAttributeCommands'
import { useStylePreviewCatalogCommands } from './hooks/useStylePreviewCatalogCommands'
import { useStylePreviewCatalogDraft } from './hooks/useStylePreviewCatalogDraft'
import { useStylePreviewLinkTargets } from './hooks/useStylePreviewLinkTargets'
import { useStylePreviewNavigationCommands } from './hooks/useStylePreviewNavigationCommands'
import { useStylePreviewObjectCommands } from './hooks/useStylePreviewObjectCommands'
import { useStylePreviewObjectDraft } from './hooks/useStylePreviewObjectDraft'
import { useStylePreviewProfileDraft } from './hooks/useStylePreviewProfileDraft'
import { useStylePreviewProjectCommands } from './hooks/useStylePreviewProjectCommands'
import { useStylePreviewProjectDialog } from './hooks/useStylePreviewProjectDialog'
import { useStylePreviewProjects } from './hooks/useStylePreviewProjects'
import { useStylePreviewRelationCommands } from './hooks/useStylePreviewRelationCommands'
import { useStylePreviewSelections } from './hooks/useStylePreviewSelections'
import { useStylePreviewTimelineCommands } from './hooks/useStylePreviewTimelineCommands'
import { useStylePreviewDialogHostProps } from './hooks/useStylePreviewDialogHostProps'
import { useStylePreviewLayoutProps } from './hooks/useStylePreviewLayoutProps'
import { useStylePreviewWorkspaceData } from './hooks/useStylePreviewWorkspaceData'
import type {
  AttributeDefinitionDraft,
  ObjectTypeKey,
  RelationLinkDraft,
  TimelineEventDraft,
  TimelineEventLinkDraft,
} from '../types'
import './StylePreview.css'

export function StylePreview() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialPreviewState = useMemo(() => readPreviewState(), [])
  const routeState = useMemo(() => parseStylePreviewPath(location.pathname), [location.pathname])
  const { dismissMessage, message, messageTone, showErrorMessage, showMessage } = usePreviewToast()
  const {
    editingProjectId,
    openCreateProjectDialog,
    openEditProjectDialog,
    pendingDeleteProjectId,
    projectCoverImagePath,
    projectDialogTab,
    projectName,
    projectPresetKeys,
    resetProjectForm,
    setPendingDeleteProjectId,
    setProjectCoverImagePath,
    setProjectDialogTab,
    setProjectName,
    setProjectPresetKeys,
  } = useStylePreviewProjectDialog()
  const [activeTab, setActiveTab] = useState<PreviewTab>(routeState.activeTab ?? initialPreviewState.activeTab ?? 'database')
  const [activeSection, setActiveSection] = useState<PreviewSection>(
    routeState.activeSection ?? initialPreviewState.activeSection ?? 'characters',
  )
  const [isTimelineGenerating, setIsTimelineGenerating] = useState(false)
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<number | null>(null)
  const [editingTimelineEventId, setEditingTimelineEventId] = useState<number | null>(null)
  const [pendingDeleteTimelineEventId, setPendingDeleteTimelineEventId] = useState<number | null>(null)
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
  const [dossierTab, setDossierTab] = useState<ObjectDossierTab>('main')
  const [dossierTimelineEventId, setDossierTimelineEventId] = useState('')
  const [attributeGroupName, setAttributeGroupName] = useState('')
  const [attributeGroupIconKey, setAttributeGroupIconKey] = useState('')
  const [editingAttributeGroupId, setEditingAttributeGroupId] = useState<number | null>(null)
  const [editingAttributeDefinitionId, setEditingAttributeDefinitionId] = useState<number | null>(null)
  const [pendingDeleteAttributeGroupId, setPendingDeleteAttributeGroupId] = useState<number | null>(null)
  const [pendingDeleteAttributeDefinitionId, setPendingDeleteAttributeDefinitionId] = useState<number | null>(null)
  const [attributeDefinitionDraft, setAttributeDefinitionDraft] = useState<AttributeDefinitionDraft>(
    emptyAttributeDefinitionDraft,
  )
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null)
  const [galleryImageCaption, setGalleryImageCaption] = useState('')
  const [timelineGalleryImagePath, setTimelineGalleryImagePath] = useState<string | null>(null)
  const [timelineGalleryImageCaption, setTimelineGalleryImageCaption] = useState('')
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
  const [isObjectSaving, setIsObjectSaving] = useState(false)
  const ui = previewText[previewLanguage]
  const messages = previewMessages[previewLanguage]
  const handleProjectsLoadFailed = useCallback(() => {
    showErrorMessage(messages.apiUnavailable)
  }, [messages.apiUnavailable, showErrorMessage])
  const {
    currentUser,
    isLoadingProjects,
    loadProjects,
    projects,
    selectedProjectId,
    setCurrentUser,
    setProjects,
    setSelectedProjectId,
  } = useStylePreviewProjects({
    initialSelectedProjectId: initialPreviewState.selectedProjectId,
    routeProjectId: routeState.projectId,
    onLoadFailed: handleProjectsLoadFailed,
  })
  const {
    isProfileSaving,
    profileAvatarImagePath,
    profileDisplayName,
    profileEmail,
    profileProjectQuery,
    setIsProfileSaving,
    setProfileAvatarImagePath,
    setProfileDisplayName,
    setProfileEmail,
    setProfileProjectQuery,
  } = useStylePreviewProfileDraft(currentUser)
  const {
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    draftTimelineParticipations,
    editingObjectId,
    editorTimelineEventId,
    fillObjectForm,
    objectAge,
    objectDescription,
    objectEditorTab,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    parentObjectIds,
    resetObjectForm,
    saveObjectAsTimelineChange,
    setDraftAttributes,
    setDraftCatalogSelections,
    setDraftCharacterRelationships,
    setDraftHierarchySelections,
    setDraftTimelineParticipations,
    setEditorTimelineEventId,
    setObjectAge,
    setObjectDescription,
    setObjectEditorTab,
    setObjectImagePath,
    setObjectName,
    setObjectRole,
    setObjectSurname,
    setObjectSurnameForm,
    setOwnedItemIds,
    setOwnerCharacterIds,
    setOwnerOrganizationIds,
    setSaveObjectAsTimelineChange,
    setTerritoryPlaceIds,
    territoryPlaceIds,
  } = useStylePreviewObjectDraft()
  const {
    catalogDescription,
    catalogDialogTab,
    catalogEntryDraft,
    catalogFieldDraft,
    catalogGroupName,
    catalogGroupParentIds,
    catalogHierarchyMode,
    catalogName,
    catalogSupportsHierarchy,
    editingCatalogEntryId,
    editingCatalogFieldId,
    editingCatalogGroupId,
    editingCatalogId,
    fillCatalogDraft,
    fillCatalogEntryDraft,
    fillCatalogFieldDraft,
    fillCatalogGroupDraft,
    pendingDeleteCatalogEntryId,
    pendingDeleteCatalogId,
    resetCatalogDraft,
    resetCatalogEntryDraft,
    resetCatalogFieldDraft,
    resetCatalogGroupDraft,
    selectedCatalogEntryId,
    selectedCatalogGroupId,
    setCatalogDescription,
    setCatalogDialogTab,
    setCatalogEntryDraft,
    setCatalogFieldDraft,
    setCatalogGroupName,
    setCatalogGroupParentIds,
    setCatalogHierarchyMode,
    setCatalogName,
    setCatalogSupportsHierarchy,
    setEditingCatalogFieldId,
    setPendingDeleteCatalogEntryId,
    setPendingDeleteCatalogId,
    setSelectedCatalogEntryId,
    setSelectedCatalogGroupId,
  } = useStylePreviewCatalogDraft()
  const {
    attributeDefinitions,
    attributeGroups,
    catalogEntries,
    catalogEntriesByCatalogId,
    catalogFieldsByCatalogId,
    catalogGroups,
    catalogGroupsByCatalogId,
    catalogs,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    loadObjectEditorData,
    objects,
    objectsByType,
    relationGraph,
    relationGraphLayout,
    selectedAttributeGroupId,
    selectedCatalogId,
    setAttributeDefinitions,
    setAttributeGroups,
    setCatalogEntries,
    setCatalogEntriesByCatalogId,
    setCatalogFieldsByCatalogId,
    setCatalogGroups,
    setCatalogs,
    setObjects,
    setRelationGraph,
    setRelationGraphLayout,
    setSelectedAttributeGroupId,
    setSelectedCatalogId,
    setTimelineEvents,
    setTimelineLayout,
    setTimelineLinks,
    timelineEvents,
    timelineInfo,
    timelineLayout,
    timelineLayoutRules,
    timelineLinks,
  } = useStylePreviewWorkspaceData({
    activeSection,
    initialCatalogId: routeState.catalogId,
    messages,
    selectedObjectId,
    selectedProjectId: currentUser === null || isProfilePageOpen || isSettingsPageOpen ? null : selectedProjectId,
    setSelectedObjectId,
    showErrorMessage,
    showMessage,
  })
  const isLoading = !isProfilePageOpen && !isSettingsPageOpen && isLoadingProjects
  const currentUserAvatarUrl = resolveAssetUrl(currentUser?.avatarImagePath ?? null)
  const {
    catalogDialogFields,
    enabledObjectTypes,
    selectedCatalog,
    selectedCatalogEntry,
    selectedCatalogFields,
    selectedObject,
    selectedProject,
    selectedRelationEdge,
    selectedTimelineEvent,
    timelineDraftParentOptions,
    visibleCatalogs,
    visibleObjects,
    visibleTimelineEvents,
  } = useStylePreviewSelections({
    catalogEntries,
    catalogEntriesByCatalogId,
    catalogFieldsByCatalogId,
    catalogs,
    editingCatalogId,
    editingTimelineEventId,
    objects,
    projects,
    relationGraph,
    selectedCatalogEntryId,
    selectedCatalogId,
    selectedObjectId,
    selectedProjectId,
    selectedRelationEdgeId,
    selectedTimelineEventId,
    timelineEvents,
  })
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
    if (currentUser === null) {
      setIsSettingsPageOpen(false)
      setIsProfilePageOpen(true)
      setDialog('auth')
      navigate(`${previewRouteBase}/profile`)
      return
    }

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

  const {
    logout,
    saveProfile,
    submitAuth,
    uploadProfileAvatar,
  } = useStylePreviewAuthCommands({
    authDisplayName,
    authEmail,
    authMode,
    authPassword,
    currentUser,
    isProfileSaving,
    loadProjects,
    messages,
    navigateHome: () => navigate(`${previewRouteBase}/profile`),
    profileAvatarImagePath,
    profileDisplayName,
    profileEmail,
    setCurrentUser,
    setDialog,
    setIsProfilePageOpen,
    setIsProfileSaving,
    setIsSettingsPageOpen,
    setObjects,
    setProfileAvatarImagePath,
    setProjects,
    setSelectedProjectId,
    showErrorMessage,
    showMessage,
  })

  const {
    deletePendingProject,
    saveProject,
    uploadProjectCover,
  } = useStylePreviewProjectCommands({
    editingProjectId,
    messages,
    navigateToPreview,
    pendingDeleteProjectId,
    projectCoverImagePath,
    projectName,
    projectPresetKeys,
    projects,
    resetProjectForm,
    selectedProjectId,
    setDialog,
    setPendingDeleteProjectId,
    setProjectCoverImagePath,
    setProjects,
    setSelectedProjectId,
    showErrorMessage,
  })

  const {
    addGalleryImage,
    deleteGalleryImage,
    deleteSelectedObject,
    openCreateObjectDialog,
    openEditObjectDialog,
    saveObject,
    uploadGalleryImage,
    uploadObjectImage,
  } = useStylePreviewObjectCommands({
    activeSection,
    attributeDefinitions,
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    draftTimelineParticipations,
    editingObjectId,
    editorTimelineEventId,
    fillObjectForm,
    galleryImageCaption,
    galleryImagePath,
    isObjectSaving,
    loadObjectEditorData,
    messages,
    navigateToPreview,
    objectAge,
    objectDescription,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    objects,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    parentObjectIds,
    resetObjectForm,
    saveObjectAsTimelineChange,
    selectedObject,
    selectedObjectId,
    selectedProjectId,
    setDialog,
    setGalleryImageCaption,
    setGalleryImagePath,
    setIsObjectSaving,
    setObjectImagePath,
    setObjects,
    setRelationGraph,
    setRelationGraphLayout,
    setSelectedObjectId,
    setSelectedTimelineEventId,
    setTimelineEvents,
    setTimelineLayout,
    showErrorMessage,
    showMessage,
    territoryPlaceIds,
    timelineEvents,
  })

  const {
    createCatalogEntryDraftForGroup,
    deleteCatalogField,
    deletePendingCatalogEntry,
    deleteSelectedCatalog,
    deleteSelectedCatalogGroup,
    editCatalogField,
    openCatalogEntryDetail,
    openEditCatalog,
    openEditCatalogEntry,
    openEditCatalogGroup,
    saveCatalog,
    saveCatalogEntry,
    saveCatalogField,
    saveCatalogGroup,
  } = useStylePreviewCatalogCommands({
    catalogDescription,
    catalogEntryDraft,
    catalogEntriesByCatalogId,
    catalogFieldDraft,
    catalogFieldsByCatalogId,
    catalogGroupName,
    catalogGroupParentIds,
    catalogHierarchyMode,
    catalogName,
    catalogSupportsHierarchy,
    detailMode,
    editingCatalogEntryId,
    editingCatalogFieldId,
    editingCatalogGroupId,
    editingCatalogId,
    fillCatalogDraft,
    fillCatalogEntryDraft,
    fillCatalogFieldDraft,
    fillCatalogGroupDraft,
    messages,
    navigateToPreview,
    pendingDeleteCatalogEntryId,
    pendingDeleteCatalogId,
    resetCatalogDraft,
    resetCatalogEntryDraft,
    resetCatalogFieldDraft,
    resetCatalogGroupDraft,
    selectedCatalog,
    selectedCatalogGroupId,
    selectedProjectId,
    setActiveSection,
    setActiveTab,
    setCatalogEntries,
    setCatalogEntriesByCatalogId,
    setCatalogEntryDraft,
    setCatalogFieldsByCatalogId,
    setCatalogGroups,
    setCatalogs,
    setDialog,
    setIsObjectPageOpen,
    setPendingDeleteCatalogEntryId,
    setPendingDeleteCatalogId,
    setSelectedCatalogEntryId,
    setSelectedCatalogGroupId,
    setSelectedCatalogId,
    setSelectedObjectId,
    showErrorMessage,
    visibleCatalogs,
  })

  const {
    deletePendingAttributeDefinition,
    deletePendingAttributeGroup,
    openEditAttributeDefinition,
    openEditAttributeGroup,
    saveAttributeDefinition,
    saveAttributeGroup,
  } = useStylePreviewAttributeCommands({
    attributeDefinitionDraft,
    attributeGroupIconKey,
    attributeGroupName,
    attributeGroups,
    editingAttributeDefinitionId,
    editingAttributeGroupId,
    messages,
    pendingDeleteAttributeDefinitionId,
    pendingDeleteAttributeGroupId,
    selectedAttributeGroupId,
    selectedProjectId,
    setAttributeDefinitionDraft,
    setAttributeDefinitions,
    setAttributeGroupIconKey,
    setAttributeGroupName,
    setAttributeGroups,
    setDialog,
    setEditingAttributeDefinitionId,
    setEditingAttributeGroupId,
    setPendingDeleteAttributeDefinitionId,
    setPendingDeleteAttributeGroupId,
    setSelectedAttributeGroupId,
    showErrorMessage,
  })

  useEffect(() => {
    if (isLoading || currentUser !== null) {
      return
    }

    setIsSettingsPageOpen(false)
    setIsProfilePageOpen(true)
    setSelectedProjectId(null)
    setSelectedObjectId(null)

    if (routeState.utilityPage !== 'profile') {
      navigate(`${previewRouteBase}/profile`, { replace: true })
    }
  }, [currentUser, isLoading, navigate, routeState.utilityPage, setSelectedProjectId])

  useEffect(() => {
    if (
      !isLoading &&
      routeState.utilityPage === null &&
      routeState.projectId === null
    ) {
      setIsSettingsPageOpen(false)
      setIsProfilePageOpen(true)
      navigate(`${previewRouteBase}/profile`, { replace: true })
    }
  }, [
    isLoading,
    navigate,
    routeState.projectId,
    routeState.utilityPage,
  ])

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

  const toggleNumberSelection = (values: number[], value: number) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

  const {
    openObjectDetail,
    openRelationDetail,
    openRelationObjectDetail,
    openTimelineEventDetail,
    openTimelineEventFromDossier,
  } = useStylePreviewNavigationCommands({
    activeSection,
    detailMode,
    navigateToPreview,
    objectsByType,
    selectedProjectId,
    setActiveSection,
    setActiveTab,
    setDialog,
    setIsObjectPageOpen,
    setIsRelationPageOpen,
    setIsTimelineEventPageOpen,
    setObjects,
    setSelectedCatalogEntryId,
    setSelectedObjectId,
    setSelectedRelationEdgeId,
    setSelectedRelationObjectId,
    setSelectedTimelineEventId,
  })

  const {
    catalogEntryLinksById,
    linkableObjects,
    selectedRelationObject,
    textLinkTargets,
  } = useStylePreviewLinkTargets({
    catalogEntries,
    catalogEntriesByCatalogId,
    objectsByType,
    selectedCatalog,
    selectedCatalogEntry,
    selectedObject,
    selectedRelationObjectId,
    visibleObjects,
    onOpenCatalogEntry: openCatalogEntryDetail,
    onOpenObject: openObjectDetail,
  })

  const {
    addTimelineGalleryImage,
    deletePendingTimelineEvent,
    deleteTimelineGalleryImage,
    deleteTimelineLink,
    generateTimelineLayout,
    openTimelineEventEditor,
    saveTimelineEvent,
    saveTimelineLink,
    updateTimelineDraftEventType,
    uploadTimelineEventCover,
    uploadTimelineGalleryImage,
  } = useStylePreviewTimelineCommands({
    editingTimelineEventId,
    messages,
    pendingDeleteTimelineEventId,
    selectedProjectId,
    selectedTimelineEvent,
    setActiveTab,
    setDialog,
    setEditingTimelineEventId,
    setIsTimelineGenerating,
    setPendingDeleteTimelineEventId,
    setSelectedTimelineEventId,
    setTimelineDraft,
    setTimelineEvents,
    setTimelineGalleryImageCaption,
    setTimelineGalleryImagePath,
    setTimelineLayout,
    setTimelineLinkDraft,
    setTimelineLinks,
    showErrorMessage,
    timelineDraft,
    timelineGalleryImageCaption,
    timelineGalleryImagePath,
    timelineLinkDraft,
  })

  const {
    generateRelationGraphLayout,
    saveCharacterRelationLink,
    saveRelationGraphNodePosition,
  } = useStylePreviewRelationCommands({
    linkableObjects,
    messages,
    relationGraph,
    relationGraphLayout,
    relationLinkDraft,
    selectedProjectId,
    setDialog,
    setIsRelationLayoutGenerating,
    setObjects,
    setRelationGraph,
    setRelationGraphLayout,
    setRelationLinkDraft,
    showErrorMessage,
  })

  const objectEditorProps = {
    activeType: isObjectSection(activeSection) ? activeSection : 'characters',
    attributeDefinitions,
    attributeGroups,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs,
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    draftTimelineParticipations,
    editingObjectId,
    editorTimelineEventId,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    isSaving: isObjectSaving,
    objectAge,
    objectDescription,
    objectEditorTab,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    objectsByType,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    saveObjectAsTimelineChange,
    timelineEvents,
    territoryPlaceIds,
    ui,
    onCancel: () => setDialog(null),
    onDraftAttributesChange: setDraftAttributes,
    onDraftCatalogSelectionsChange: setDraftCatalogSelections,
    onDraftCharacterRelationshipsChange: setDraftCharacterRelationships,
    onDraftHierarchySelectionsChange: setDraftHierarchySelections,
    onDraftTimelineParticipationsChange: setDraftTimelineParticipations,
    onEditorTimelineEventIdChange: setEditorTimelineEventId,
    onImageUpload: uploadObjectImage,
    onObjectAgeChange: setObjectAge,
    onObjectDescriptionChange: setObjectDescription,
    onObjectEditorTabChange: setObjectEditorTab,
    onObjectNameChange: setObjectName,
    onObjectRoleChange: setObjectRole,
    onObjectSurnameChange: setObjectSurname,
    onObjectSurnameFormChange: setObjectSurnameForm,
    onOwnedItemIdsChange: setOwnedItemIds,
    onOwnerCharacterIdsChange: setOwnerCharacterIds,
    onOwnerOrganizationIdsChange: setOwnerOrganizationIds,
    onSave: () => void saveObject(),
    onSaveObjectAsTimelineChange: setSaveObjectAsTimelineChange,
    onTerritoryPlaceIdsChange: setTerritoryPlaceIds,
    toggleNumberSelection,
  }

  const objectDetailProps = {
    activeTab: dossierTab,
    attributeDefinitions,
    attributeGroups,
    dossierTimelineEventId,
    galleryImageCaption,
    galleryImagePath,
    objectsByType,
    selectedProjectId,
    textLinkTargets,
    timelineEvents,
    ui,
    onAddGalleryImage: () => void addGalleryImage(),
    onDelete: () => setDialog('confirmDeleteObject'),
    onDeleteGalleryImage: (imageId: number) => void deleteGalleryImage(imageId),
    onGalleryCaptionChange: setGalleryImageCaption,
    onGalleryImageUpload: (file: File | null) => void uploadGalleryImage(file),
    onDossierTimelineEventIdChange: setDossierTimelineEventId,
    onOpenTimelineEvent: openTimelineEventFromDossier,
    onTabChange: setDossierTab,
  }

  const relationDetailProps = {
    graph: relationGraph,
    objects: linkableObjects,
    ui,
    onOpenObject: openRelationObjectDetail,
  }

  const timelineEventDetailProps = {
    events: visibleTimelineEvents,
    galleryImageCaption: timelineGalleryImageCaption,
    galleryImagePath: timelineGalleryImagePath,
    links: timelineLinks,
    objects: linkableObjects,
    ui,
    onAddGalleryImage: () => void addTimelineGalleryImage(),
    onDelete: (eventId: number) => {
      setPendingDeleteTimelineEventId(eventId)
      setDialog('confirmDeleteTimelineEvent')
    },
    onDeleteGalleryImage: (imageId: number) => void deleteTimelineGalleryImage(imageId),
    onEdit: openTimelineEventEditor,
    onGalleryCaptionChange: setTimelineGalleryImageCaption,
    onGalleryImageUpload: (file: File | null) => void uploadTimelineGalleryImage(file),
    onOpenEvent: openTimelineEventDetail,
    onOpenObject: openObjectDetail,
  }

  const catalogEntryDetailProps = {
    catalog: selectedCatalog,
    catalogEntryLinksById,
    fieldDefinitions: selectedCatalogFields,
    textLinkTargets,
    ui,
  }

  const timelineLinkDialogProps = {
    draft: timelineLinkDraft,
    events: timelineEvents,
    ui,
    onCancel: () => setDialog(null),
    onDraftChange: setTimelineLinkDraft,
    onSave: () => void saveTimelineLink(),
  }

  const relationLinkDialogProps = {
    characters: objectsByType.characters,
    draft: relationLinkDraft,
    ui,
    onCancel: () => setDialog(null),
    onDraftChange: setRelationLinkDraft,
    onSave: () => void saveCharacterRelationLink(),
  }

  const timelineEventDialogProps = {
    draft: timelineDraft,
    editingTimelineEventId,
    linkableObjects,
    parentOptions: timelineDraftParentOptions,
    ui,
    onCancel: () => setDialog(null),
    onCoverFileSelected: (file: File) => void uploadTimelineEventCover(file),
    onDraftChange: setTimelineDraft,
    onEventTypeChange: updateTimelineDraftEventType,
    onSave: () => void saveTimelineEvent(),
  }

  const profilePageProps = {
    avatarDropzone: (
      <CoverDropzone
        className="avatar"
        imagePath={profileAvatarImagePath}
        label={ui.avatar}
        ui={ui}
        onFileSelected={(file) => void uploadProfileAvatar(file)}
      />
    ),
    currentUser,
    displayName: profileDisplayName,
    email: profileEmail,
    isSaving: isProfileSaving,
    projectQuery: profileProjectQuery,
    projects,
    selectedProjectId,
    ui,
    onCreateProject: () => {
      openCreateProjectDialog()
      setDialog('project')
    },
    onDeleteProject: (project: typeof projects[number]) => {
      setPendingDeleteProjectId(project.id)
      setDialog('confirmDeleteProject')
    },
    onDisplayNameChange: setProfileDisplayName,
    onEditProject: (project: typeof projects[number]) => {
      openEditProjectDialog(project)
      setDialog('project')
    },
    onEmailChange: setProfileEmail,
    onOpenProject: (project: typeof projects[number]) => {
      setIsProfilePageOpen(false)
      navigateToPreview(project.id, 'database', 'characters')
    },
    onProjectQueryChange: setProfileProjectQuery,
    onSave: () => void saveProfile(),
  }

  const settingsPageProps = {
    detailMode,
    groupDisplayMode,
    previewLanguage,
    previewTheme,
    ui,
    onDetailModeChange: setDetailMode,
    onGroupDisplayModeChange: setGroupDisplayMode,
    onLanguageChange: setPreviewLanguage,
    onThemeChange: setPreviewTheme,
  }

  const relationDetailPageProps = {
    relationDetailProps,
    ui,
    onBack: () => setIsRelationPageOpen(false),
  }

  const relationsPageProps = {
    graph: relationGraph,
    isLayoutGenerating: isRelationLayoutGenerating,
    layout: relationGraphLayout,
    objects: linkableObjects,
    selectedEdgeId: selectedRelationEdgeId,
    ui,
    onCreateRelation: () => setDialog('relationLink'),
    onGenerateLayout: () => void generateRelationGraphLayout(),
    onSaveNodePosition: (storyObjectId: number, position: { x: number; y: number }) =>
      void saveRelationGraphNodePosition(storyObjectId, position),
    onSelectEdge: openRelationDetail,
    onSelect: openRelationObjectDetail,
  }

  const timelineEventDetailPageProps = {
    timelineEventDetailProps,
    ui,
    onBack: () => setIsTimelineEventPageOpen(false),
  }

  const timelinePageProps = {
    events: visibleTimelineEvents,
    isGenerating: isTimelineGenerating,
    layout: timelineLayout,
    layoutRules: timelineLayoutRules,
    links: timelineLinks,
    selectedEvent: selectedTimelineEvent,
    timeline: timelineInfo,
    ui,
    onCreate: () => openTimelineEventEditor(),
    onCreateLink: () => setDialog('timelineLink'),
    onDeleteLink: (linkId: number) => void deleteTimelineLink(linkId),
    onGenerate: () => void generateTimelineLayout(),
    onSelectEvent: openTimelineEventDetail,
  }

  const objectDetailPageProps = {
    objectDetailProps,
    ui,
    onBack: () => navigateToPreview(selectedProjectId, 'database', activeSection),
    onEdit: openEditObjectDialog,
  }

  const catalogEntryDetailPageProps = {
    catalogEntryDetailProps,
    ui,
    onBack: () => setSelectedCatalogEntryId(null),
    onDelete: (entry: typeof catalogEntries[number]) => {
      setPendingDeleteCatalogEntryId(entry.id)
      setDialog('confirmDeleteCatalogEntry')
    },
    onEdit: openEditCatalogEntry,
  }

  const catalogsWorkspaceProps = {
    catalogEntries,
    catalogGroups,
    catalogs: visibleCatalogs,
    groupDisplayMode,
    selectedCatalog,
    selectedCatalogGroupId,
    textLinkTargets,
    ui,
    onDeleteEntry: (entry: typeof catalogEntries[number]) => {
      setPendingDeleteCatalogEntryId(entry.id)
      setDialog('confirmDeleteCatalogEntry')
    },
    onEditCatalog: openEditCatalog,
    onEditEntry: openEditCatalogEntry,
    onEditGroup: openEditCatalogGroup,
    onCreateGroup: () => {
      resetCatalogGroupDraft()
      setDialog('catalogGroup')
    },
    onCreateEntry: () => {
      createCatalogEntryDraftForGroup(selectedCatalogGroupId)
      setDialog('catalogEntry')
    },
    onDeleteCatalog: () => {
      setPendingDeleteCatalogId(selectedCatalog?.id ?? null)
      setDialog('confirmDeleteCatalog')
    },
    onDeleteGroup: (groupId: number) => {
      setSelectedCatalogGroupId(groupId)
      setDialog('confirmDeleteCatalogGroup')
    },
    onSelectCatalog: (catalogId: number) => navigateToPreview(selectedProjectId, 'database', 'catalogs', null, catalogId),
    onOpenEntry: openCatalogEntryDetail,
    onSelectGroup: setSelectedCatalogGroupId,
  }

  const attributesWorkspaceProps = {
    attributeDefinitionDraft,
    attributeDefinitions,
    attributeGroupIconKey,
    attributeGroupName,
    attributeGroups,
    groupDisplayMode,
    editingAttributeDefinitionId,
    language: previewLanguage,
    selectedAttributeGroupId,
    ui,
    onCancelAttributeEdit: () => {
      setEditingAttributeDefinitionId(null)
      setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
    },
    onAttributeDefinitionDraftChange: setAttributeDefinitionDraft,
    onAttributeGroupIconChange: setAttributeGroupIconKey,
    onAttributeGroupNameChange: setAttributeGroupName,
    onCreateAttribute: () => void saveAttributeDefinition(),
    onCreateGroup: () => void saveAttributeGroup(),
    onDeleteAttribute: (definition: typeof attributeDefinitions[number]) => {
      setPendingDeleteAttributeDefinitionId(definition.id)
      setDialog('confirmDeleteAttribute')
    },
    onDeleteGroup: (group: typeof attributeGroups[number]) => {
      setPendingDeleteAttributeGroupId(group.id)
      setDialog('confirmDeleteAttributeGroup')
    },
    onEditAttribute: openEditAttributeDefinition,
    onEditGroup: openEditAttributeGroup,
    onSelectGroup: setSelectedAttributeGroupId,
  }

  const structuresWorkspaceProps = {
    catalogs: visibleCatalogs,
    errorMessage: messages.apiUnavailable,
    ui,
    onError: showErrorMessage,
    onMessage: showMessage,
  }

  const objectSectionLabel = isObjectSection(activeSection) ? getObjectSectionLabel(activeSection) : ui.catalogs

  const objectCardsWorkspaceProps = {
    activeObjectMenuId,
    currentUser,
    layoutMode,
    sectionTitle: isObjectSection(activeSection) ? objectSectionLabel : ui.database,
    selectedObjectId: selectedObject?.id ?? null,
    ui,
    viewSectionLabel: objectSectionLabel,
    visibleObjects,
    onCreateObject: openCreateObjectDialog,
    onDeleteObject: (storyObject: typeof visibleObjects[number]) => {
      setSelectedObjectId(storyObject.id)
      setDialog('confirmDeleteObject')
    },
    onEditObject: openEditObjectDialog,
    onLayoutModeChange: setLayoutMode,
    onObjectMenuChange: setActiveObjectMenuId,
    onOpenObject: openObjectDetail,
  }

  const renderContent = () => (
    <StylePreviewContent
      activeSection={activeSection}
      activeTab={activeTab}
      attributesWorkspaceProps={attributesWorkspaceProps}
      catalogEntryDetailPageProps={catalogEntryDetailPageProps}
      catalogsWorkspaceProps={catalogsWorkspaceProps}
      currentUser={currentUser}
      detailMode={detailMode}
      isObjectPageOpen={isObjectPageOpen}
      isProfilePageOpen={isProfilePageOpen}
      isRelationPageOpen={isRelationPageOpen}
      isSettingsPageOpen={isSettingsPageOpen}
      isTimelineEventPageOpen={isTimelineEventPageOpen}
      objectCardsWorkspaceProps={objectCardsWorkspaceProps}
      objectDetailPageProps={objectDetailPageProps}
      profilePageProps={profilePageProps}
      relationDetailPageProps={relationDetailPageProps}
      relationsPageProps={relationsPageProps}
      selectedCatalogEntry={selectedCatalogEntry}
      selectedObject={selectedObject}
      selectedProject={selectedProject}
      selectedRelationEdge={selectedRelationEdge}
      selectedTimelineEvent={selectedTimelineEvent}
      settingsPageProps={settingsPageProps}
      structuresWorkspaceProps={structuresWorkspaceProps}
      timelineEventDetailPageProps={timelineEventDetailPageProps}
      timelinePageProps={timelinePageProps}
      ui={ui}
    />
  )

  const layoutProps = useStylePreviewLayoutProps({
    activeSection,
    activeTab,
    detailMode,
    isLoading,
    isProfilePageOpen,
    isSettingsPageOpen,
    navigate,
    navigateToPreview,
    navigateToWorkspace,
    previewLanguage,
    previewTheme,
    selectedCatalogEntry,
    selectedCatalogId,
    selectedObject,
    selectedRelationEdge,
    selectedRelationObject,
    selectedTimelineEvent,
    toastMessage: message,
    toastTone: messageTone,
    ui,
    onDismissToast: dismissMessage,
    setDialog,
    setIsProfilePageOpen,
    setIsSettingsOpen,
    setIsSettingsPageOpen,
    topbar: {
      activeTab,
      currentUser,
      currentUserAvatarUrl,
      isSettingsOpen,
      ui,
    },
    topbarHandlers: {
      logout,
      openCreateObjectDialog,
    },
    projectbar: {
      activeTab,
      currentUser,
      projects,
      selectedProjectId,
      ui,
    },
    sidebar: {
      activeSection,
      activeTab,
      attributeGroups,
      catalogGroups,
      currentUser,
      enabledObjectTypes,
      groupDisplayMode,
      selectedAttributeGroupId,
      selectedCatalog,
      selectedCatalogGroupId,
      selectedProject,
      ui,
      visibleCatalogs,
      visibleObjectsCount: visibleObjects.length,
      visibleTimelineEventsCount: visibleTimelineEvents.length,
    },
    sidebarHandlers: {
      onEditAttributeGroup: openEditAttributeGroup,
      onEditCatalog: openEditCatalog,
      onEditCatalogGroup: openEditCatalogGroup,
      onSelectAttributeGroup: setSelectedAttributeGroupId,
      onSelectCatalogGroup: setSelectedCatalogGroupId,
      resetCatalogDraft,
      resetCatalogFieldDraft,
      resetCatalogGroupDraft,
      setCatalogDialogTab,
      setPendingDeleteAttributeGroupId,
      setPendingDeleteCatalogId,
      setSelectedCatalogGroupId,
    },
    detailPanels: {
      activeSection,
      activeTab,
      catalogEntryDetailProps,
      detailMode,
      isProfilePageOpen,
      isSettingsPageOpen,
      objectDetailProps,
      relationDetailProps,
      selectedCatalogEntry,
      selectedObject,
      selectedRelationEdge,
      selectedRelationObject,
      selectedTimelineEvent,
      timelineEventDetailProps,
    },
    detailPanelHandlers: {
      onEditCatalogEntry: openEditCatalogEntry,
      onEditObject: openEditObjectDialog,
      setPendingDeleteCatalogEntryId,
      setSelectedObjectId,
      setSelectedRelationEdgeId,
      setSelectedRelationObjectId,
      setSelectedTimelineEventId,
    },
  })

  const dialogHostProps = useStylePreviewDialogHostProps({
    setDialog,
    project: {
      authDisplayName,
      authEmail,
      authMode,
      authPassword,
      currentUser,
      dialog,
      editingProjectId,
      pendingDeleteProjectId,
      projectCoverImagePath,
      projectDialogTab,
      projectName,
      projectPresetKeys,
      projects,
      ui,
    },
    projectHandlers: {
      onAuthDisplayNameChange: setAuthDisplayName,
      onAuthEmailChange: setAuthEmail,
      onAuthModeChange: setAuthMode,
      onAuthPasswordChange: setAuthPassword,
      onProjectDialogTabChange: setProjectDialogTab,
      onProjectNameChange: setProjectName,
      onProjectPresetKeysChange: setProjectPresetKeys,
      deletePendingProject,
      logout,
      saveProject,
      submitAuth,
      uploadProjectCover,
    },
    object: {
      dialog,
      editingObjectId,
      objectAge,
      objectDescription,
      objectDetailProps,
      objectEditorProps,
      objectImagePath,
      objectName,
      objectRole,
      objectSurname,
      selectedObject,
      ui,
    },
    objectHandlers: {
      deleteSelectedObject,
      openEditObjectDialog,
    },
    detail: {
      dialog,
      relationDetailProps,
      selectedRelationEdge,
      selectedTimelineEvent,
      timelineEventDetailProps,
      ui,
    },
    detailHandlers: {
      setSelectedRelationEdgeId,
      setSelectedTimelineEventId,
    },
    attribute: {
      attributeDefinitions,
      attributeGroupIconKey,
      attributeGroupName,
      attributeGroups,
      dialog,
      editingAttributeGroupId,
      language: previewLanguage,
      pendingDeleteAttributeDefinitionId,
      pendingDeleteAttributeGroupId,
      ui,
    },
    attributeHandlers: {
      onAttributeGroupIconChange: setAttributeGroupIconKey,
      onAttributeGroupNameChange: setAttributeGroupName,
      deletePendingAttributeDefinition,
      deletePendingAttributeGroup,
      saveAttributeGroup,
    },
    catalog: {
      catalogDescription,
      catalogDialogFields,
      catalogDialogTab,
      catalogEntries,
      catalogEntriesByCatalogId,
      catalogEntryDraft,
      catalogEntryLinksById,
      catalogFieldDraft,
      catalogGroupName,
      catalogGroupParentIds,
      catalogGroups,
      catalogHierarchyMode,
      catalogName,
      catalogSupportsHierarchy,
      dialog,
      editingCatalogEntryId,
      editingCatalogFieldId,
      editingCatalogGroupId,
      editingCatalogId,
      language: previewLanguage,
      pendingDeleteCatalogEntryId,
      pendingDeleteCatalogId,
      selectedCatalog,
      selectedCatalogEntry,
      selectedCatalogFields,
      selectedCatalogGroupId,
      selectedProjectId,
      textLinkTargets,
      ui,
      visibleCatalogs,
    },
    catalogHandlers: {
      onCatalogDescriptionChange: setCatalogDescription,
      onCatalogDialogTabChange: setCatalogDialogTab,
      onCatalogEntryDraftChange: setCatalogEntryDraft,
      onCatalogFieldDraftChange: setCatalogFieldDraft,
      onCatalogGroupNameChange: setCatalogGroupName,
      onCatalogGroupParentIdsChange: setCatalogGroupParentIds,
      onCatalogHierarchyModeChange: setCatalogHierarchyMode,
      onCatalogNameChange: setCatalogName,
      onEditCatalogField: editCatalogField,
      onEditSelectedCatalogEntry: openEditCatalogEntry,
      deleteCatalogField,
      deletePendingCatalogEntry,
      deleteSelectedCatalog,
      deleteSelectedCatalogGroup,
      saveCatalog,
      saveCatalogEntry,
      saveCatalogField,
      saveCatalogGroup,
      setCatalogFieldDraft,
      setCatalogHierarchyMode,
      setCatalogSupportsHierarchy,
      setEditingCatalogFieldId,
      setPendingDeleteCatalogEntryId,
    },
    timeline: {
      dialog,
      pendingDeleteTimelineEventId,
      relationLinkDialogProps,
      timelineEventDialogProps,
      timelineEvents,
      timelineLinkDialogProps,
      ui,
    },
    timelineHandlers: {
      deletePendingTimelineEvent,
    },
  })

  return (
    <StylePreviewLayout
      {...layoutProps}
      content={renderContent()}
    >

      <StylePreviewDialogHost {...dialogHostProps} />
    </StylePreviewLayout>
  )
}

