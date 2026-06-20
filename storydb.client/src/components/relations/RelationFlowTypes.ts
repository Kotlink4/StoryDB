import type { Node } from '@xyflow/react'

import type { StoryObject } from '../../types'

export type RelationNodeData = {
  storyObject: StoryObject
  relationCount: number
  onSelect: (storyObject: StoryObject) => void
}

export type RelationObjectFlowNode = Node<RelationNodeData, 'relationObject'>

export type StructureFlowNodeKind = 'structure' | 'assignmentObject'
export type StructureGraphMode = 'all' | 'structure' | 'assignments'
export type StructureGraphTarget = { kind: 'structureNode'; id: number }

export type StructureNodeData = {
  title: string
  subtitle: string
  meta: string
  description: string | null
  kind: StructureFlowNodeKind
  color: string
  target: StructureGraphTarget | null
  onSelectTarget: (target: StructureGraphTarget) => void
}

export type StructureFlowNode = Node<StructureNodeData, 'structureNode'>
export type RelationsFlowNode = RelationObjectFlowNode | StructureFlowNode
