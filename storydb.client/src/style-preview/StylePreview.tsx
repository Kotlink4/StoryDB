import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  publishPublishedProjectSnapshotRequest,
  resolveAssetVariantUrl,
} from '../api'
import type { StoryProject, StructureAssignment } from '../types'
import { StylePreviewContent } from '../components/StylePreviewContent'
import { StylePreviewLayout } from '../components/StylePreviewLayout'
import {
  previewMessages,
  previewText,
} from './domain/stylePreviewI18n'
import {
  previewRouteBase,
  type PreviewSection,
  type PreviewTab,
} from './domain/stylePreviewRouting'
import {
  isObjectSection,
} from './domain/stylePreviewConfig'
import { readPreviewState } from './domain/stylePreviewStateStorage'
import { emptyObjectsByType } from './hooks/useStylePreviewTextLinkTargetsData'
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
import { useStylePreviewProjectSearchGroups } from './hooks/useStylePreviewProjectSearchGroups'
import { useStylePreviewRelationCommands } from './hooks/useStylePreviewRelationCommands'
import {
  useStylePreviewProfileRedirect,
  useStylePreviewRouteSync,
  useStylePreviewRouting,
} from './hooks/useStylePreviewRouting'
import { useStylePreviewSelections } from './hooks/useStylePreviewSelections'
import {
  getStylePreviewObjectSectionLabel,
  useCloseStylePreviewFloatingMenus,
  usePersistStylePreviewState,
  useResetProjectSearchOnShellChange,
  useResetStructureDetailPanel,
} from './hooks/useStylePreviewShellEffects'
import { useStylePreviewTemplatePacks } from './hooks/useStylePreviewTemplatePacks'
import { useStylePreviewTimelineCommands } from './hooks/useStylePreviewTimelineCommands'
import { useStylePreviewDialogHostProps } from './hooks/useStylePreviewDialogHostProps'
import { useStylePreviewLayoutProps } from './hooks/useStylePreviewLayoutProps'
import { useStylePreviewTemporalState } from './hooks/useStylePreviewTemporalState'
import { useStylePreviewUiState } from './hooks/useStylePreviewUiState'
import { useStylePreviewWorkspaceData } from './hooks/useStylePreviewWorkspaceData'
import { useProjectSnapshot } from './hooks/useProjectSnapshot'
import {
  buildStylePreviewCatalogEntryDetailProps,
  buildStylePreviewObjectDetailProps,
  buildStylePreviewRelationDetailProps,
  buildStylePreviewTimelineEventDetailProps,
} from './hooks/stylePreviewDetailProps'
import { buildStylePreviewObjectEditorProps } from './hooks/stylePreviewObjectEditorProps'
import type { ValidationIssueMap } from '../validation'
import {
  buildStylePreviewCatalogEntryDetailPageProps,
  buildStylePreviewRelationDetailPageProps,
  buildStylePreviewRelationsPageProps,
  buildStylePreviewSettingsPageProps,
  buildStylePreviewTimelineEventDetailPageProps,
  buildStylePreviewTimelinePageProps,
} from './hooks/stylePreviewPageProps'
import { buildStylePreviewProfilePageProps } from './hooks/stylePreviewProfilePageProps'
import {
  buildStylePreviewAttributesWorkspaceProps,
  buildStylePreviewCatalogsWorkspaceProps,
  buildStylePreviewObjectCardsWorkspaceProps,
  buildStylePreviewProjectExportWorkspaceProps,
  buildStylePreviewStructuresWorkspaceProps,
} from './hooks/stylePreviewWorkspaceProps'
import './StylePreview.css'

const LazyStylePreviewDialogHost = lazy(() =>
  import('../components/StylePreviewDialogHost').then((module) => ({ default: module.StylePreviewDialogHost })),
)

export function StylePreview() {
  const { navigate, navigateToPreview, routeState } = useStylePreviewRouting()
  const initialPreviewState = useMemo(() => readPreviewState(), [])
  const { dismissMessage, message, messageTone, showErrorMessage, showMessage } = usePreviewToast()
  const [authValidationErrors, setAuthValidationErrors] = useState<ValidationIssueMap>({})
  const [objectValidationErrors, setObjectValidationErrors] = useState<ValidationIssueMap>({})
  const [profileValidationErrors, setProfileValidationErrors] = useState<ValidationIssueMap>({})
  const [projectValidationErrors, setProjectValidationErrors] = useState<ValidationIssueMap>({})
  const [isPublishedSnapshotPublishing, setIsPublishedSnapshotPublishing] = useState(false)
  const [relationLinkValidationErrors, setRelationLinkValidationErrors] = useState<ValidationIssueMap>({})
  const [timelineEventValidationErrors, setTimelineEventValidationErrors] = useState<ValidationIssueMap>({})
  const [timelineLinkValidationErrors, setTimelineLinkValidationErrors] = useState<ValidationIssueMap>({})
  const [attributeDefinitionValidationErrors, setAttributeDefinitionValidationErrors] = useState<ValidationIssueMap>({})
  const [attributeGroupValidationErrors, setAttributeGroupValidationErrors] = useState<ValidationIssueMap>({})
  const [catalogEntryValidationErrors, setCatalogEntryValidationErrors] = useState<ValidationIssueMap>({})
  const [catalogFieldValidationErrors, setCatalogFieldValidationErrors] = useState<ValidationIssueMap>({})
  const [catalogGroupValidationErrors, setCatalogGroupValidationErrors] = useState<ValidationIssueMap>({})
  const [catalogValidationErrors, setCatalogValidationErrors] = useState<ValidationIssueMap>({})
  const {
    editingProjectId,
    openCreateProjectDialog,
    openEditProjectDialog,
    pendingDeleteProjectId,
    projectCoverImagePath,
    projectDialogTab,
    projectName,
    projectPresetKeys,
    projectTemplatePackIds,
    projectVisibility,
    resetProjectForm,
    setPendingDeleteProjectId,
    setProjectCoverImagePath,
    setProjectDialogTab,
    setProjectName,
    setProjectPresetKeys,
    setProjectTemplatePackIds,
    setProjectVisibility,
  } = useStylePreviewProjectDialog()
  const {
    activeSection,
    activeTab,
    attributeDefinitionDraft,
    attributeGroupIconKey,
    attributeGroupName,
    authDisplayName,
    authEmail,
    authMode,
    authPassword,
    detailMode,
    dialog,
    dossierTab,
    dossierTimelineEventId,
    editingAttributeDefinitionId,
    editingAttributeGroupId,
    editingTimelineEventId,
    galleryImageCaption,
    galleryImagePath,
    groupDisplayMode,
    isObjectPageOpen,
    isObjectSaving,
    isProfilePageOpen,
    isRelationLayoutGenerating,
    isRelationPageOpen,
    isSettingsOpen,
    isSettingsPageOpen,
    isTimelineEventPageOpen,
    isTimelineGenerating,
    layoutMode,
    pendingDeleteAttributeDefinitionId,
    pendingDeleteAttributeGroupId,
    pendingDeleteTimelineEventId,
    previewLanguage,
    previewTheme,
    projectSearchQuery,
    relationLinkDraft,
    selectedObjectId,
    selectedRelationEdgeId,
    selectedRelationObjectId,
    selectedTimelineEventId,
    setActiveSection,
    setActiveTab,
    setAttributeDefinitionDraft,
    setAttributeGroupIconKey,
    setAttributeGroupName,
    setAuthDisplayName,
    setAuthEmail,
    setAuthMode,
    setAuthPassword,
    setDetailMode,
    setDialog,
    setDossierTab,
    setDossierTimelineEventId,
    setEditingAttributeDefinitionId,
    setEditingAttributeGroupId,
    setEditingTimelineEventId,
    setGalleryImageCaption,
    setGalleryImagePath,
    setGroupDisplayMode,
    setIsObjectPageOpen,
    setIsObjectSaving,
    setIsProfilePageOpen,
    setIsRelationLayoutGenerating,
    setIsRelationPageOpen,
    setIsSettingsOpen,
    setIsSettingsPageOpen,
    setIsTimelineEventPageOpen,
    setIsTimelineGenerating,
    setLayoutMode,
    setPendingDeleteAttributeDefinitionId,
    setPendingDeleteAttributeGroupId,
    setPendingDeleteTimelineEventId,
    setPreviewLanguage,
    setPreviewTheme,
    setProjectSearchQuery,
    setRelationLinkDraft,
    setSelectedObjectId,
    setSelectedRelationEdgeId,
    setSelectedRelationObjectId,
    setSelectedTimelineEventId,
    setStructureDetailPanel,
    setTimelineDraft,
    setTimelineGalleryImageCaption,
    setTimelineGalleryImagePath,
    setTimelineLinkDraft,
    structureDetailPanel,
    timelineDraft,
    timelineGalleryImageCaption,
    timelineGalleryImagePath,
    timelineLinkDraft,
  } = useStylePreviewUiState(routeState, initialPreviewState)
  const ui = previewText[previewLanguage]
  const messages = previewMessages[previewLanguage]
  const getObjectSectionLabel = useCallback(
    (sectionKey: Parameters<typeof getStylePreviewObjectSectionLabel>[0]) =>
      getStylePreviewObjectSectionLabel(sectionKey, ui),
    [ui],
  )
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
    setIsProfileSaving,
    setProfileAvatarImagePath,
    setProfileDisplayName,
    setProfileEmail,
  } = useStylePreviewProfileDraft(currentUser)
  const {
    favoriteTemplatePacks,
    isTemplatePackSaving,
    templatePackDescription,
    templatePackIsPublic,
    templatePackName,
    templatePackProjectId,
    templatePackScope,
    templatePacks,
    createTemplatePack,
    deleteTemplatePack,
    setTemplatePackDescription,
    setTemplatePackIsPublic,
    setTemplatePackName,
    setTemplatePackProjectId,
    setTemplatePackScope,
    toggleTemplatePackFavorite,
    toggleTemplatePackPublic,
  } = useStylePreviewTemplatePacks({
    currentUser,
    messages,
    projects,
    selectedProjectId,
    showErrorMessage,
  })

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
    objectCurrentStatus,
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
    setObjectCurrentStatus,
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
    loadRelationGraphLayout,
    refreshRelationWorkspaceData,
    loadObjectEditorData,
    objects,
    objectsByType,
    relationGraph,
    relationGraphLayout,
    selectedAttributeGroupId,
    selectedCatalogId,
    structureAssignments,
    structures,
    structureUsages,
    setAttributeDefinitions,
    setAttributeGroups,
    setCatalogEntries,
    setCatalogEntriesByCatalogId,
    setCatalogFieldsByCatalogId,
    setCatalogGroups,
    setCatalogs,
    setObjects,
    setObjectsByType,
    setRelationGraph,
    setRelationGraphLayout,
    setSelectedAttributeGroupId,
    setSelectedCatalogId,
    setStructureAssignments,
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

  const selectedProjectAccess = projects.find((project) => project.id === selectedProjectId) ?? null
  const projectSnapshotScope =
    currentUser === null || selectedProjectAccess?.canEdit === false ? 'published' : 'current'
  const {
    isPublishing: isProjectSnapshotPublishing,
    publishSnapshot: publishProjectSnapshot,
    rebuildSnapshot: rebuildProjectSnapshot,
    snapshot: projectSnapshot,
  } = useProjectSnapshot(
    !isProfilePageOpen && !isSettingsPageOpen
      ? selectedProjectId
      : null,
    messages.apiUnavailable,
    projectSnapshotScope,
  )
  const handlePublishProjectSnapshot = useCallback(async () => {
    const nextSnapshot = projectSnapshot === null
      ? await publishProjectSnapshot()
      : await rebuildProjectSnapshot()

    if (nextSnapshot === null) {
      showErrorMessage(messages.apiUnavailable)
      return
    }

    showMessage(messages.projectSnapshotUpdated)
  }, [
    messages.apiUnavailable,
    messages.projectSnapshotUpdated,
    projectSnapshot,
    publishProjectSnapshot,
    rebuildProjectSnapshot,
    showErrorMessage,
    showMessage,
  ])
  const handlePublishPublishedProjectSnapshot = useCallback(async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsPublishedSnapshotPublishing(true)
    try {
      await publishPublishedProjectSnapshotRequest(selectedProjectId)
      showMessage(messages.projectPublishedSnapshotUpdated)
    } catch {
      showErrorMessage(messages.apiUnavailable)
    } finally {
      setIsPublishedSnapshotPublishing(false)
    }
  }, [messages.apiUnavailable, messages.projectPublishedSnapshotUpdated, selectedProjectId, showErrorMessage, showMessage])
  const isLoading = !isProfilePageOpen && !isSettingsPageOpen && isLoadingProjects
  const currentUserAvatarUrl = resolveAssetVariantUrl(currentUser?.avatarImagePath ?? null, 'thumb')
  const snapshotProject = useMemo<StoryProject | null>(() => {
    if (projectSnapshot === null) {
      return null
    }

    const objectCount = Object.values(projectSnapshot.data.objectsByType)
      .reduce((count, typeObjects) => count + typeObjects.length, 0)

    return {
      id: projectSnapshot.data.project.id,
      name: projectSnapshot.data.project.name,
      coverImagePath: projectSnapshot.data.project.coverImagePath,
      objectCount,
      updatedAt: projectSnapshot.data.project.updatedAt,
      visibility: projectSnapshot.data.project.visibility,
      canEdit: currentUser !== null,
      canManage: false,
      objectTypes: projectSnapshot.data.objectTypes,
    }
  }, [currentUser, projectSnapshot])
  const readProjects = useMemo(
    () =>
      snapshotProject === null || projects.some((project) => project.id === snapshotProject.id)
        ? projects
        : [snapshotProject],
    [projects, snapshotProject],
  )
  const {
    catalogDialogFields,
    enabledObjectTypes,
    selectedCatalog,
    selectedCatalogEntry,
    selectedCatalogFields,
    selectedObject,
    selectedProject,
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
    projects: readProjects,
    relationGraph,
    selectedCatalogEntryId,
    selectedCatalogId,
    selectedObjectId,
    selectedProjectId,
    selectedRelationEdgeId,
    selectedTimelineEventId,
    timelineEvents,
  })
  const canEditSelectedProject = currentUser !== null && selectedProject?.canEdit === true
  const {
    temporalObjectsByType,
  } = useStylePreviewTemporalState({
    activeSection,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    dossierTimelineEventId,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType,
    relationGraph,
    selectedObject,
    selectedObjectId,
    selectedRelationEdgeId,
    structureAssignments,
    structureUsages,
    visibleCatalogs,
    visibleTimelineEvents,
  })

  const snapshotObjectsByType = useMemo(
    () => ({
      ...emptyObjectsByType,
      ...(projectSnapshot?.data.objectsByType ?? {}),
    }),
    [projectSnapshot?.data.objectsByType],
  )
  const hasSnapshotObjects = useMemo(
    () => Object.values(snapshotObjectsByType).some((typeObjects) => typeObjects.length > 0),
    [snapshotObjectsByType],
  )
  const shouldReadProjectSnapshot = projectSnapshot !== null && !canEditSelectedProject
  const readBaseObjectsByType = shouldReadProjectSnapshot && hasSnapshotObjects ? snapshotObjectsByType : objectsByType
  const readCatalogs = shouldReadProjectSnapshot ? projectSnapshot.data.catalogs : visibleCatalogs
  const readCatalogEntriesByCatalogId = shouldReadProjectSnapshot
    ? projectSnapshot.data.catalogEntriesByCatalogId
    : catalogEntriesByCatalogId
  const readCatalogGroupsByCatalogId = shouldReadProjectSnapshot
    ? projectSnapshot.data.catalogGroupsByCatalogId
    : catalogGroupsByCatalogId
  const readCatalogFieldsByCatalogId = shouldReadProjectSnapshot
    ? projectSnapshot.data.catalogFieldsByCatalogId
    : catalogFieldsByCatalogId
  const readSelectedCatalog = useMemo(
    () => readCatalogs.find((catalog) => catalog.id === selectedCatalogId) ?? readCatalogs[0] ?? selectedCatalog,
    [readCatalogs, selectedCatalog, selectedCatalogId],
  )
  const readCatalogEntries = readSelectedCatalog === null
    ? catalogEntries
    : readCatalogEntriesByCatalogId[readSelectedCatalog.id] ?? []
  const readCatalogGroups = readSelectedCatalog === null
    ? catalogGroups
    : readCatalogGroupsByCatalogId[readSelectedCatalog.id] ?? []
  const readSelectedCatalogFields = readSelectedCatalog === null
    ? selectedCatalogFields
    : readCatalogFieldsByCatalogId[readSelectedCatalog.id] ?? []
  const readSelectedCatalogEntry = useMemo(
    () =>
      Object.values(readCatalogEntriesByCatalogId)
        .flat()
        .find((entry) => entry.id === selectedCatalogEntryId) ?? selectedCatalogEntry,
    [readCatalogEntriesByCatalogId, selectedCatalogEntry, selectedCatalogEntryId],
  )
  const readAttributeDefinitions = isObjectSection(activeSection)
    ? shouldReadProjectSnapshot
      ? projectSnapshot.data.attributeDefinitionsByType[activeSection] ?? []
      : attributeDefinitions
    : attributeDefinitions
  const readAttributeGroups = isObjectSection(activeSection)
    ? shouldReadProjectSnapshot
      ? projectSnapshot.data.attributeGroupsByType[activeSection] ?? []
      : attributeGroups
    : attributeGroups
  const readTimelineEvents = shouldReadProjectSnapshot ? projectSnapshot.data.timelineEvents : visibleTimelineEvents
  const readTimelineInfo = shouldReadProjectSnapshot ? projectSnapshot.data.timelineInfo : timelineInfo
  const readTimelineLayout = shouldReadProjectSnapshot ? projectSnapshot.data.timelineLayout : timelineLayout
  const readTimelineLayoutRules = shouldReadProjectSnapshot
    ? projectSnapshot.data.timelineLayoutRules
    : timelineLayoutRules
  const readTimelineLinks = shouldReadProjectSnapshot ? projectSnapshot.data.timelineLinks : timelineLinks
  const readRelationGraph = shouldReadProjectSnapshot ? projectSnapshot.data.relationGraph : relationGraph
  const readRelationGraphLayout = shouldReadProjectSnapshot
    ? projectSnapshot.data.relationGraphLayout
    : relationGraphLayout
  const readStructures = shouldReadProjectSnapshot ? projectSnapshot.data.structures : structures
  const readStructureAssignments = shouldReadProjectSnapshot
    ? projectSnapshot.data.structureAssignments
    : structureAssignments
  const readStructureUsages = shouldReadProjectSnapshot ? projectSnapshot.data.structureUsages : structureUsages
  const readSelectedTimelineEvent = useMemo(
    () =>
      selectedTimelineEventId === null
        ? null
        : readTimelineEvents.find((event) => event.id === selectedTimelineEventId) ?? selectedTimelineEvent,
    [readTimelineEvents, selectedTimelineEvent, selectedTimelineEventId],
  )
  const readSelectedObject = useMemo(
    () =>
      selectedObjectId === null
        ? null
        : Object.values(readBaseObjectsByType)
            .flat()
            .find((storyObject) => storyObject.id === selectedObjectId) ?? selectedObject,
    [readBaseObjectsByType, selectedObject, selectedObjectId],
  )
  const {
    selectedTemporalRelationEdge: readSelectedTemporalRelationEdge,
    temporalRelationGraph: readTemporalRelationGraph,
    selectedTemporalObject: readSelectedTemporalObject,
    temporalObjectsByType: readTemporalObjectsByType,
    temporalSectionObjects: readTemporalSectionObjects,
    temporalVisibleObjects: readTemporalVisibleObjects,
  } = useStylePreviewTemporalState({
    activeSection,
    catalogEntriesByCatalogId: readCatalogEntriesByCatalogId,
    catalogGroupsByCatalogId: readCatalogGroupsByCatalogId,
    dossierTimelineEventId,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType: readBaseObjectsByType,
    relationGraph: readRelationGraph,
    selectedObject: readSelectedObject,
    selectedObjectId,
    selectedRelationEdgeId,
    structureAssignments: readStructureAssignments,
    structureUsages: readStructureUsages,
    visibleCatalogs: readCatalogs,
    visibleTimelineEvents: readTimelineEvents,
  })

  useStylePreviewRouteSync({
    routeState,
    setActiveSection,
    setActiveTab,
    setIsObjectPageOpen,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
    setSelectedCatalogId,
    setSelectedObjectId,
    setSelectedProjectId,
  })

  useResetProjectSearchOnShellChange({
    activeSection,
    isProfilePageOpen,
    isSettingsPageOpen,
    setProjectSearchQuery,
  })

  const navigateToWorkspace = useCallback(
    (
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
    },
    [
      activeSection,
      currentUser,
      navigate,
      navigateToPreview,
      selectedCatalogId,
      selectedProjectId,
      setDialog,
      setIsProfilePageOpen,
      setIsRelationPageOpen,
      setIsSettingsPageOpen,
      setIsTimelineEventPageOpen,
      setSelectedRelationEdgeId,
      setSelectedRelationObjectId,
      setSelectedTimelineEventId,
    ],
  )

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
    setAuthValidationErrors,
    setCurrentUser,
    setDialog,
    setIsProfilePageOpen,
    setIsProfileSaving,
    setIsSettingsPageOpen,
    setObjects,
    setProfileAvatarImagePath,
    setProfileValidationErrors,
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
    projectTemplatePackIds,
    projectVisibility,
    projects,
    resetProjectForm,
    selectedProjectId,
    setDialog,
    setPendingDeleteProjectId,
    setProjectCoverImagePath,
    setProjectValidationErrors,
    setProjects,
    setSelectedProjectId,
    showErrorMessage,
  })

  const {
    addGalleryImage,
    addObjectCoverToGallery,
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
    objectCurrentStatus,
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
    setObjectEditorTab,
    setObjectValidationErrors,
    setObjects,
    setObjectsByType,
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
    setCatalogEntryValidationErrors,
    setCatalogFieldsByCatalogId,
    setCatalogFieldValidationErrors,
    setCatalogGroupValidationErrors,
    setCatalogGroups,
    setCatalogs,
    setCatalogValidationErrors,
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
    setAttributeDefinitionValidationErrors,
    setAttributeGroupIconKey,
    setAttributeGroupName,
    setAttributeGroupValidationErrors,
    setAttributeGroups,
    setDialog,
    setEditingAttributeDefinitionId,
    setEditingAttributeGroupId,
    setPendingDeleteAttributeDefinitionId,
    setPendingDeleteAttributeGroupId,
    setSelectedAttributeGroupId,
    showErrorMessage,
  })

  useStylePreviewProfileRedirect({
    currentUser,
    isLoadingProjects,
    navigate,
    routeState,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
    setSelectedObjectId,
    setSelectedProjectId,
  })

  usePersistStylePreviewState({
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
  useResetStructureDetailPanel({
    activeSection,
    activeTab,
    detailMode,
    setStructureDetailPanel,
  })
  useCloseStylePreviewFloatingMenus({
    setIsSettingsOpen,
  })

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
    objectsByType: readTemporalObjectsByType,
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
    catalogEntriesByCatalogId: readCatalogEntriesByCatalogId,
    objectsByType: readTemporalObjectsByType,
    selectedCatalog: readSelectedCatalog,
    selectedCatalogEntry: readSelectedCatalogEntry,
    selectedObject: readSelectedTemporalObject,
    selectedRelationObjectId,
    visibleObjects: readTemporalVisibleObjects,
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
    setTimelineEventValidationErrors,
    setTimelineEvents,
    setTimelineGalleryImageCaption,
    setTimelineGalleryImagePath,
    setTimelineLayout,
    setTimelineLinkDraft,
    setTimelineLinkValidationErrors,
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
    relationGraphLayout,
    relationLinkDraft,
    selectedProjectId,
    setDialog,
    setIsRelationLayoutGenerating,
    setObjects,
    setRelationGraph,
    setRelationGraphLayout,
    setRelationLinkDraft,
    setRelationLinkValidationErrors,
    showErrorMessage,
  })

  const updateObjectStructureAssignments = useCallback(
    (storyObjectId: number, assignments: StructureAssignment[]) => {
      setStructureAssignments((currentAssignments) => [
        ...currentAssignments.filter(
          (assignment) => !(assignment.targetKind === 'storyObject' && assignment.targetId === storyObjectId),
        ),
        ...assignments,
      ])
      setRelationGraphLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
    },
    [setRelationGraphLayout, setStructureAssignments],
  )

  const objectEditorProps = buildStylePreviewObjectEditorProps({
    activeSection,
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
    isObjectSaving,
    objectAge,
    objectCurrentStatus,
    objectDescription,
    objectEditorTab,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    objectsByType: temporalObjectsByType,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    saveObjectAsTimelineChange,
    selectedProjectId,
    ui,
    saveObject,
    setDialog,
    setDraftAttributes,
    setDraftCatalogSelections,
    setDraftCharacterRelationships,
    setDraftHierarchySelections,
    setDraftTimelineParticipations,
    setEditorTimelineEventId,
    setObjectAge,
    setObjectCurrentStatus,
    setObjectDescription,
    setObjectEditorTab,
    setObjectName,
    setObjectRole,
    setObjectSurname,
    setObjectSurnameForm,
    setOwnedItemIds,
    setOwnerCharacterIds,
    setOwnerOrganizationIds,
    setSaveObjectAsTimelineChange,
    setTerritoryPlaceIds,
    setTimelineEvents,
    setTimelineLayout,
    territoryPlaceIds,
    timelineEvents,
    uploadObjectImage,
    updateObjectStructureAssignments,
    refreshRelationWorkspaceData,
    validationErrors: objectValidationErrors,
  })

  const objectDetailProps = buildStylePreviewObjectDetailProps({
    addGalleryImage,
    addObjectCoverToGallery,
    attributeDefinitions: readAttributeDefinitions,
    attributeGroups: readAttributeGroups,
    catalogEntriesByCatalogId: readCatalogEntriesByCatalogId,
    catalogGroupsByCatalogId: readCatalogGroupsByCatalogId,
    catalogs: readCatalogs,
    deleteGalleryImage,
    dossierTab,
    dossierTimelineEventId,
    galleryImageCaption,
    galleryImagePath,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType: readBaseObjectsByType,
    openTimelineEventFromDossier,
    selectedProjectId,
    setDialog,
    setDossierTab,
    setDossierTimelineEventId,
    setGalleryImageCaption,
    setTimelineEvents,
    setTimelineLayout,
    textLinkTargets,
    timelineEvents: readTimelineEvents,
    ui,
    updateObjectStructureAssignments,
    refreshRelationWorkspaceData,
    uploadGalleryImage,
  })

  const relationDetailProps = buildStylePreviewRelationDetailProps({
    graph: readTemporalRelationGraph,
    objects: linkableObjects,
    openRelationObjectDetail,
    ui,
  })

  const timelineEventDetailProps = buildStylePreviewTimelineEventDetailProps({
    addTimelineGalleryImage,
    canEdit: canEditSelectedProject,
    deleteTimelineGalleryImage,
    events: readTimelineEvents,
    galleryImageCaption: timelineGalleryImageCaption,
    galleryImagePath: timelineGalleryImagePath,
    linkableObjects,
    links: readTimelineLinks,
    openObjectDetail,
    openTimelineEventDetail,
    openTimelineEventEditor,
    setDialog,
    setPendingDeleteTimelineEventId,
    setTimelineGalleryImageCaption,
    timelineGalleryImagePath,
    ui,
    uploadTimelineGalleryImage,
  })

  const catalogEntryDetailProps = buildStylePreviewCatalogEntryDetailProps({
    catalog: readSelectedCatalog,
    catalogEntryLinksById,
    fieldDefinitions: readSelectedCatalogFields,
    textLinkTargets,
    ui,
  })

  const timelineLinkDialogProps = {
    draft: timelineLinkDraft,
    events: timelineEvents,
    validationErrors: timelineLinkValidationErrors,
    ui,
    onCancel: () => {
      setTimelineLinkValidationErrors({})
      setDialog(null)
    },
    onDraftChange: setTimelineLinkDraft,
    onSave: () => void saveTimelineLink(),
  }

  const relationLinkDialogProps = {
    characters: objectsByType.characters,
    draft: relationLinkDraft,
    validationErrors: relationLinkValidationErrors,
    ui,
    onCancel: () => {
      setRelationLinkValidationErrors({})
      setDialog(null)
    },
    onDraftChange: setRelationLinkDraft,
    onSave: () => void saveCharacterRelationLink(),
  }

  const timelineEventDialogProps = {
    draft: timelineDraft,
    editingTimelineEventId,
    linkableObjects,
    parentOptions: timelineDraftParentOptions,
    validationErrors: timelineEventValidationErrors,
    ui,
    onCancel: () => setDialog(null),
    onCoverFileSelected: (file: File) => void uploadTimelineEventCover(file),
    onDraftChange: setTimelineDraft,
    onEventTypeChange: updateTimelineDraftEventType,
    onSave: () => void saveTimelineEvent(),
  }

  const profilePageProps = buildStylePreviewProfilePageProps({
    currentUser,
    displayName: profileDisplayName,
    email: profileEmail,
    isSaving: isProfileSaving,
    isTemplatePackSaving,
    projects,
    selectedProjectId,
    templatePackDescription,
    templatePackIsPublic,
    templatePackName,
    templatePackProjectId,
    templatePackScope,
    templatePacks,
    ui,
    createTemplatePack,
    deleteTemplatePack,
    navigateToPreview,
    openCreateProjectDialog,
    openEditProjectDialog,
    profileAvatarImagePath,
    profileValidationErrors,
    saveProfile,
    setDialog,
    setIsProfilePageOpen,
    setIsSettingsPageOpen,
    setPendingDeleteProjectId,
    setProfileDisplayName,
    setProfileEmail,
    setTemplatePackDescription,
    setTemplatePackIsPublic,
    setTemplatePackName,
    setTemplatePackProjectId,
    setTemplatePackScope,
    toggleTemplatePackFavorite,
    toggleTemplatePackPublic,
    uploadProfileAvatar,
  })

  const settingsPageProps = buildStylePreviewSettingsPageProps({
    detailMode,
    groupDisplayMode,
    previewLanguage,
    previewTheme,
    ui,
    setDetailMode,
    setGroupDisplayMode,
    setPreviewLanguage,
    setPreviewTheme,
  })

  const relationDetailPageProps = buildStylePreviewRelationDetailPageProps({
    relationDetailProps,
    ui,
    setIsRelationPageOpen,
  })

  const relationsPageProps = buildStylePreviewRelationsPageProps({
    graph: readTemporalRelationGraph,
    detailMode,
    isLayoutGenerating: isRelationLayoutGenerating,
    layout: readRelationGraphLayout,
    linkableObjects,
    structureAssignments: readStructureAssignments,
    structures: readStructures,
    selectedEdgeId: selectedRelationEdgeId,
    ui,
    generateRelationGraphLayout,
    loadRelationGraphLayout,
    openRelationDetail,
    openRelationObjectDetail,
    saveRelationGraphNodePosition,
    setDialog,
  })

  const timelineEventDetailPageProps = buildStylePreviewTimelineEventDetailPageProps({
    timelineEventDetailProps,
    ui,
    setIsTimelineEventPageOpen,
  })

  const timelinePageProps = buildStylePreviewTimelinePageProps({
    canEdit: canEditSelectedProject,
    timelineEvents: readTimelineEvents,
    isGenerating: isTimelineGenerating,
    layout: readTimelineLayout,
    layoutRules: readTimelineLayoutRules,
    links: readTimelineLinks,
    selectedEvent: readSelectedTimelineEvent,
    timeline: readTimelineInfo,
    ui,
    deleteTimelineLink,
    generateTimelineLayout,
    openTimelineEventDetail,
    openTimelineEventEditor,
    setDialog,
  })

  const projectSearchGroups = useStylePreviewProjectSearchGroups({
    attributeDefinitions: readAttributeDefinitions,
    attributeGroups: readAttributeGroups,
    catalogEntriesByCatalogId: readCatalogEntriesByCatalogId,
    catalogGroupsByCatalogId: readCatalogGroupsByCatalogId,
    catalogs: readCatalogs,
    getObjectSectionLabel,
    objectsByType: readTemporalObjectsByType,
    query: projectSearchQuery,
    relationGraph: readRelationGraph,
    timelineEvents: readTimelineEvents,
    ui,
    onOpenAttributes: () => {
      setProjectSearchQuery('')
      navigateToWorkspace('database', 'attributes')
    },
    onOpenCatalog: (catalog) => {
      setProjectSearchQuery('')
      setSelectedCatalogId(catalog.id)
      navigateToWorkspace('database', 'catalogs', null, catalog.id)
    },
    onOpenCatalogEntry: (entry, catalogId) => {
      setProjectSearchQuery('')
      openCatalogEntryDetail(entry, catalogId)
    },
    onOpenObject: (storyObject) => {
      setProjectSearchQuery('')
      openObjectDetail(storyObject)
    },
    onOpenRelation: (edgeId) => {
      const edge = readTemporalRelationGraph.edges.find((relationEdge) => relationEdge.id === edgeId)
      if (edge === undefined) {
        return
      }

      setProjectSearchQuery('')
      openRelationDetail(edge.id)
    },
    onOpenTimelineEvent: (event) => {
      setProjectSearchQuery('')
      openTimelineEventDetail(event.id)
    },
  })
  const objectDetailPageProps = {
    objectDetailProps,
    ui,
    onBack: () => navigateToPreview(selectedProjectId, 'database', activeSection),
    onEdit: canEditSelectedProject ? openEditObjectDialog : undefined,
  }

  const catalogEntryDetailPageProps = buildStylePreviewCatalogEntryDetailPageProps({
    catalogEntryDetailProps,
    ui,
    openEditCatalogEntry: canEditSelectedProject ? openEditCatalogEntry : undefined,
    setDialog,
    setPendingDeleteCatalogEntryId: canEditSelectedProject ? setPendingDeleteCatalogEntryId : undefined,
    setSelectedCatalogEntryId,
  })

  const catalogsWorkspaceProps = buildStylePreviewCatalogsWorkspaceProps({
    canEdit: canEditSelectedProject,
    catalogEntries: readCatalogEntries,
    catalogGroups: readCatalogGroups,
    groupDisplayMode,
    selectedCatalog: readSelectedCatalog,
    selectedCatalogGroupId,
    textLinkTargets,
    ui,
    createCatalogEntryDraftForGroup,
    navigateToPreview,
    openCatalogEntryDetail,
    openEditCatalog,
    openEditCatalogEntry,
    openEditCatalogGroup,
    resetCatalogGroupDraft,
    setCatalogEntryValidationErrors,
    setCatalogGroupValidationErrors,
    selectedProjectId,
    setDialog,
    setPendingDeleteCatalogEntryId,
    setPendingDeleteCatalogId,
    setSelectedCatalogGroupId,
    visibleCatalogs: readCatalogs,
  })

  const attributesWorkspaceProps = buildStylePreviewAttributesWorkspaceProps({
    attributeDefinitionDraft,
    attributeDefinitionValidationErrors,
    attributeDefinitions: readAttributeDefinitions,
    attributeGroupIconKey,
    attributeGroupName,
    attributeGroupValidationErrors,
    attributeGroups: readAttributeGroups,
    canEdit: canEditSelectedProject,
    groupDisplayMode,
    editingAttributeDefinitionId,
    selectedAttributeGroupId,
    ui,
    openEditAttributeDefinition,
    openEditAttributeGroup,
    previewLanguage,
    saveAttributeDefinition,
    saveAttributeGroup,
    setAttributeDefinitionDraft,
    setAttributeDefinitionValidationErrors,
    setAttributeGroupIconKey,
    setAttributeGroupName,
    setDialog,
    setEditingAttributeDefinitionId,
    setPendingDeleteAttributeDefinitionId,
    setPendingDeleteAttributeGroupId,
    setSelectedAttributeGroupId,
  })

  const structuresWorkspaceProps = buildStylePreviewStructuresWorkspaceProps({
    catalogEntriesByCatalogId: readCatalogEntriesByCatalogId,
    detailMode,
    apiUnavailableMessage: messages.apiUnavailable,
    snapshotStructures: shouldReadProjectSnapshot ? projectSnapshot.data.structures : null,
    snapshotStructureUsages: shouldReadProjectSnapshot ? projectSnapshot.data.structureUsages : null,
    ui,
    setStructureDetailPanel,
    showErrorMessage,
    showMessage,
    visibleCatalogs: readCatalogs,
  })

  const projectExportWorkspaceProps = buildStylePreviewProjectExportWorkspaceProps({
    enabledObjectTypes,
    apiUnavailableMessage: messages.apiUnavailable,
    objectsByType: shouldReadProjectSnapshot ? projectSnapshot.data.objectsByType : temporalObjectsByType,
    selectedProjectId: selectedProject?.id ?? selectedProjectId,
    selectedProjectRuntimeId: selectedProject?.id ?? selectedProjectId ?? 0,
    ui,
    navigateToPreview,
    showErrorMessage,
    showMessage,
  })

  const objectSectionLabel = isObjectSection(activeSection)
    ? getObjectSectionLabel(activeSection)
    : activeSection === 'exports'
      ? ui.export
      : ui.catalogs

  const objectCardsWorkspaceProps = buildStylePreviewObjectCardsWorkspaceProps({
    currentUser,
    isObjectSectionActive: isObjectSection(activeSection),
    layoutMode,
    selectedObjectId: readSelectedTemporalObject?.id ?? null,
    ui,
    visibleObjects: readTemporalSectionObjects,
    objectSectionLabel,
    openCreateObjectDialog,
    openEditObjectDialog,
    openObjectDetail,
    setDialog,
    setLayoutMode,
    setSelectedObjectId,
  })

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
      projectExportWorkspaceProps={projectExportWorkspaceProps}
      profilePageProps={profilePageProps}
      projectSearchGroups={projectSearchGroups}
      projectSearchQuery={projectSearchQuery}
      relationDetailPageProps={relationDetailPageProps}
      relationsPageProps={relationsPageProps}
      selectedCatalogEntry={readSelectedCatalogEntry}
      selectedObject={readSelectedTemporalObject}
      selectedProject={selectedProject}
      selectedRelationEdge={readSelectedTemporalRelationEdge}
      selectedTimelineEvent={readSelectedTimelineEvent}
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
    selectedCatalogEntry: readSelectedCatalogEntry,
    selectedCatalogId,
    selectedObject: readSelectedTemporalObject,
    selectedRelationEdge: readSelectedTemporalRelationEdge,
    selectedRelationObject,
    selectedTimelineEvent: readSelectedTimelineEvent,
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
      searchQuery: projectSearchQuery,
      ui,
    },
    topbarHandlers: {
      logout,
      openCreateObjectDialog,
      setProjectSearchQuery,
    },
    projectbar: {
      activeTab,
      canPublishPublicSnapshot: selectedProject?.canManage === true,
      currentUser,
      isPublicSnapshotPublishing: isPublishedSnapshotPublishing,
      isSnapshotPublishing: isProjectSnapshotPublishing,
      projects: readProjects,
      selectedProjectId,
      snapshotBuiltAt: projectSnapshot?.builtAt ?? null,
      snapshotDirtySections: projectSnapshot?.dirtySections ?? [],
      snapshotRevision: projectSnapshot?.revision ?? null,
      snapshotStatus: projectSnapshot?.status ?? null,
      ui,
    },
    projectbarHandlers: {
      onPublishPublicSnapshot: handlePublishPublishedProjectSnapshot,
      onPublishSnapshot: handlePublishProjectSnapshot,
    },
    sidebar: {
      activeSection,
      activeTab,
      attributeGroups,
      catalogGroups: readCatalogGroups,
      currentUser,
      enabledObjectTypes,
      groupDisplayMode,
      selectedAttributeGroupId,
      selectedCatalog: readSelectedCatalog,
      selectedCatalogGroupId,
      selectedProject,
      ui,
      visibleCatalogs: readCatalogs,
      visibleObjectsCount: visibleObjects.length,
      visibleTimelineEventsCount: readTimelineEvents.length,
    },
    sidebarHandlers: {
      onEditAttributeGroup: openEditAttributeGroup,
      onEditCatalog: openEditCatalog,
      onEditCatalogGroup: openEditCatalogGroup,
      onSelectAttributeGroup: setSelectedAttributeGroupId,
      onSelectCatalogGroup: setSelectedCatalogGroupId,
      resetCatalogDraft: () => {
        setCatalogValidationErrors({})
        resetCatalogDraft()
      },
      resetCatalogFieldDraft: () => {
        setCatalogFieldValidationErrors({})
        resetCatalogFieldDraft()
      },
      resetCatalogGroupDraft: () => {
        setCatalogGroupValidationErrors({})
        resetCatalogGroupDraft()
      },
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
      selectedCatalogEntry: readSelectedCatalogEntry,
      selectedObject: readSelectedTemporalObject,
      selectedRelationEdge: readSelectedTemporalRelationEdge,
      selectedRelationObject,
      selectedTimelineEvent: readSelectedTimelineEvent,
      structureDetailPanel,
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
      authValidationErrors,
      currentUser,
      dialog,
      editingProjectId,
      pendingDeleteProjectId,
      projectCoverImagePath,
      projectDialogTab,
      projectName,
      projectPresetKeys,
      projectTemplatePackIds,
      projectVisibility,
      validationErrors: projectValidationErrors,
      favoriteTemplatePacks,
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
      onProjectTemplatePackIdsChange: setProjectTemplatePackIds,
      onProjectVisibilityChange: setProjectVisibility,
      deletePendingProject,
      logout,
      saveProject,
      submitAuth,
      uploadProjectCover,
    },
    object: {
      dialog,
      editingObjectId,
      objectDetailProps,
      objectEditorProps,
      selectedObject: readSelectedTemporalObject,
      ui,
    },
    objectHandlers: {
      deleteSelectedObject,
      openEditObjectDialog,
    },
    detail: {
      dialog,
      relationDetailProps,
      selectedRelationEdge: readSelectedTemporalRelationEdge,
      selectedTimelineEvent: readSelectedTimelineEvent,
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
      attributeGroupValidationErrors,
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
      catalogValidationErrors,
      dialog,
      editingCatalogEntryId,
      editingCatalogFieldId,
      editingCatalogGroupId,
      editingCatalogId,
      entryValidationErrors: catalogEntryValidationErrors,
      fieldValidationErrors: catalogFieldValidationErrors,
      groupValidationErrors: catalogGroupValidationErrors,
      language: previewLanguage,
      pendingDeleteCatalogEntryId,
      pendingDeleteCatalogId,
      selectedCatalog,
      selectedCatalogEntry: readSelectedCatalogEntry,
      selectedCatalogFields,
      selectedCatalogGroupId,
      selectedProjectId,
      textLinkTargets,
      ui,
      visibleCatalogs,
      onCatalogEntryStructureAssignmentsChange: (catalogEntryId, assignments) =>
        setStructureAssignments((currentAssignments) => [
          ...currentAssignments.filter(
            (assignment) => !(assignment.targetKind === 'catalogEntry' && assignment.targetId === catalogEntryId),
          ),
          ...assignments,
        ]),
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
      {dialog !== null && (
        <Suspense fallback={null}>
          <LazyStylePreviewDialogHost {...dialogHostProps} />
        </Suspense>
      )}
    </StylePreviewLayout>
  )
}


