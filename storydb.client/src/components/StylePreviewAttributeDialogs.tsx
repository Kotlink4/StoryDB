import type { PreviewLanguage, PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { AttributeDefinition, AttributeGroup } from '../types'
import { AttributeGroupDialog } from './AttributeGroupDialog'
import { DeletePreviewDialog } from './DeletePreviewDialog'

export function StylePreviewAttributeDialogs({
  attributeDefinitions,
  attributeGroupIconKey,
  attributeGroupName,
  attributeGroups,
  dialog,
  editingAttributeGroupId,
  language,
  pendingDeleteAttributeDefinitionId,
  pendingDeleteAttributeGroupId,
  ui,
  onAttributeGroupIconChange,
  onAttributeGroupNameChange,
  onClose,
  onDeleteAttribute,
  onDeleteAttributeGroup,
  onSaveAttributeGroup,
}: {
  attributeDefinitions: AttributeDefinition[]
  attributeGroupIconKey: string
  attributeGroupName: string
  attributeGroups: AttributeGroup[]
  dialog: PreviewDialogKind
  editingAttributeGroupId: number | null
  language: PreviewLanguage
  pendingDeleteAttributeDefinitionId: number | null
  pendingDeleteAttributeGroupId: number | null
  ui: PreviewText
  onAttributeGroupIconChange: (iconKey: string) => void
  onAttributeGroupNameChange: (name: string) => void
  onClose: () => void
  onDeleteAttribute: () => void
  onDeleteAttributeGroup: () => void
  onSaveAttributeGroup: () => void
}) {
  return (
    <>
      {dialog === 'attributeGroup' && (
        <AttributeGroupDialog
          title={editingAttributeGroupId === null ? ui.newGroup : ui.edit}
          groupName={attributeGroupName}
          iconKey={attributeGroupIconKey}
          language={language}
          ui={ui}
          onCancel={onClose}
          onIconKeyChange={onAttributeGroupIconChange}
          onNameChange={onAttributeGroupNameChange}
          onSave={onSaveAttributeGroup}
        />
      )}

      {dialog === 'confirmDeleteAttributeGroup' && (
        <DeletePreviewDialog
          title={ui.deleteGroup}
          itemName={attributeGroups.find((group) => group.id === pendingDeleteAttributeGroupId)?.name ?? ui.group}
          hint={ui.groupDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeleteAttributeGroup}
        />
      )}

      {dialog === 'confirmDeleteAttribute' && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={attributeDefinitions.find((definition) => definition.id === pendingDeleteAttributeDefinitionId)?.name ?? ui.attributes}
          hint={ui.attributeDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeleteAttribute}
        />
      )}
    </>
  )
}
