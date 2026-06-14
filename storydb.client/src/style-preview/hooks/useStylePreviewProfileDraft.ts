import { useEffect, useState } from 'react'

import type { AuthUser } from '../../types'

export function useStylePreviewProfileDraft(currentUser: AuthUser | null) {
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarImagePath, setProfileAvatarImagePath] = useState<string | null>(null)
  const [profileProjectQuery, setProfileProjectQuery] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)

  useEffect(() => {
    setProfileDisplayName(currentUser?.displayName ?? '')
    setProfileEmail(currentUser?.email ?? '')
    setProfileAvatarImagePath(currentUser?.avatarImagePath ?? null)
  }, [currentUser])

  return {
    isProfileSaving,
    profileAvatarImagePath,
    profileDisplayName,
    profileEmail,
    profileProjectQuery,
    setIsProfileSaving,
    setProfileAvatarImagePath,
    setProfileDisplayName,
    setProfileEmail,
    setProfileProjectQuery,
  }
}
