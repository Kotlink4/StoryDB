export type ObjectListVirtualWindow = {
  isVirtualized: boolean
  startIndex: number
  endIndex: number
  topSpacerHeight: number
  bottomSpacerHeight: number
}

export type ObjectListVirtualWindowInput = {
  itemCount: number
  columns: number
  rowHeight: number
  scrollTop: number
  viewportHeight: number
  overscanRows?: number
  threshold?: number
}

export const defaultObjectListVirtualizationThreshold = 120
export const objectGridMinColumnWidth = 180
export const objectGridGap = 14

export const calculateObjectGridColumns = (
  containerWidth: number,
  minColumnWidth = objectGridMinColumnWidth,
  gap = objectGridGap,
) => {
  const safeContainerWidth = Math.max(0, containerWidth)
  const safeMinColumnWidth = Math.max(1, minColumnWidth)
  const safeGap = Math.max(0, gap)

  return Math.max(1, Math.floor((safeContainerWidth + safeGap) / (safeMinColumnWidth + safeGap)))
}

export const getObjectGridCardHeight = (typeKey: string | null | undefined) => {
  if (typeKey === 'characters') {
    return 334
  }

  if (typeKey === 'items' || typeKey === 'organizations' || typeKey === 'hierarchy') {
    return 282
  }

  if (typeKey === 'places') {
    return 268
  }

  return 304
}

export const calculateObjectListVirtualWindow = ({
  itemCount,
  columns,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscanRows = 4,
  threshold = defaultObjectListVirtualizationThreshold,
}: ObjectListVirtualWindowInput): ObjectListVirtualWindow => {
  const safeItemCount = Math.max(0, itemCount)
  const safeColumns = Math.max(1, Math.floor(columns))
  const safeRowHeight = Math.max(1, rowHeight)

  if (safeItemCount <= threshold) {
    return {
      isVirtualized: false,
      startIndex: 0,
      endIndex: safeItemCount,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    }
  }

  const totalRows = Math.ceil(safeItemCount / safeColumns)
  const firstVisibleRow = Math.max(0, Math.floor(Math.max(0, scrollTop) / safeRowHeight) - overscanRows)
  const lastVisibleRow = Math.min(
    totalRows,
    Math.ceil((Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / safeRowHeight) + overscanRows,
  )

  return {
    isVirtualized: true,
    startIndex: firstVisibleRow * safeColumns,
    endIndex: Math.min(safeItemCount, lastVisibleRow * safeColumns),
    topSpacerHeight: firstVisibleRow * safeRowHeight,
    bottomSpacerHeight: Math.max(0, (totalRows - lastVisibleRow) * safeRowHeight),
  }
}
