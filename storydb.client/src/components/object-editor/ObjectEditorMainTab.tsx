import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  ObjectTypeKey,
  StoryObject,
} from '../../types'
import { CoverDropzone } from '../ImageInputs'
import {
  buildOrganizationSurnameOptions,
  getObjectImageClassName,
  getObjectImageCropMode,
} from './objectEditorModel'

type ObjectEditorMainTabProps = {
  activeType: ObjectTypeKey
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectSurnameForm: string
  organizations: StoryObject[]
  ui: PreviewText
  onImageUpload: (file: File | null) => void
  onObjectAgeChange: (value: string) => void
  onObjectCurrentStatusChange: (value: string) => void
  onObjectDescriptionChange: (value: string) => void
  onObjectNameChange: (value: string) => void
  onObjectRoleChange: (value: string) => void
  onObjectSurnameChange: (value: string) => void
  onObjectSurnameFormChange: (value: string) => void
}

export function ObjectEditorMainTab({
  activeType,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectSurnameForm,
  organizations,
  ui,
  onImageUpload,
  onObjectAgeChange,
  onObjectCurrentStatusChange,
  onObjectDescriptionChange,
  onObjectNameChange,
  onObjectRoleChange,
  onObjectSurnameChange,
  onObjectSurnameFormChange,
}: ObjectEditorMainTabProps) {
  const organizationSurnameOptions = buildOrganizationSurnameOptions(organizations)
  const objectImageCropMode = getObjectImageCropMode(activeType)
  const objectImageClassName = getObjectImageClassName(activeType)

  return (
    <div className="sp-form">
      <CoverDropzone
        className={objectImageClassName}
        cropMode={objectImageCropMode}
        imagePath={objectImagePath}
        label={ui.image}
        ui={ui}
        onFileSelected={(file) => onImageUpload(file)}
      />
      <label>
        {ui.firstName}
        <input value={objectName} onChange={(event) => onObjectNameChange(event.target.value)} />
      </label>
      {activeType === 'characters' && (
        <>
          <label>
            {ui.surname}
            <input
              list="sp-organization-surnames"
              value={objectSurname}
              onChange={(event) => onObjectSurnameChange(event.target.value)}
            />
          </label>
          <datalist id="sp-organization-surnames">
            {organizationSurnameOptions.map(([surname, organizationName]) => (
              <option key={`${organizationName}-${surname}`} value={surname}>
                {organizationName}
              </option>
            ))}
          </datalist>
          <label>
            {ui.yearAge}
            <input value={objectAge} onChange={(event) => onObjectAgeChange(event.target.value)} />
          </label>
          <label>
            {ui.role}
            <input value={objectRole} onChange={(event) => onObjectRoleChange(event.target.value)} />
          </label>
        </>
      )}
      {activeType === 'organizations' && (
        <label>
          {ui.surnameForm}
          <input value={objectSurnameForm} onChange={(event) => onObjectSurnameFormChange(event.target.value)} />
        </label>
      )}
      <label>
        {ui.currentStatus}
        <input value={objectCurrentStatus} onChange={(event) => onObjectCurrentStatusChange(event.target.value)} />
      </label>
      <label className="wide">
        {ui.description}
        <textarea value={objectDescription} onChange={(event) => onObjectDescriptionChange(event.target.value)} />
      </label>
    </div>
  )
}
