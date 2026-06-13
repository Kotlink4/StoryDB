import type {
  AttributeDefinitionDraft,
  CatalogEntryDraft,
  CatalogFieldDraft,
  TimelineEventDraft,
  TimelineEventLinkDraft,
  TimelineEventType,
} from './types'

export type ValidationIssue = {
  field: string
  message: string
}

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

const addImagePathIssue = (issues: ValidationIssue[], field: string, value: string | null) => {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return
  }

  if (normalizedValue.length > 512) {
    issues.push({ field, message: 'Путь к изображению слишком длинный.' })
    return
  }

  if (!normalizedValue.toLowerCase().startsWith('/uploads/images/')) {
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

const validateRequiredName = (value: string, label: string, maxLength = 120) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return `Введите ${label}.`
  }

  return normalizedValue.length > maxLength ? `${label} должно быть не длиннее ${maxLength} символов.` : null
}

const validateOptionalText = (value: string, label: string, maxLength: number) =>
  value.length > maxLength ? `${label} должно быть не длиннее ${maxLength} символов.` : null

const validateOptionalImagePath = (value: string | null, label: string) => {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.length > 512) {
    return `${label} должна быть не длиннее 512 символов.`
  }

  return normalizedValue.toLowerCase().startsWith('/uploads/images/')
    ? null
    : `${label} должна быть загруженным изображением.`
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
  const normalizedEmail = email.trim()
  if (normalizedEmail.length === 0 || normalizedEmail.length > 254 || !normalizedEmail.includes('@')) {
    return 'Введите корректный email.'
  }

  if (password.length < 6 || password.length > 128) {
    return 'Пароль должен быть от 6 до 128 символов.'
  }

  if (displayName !== null && displayName.trim().length > 120) {
    return 'Имя профиля должно быть не длиннее 120 символов.'
  }

  return null
}

export const validateProfileDraft = (email: string, displayName: string, avatarImagePath: string | null) => {
  const nameError = validateRequiredName(displayName, 'имя профиля')
  if (nameError !== null) {
    return nameError
  }

  if (email.trim().length === 0 || email.trim().length > 254 || !email.includes('@')) {
    return 'Введите корректный email.'
  }

  const normalizedAvatarPath = avatarImagePath?.trim()
  if (normalizedAvatarPath && normalizedAvatarPath.length > 512) {
    return 'Путь к аватару слишком длинный.'
  }

  return normalizedAvatarPath && !normalizedAvatarPath.startsWith('/uploads/')
    ? 'Аватар должен быть загруженным файлом.'
    : null
}

export const validateObjectDraft = (
  name: string,
  surname: string,
  description: string,
  age: string,
  role: string,
  imagePath: string | null,
) =>
  validateRequiredName(name, 'название объекта') ??
  validateOptionalText(surname.trim(), 'Фамилия', 120) ??
  validateOptionalText(description, 'Описание', 1000) ??
  validateOptionalText(age.trim(), 'Возраст', 120) ??
  validateOptionalText(role.trim(), 'Роль', 120) ??
  validateOptionalImagePath(imagePath, 'Обложка объекта')

export const validateAttributeGroupDraft = (name: string, iconKey: string) =>
  validateRequiredName(name, 'название группы характеристик') ??
  validateOptionalText(iconKey.trim(), 'Иконка группы', 80)

export const validateAttributeDefinitionDraft = (draft: AttributeDefinitionDraft) => {
  const nameError = validateRequiredName(draft.name, 'название характеристики')
  if (nameError !== null) {
    return nameError
  }

  const minValue = parseOptionalNumber(draft.minValue)
  const maxValue = parseOptionalNumber(draft.maxValue)
  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
    return 'Минимум и максимум характеристики должны быть числами.'
  }

  if (minValue !== null && maxValue !== null && maxValue < minValue) {
    return 'Максимум характеристики не может быть меньше минимума.'
  }

  if (draft.dataType === 'select' && draft.optionsText.split(',').map((option) => option.trim()).filter(Boolean).length === 0) {
    return 'Для списка характеристик нужен хотя бы один вариант.'
  }

  return validateOptionalText(draft.unit.trim(), 'Единица измерения', 40) ??
    validateOptionalText((draft.iconKey ?? '').trim(), 'Иконка характеристики', 80)
}

export const validateCatalogDraft = (name: string, description: string) =>
  validateRequiredName(name, 'название каталога') ?? validateOptionalText(description, 'Описание каталога', 1000)

export const validateProjectDraft = (name: string, coverImagePath: string | null) =>
  validateRequiredName(name, 'название проекта') ?? validateOptionalImagePath(coverImagePath, 'Обложка проекта')

export const validateCatalogGroupDraft = (name: string) => validateRequiredName(name, 'название группы')

export const validateCatalogFieldDraft = (draft: CatalogFieldDraft) => {
  const nameError = validateRequiredName(draft.name, 'название поля шаблона')
  if (nameError !== null) {
    return nameError
  }

  const minValue = parseOptionalNumber(draft.minValue)
  const maxValue = parseOptionalNumber(draft.maxValue)
  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
    return 'Минимум и максимум поля должны быть числами.'
  }

  if (minValue !== null && maxValue !== null && maxValue < minValue) {
    return 'Максимум поля не может быть меньше минимума.'
  }

  if (draft.dataType === 'select' && draft.optionsText.split(',').map((option) => option.trim()).filter(Boolean).length === 0) {
    return 'Для поля-списка нужен хотя бы один вариант.'
  }

  if (
    (draft.dataType === 'entryReference' || draft.dataType === 'multipleEntryReference') &&
    draft.referenceCatalogId.trim().length === 0
  ) {
    return 'Для ссылочного поля нужно выбрать каталог.'
  }

  return null
}

export const validateCatalogEntryDraft = (draft: CatalogEntryDraft) =>
  validateRequiredName(draft.name, 'название записи') ??
  validateOptionalText(draft.description, 'Описание записи', 1000) ??
  validateOptionalImagePath(draft.imagePath, 'Обложка записи')

export const validateTimelineLinkDraft = (draft: TimelineEventLinkDraft) => {
  if (draft.sourceEventId.trim().length === 0 || draft.targetEventId.trim().length === 0) {
    return 'Выберите оба события для связи.'
  }

  return draft.sourceEventId === draft.targetEventId ? 'Событие нельзя связать само с собой.' : null
}
