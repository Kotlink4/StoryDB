import { useState } from 'react'

import type { ProjectDialogTab } from '../../components/ProjectDialog'
import type { StoryProject } from '../../types'

export function useStylePreviewProjectDialog() {
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<number | null>(null)
  const [projectDialogTab, setProjectDialogTab] = useState<ProjectDialogTab>('details')
  const [projectName, setProjectName] = useState('')
  const [projectCoverImagePath, setProjectCoverImagePath] = useState<string | null>(null)
  const [projectPresetKeys, setProjectPresetKeys] = useState<string[]>([])
  const [projectTemplatePackIds, setProjectTemplatePackIds] = useState<number[]>([])
  const [projectVisibility, setProjectVisibility] = useState<StoryProject['visibility']>('private')

  const resetProjectForm = () => {
    setEditingProjectId(null)
    setProjectName('')
    setProjectCoverImagePath(null)
    setProjectPresetKeys([])
    setProjectTemplatePackIds([])
    setProjectVisibility('private')
    setProjectDialogTab('details')
  }

  const openCreateProjectDialog = () => {
    resetProjectForm()
  }

  const openEditProjectDialog = (project: StoryProject) => {
    setEditingProjectId(project.id)
    setProjectName(project.name)
    setProjectCoverImagePath(project.coverImagePath)
    setProjectPresetKeys([])
    setProjectTemplatePackIds([])
    setProjectVisibility(project.visibility)
    setProjectDialogTab('details')
  }

  return {
    editingProjectId,
    openCreateProjectDialog,
    openEditProjectDialog,
    pendingDeleteProjectId,
    projectCoverImagePath,
    projectDialogTab,
    projectName,
    projectPresetKeys,
    projectTemplatePackIds,
    projectVisibility,
    resetProjectForm,
    setEditingProjectId,
    setPendingDeleteProjectId,
    setProjectCoverImagePath,
    setProjectDialogTab,
    setProjectName,
    setProjectPresetKeys,
    setProjectTemplatePackIds,
    setProjectVisibility,
  }
}
