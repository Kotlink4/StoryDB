import type { Dispatch, SetStateAction } from 'react'

import {
  createAttributeDefinitionRequest,
  createAttributeGroupRequest,
  deleteAttributeDefinitionRequest,
  deleteAttributeGroupRequest,
  updateAttributeDefinitionRequest,
  updateAttributeGroupRequest,
} from '../../api'
import { emptyAttributeDefinitionDraft, type PreviewDialogKind } from '../domain/stylePreviewConfig'
import type { AttributeDefinition, AttributeDefinitionDraft, AttributeGroup } from '../../types'
import { validateAttributeDefinitionDraft, validateAttributeGroupDraft } from '../../validation'

type AttributeCommandMessages = {
  attributeCreateFailed: string
  attributeDeleteFailed: string
  attributeGroupCreateFailed: string
  attributeGroupDeleteFailed: string
}

type UseStylePreviewAttributeCommandsOptions = {
  attributeDefinitionDraft: AttributeDefinitionDraft
  attributeGroupIconKey: string
  attributeGroupName: string
  attributeGroups: AttributeGroup[]
  editingAttributeDefinitionId: number | null
  editingAttributeGroupId: number | null
  messages: AttributeCommandMessages
  pendingDeleteAttributeDefinitionId: number | null
  pendingDeleteAttributeGroupId: number | null
  selectedAttributeGroupId: number | null
  selectedProjectId: number | null
  setAttributeDefinitionDraft: Dispatch<SetStateAction<AttributeDefinitionDraft>>
  setAttributeDefinitions: Dispatch<SetStateAction<AttributeDefinition[]>>
  setAttributeGroupIconKey: Dispatch<SetStateAction<string>>
  setAttributeGroupName: Dispatch<SetStateAction<string>>
  setAttributeGroups: Dispatch<SetStateAction<AttributeGroup[]>>
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setEditingAttributeDefinitionId: Dispatch<SetStateAction<number | null>>
  setEditingAttributeGroupId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteAttributeDefinitionId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteAttributeGroupId: Dispatch<SetStateAction<number | null>>
  setSelectedAttributeGroupId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
}

export function useStylePreviewAttributeCommands({
  attributeDefinitionDraft,
  attributeGroupIconKey,
  attributeGroupName,
  attributeGroups,
  editingAttributeDefinitionId,
  editingAttributeGroupId,
  messages,
  pendingDeleteAttributeDefinitionId,
  pendingDeleteAttributeGroupId,
  selectedAttributeGroupId,
  selectedProjectId,
  setAttributeDefinitionDraft,
  setAttributeDefinitions,
  setAttributeGroupIconKey,
  setAttributeGroupName,
  setAttributeGroups,
  setDialog,
  setEditingAttributeDefinitionId,
  setEditingAttributeGroupId,
  setPendingDeleteAttributeDefinitionId,
  setPendingDeleteAttributeGroupId,
  setSelectedAttributeGroupId,
  showErrorMessage,
}: UseStylePreviewAttributeCommandsOptions) {
  const resetAttributeGroupDraft = () => {
    setAttributeGroupName('')
    setAttributeGroupIconKey('')
    setEditingAttributeGroupId(null)
  }

  const resetAttributeDefinitionDraft = () => {
    setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
    setEditingAttributeDefinitionId(null)
  }

  const saveAttributeGroup = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeGroupDraft(attributeGroupName, attributeGroupIconKey)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const previousGroupName =
        editingAttributeGroupId === null
          ? null
          : attributeGroups.find((group) => group.id === editingAttributeGroupId)?.name ?? null
      const saved =
        editingAttributeGroupId === null
          ? await createAttributeGroupRequest(selectedProjectId, 'characters', attributeGroupName, attributeGroupIconKey)
          : await updateAttributeGroupRequest(
              selectedProjectId,
              'characters',
              editingAttributeGroupId,
              attributeGroupName,
              attributeGroupIconKey,
            )

      setAttributeGroups((currentGroups) =>
        editingAttributeGroupId === null
          ? [...currentGroups, saved]
          : currentGroups.map((group) => (group.id === saved.id ? saved : group)),
      )
      if (previousGroupName !== null) {
        setAttributeDefinitions((currentDefinitions) =>
          currentDefinitions.map((definition) =>
            definition.groupName === previousGroupName ? { ...definition, groupName: saved.name } : definition,
          ),
        )
      }
      setSelectedAttributeGroupId(saved.id)
      resetAttributeGroupDraft()
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeGroupCreateFailed)
    }
  }

  const saveAttributeDefinition = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeDefinitionDraft(attributeDefinitionDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const selectedGroup = attributeGroups.find((group) => group.id === selectedAttributeGroupId)
    const groupName = selectedGroup?.name ?? attributeDefinitionDraft.groupName

    try {
      const draftForSave = {
        ...attributeDefinitionDraft,
        groupName,
      }
      const saved =
        editingAttributeDefinitionId === null
          ? await createAttributeDefinitionRequest(selectedProjectId, 'characters', draftForSave)
          : await updateAttributeDefinitionRequest(
              selectedProjectId,
              'characters',
              editingAttributeDefinitionId,
              draftForSave,
            )

      setAttributeDefinitions((currentDefinitions) =>
        editingAttributeDefinitionId === null
          ? [...currentDefinitions, saved]
          : currentDefinitions.map((definition) => (definition.id === saved.id ? saved : definition)),
      )
      resetAttributeDefinitionDraft()
    } catch {
      showErrorMessage(messages.attributeCreateFailed)
    }
  }

  const openEditAttributeGroup = (group: AttributeGroup) => {
    setEditingAttributeGroupId(group.id)
    setAttributeGroupName(group.name)
    setAttributeGroupIconKey(group.iconKey ?? '')
    setDialog('attributeGroup')
  }

  const openEditAttributeDefinition = (definition: AttributeDefinition) => {
    setEditingAttributeDefinitionId(definition.id)
    setSelectedAttributeGroupId(
      attributeGroups.find((group) => group.name === definition.groupName)?.id ?? null,
    )
    setAttributeDefinitionDraft({
      name: definition.name,
      dataType: definition.dataType,
      groupName: definition.groupName ?? '',
      iconKey: definition.iconKey ?? '',
      minValue: definition.minValue === null ? '' : String(definition.minValue),
      maxValue: definition.maxValue === null ? '' : String(definition.maxValue),
      unit: definition.unit ?? '',
      optionsText: definition.options.join(', '),
    })
  }

  const deletePendingAttributeGroup = async () => {
    if (selectedProjectId === null || pendingDeleteAttributeGroupId === null) {
      return
    }

    const group = attributeGroups.find((item) => item.id === pendingDeleteAttributeGroupId)
    try {
      await deleteAttributeGroupRequest(selectedProjectId, pendingDeleteAttributeGroupId)
      setAttributeGroups((currentGroups) => currentGroups.filter((item) => item.id !== pendingDeleteAttributeGroupId))
      if (group !== undefined) {
        setAttributeDefinitions((currentDefinitions) =>
          currentDefinitions.filter((definition) => definition.groupName !== group.name),
        )
      }
      setSelectedAttributeGroupId((currentId) => (currentId === pendingDeleteAttributeGroupId ? null : currentId))
      setPendingDeleteAttributeGroupId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeGroupDeleteFailed)
    }
  }

  const deletePendingAttributeDefinition = async () => {
    if (selectedProjectId === null || pendingDeleteAttributeDefinitionId === null) {
      return
    }

    try {
      await deleteAttributeDefinitionRequest(selectedProjectId, pendingDeleteAttributeDefinitionId)
      setAttributeDefinitions((currentDefinitions) =>
        currentDefinitions.filter((definition) => definition.id !== pendingDeleteAttributeDefinitionId),
      )
      setPendingDeleteAttributeDefinitionId(null)
      setDialog(null)
    } catch {
      showErrorMessage(messages.attributeDeleteFailed)
    }
  }

  return {
    deletePendingAttributeDefinition,
    deletePendingAttributeGroup,
    openEditAttributeDefinition,
    openEditAttributeGroup,
    resetAttributeDefinitionDraft,
    resetAttributeGroupDraft,
    saveAttributeDefinition,
    saveAttributeGroup,
  }
}
