import type { ReactNode } from 'react'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { AuthUser, StoryProject } from '../types'
import { ProfileProjectCard } from './ProfileProjectCard'

export function ProfilePage({
  avatarDropzone,
  currentUser,
  displayName,
  email,
  isSaving,
  projects,
  selectedProjectId,
  ui,
  onCreateProject,
  onDeleteProject,
  onDisplayNameChange,
  onEditProject,
  onEmailChange,
  onOpenProject,
  onSave,
}: {
  avatarDropzone: ReactNode
  currentUser: AuthUser | null
  displayName: string
  email: string
  isSaving: boolean
  projects: StoryProject[]
  selectedProjectId: number | null
  ui: PreviewText
  onCreateProject: () => void
  onDeleteProject: (project: StoryProject) => void
  onDisplayNameChange: (value: string) => void
  onEditProject: (project: StoryProject) => void
  onEmailChange: (value: string) => void
  onOpenProject: (project: StoryProject) => void
  onSave: () => void
}) {
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
      </div>
    </section>
  )
}
