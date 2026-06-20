import type {
  AttributeDefinitionDraft,
  CatalogEntryDraft,
  CatalogFieldDraft,
  RelationLinkDraft,
  TimelineEventDraft,
  TimelineEventLinkDraft,
  TimelineEventType,
} from './types'

export type ValidationIssue = {
  field: string
  message: string
}

export type ValidationIssueMap = Record<string, string>

export const validationIssuesToMap = (issues: ValidationIssue[]): ValidationIssueMap =>
  Object.fromEntries(issues.map((issue) => [issue.field, issue.message]))

export const firstValidationMessage = (issues: ValidationIssue[]) => issues[0]?.message ?? null

const timelineEventTypes: TimelineEventType[] = ['point', 'duration', 'era', 'chapter']

const parseTimelineNumber = (value: string) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

const addMaxLengthIssue = (
  issues: ValidationIssue[],
  field: string,
  value: string | null,
  maxLength: number,
  message: string,
) => {
  if ((value ?? '').trim().length > maxLength) {
    issues.push({ field, message })
  }
}

const isUploadedImagePath = (value: string) => {
  const normalizedValue = value.toLowerCase()
  return (
    normalizedValue.startsWith('/uploads/projects/') ||
    normalizedValue.startsWith('/uploads/global/images/')
  )
}
const addImagePathIssue = (issues: ValidationIssue[], field: string, value: string | null) => {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return
  }

  if (normalizedValue.length > 512) {
    issues.push({ field, message: 'Путь к изображению слишком длинный.' })
    return
  }

  if (!isUploadedImagePath(normalizedValue)) {
    issues.push({ field, message: 'Обложка должна быть загруженным изображением.' })
  }
}

export const validateTimelineEventDraft = (draft: TimelineEventDraft): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const title = draft.title.trim()
  const isRangeEvent = draft.eventType === 'duration' || draft.eventType === 'era'
  const startValue = parseTimelineNumber(draft.startValue)
  const endValue = isRangeEvent ? parseTimelineNumber(draft.endValue) : null

  if (title.length === 0) {
    issues.push({ field: 'title', message: 'Введите название события.' })
  } else if (title.length > 160) {
    issues.push({ field: 'title', message: 'Название события должно быть не длиннее 160 символов.' })
  }

  if (!timelineEventTypes.includes(draft.eventType)) {
    issues.push({ field: 'eventType', message: 'Выберите тип события.' })
  }

  if (draft.eventType === 'point') {
    if (startValue === null) {
      issues.push({ field: 'startValue', message: 'Укажите время события.' })
    } else if (Number.isNaN(startValue)) {
      issues.push({ field: 'startValue', message: 'Время события должно быть числом.' })
    }
  }

  if (draft.eventType === 'chapter') {
    if (startValue === null) {
      issues.push({ field: 'startValue', message: 'Укажите позицию главы.' })
    } else if (Number.isNaN(startValue)) {
      issues.push({ field: 'startValue', message: 'Позиция главы должна быть числом.' })
    }
  }

  if (isRangeEvent) {
    if (startValue === null) {
      issues.push({ field: 'startValue', message: 'Укажите начало события.' })
    } else if (Number.isNaN(startValue)) {
      issues.push({ field: 'startValue', message: 'Начало события должно быть числом.' })
    }

    if (endValue === null) {
      issues.push({ field: 'endValue', message: 'Укажите конец события.' })
    } else if (Number.isNaN(endValue)) {
      issues.push({ field: 'endValue', message: 'Конец события должен быть числом.' })
    }

    if (
      startValue !== null &&
      endValue !== null &&
      !Number.isNaN(startValue) &&
      !Number.isNaN(endValue) &&
      endValue < startValue
    ) {
      issues.push({ field: 'endValue', message: 'Конец события не может быть раньше начала.' })
    }
  }

  addMaxLengthIssue(issues, 'description', draft.description, 4000, 'Описание события слишком длинное.')
  addMaxLengthIssue(issues, 'startLabel', draft.startLabel, 120, 'Подпись времени слишком длинная.')
  addMaxLengthIssue(issues, 'endLabel', draft.endLabel, 120, 'Подпись конца слишком длинная.')
  addMaxLengthIssue(issues, 'category', draft.category, 80, 'Категория должна быть не длиннее 80 символов.')
  addMaxLengthIssue(issues, 'color', draft.color, 40, 'Цвет события задан некорректно.')
  addImagePathIssue(issues, 'imagePath', draft.imagePath)

  return issues
}

export const getTimelineEventValidationMessage = (draft: TimelineEventDraft) =>
  validateTimelineEventDraft(draft)[0]?.message ?? null

const validateRequiredNameIssue = (field: string, value: string, label: string, maxLength = 120) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return { field, message: `Введите ${label}.` }
  }

  return normalizedValue.length > maxLength
    ? { field, message: `${label} должно быть не длиннее ${maxLength} символов.` }
    : null
}

const validateOptionalTextIssue = (field: string, value: string, label: string, maxLength: number) =>
  value.length > maxLength ? { field, message: `${label} должно быть не длиннее ${maxLength} символов.` } : null

const validateOptionalImagePath = (value: string | null, label: string) => {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.length > 512) {
    return `${label} должна быть не длиннее 512 символов.`
  }

  return isUploadedImagePath(normalizedValue)
    ? null
    : `${label} должна быть загруженным изображением.`
}

const validateOptionalImagePathIssue = (field: string, value: string | null, label: string) => {
  const message = validateOptionalImagePath(value, label)
  return message === null ? null : { field, message }
}

const parseOptionalNumber = (value: string) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

export const validateAuthDraft = (email: string, password: string, displayName: string | null = null) => {
  return firstValidationMessage(validateAuthDraftIssues(email, password, displayName))
}

export const validateAuthDraftIssues = (email: string, password: string, displayName: string | null = null) => {
  const issues: ValidationIssue[] = []
  const normalizedEmail = email.trim()
  if (normalizedEmail.length === 0 || normalizedEmail.length > 254 || !normalizedEmail.includes('@')) {
    issues.push({ field: 'email', message: 'Введите корректный email.' })
  }

  if (password.length < 6 || password.length > 128) {
    issues.push({ field: 'password', message: 'Пароль должен быть от 6 до 128 символов.' })
  }

  if (displayName !== null && displayName.trim().length > 120) {
    issues.push({ field: 'displayName', message: 'Имя профиля должно быть не длиннее 120 символов.' })
  }

  return issues
}

export const validateProfileDraft = (email: string, displayName: string, avatarImagePath: string | null) => {
  return firstValidationMessage(validateProfileDraftIssues(email, displayName, avatarImagePath))
}

export const validateProfileDraftIssues = (email: string, displayName: string, avatarImagePath: string | null) => {
  const issues: ValidationIssue[] = []
  const nameError = validateRequiredNameIssue('displayName', displayName, 'имя профиля')
  if (nameError !== null) {
    issues.push(nameError)
  }
  if (email.trim().length === 0 || email.trim().length > 254 || !email.includes('@')) {
    issues.push({ field: 'email', message: 'Введите корректный email.' })
  }

  const avatarError = validateOptionalImagePathIssue('avatarImagePath', avatarImagePath, 'Аватар')
  if (avatarError !== null) {
    issues.push(avatarError)
  }
  return issues
}

export const validateObjectDraft = (
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
) =>
  firstValidationMessage(validateObjectDraftIssues(
    name,
    surname,
    surnameForm,
    description,
    age,
    role,
    currentStatus,
    imagePath,
  ))

export const validateObjectDraftIssues = (
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
) => [
  validateRequiredNameIssue('name', name, 'название объекта'),
  validateOptionalTextIssue('surname', surname.trim(), 'Фамилия', 120),
  validateOptionalTextIssue('surnameForm', surnameForm.trim(), 'Фамильная форма', 120),
  validateOptionalTextIssue('description', description, 'Описание', 1000),
  validateOptionalTextIssue('age', age.trim(), 'Возраст', 120),
  validateOptionalTextIssue('role', role.trim(), 'Роль', 120),
  validateOptionalTextIssue('currentStatus', currentStatus.trim(), 'Текущий статус', 120),
  validateOptionalImagePathIssue('imagePath', imagePath, 'Обложка объекта'),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateAttributeGroupDraft = (name: string, iconKey: string) =>
  firstValidationMessage(validateAttributeGroupDraftIssues(name, iconKey))

export const validateAttributeGroupDraftIssues = (name: string, iconKey: string) => [
  validateRequiredNameIssue('name', name, 'название группы характеристик'),
  validateOptionalTextIssue('iconKey', iconKey.trim(), 'Иконка группы', 80),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateAttributeDefinitionDraft = (draft: AttributeDefinitionDraft) => {
  return firstValidationMessage(validateAttributeDefinitionDraftIssues(draft))
}

export const validateAttributeDefinitionDraftIssues = (draft: AttributeDefinitionDraft) => {
  const issues: ValidationIssue[] = []
  const nameError = validateRequiredNameIssue('name', draft.name, 'название характеристики')
  if (nameError !== null) {
    issues.push(nameError)
  }

  const minValue = parseOptionalNumber(draft.minValue)
  const maxValue = parseOptionalNumber(draft.maxValue)
  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
    issues.push({ field: Number.isNaN(minValue) ? 'minValue' : 'maxValue', message: 'Минимум и максимум характеристики должны быть числами.' })
  }

  if (minValue !== null && maxValue !== null && maxValue < minValue) {
    issues.push({ field: 'maxValue', message: 'Максимум характеристики не может быть меньше минимума.' })
  }

  if (draft.dataType === 'select' && draft.optionsText.split(',').map((option) => option.trim()).filter(Boolean).length === 0) {
    issues.push({ field: 'optionsText', message: 'Для списка характеристик нужен хотя бы один вариант.' })
  }

  const unitError = validateOptionalTextIssue('unit', draft.unit.trim(), 'Единица измерения', 40)
  if (unitError !== null) {
    issues.push(unitError)
  }
  const iconError = validateOptionalTextIssue('iconKey', (draft.iconKey ?? '').trim(), 'Иконка характеристики', 80)
  if (iconError !== null) {
    issues.push(iconError)
  }

  return issues
}

export const validateCatalogDraft = (name: string, description: string) =>
  firstValidationMessage(validateCatalogDraftIssues(name, description))

export const validateCatalogDraftIssues = (name: string, description: string) => [
  validateRequiredNameIssue('name', name, 'название каталога'),
  validateOptionalTextIssue('description', description, 'Описание каталога', 1000),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateProjectDraft = (name: string, coverImagePath: string | null) =>
  firstValidationMessage(validateProjectDraftIssues(name, coverImagePath))

export const validateProjectDraftIssues = (name: string, coverImagePath: string | null) => [
  validateRequiredNameIssue('name', name, 'название проекта'),
  validateOptionalImagePathIssue('coverImagePath', coverImagePath, 'Обложка проекта'),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateCatalogGroupDraft = (name: string) => firstValidationMessage(validateCatalogGroupDraftIssues(name))

export const validateCatalogGroupDraftIssues = (name: string) => [
  validateRequiredNameIssue('name', name, 'название группы'),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateCatalogFieldDraft = (draft: CatalogFieldDraft) => {
  return firstValidationMessage(validateCatalogFieldDraftIssues(draft))
}

export const validateCatalogFieldDraftIssues = (draft: CatalogFieldDraft) => {
  const issues: ValidationIssue[] = []
  const nameError = validateRequiredNameIssue('name', draft.name, 'название поля шаблона')
  if (nameError !== null) {
    issues.push(nameError)
  }

  const minValue = parseOptionalNumber(draft.minValue)
  const maxValue = parseOptionalNumber(draft.maxValue)
  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
    issues.push({ field: Number.isNaN(minValue) ? 'minValue' : 'maxValue', message: 'Минимум и максимум поля должны быть числами.' })
  }

  if (minValue !== null && maxValue !== null && maxValue < minValue) {
    issues.push({ field: 'maxValue', message: 'Максимум поля не может быть меньше минимума.' })
  }

  if (draft.dataType === 'select' && draft.optionsText.split(',').map((option) => option.trim()).filter(Boolean).length === 0) {
    issues.push({ field: 'optionsText', message: 'Для поля-списка нужен хотя бы один вариант.' })
  }

  if (
    (draft.dataType === 'entryReference' || draft.dataType === 'multipleEntryReference') &&
    draft.referenceCatalogId.trim().length === 0
  ) {
    issues.push({ field: 'referenceCatalogId', message: 'Для ссылочного поля нужно выбрать каталог.' })
  }

  return issues
}

export const validateCatalogEntryDraft = (draft: CatalogEntryDraft) =>
  firstValidationMessage(validateCatalogEntryDraftIssues(draft))

export const validateCatalogEntryDraftIssues = (draft: CatalogEntryDraft) => [
  validateRequiredNameIssue('name', draft.name, 'название записи'),
  validateOptionalTextIssue('description', draft.description, 'Описание записи', 1000),
  validateOptionalImagePathIssue('imagePath', draft.imagePath, 'Обложка записи'),
].filter((issue): issue is ValidationIssue => issue !== null)

export const validateTimelineLinkDraft = (draft: TimelineEventLinkDraft) => {
  return firstValidationMessage(validateTimelineLinkDraftIssues(draft))
}

export const validateTimelineLinkDraftIssues = (draft: TimelineEventLinkDraft) => {
  const issues: ValidationIssue[] = []
  if (draft.sourceEventId.trim().length === 0) {
    issues.push({ field: 'sourceEventId', message: 'Выберите исходное событие для связи.' })
  }
  if (draft.targetEventId.trim().length === 0) {
    issues.push({ field: 'targetEventId', message: 'Выберите целевое событие для связи.' })
  }
  if (draft.sourceEventId !== '' && draft.sourceEventId === draft.targetEventId) {
    issues.push({ field: 'targetEventId', message: 'Событие нельзя связать само с собой.' })
  }
  return issues
}

export const validateRelationLinkDraft = (draft: RelationLinkDraft) => {
  return firstValidationMessage(validateRelationLinkDraftIssues(draft))
}

export const validateRelationLinkDraftIssues = (draft: RelationLinkDraft) => {
  const issues: ValidationIssue[] = []
  const sourceCharacterId = Number(draft.sourceCharacterId)
  const targetCharacterId = Number(draft.targetCharacterId)

  if (!Number.isInteger(sourceCharacterId) || sourceCharacterId <= 0) {
    issues.push({ field: 'sourceCharacterId', message: 'Выберите первого персонажа связи.' })
  }

  if (!Number.isInteger(targetCharacterId) || targetCharacterId <= 0) {
    issues.push({ field: 'targetCharacterId', message: 'Выберите второго персонажа связи.' })
  }

  if (sourceCharacterId === targetCharacterId) {
    issues.push({ field: 'targetCharacterId', message: 'Персонажа нельзя связать с самим собой.' })
  }

  const relationTypeError = validateRequiredNameIssue('relationType', draft.relationType, 'тип связи')
  if (relationTypeError !== null) {
    issues.push(relationTypeError)
  }

  const strength = parseOptionalNumber(draft.strength)
  const tension = parseOptionalNumber(draft.tension)

  if (strength === null || Number.isNaN(strength) || strength < 0 || strength > 100) {
    issues.push({ field: 'strength', message: 'Сила связи должна быть числом от 0 до 100.' })
  }

  if (tension === null || Number.isNaN(tension) || tension < 0 || tension > 100) {
    issues.push({ field: 'tension', message: 'Напряжение должно быть числом от 0 до 100.' })
  }

  const descriptionError = validateOptionalTextIssue('description', draft.description, 'Описание связи', 1000)
  if (descriptionError !== null) {
    issues.push(descriptionError)
  }
  return issues
}

