import type { Dispatch, SetStateAction } from 'react'

import {
  createProjectRequest,
  deleteProjectRequest,
  updateProjectRequest,
  uploadImageRequest,
} from '../../api'
import {
  getProjectObjectTypeKeys,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type {
  PreviewSection,
  PreviewTab,
} from '../domain/stylePreviewRouting'
import type { StoryProject } from '../../types'
import { validateProjectDraft } from '../../validation'

type ProjectCommandMessages = {
  coverUploadFailed: string
  projectDeleteFailed: string
  projectSaveFailed: string
}

type NavigateToPreview = (
  projectId: number | null,
  tab?: PreviewTab,
  section?: PreviewSection,
  objectId?: number | null,
  catalogId?: number | null,
  replace?: boolean,
) => void

type UseStylePreviewProjectCommandsOptions = {
  editingProjectId: number | null
  messages: ProjectCommandMessages
  navigateToPreview: NavigateToPreview
  pendingDeleteProjectId: number | null
  projectCoverImagePath: string | null
  projectName: string
  projectPresetKeys: string[]
  projects: StoryProject[]
  resetProjectForm: () => void
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setPendingDeleteProjectId: Dispatch<SetStateAction<number | null>>
  setProjectCoverImagePath: Dispatch<SetStateAction<string | null>>
  setProjects: Dispatch<SetStateAction<StoryProject[]>>
  setSelectedProjectId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
}

export function useStylePreviewProjectCommands({
  editingProjectId,
  messages,
  navigateToPreview,
  pendingDeleteProjectId,
  projectCoverImagePath,
  projectName,
  projectPresetKeys,
  projects,
  resetProjectForm,
  selectedProjectId,
  setDialog,
  setPendingDeleteProjectId,
  setProjectCoverImagePath,
  setProjects,
  setSelectedProjectId,
  showErrorMessage,
}: UseStylePreviewProjectCommandsOptions) {
  const uploadProjectCover = async (file: File) => {
    try {
      const result = await uploadImageRequest(file, editingProjectId)
      setProjectCoverImagePath(result.path)
    } catch {
      showErrorMessage(messages.coverUploadFailed)
    }
  }

  const saveProject = async () => {
    const validationMessage = validateProjectDraft(projectName.trim(), projectCoverImagePath)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectToEdit = editingProjectId === null ? null : projects.find((project) => project.id === editingProjectId) ?? null
    const enabledObjectTypeKeys = getProjectObjectTypeKeys(projectToEdit)

    try {
      const saved =
        projectToEdit === null
          ? await createProjectRequest(projectName.trim(), projectCoverImagePath, enabledObjectTypeKeys, projectPresetKeys)
          : await updateProjectRequest(projectToEdit, projectName.trim(), projectCoverImagePath, enabledObjectTypeKeys, projectPresetKeys)

      setProjects((currentProjects) =>
        projectToEdit === null
          ? [saved, ...currentProjects]
          : currentProjects.map((project) => (project.id === saved.id ? saved : project)),
      )
      setSelectedProjectId(saved.id)
      navigateToPreview(saved.id, 'database', 'characters')
      resetProjectForm()
      setDialog(null)
    } catch {
      showErrorMessage(messages.projectSaveFailed)
    }
  }

  const deletePendingProject = async () => {
    if (pendingDeleteProjectId === null) {
      return
    }

    try {
      await deleteProjectRequest(pendingDeleteProjectId)
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== pendingDeleteProjectId))

      if (selectedProjectId === pendingDeleteProjectId) {
        const nextProject = projects.find((project) => project.id !== pendingDeleteProjectId) ?? null
        setSelectedProjectId(nextProject?.id ?? null)
        navigateToPreview(nextProject?.id ?? null, 'database', 'characters')
      }

      setPendingDeleteProjectId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.projectDeleteFailed)
    }
  }

  return {
    deletePendingProject,
    saveProject,
    uploadProjectCover,
  }
}
