import type {
  AttributeDefinition,
  DraftAttribute,
  ObjectTypeKey,
  StoryObject,
} from '../../types'

type BuildOptimisticObjectSummaryOptions = {
  attributeDefinitions: AttributeDefinition[]
  draftAttributes: DraftAttribute[]
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectId: number | null
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectSurnameForm: string
  previousObject: StoryObject | null
  section: ObjectTypeKey
}

export const buildOptimisticObjectSummary = ({
  attributeDefinitions,
  draftAttributes,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectId,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectSurnameForm,
  previousObject,
  section,
}: BuildOptimisticObjectSummaryOptions): StoryObject | null => {
  if (previousObject === null || previousObject.id !== objectId) {
    return null
  }

  return {
    ...previousObject,
    name: objectName.trim(),
    surname: objectSurname.trim() || null,
    surnameForm: section === 'organizations' ? objectSurnameForm.trim() || null : null,
    description: objectDescription.trim() || null,
    age: objectAge.trim() || null,
    role: objectRole.trim() || null,
    currentStatus: objectCurrentStatus.trim() || null,
    imagePath: objectImagePath,
    attributes: draftAttributes
      .map((attribute, index) => {
        const name = attribute.name.trim()
        const existingAttribute = previousObject.attributes.find(
          (currentAttribute) => currentAttribute.name.toLowerCase() === name.toLowerCase(),
        )
        const definition = attributeDefinitions.find(
          (currentDefinition) => currentDefinition.name.toLowerCase() === name.toLowerCase(),
        )

        return {
          id: existingAttribute?.id ?? -(index + 1),
          attributeDefinitionId: existingAttribute?.attributeDefinitionId ?? definition?.id ?? 0,
          name,
          value: attribute.value.trim() || null,
        }
      })
      .filter((attribute) => attribute.name.length > 0),
  }
}

export const mergeSavedObjectSummary = (storyObject: StoryObject, saved: StoryObject): StoryObject => ({
  ...storyObject,
  id: saved.id,
  name: saved.name,
  surname: saved.surname,
  surnameForm: saved.surnameForm,
  description: saved.description,
  age: saved.age,
  role: saved.role,
  currentStatus: saved.currentStatus,
  imagePath: saved.imagePath,
  typeKey: saved.typeKey,
  attributes: saved.attributes,
})
