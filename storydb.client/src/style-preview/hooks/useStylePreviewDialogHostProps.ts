import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import { StylePreviewAttributeDialogs } from '../../components/StylePreviewAttributeDialogs'
import { StylePreviewCatalogDialogs } from '../../components/StylePreviewCatalogDialogs'
import { StylePreviewDetailDialogs } from '../../components/StylePreviewDetailDialogs'
import { StylePreviewDialogHost } from '../../components/StylePreviewDialogHost'
import { StylePreviewObjectDialogs } from '../../components/StylePreviewObjectDialogs'
import { StylePreviewProjectDialogs } from '../../components/StylePreviewProjectDialogs'
import { StylePreviewTimelineDialogs } from '../../components/StylePreviewTimelineDialogs'
import { emptyCatalogFieldDraft, type PreviewDialogKind } from '../domain/stylePreviewConfig'

type MaybePromise = void | Promise<void>
type DialogHostProps = ComponentProps<typeof StylePreviewDialogHost>
type ProjectDialogsProps = ComponentProps<typeof StylePreviewProjectDialogs>
type ObjectDialogsProps = ComponentProps<typeof StylePreviewObjectDialogs>
type DetailDialogsProps = ComponentProps<typeof StylePreviewDetailDialogs>
type AttributeDialogsProps = ComponentProps<typeof StylePreviewAttributeDialogs>
type CatalogDialogsProps = ComponentProps<typeof StylePreviewCatalogDialogs>
type TimelineDialogsProps = ComponentProps<typeof StylePreviewTimelineDialogs>

type ProjectHandlerKeys =
  | 'onAuthDisplayNameChange'
  | 'onAuthEmailChange'
  | 'onAuthModeChange'
  | 'onAuthPasswordChange'
  | 'onClose'
  | 'onDeleteProject'
  | 'onLogout'
  | 'onProjectCoverFileSelected'
  | 'onProjectDialogTabChange'
  | 'onProjectNameChange'
  | 'onProjectPresetKeysChange'
  | 'onSaveProject'
  | 'onSubmitAuth'

type ObjectHandlerKeys =
  | 'onClose'
  | 'onConfirmDeleteObject'
  | 'onEditSelectedObject'

type DetailHandlerKeys =
  | 'onCloseRelationDetail'
  | 'onCloseTimelineEventDetail'

type AttributeHandlerKeys =
  | 'onAttributeGroupIconChange'
  | 'onAttributeGroupNameChange'
  | 'onClose'
  | 'onDeleteAttribute'
  | 'onDeleteAttributeGroup'
  | 'onSaveAttributeGroup'

type CatalogHandlerKeys =
  | 'onCancelCatalogFieldEdit'
  | 'onCatalogDescriptionChange'
  | 'onCatalogDialogTabChange'
  | 'onCatalogEntryDraftChange'
  | 'onCatalogFieldDraftChange'
  | 'onCatalogGroupNameChange'
  | 'onCatalogGroupParentIdsChange'
  | 'onCatalogHierarchyModeChange'
  | 'onCatalogNameChange'
  | 'onCatalogSupportsHierarchyChange'
  | 'onClose'
  | 'onDeleteCatalogField'
  | 'onDeletePendingCatalog'
  | 'onDeletePendingCatalogEntry'
  | 'onDeleteSelectedCatalogGroup'
  | 'onEditCatalogField'
  | 'onEditSelectedCatalogEntry'
  | 'onOpenConfirmDeleteCatalogEntry'
  | 'onSaveCatalog'
  | 'onSaveCatalogEntry'
  | 'onSaveCatalogField'
  | 'onSaveCatalogGroup'

type TimelineHandlerKeys =
  | 'onClose'
  | 'onDeletePendingTimelineEvent'

export function useStylePreviewDialogHostProps({
  attribute,
  attributeHandlers,
  catalog,
  catalogHandlers,
  detail,
  detailHandlers,
  object,
  objectHandlers,
  project,
  projectHandlers,
  setDialog,
  timeline,
  timelineHandlers,
}: {
  attribute: Omit<AttributeDialogsProps, AttributeHandlerKeys>
  attributeHandlers: Pick<
    AttributeDialogsProps,
    'onAttributeGroupIconChange' | 'onAttributeGroupNameChange'
  > & {
    deletePendingAttributeDefinition: () => MaybePromise
    deletePendingAttributeGroup: () => MaybePromise
    saveAttributeGroup: () => MaybePromise
  }
  catalog: Omit<CatalogDialogsProps, CatalogHandlerKeys>
  catalogHandlers: Pick<
    CatalogDialogsProps,
    | 'onCatalogDescriptionChange'
    | 'onCatalogDialogTabChange'
    | 'onCatalogEntryDraftChange'
    | 'onCatalogFieldDraftChange'
    | 'onCatalogGroupNameChange'
    | 'onCatalogGroupParentIdsChange'
    | 'onCatalogHierarchyModeChange'
    | 'onCatalogNameChange'
    | 'onEditCatalogField'
    | 'onEditSelectedCatalogEntry'
  > & {
    deleteCatalogField: (fieldId: number) => MaybePromise
    deletePendingCatalogEntry: () => MaybePromise
    deleteSelectedCatalog: () => MaybePromise
    deleteSelectedCatalogGroup: () => MaybePromise
    saveCatalog: () => MaybePromise
    saveCatalogEntry: () => MaybePromise
    saveCatalogField: () => MaybePromise
    saveCatalogGroup: () => MaybePromise
    setCatalogHierarchyMode: CatalogDialogsProps['onCatalogHierarchyModeChange']
    setCatalogSupportsHierarchy: (supportsHierarchy: boolean) => void
    setCatalogFieldDraft: CatalogDialogsProps['onCatalogFieldDraftChange']
    setEditingCatalogFieldId: Dispatch<SetStateAction<number | null>>
    setPendingDeleteCatalogEntryId: Dispatch<SetStateAction<number | null>>
  }
  detail: Omit<DetailDialogsProps, DetailHandlerKeys>
  detailHandlers: {
    setSelectedRelationEdgeId: Dispatch<SetStateAction<string | null>>
    setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
  }
  object: Omit<ObjectDialogsProps, ObjectHandlerKeys>
  objectHandlers: {
    deleteSelectedObject: () => MaybePromise
    openEditObjectDialog: ObjectDialogsProps['onEditSelectedObject']
  }
  project: Omit<ProjectDialogsProps, ProjectHandlerKeys>
  projectHandlers: Pick<
    ProjectDialogsProps,
    | 'onAuthDisplayNameChange'
    | 'onAuthEmailChange'
    | 'onAuthModeChange'
    | 'onAuthPasswordChange'
    | 'onProjectDialogTabChange'
    | 'onProjectNameChange'
    | 'onProjectPresetKeysChange'
  > & {
    deletePendingProject: () => MaybePromise
    logout: () => MaybePromise
    saveProject: () => MaybePromise
    submitAuth: () => MaybePromise
    uploadProjectCover: (file: File) => MaybePromise
  }
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  timeline: Omit<TimelineDialogsProps, TimelineHandlerKeys>
  timelineHandlers: {
    deletePendingTimelineEvent: () => MaybePromise
  }
}): DialogHostProps {
  return {
    projectDialogsProps: {
      ...project,
      onAuthDisplayNameChange: projectHandlers.onAuthDisplayNameChange,
      onAuthEmailChange: projectHandlers.onAuthEmailChange,
      onAuthModeChange: projectHandlers.onAuthModeChange,
      onAuthPasswordChange: projectHandlers.onAuthPasswordChange,
      onClose: () => setDialog(null),
      onDeleteProject: () => void projectHandlers.deletePendingProject(),
      onLogout: () => void projectHandlers.logout(),
      onProjectCoverFileSelected: (file) => void projectHandlers.uploadProjectCover(file),
      onProjectDialogTabChange: projectHandlers.onProjectDialogTabChange,
      onProjectNameChange: projectHandlers.onProjectNameChange,
      onProjectPresetKeysChange: projectHandlers.onProjectPresetKeysChange,
      onSaveProject: () => void projectHandlers.saveProject(),
      onSubmitAuth: () => void projectHandlers.submitAuth(),
    },
    objectDialogsProps: {
      ...object,
      onClose: () => setDialog(null),
      onConfirmDeleteObject: () => void objectHandlers.deleteSelectedObject(),
      onEditSelectedObject: objectHandlers.openEditObjectDialog,
    },
    detailDialogsProps: {
      ...detail,
      onCloseRelationDetail: () => {
        setDialog(null)
        detailHandlers.setSelectedRelationEdgeId(null)
      },
      onCloseTimelineEventDetail: () => {
        setDialog(null)
        detailHandlers.setSelectedTimelineEventId(null)
      },
    },
    attributeDialogsProps: {
      ...attribute,
      onAttributeGroupIconChange: attributeHandlers.onAttributeGroupIconChange,
      onAttributeGroupNameChange: attributeHandlers.onAttributeGroupNameChange,
      onClose: () => setDialog(null),
      onDeleteAttribute: () => void attributeHandlers.deletePendingAttributeDefinition(),
      onDeleteAttributeGroup: () => void attributeHandlers.deletePendingAttributeGroup(),
      onSaveAttributeGroup: () => void attributeHandlers.saveAttributeGroup(),
    },
    catalogDialogsProps: {
      ...catalog,
      onCancelCatalogFieldEdit: () => {
        catalogHandlers.setEditingCatalogFieldId(null)
        catalogHandlers.setCatalogFieldDraft(emptyCatalogFieldDraft)
      },
      onCatalogDescriptionChange: catalogHandlers.onCatalogDescriptionChange,
      onCatalogDialogTabChange: catalogHandlers.onCatalogDialogTabChange,
      onCatalogEntryDraftChange: catalogHandlers.onCatalogEntryDraftChange,
      onCatalogFieldDraftChange: catalogHandlers.onCatalogFieldDraftChange,
      onCatalogGroupNameChange: catalogHandlers.onCatalogGroupNameChange,
      onCatalogGroupParentIdsChange: catalogHandlers.onCatalogGroupParentIdsChange,
      onCatalogHierarchyModeChange: catalogHandlers.onCatalogHierarchyModeChange,
      onCatalogNameChange: catalogHandlers.onCatalogNameChange,
      onCatalogSupportsHierarchyChange: (supportsHierarchy) => {
        catalogHandlers.setCatalogSupportsHierarchy(supportsHierarchy)
        if (!supportsHierarchy) {
          catalogHandlers.setCatalogHierarchyMode('entries')
        }
      },
      onClose: () => setDialog(null),
      onDeleteCatalogField: (fieldId) => void catalogHandlers.deleteCatalogField(fieldId),
      onDeletePendingCatalog: () => void catalogHandlers.deleteSelectedCatalog(),
      onDeletePendingCatalogEntry: () => void catalogHandlers.deletePendingCatalogEntry(),
      onDeleteSelectedCatalogGroup: () => void catalogHandlers.deleteSelectedCatalogGroup(),
      onEditCatalogField: catalogHandlers.onEditCatalogField,
      onEditSelectedCatalogEntry: catalogHandlers.onEditSelectedCatalogEntry,
      onOpenConfirmDeleteCatalogEntry: (entryId) => {
        catalogHandlers.setPendingDeleteCatalogEntryId(entryId)
        setDialog('confirmDeleteCatalogEntry')
      },
      onSaveCatalog: () => void catalogHandlers.saveCatalog(),
      onSaveCatalogEntry: () => void catalogHandlers.saveCatalogEntry(),
      onSaveCatalogField: () => void catalogHandlers.saveCatalogField(),
      onSaveCatalogGroup: () => void catalogHandlers.saveCatalogGroup(),
    },
    timelineDialogsProps: {
      ...timeline,
      onClose: () => setDialog(null),
      onDeletePendingTimelineEvent: () => void timelineHandlers.deletePendingTimelineEvent(),
    },
  }
}
