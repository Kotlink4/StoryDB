import type { CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import { getObjectFullName } from '../../style-preview/domain/objectDisplay'
import { ObjectPortrait } from '../StylePreviewPrimitives'
import type { RelationObjectFlowNode, StructureFlowNode } from './RelationFlowTypes'

const relationHandlePositions = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
]

export function RelationObjectNode({ data }: NodeProps<RelationObjectFlowNode>) {
  return (
    <button className="sp-flow-node" type="button" onClick={() => data.onSelect(data.storyObject)}>
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`source-${handle.id}`}
          key={`source-${handle.id}`}
          position={handle.position}
          type="source"
        />
      ))}
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`target-${handle.id}`}
          key={`target-${handle.id}`}
          position={handle.position}
          type="target"
        />
      ))}
      <ObjectPortrait storyObject={data.storyObject} />
      <div>
        <strong>{getObjectFullName(data.storyObject)}</strong>
        <span>{data.storyObject.typeKey}</span>
      </div>
      <em>{data.relationCount}</em>
    </button>
  )
}

export function StructureNode({ data }: NodeProps<StructureFlowNode>) {
  const content = (
    <>
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`source-${handle.id}`}
          key={`source-${handle.id}`}
          position={handle.position}
          type="source"
        />
      ))}
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`target-${handle.id}`}
          key={`target-${handle.id}`}
          position={handle.position}
          type="target"
        />
      ))}
      <span>{data.subtitle}</span>
      <strong>{data.title}</strong>
      {data.description !== null && <p>{data.description}</p>}
      <em>{data.meta}</em>
    </>
  )

  return (
    <button
      className={`sp-structure-flow-node ${data.kind}`}
      type="button"
      onClick={() => {
        if (data.target !== null) {
          data.onSelectTarget(data.target)
        }
      }}
      style={{ '--node-color': data.color } as CSSProperties}
      title={data.description === null ? data.title : `${data.title}\n${data.description}`}
    >
      {content}
    </button>
  )
}
