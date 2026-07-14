import type { ObjectReference, StoryObject } from '../../types'
import { getObjectFullName, getOrganizationSurname } from './objectDisplay'

const normalizeNamePart = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() ?? ''

export const getOrganizationMemberSurname = (organization: StoryObject) =>
  getOrganizationSurname(organization)

export const getAutomaticOrganizationMembersBySurname = (surnameValue: string, characters: StoryObject[]) => {
  const surname = normalizeNamePart(surnameValue)

  if (surname.length === 0) {
    return []
  }

  return characters
    .filter((character) => normalizeNamePart(character.surname) === surname)
    .sort((left, right) => getObjectFullName(left).localeCompare(getObjectFullName(right)))
}

export const getAutomaticOrganizationMembers = (organization: StoryObject, characters: StoryObject[]) =>
  organization.typeKey === 'organizations'
    ? getAutomaticOrganizationMembersBySurname(getOrganizationMemberSurname(organization), characters)
    : []

export const getAutomaticCharacterOrganizations = (character: StoryObject, organizations: StoryObject[]) => {
  const surname = normalizeNamePart(character.surname)

  if (character.typeKey !== 'characters' || surname.length === 0) {
    return []
  }

  return organizations
    .filter((organization) => normalizeNamePart(getOrganizationMemberSurname(organization)) === surname)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export const getOrganizationMemberItems = (members: StoryObject[]) => {
  const itemsById = new Map<number, ObjectReference & { ownerName: string }>()

  members.forEach((member) => {
    const ownerName = getObjectFullName(member)

    member.ownedItems.forEach((item) => {
      if (!itemsById.has(item.id)) {
        itemsById.set(item.id, { ...item, ownerName })
      }
    })
  })

  return Array.from(itemsById.values()).sort((left, right) => left.name.localeCompare(right.name))
}

export const getOrganizationDisplaySurname = (organization: StoryObject) => getOrganizationSurname(organization)
