import { useState, type ReactNode } from 'react'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { AuthUser, StoryProject, TemplatePack, TemplatePackScope } from '../types'
import { ProfileProjectCard } from './ProfileProjectCard'

export function ProfilePage({
  avatarDropzone,
  currentUser,
  displayName,
  email,
  isSaving,
  isTemplatePackSaving,
  projects,
  selectedProjectId,
  templatePackDescription,
  templatePackIsPublic,
  templatePackName,
  templatePackProjectId,
  templatePackScope,
  templatePacks,
  ui,
  onCreateProject,
  onCreateTemplatePack,
  onDeleteProject,
  onDeleteTemplatePack,
  onDisplayNameChange,
  onEditProject,
  onExportProject,
  onEmailChange,
  onOpenProject,
  onSave,
  onTemplatePackDescriptionChange,
  onTemplatePackFavoriteChange,
  onTemplatePackNameChange,
  onTemplatePackProjectChange,
  onTemplatePackPublicChange,
  onTemplatePackScopeChange,
  onTemplatePackVisibilityDraftChange,
}: {
  avatarDropzone: ReactNode
  currentUser: AuthUser | null
  displayName: string
  email: string
  isSaving: boolean
  isTemplatePackSaving: boolean
  projects: StoryProject[]
  selectedProjectId: number | null
  templatePackDescription: string
  templatePackIsPublic: boolean
  templatePackName: string
  templatePackProjectId: number | null
  templatePackScope: TemplatePackScope
  templatePacks: TemplatePack[]
  ui: PreviewText
  onCreateProject: () => void
  onCreateTemplatePack: () => void
  onDeleteProject: (project: StoryProject) => void
  onDeleteTemplatePack: (templatePack: TemplatePack) => void
  onDisplayNameChange: (value: string) => void
  onEditProject: (project: StoryProject) => void
  onExportProject: (project: StoryProject) => void
  onEmailChange: (value: string) => void
  onOpenProject: (project: StoryProject) => void
  onSave: () => void
  onTemplatePackDescriptionChange: (value: string) => void
  onTemplatePackFavoriteChange: (templatePack: TemplatePack, isFavorite: boolean) => void
  onTemplatePackNameChange: (value: string) => void
  onTemplatePackProjectChange: (projectId: number | null) => void
  onTemplatePackPublicChange: (templatePack: TemplatePack, isPublic: boolean) => void
  onTemplatePackScopeChange: (scope: TemplatePackScope) => void
  onTemplatePackVisibilityDraftChange: (isPublic: boolean) => void
}) {
  const [activeProfileTab, setActiveProfileTab] = useState<'projects' | 'templatePacks'>('projects')

  if (currentUser === null) {
    return (
      <section className="sp-profile-page">
        <div className="sp-empty">
          <strong>{ui.profile}</strong>
          <span>{ui.profileSignIn}</span>
        </div>
      </section>
    )
  }

  return (
    <section className="sp-profile-page">
      <div className="sp-content-head">
        <div>
          <h2>{ui.profile}</h2>
          <p>{currentUser.email}</p>
        </div>
      </div>

      <div className="sp-profile-tabs">
        <button
          className={activeProfileTab === 'projects' ? 'active' : ''}
          type="button"
          onClick={() => setActiveProfileTab('projects')}
        >
          {ui.projects}
        </button>
        <button
          className={activeProfileTab === 'templatePacks' ? 'active' : ''}
          type="button"
          onClick={() => setActiveProfileTab('templatePacks')}
        >
          {ui.templatePacks}
        </button>
      </div>

      <div className="sp-profile-grid">
        <article className="sp-profile-card">
          <div className="sp-profile-card-head">
            {avatarDropzone}
            <div>
              <span>{ui.profileData}</span>
              <h3>{displayName || currentUser.displayName}</h3>
              <p>{email || currentUser.email}</p>
            </div>
          </div>
          <div className="sp-form sp-profile-form">
            <label>
              {ui.displayName}
              <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
            </label>
            <label>
              {ui.email}
              <input value={email} onChange={(event) => onEmailChange(event.target.value)} />
            </label>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button primary" disabled={isSaving} type="button" onClick={onSave}>
              {isSaving ? ui.loading : ui.save}
            </button>
          </div>
        </article>

        {activeProfileTab === 'projects' && (
          <article className="sp-profile-card sp-profile-projects">
          <div className="sp-content-head compact">
            <div>
              <h3>{ui.profileProjects}</h3>
              <p>
                {projects.length} {ui.projects}
              </p>
            </div>
            <button className="sp-button primary" type="button" onClick={onCreateProject}>
              + {ui.newProject}
            </button>
          </div>
          <div className="sp-profile-project-grid">
            {projects.map((project) => (
              <ProfileProjectCard
                isSelected={project.id === selectedProjectId}
                key={project.id}
                project={project}
                ui={ui}
                onDelete={() => onDeleteProject(project)}
                onEdit={() => onEditProject(project)}
                onExport={() => onExportProject(project)}
                onOpen={() => onOpenProject(project)}
              />
            ))}
            {projects.length === 0 && (
              <div className="sp-empty">
                <strong>{ui.projectNotSelected}</strong>
                <span>{ui.projectSearch}</span>
              </div>
            )}
          </div>
          </article>
        )}

        {activeProfileTab === 'templatePacks' && (
          <article className="sp-profile-card sp-profile-template-packs">
        <div className="sp-content-head compact">
          <div>
            <h3>{ui.templatePacks}</h3>
            <p>{ui.templatePacksHint}</p>
          </div>
        </div>

        <div className="sp-form sp-template-pack-create">
          <label>
            {ui.project}
            <select
              value={templatePackProjectId ?? ''}
              onChange={(event) =>
                onTemplatePackProjectChange(event.target.value === '' ? null : Number(event.target.value))
              }
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ui.name}
            <input
              value={templatePackName}
              placeholder={ui.templatePackNamePlaceholder}
              onChange={(event) => onTemplatePackNameChange(event.target.value)}
            />
          </label>
          <label className="wide">
            {ui.description}
            <textarea
              value={templatePackDescription}
              placeholder={ui.templatePackDescriptionPlaceholder}
              onChange={(event) => onTemplatePackDescriptionChange(event.target.value)}
            />
          </label>
          <label className="sp-check-row wide">
            <input
              checked={templatePackIsPublic}
              type="checkbox"
              onChange={(event) => onTemplatePackVisibilityDraftChange(event.target.checked)}
            />
            {ui.makeTemplatePackPublic}
          </label>
          <div className="sp-dialog-actions wide">
            <button
              className="sp-button primary"
              disabled={isTemplatePackSaving || templatePackProjectId === null || templatePackName.trim().length === 0}
              type="button"
              onClick={onCreateTemplatePack}
            >
              {isTemplatePackSaving ? ui.saving : ui.createTemplatePack}
            </button>
          </div>
        </div>

        <div className="sp-profile-pack-toolbar">
          {(['mine', 'public', 'favorites'] as const).map((scope) => (
            <button
              className={templatePackScope === scope ? 'active' : ''}
              key={scope}
              type="button"
              onClick={() => onTemplatePackScopeChange(scope)}
            >
              {scope === 'mine' ? ui.myTemplatePacks : scope === 'public' ? ui.publicTemplatePacks : ui.favorites}
            </button>
          ))}
        </div>

        <div className="sp-profile-pack-grid">
          {templatePacks.map((pack) => {
            const isOwner = currentUser.id === pack.ownerUserId
            return (
              <article className="sp-profile-pack-card" key={pack.id}>
                <div>
                  <span>{pack.isPublic ? ui.publicTemplatePack : ui.privateTemplatePack}</span>
                  <strong>{pack.name}</strong>
                  <p>{pack.description ?? ui.noDescription}</p>
                </div>
                <dl>
                  <div>
                    <dt>{ui.attributes}</dt>
                    <dd>{pack.summary.attributeCount}</dd>
                  </div>
                  <div>
                    <dt>{ui.catalogs}</dt>
                    <dd>{pack.summary.catalogCount}</dd>
                  </div>
                  <div>
                    <dt>{ui.structures}</dt>
                    <dd>{pack.summary.structureCount}</dd>
                  </div>
                </dl>
                <div className="sp-profile-pack-actions">
                  {isOwner && (
                    <label className="sp-check-row">
                      <input
                        checked={pack.isPublic}
                        type="checkbox"
                        onChange={(event) => onTemplatePackPublicChange(pack, event.target.checked)}
                      />
                      {ui.publicTemplatePack}
                    </label>
                  )}
                  <button
                    className="sp-button"
                    type="button"
                    onClick={() => onTemplatePackFavoriteChange(pack, !pack.isFavorite)}
                  >
                    {pack.isFavorite ? ui.removeFavorite : ui.addFavorite}
                  </button>
                  {isOwner && (
                    <button className="sp-button danger" type="button" onClick={() => onDeleteTemplatePack(pack)}>
                      {ui.delete}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
          {templatePacks.length === 0 && (
            <div className="sp-empty">
              <strong>{ui.noTemplatePacks}</strong>
              <span>{ui.noTemplatePacksHint}</span>
            </div>
          )}
        </div>
          </article>
        )}
      </div>
    </section>
  )
}
