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
  validateAuthDraft,
  validateProfileDraft,
} from '../../validation'

type AuthCommandMessages = {
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
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsProfilePageOpen: Dispatch<SetStateAction<boolean>>
  setIsProfileSaving: Dispatch<SetStateAction<boolean>>
  setIsSettingsPageOpen: Dispatch<SetStateAction<boolean>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setProfileAvatarImagePath: Dispatch<SetStateAction<string | null>>
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
  setCurrentUser,
  setDialog,
  setIsProfilePageOpen,
  setIsProfileSaving,
  setIsSettingsPageOpen,
  setObjects,
  setProfileAvatarImagePath,
  setProjects,
  setSelectedProjectId,
  showErrorMessage,
  showMessage,
}: UseStylePreviewAuthCommandsOptions) {
  const submitAuth = async () => {
    const validationMessage = validateAuthDraft(
      authEmail,
      authPassword,
      authMode === 'register' ? authDisplayName : null,
    )
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const user =
        authMode === 'login'
          ? await loginRequest(authEmail, authPassword)
          : await registerRequest(authEmail, authPassword, authDisplayName)
      setCurrentUser(user)
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

    const validationMessage = validateProfileDraft(profileEmail, profileDisplayName, profileAvatarImagePath)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      setIsProfileSaving(true)
      const updatedUser = await updateCurrentUserRequest(profileEmail, profileDisplayName, profileAvatarImagePath)
      setCurrentUser(updatedUser)
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
