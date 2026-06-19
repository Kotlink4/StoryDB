import type { AuthUser } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchCurrentUser = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/me`)
  if (response.status === 401) {
    return null
  }
  await ensureOk(response, 'Failed to load current user.')

  return (await response.json()) as AuthUser
}

export const registerRequest = async (email: string, password: string, displayName: string) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: displayName.trim() || null,
    }),
  })
  await ensureOk(response, 'Failed to register.')

  return (await response.json()) as AuthUser
}

export const loginRequest = async (email: string, password: string) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  await ensureOk(response, 'Failed to sign in.')

  return (await response.json()) as AuthUser
}

export const logoutRequest = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to sign out.')
}

export const updateCurrentUserRequest = async (
  email: string,
  displayName: string,
  avatarImagePath: string | null,
) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      displayName: displayName.trim(),
      avatarImagePath,
    }),
  })
  await ensureOk(response, 'Failed to update profile.')

  return (await response.json()) as AuthUser
}
