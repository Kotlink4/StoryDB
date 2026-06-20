import type { Dispatch, SetStateAction } from 'react'

import {
  addTimelineEventGalleryImageRequest,
  createTimelineEventLinkRequest,
  createTimelineEventRequest,
  deleteTimelineEventGalleryImageRequest,
  deleteTimelineEventLinkRequest,
  deleteTimelineEventRequest,
  generateTimelineLayoutRequest,
  updateTimelineEventRequest,
  uploadImageRequest,
} from '../../api'
import {
  emptyTimelineEventDraft,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type { PreviewTab } from '../domain/stylePreviewRouting'
import { toTimelineEventDraft } from '../domain/stylePreviewTimelineDrafts'
import type {
  TimelineEvent,
  TimelineEventDraft,
  TimelineEventLink,
  TimelineEventLinkDraft,
  TimelineLayout,
} from '../../types'
import {
  validateTimelineEventDraft,
  validateTimelineLinkDraftIssues,
  validationIssuesToMap,
} from '../../validation'
import type { ValidationIssueMap } from '../../validation'

type TimelineCommandMessages = {
  eventCoverUploadFailed: string
  eventCreateFailed: string
  eventDeleteFailed: string
  fieldValidationFailed: string
  galleryEventImageAddFailed: string
  galleryEventImageDeleteFailed: string
  galleryEventImageUploadFailed: string
  relationLinkCreateFailed: string
  relationLinkDeleteFailed: string
  timelineGenerateFailed: string
}

type UseStylePreviewTimelineCommandsOptions = {
  editingTimelineEventId: number | null
  messages: TimelineCommandMessages
  pendingDeleteTimelineEventId: number | null
  selectedProjectId: number | null
  selectedTimelineEvent: TimelineEvent | null
  setActiveTab: Dispatch<SetStateAction<PreviewTab>>
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setEditingTimelineEventId: Dispatch<SetStateAction<number | null>>
  setIsTimelineGenerating: Dispatch<SetStateAction<boolean>>
  setPendingDeleteTimelineEventId: Dispatch<SetStateAction<number | null>>
  setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
  setTimelineDraft: Dispatch<SetStateAction<TimelineEventDraft>>
  setTimelineEventValidationErrors: Dispatch<SetStateAction<ValidationIssueMap>>
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineGalleryImageCaption: Dispatch<SetStateAction<string>>
  setTimelineGalleryImagePath: Dispatch<SetStateAction<string | null>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  setTimelineLinkDraft: Dispatch<SetStateAction<TimelineEventLinkDraft>>
  setTimelineLinkValidationErrors: Dispatch<SetStateAction<ValidationIssueMap>>
  setTimelineLinks: Dispatch<SetStateAction<TimelineEventLink[]>>
  showErrorMessage: (message: string) => void
  timelineDraft: TimelineEventDraft
  timelineGalleryImageCaption: string
  timelineGalleryImagePath: string | null
  timelineLinkDraft: TimelineEventLinkDraft
}

export function useStylePreviewTimelineCommands({
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
}: UseStylePreviewTimelineCommandsOptions) {
  const openTimelineEventEditor = (event: TimelineEvent | null = null) => {
    setEditingTimelineEventId(event?.id ?? null)
    setTimelineEventValidationErrors({})
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

    const validationIssues = validateTimelineEventDraft(timelineDraft)
    if (validationIssues.length > 0) {
      setTimelineEventValidationErrors(validationIssuesToMap(validationIssues))
      showErrorMessage(messages.fieldValidationFailed)
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
      setTimelineEventValidationErrors({})
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

  const uploadTimelineEventCover = async (file: File) => {
    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setTimelineDraft((draft) => ({ ...draft, imagePath: result.path }))
    } catch {
      showErrorMessage(messages.eventCoverUploadFailed)
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

    const validationIssues = validateTimelineLinkDraftIssues(timelineLinkDraft)
    if (validationIssues.length > 0) {
      setTimelineLinkValidationErrors(validationIssuesToMap(validationIssues))
      showErrorMessage(messages.fieldValidationFailed)
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
      setTimelineLinkValidationErrors({})
      setDialog(null)
    } catch {
      showErrorMessage(messages.relationLinkCreateFailed)
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

  return {
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
  }
}
