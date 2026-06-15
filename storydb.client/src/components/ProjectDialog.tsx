import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { StoryProject, TemplatePack } from '../types'
import { CoverDropzone } from './ImageInputs'
import { ReadySolutionsPanel } from './ReadySolutionsPanel'
import { PreviewDialog } from './StylePreviewPrimitives'

export type ProjectDialogTab = 'details' | 'presets'

export function ProjectDialog({
  editingProjectId,
  favoriteTemplatePacks,
  projectCoverImagePath,
  projectDialogTab,
  projectName,
  projectPresetKeys,
  projectTemplatePackIds,
  projectVisibility,
  ui,
  onCancel,
  onCoverFileSelected,
  onProjectDialogTabChange,
  onProjectNameChange,
  onProjectPresetKeysChange,
  onProjectTemplatePackIdsChange,
  onProjectVisibilityChange,
  onSave,
}: {
  editingProjectId: number | null
  favoriteTemplatePacks: TemplatePack[]
  projectCoverImagePath: string | null
  projectDialogTab: ProjectDialogTab
  projectName: string
  projectPresetKeys: string[]
  projectTemplatePackIds: number[]
  projectVisibility: StoryProject['visibility']
  ui: PreviewText
  onCancel: () => void
  onCoverFileSelected: (file: File) => void
  onProjectDialogTabChange: (tab: ProjectDialogTab) => void
  onProjectNameChange: (value: string) => void
  onProjectPresetKeysChange: (selectedKeys: string[]) => void
  onProjectTemplatePackIdsChange: (selectedIds: number[]) => void
  onProjectVisibilityChange: (visibility: StoryProject['visibility']) => void
  onSave: () => void
}) {
  const toggleTemplatePack = (templatePackId: number) => {
    onProjectTemplatePackIdsChange(
      projectTemplatePackIds.includes(templatePackId)
        ? projectTemplatePackIds.filter((id) => id !== templatePackId)
        : [...projectTemplatePackIds, templatePackId],
    )
  }

  return (
    <PreviewDialog title={editingProjectId === null ? ui.newProject : ui.edit} onClose={onCancel}>
      <div className="sp-catalog-editor">
        <div className="sp-object-editor-tabs">
          <button
            className={projectDialogTab === 'details' ? 'active' : ''}
            type="button"
            onClick={() => onProjectDialogTabChange('details')}
          >
            {ui.projectDetails}
          </button>
          <button
            className={projectDialogTab === 'presets' ? 'active' : ''}
            type="button"
            onClick={() => onProjectDialogTabChange('presets')}
          >
            {ui.readySolutions}
          </button>
        </div>

        {projectDialogTab === 'details' && (
          <div className="sp-form">
            <label className="wide">
              {ui.projectName}
              <input
                value={projectName}
                placeholder={ui.projectNamePlaceholder}
                onChange={(event) => onProjectNameChange(event.target.value)}
              />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={projectCoverImagePath}
              label={ui.image}
              ui={ui}
              onFileSelected={onCoverFileSelected}
            />
            <label className="wide">
              {ui.projectVisibility}
              <select
                value={projectVisibility}
                onChange={(event) => onProjectVisibilityChange(event.target.value as StoryProject['visibility'])}
              >
                <option value="private">{ui.projectPrivate}</option>
                <option value="publicRead">{ui.projectPublicRead}</option>
                <option value="publicEdit">{ui.projectPublicEdit}</option>
              </select>
            </label>
          </div>
        )}

        {projectDialogTab === 'presets' && (
          <div className="ready-solutions-stack">
            <ReadySolutionsPanel selectedKeys={projectPresetKeys} t={ui} onChange={onProjectPresetKeysChange} />
            <section className="ready-solutions-panel">
              <div className="ready-solutions-intro">
                <strong>{ui.favoriteTemplatePacks}</strong>
                <p>{ui.favoriteTemplatePacksHint}</p>
              </div>
              <div className="ready-solutions-grid">
                {favoriteTemplatePacks.map((pack) => (
                  <button
                    className={`ready-solution-card ${projectTemplatePackIds.includes(pack.id) ? 'is-selected' : ''}`}
                    key={pack.id}
                    type="button"
                    onClick={() => toggleTemplatePack(pack.id)}
                  >
                    <span className="ready-solution-check">
                      {projectTemplatePackIds.includes(pack.id) ? '✓' : '+'}
                    </span>
                    <span className="ready-solution-content">
                      <small>{pack.isPublic ? ui.publicTemplatePack : ui.privateTemplatePack}</small>
                      <strong>{pack.name}</strong>
                      <span>
                        {pack.summary.attributeCount} {ui.attributes} · {pack.summary.catalogCount} {ui.catalogs} ·{' '}
                        {pack.summary.structureCount} {ui.structures}
                      </span>
                    </span>
                  </button>
                ))}
                {favoriteTemplatePacks.length === 0 && (
                  <div className="sp-empty">
                    <strong>{ui.noFavoriteTemplatePacks}</strong>
                    <span>{ui.noFavoriteTemplatePacksHint}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {editingProjectId === null ? ui.create : ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
