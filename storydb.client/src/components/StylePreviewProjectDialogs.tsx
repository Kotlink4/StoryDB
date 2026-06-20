import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { AuthUser, StoryProject, TemplatePack } from '../types'
import type { ValidationIssueMap } from '../validation'
import { AuthDialog } from './AuthDialog'
import { DeletePreviewDialog } from './DeletePreviewDialog'
import { ProfileSummaryDialog } from './ProfileSummaryDialog'
import { ProjectDialog, type ProjectDialogTab } from './ProjectDialog'

export function StylePreviewProjectDialogs({
  authDisplayName,
  authEmail,
  authMode,
  authPassword,
  authValidationErrors,
  currentUser,
  dialog,
  editingProjectId,
  pendingDeleteProjectId,
  favoriteTemplatePacks,
  projectCoverImagePath,
  projectDialogTab,
  projectName,
  projectPresetKeys,
  projectTemplatePackIds,
  projectVisibility,
  validationErrors,
  projects,
  ui,
  onAuthDisplayNameChange,
  onAuthEmailChange,
  onAuthModeChange,
  onAuthPasswordChange,
  onClose,
  onDeleteProject,
  onLogout,
  onProjectCoverFileSelected,
  onProjectDialogTabChange,
  onProjectNameChange,
  onProjectPresetKeysChange,
  onProjectTemplatePackIdsChange,
  onProjectVisibilityChange,
  onSaveProject,
  onSubmitAuth,
}: {
  authDisplayName: string
  authEmail: string
  authMode: 'login' | 'register'
  authPassword: string
  authValidationErrors?: ValidationIssueMap
  currentUser: AuthUser | null
  dialog: PreviewDialogKind
  editingProjectId: number | null
  pendingDeleteProjectId: number | null
  favoriteTemplatePacks: TemplatePack[]
  projectCoverImagePath: string | null
  projectDialogTab: ProjectDialogTab
  projectName: string
  projectPresetKeys: string[]
  projectTemplatePackIds: number[]
  projectVisibility: StoryProject['visibility']
  validationErrors?: ValidationIssueMap
  projects: StoryProject[]
  ui: PreviewText
  onAuthDisplayNameChange: (displayName: string) => void
  onAuthEmailChange: (email: string) => void
  onAuthModeChange: (mode: 'login' | 'register') => void
  onAuthPasswordChange: (password: string) => void
  onClose: () => void
  onDeleteProject: () => void
  onLogout: () => void
  onProjectCoverFileSelected: (file: File) => void
  onProjectDialogTabChange: (tab: ProjectDialogTab) => void
  onProjectNameChange: (name: string) => void
  onProjectPresetKeysChange: (presetKeys: string[]) => void
  onProjectTemplatePackIdsChange: (templatePackIds: number[]) => void
  onProjectVisibilityChange: (visibility: StoryProject['visibility']) => void
  onSaveProject: () => void
  onSubmitAuth: () => void
}) {
  return (
    <>
      {dialog === 'auth' && (
        <AuthDialog
          displayName={authDisplayName}
          email={authEmail}
          mode={authMode}
          password={authPassword}
          validationErrors={authValidationErrors}
          ui={ui}
          onCancel={onClose}
          onDisplayNameChange={onAuthDisplayNameChange}
          onEmailChange={onAuthEmailChange}
          onModeChange={onAuthModeChange}
          onPasswordChange={onAuthPasswordChange}
          onSubmit={onSubmitAuth}
        />
      )}

      {dialog === 'profile' && (
        <ProfileSummaryDialog
          currentUser={currentUser}
          ui={ui}
          onCancel={onClose}
          onLogout={onLogout}
        />
      )}

      {dialog === 'project' && (
        <ProjectDialog
          editingProjectId={editingProjectId}
          favoriteTemplatePacks={favoriteTemplatePacks}
          projectCoverImagePath={projectCoverImagePath}
          projectDialogTab={projectDialogTab}
          projectName={projectName}
          projectPresetKeys={projectPresetKeys}
          projectTemplatePackIds={projectTemplatePackIds}
          projectVisibility={projectVisibility}
          validationErrors={validationErrors}
          ui={ui}
          onCancel={onClose}
          onCoverFileSelected={onProjectCoverFileSelected}
          onProjectDialogTabChange={onProjectDialogTabChange}
          onProjectNameChange={onProjectNameChange}
          onProjectPresetKeysChange={onProjectPresetKeysChange}
          onProjectTemplatePackIdsChange={onProjectTemplatePackIdsChange}
          onProjectVisibilityChange={onProjectVisibilityChange}
          onSave={onSaveProject}
        />
      )}

      {dialog === 'confirmDeleteProject' && pendingDeleteProjectId !== null && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={projects.find((project) => project.id === pendingDeleteProjectId)?.name ?? ui.project}
          hint={ui.projectDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeleteProject}
        />
      )}
    </>
  )
}
