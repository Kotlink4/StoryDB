import { timelineEventColorTokens } from './styleRuntimeTokens'
import type { PreviewText } from './stylePreviewI18n'
import type { StoryObject, TimelineChange, TimelineEvent, TimelineEventLink } from '../../types'

export function getTimelineEventTypeLabel(eventType: TimelineEvent['eventType'], ui: PreviewText) {
  if (eventType === 'duration') {
    return ui.timelineEventTypeDuration
  }

  if (eventType === 'era') {
    return ui.timelineEventTypeEra
  }

  if (eventType === 'chapter') {
    return ui.timelineEventTypeChapter
  }

  return ui.timelineEventTypePoint
}

export function getTimelineEventColor(eventType: TimelineEvent['eventType']) {
  return timelineEventColorTokens[eventType]
}

export function getTimelineLinkTypeLabel(linkType: TimelineEventLink['linkType'], ui: PreviewText) {
  if (linkType === 'precedes') {
    return ui.timelineLinkPrecedes
  }

  if (linkType === 'causes') {
    return ui.timelineLinkCauses
  }

  if (linkType === 'simultaneous') {
    return ui.timelineLinkSimultaneous
  }

  if (linkType === 'partOf') {
    return ui.timelineLinkPartOf
  }

  return ui.timelineLinkRelated
}

export function formatTimelineChangeValue(value: string | null, ui: PreviewText) {
  if (value === null || value.trim().length === 0) {
    return '-'
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (Array.isArray(parsedValue)) {
      return parsedValue.length === 0 ? '[]' : `${parsedValue.length} ${ui.recordsCount}`
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
      return JSON.stringify(parsedValue)
    }
  } catch {
    // Timeline changes can store either plain text or JSON snapshots.
  }

  return value
}

function readTimelineChangeRawValue(value: string | null) {
  if (value === null || value.trim().length === 0) {
    return ''
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (typeof parsedValue === 'string') {
      return parsedValue
    }

    if (parsedValue === null) {
      return ''
    }

    return JSON.stringify(parsedValue)
  } catch {
    return value
  }
}

function getTimelineChangeFieldKey(change: TimelineChange) {
  return (change.fieldName ?? change.fieldKey ?? '').trim().toLowerCase()
}

function getLatestObjectTimelineChange(changes: TimelineChange[], changeType: string, fieldName: string) {
  const normalizedFieldName = fieldName.trim().toLowerCase()

  return [...changes]
    .reverse()
    .find((change) => change.changeType === changeType && getTimelineChangeFieldKey(change) === normalizedFieldName)
}

function getChangedNullableField(changes: TimelineChange[], fieldName: string, fallback: string | null) {
  const change = getLatestObjectTimelineChange(changes, 'field', fieldName)

  if (change === undefined) {
    return fallback
  }

  const value = readTimelineChangeRawValue(change.newValueJson).trim()

  return value.length === 0 ? null : value
}

export function applyTimelineChangesToObject(storyObject: StoryObject, changes: TimelineChange[]): StoryObject {
  if (changes.length === 0) {
    return storyObject
  }

  const displayAttributes = [...storyObject.attributes]

  changes
    .filter((change) => change.changeType === 'attribute')
    .forEach((change, index) => {
      const attributeName = (change.fieldName ?? change.fieldKey ?? '').trim()

      if (attributeName.length === 0) {
        return
      }

      const value = readTimelineChangeRawValue(change.newValueJson).trim()
      const attributeIndex = displayAttributes.findIndex(
        (attribute) => attribute.name.trim().toLowerCase() === attributeName.toLowerCase(),
      )

      if (attributeIndex >= 0) {
        displayAttributes[attributeIndex] = {
          ...displayAttributes[attributeIndex],
          value: value.length === 0 ? null : value,
        }
        return
      }

      displayAttributes.push({
        id: -100000 - index,
        attributeDefinitionId: 0,
        name: attributeName,
        value: value.length === 0 ? null : value,
      })
    })

  return {
    ...storyObject,
    name: getChangedNullableField(changes, 'name', storyObject.name) ?? storyObject.name,
    surname: getChangedNullableField(changes, 'surname', storyObject.surname),
    surnameForm: getChangedNullableField(changes, 'surnameForm', storyObject.surnameForm),
    description: getChangedNullableField(changes, 'description', storyObject.description),
    age: getChangedNullableField(changes, 'age', storyObject.age),
    role: getChangedNullableField(changes, 'role', storyObject.role),
    imagePath: getChangedNullableField(changes, 'imagePath', storyObject.imagePath),
    attributes: displayAttributes,
  }
}
