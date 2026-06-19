import { useState, type ReactNode } from 'react'
import {
  emptyAttributeDefinitionDraft,
  emptyTimelineEventDraft,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type { PreviewLanguage, PreviewTheme } from '../domain/stylePreviewI18n'
import type { PreviewPersistedState } from '../domain/stylePreviewStateStorage'
import type { PreviewSection, PreviewTab, UtilityPage } from '../domain/stylePreviewRouting'
import type {
  AttributeDefinitionDraft,
  RelationLinkDraft,
  TimelineEventDraft,
  TimelineEventLinkDraft,
} from '../../types'
import type { DetailMode, GroupDisplayMode, ObjectDossierTab } from '../domain/stylePreviewUiTypes'

type StylePreviewRouteState = {
  activeSection: PreviewSection | null
  activeTab: PreviewTab | null
  objectId: number | null
  utilityPage: UtilityPage
}

export const useStylePreviewUiState = (
  routeState: StylePreviewRouteState,
  initialPreviewState: PreviewPersistedState,
) => {
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
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [structureDetailPanel, setStructureDetailPanel] = useState<ReactNode | null>(null)
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

  return {
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
  }
}
