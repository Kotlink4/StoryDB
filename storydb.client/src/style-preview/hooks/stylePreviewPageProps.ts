import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import type { RelationsPageProps } from '../../components/RelationsPage'
import { SettingsPage } from '../../components/StylePreviewSettingsPage'
import {
  StylePreviewCatalogEntryDetailPage,
  StylePreviewRelationDetailPage,
  StylePreviewTimelineEventDetailPage,
} from '../../components/StylePreviewDetailPages'
import type { TimelinePageProps } from '../../components/TimelinePage'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type { PreviewText } from '../domain/stylePreviewI18n'
import type {
  RelationGraph,
  RelationGraphLayout,
  StoryObject,
  Structure,
  StructureAssignment,
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
  CatalogEntry,
} from '../../types'
import type { DetailMode, GroupDisplayMode } from '../domain/stylePreviewUiTypes'

type SettingsPageProps = ComponentProps<typeof SettingsPage>
type RelationDetailPageProps = Omit<ComponentProps<typeof StylePreviewRelationDetailPage>, 'selectedRelationEdge'>
type TimelineEventDetailPageProps = Omit<ComponentProps<typeof StylePreviewTimelineEventDetailPage>, 'selectedTimelineEvent'>
type CatalogEntryDetailPageProps = Omit<ComponentProps<typeof StylePreviewCatalogEntryDetailPage>, 'selectedCatalogEntry'>

export function buildStylePreviewSettingsPageProps({
  detailMode,
  groupDisplayMode,
  previewLanguage,
  previewTheme,
  setDetailMode,
  setGroupDisplayMode,
  setPreviewLanguage,
  setPreviewTheme,
  ui,
}: {
  detailMode: DetailMode
  groupDisplayMode: GroupDisplayMode
  previewLanguage: SettingsPageProps['previewLanguage']
  previewTheme: SettingsPageProps['previewTheme']
  setDetailMode: SettingsPageProps['onDetailModeChange']
  setGroupDisplayMode: SettingsPageProps['onGroupDisplayModeChange']
  setPreviewLanguage: SettingsPageProps['onLanguageChange']
  setPreviewTheme: SettingsPageProps['onThemeChange']
  ui: PreviewText
}): SettingsPageProps {
  return {
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
}

export function buildStylePreviewRelationDetailPageProps({
  relationDetailProps,
  setIsRelationPageOpen,
  ui,
}: {
  relationDetailProps: RelationDetailPageProps['relationDetailProps']
  setIsRelationPageOpen: Dispatch<SetStateAction<boolean>>
  ui: PreviewText
}): RelationDetailPageProps {
  return {
    relationDetailProps,
    ui,
    onBack: () => setIsRelationPageOpen(false),
  }
}

export function buildStylePreviewTimelineEventDetailPageProps({
  setIsTimelineEventPageOpen,
  timelineEventDetailProps,
  ui,
}: {
  setIsTimelineEventPageOpen: Dispatch<SetStateAction<boolean>>
  timelineEventDetailProps: TimelineEventDetailPageProps['timelineEventDetailProps']
  ui: PreviewText
}): TimelineEventDetailPageProps {
  return {
    timelineEventDetailProps,
    ui,
    onBack: () => setIsTimelineEventPageOpen(false),
  }
}

export function buildStylePreviewCatalogEntryDetailPageProps({
  catalogEntryDetailProps,
  openEditCatalogEntry,
  setDialog,
  setPendingDeleteCatalogEntryId,
  setSelectedCatalogEntryId,
  ui,
}: {
  catalogEntryDetailProps: CatalogEntryDetailPageProps['catalogEntryDetailProps']
  openEditCatalogEntry: ((entry: CatalogEntry) => void) | undefined
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setPendingDeleteCatalogEntryId: Dispatch<SetStateAction<number | null>> | undefined
  setSelectedCatalogEntryId: Dispatch<SetStateAction<number | null>>
  ui: PreviewText
}): CatalogEntryDetailPageProps {
  return {
    catalogEntryDetailProps,
    ui,
    onBack: () => setSelectedCatalogEntryId(null),
    onDelete: setPendingDeleteCatalogEntryId === undefined
      ? undefined
      : (entry) => {
          setPendingDeleteCatalogEntryId(entry.id)
          setDialog('confirmDeleteCatalogEntry')
        },
    onEdit: openEditCatalogEntry,
  }
}

export function buildStylePreviewRelationsPageProps({
  detailMode,
  generateRelationGraphLayout,
  graph,
  isLayoutGenerating,
  layout,
  linkableObjects,
  loadRelationGraphLayout,
  openRelationDetail,
  openRelationObjectDetail,
  saveRelationGraphNodePosition,
  selectedEdgeId,
  setDialog,
  structureAssignments,
  structures,
  ui,
}: {
  detailMode: DetailMode
  generateRelationGraphLayout: (graphKey: string, graph: RelationGraph) => Promise<void>
  graph: RelationGraph
  isLayoutGenerating: boolean
  layout: RelationGraphLayout | null
  linkableObjects: StoryObject[]
  loadRelationGraphLayout: (graphKey: string) => Promise<void>
  openRelationDetail: (edgeId: string) => void
  openRelationObjectDetail: (storyObject: StoryObject) => void
  saveRelationGraphNodePosition: (
    graphKey: string,
    graph: RelationGraph,
    storyObjectId: number,
    position: { x: number; y: number },
  ) => Promise<void>
  selectedEdgeId: string | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  structureAssignments: StructureAssignment[]
  structures: Structure[]
  ui: PreviewText
}): RelationsPageProps {
  return {
    graph,
    detailMode,
    isLayoutGenerating,
    layout,
    objects: linkableObjects,
    structureAssignments,
    structures,
    selectedEdgeId,
    ui,
    onCreateRelation: () => setDialog('relationLink'),
    onGenerateLayout: (graphKey, nextGraph) => void generateRelationGraphLayout(graphKey, nextGraph),
    onGraphKeyChange: (graphKey) => void loadRelationGraphLayout(graphKey),
    onSaveNodePosition: (graphKey, nextGraph, storyObjectId, position) =>
      void saveRelationGraphNodePosition(graphKey, nextGraph, storyObjectId, position),
    onSelectEdge: openRelationDetail,
    onSelect: openRelationObjectDetail,
  }
}

export function buildStylePreviewTimelinePageProps({
  deleteTimelineLink,
  generateTimelineLayout,
  isGenerating,
  layout,
  layoutRules,
  links,
  openTimelineEventDetail,
  openTimelineEventEditor,
  selectedEvent,
  setDialog,
  timeline,
  timelineEvents,
  ui,
}: {
  deleteTimelineLink: (linkId: number) => Promise<void>
  generateTimelineLayout: () => Promise<void>
  isGenerating: boolean
  layout: TimelineLayout | null
  layoutRules: TimelineLayoutRules | null
  links: TimelineEventLink[]
  openTimelineEventDetail: (eventId: number) => void
  openTimelineEventEditor: () => void
  selectedEvent: TimelineEvent | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  timeline: TimelineInfo | null
  timelineEvents: TimelineEvent[]
  ui: PreviewText
}): TimelinePageProps {
  return {
    events: timelineEvents,
    isGenerating,
    layout,
    layoutRules,
    links,
    selectedEvent,
    timeline,
    ui,
    onCreate: openTimelineEventEditor,
    onCreateLink: () => setDialog('timelineLink'),
    onDeleteLink: (linkId) => void deleteTimelineLink(linkId),
    onGenerate: () => void generateTimelineLayout(),
    onSelectEvent: openTimelineEventDetail,
  }
}
