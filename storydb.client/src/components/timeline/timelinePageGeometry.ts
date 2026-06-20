import type { ScaleLinear } from 'd3-scale'

import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { formatTimelineTickLabel, type TimelineViewportCluster } from '../../timeline/timelineViewportModel'
import type { TimelineEvent, TimelineLayoutItem } from '../../types'

const TIMELINE_DURATION_TITLE_HEIGHT = 34
const TIMELINE_DURATION_POINT_BAND_HEIGHT = 30
const TIMELINE_DAYS_PER_YEAR = 365
const TIMELINE_MONTHS = [
  { label: 'янв', days: 31 },
  { label: 'фев', days: 28 },
  { label: 'мар', days: 31 },
  { label: 'апр', days: 30 },
  { label: 'май', days: 31 },
  { label: 'июн', days: 30 },
  { label: 'июл', days: 31 },
  { label: 'авг', days: 31 },
  { label: 'сен', days: 30 },
  { label: 'окт', days: 31 },
  { label: 'ноя', days: 30 },
  { label: 'дек', days: 31 },
] as const

export const TIMELINE_CHAPTER_LANE_Y = 674
export const TIMELINE_ERA_LABEL_Y = 748
export const TIMELINE_SCALE_PRESETS = [
  { key: 'century', pixelsPerYear: 3 },
  { key: 'decade', pixelsPerYear: 14 },
  { key: 'years', pixelsPerYear: 48 },
  { key: 'months', pixelsPerYear: 180 },
  { key: 'days', pixelsPerYear: 5200 },
] as const
export const TIMELINE_DEFAULT_PIXELS_PER_YEAR = TIMELINE_SCALE_PRESETS[0].pixelsPerYear

export type TimelineScalePresetKey = typeof TIMELINE_SCALE_PRESETS[number]['key']

export function hydrateTimelineClusters(clusters: TimelineViewportCluster[], eventsById: Map<number, TimelineEvent>) {
  return clusters.map((cluster) => ({
    ...cluster,
    eventIds: new Set(cluster.eventIds),
    events: cluster.eventIds
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is TimelineEvent => event !== undefined),
  }))
}

export function getActiveTimelineScalePresetKey(pixelsPerYear: number): TimelineScalePresetKey {
  if (pixelsPerYear >= 720) {
    return 'days'
  }

  if (pixelsPerYear >= 120) {
    return 'months'
  }

  if (pixelsPerYear >= 28) {
    return 'years'
  }

  if (pixelsPerYear >= 8) {
    return 'decade'
  }

  return 'century'
}

export function getTimelineScalePresetLabel(presetKey: TimelineScalePresetKey, ui: PreviewText) {
  if (presetKey === 'days') {
    return ui.timelineScaleDays
  }

  if (presetKey === 'months') {
    return ui.timelineScaleMonths
  }

  if (presetKey === 'years') {
    return ui.timelineScaleYears
  }

  if (presetKey === 'decade') {
    return ui.timelineScaleDecade
  }

  return ui.timelineScaleCentury
}

export function getTimelineEventRenderTop(eventType: TimelineEvent['eventType'], item: TimelineLayoutItem) {
  if (eventType === 'era') {
    return '0px'
  }

  if (eventType === 'chapter') {
    return `${TIMELINE_CHAPTER_LANE_Y}px`
  }

  return `${item.y}px`
}

export function getTimelineAnchor(
  item: TimelineLayoutItem,
  eventType: TimelineEvent['eventType'] | undefined,
  otherItem: TimelineLayoutItem,
) {
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2

  if (eventType === 'point') {
    return { x: centerX, y: centerY }
  }

  const otherCenterX = otherItem.x + otherItem.width / 2
  const anchorY = eventType === 'duration'
    ? item.y + TIMELINE_DURATION_TITLE_HEIGHT + TIMELINE_DURATION_POINT_BAND_HEIGHT / 2
    : centerY

  return {
    x: otherCenterX >= centerX ? item.x + item.width : item.x,
    y: anchorY,
  }
}

export function getTimelineLinkRoute(source: { x: number; y: number }, target: { x: number; y: number }) {
  if (Math.abs(source.x - target.x) < 1 || Math.abs(source.y - target.y) < 1) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
  }

  const elbowX = target.x

  return `M ${source.x} ${source.y} L ${elbowX} ${source.y} L ${target.x} ${target.y}`
}

export function buildTimelineAxisTicks(timeScale: ScaleLinear<number, number>, canvasWidth: number, zoom: number) {
  const visibleStart = timeScale.invert(0)
  const visibleEnd = timeScale.invert(canvasWidth)
  const minValue = Math.min(visibleStart, visibleEnd)
  const maxValue = Math.max(visibleStart, visibleEnd)
  const pixelsPerValue = Math.abs(timeScale(1) - timeScale(0))

  if (pixelsPerValue >= 120) {
    return buildCalendarTimelineAxisTicks(timeScale, minValue, maxValue, pixelsPerValue)
  }

  const majorStep = getNiceTimelineStep(120 / Math.max(pixelsPerValue, 0.001))
  const minorCandidates = [5, 4, 2].map((division) => ({
    division,
    step: majorStep / division,
  }))
  const minorStep = zoom > 0.7
    ? minorCandidates.find((candidate) => candidate.step * pixelsPerValue >= 22)?.step ?? majorStep
    : majorStep
  const precision = Math.max(0, Math.ceil(-Math.log10(minorStep)) + 2)
  const firstValue = Math.ceil(minValue / minorStep) * minorStep
  const ticks: Array<{ kind: 'major' | 'minor'; label: string; value: number; x: number }> = []

  for (let value = firstValue; value <= maxValue + minorStep * 0.5; value += minorStep) {
    const normalizedValue = Number(value.toFixed(precision))
    if (normalizedValue < minValue - minorStep * 0.25 || normalizedValue > maxValue + minorStep * 0.25) {
      continue
    }

    const majorRatio = Math.abs(normalizedValue / majorStep - Math.round(normalizedValue / majorStep))
    const isMajor = majorRatio < 0.001 || Math.abs(normalizedValue - minValue) < minorStep * 0.25
    ticks.push({
      kind: isMajor ? 'major' : 'minor',
      label: isMajor ? formatTimelineTickLabel(normalizedValue) : '',
      value: normalizedValue,
      x: timeScale(normalizedValue),
    })
  }

  return ticks
}

function buildCalendarTimelineAxisTicks(
  timeScale: ScaleLinear<number, number>,
  minValue: number,
  maxValue: number,
  pixelsPerYear: number,
) {
  const monthStarts = getTimelineMonthStarts()
  const visibleSpan = maxValue - minValue
  const dayPixelWidth = pixelsPerYear / TIMELINE_DAYS_PER_YEAR
  const showMonthLabels = pixelsPerYear >= 120
  const showMonthYear = visibleSpan <= 1.25
  const showDayTicks = dayPixelWidth >= 7
  const showDayLabels = dayPixelWidth >= 14
  const dayStep = getTimelineDayStep(84 / Math.max(dayPixelWidth, 0.001))
  const firstYear = Math.floor(minValue) - 1
  const lastYear = Math.ceil(maxValue) + 1
  const ticks: Array<{ kind: 'major' | 'minor' | 'month' | 'day'; label: string; value: number; x: number }> = []
  const pushedValues = new Set<string>()

  const pushTick = (kind: 'major' | 'minor' | 'month' | 'day', value: number, label: string) => {
    if (value < minValue - 0.001 || value > maxValue + 0.001) {
      return
    }

    const key = value.toFixed(6)
    if (pushedValues.has(key)) {
      return
    }

    pushedValues.add(key)
    ticks.push({
      kind,
      label,
      value,
      x: timeScale(value),
    })
  }

  for (let year = firstYear; year <= lastYear; year++) {
    pushTick('major', year, formatTimelineTickLabel(year))

    if (showMonthLabels) {
      monthStarts.forEach((monthStart, monthIndex) => {
        const value = year + monthStart / TIMELINE_DAYS_PER_YEAR
        const label = showMonthYear
          ? `${TIMELINE_MONTHS[monthIndex].label} ${formatTimelineTickLabel(year)}`
          : TIMELINE_MONTHS[monthIndex].label
        pushTick('month', value, label)
      })
    }

    if (showDayTicks) {
      for (let day = dayStep; day < TIMELINE_DAYS_PER_YEAR; day += dayStep) {
        const value = year + day / TIMELINE_DAYS_PER_YEAR
        const dayNumber = Math.floor(day % TIMELINE_DAYS_PER_YEAR) + 1
        pushTick('day', value, showDayLabels ? String(dayNumber) : '')
      }
    }
  }

  return ticks.sort((left, right) => left.value - right.value)
}

function getTimelineMonthStarts() {
  let currentDay = 0
  return TIMELINE_MONTHS.map((month) => {
    const start = currentDay
    currentDay += month.days
    return start
  })
}

function getTimelineDayStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 1) {
    return 1
  }

  if (rawStep <= 2) {
    return 2
  }

  if (rawStep <= 5) {
    return 5
  }

  if (rawStep <= 10) {
    return 10
  }

  if (rawStep <= 15) {
    return 15
  }

  if (rawStep <= 30) {
    return 30
  }

  return 60
}

function getNiceTimelineStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1
  }

  const exponent = Math.floor(Math.log10(rawStep))
  const magnitude = 10 ** exponent
  const normalized = rawStep / magnitude

  if (normalized <= 1) {
    return magnitude
  }

  if (normalized <= 2) {
    return 2 * magnitude
  }

  if (normalized <= 5) {
    return 5 * magnitude
  }

  return 10 * magnitude
}
