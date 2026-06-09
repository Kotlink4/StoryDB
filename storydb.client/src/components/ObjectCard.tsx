import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { resolveAssetUrl } from '../api'
import type { ObjectTypeKey, StoryObject } from '../types'

type ObjectCardProps = {
  activeMenuId: number | null
  storyObject: StoryObject
  t: Record<string, string>
  onDelete: (storyObject: StoryObject) => void
  onEdit: (storyObject: StoryObject) => void
  onMenuToggle: (objectId: number) => void
  onOpen: (storyObject: StoryObject) => void
}

export function ObjectCard({
  activeMenuId,
  storyObject,
  t,
  onDelete,
  onEdit,
  onMenuToggle,
  onOpen,
}: ObjectCardProps) {
  const isMenuOpen = activeMenuId === storyObject.id
  const imageUrl = resolveAssetUrl(storyObject.imagePath)
  const typeLabel = t[storyObject.typeKey as ObjectTypeKey] ?? storyObject.typeKey

  return (
    <article className="folder-entry">
      <button className="folder-entry-main" type="button" onClick={() => onOpen(storyObject)}>
        <span className="character-portrait" aria-hidden="true">
          {imageUrl === null ? (
            storyObject.name
              .split(' ')
              .map((part) => part[0])
              .join('')
          ) : (
            <img src={imageUrl} alt="" />
          )}
        </span>
        <div className="entry-content">
          <h2>{storyObject.name}</h2>
          <p className="entry-role">{typeLabel}</p>
          <p className="entry-note">{storyObject.description}</p>
        </div>
      </button>
      <div className="folder-action-menu action-menu">
        <button
          className="icon-menu-button"
          type="button"
          aria-label={`${storyObject.name}: ${t.edit}/${t.delete}`}
          aria-expanded={isMenuOpen}
          onClick={() => onMenuToggle(storyObject.id)}
        >
          <MoreVertical size={18} strokeWidth={2.2} />
        </button>
        {isMenuOpen && (
          <div className="menu-popover" role="menu">
            <button type="button" role="menuitem" onClick={() => onEdit(storyObject)}>
              <Pencil size={16} strokeWidth={2.2} />
              {t.edit}
            </button>
            <button
              className="danger-menu-item"
              type="button"
              role="menuitem"
              onClick={() => onDelete(storyObject)}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              {t.delete}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
