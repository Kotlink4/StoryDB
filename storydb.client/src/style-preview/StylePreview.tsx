import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
} from 'react'
import {
  resolveAssetVariantUrl,
} from '../api'
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
import {
  buildStylePreviewCatalogEntryDetailProps,
  buildStylePreviewObjectDetailProps,
  buildStylePreviewRelationDetailProps,
  buildStylePreviewTimelineEventDetailProps,
} from './hooks/stylePreviewDetailProps'
import { buildStylePreviewObjectEditorProps } from './hooks/stylePreviewObjectEditorProps'
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
    activeObjectMenuId,
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
    setActiveObjectMenuId,
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
  const currentUserAvatarUrl = resolveAssetVariantUrl(currentUser?.avatarImagePath ?? null, 'thumb')
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
  const {
    selectedTemporalObject,
    selectedTemporalRelationEdge,
    temporalObjectsByType,
    temporalRelationGraph,
    temporalSectionObjects,
    temporalVisibleObjects,
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
    projectTemplatePackIds,
    projectVisibility,
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
    setActiveObjectMenuId,
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
    objectsByType: temporalObjectsByType,
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
    objectsByType: temporalObjectsByType,
    selectedCatalog,
    selectedCatalogEntry,
    selectedObject: selectedTemporalObject,
    selectedRelationObjectId,
    visibleObjects: temporalVisibleObjects,
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
  })

  const objectDetailProps = buildStylePreviewObjectDetailProps({
    addGalleryImage,
    addObjectCoverToGallery,
    attributeDefinitions,
    attributeGroups,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs: visibleCatalogs,
    deleteGalleryImage,
    dossierTab,
    dossierTimelineEventId,
    galleryImageCaption,
    galleryImagePath,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType,
    openTimelineEventFromDossier,
    selectedProjectId,
    setDialog,
    setDossierTab,
    setDossierTimelineEventId,
    setGalleryImageCaption,
    setTimelineEvents,
    setTimelineLayout,
    textLinkTargets,
    timelineEvents,
    ui,
    uploadGalleryImage,
  })

  const relationDetailProps = buildStylePreviewRelationDetailProps({
    graph: temporalRelationGraph,
    objects: linkableObjects,
    openRelationObjectDetail,
    ui,
  })

  const timelineEventDetailProps = buildStylePreviewTimelineEventDetailProps({
    addTimelineGalleryImage,
    deleteTimelineGalleryImage,
    events: visibleTimelineEvents,
    galleryImageCaption: timelineGalleryImageCaption,
    galleryImagePath: timelineGalleryImagePath,
    linkableObjects,
    links: timelineLinks,
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
    catalog: selectedCatalog,
    catalogEntryLinksById,
    fieldDefinitions: selectedCatalogFields,
    textLinkTargets,
    ui,
  })

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
    graph: temporalRelationGraph,
    detailMode,
    isLayoutGenerating: isRelationLayoutGenerating,
    layout: relationGraphLayout,
    linkableObjects,
    structureAssignments,
    structures,
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
    timelineEvents: visibleTimelineEvents,
    isGenerating: isTimelineGenerating,
    layout: timelineLayout,
    layoutRules: timelineLayoutRules,
    links: timelineLinks,
    selectedEvent: selectedTimelineEvent,
    timeline: timelineInfo,
    ui,
    deleteTimelineLink,
    generateTimelineLayout,
    openTimelineEventDetail,
    openTimelineEventEditor,
    setDialog,
  })

  const projectSearchGroups = useStylePreviewProjectSearchGroups({
    attributeDefinitions,
    attributeGroups,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs: visibleCatalogs,
    getObjectSectionLabel,
    objectsByType: temporalObjectsByType,
    query: projectSearchQuery,
    relationGraph: temporalRelationGraph,
    timelineEvents,
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
      const edge = temporalRelationGraph.edges.find((relationEdge) => relationEdge.id === edgeId)
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
    onEdit: openEditObjectDialog,
  }

  const catalogEntryDetailPageProps = buildStylePreviewCatalogEntryDetailPageProps({
    catalogEntryDetailProps,
    ui,
    openEditCatalogEntry,
    setDialog,
    setPendingDeleteCatalogEntryId,
    setSelectedCatalogEntryId,
  })

  const catalogsWorkspaceProps = buildStylePreviewCatalogsWorkspaceProps({
    catalogEntries,
    catalogGroups,
    groupDisplayMode,
    selectedCatalog,
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
    selectedProjectId,
    setDialog,
    setPendingDeleteCatalogEntryId,
    setPendingDeleteCatalogId,
    setSelectedCatalogGroupId,
    visibleCatalogs,
  })

  const attributesWorkspaceProps = buildStylePreviewAttributesWorkspaceProps({
    attributeDefinitionDraft,
    attributeDefinitions,
    attributeGroupIconKey,
    attributeGroupName,
    attributeGroups,
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
    setAttributeGroupIconKey,
    setAttributeGroupName,
    setDialog,
    setEditingAttributeDefinitionId,
    setPendingDeleteAttributeDefinitionId,
    setPendingDeleteAttributeGroupId,
    setSelectedAttributeGroupId,
  })

  const structuresWorkspaceProps = buildStylePreviewStructuresWorkspaceProps({
    catalogEntriesByCatalogId,
    detailMode,
    apiUnavailableMessage: messages.apiUnavailable,
    ui,
    setStructureDetailPanel,
    showErrorMessage,
    showMessage,
    visibleCatalogs,
  })

  const projectExportWorkspaceProps = buildStylePreviewProjectExportWorkspaceProps({
    enabledObjectTypes,
    apiUnavailableMessage: messages.apiUnavailable,
    objectsByType: temporalObjectsByType,
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
    activeObjectMenuId,
    currentUser,
    isObjectSectionActive: isObjectSection(activeSection),
    layoutMode,
    selectedObjectId: selectedTemporalObject?.id ?? null,
    ui,
    visibleObjects: temporalSectionObjects,
    objectSectionLabel,
    openCreateObjectDialog,
    openEditObjectDialog,
    openObjectDetail,
    setActiveObjectMenuId,
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
      selectedCatalogEntry={selectedCatalogEntry}
      selectedObject={selectedTemporalObject}
      selectedProject={selectedProject}
      selectedRelationEdge={selectedTemporalRelationEdge}
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
    selectedRelationEdge: selectedTemporalRelationEdge,
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
      selectedObject: selectedTemporalObject,
      selectedRelationEdge: selectedTemporalRelationEdge,
      selectedRelationObject,
      selectedTimelineEvent,
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
      selectedObject: selectedTemporalObject,
      ui,
    },
    objectHandlers: {
      deleteSelectedObject,
      openEditObjectDialog,
    },
    detail: {
      dialog,
      relationDetailProps,
      selectedRelationEdge: selectedTemporalRelationEdge,
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
      {dialog !== null && (
        <Suspense fallback={null}>
          <LazyStylePreviewDialogHost {...dialogHostProps} />
        </Suspense>
      )}
    </StylePreviewLayout>
  )
}


