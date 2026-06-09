import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { resolveAssetUrl } from '../api'
import type { CatalogEntry } from '../types'

type CatalogEntryCardProps = {
  activeMenuId: number | null
  entry: CatalogEntry
  t: Record<string, string>
  onDelete: (entry: CatalogEntry) => void
  onEdit: (entry: CatalogEntry) => void
  onMenuToggle: (entryId: number) => void
  onOpen: (entry: CatalogEntry) => void
}

export function CatalogEntryCard({
  activeMenuId,
  entry,
  t,
  onDelete,
  onEdit,
  onMenuToggle,
  onOpen,
}: CatalogEntryCardProps) {
  const isMenuOpen = activeMenuId === entry.id
  const imageUrl = resolveAssetUrl(entry.imagePath)
  const initials = entry.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <article className="folder-entry">
      <button className="folder-entry-main" type="button" onClick={() => onOpen(entry)}>
        <span className="catalog-entry-badge" aria-hidden="true">
          {imageUrl === null ? initials : <img src={imageUrl} alt="" />}
        </span>
        <div className="entry-content">
          <h2>{entry.name}</h2>
          <p className="entry-role">{entry.entryGroupName ?? t.primaryAttributeGroup}</p>
          <p className="entry-note">{entry.description}</p>
        </div>
      </button>
      <div className="folder-action-menu action-menu">
        <button
          className="icon-menu-button"
          type="button"
          aria-label={`${entry.name}: ${t.delete}`}
          aria-expanded={isMenuOpen}
          onClick={() => onMenuToggle(entry.id)}
        >
          <MoreVertical size={18} strokeWidth={2.2} />
        </button>
        {isMenuOpen && (
          <div className="menu-popover" role="menu">
            <button type="button" role="menuitem" onClick={() => onEdit(entry)}>
              <Pencil size={16} strokeWidth={2.2} />
              {t.edit}
            </button>
            <button
              className="danger-menu-item"
              type="button"
              role="menuitem"
              onClick={() => onDelete(entry)}
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
