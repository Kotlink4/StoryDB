import type { ComponentProps } from 'react'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { StoryObject } from '../types'
import { DeletePreviewDialog } from './DeletePreviewDialog'
import { CoverDropzone } from './ImageInputs'
import { ObjectDetail } from './ObjectDetail'
import { ObjectEditor } from './ObjectEditor'
import { PreviewDialog } from './StylePreviewPrimitives'

type ObjectEditorProps = ComponentProps<typeof ObjectEditor>
type ObjectDetailProps = Omit<ComponentProps<typeof ObjectDetail>, 'storyObject'>

export function StylePreviewObjectDialogs({
  dialog,
  editingObjectId,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectDetailProps,
  objectEditorProps,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  selectedObject,
  ui,
  onClose,
  onConfirmDeleteObject,
  onEditSelectedObject,
}: {
  dialog: PreviewDialogKind
  editingObjectId: number | null
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectDetailProps: ObjectDetailProps
  objectEditorProps: ObjectEditorProps
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
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

      {dialog === 'objectLegacy' && (
        <PreviewDialog title={ui.newObject} onClose={onClose}>
          <div className="sp-form">
            <label>
              {ui.firstName}
              <ObjectEditor {...objectEditorProps} />
              <input
                className="sp-legacy-object-input"
                value={objectName}
                onChange={(event) => objectEditorProps.onObjectNameChange(event.target.value)}
              />
            </label>
            <label>
              {ui.surname}
              <input value={objectSurname} onChange={(event) => objectEditorProps.onObjectSurnameChange(event.target.value)} />
            </label>
            <label>
              {ui.role}
              <input value={objectRole} onChange={(event) => objectEditorProps.onObjectRoleChange(event.target.value)} />
            </label>
            <label>
              {ui.currentStatus}
              <input
                value={objectCurrentStatus}
                onChange={(event) => objectEditorProps.onObjectCurrentStatusChange(event.target.value)}
              />
            </label>
            <label>
              {ui.yearAge}
              <input value={objectAge} onChange={(event) => objectEditorProps.onObjectAgeChange(event.target.value)} />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={objectImagePath}
              label={ui.image}
              ui={ui}
              onFileSelected={(file) => void objectEditorProps.onImageUpload(file)}
            />
            <label className="wide">
              {ui.description}
              <textarea
                value={objectDescription}
                onChange={(event) => objectEditorProps.onObjectDescriptionChange(event.target.value)}
              />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={onClose}>
                {ui.cancel}
              </button>
              <button className="sp-button primary" type="button" onClick={objectEditorProps.onSave}>
                {ui.save}
              </button>
            </div>
          </div>
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
