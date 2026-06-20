import { BaseEdge, Position, type Edge, type EdgeProps } from '@xyflow/react'

type ParallelEdgeData = Record<string, unknown> & {
  hierarchyCorridorCount?: number
  hierarchyCorridorIndex?: number
  isHierarchyRoute?: boolean
  parallelSourceCount?: number
  parallelSourceIndex?: number
  parallelTargetCount?: number
  parallelTargetIndex?: number
}

export type RelationsFlowEdge = Edge<ParallelEdgeData, 'parallel' | 'straight'>

const parallelEdgeGap = 13

const getParallelOffset = (index = 0, count = 1) =>
  count <= 1 ? 0 : (index - (count - 1) / 2) * parallelEdgeGap

const getEndpointOffset = (position: Position, index?: number, count?: number) => {
  const offset = getParallelOffset(index, count)

  if (position === Position.Top || position === Position.Bottom) {
    return { x: offset, y: 0 }
  }

  return { x: 0, y: offset }
}

const getControlPoint = (position: Position, x: number, y: number, distance: number) => {
  if (position === Position.Left) {
    return { x: x - distance, y }
  }

  if (position === Position.Top) {
    return { x, y: y - distance }
  }

  if (position === Position.Bottom) {
    return { x, y: y + distance }
  }

  return { x: x + distance, y }
}

export function ParallelEdge({
  id,
  label,
  labelBgBorderRadius,
  labelBgPadding,
  labelBgStyle,
  labelStyle,
  markerEnd,
  markerStart,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
  data,
  interactionWidth,
}: EdgeProps<RelationsFlowEdge>) {
  const sourceOffset = getEndpointOffset(
    sourcePosition,
    data?.parallelSourceIndex,
    data?.parallelSourceCount,
  )
  const targetOffset = getEndpointOffset(
    targetPosition,
    data?.parallelTargetIndex,
    data?.parallelTargetCount,
  )
  const adjustedSourceX = sourceX + sourceOffset.x
  const adjustedSourceY = sourceY + sourceOffset.y
  const adjustedTargetX = targetX + targetOffset.x
  const adjustedTargetY = targetY + targetOffset.y
  const labelX = (adjustedSourceX + adjustedTargetX) / 2
  let labelY = (adjustedSourceY + adjustedTargetY) / 2
  let path: string

  if (data?.isHierarchyRoute === true) {
    const verticalDistance = Math.abs(adjustedTargetY - adjustedSourceY)
    const parallelOffset = getParallelOffset(data.parallelSourceIndex, data.parallelSourceCount) * 0.35
    const corridorOffset = getParallelOffset(data.hierarchyCorridorIndex, data.hierarchyCorridorCount) * 1.35
    const laneOffset = parallelOffset + corridorOffset
    const approachDistance = Math.min(76, Math.max(36, verticalDistance * 0.28))
    const rawCorridorY = adjustedTargetY > adjustedSourceY
      ? adjustedTargetY - approachDistance + laneOffset
      : (adjustedSourceY + adjustedTargetY) / 2 + laneOffset
    const corridorY = adjustedTargetY > adjustedSourceY
      ? Math.min(adjustedTargetY - 24, Math.max(adjustedSourceY + 28, rawCorridorY))
      : rawCorridorY
    labelY = corridorY - 8
    path = [
      `M ${adjustedSourceX},${adjustedSourceY}`,
      `L ${adjustedSourceX},${corridorY}`,
      `L ${adjustedTargetX},${corridorY}`,
      `L ${adjustedTargetX},${adjustedTargetY}`,
    ].join(' ')
  } else {
    const distance = Math.hypot(adjustedTargetX - adjustedSourceX, adjustedTargetY - adjustedSourceY)
    const controlDistance = Math.max(80, Math.min(220, distance * 0.42))
    const sourceControl = getControlPoint(sourcePosition, adjustedSourceX, adjustedSourceY, controlDistance)
    const targetControl = getControlPoint(targetPosition, adjustedTargetX, adjustedTargetY, controlDistance)
    path = [
      `M ${adjustedSourceX},${adjustedSourceY}`,
      `C ${sourceControl.x},${sourceControl.y}`,
      `${targetControl.x},${targetControl.y}`,
      `${adjustedTargetX},${adjustedTargetY}`,
    ].join(' ')
  }

  return (
    <BaseEdge
      id={id}
      interactionWidth={interactionWidth}
      label={label}
      labelBgBorderRadius={labelBgBorderRadius}
      labelBgPadding={labelBgPadding}
      labelBgStyle={labelBgStyle}
      labelStyle={labelStyle}
      labelX={labelX}
      labelY={labelY}
      markerEnd={markerEnd}
      markerStart={markerStart}
      path={path}
      style={style}
    />
  )
}
