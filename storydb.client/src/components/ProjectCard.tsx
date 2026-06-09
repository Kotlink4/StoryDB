import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { resolveAssetUrl } from '../api'
import type { StoryProject } from '../types'

type ProjectCardProps = {
  activeMenuId: number | null
  project: StoryProject
  t: Record<string, string>
  onDelete: (project: StoryProject) => void
  onEdit: (project: StoryProject) => void
  onMenuToggle: (projectId: number) => void
  onOpen: (project: StoryProject) => void
  statusText: (value: 'Active') => string
}

export function ProjectCard({
  activeMenuId,
  project,
  t,
  onDelete,
  onEdit,
  onMenuToggle,
  onOpen,
  statusText,
}: ProjectCardProps) {
  const isMenuOpen = activeMenuId === project.id
  const coverImageUrl = resolveAssetUrl(project.coverImagePath)

  return (
    <article className="project-card ember">
      <div className="card-topline">
        <span className="case-label">
          {t.caseLabel} {String(project.id).padStart(3, '0')}
        </span>
        <div className="card-actions">
          <span className="status-pill active">{statusText('Active')}</span>
          <div className="action-menu">
            <button
              className="icon-menu-button"
              type="button"
              aria-label={`${project.name}: ${t.edit}/${t.delete}`}
              aria-expanded={isMenuOpen}
              onClick={() => onMenuToggle(project.id)}
            >
              <MoreVertical size={18} strokeWidth={2.2} />
            </button>
            {isMenuOpen && (
              <div className="menu-popover" role="menu">
                <button type="button" role="menuitem" onClick={() => onEdit(project)}>
                  <Pencil size={16} strokeWidth={2.2} />
                  {t.edit}
                </button>
                <button
                  className="danger-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                  {t.delete}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="folder-tab" aria-hidden="true" />

      {coverImageUrl !== null && (
        <img className="project-cover-preview" src={coverImageUrl} alt="" />
      )}

      <h2>{project.name}</h2>
      <p className="genre">Worldbuilding</p>
      <p className="summary">A saved StoryDB project from the local SQLite database.</p>

      <dl className="project-stats">
        <div>
          <dt>{t.cards}</dt>
          <dd>{project.objectCount}</dd>
        </div>
        <div>
          <dt>{t.links}</dt>
          <dd>0</dd>
        </div>
        <div>
          <dt>{t.updated}</dt>
          <dd>{new Date(project.updatedAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      <button className="open-button" type="button" onClick={() => onOpen(project)}>
        {t.openDossier}
      </button>
    </article>
  )
}
