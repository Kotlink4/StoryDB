import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import { CatalogEntryDetail, type CatalogEntryLinkTarget } from '../../components/CatalogEntryDetail'
import { ObjectDetail } from '../../components/ObjectDetail'
import { RelationDetail } from '../../components/RelationDetail'
import { TimelineEventDetail } from '../../components/TimelineEventDetail'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  RelationGraph,
  StoryObject,
  TimelineEvent,
  TimelineEventLink,
  TimelineLayout,
} from '../../types'
import type { ObjectDossierTab } from '../domain/stylePreviewUiTypes'
import type { TextLinkTarget } from '../../components/LinkedText'

type ObjectDetailProps = Omit<ComponentProps<typeof ObjectDetail>, 'storyObject' | 'onEdit' | 'onClose'>
type RelationDetailProps = Omit<ComponentProps<typeof RelationDetail>, 'edge' | 'onClose'>
type TimelineEventDetailProps = Omit<ComponentProps<typeof TimelineEventDetail>, 'event' | 'onClose'>
type CatalogEntryDetailProps = Omit<ComponentProps<typeof CatalogEntryDetail>, 'entry' | 'onDelete' | 'onEdit'>

export function updateTimelineEventAndMarkLayoutStale({
  setTimelineEvents,
  setTimelineLayout,
  timelineEvent,
}: {
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  timelineEvent: TimelineEvent
}) {
  setTimelineEvents((currentEvents) =>
    currentEvents.map((currentEvent) => (currentEvent.id === timelineEvent.id ? timelineEvent : currentEvent)),
  )
  setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
}

export function buildStylePreviewObjectDetailProps({
  addGalleryImage,
  addObjectCoverToGallery,
  attributeDefinitions,
  attributeGroups,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
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
  updateObjectStructureAssignments,
  refreshRelationWorkspaceData,
  uploadGalleryImage,
}: {
  addGalleryImage: () => Promise<void>
  addObjectCoverToGallery: () => Promise<void>
  attributeDefinitions: ObjectDetailProps['attributeDefinitions']
  attributeGroups: ObjectDetailProps['attributeGroups']
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  deleteGalleryImage: (imageId: number) => Promise<void>
  dossierTab: ObjectDossierTab
  dossierTimelineEventId: string
  galleryImageCaption: string
  galleryImagePath: string | null
  hierarchyGroups: ObjectDetailProps['hierarchyGroups']
  hierarchyNodesByGroupId: ObjectDetailProps['hierarchyNodesByGroupId']
  objectsByType: Record<string, StoryObject[]> & ObjectDetailProps['objectsByType']
  openTimelineEventFromDossier: ObjectDetailProps['onOpenTimelineEvent']
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setDossierTab: Dispatch<SetStateAction<ObjectDossierTab>>
  setDossierTimelineEventId: Dispatch<SetStateAction<string>>
  setGalleryImageCaption: Dispatch<SetStateAction<string>>
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  textLinkTargets: TextLinkTarget[]
  timelineEvents: TimelineEvent[]
  ui: ObjectDetailProps['ui']
  updateObjectStructureAssignments: NonNullable<ObjectDetailProps['onStructureAssignmentsChange']>
  refreshRelationWorkspaceData: NonNullable<ObjectDetailProps['onStructureWorkspaceChange']>
  uploadGalleryImage: (file: File | null) => Promise<void>
}): ObjectDetailProps {
  return {
    activeTab: dossierTab,
    attributeDefinitions,
    attributeGroups,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs,
    dossierTimelineEventId,
    galleryImageCaption,
    galleryImagePath,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType,
    selectedProjectId,
    textLinkTargets,
    timelineEvents,
    ui,
    onAddGalleryImage: () => void addGalleryImage(),
    onAddCoverToGallery: () => void addObjectCoverToGallery(),
    onDelete: () => setDialog('confirmDeleteObject'),
    onDeleteGalleryImage: (imageId) => void deleteGalleryImage(imageId),
    onGalleryCaptionChange: setGalleryImageCaption,
    onGalleryImageUpload: (file) => void uploadGalleryImage(file),
    onDossierTimelineEventIdChange: setDossierTimelineEventId,
    onOpenTimelineEvent: openTimelineEventFromDossier,
    onStructureAssignmentsChange: updateObjectStructureAssignments,
    onStructureWorkspaceChange: refreshRelationWorkspaceData,
    onTabChange: setDossierTab,
    onTimelineEventUpdated: (timelineEvent) =>
      updateTimelineEventAndMarkLayoutStale({
        setTimelineEvents,
        setTimelineLayout,
        timelineEvent,
      }),
  }
}

export function buildStylePreviewRelationDetailProps({
  graph,
  objects,
  openRelationObjectDetail,
  ui,
}: {
  graph: RelationGraph
  objects: StoryObject[]
  openRelationObjectDetail: RelationDetailProps['onOpenObject']
  ui: RelationDetailProps['ui']
}): RelationDetailProps {
  return {
    graph,
    objects,
    ui,
    onOpenObject: openRelationObjectDetail,
  }
}

export function buildStylePreviewTimelineEventDetailProps({
  addTimelineGalleryImage,
  canEdit,
  deleteTimelineGalleryImage,
  events,
  galleryImageCaption,
  galleryImagePath,
  linkableObjects,
  links,
  openObjectDetail,
  openTimelineEventDetail,
  openTimelineEventEditor,
  setDialog,
  setPendingDeleteTimelineEventId,
  setTimelineGalleryImageCaption,
  timelineGalleryImagePath,
  ui,
  uploadTimelineGalleryImage,
}: {
  addTimelineGalleryImage: () => Promise<void>
  canEdit: boolean
  deleteTimelineGalleryImage: (imageId: number) => Promise<void>
  events: TimelineEvent[]
  galleryImageCaption: string
  galleryImagePath: string | null
  linkableObjects: StoryObject[]
  links: TimelineEventLink[]
  openObjectDetail: TimelineEventDetailProps['onOpenObject']
  openTimelineEventDetail: TimelineEventDetailProps['onOpenEvent']
  openTimelineEventEditor: TimelineEventDetailProps['onEdit']
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setPendingDeleteTimelineEventId: Dispatch<SetStateAction<number | null>>
  setTimelineGalleryImageCaption: Dispatch<SetStateAction<string>>
  timelineGalleryImagePath: string | null
  ui: TimelineEventDetailProps['ui']
  uploadTimelineGalleryImage: (file: File | null) => Promise<void>
}): TimelineEventDetailProps {
  return {
    events,
    galleryImageCaption,
    galleryImagePath: timelineGalleryImagePath ?? galleryImagePath,
    links,
    objects: linkableObjects,
    ui,
    onAddGalleryImage: canEdit ? () => void addTimelineGalleryImage() : undefined,
    onDelete: canEdit
      ? (eventId) => {
          setPendingDeleteTimelineEventId(eventId)
          setDialog('confirmDeleteTimelineEvent')
        }
      : undefined,
    onDeleteGalleryImage: canEdit ? (imageId) => void deleteTimelineGalleryImage(imageId) : undefined,
    onEdit: canEdit ? openTimelineEventEditor : undefined,
    onGalleryCaptionChange: canEdit ? setTimelineGalleryImageCaption : undefined,
    onGalleryImageUpload: canEdit ? (file) => void uploadTimelineGalleryImage(file) : undefined,
    onOpenEvent: openTimelineEventDetail,
    onOpenObject: openObjectDetail,
  }
}

export function buildStylePreviewCatalogEntryDetailProps({
  catalog,
  catalogEntryLinksById,
  fieldDefinitions,
  textLinkTargets,
  ui,
}: {
  catalog: Catalog | null
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  fieldDefinitions: CatalogFieldDefinition[]
  textLinkTargets: TextLinkTarget[]
  ui: CatalogEntryDetailProps['ui']
}): CatalogEntryDetailProps {
  return {
    catalog,
    catalogEntryLinksById,
    fieldDefinitions,
    textLinkTargets,
    ui,
  }
}
