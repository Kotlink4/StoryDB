import type { ComponentProps, Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'

import { StylePreviewLayout } from '../../components/StylePreviewLayout'
import { previewRouteBase, type PreviewSection, type PreviewTab } from '../domain/stylePreviewRouting'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'

type LayoutProps = ComponentProps<typeof StylePreviewLayout>
type LayoutChromeProps = Omit<LayoutProps, 'children' | 'content'>
type TopbarProps = LayoutChromeProps['topbarProps']
type ProjectbarProps = LayoutChromeProps['projectbarProps']
type SidebarProps = LayoutChromeProps['sidebarProps']
type DetailPanelsProps = LayoutChromeProps['detailPanelsProps']

type MaybePromise = void | Promise<void>

type TopbarHandlerKeys =
  | 'onCreateObject'
  | 'onLogin'
  | 'onLogout'
  | 'onNavigateTab'
  | 'onOpenProfile'
  | 'onOpenSettings'
  | 'showWorkspaceTabs'
  | 'onToggleSettingsMenu'

type ProjectbarHandlerKeys =
  | 'onCreateObject'
  | 'onNavigateProject'
  | 'onNavigateTab'

type SidebarHandlerKeys =
  | 'onCreateCatalog'
  | 'onCreateCatalogGroup'
  | 'onCreateObject'
  | 'onDeleteAttributeGroup'
  | 'onDeleteCatalog'
  | 'onDeleteCatalogGroup'
  | 'onEditAttributeGroup'
  | 'onEditCatalog'
  | 'onEditCatalogGroup'
  | 'onNavigateTab'
  | 'onNavigateWorkspace'
  | 'onSelectAttributeGroup'
  | 'onSelectCatalogGroup'

type DetailPanelHandlerKeys =
  | 'onCloseObject'
  | 'onCloseRelationEdge'
  | 'onCloseRelationObject'
  | 'onCloseTimelineEvent'
  | 'onDeleteCatalogEntry'
  | 'onDeleteRelationObject'
  | 'onEditCatalogEntry'
  | 'onEditObject'

export function useStylePreviewLayoutProps({
  activeSection,
  activeTab,
  detailMode,
  detailPanels,
  detailPanelHandlers,
  isLoading,
  isProfilePageOpen,
  isSettingsPageOpen,
  navigate,
  navigateToPreview,
  navigateToWorkspace,
  previewLanguage,
  previewTheme,
  projectbar,
  selectedCatalogEntry,
  selectedCatalogId,
  selectedObject,
  selectedRelationEdge,
  selectedRelationObject,
  selectedTimelineEvent,
  sidebar,
  sidebarHandlers,
  toastMessage,
  toastTone,
  topbar,
  topbarHandlers,
  ui,
  onDismissToast,
  setDialog,
  setIsProfilePageOpen,
  setIsSettingsOpen,
  setIsSettingsPageOpen,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  detailMode: DetailPanelsProps['detailMode']
  detailPanels: Omit<DetailPanelsProps, DetailPanelHandlerKeys>
  detailPanelHandlers: Pick<DetailPanelsProps, 'onEditCatalogEntry' | 'onEditObject'> & {
    setPendingDeleteCatalogEntryId: Dispatch<SetStateAction<number | null>>
    setSelectedObjectId: Dispatch<SetStateAction<number | null>>
    setSelectedRelationEdgeId: Dispatch<SetStateAction<string | null>>
    setSelectedRelationObjectId: Dispatch<SetStateAction<number | null>>
    setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
  }
  isLoading: boolean
  isProfilePageOpen: boolean
  isSettingsPageOpen: boolean
  navigate: NavigateFunction
  navigateToPreview: (projectId: number | null, tab: PreviewTab, section: PreviewSection, objectId?: number | null, catalogId?: number | null) => void
  navigateToWorkspace: SidebarProps['onNavigateWorkspace']
  previewLanguage: LayoutChromeProps['previewLanguage']
  previewTheme: LayoutChromeProps['previewTheme']
  projectbar: Omit<ProjectbarProps, ProjectbarHandlerKeys>
  selectedCatalogEntry: DetailPanelsProps['selectedCatalogEntry']
  selectedCatalogId: number | null
  selectedObject: DetailPanelsProps['selectedObject']
  selectedRelationEdge: DetailPanelsProps['selectedRelationEdge']
  selectedRelationObject: DetailPanelsProps['selectedRelationObject']
  selectedTimelineEvent: DetailPanelsProps['selectedTimelineEvent']
  sidebar: Omit<SidebarProps, SidebarHandlerKeys>
  sidebarHandlers: Pick<
    SidebarProps,
    | 'onEditAttributeGroup'
    | 'onEditCatalog'
    | 'onEditCatalogGroup'
    | 'onSelectAttributeGroup'
    | 'onSelectCatalogGroup'
  > & {
    resetCatalogDraft: () => void
    resetCatalogFieldDraft: () => void
    resetCatalogGroupDraft: () => void
    setCatalogDialogTab: (tab: 'main' | 'template') => void
    setPendingDeleteAttributeGroupId: Dispatch<SetStateAction<number | null>>
    setPendingDeleteCatalogId: Dispatch<SetStateAction<number | null>>
    setSelectedCatalogGroupId: Dispatch<SetStateAction<number | null>>
  }
  toastMessage: string | null
  toastTone: string
  topbar: Omit<TopbarProps, TopbarHandlerKeys>
  topbarHandlers: {
    logout: () => MaybePromise
    openCreateObjectDialog: () => void
  }
  ui: LayoutChromeProps['topbarProps']['ui']
  onDismissToast: () => void
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsProfilePageOpen: Dispatch<SetStateAction<boolean>>
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>
  setIsSettingsPageOpen: Dispatch<SetStateAction<boolean>>
}): LayoutChromeProps {
  const isUtilityPage = isSettingsPageOpen || isProfilePageOpen
  const hasDetailPanel = !isUtilityPage &&
    detailMode === 'panel' &&
    ((activeTab === 'database' &&
      (selectedObject !== null || (activeSection === 'catalogs' && selectedCatalogEntry !== null))) ||
      (activeTab === 'relations' && (selectedRelationEdge !== null || selectedRelationObject !== null)) ||
      (activeTab === 'timeline' && selectedTimelineEvent !== null))

  return {
    activeTab,
    detailPanelsProps: {
      ...detailPanels,
      onCloseObject: () => detailPanelHandlers.setSelectedObjectId(null),
      onCloseRelationEdge: () => detailPanelHandlers.setSelectedRelationEdgeId(null),
      onCloseRelationObject: () => detailPanelHandlers.setSelectedRelationObjectId(null),
      onCloseTimelineEvent: () => detailPanelHandlers.setSelectedTimelineEventId(null),
      onDeleteCatalogEntry: (entry) => {
        detailPanelHandlers.setPendingDeleteCatalogEntryId(entry.id)
        setDialog('confirmDeleteCatalogEntry')
      },
      onDeleteRelationObject: (storyObject) => {
        detailPanelHandlers.setSelectedObjectId(storyObject.id)
        setDialog('confirmDeleteObject')
      },
      onEditCatalogEntry: detailPanelHandlers.onEditCatalogEntry,
      onEditObject: detailPanelHandlers.onEditObject,
    },
    hasDetailPanel,
    isLoading,
    isUtilityPage,
    loadingLabel: ui.loading,
    previewLanguage,
    previewTheme,
    projectbarProps: {
      ...projectbar,
      onCreateObject: topbarHandlers.openCreateObjectDialog,
      onNavigateProject: (projectId) => navigateToPreview(projectId, 'database', 'characters', null, null),
      onNavigateTab: (tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId),
    },
    showSidebar: activeTab !== 'timeline',
    sidebarProps: {
      ...sidebar,
      onCreateCatalog: () => {
        sidebarHandlers.resetCatalogDraft()
        sidebarHandlers.setCatalogDialogTab('main')
        sidebarHandlers.resetCatalogFieldDraft()
        setDialog('catalog')
      },
      onCreateCatalogGroup: () => {
        sidebarHandlers.resetCatalogGroupDraft()
        setDialog('catalogGroup')
      },
      onCreateObject: topbarHandlers.openCreateObjectDialog,
      onDeleteAttributeGroup: (group) => {
        sidebarHandlers.setPendingDeleteAttributeGroupId(group.id)
        setDialog('confirmDeleteAttributeGroup')
      },
      onDeleteCatalog: (catalog) => {
        sidebarHandlers.setPendingDeleteCatalogId(catalog.id)
        setDialog('confirmDeleteCatalog')
      },
      onDeleteCatalogGroup: (group) => {
        sidebarHandlers.setSelectedCatalogGroupId(group.id)
        setDialog('confirmDeleteCatalogGroup')
      },
      onEditAttributeGroup: sidebarHandlers.onEditAttributeGroup,
      onEditCatalog: sidebarHandlers.onEditCatalog,
      onEditCatalogGroup: sidebarHandlers.onEditCatalogGroup,
      onNavigateTab: (tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId),
      onNavigateWorkspace: navigateToWorkspace,
      onSelectAttributeGroup: sidebarHandlers.onSelectAttributeGroup,
      onSelectCatalogGroup: sidebarHandlers.onSelectCatalogGroup,
    },
    toastMessage,
    toastTone,
    topbarProps: {
      ...topbar,
      showWorkspaceTabs: !isProfilePageOpen,
      onCreateObject: topbarHandlers.openCreateObjectDialog,
      onLogin: () => setDialog('auth'),
      onLogout: () => void topbarHandlers.logout(),
      onNavigateTab: (tab) => navigateToWorkspace(tab, activeSection, null, selectedCatalogId),
      onOpenProfile: () => {
        setIsSettingsOpen(false)
        setIsProfilePageOpen(true)
        setIsSettingsPageOpen(false)
        setDialog(null)
        navigate(`${previewRouteBase}/profile`)
      },
      onOpenSettings: () => {
        setIsSettingsOpen(false)
        setIsProfilePageOpen(false)
        setIsSettingsPageOpen(true)
        setDialog(null)
        navigate(`${previewRouteBase}/settings`)
      },
      onToggleSettingsMenu: () => setIsSettingsOpen((value) => !value),
    },
    onDismissToast,
  }
}
