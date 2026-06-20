import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  ObjectTypeKey,
  StoryObject,
} from '../../types'
import type { ValidationIssueMap } from '../../validation'
import { FieldError } from '../FormValidation'
import { getFieldValidationProps } from '../formValidationUtils'
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
  validationErrors?: ValidationIssueMap
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
  validationErrors,
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
        validationErrorId="object-image-error"
        validationErrors={validationErrors}
        validationField="imagePath"
        ui={ui}
        onFileSelected={(file) => onImageUpload(file)}
      />
      <label>
        {ui.firstName}
        <input
          value={objectName}
          onChange={(event) => onObjectNameChange(event.target.value)}
          {...getFieldValidationProps('name', validationErrors, 'object-name-error')}
        />
        <FieldError id="object-name-error" message={validationErrors?.name} />
      </label>
      {activeType === 'characters' && (
        <>
          <label>
            {ui.surname}
            <input
              list="sp-organization-surnames"
              value={objectSurname}
              onChange={(event) => onObjectSurnameChange(event.target.value)}
              {...getFieldValidationProps('surname', validationErrors, 'object-surname-error')}
            />
            <FieldError id="object-surname-error" message={validationErrors?.surname} />
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
            <input
              value={objectAge}
              onChange={(event) => onObjectAgeChange(event.target.value)}
              {...getFieldValidationProps('age', validationErrors, 'object-age-error')}
            />
            <FieldError id="object-age-error" message={validationErrors?.age} />
          </label>
          <label>
            {ui.role}
            <input
              value={objectRole}
              onChange={(event) => onObjectRoleChange(event.target.value)}
              {...getFieldValidationProps('role', validationErrors, 'object-role-error')}
            />
            <FieldError id="object-role-error" message={validationErrors?.role} />
          </label>
        </>
      )}
      {activeType === 'organizations' && (
        <label>
          {ui.surnameForm}
          <input
            value={objectSurnameForm}
            onChange={(event) => onObjectSurnameFormChange(event.target.value)}
            {...getFieldValidationProps('surnameForm', validationErrors, 'object-surname-form-error')}
          />
          <FieldError id="object-surname-form-error" message={validationErrors?.surnameForm} />
        </label>
      )}
      <label>
        {ui.currentStatus}
        <input
          value={objectCurrentStatus}
          onChange={(event) => onObjectCurrentStatusChange(event.target.value)}
          {...getFieldValidationProps('currentStatus', validationErrors, 'object-current-status-error')}
        />
        <FieldError id="object-current-status-error" message={validationErrors?.currentStatus} />
      </label>
      <label className="wide">
        {ui.description}
        <textarea
          value={objectDescription}
          onChange={(event) => onObjectDescriptionChange(event.target.value)}
          {...getFieldValidationProps('description', validationErrors, 'object-description-error')}
        />
        <FieldError id="object-description-error" message={validationErrors?.description} />
      </label>
    </div>
  )
}
