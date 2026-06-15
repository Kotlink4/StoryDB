import type { ElkNode } from 'elkjs/lib/elk-api'

import type { ObjectTypeKey, RelationGraph, RelationGraphNode, StoryObject } from '../../types'

export const relationNodeWidth = 220
export const relationNodeHeight = 72

type RelationLayoutEngine = {
  layout(graph: ElkNode): Promise<ElkNode>
}

let relationLayoutEnginePromise: Promise<RelationLayoutEngine> | null = null

const getRelationLayoutEngine = () => {
  relationLayoutEnginePromise ??= import('elkjs/lib/elk.bundled.js').then(
    ({ default: ElkConstructor }) => new ElkConstructor() as unknown as RelationLayoutEngine,
  )

  return relationLayoutEnginePromise
}

export const getRelationGraphNodes = (graph: RelationGraph, objects: StoryObject[]) =>
  graph.nodes.length > 0
    ? graph.nodes
    : objects.map((storyObject) => ({
        id: storyObject.id,
        name: storyObject.name,
        surname: storyObject.surname,
        surnameForm: storyObject.surnameForm,
        imagePath: storyObject.imagePath,
        typeKey: storyObject.typeKey as ObjectTypeKey,
      }))

export const getRelationDegrees = (graph: RelationGraph, graphNodes: RelationGraphNode[]) => {
  const degree = new Map<number, number>()

  graphNodes.forEach((node) => degree.set(node.id, 0))
  graph.edges.forEach((edge) => {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1)
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1)
  })

  return degree
}

const getRelationPairKey = (firstId: number, secondId: number) =>
  firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`

const getRelationComponents = (graphNodes: RelationGraphNode[], edges: RelationGraph['edges']) => {
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]))
  const adjacency = new Map<number, Set<number>>()

  graphNodes.forEach((node) => adjacency.set(node.id, new Set()))
  edges.forEach((edge) => {
    if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) {
      return
    }

    adjacency.get(edge.sourceId)?.add(edge.targetId)
    adjacency.get(edge.targetId)?.add(edge.sourceId)
  })

  const visited = new Set<number>()
  const components: RelationGraphNode[][] = []

  graphNodes.forEach((node) => {
    if (visited.has(node.id)) {
      return
    }

    const stack = [node.id]
    const component: RelationGraphNode[] = []

    visited.add(node.id)
    while (stack.length > 0) {
      const currentId = stack.pop()
      const currentNode = currentId === undefined ? undefined : nodeById.get(currentId)

      if (currentId === undefined || currentNode === undefined) {
        continue
      }

      component.push(currentNode)
      adjacency.get(currentId)?.forEach((nextId) => {
        if (!visited.has(nextId)) {
          visited.add(nextId)
          stack.push(nextId)
        }
      })
    }

    components.push(component)
  })

  return components
}

const getRelationTriangle = (component: RelationGraphNode[], relationPairs: Set<string>, degree: Map<number, number>) => {
  const sortedNodes = [...component].sort((firstNode, secondNode) => {
    const degreeDelta = (degree.get(secondNode.id) ?? 0) - (degree.get(firstNode.id) ?? 0)

    return degreeDelta !== 0 ? degreeDelta : firstNode.name.localeCompare(secondNode.name)
  })

  for (let firstIndex = 0; firstIndex < sortedNodes.length - 2; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < sortedNodes.length - 1; secondIndex += 1) {
      for (let thirdIndex = secondIndex + 1; thirdIndex < sortedNodes.length; thirdIndex += 1) {
        const firstNode = sortedNodes[firstIndex]
        const secondNode = sortedNodes[secondIndex]
        const thirdNode = sortedNodes[thirdIndex]

        if (
          relationPairs.has(getRelationPairKey(firstNode.id, secondNode.id)) &&
          relationPairs.has(getRelationPairKey(firstNode.id, thirdNode.id)) &&
          relationPairs.has(getRelationPairKey(secondNode.id, thirdNode.id))
        ) {
          return [firstNode, secondNode, thirdNode]
        }
      }
    }
  }

  return null
}

const centerRelationNode = (centerX: number, centerY: number) => ({
  x: centerX - relationNodeWidth / 2,
  y: centerY - relationNodeHeight / 2,
})

const getPositionedNeighbor = (
  nodeId: number,
  edges: RelationGraph['edges'],
  positions: Map<number, { x: number; y: number }>,
) => {
  const edge = edges.find((relationEdge) => {
    if (relationEdge.sourceId === nodeId && positions.has(relationEdge.targetId)) {
      return true
    }

    return relationEdge.targetId === nodeId && positions.has(relationEdge.sourceId)
  })

  if (edge === undefined) {
    return null
  }

  const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
  const neighborPosition = positions.get(neighborId)

  if (neighborPosition === undefined) {
    return null
  }

  return { id: neighborId, position: neighborPosition }
}

const getConnectedPositionedNeighbor = (
  nodeId: number,
  preferredNeighborIds: Set<number>,
  edges: RelationGraph['edges'],
  positions: Map<number, { x: number; y: number }>,
) => {
  const edge = edges.find((relationEdge) => {
    const neighborId =
      relationEdge.sourceId === nodeId
        ? relationEdge.targetId
        : relationEdge.targetId === nodeId
          ? relationEdge.sourceId
          : null

    return neighborId !== null && preferredNeighborIds.has(neighborId) && positions.has(neighborId)
  })

  if (edge === undefined) {
    return null
  }

  const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
  const neighborPosition = positions.get(neighborId)

  return neighborPosition === undefined ? null : { id: neighborId, position: neighborPosition }
}

const getSatellitePosition = (
  anchorId: number,
  anchorPosition: { x: number; y: number },
  index: number,
  triangleRoles: Map<number, 'top' | 'left' | 'right'>,
) => {
  const role = triangleRoles.get(anchorId)
  const verticalStep = relationNodeHeight + 34
  const horizontalStep = relationNodeWidth + 80

  if (role === 'top') {
    return {
      x: anchorPosition.x + (index - 0.5) * horizontalStep,
      y: anchorPosition.y - verticalStep - 50,
    }
  }

  if (role === 'left') {
    return {
      x: anchorPosition.x - horizontalStep,
      y: anchorPosition.y + index * verticalStep,
    }
  }

  if (role === 'right') {
    return {
      x: anchorPosition.x + horizontalStep,
      y: anchorPosition.y + index * verticalStep,
    }
  }

  return {
    x: anchorPosition.x + horizontalStep,
    y: anchorPosition.y + index * verticalStep,
  }
}

export const getRelationHandleIds = (
  sourcePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
) => {
  const sourceCenter = {
    x: sourcePosition.x + relationNodeWidth / 2,
    y: sourcePosition.y + relationNodeHeight / 2,
  }
  const targetCenter = {
    x: targetPosition.x + relationNodeWidth / 2,
    y: targetPosition.y + relationNodeHeight / 2,
  }
  const deltaX = targetCenter.x - sourceCenter.x
  const deltaY = targetCenter.y - sourceCenter.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      sourceHandle: deltaX >= 0 ? 'source-right' : 'source-left',
      targetHandle: deltaX >= 0 ? 'target-left' : 'target-right',
    }
  }

  return {
    sourceHandle: deltaY >= 0 ? 'source-bottom' : 'source-top',
    targetHandle: deltaY >= 0 ? 'target-top' : 'target-bottom',
  }
}

const calculateSmallRelationLayout = (graph: RelationGraph, graphNodes: RelationGraphNode[]) => {
  const primaryEdges = graph.edges.filter((edge) => edge.category === 'character')
  const primaryNodeIds = new Set(primaryEdges.flatMap((edge) => [edge.sourceId, edge.targetId]))
  const primaryNodes = graphNodes.filter((node) => primaryNodeIds.has(node.id))
  const layoutNodes = primaryNodes.length > 0 ? primaryNodes : graphNodes
  const layoutEdges = primaryEdges.length > 0 ? primaryEdges : graph.edges
  const components = getRelationComponents(layoutNodes, layoutEdges)

  if (components.some((component) => component.length > 8) || graphNodes.length > 14) {
    return null
  }

  const relationPairs = new Set(layoutEdges.map((edge) => getRelationPairKey(edge.sourceId, edge.targetId)))
  const degree = getRelationDegrees({ ...graph, edges: layoutEdges }, layoutNodes)
  const positions = new Map<number, { x: number; y: number }>()
  let offsetX = 120
  let offsetY = 120
  let rowHeight = 0

  components.forEach((component) => {
    const triangle = getRelationTriangle(component, relationPairs, degree)

    if (triangle !== null) {
      const [topNode, leftNode, rightNode] = triangle
      const triangleIds = new Set(triangle.map((node) => node.id))
      const restNodes = component.filter((node) => !triangleIds.has(node.id))
      const triangleRoles = new Map<number, 'top' | 'left' | 'right'>([
        [topNode.id, 'top'],
        [leftNode.id, 'left'],
        [rightNode.id, 'right'],
      ])
      const triangleAttachmentCounts = new Map<number, number>()

      positions.set(topNode.id, centerRelationNode(offsetX + 370, offsetY + 70))
      positions.set(leftNode.id, centerRelationNode(offsetX + 120, offsetY + 310))
      positions.set(rightNode.id, centerRelationNode(offsetX + 620, offsetY + 310))
      restNodes.forEach((node, index) => {
        const positionedNeighbor = getConnectedPositionedNeighbor(node.id, triangleIds, layoutEdges, positions)

        if (positionedNeighbor === null) {
          positions.set(node.id, centerRelationNode(offsetX + 120 + index * 250, offsetY + 540))
          return
        }

        const attachmentIndex = triangleAttachmentCounts.get(positionedNeighbor.id) ?? 0
        triangleAttachmentCounts.set(positionedNeighbor.id, attachmentIndex + 1)
        positions.set(node.id, getSatellitePosition(positionedNeighbor.id, positionedNeighbor.position, attachmentIndex, triangleRoles))
      })

      offsetX += Math.max(820, 240 + restNodes.length * 250)
      rowHeight = Math.max(rowHeight, restNodes.length > 0 ? 660 : 430)
      return
    }

    const radius = Math.max(210, component.length * 62)
    const centerX = offsetX + radius + relationNodeWidth / 2
    const centerY = offsetY + radius + relationNodeHeight / 2

    component
      .sort((firstNode, secondNode) => {
        const degreeDelta = (degree.get(secondNode.id) ?? 0) - (degree.get(firstNode.id) ?? 0)

        return degreeDelta !== 0 ? degreeDelta : firstNode.name.localeCompare(secondNode.name)
      })
      .forEach((node, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(component.length, 1)

        positions.set(node.id, centerRelationNode(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius))
      })

    offsetX += radius * 2 + relationNodeWidth + 140
    rowHeight = Math.max(rowHeight, radius * 2 + relationNodeHeight)

    if (offsetX > 1500) {
      offsetX = 120
      offsetY += rowHeight + 140
      rowHeight = 0
    }
  })

  const attachmentCounts = new Map<number, number>()
  const attachmentNodes = graphNodes.filter((node) => !positions.has(node.id))

  attachmentNodes.forEach((node, index) => {
    const positionedNeighbor = getPositionedNeighbor(node.id, graph.edges, positions)

    if (positionedNeighbor === null) {
      positions.set(node.id, centerRelationNode(120 + index * 260, offsetY + rowHeight + 220))
      return
    }

    const attachmentIndex = attachmentCounts.get(positionedNeighbor.id) ?? 0
    attachmentCounts.set(positionedNeighbor.id, attachmentIndex + 1)
    positions.set(node.id, {
      x: positionedNeighbor.position.x + relationNodeWidth + 170,
      y: positionedNeighbor.position.y + attachmentIndex * (relationNodeHeight + 28),
    })
  })

  return positions
}

export const calculateRelationLayout = async (graph: RelationGraph, objects: StoryObject[]) => {
  const graphNodes = getRelationGraphNodes(graph, objects)

  if (graphNodes.length === 0) {
    return new Map<number, { x: number; y: number }>()
  }

  const smallLayout = calculateSmallRelationLayout(graph, graphNodes)

  if (smallLayout !== null) {
    return smallLayout
  }

  const elkGraph: ElkNode = {
    id: 'relations-root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'SPLINES',
      'elk.spacing.nodeNode': '90',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: graphNodes.map((node) => ({
      id: String(node.id),
      width: relationNodeWidth,
      height: relationNodeHeight,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [String(edge.sourceId)],
      targets: [String(edge.targetId)],
    })),
  }

  const layoutEngine = await getRelationLayoutEngine()
  const layout = await layoutEngine.layout(elkGraph)
  const positions = new Map<number, { x: number; y: number }>()

  layout.children?.forEach((node) => {
    positions.set(Number(node.id), {
      x: node.x ?? 0,
      y: node.y ?? 0,
    })
  })

  return positions
}
