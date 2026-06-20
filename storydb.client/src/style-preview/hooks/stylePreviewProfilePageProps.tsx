import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import { CoverDropzone } from '../../components/ImageInputs'
import { ProfilePage } from '../../components/StylePreviewProfilePage'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type { PreviewText } from '../domain/stylePreviewI18n'
import type { AuthUser, StoryProject, TemplatePack, TemplatePackScope } from '../../types'

type ProfilePageProps = ComponentProps<typeof ProfilePage>

export function buildStylePreviewProfilePageProps({
  createTemplatePack,
  currentUser,
  deleteTemplatePack,
  displayName,
  email,
  isSaving,
  isTemplatePackSaving,
  navigateToPreview,
  openCreateProjectDialog,
  openEditProjectDialog,
  profileAvatarImagePath,
  profileValidationErrors,
  projects,
  saveProfile,
  selectedProjectId,
  setDialog,
  setIsProfilePageOpen,
  setIsSettingsPageOpen,
  setPendingDeleteProjectId,
  setProfileDisplayName,
  setProfileEmail,
  setTemplatePackDescription,
  setTemplatePackIsPublic,
  setTemplatePackName,
  setTemplatePackProjectId,
  setTemplatePackScope,
  templatePackDescription,
  templatePackIsPublic,
  templatePackName,
  templatePackProjectId,
  templatePackScope,
  templatePacks,
  toggleTemplatePackFavorite,
  toggleTemplatePackPublic,
  ui,
  uploadProfileAvatar,
}: {
  createTemplatePack: () => Promise<void>
  currentUser: AuthUser | null
  deleteTemplatePack: (templatePack: TemplatePack) => Promise<void>
  displayName: string
  email: string
  isSaving: boolean
  isTemplatePackSaving: boolean
  navigateToPreview: (
    projectId: number | null,
    tab: 'database',
    section: 'characters' | 'exports',
  ) => void
  openCreateProjectDialog: () => void
  openEditProjectDialog: (project: StoryProject) => void
  profileAvatarImagePath: string | null
  profileValidationErrors?: ProfilePageProps['validationErrors']
  projects: StoryProject[]
  saveProfile: () => Promise<void>
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsProfilePageOpen: Dispatch<SetStateAction<boolean>>
  setIsSettingsPageOpen: Dispatch<SetStateAction<boolean>>
  setPendingDeleteProjectId: Dispatch<SetStateAction<number | null>>
  setProfileDisplayName: Dispatch<SetStateAction<string>>
  setProfileEmail: Dispatch<SetStateAction<string>>
  setTemplatePackDescription: Dispatch<SetStateAction<string>>
  setTemplatePackIsPublic: Dispatch<SetStateAction<boolean>>
  setTemplatePackName: Dispatch<SetStateAction<string>>
  setTemplatePackProjectId: Dispatch<SetStateAction<number | null>>
  setTemplatePackScope: Dispatch<SetStateAction<TemplatePackScope>>
  templatePackDescription: string
  templatePackIsPublic: boolean
  templatePackName: string
  templatePackProjectId: number | null
  templatePackScope: TemplatePackScope
  templatePacks: TemplatePack[]
  toggleTemplatePackFavorite: (templatePack: TemplatePack, isFavorite: boolean) => Promise<void>
  toggleTemplatePackPublic: (templatePack: TemplatePack, isPublic: boolean) => Promise<void>
  ui: PreviewText
  uploadProfileAvatar: (file: File) => Promise<void>
}): ProfilePageProps {
  return {
    avatarDropzone: (
      <CoverDropzone
        className="avatar"
        imagePath={profileAvatarImagePath}
        label={ui.avatar}
        validationErrorId="profile-avatar-error"
        validationErrors={profileValidationErrors}
        validationField="avatarImagePath"
        ui={ui}
        onFileSelected={(file) => void uploadProfileAvatar(file)}
      />
    ),
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
    validationErrors: profileValidationErrors,
    ui,
    onCreateTemplatePack: () => void createTemplatePack(),
    onCreateProject: () => {
      openCreateProjectDialog()
      setDialog('project')
    },
    onDeleteProject: (project) => {
      setPendingDeleteProjectId(project.id)
      setDialog('confirmDeleteProject')
    },
    onDisplayNameChange: setProfileDisplayName,
    onEditProject: (project) => {
      openEditProjectDialog(project)
      setDialog('project')
    },
    onEmailChange: setProfileEmail,
    onExportProject: (project) => {
      setIsProfilePageOpen(false)
      setIsSettingsPageOpen(false)
      navigateToPreview(project.id, 'database', 'exports')
    },
    onDeleteTemplatePack: deleteTemplatePack,
    onTemplatePackDescriptionChange: setTemplatePackDescription,
    onTemplatePackFavoriteChange: (pack, isFavorite) =>
      void toggleTemplatePackFavorite(pack, isFavorite),
    onTemplatePackNameChange: setTemplatePackName,
    onTemplatePackProjectChange: setTemplatePackProjectId,
    onTemplatePackPublicChange: (pack, isPublic) =>
      void toggleTemplatePackPublic(pack, isPublic),
    onTemplatePackScopeChange: setTemplatePackScope,
    onTemplatePackVisibilityDraftChange: setTemplatePackIsPublic,
    onOpenProject: (project) => {
      setIsProfilePageOpen(false)
      navigateToPreview(project.id, 'database', 'characters')
    },
    onSave: () => void saveProfile(),
  }
}
