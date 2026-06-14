import { resolveAssetUrl } from '../api'
import { getInitials } from '../style-preview/domain/previewDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { StoryProject } from '../types'
import { KebabMenu } from './StylePreviewPrimitives'

export function ProfileProjectCard({
  isSelected,
  project,
  ui,
  onDelete,
  onEdit,
  onOpen,
}: {
  isSelected: boolean
  project: StoryProject
  ui: PreviewText
  onDelete: () => void
  onEdit: () => void
  onOpen: () => void
}) {
  const coverUrl = resolveAssetUrl(project.coverImagePath)

  return (
    <article className={`sp-profile-project-card ${isSelected ? 'selected' : ''}`}>
      <button className="sp-profile-project-main" type="button" onClick={onOpen}>
        <div className="sp-profile-project-cover">
          {coverUrl === null ? getInitials(project.name) : <img alt="" src={coverUrl} />}
        </div>
        <div>
          <strong>{project.name}</strong>
          <span>
            {project.objectCount} {ui.objectsCount}
          </span>
        </div>
        <em>{ui.selectProject}</em>
      </button>
      <KebabMenu ui={ui} onDelete={onDelete} onEdit={onEdit} />
    </article>
  )
}
