import type { TimelineEventType } from '../../types'

export const relationCategoryColorTokens: Record<string, string> = {
  character: '#2563eb',
  object: '#0f766e',
  ownership: '#9333ea',
}

export const defaultRelationColorToken = '#334155'
export const relationLabelBackgroundToken = 'var(--sp-surface)'

export const timelineEventColorTokens: Record<TimelineEventType, string> = {
  chapter: '#7c3aed',
  duration: '#2563eb',
  era: '#475569',
  point: '#059669',
}

export const defaultTimelineEventColorToken = timelineEventColorTokens.duration
