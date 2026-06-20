import type { Dispatch, SetStateAction } from 'react'

import {
  loginRequest,
  logoutRequest,
  registerRequest,
  updateCurrentUserRequest,
  uploadImageRequest,
} from '../../api'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type {
  AuthUser,
  StoryObject,
  StoryProject,
} from '../../types'
import {
  validateAuthDraftIssues,
  validateProfileDraftIssues,
  validationIssuesToMap,
} from '../../validation'
import type { ValidationIssueMap } from '../../validation'

type AuthCommandMessages = {
  fieldValidationFailed: string
  loginFailed: string
  profileAvatarUploadFailed: string
  profileSaved: string
  profileSaveFailed: string
}

type UseStylePreviewAuthCommandsOptions = {
  authDisplayName: string
  authEmail: string
  authMode: 'login' | 'register'
  authPassword: string
  currentUser: AuthUser | null
  isProfileSaving: boolean
  loadProjects: () => Promise<void>
  messages: AuthCommandMessages
  navigateHome: () => void
  profileAvatarImagePath: string | null
  profileDisplayName: string
  profileEmail: string
  setCurrentUser: Dispatch<SetStateAction<AuthUser | null>>
  setAuthValidationErrors: Dispatch<SetStateAction<ValidationIssueMap>>
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsProfilePageOpen: Dispatch<SetStateAction<boolean>>
  setIsProfileSaving: Dispatch<SetStateAction<boolean>>
  setIsSettingsPageOpen: Dispatch<SetStateAction<boolean>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setProfileAvatarImagePath: Dispatch<SetStateAction<string | null>>
  setProfileValidationErrors: Dispatch<SetStateAction<ValidationIssueMap>>
  setProjects: Dispatch<SetStateAction<StoryProject[]>>
  setSelectedProjectId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
  showMessage: (message: string) => void
}

export function useStylePreviewAuthCommands({
  authDisplayName,
  authEmail,
  authMode,
  authPassword,
  currentUser,
  isProfileSaving,
  loadProjects,
  messages,
  navigateHome,
  profileAvatarImagePath,
  profileDisplayName,
  profileEmail,
  setAuthValidationErrors,
  setCurrentUser,
  setDialog,
  setIsProfilePageOpen,
  setIsProfileSaving,
  setIsSettingsPageOpen,
  setObjects,
  setProfileAvatarImagePath,
  setProfileValidationErrors,
  setProjects,
  setSelectedProjectId,
  showErrorMessage,
  showMessage,
}: UseStylePreviewAuthCommandsOptions) {
  const submitAuth = async () => {
    const validationIssues = validateAuthDraftIssues(
      authEmail,
      authPassword,
      authMode === 'register' ? authDisplayName : null,
    )
    if (validationIssues.length > 0) {
      setAuthValidationErrors(validationIssuesToMap(validationIssues))
      showErrorMessage(messages.fieldValidationFailed)
      return
    }

    try {
      const user =
        authMode === 'login'
          ? await loginRequest(authEmail, authPassword)
          : await registerRequest(authEmail, authPassword, authDisplayName)
      setCurrentUser(user)
      setAuthValidationErrors({})
      setDialog(null)
      await loadProjects()
    } catch {
      showErrorMessage(messages.loginFailed)
    }
  }

  const logout = async () => {
    await logoutRequest()
    setCurrentUser(null)
    setProjects([])
    setSelectedProjectId(null)
    setObjects([])
    setIsProfilePageOpen(true)
    setIsSettingsPageOpen(false)
    navigateHome()
  }

  const uploadProfileAvatar = async (file: File) => {
    try {
      const result = await uploadImageRequest(file)
      setProfileAvatarImagePath(result.path)
    } catch {
      showErrorMessage(messages.profileAvatarUploadFailed)
    }
  }

  const saveProfile = async () => {
    if (isProfileSaving || currentUser === null) {
      return
    }

    const validationIssues = validateProfileDraftIssues(profileEmail, profileDisplayName, profileAvatarImagePath)
    if (validationIssues.length > 0) {
      setProfileValidationErrors(validationIssuesToMap(validationIssues))
      showErrorMessage(messages.fieldValidationFailed)
      return
    }

    try {
      setIsProfileSaving(true)
      const updatedUser = await updateCurrentUserRequest(profileEmail, profileDisplayName, profileAvatarImagePath)
      setCurrentUser(updatedUser)
      setProfileValidationErrors({})
      showMessage(messages.profileSaved)
    } catch {
      showErrorMessage(messages.profileSaveFailed)
    } finally {
      setIsProfileSaving(false)
    }
  }

  return {
    logout,
    saveProfile,
    submitAuth,
    uploadProfileAvatar,
  }
}
