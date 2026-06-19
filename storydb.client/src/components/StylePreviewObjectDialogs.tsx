import type { ComponentProps } from 'react'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { StoryObject } from '../types'
import { DeletePreviewDialog } from './DeletePreviewDialog'
import { ObjectDetail } from './ObjectDetail'
import { ObjectEditor } from './ObjectEditor'
import { PreviewDialog } from './StylePreviewPrimitives'

type ObjectEditorProps = ComponentProps<typeof ObjectEditor>
type ObjectDetailProps = Omit<ComponentProps<typeof ObjectDetail>, 'storyObject'>

export function StylePreviewObjectDialogs({
  dialog,
  editingObjectId,
  objectDetailProps,
  objectEditorProps,
  selectedObject,
  ui,
  onClose,
  onConfirmDeleteObject,
  onEditSelectedObject,
}: {
  dialog: PreviewDialogKind
  editingObjectId: number | null
  objectDetailProps: ObjectDetailProps
  objectEditorProps: ObjectEditorProps
  selectedObject: StoryObject | null
  ui: PreviewText
  onClose: () => void
  onConfirmDeleteObject: () => void
  onEditSelectedObject: (storyObject: StoryObject) => void
}) {
  return (
    <>
      {dialog === 'object' && (
        <PreviewDialog title={editingObjectId === null ? ui.newObject : ui.editor} onClose={onClose}>
          <ObjectEditor {...objectEditorProps} />
        </PreviewDialog>
      )}

      {dialog === 'detail' && selectedObject !== null && (
        <PreviewDialog title={`${ui.dossier}: ${selectedObject.name}`} onClose={onClose}>
          <ObjectDetail
            {...objectDetailProps}
            storyObject={selectedObject}
            onEdit={() => onEditSelectedObject(selectedObject)}
          />
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteObject' && selectedObject !== null && (
        <DeletePreviewDialog
          title={ui.deleteObject}
          itemName={selectedObject.name}
          hint={ui.deleteObjectHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onConfirmDeleteObject}
        />
      )}
    </>
  )
}
