import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  createAttributeDefinitionRequest,
  createAttributeGroupRequest,
  createCatalogEntryRequest,
  createCatalogEntryGroupRequest,
  createCatalogFieldDefinitionRequest,
  createCatalogRequest,
  createHierarchyGroupRequest,
  createHierarchyNodeRequest,
  deleteAttributeGroupRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogEntryRequest,
  deleteCatalogFieldDefinitionRequest,
  deleteCatalogRequest,
  deleteHierarchyGroupRequest,
  deleteHierarchyNodeRequest,
  createCharacterRequest,
  createProjectRequest,
  deleteAttributeDefinitionRequest,
  deleteObjectRequest,
  deleteProjectRequest,
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogEntries,
  fetchCatalogEntryGroups,
  fetchCatalogFieldDefinitions,
  fetchCatalogs,
  fetchCharacters,
  fetchHierarchyGroups,
  fetchHierarchyNodes,
  fetchProjects,
  updateCharacterRequest,
  updateCatalogEntryGroupRequest,
  updateCatalogEntryRequest,
  updateCatalogRequest,
  updateCatalogFieldDefinitionRequest,
  updateHierarchyGroupRequest,
  updateHierarchyNodeRequest,
  updateAttributeDefinitionRequest,
  updateAttributeGroupRequest,
  updateProjectRequest,
  resolveAssetUrl,
} from './api'
import type {
  Accent,
  AttributeDataType,
  AttributeDefinition,
  AttributeGroup,
  AttributeDefinitionDraft,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogPanelPage,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  Dialog,
  DraftAttribute,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  InlineNameEdit,
  Language,
  LayoutMode,
  ModuleSubTab,
  NewProjectTab,
  ObjectTypeKey,
  PendingDelete,
  ProjectStatus,
  StoredSettings,
  StoryObject,
  StoryProject,
  Theme,
  WorkspaceSection,
  WorkspaceTab,
} from './types'
import { AttributeDefinitionsPanel } from './components/AttributeDefinitionsPanel'
import { CatalogPanel } from './components/CatalogPanel'
import { CatalogSidebarSection } from './components/CatalogSidebarSection'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { DatabaseModulesPanel } from './components/DatabaseModulesPanel'
import { HierarchyPanel } from './components/HierarchyPanel'
import { ImageDropzone } from './components/ImageDropzone'
import { ObjectCard } from './components/ObjectCard'
import { ProjectCard } from './components/ProjectCard'
import './App.css'

const translations = {
  en: {
    appName: 'StoryDB',
    chooseProject: 'Choose a project',
    newProject: 'New project',
    createProject: 'Create project',
    projectName: 'Project name',
    projectNamePlaceholder: 'Name your story project',
    cover: 'Cover',
    coverDropzone: 'Drag and drop a cover image here',
    projectDetails: 'Details',
    databaseModules: 'Database modules',
    projects: 'Projects',
    settings: 'Settings',
    auth: 'Account',
    backToProjects: 'Projects',
    back: 'Back',
    characters: 'Characters',
    items: 'Items',
    places: 'Places',
    organizations: 'Organizations',
    catalogs: 'Catalogs',
    newCatalog: 'New catalog',
    catalogName: 'Catalog name',
    catalogDescription: 'Catalog description',
    supportsHierarchy: 'Supports hierarchy',
    catalogEntries: 'Catalog entries',
    newCatalogEntry: 'New entry',
    catalogEntryName: 'Entry name',
    catalogTemplate: 'Entry template',
    catalogFieldName: 'Field name',
    catalogFieldRequired: 'Required',
    catalogFieldReference: 'Reference catalog',
    noCatalogs: 'No catalogs yet',
    noCatalogEntries: 'No entries yet',
    noCatalogFields: 'No template fields yet',
    catalogFieldTypetext: 'Text',
    catalogFieldTypelongText: 'Long text',
    catalogFieldTypenumber: 'Number',
    catalogFieldTypeselect: 'List',
    catalogFieldTypeentryReference: 'Catalog entry',
    catalogFieldTypemultipleEntryReference: 'Multiple catalog entries',
    newCatalogGroup: 'New group',
    hierarchy: 'Hierarchical',
    hierarchyPlaceholder: 'Create a group to start building a hierarchy.',
    hierarchyNodes: 'Elements',
    hierarchyNodeName: 'Element name',
    hierarchyParents: 'Parents',
    noHierarchyGroups: 'No hierarchy groups yet',
    noHierarchyNodes: 'No elements yet',
    database: 'Database',
    relations: 'Relations',
    timeline: 'Timeline',
    gridView: 'Grid',
    listView: 'List',
    newCharacter: 'New character',
    createCharacter: 'Create character',
    characterName: 'Character name',
    characterNamePlaceholder: 'Name the character',
    characterSurname: 'Surname',
    characterSurnamePlaceholder: 'Family name',
    characterAge: 'Age',
    characterAgePlaceholder: 'Age, period, or range',
    characterRole: 'Role',
    characterRolePlaceholder: 'Role in the story',
    description: 'Description',
    descriptionPlaceholder: 'Short dossier note',
    attributes: 'Characteristics',
    attributeName: 'Name',
    attributeValue: 'Value',
    addAttribute: 'Add characteristic',
    attributeGroup: 'Group',
    attributeDataType: 'Data type',
    attributeMin: 'Minimum',
    attributeMax: 'Maximum',
    attributeUnit: 'Unit',
    attributeOptions: 'Options',
    attributeOptionsPlaceholder: 'Comma-separated values',
    attributeTypetext: 'Text',
    attributeTypenumber: 'Number',
    attributeTypeselect: 'List',
    attributeCards: 'Cards',
    attributeDictionary: 'Characteristics',
    noAttributes: 'No characteristics yet',
    allGroup: 'All',
    primaryAttributeGroup: 'Main',
    newAttributeGroup: 'New group',
    createAttributeGroup: 'Create group',
    addGroupToCharacter: 'Add group',
    confirmAttribute: 'Add',
    validationRequiredName: 'Name is required.',
    validationNameTooLong: 'Name must be 120 characters or shorter.',
    validationDescriptionTooLong: 'Description must be 1000 characters or shorter.',
    validationCharacterDetailTooLong: 'Surname, age, and role must be 120 characters or shorter.',
    validationDuplicateAttribute: 'This characteristic is already added.',
    validationDuplicateDefinition: 'A characteristic with this name already exists in this group.',
    validationDuplicateGroup: 'A group with this name already exists.',
    validationNumber: 'Value must be a number.',
    validationNumberMin: 'Value is below the minimum.',
    validationNumberMax: 'Value is above the maximum.',
    validationSelect: 'Choose one of the allowed values.',
    validationSelectOptions: 'List characteristics require at least one option.',
    validationRange: 'Minimum cannot be greater than maximum.',
    removeAttributeGroupFromCharacter: 'Remove group',
    existingAttribute: 'Existing characteristic',
    addExistingAttribute: 'Add characteristic',
    addAttributeGroup: 'Add group',
    attributeGroupListPlaceholder: 'One characteristic per line or comma-separated',
    loading: 'Loading...',
    apiUnavailable: 'API is not available. Start StoryDB.Api and refresh the page.',
    imageUploadFailed: 'Could not upload image. Try another JPEG, PNG, WebP, or GIF.',
    search: 'Search',
    searchPlaceholder: 'Title, genre, note...',
    statusLabel: 'Project status',
    statusAll: 'All',
    statusActive: 'Active',
    statusDraft: 'Draft',
    statusArchived: 'Archived',
    caseLabel: 'Case',
    cards: 'Cards',
    links: 'Links',
    updated: 'Updated',
    openDossier: 'Open dossier',
    noProjects: 'No projects found',
    noProjectsHint: 'Try another search term or switch the status filter.',
    language: 'Language',
    interfaceLanguage: 'Interface language',
    english: 'English',
    russian: 'Russian',
    appearance: 'Appearance',
    theme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    accent: 'Accent',
    forestAccent: 'Forest',
    emberAccent: 'Ember',
    indigoAccent: 'Indigo',
    authTitle: 'Authorization',
    authSubtitle: 'A reserved place for sign in, profiles, and sync later.',
    signInPlaceholder: 'Sign in will be added later',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    editProject: 'Edit project',
    editCharacter: 'Edit character',
    deleteProjectTitle: 'Delete project',
    deleteObjectTitle: 'Delete object',
    deleteCatalogTitle: 'Delete catalog',
    deleteCatalogGroupTitle: 'Delete catalog group',
    deleteCatalogEntryTitle: 'Delete entry',
    deleteProjectConfirm: 'Delete this project and all its data?',
    deleteObjectConfirm: 'Delete this object?',
    deleteCatalogConfirm: 'Delete this catalog and all entries inside it?',
    deleteCatalogGroupConfirm: 'Delete this group? Entries from it will stay in the catalog.',
    deleteCatalogEntryConfirm: 'Delete this catalog entry?',
    dossier: 'Dossier',
  },
  ru: {
    appName: 'StoryDB',
    chooseProject: 'Выбор проекта',
    newProject: 'Новый проект',
    createProject: 'Создать проект',
    projectName: 'Название проекта',
    projectNamePlaceholder: 'Назови проект истории',
    cover: 'Обложка',
    coverDropzone: 'Перетащи изображение обложки сюда',
    projectDetails: 'Детали',
    databaseModules: 'Модули БД',
    projects: 'Проекты',
    settings: 'Настройки',
    auth: 'Аккаунт',
    backToProjects: 'Проекты',
    back: 'Назад',
    characters: 'Персонажи',
    items: 'Предметы',
    places: 'Места',
    organizations: 'Организации',
    catalogs: 'Каталоги',
    newCatalog: 'Новый каталог',
    catalogName: 'Название каталога',
    catalogDescription: 'Описание каталога',
    supportsHierarchy: 'Поддерживает иерархию',
    catalogEntries: 'Записи каталога',
    newCatalogEntry: 'Новая запись',
    catalogEntryName: 'Название записи',
    catalogTemplate: 'Шаблон записи',
    catalogFieldName: 'Название поля',
    catalogFieldRequired: 'Обязательное',
    catalogFieldReference: 'Каталог-ссылка',
    noCatalogs: 'Каталогов пока нет',
    noCatalogEntries: 'Записей пока нет',
    noCatalogFields: 'Полей шаблона пока нет',
    catalogFieldTypetext: 'Текст',
    catalogFieldTypelongText: 'Длинный текст',
    catalogFieldTypenumber: 'Число',
    catalogFieldTypeselect: 'Список',
    catalogFieldTypeentryReference: 'Запись каталога',
    catalogFieldTypemultipleEntryReference: 'Несколько записей каталога',
    hierarchy: 'Иерархический',
    hierarchyPlaceholder: 'Создай группу, чтобы начать собирать иерархию.',
    hierarchyNodes: 'Элементы',
    hierarchyNodeName: 'Название элемента',
    hierarchyParents: 'Родители',
    noHierarchyGroups: 'Групп иерархий пока нет',
    noHierarchyNodes: 'Элементов пока нет',
    database: 'База данных',
    relations: 'Связи',
    timeline: 'Таймлайн',
    gridView: 'Сетка',
    listView: 'Список',
    newCharacter: 'Новый персонаж',
    createCharacter: 'Создать персонажа',
    characterName: 'Имя персонажа',
    characterNamePlaceholder: 'Назови персонажа',
    characterSurname: 'Фамилия',
    characterSurnamePlaceholder: 'Фамилия персонажа',
    characterAge: 'Возраст',
    characterAgePlaceholder: 'Возраст, период или диапазон',
    characterRole: 'Роль',
    characterRolePlaceholder: 'Роль в истории',
    description: 'Описание',
    descriptionPlaceholder: 'Короткая заметка для досье',
    attributes: 'Характеристики',
    attributeName: 'Название',
    attributeValue: 'Значение',
    addAttribute: 'Добавить характеристику',
    attributeGroup: 'Группа',
    attributeDataType: 'Тип данных',
    attributeMin: 'Минимум',
    attributeMax: 'Максимум',
    attributeUnit: 'Единица',
    attributeOptions: 'Варианты',
    attributeOptionsPlaceholder: 'Значения через запятую',
    attributeTypetext: 'Текст',
    attributeTypenumber: 'Число',
    attributeTypeselect: 'Список',
    attributeCards: 'Карточки',
    attributeDictionary: 'Характеристики',
    noAttributes: 'Характеристик пока нет',
    primaryAttributeGroup: 'Основная',
    newAttributeGroup: 'Новая группа',
    createAttributeGroup: 'Создать группу',
    addGroupToCharacter: 'Добавить группу',
    confirmAttribute: 'Добавить',
    validationRequiredName: 'Название обязательно.',
    validationNameTooLong: 'Название должно быть не длиннее 120 символов.',
    validationDescriptionTooLong: 'Описание должно быть не длиннее 1000 символов.',
    validationCharacterDetailTooLong: 'Фамилия, возраст и роль должны быть не длиннее 120 символов.',
    validationDuplicateAttribute: 'Такая характеристика уже добавлена.',
    validationDuplicateDefinition: 'Характеристика с таким названием уже есть в этой группе.',
    validationDuplicateGroup: 'Группа с таким названием уже существует.',
    validationNumber: 'Значение должно быть числом.',
    validationNumberMin: 'Значение меньше минимума.',
    validationNumberMax: 'Значение больше максимума.',
    validationSelect: 'Выбери одно из разрешённых значений.',
    validationSelectOptions: 'Для списка нужен хотя бы один вариант.',
    validationRange: 'Минимум не может быть больше максимума.',
    removeAttributeGroupFromCharacter: 'Убрать группу',
    existingAttribute: 'Готовая характеристика',
    addExistingAttribute: 'Добавить характеристику',
    addAttributeGroup: 'Добавить группу',
    attributeGroupListPlaceholder: 'Одна характеристика на строку или через запятую',
    loading: 'Загрузка...',
    apiUnavailable: 'API недоступен. Запусти StoryDB.Api и обнови страницу.',
    imageUploadFailed: 'Не удалось загрузить изображение. Попробуй JPEG, PNG, WebP или GIF.',
    search: 'Поиск',
    searchPlaceholder: 'Название, жанр, заметка...',
    statusLabel: 'Статус проекта',
    statusAll: 'Все',
    statusActive: 'Активные',
    statusDraft: 'Черновики',
    statusArchived: 'Архив',
    caseLabel: 'Дело',
    cards: 'Карточки',
    links: 'Связи',
    updated: 'Обновлен',
    openDossier: 'Открыть досье',
    noProjects: 'Проекты не найдены',
    noProjectsHint: 'Попробуй другой поиск или смени фильтр статуса.',
    language: 'Язык',
    interfaceLanguage: 'Язык интерфейса',
    english: 'Английский',
    russian: 'Русский',
    appearance: 'Внешний вид',
    theme: 'Тема',
    lightTheme: 'Светлая',
    darkTheme: 'Темная',
    accent: 'Акцент',
    forestAccent: 'Лес',
    emberAccent: 'Уголь',
    indigoAccent: 'Индиго',
    authTitle: 'Авторизация',
    authSubtitle: 'Место под вход, профили и синхронизацию на будущее.',
    signInPlaceholder: 'Вход будет добавлен позже',
    close: 'Закрыть',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    cancel: 'Отмена',
    confirmDelete: 'Удалить',
    editProject: 'Редактировать проект',
    editCharacter: 'Редактировать персонажа',
    deleteProjectTitle: 'Удалить проект',
    deleteObjectTitle: 'Удалить объект',
    deleteCatalogTitle: 'Удалить каталог',
    deleteCatalogGroupTitle: 'Удалить группу каталога',
    deleteCatalogEntryTitle: 'Удалить запись',
    deleteProjectConfirm: 'Удалить этот проект и все его данные?',
    deleteObjectConfirm: 'Удалить этот объект?',
    deleteCatalogConfirm: 'Удалить этот каталог и все записи внутри него?',
    deleteCatalogGroupConfirm: 'Удалить эту группу? Записи из нее останутся в каталоге.',
    deleteCatalogEntryConfirm: 'Удалить эту запись каталога?',
    dossier: 'Досье',
  },
} satisfies Record<Language, Record<string, string>>

const statuses: Array<ProjectStatus | 'All'> = ['All', 'Active', 'Draft', 'Archived']
const settingsStorageKey = 'storydb.settings'
const requiredObjectTypeKeys: ObjectTypeKey[] = ['characters']
const allObjectTypeKeys: ObjectTypeKey[] = [
  'characters',
  'items',
  'places',
  'organizations',
  'hierarchy',
]
const attributeScopeKeys: ObjectTypeKey[] = ['characters', 'items', 'places', 'organizations']

const readStoredSettings = (): StoredSettings => {
  const storedSettings = localStorage.getItem(settingsStorageKey)
  if (storedSettings === null) {
    return {}
  }

  try {
    return JSON.parse(storedSettings) as StoredSettings
  } catch {
    return {}
  }
}

const normalizeObjectTypeKeys = (keys: ObjectTypeKey[]) => {
  const normalizedKeys = new Set<ObjectTypeKey>(
    keys.filter((key) => allObjectTypeKeys.includes(key)),
  )
  requiredObjectTypeKeys.forEach((key) => normalizedKeys.add(key))

  return allObjectTypeKeys.filter((key) => normalizedKeys.has(key))
}

const createEmptyAttributeDefinitionDraft = (): AttributeDefinitionDraft => ({
  name: '',
  dataType: 'text',
  groupName: '',
  minValue: '',
  maxValue: '',
  unit: '',
  optionsText: '',
})

const createEmptyCatalogFieldDraft = (): CatalogFieldDraft => ({
  name: '',
  dataType: 'text',
  isRequired: false,
  minValue: '',
  maxValue: '',
  optionsText: '',
  referenceCatalogId: '',
})

const createEmptyCatalogEntryDraft = (): CatalogEntryDraft => ({
  name: '',
  description: '',
  imagePath: null,
  entryGroupId: '',
  fieldValues: {},
})

const toAttributeDefinitionDraft = (
  definition: AttributeDefinition,
): AttributeDefinitionDraft => ({
  name: definition.name,
  dataType: definition.dataType,
  groupName: definition.groupName ?? '',
  minValue: definition.minValue === null ? '' : String(definition.minValue),
  maxValue: definition.maxValue === null ? '' : String(definition.maxValue),
  unit: definition.unit ?? '',
  optionsText: definition.options.join(', '),
})

const toCatalogFieldDraft = (field: CatalogFieldDefinition): CatalogFieldDraft => ({
  name: field.name,
  dataType: field.dataType,
  isRequired: field.isRequired,
  minValue: field.minValue === null ? '' : String(field.minValue),
  maxValue: field.maxValue === null ? '' : String(field.maxValue),
  optionsText: field.options.join(', '),
  referenceCatalogId: field.referenceCatalogId === null ? '' : String(field.referenceCatalogId),
})

const toCatalogEntryDraft = (entry: CatalogEntry): CatalogEntryDraft => {
  const fieldValues = Object.fromEntries(
    entry.fieldValues.map((fieldValue) => [
      fieldValue.fieldDefinitionId,
      fieldValue.value ?? fieldValue.referencedEntryIds.join(','),
    ]),
  )

  return {
    name: entry.name,
    description: entry.description ?? '',
    imagePath: entry.imagePath,
    entryGroupId: entry.entryGroupId === null ? '' : String(entry.entryGroupId),
    fieldValues,
  }
}

function StoryDbApp() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const routeProjectId = projectId === undefined ? null : Number(projectId)
  const [storedSettings] = useState(readStoredSettings)
  const [language, setLanguage] = useState<Language>(storedSettings.language ?? 'en')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [newProjectTab, setNewProjectTab] = useState<NewProjectTab>('details')
  const [theme, setTheme] = useState<Theme>(storedSettings.theme ?? 'light')
  const [accent, setAccent] = useState<Accent>(storedSettings.accent ?? 'forest')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All')
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('characters')
  const [collapsedSidebarSections, setCollapsedSidebarSections] = useState<WorkspaceSection[]>([])
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('database')
  const [moduleSubTab, setModuleSubTab] = useState<ModuleSubTab>('cards')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [characters, setCharacters] = useState<StoryObject[]>([])
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([])
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [activeAttributeGroupId, setActiveAttributeGroupId] = useState<number | null>(null)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [activeCatalogId, setActiveCatalogId] = useState<number | null>(null)
  const [catalogPanelPage, setCatalogPanelPage] = useState<CatalogPanelPage>('catalog')
  const [activeCatalogEntryId, setActiveCatalogEntryId] = useState<number | null>(null)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogEntryGroups, setCatalogEntryGroups] = useState<CatalogEntryGroup[]>([])
  const [catalogFieldDefinitions, setCatalogFieldDefinitions] = useState<CatalogFieldDefinition[]>([])
  const [catalogFieldDraft, setCatalogFieldDraft] =
    useState<CatalogFieldDraft>(createEmptyCatalogFieldDraft)
  const [editingCatalogFieldId, setEditingCatalogFieldId] = useState<number | null>(null)
  const [catalogEntryGroupFilter, setCatalogEntryGroupFilter] = useState('__all__')
  const [catalogEntryDraft, setCatalogEntryDraft] =
    useState<CatalogEntryDraft>(createEmptyCatalogEntryDraft)
  const [editingCatalogEntryId, setEditingCatalogEntryId] = useState<number | null>(null)
  const [inlineNameEdit, setInlineNameEdit] = useState<InlineNameEdit>(null)
  const [inlineNameDraft, setInlineNameDraft] = useState('')
  const [hierarchyGroups, setHierarchyGroups] = useState<HierarchyGroup[]>([])
  const [activeHierarchyGroupId, setActiveHierarchyGroupId] = useState<number | null>(null)
  const [hierarchyNodes, setHierarchyNodes] = useState<HierarchyNode[]>([])
  const [hierarchyNodesByGroup, setHierarchyNodesByGroup] = useState<Record<number, HierarchyNode[]>>({})
  const [hierarchyNodeName, setHierarchyNodeName] = useState('')
  const [hierarchyNodeDescription, setHierarchyNodeDescription] = useState('')
  const [hierarchyNodeParentIds, setHierarchyNodeParentIds] = useState<number[]>([])
  const [editingHierarchyNodeId, setEditingHierarchyNodeId] = useState<number | null>(null)
  const [attributeScope, setAttributeScope] = useState<ObjectTypeKey>('characters')
  const [selectedCharacter, setSelectedCharacter] = useState<StoryObject | null>(null)
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<number | null>(null)
  const [activeObjectMenuId, setActiveObjectMenuId] = useState<number | null>(null)
  const [activeCatalogEntryMenuId, setActiveCatalogEntryMenuId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [editingProject, setEditingProject] = useState<StoryProject | null>(null)
  const [editingCharacter, setEditingCharacter] = useState<StoryObject | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectCoverImagePath, setProjectCoverImagePath] = useState<string | null>(null)
  const [enabledObjectTypeKeys, setEnabledObjectTypeKeys] = useState<ObjectTypeKey[]>([
    'characters',
  ])
  const [characterName, setCharacterName] = useState('')
  const [characterSurname, setCharacterSurname] = useState('')
  const [characterAge, setCharacterAge] = useState('')
  const [characterRole, setCharacterRole] = useState('')
  const [characterDescription, setCharacterDescription] = useState('')
  const [characterImagePath, setCharacterImagePath] = useState<string | null>(null)
  const [draftAttributes, setDraftAttributes] = useState<DraftAttribute[]>([
    { name: '', value: '' },
  ])
  const [draftHierarchySelections, setDraftHierarchySelections] = useState<DraftHierarchySelection[]>([])
  const [newHierarchySelectionGroupId, setNewHierarchySelectionGroupId] = useState('')
  const [isAttributePickerOpen, setIsAttributePickerOpen] = useState(false)
  const [newCharacterAttributeName, setNewCharacterAttributeName] = useState('')
  const [newCharacterAttributeValue, setNewCharacterAttributeValue] = useState('')
  const [newCharacterAttributeDataType, setNewCharacterAttributeDataType] = useState<AttributeDataType>('text')
  const [newCharacterAttributeOptionsText, setNewCharacterAttributeOptionsText] = useState('')
  const [collapsedCharacterAttributeGroups, setCollapsedCharacterAttributeGroups] = useState<string[]>([])
  const [collapsedDossierAttributeGroups, setCollapsedDossierAttributeGroups] = useState<string[]>([])
  const [isCharacterAttributesExpanded, setIsCharacterAttributesExpanded] = useState(true)
  const [isCharacterHierarchyExpanded, setIsCharacterHierarchyExpanded] = useState(true)
  const [attributeDefinitionDraft, setAttributeDefinitionDraft] =
    useState<AttributeDefinitionDraft>(createEmptyAttributeDefinitionDraft)
  const [editingAttributeDefinitionId, setEditingAttributeDefinitionId] = useState<number | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const t = translations[language]
  const isWorkspace = routeProjectId !== null && Number.isFinite(routeProjectId)
  const selectedProject = useMemo(
    () =>
      routeProjectId === null
        ? null
        : projects.find((currentProject) => currentProject.id === routeProjectId) ?? null,
    [projects, routeProjectId],
  )
  const enabledWorkspaceSections = useMemo<WorkspaceSection[]>(() => {
    const enabledKeys =
      selectedProject === null
        ? requiredObjectTypeKeys
        : normalizeObjectTypeKeys(
            selectedProject.objectTypes
              .filter((objectType) => objectType.isEnabled)
              .map((objectType) => objectType.key),
          )
    const sidebarSections: WorkspaceSection[] = []

    ;(['characters', 'items', 'places', 'organizations'] as ObjectTypeKey[]).forEach((section) => {
      if (enabledKeys.includes(section)) {
        sidebarSections.push(section)
      }
    })

    if (enabledKeys.includes('hierarchy')) {
      sidebarSections.push('hierarchy')
    }
    sidebarSections.push('catalogs')

    return sidebarSections
  }, [selectedProject])
  const enabledAttributeScopes = useMemo<ObjectTypeKey[]>(() => {
    if (selectedProject === null) {
      return ['characters']
    }

    const enabledKeys = normalizeObjectTypeKeys(
      selectedProject.objectTypes
        .filter((objectType) => objectType.isEnabled)
        .map((objectType) => objectType.key),
    )

    return attributeScopeKeys.filter((scope) => enabledKeys.includes(scope))
  }, [selectedProject])
  const isHierarchyModuleEnabled = useMemo(
    () =>
      selectedProject?.objectTypes.some(
        (objectType) => objectType.key === 'hierarchy' && objectType.isEnabled,
      ) ?? false,
    [selectedProject],
  )
  const effectiveAttributeScope = enabledAttributeScopes.includes(attributeScope)
    ? attributeScope
    : enabledAttributeScopes[0] ?? 'characters'
  const activeAttributeGroup = useMemo(
    () =>
      activeAttributeGroupId === null
        ? null
        : attributeGroups.find((group) => group.id === activeAttributeGroupId) ?? null,
    [activeAttributeGroupId, attributeGroups],
  )
  const activeHierarchyGroup = useMemo(
    () =>
      activeHierarchyGroupId === null
        ? null
        : hierarchyGroups.find((group) => group.id === activeHierarchyGroupId) ?? null,
    [activeHierarchyGroupId, hierarchyGroups],
  )
  const activeCatalog = useMemo(
    () =>
      activeCatalogId === null
        ? null
        : catalogs.find((catalog) => catalog.id === activeCatalogId) ?? null,
    [activeCatalogId, catalogs],
  )
  const activeCatalogEntryGroup = useMemo(
    () =>
      catalogEntryGroupFilter === '__all__' || catalogEntryGroupFilter === '__ungrouped__'
        ? null
        : catalogEntryGroups.find((group) => group.id === Number(catalogEntryGroupFilter)) ?? null,
    [catalogEntryGroupFilter, catalogEntryGroups],
  )
  const activeCatalogEntry = useMemo(
    () =>
      activeCatalogEntryId === null
        ? null
        : catalogEntries.find((entry) => entry.id === activeCatalogEntryId) ?? null,
    [activeCatalogEntryId, catalogEntries],
  )
  const attributeGroupsWithMain = useMemo(
    () => [
      { id: 0, name: t.primaryAttributeGroup },
      ...attributeGroups.map((group) => ({ id: group.id, name: group.name })),
    ],
    [attributeGroups, t.primaryAttributeGroup],
  )
  const characterAttributeGroups = useMemo(() => {
    const definitionsByName = new Map(
      attributeDefinitions.map((definition) => [definition.name.trim().toLowerCase(), definition]),
    )
    const groups = new Map<string, { key: string; name: string; attributes: DraftAttribute[] }>()

    draftAttributes
      .filter(
        (attribute) => attribute.name.trim().length > 0 || attribute.value.trim().length > 0,
      )
      .forEach((attribute) => {
        const definition = definitionsByName.get(attribute.name.trim().toLowerCase())
        const groupName = definition?.groupName ?? t.primaryAttributeGroup
        const groupKey = definition?.groupName ?? '__main__'
        const existingGroup = groups.get(groupKey) ?? {
          key: groupKey,
          name: groupName,
          attributes: [],
        }
        existingGroup.attributes.push(attribute)
        groups.set(groupKey, existingGroup)
      })

    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === '__main__') {
        return -1
      }
      if (right.key === '__main__') {
        return 1
      }

      return left.name.localeCompare(right.name)
    })
  }, [attributeDefinitions, draftAttributes, t.primaryAttributeGroup])

  const dossierAttributeGroups = useMemo(() => {
    if (selectedCharacter === null) {
      return []
    }

    const definitionsByName = new Map(
      attributeDefinitions.map((definition) => [definition.name.trim().toLowerCase(), definition]),
    )
    const groups = new Map<
      string,
      { key: string; name: string; attributes: StoryObject['attributes'] }
    >()

    selectedCharacter.attributes.forEach((attribute) => {
      const definition = definitionsByName.get(attribute.name.trim().toLowerCase())
      const groupName = definition?.groupName ?? t.primaryAttributeGroup
      const groupKey = definition?.groupName ?? '__main__'
      const existingGroup = groups.get(groupKey) ?? {
        key: groupKey,
        name: groupName,
        attributes: [],
      }
      existingGroup.attributes.push(attribute)
      groups.set(groupKey, existingGroup)
    })

    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === '__main__') {
        return -1
      }
      if (right.key === '__main__') {
        return 1
      }

      return left.name.localeCompare(right.name)
    })
  }, [attributeDefinitions, selectedCharacter, t.primaryAttributeGroup])
  const draftHierarchySelectionsWithDetails = useMemo(
    () =>
      draftHierarchySelections
        .map((selection) => ({
          ...selection,
          group: hierarchyGroups.find((group) => group.id === selection.groupId) ?? null,
          nodes: hierarchyNodesByGroup[selection.groupId] ?? [],
        }))
        .filter((selection) => selection.group !== null),
    [draftHierarchySelections, hierarchyGroups, hierarchyNodesByGroup],
  )
  const availableHierarchyGroupsForCharacter = useMemo(
    () =>
      hierarchyGroups.filter(
        (group) =>
          !draftHierarchySelections.some((selection) => selection.groupId === group.id),
      ),
    [draftHierarchySelections, hierarchyGroups],
  )
  const visibleCatalogEntries = useMemo(() => {
    if (catalogEntryGroupFilter === '__all__') {
      return catalogEntries
    }

    if (catalogEntryGroupFilter === '__ungrouped__') {
      return catalogEntries.filter((entry) => entry.entryGroupId === null)
    }

    const groupId = Number(catalogEntryGroupFilter)
    return catalogEntries.filter((entry) => entry.entryGroupId === groupId)
  }, [catalogEntries, catalogEntryGroupFilter])
  useEffect(() => {
    let isActive = true

    void fetchProjects()
      .then((data) => {
        if (isActive) {
          setProjects(data)
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null) {
      return undefined
    }

    void fetchCharacters(selectedProject.id)
      .then((data) => {
        if (isActive) {
          setCharacters(data)
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [isWorkspace, selectedProject, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (
      !isWorkspace ||
      selectedProject === null ||
      (workspaceSection !== 'attributes' && workspaceSection !== 'characters')
    ) {
      return undefined
    }

    const typeKey = workspaceSection === 'attributes' ? effectiveAttributeScope : 'characters'

    void Promise.all([
      fetchAttributeDefinitions(selectedProject.id, typeKey),
      fetchAttributeGroups(selectedProject.id, typeKey),
    ])
      .then(([definitions, groups]) => {
        if (isActive) {
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [effectiveAttributeScope, isWorkspace, selectedProject, t.apiUnavailable, workspaceSection])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null || !isHierarchyModuleEnabled) {
      return undefined
    }

    void fetchHierarchyGroups(selectedProject.id)
      .then((groups) => {
        if (isActive) {
          setHierarchyGroups(groups)
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [isHierarchyModuleEnabled, isWorkspace, selectedProject, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null) {
      return undefined
    }

    void fetchCatalogs(selectedProject.id)
      .then((data) => {
        if (isActive) {
          setCatalogs(data)
          setActiveCatalogId((currentId) =>
            currentId !== null && data.some((catalog) => catalog.id === currentId)
              ? currentId
              : data[0]?.id ?? null,
          )
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [isWorkspace, selectedProject, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null || activeCatalogId === null) {
      return undefined
    }

    void Promise.all([
      fetchCatalogEntries(selectedProject.id, activeCatalogId),
      fetchCatalogEntryGroups(selectedProject.id, activeCatalogId),
      fetchCatalogFieldDefinitions(selectedProject.id, activeCatalogId),
    ])
      .then(([entries, groups, fields]) => {
        if (isActive) {
          setCatalogEntries(entries)
          setCatalogEntryGroups(groups)
          setCatalogFieldDefinitions(fields)
          setCatalogEntryGroupFilter((currentFilter) => {
            if (currentFilter === '__all__' || currentFilter === '__ungrouped__') {
              return currentFilter
            }

            return groups.some((group) => group.id === Number(currentFilter))
              ? currentFilter
              : '__all__'
          })
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeCatalogId, isWorkspace, selectedProject, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null || !isHierarchyModuleEnabled || hierarchyGroups.length === 0) {
      return undefined
    }

    void Promise.all(
      hierarchyGroups.map((group) =>
        fetchHierarchyNodes(selectedProject.id, group.id).then((nodes) => [group.id, nodes] as const),
      ),
    )
      .then((entries) => {
        if (isActive) {
          setHierarchyNodesByGroup(Object.fromEntries(entries))
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [hierarchyGroups, isHierarchyModuleEnabled, isWorkspace, selectedProject, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (
      !isWorkspace ||
      selectedProject === null ||
      workspaceSection !== 'hierarchy' ||
      activeHierarchyGroupId === null
    ) {
      return undefined
    }

    void fetchHierarchyNodes(selectedProject.id, activeHierarchyGroupId)
      .then((nodes) => {
        if (isActive) {
          setHierarchyNodes(nodes)
          setHierarchyNodesByGroup((currentNodesByGroup) => ({
            ...currentNodesByGroup,
            [activeHierarchyGroupId]: nodes,
          }))
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeHierarchyGroupId, isWorkspace, selectedProject, t.apiUnavailable, workspaceSection])
  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify({ language, theme, accent }))
  }, [language, theme, accent])

  const closeDialog = () => {
    setDialog(null)
    setFormError(null)
    setEditingProject(null)
    setEditingCharacter(null)
    setProjectCoverImagePath(null)
    setCharacterImagePath(null)
    setIsAttributePickerOpen(false)
    setIsCharacterAttributesExpanded(true)
    setIsCharacterHierarchyExpanded(true)
    setDraftHierarchySelections([])
    setNewHierarchySelectionGroupId('')
    setNewCharacterAttributeName('')
    setNewCharacterAttributeValue('')
    setNewCharacterAttributeDataType('text')
    setNewCharacterAttributeOptionsText('')
    setCollapsedCharacterAttributeGroups([])
    setCollapsedDossierAttributeGroups([])
  }

  const openEditProject = (project: StoryProject) => {
    setActiveProjectMenuId(null)
    setEditingProject(project)
    setProjectName(project.name)
    setProjectCoverImagePath(project.coverImagePath)
    setEnabledObjectTypeKeys(
      normalizeObjectTypeKeys(
        project.objectTypes
          .filter((objectType) => objectType.isEnabled)
          .map((objectType) => objectType.key),
      ),
    )
    setNewProjectTab('details')
    setDialog('editProject')
  }

  const openEditCharacter = (storyObject: StoryObject) => {
    setActiveObjectMenuId(null)
    setSelectedCharacter(storyObject)
    setEditingCharacter(storyObject)
    setCharacterName(storyObject.name)
    setCharacterSurname(storyObject.surname ?? '')
    setCharacterDescription(storyObject.description ?? '')
    setCharacterAge(storyObject.age ?? '')
    setCharacterRole(storyObject.role ?? '')
    setCharacterImagePath(storyObject.imagePath)
    setIsAttributePickerOpen(false)
    setIsCharacterAttributesExpanded(true)
    setIsCharacterHierarchyExpanded(true)
    setNewCharacterAttributeName('')
    setNewCharacterAttributeValue('')
    setNewCharacterAttributeDataType('text')
    setNewCharacterAttributeOptionsText('')
    setCollapsedCharacterAttributeGroups([])
    setCollapsedDossierAttributeGroups([])
    setDraftHierarchySelections(
      storyObject.hierarchySelections.map((selection) => ({
        groupId: selection.groupId,
        nodeIds: selection.nodes.map((node) => node.id),
      })),
    )
    setDraftAttributes(
      storyObject.attributes.length > 0
        ? storyObject.attributes.map((attribute) => ({
            name: attribute.name,
            value: attribute.value ?? '',
          }))
        : [{ name: '', value: '' }],
    )
    setDialog('editCharacter')
  }

  const requestDeleteProject = (project: StoryProject) => {
    setActiveProjectMenuId(null)
    setPendingDelete({ kind: 'project', item: project })
  }

  const requestDeleteObject = (storyObject: StoryObject) => {
    setActiveObjectMenuId(null)
    setPendingDelete({ kind: 'object', item: storyObject })
  }

  const requestDeleteCatalog = (catalog: Catalog) => {
    setPendingDelete({ kind: 'catalog', item: catalog })
  }

  const requestDeleteCatalogEntryGroup = (group: CatalogEntryGroup) => {
    setPendingDelete({ kind: 'catalogEntryGroup', item: group })
  }

  const requestDeleteCatalogEntry = (entry: CatalogEntry) => {
    setActiveCatalogEntryMenuId(null)
    setPendingDelete({ kind: 'catalogEntry', item: entry })
  }

  const startInlineNameEdit = (
    edit: Exclude<InlineNameEdit, null>,
    currentName: string,
  ) => {
    setInlineNameEdit(edit)
    setInlineNameDraft(currentName)
    setFormError(null)
  }

  const cancelInlineNameEdit = () => {
    setInlineNameEdit(null)
    setInlineNameDraft('')
  }

  const validateName = (name: string) => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      return t.validationRequiredName
    }

    if (trimmedName.length > 120) {
      return t.validationNameTooLong
    }

    return null
  }

  const validateAttributeDefinitionDraft = (
    draft: AttributeDefinitionDraft,
    _groupName: string,
    editingDefinitionIdToIgnore: number | null,
  ) => {
    const nameError = validateName(draft.name)
    if (nameError !== null) {
      return nameError
    }

    const normalizedName = draft.name.trim().toLowerCase()
    const hasDuplicate = attributeDefinitions.some((definition) => {
      if (definition.id === editingDefinitionIdToIgnore) {
        return false
      }

      return definition.name.trim().toLowerCase() === normalizedName
    })
    if (hasDuplicate) {
      return t.validationDuplicateDefinition
    }

    if (draft.dataType === 'number') {
      const minValue = draft.minValue.trim().length === 0 ? null : Number(draft.minValue)
      const maxValue = draft.maxValue.trim().length === 0 ? null : Number(draft.maxValue)
      if (
        (draft.minValue.trim().length > 0 && Number.isNaN(minValue)) ||
        (draft.maxValue.trim().length > 0 && Number.isNaN(maxValue))
      ) {
        return t.validationNumber
      }

      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        return t.validationRange
      }
    }

    if (
      draft.dataType === 'select' &&
      draft.optionsText
        .split(',')
        .map((option) => option.trim())
        .filter((option) => option.length > 0).length === 0
    ) {
      return t.validationSelectOptions
    }

    return null
  }

  const validateDraftAttributeValues = () => {
    const seenNames = new Set<string>()

    for (const attribute of draftAttributes) {
      const name = attribute.name.trim()
      const value = attribute.value.trim()
      if (name.length === 0 && value.length === 0) {
        continue
      }

      const nameError = validateName(name)
      if (nameError !== null) {
        return nameError
      }

      const normalizedName = name.toLowerCase()
      if (seenNames.has(normalizedName)) {
        return t.validationDuplicateAttribute
      }
      seenNames.add(normalizedName)

      const definition = attributeDefinitions.find(
        (currentDefinition) => currentDefinition.name.trim().toLowerCase() === normalizedName,
      )
      if (definition === undefined || value.length === 0) {
        continue
      }

      if (definition.dataType === 'number') {
        const numericValue = Number(value)
        if (Number.isNaN(numericValue)) {
          return `${definition.name}: ${t.validationNumber}`
        }
        if (definition.minValue !== null && numericValue < definition.minValue) {
          return `${definition.name}: ${t.validationNumberMin}`
        }
        if (definition.maxValue !== null && numericValue > definition.maxValue) {
          return `${definition.name}: ${t.validationNumberMax}`
        }
      }

      if (
        definition.dataType === 'select' &&
        definition.options.length > 0 &&
        !definition.options.some((option) => option.toLowerCase() === value.toLowerCase())
      ) {
        return `${definition.name}: ${t.validationSelect}`
      }
    }

    return null
  }
  const createProject = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = projectName.trim()
    const validationError = validateName(trimmedName)
    if (validationError !== null) {
      setFormError(validationError)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      const createdProject = await createProjectRequest(
        trimmedName,
        projectCoverImagePath,
        normalizeObjectTypeKeys(enabledObjectTypeKeys),
      )
      setProjectName('')
      setProjectCoverImagePath(null)
      setEnabledObjectTypeKeys(['characters'])
      closeDialog()
      setProjects((currentProjects) => [createdProject, ...currentProjects])
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateProject = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = projectName.trim()
    const validationError = validateName(trimmedName)
    if (editingProject === null || validationError !== null) {
      setFormError(validationError)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      const updatedProject = await updateProjectRequest(
        editingProject,
        trimmedName,
        projectCoverImagePath,
        normalizeObjectTypeKeys(enabledObjectTypeKeys),
      )
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project,
        ),
      )
      if (
        selectedProject?.id === updatedProject.id &&
        workspaceSection !== 'attributes' &&
        workspaceSection !== 'catalogs' &&
        !normalizeObjectTypeKeys(enabledObjectTypeKeys).includes(workspaceSection)
      ) {
        setWorkspaceSection('characters')
      }

      setProjectName('')
      setProjectCoverImagePath(null)
      setEnabledObjectTypeKeys(['characters'])
      closeDialog()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const openProject = async (project: StoryProject) => {
    setWorkspaceSection('characters')
    setWorkspaceTab('database')
    setModuleSubTab('cards')
    navigate(`/projects/${project.id}`)
  }

  const deleteProject = async (project: StoryProject) => {
    try {
      setApiError(null)
      await deleteProjectRequest(project.id)

      setProjects((currentProjects) =>
        currentProjects.filter((currentProject) => currentProject.id !== project.id),
      )

      if (selectedProject?.id === project.id) {
        setCharacters([])
        navigate('/')
      }

      setPendingDelete(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteObject = async (storyObject: StoryObject) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteObjectRequest(selectedProject.id, storyObject.id)

      setCharacters((currentCharacters) =>
        currentCharacters.filter((currentCharacter) => currentCharacter.id !== storyObject.id),
      )

      if (selectedCharacter?.id === storyObject.id) {
        setSelectedCharacter(null)
        closeDialog()
      }

      setPendingDelete(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteCatalog = async (catalog: Catalog) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteCatalogRequest(selectedProject.id, catalog.id)

      const remainingCatalogs = catalogs.filter((currentCatalog) => currentCatalog.id !== catalog.id)
      setCatalogs(remainingCatalogs)

      if (activeCatalogId === catalog.id) {
        const nextCatalog = remainingCatalogs[0] ?? null
        setActiveCatalogId(nextCatalog?.id ?? null)
        setActiveCatalogEntryId(null)
        setCatalogPanelPage('catalog')
        setCatalogEntryGroupFilter('__all__')
        setCatalogEntries([])
        setCatalogEntryGroups([])
        if (nextCatalog === null) {
          setWorkspaceSection('attributes')
          setModuleSubTab('attributes')
          setActiveAttributeGroupId(null)
        }
      }

      setPendingDelete(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteCatalogEntryGroup = async (group: CatalogEntryGroup) => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    try {
      setApiError(null)
      await deleteCatalogEntryGroupRequest(selectedProject.id, activeCatalogId, group.id)
      setCatalogEntryGroups((currentGroups) =>
        currentGroups.filter((currentGroup) => currentGroup.id !== group.id),
      )
      setCatalogEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.entryGroupId === group.id
            ? { ...entry, entryGroupId: null, entryGroupName: null }
            : entry,
        ),
      )
      if (catalogEntryGroupFilter === String(group.id)) {
        setCatalogEntryGroupFilter('__all__')
        setCatalogPanelPage('catalog')
      }
      setPendingDelete(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteCatalogEntry = async (entry: CatalogEntry) => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    try {
      setApiError(null)
      await deleteCatalogEntryRequest(selectedProject.id, activeCatalogId, entry.id)
      setCatalogEntries((currentEntries) =>
        currentEntries.filter((currentEntry) => currentEntry.id !== entry.id),
      )
      if (activeCatalogEntryId === entry.id) {
        setActiveCatalogEntryId(null)
        setCatalogPanelPage('catalog')
      }
      if (editingCatalogEntryId === entry.id) {
        cancelCatalogEntryEdit()
      }
      setPendingDelete(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const saveInlineNameEdit = async () => {
    if (selectedProject === null || inlineNameEdit === null) {
      return
    }

    const nextName = inlineNameDraft.trim()
    const validationError = validateName(nextName)
    if (validationError !== null) {
      setFormError(validationError)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      if (inlineNameEdit.kind === 'catalog') {
        const catalog = catalogs.find((currentCatalog) => currentCatalog.id === inlineNameEdit.id)
        if (catalog === undefined) {
          cancelInlineNameEdit()
          return
        }

        const updatedCatalog = await updateCatalogRequest(
          selectedProject.id,
          catalog.id,
          nextName,
          catalog.description ?? '',
          catalog.supportsHierarchy,
        )
        setCatalogs((currentCatalogs) =>
          currentCatalogs.map((currentCatalog) =>
            currentCatalog.id === updatedCatalog.id ? updatedCatalog : currentCatalog,
          ),
        )
      } else {
        if (activeCatalogId === null) {
          return
        }

        const updatedGroup = await updateCatalogEntryGroupRequest(
          selectedProject.id,
          activeCatalogId,
          inlineNameEdit.id,
          nextName,
        )
        setCatalogEntryGroups((currentGroups) =>
          currentGroups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)),
        )
        setCatalogEntries((currentEntries) =>
          currentEntries.map((entry) =>
            entry.entryGroupId === updatedGroup.id
              ? { ...entry, entryGroupName: updatedGroup.name }
              : entry,
          ),
        )
      }

      cancelInlineNameEdit()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const confirmPendingDelete = async () => {
    if (pendingDelete === null) {
      return
    }

    if (pendingDelete.kind === 'project') {
      await deleteProject(pendingDelete.item)
      return
    }

    if (pendingDelete.kind === 'object') {
      await deleteObject(pendingDelete.item)
      return
    }

    if (pendingDelete.kind === 'catalog') {
      await deleteCatalog(pendingDelete.item)
      return
    }

    if (pendingDelete.kind === 'catalogEntryGroup') {
      await deleteCatalogEntryGroup(pendingDelete.item)
      return
    }

    await deleteCatalogEntry(pendingDelete.item)
  }

  const appendDraftAttributes = (attributesToAppend: DraftAttribute[]) => {
    setDraftAttributes((currentAttributes) => {
      const existingNames = new Set(
        currentAttributes
          .map((attribute) => attribute.name.trim().toLowerCase())
          .filter((name) => name.length > 0),
      )
      const nextAttributes = currentAttributes.filter(
        (attribute) => attribute.name.trim().length > 0 || attribute.value.trim().length > 0,
      )

      attributesToAppend.forEach((attribute) => {
        const normalizedName = attribute.name.trim().toLowerCase()
        if (normalizedName.length === 0 || existingNames.has(normalizedName)) {
          return
        }

        existingNames.add(normalizedName)
        nextAttributes.push(attribute)
      })

      return nextAttributes.length === 0 ? [{ name: '', value: '' }] : nextAttributes
    })
  }

  const ensureDraftAttributeDefinitions = async () => {
    if (selectedProject === null) {
      return
    }

    const knownNames = new Set(
      attributeDefinitions.map((definition) => definition.name.trim().toLowerCase()),
    )
    const createdDefinitions: AttributeDefinition[] = []

    for (const attribute of draftAttributes) {
      const attributeName = attribute.name.trim()
      const normalizedName = attributeName.toLowerCase()
      if (attributeName.length === 0 || knownNames.has(normalizedName)) {
        continue
      }

      const createdDefinition = await createAttributeDefinitionRequest(
        selectedProject.id,
        'characters',
        {
          ...createEmptyAttributeDefinitionDraft(),
          name: attributeName,
        },
      )
      knownNames.add(normalizedName)
      createdDefinitions.push(createdDefinition)
    }

    if (createdDefinitions.length > 0) {
      setAttributeDefinitions((currentDefinitions) => [
        ...currentDefinitions,
        ...createdDefinitions,
      ])
    }
  }

  const createCharacter = async (event: FormEvent) => {
    event.preventDefault()
    const nameError = validateName(characterName)
    const attributesError = validateDraftAttributeValues()
    if (selectedProject === null || nameError !== null || attributesError !== null) {
      setFormError(nameError ?? attributesError)
      return
    }
    if (characterDescription.length > 1000) {
      setFormError(t.validationDescriptionTooLong)
      return
    }
    if (characterSurname.length > 120 || characterAge.length > 120 || characterRole.length > 120) {
      setFormError(t.validationCharacterDetailTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      await ensureDraftAttributeDefinitions()
      const createdCharacter = await createCharacterRequest(
        selectedProject.id,
        characterName.trim(),
        characterSurname,
        characterDescription,
        characterAge,
        characterRole,
        characterImagePath,
        draftAttributes,
        draftHierarchySelections,
      )
      setCharacters((currentCharacters) => [...currentCharacters, createdCharacter])
      setCharacterName('')
      setCharacterSurname('')
      setCharacterDescription('')
      setCharacterAge('')
      setCharacterRole('')
      setCharacterImagePath(null)
      setDraftAttributes([{ name: '', value: '' }])
      setDraftHierarchySelections([])
      closeDialog()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateCharacter = async (event: FormEvent) => {
    event.preventDefault()
    const nameError = validateName(characterName)
    const attributesError = validateDraftAttributeValues()
    if (
      selectedProject === null ||
      editingCharacter === null ||
      nameError !== null ||
      attributesError !== null
    ) {
      setFormError(nameError ?? attributesError)
      return
    }
    if (characterDescription.length > 1000) {
      setFormError(t.validationDescriptionTooLong)
      return
    }
    if (characterSurname.length > 120 || characterAge.length > 120 || characterRole.length > 120) {
      setFormError(t.validationCharacterDetailTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      await ensureDraftAttributeDefinitions()
      const updatedCharacter = await updateCharacterRequest(
        selectedProject.id,
        editingCharacter.id,
        characterName.trim(),
        characterSurname,
        characterDescription,
        characterAge,
        characterRole,
        characterImagePath,
        draftAttributes,
        draftHierarchySelections,
      )
      setCharacters((currentCharacters) =>
        currentCharacters.map((character) =>
          character.id === updatedCharacter.id ? updatedCharacter : character,
        ),
      )
      setSelectedCharacter(updatedCharacter)
      setCharacterName('')
      setCharacterSurname('')
      setCharacterDescription('')
      setCharacterAge('')
      setCharacterRole('')
      setCharacterImagePath(null)
      setDraftAttributes([{ name: '', value: '' }])
      setDraftHierarchySelections([])
      closeDialog()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const saveAttributeDefinition = async () => {
    const groupName = activeAttributeGroup?.name ?? ''
    const validationError = validateAttributeDefinitionDraft(
      attributeDefinitionDraft,
      groupName,
      editingAttributeDefinitionId,
    )
    if (selectedProject === null || validationError !== null) {
      setFormError(validationError)
      return
    }

    const draftToSave = {
      ...attributeDefinitionDraft,
      groupName,
    }

    try {
      setApiError(null)
      setFormError(null)
      if (editingAttributeDefinitionId === null) {
        const createdDefinition = await createAttributeDefinitionRequest(
          selectedProject.id,
          effectiveAttributeScope,
          draftToSave,
        )
        setAttributeDefinitions((currentDefinitions) => [
          ...currentDefinitions,
          createdDefinition,
        ])
      } else {
        const updatedDefinition = await updateAttributeDefinitionRequest(
          selectedProject.id,
          effectiveAttributeScope,
          editingAttributeDefinitionId,
          draftToSave,
        )
        setAttributeDefinitions((currentDefinitions) =>
          currentDefinitions.map((definition) =>
            definition.id === updatedDefinition.id ? updatedDefinition : definition,
          ),
        )
      }

      setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
      setEditingAttributeDefinitionId(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const editAttributeDefinition = (definition: AttributeDefinition) => {
    setEditingAttributeDefinitionId(definition.id)
    setAttributeDefinitionDraft(toAttributeDefinitionDraft(definition))
  }

  const deleteAttributeDefinition = async (definition: AttributeDefinition) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteAttributeDefinitionRequest(selectedProject.id, definition.id)
      setAttributeDefinitions((currentDefinitions) =>
        currentDefinitions.filter((currentDefinition) => currentDefinition.id !== definition.id),
      )
      if (definition.typeKey === 'characters') {
        const updatedCharacters = await fetchCharacters(selectedProject.id)
        setCharacters(updatedCharacters)
        setSelectedCharacter((currentCharacter) =>
          currentCharacter === null
            ? null
            : updatedCharacters.find((character) => character.id === currentCharacter.id) ?? null,
        )
        setDraftAttributes((currentAttributes) => {
          const nextAttributes = currentAttributes.filter(
            (attribute) =>
              attribute.name.trim().toLowerCase() !== definition.name.trim().toLowerCase(),
          )

          return nextAttributes.length === 0 ? [{ name: '', value: '' }] : nextAttributes
        })
      }
      if (editingAttributeDefinitionId === definition.id) {
        setEditingAttributeDefinitionId(null)
        setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const createAttributeGroup = async () => {
    if (selectedProject === null) {
      return
    }

    const baseName = t.newAttributeGroup
    const existingNames = new Set(attributeGroups.map((group) => group.name.toLowerCase()))
    let nextName = baseName
    let index = 2

    while (existingNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${index}`
      index += 1
    }

    try {
      setApiError(null)
      const createdGroup = await createAttributeGroupRequest(
        selectedProject.id,
        effectiveAttributeScope,
        nextName,
      )
      setAttributeGroups((currentGroups) => [...currentGroups, createdGroup])
      setActiveAttributeGroupId(createdGroup.id)
      setModuleSubTab('attributeGroup')
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const createQuickCatalog = async () => {
    if (selectedProject === null) {
      return
    }

    const baseName = t.newCatalog
    const existingNames = new Set(catalogs.map((catalog) => catalog.name.toLowerCase()))
    let nextName = baseName
    let index = 2

    while (existingNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${index}`
      index += 1
    }

    try {
      setApiError(null)
      setFormError(null)
      const createdCatalog = await createCatalogRequest(selectedProject.id, nextName, '', false)
      setCatalogs((currentCatalogs) => [...currentCatalogs, createdCatalog])
      setActiveCatalogId(createdCatalog.id)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const createCatalogEntryGroup = async () => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    const baseName = t.newAttributeGroup
    const existingNames = new Set(catalogEntryGroups.map((group) => group.name.toLowerCase()))
    let nextName = baseName
    let index = 2

    while (existingNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${index}`
      index += 1
    }

    try {
      setApiError(null)
      setFormError(null)
      const createdGroup = await createCatalogEntryGroupRequest(
        selectedProject.id,
        activeCatalogId,
        nextName,
      )
      setCatalogEntryGroups((currentGroups) => [...currentGroups, createdGroup])
      setCatalogEntryGroupFilter(String(createdGroup.id))
      setCatalogEntryDraft((currentDraft) => ({
        ...currentDraft,
        entryGroupId: String(createdGroup.id),
      }))
      setCatalogPanelPage('group')
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const saveCatalogEntry = async () => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    const nameError = validateName(catalogEntryDraft.name)
    if (nameError !== null) {
      setFormError(nameError)
      return
    }

    if (catalogEntryDraft.description.length > 1000) {
      setFormError(t.validationDescriptionTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      if (editingCatalogEntryId === null) {
        const createdEntry = await createCatalogEntryRequest(
          selectedProject.id,
          activeCatalogId,
          catalogEntryDraft,
        )
        setCatalogEntries((currentEntries) => [...currentEntries, createdEntry])
      } else {
        const updatedEntry = await updateCatalogEntryRequest(
          selectedProject.id,
          activeCatalogId,
          editingCatalogEntryId,
          catalogEntryDraft,
        )
        setCatalogEntries((currentEntries) =>
          currentEntries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
        )
        setActiveCatalogEntryId(updatedEntry.id)
      }

      setCatalogEntryDraft(createEmptyCatalogEntryDraft())
      setEditingCatalogEntryId(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const editCatalogEntry = (entry: CatalogEntry) => {
    setCatalogEntryDraft(toCatalogEntryDraft(entry))
    setEditingCatalogEntryId(entry.id)
    setCatalogPanelPage(entry.entryGroupId === null ? 'catalog' : 'group')
    setCatalogEntryGroupFilter(entry.entryGroupId === null ? '__all__' : String(entry.entryGroupId))
  }

  const cancelCatalogEntryEdit = () => {
    setCatalogEntryDraft(createEmptyCatalogEntryDraft())
    setEditingCatalogEntryId(null)
  }

  const saveCatalogFieldDefinition = async () => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    const nameError = validateName(catalogFieldDraft.name)
    if (nameError !== null) {
      setFormError(nameError)
      return
    }

    const normalizedName = catalogFieldDraft.name.trim().toLowerCase()
    const hasDuplicate = catalogFieldDefinitions.some(
      (field) =>
        field.name.trim().toLowerCase() === normalizedName &&
        field.id !== editingCatalogFieldId,
    )
    if (hasDuplicate) {
      setFormError(t.validationDuplicateDefinition)
      return
    }

    if (catalogFieldDraft.dataType === 'number') {
      const minValue = catalogFieldDraft.minValue.trim() === '' ? null : Number(catalogFieldDraft.minValue)
      const maxValue = catalogFieldDraft.maxValue.trim() === '' ? null : Number(catalogFieldDraft.maxValue)
      if (
        (catalogFieldDraft.minValue.trim() !== '' && Number.isNaN(minValue)) ||
        (catalogFieldDraft.maxValue.trim() !== '' && Number.isNaN(maxValue))
      ) {
        setFormError(t.validationNumber)
        return
      }

      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        setFormError(t.validationRange)
        return
      }
    }

    if (
      catalogFieldDraft.dataType === 'select' &&
      catalogFieldDraft.optionsText
        .split(',')
        .map((option) => option.trim())
        .filter((option) => option.length > 0).length === 0
    ) {
      setFormError(t.validationSelectOptions)
      return
    }

    if (
      (catalogFieldDraft.dataType === 'entryReference' ||
        catalogFieldDraft.dataType === 'multipleEntryReference') &&
      catalogFieldDraft.referenceCatalogId === ''
    ) {
      setFormError(t.catalogFieldReference)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      if (editingCatalogFieldId === null) {
        const createdField = await createCatalogFieldDefinitionRequest(
          selectedProject.id,
          activeCatalogId,
          catalogFieldDraft,
        )
        setCatalogFieldDefinitions((currentFields) => [...currentFields, createdField])
      } else {
        const updatedField = await updateCatalogFieldDefinitionRequest(
          selectedProject.id,
          activeCatalogId,
          editingCatalogFieldId,
          catalogFieldDraft,
        )
        setCatalogFieldDefinitions((currentFields) =>
          currentFields.map((field) => (field.id === updatedField.id ? updatedField : field)),
        )
      }
      setCatalogFieldDraft(createEmptyCatalogFieldDraft())
      setEditingCatalogFieldId(null)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const editCatalogFieldDefinition = (field: CatalogFieldDefinition) => {
    setCatalogFieldDraft(toCatalogFieldDraft(field))
    setEditingCatalogFieldId(field.id)
    setCatalogPanelPage('template')
  }

  const cancelCatalogFieldEdit = () => {
    setCatalogFieldDraft(createEmptyCatalogFieldDraft())
    setEditingCatalogFieldId(null)
  }

  const deleteCatalogFieldDefinition = async (field: CatalogFieldDefinition) => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    try {
      setApiError(null)
      await deleteCatalogFieldDefinitionRequest(selectedProject.id, activeCatalogId, field.id)
      setCatalogFieldDefinitions((currentFields) =>
        currentFields.filter((currentField) => currentField.id !== field.id),
      )
      setCatalogEntries((currentEntries) =>
        currentEntries.map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((value) => value.fieldDefinitionId !== field.id),
        })),
      )
      setCatalogEntryDraft((currentDraft) => {
        const fieldValues = Object.fromEntries(
          Object.entries(currentDraft.fieldValues).filter(
            ([fieldId]) => Number(fieldId) !== field.id,
          ),
        )
        return { ...currentDraft, fieldValues }
      })
      if (editingCatalogFieldId === field.id) {
        cancelCatalogFieldEdit()
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteAttributeGroup = async (group: AttributeGroup) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteAttributeGroupRequest(selectedProject.id, group.id)
      setAttributeGroups((currentGroups) =>
        currentGroups.filter((currentGroup) => currentGroup.id !== group.id),
      )
      const removedDefinitionNames = attributeDefinitions
        .filter((definition) => definition.groupName === group.name)
        .map((definition) => definition.name.trim().toLowerCase())
      setAttributeDefinitions((currentDefinitions) =>
        currentDefinitions.filter((definition) => definition.groupName !== group.name),
      )
      if (group.typeKey === 'characters') {
        const removedNames = new Set(removedDefinitionNames)
        const updatedCharacters = await fetchCharacters(selectedProject.id)
        setCharacters(updatedCharacters)
        setSelectedCharacter((currentCharacter) =>
          currentCharacter === null
            ? null
            : updatedCharacters.find((character) => character.id === currentCharacter.id) ?? null,
        )
        setDraftAttributes((currentAttributes) => {
          const nextAttributes = currentAttributes.filter(
            (attribute) => !removedNames.has(attribute.name.trim().toLowerCase()),
          )

          return nextAttributes.length === 0 ? [{ name: '', value: '' }] : nextAttributes
        })
      }
      if (activeAttributeGroupId === group.id) {
        setActiveAttributeGroupId(null)
        setModuleSubTab('attributes')
        setEditingAttributeDefinitionId(null)
        setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }
  const updateAttributeGroupName = async (group: AttributeGroup, name: string) => {
    if (selectedProject === null) {
      return
    }

    const nextName = name.trim()
    const nameError = validateName(nextName)
    const hasDuplicate = attributeGroups.some((currentGroup) =>
      currentGroup.id !== group.id && currentGroup.name.trim().toLowerCase() === nextName.toLowerCase(),
    )
    if (nameError !== null || hasDuplicate) {
      setFormError(nameError ?? t.validationDuplicateGroup)
      return
    }
    if (nextName === group.name) {
      return
    }

    const previousName = group.name
    setAttributeGroups((currentGroups) =>
      currentGroups.map((currentGroup) =>
        currentGroup.id === group.id ? { ...currentGroup, name: nextName } : currentGroup,
      ),
    )
    setAttributeDefinitions((currentDefinitions) =>
      currentDefinitions.map((definition) =>
        definition.groupName === previousName ? { ...definition, groupName: nextName } : definition,
      ),
    )

    try {
      setApiError(null)
      const updatedGroup = await updateAttributeGroupRequest(
        selectedProject.id,
        effectiveAttributeScope,
        group.id,
        nextName,
      )
      setAttributeGroups((currentGroups) =>
        currentGroups.map((currentGroup) =>
          currentGroup.id === updatedGroup.id ? updatedGroup : currentGroup,
        ),
      )
    } catch {
      setApiError(t.apiUnavailable)
      setAttributeGroups((currentGroups) =>
        currentGroups.map((currentGroup) =>
          currentGroup.id === group.id ? group : currentGroup,
        ),
      )
      setAttributeDefinitions((currentDefinitions) =>
        currentDefinitions.map((definition) =>
          definition.groupName === nextName ? { ...definition, groupName: previousName } : definition,
        ),
      )
    }
  }

  const resetHierarchyNodeDraft = () => {
    setHierarchyNodeName('')
    setHierarchyNodeDescription('')
    setHierarchyNodeParentIds([])
    setEditingHierarchyNodeId(null)
  }

  const createHierarchyGroup = async () => {
    if (selectedProject === null) {
      return
    }

    const baseName = t.newAttributeGroup
    const existingNames = new Set(hierarchyGroups.map((group) => group.name.toLowerCase()))
    let nextName = baseName
    let index = 2

    while (existingNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${index}`
      index += 1
    }

    try {
      setApiError(null)
      const createdGroup = await createHierarchyGroupRequest(selectedProject.id, nextName)
      setHierarchyGroups((currentGroups) => [...currentGroups, createdGroup])
      setActiveHierarchyGroupId(createdGroup.id)
      resetHierarchyNodeDraft()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateHierarchyGroupName = async (group: HierarchyGroup, name: string) => {
    if (selectedProject === null) {
      return
    }

    const nextName = name.trim()
    const nameError = validateName(nextName)
    if (nameError !== null) {
      setFormError(nameError)
      return
    }
    if (nextName === group.name) {
      return
    }

    try {
      setApiError(null)
      const updatedGroup = await updateHierarchyGroupRequest(selectedProject.id, group.id, nextName)
      setHierarchyGroups((currentGroups) =>
        currentGroups.map((currentGroup) =>
          currentGroup.id === updatedGroup.id ? updatedGroup : currentGroup,
        ),
      )
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteHierarchyGroup = async (group: HierarchyGroup) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteHierarchyGroupRequest(selectedProject.id, group.id)
      setHierarchyGroups((currentGroups) =>
        currentGroups.filter((currentGroup) => currentGroup.id !== group.id),
      )
      if (activeHierarchyGroupId === group.id) {
        setActiveHierarchyGroupId(null)
        resetHierarchyNodeDraft()
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const toggleHierarchyParent = (nodeId: number) => {
    setHierarchyNodeParentIds((currentIds) =>
      currentIds.includes(nodeId)
        ? currentIds.filter((currentId) => currentId !== nodeId)
        : [...currentIds, nodeId],
    )
  }

  const editHierarchyNode = (node: HierarchyNode) => {
    setEditingHierarchyNodeId(node.id)
    setHierarchyNodeName(node.name)
    setHierarchyNodeDescription(node.description ?? '')
    setHierarchyNodeParentIds(node.parentNodeIds)
  }

  const saveHierarchyNode = async (event: FormEvent) => {
    event.preventDefault()
    if (selectedProject === null || activeHierarchyGroupId === null) {
      return
    }

    const nameError = validateName(hierarchyNodeName)
    if (nameError !== null) {
      setFormError(nameError)
      return
    }
    if (hierarchyNodeDescription.length > 1000) {
      setFormError(t.validationDescriptionTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      if (editingHierarchyNodeId === null) {
        const createdNode = await createHierarchyNodeRequest(
          selectedProject.id,
          activeHierarchyGroupId,
          hierarchyNodeName.trim(),
          hierarchyNodeDescription,
          hierarchyNodeParentIds,
        )
        setHierarchyNodes((currentNodes) => [...currentNodes, createdNode])
        setHierarchyGroups((currentGroups) =>
          currentGroups.map((group) =>
            group.id === activeHierarchyGroupId
              ? { ...group, nodeCount: group.nodeCount + 1 }
              : group,
          ),
        )
      } else {
        const updatedNode = await updateHierarchyNodeRequest(
          selectedProject.id,
          activeHierarchyGroupId,
          editingHierarchyNodeId,
          hierarchyNodeName.trim(),
          hierarchyNodeDescription,
          hierarchyNodeParentIds,
        )
        setHierarchyNodes((currentNodes) =>
          currentNodes.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
        )
      }
      resetHierarchyNodeDraft()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteHierarchyNode = async (node: HierarchyNode) => {
    if (selectedProject === null || activeHierarchyGroupId === null) {
      return
    }

    try {
      setApiError(null)
      await deleteHierarchyNodeRequest(selectedProject.id, activeHierarchyGroupId, node.id)
      setHierarchyNodes((currentNodes) => currentNodes.filter((currentNode) => currentNode.id !== node.id))
      setHierarchyGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.id === activeHierarchyGroupId
            ? { ...group, nodeCount: Math.max(0, group.nodeCount - 1) }
            : group,
        ),
      )
      if (editingHierarchyNodeId === node.id) {
        resetHierarchyNodeDraft()
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }
  const addMainCharacterAttribute = async () => {
    if (selectedProject === null) {
      return
    }

    const attributeName = newCharacterAttributeName.trim()
    const nameError = validateName(attributeName)
    if (nameError !== null) {
      setFormError(nameError)
      return
    }
    if (draftAttributes.some((attribute) => attribute.name.trim().toLowerCase() === attributeName.toLowerCase())) {
      setFormError(t.validationDuplicateAttribute)
      return
    }

    const existingDefinition = attributeDefinitions.find(
      (definition) => definition.name.trim().toLowerCase() === attributeName.toLowerCase(),
    )

    try {
      setApiError(null)
      setFormError(null)
      if (existingDefinition === undefined) {
        const createdDefinition = await createAttributeDefinitionRequest(
          selectedProject.id,
          'characters',
          {
            ...createEmptyAttributeDefinitionDraft(),
            name: attributeName,
            dataType: newCharacterAttributeDataType,
            optionsText: newCharacterAttributeOptionsText,
          },
        )
        setAttributeDefinitions((currentDefinitions) => [
          ...currentDefinitions,
          createdDefinition,
        ])
      }

      appendDraftAttributes([{ name: attributeName, value: newCharacterAttributeValue }])
      setNewCharacterAttributeName('')
      setNewCharacterAttributeValue('')
      setNewCharacterAttributeDataType('text')
      setNewCharacterAttributeOptionsText('')
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const removeDraftAttributeGroup = (attributeNames: string[]) => {
    const normalizedNames = new Set(
      attributeNames.map((attributeName) => attributeName.trim().toLowerCase()),
    )

    setDraftAttributes((currentAttributes) => {
      const nextAttributes = currentAttributes.filter(
        (attribute) => !normalizedNames.has(attribute.name.trim().toLowerCase()),
      )

      return nextAttributes.length === 0 ? [{ name: '', value: '' }] : nextAttributes
    })
  }
  const removeDraftAttribute = (attributeName: string) => {
    const normalizedName = attributeName.trim().toLowerCase()
    setDraftAttributes((currentAttributes) => {
      const nextAttributes = currentAttributes.filter(
        (attribute) => attribute.name.trim().toLowerCase() !== normalizedName,
      )

      return nextAttributes.length === 0 ? [{ name: '', value: '' }] : nextAttributes
    })
  }

  const toggleCharacterAttributeGroup = (groupKey: string) => {
    setCollapsedCharacterAttributeGroups((currentGroups) =>
      currentGroups.includes(groupKey)
        ? currentGroups.filter((currentGroup) => currentGroup !== groupKey)
        : [...currentGroups, groupKey],
    )
  }
  const toggleDossierAttributeGroup = (groupKey: string) => {
    setCollapsedDossierAttributeGroups((currentGroups) =>
      currentGroups.includes(groupKey)
        ? currentGroups.filter((currentGroup) => currentGroup !== groupKey)
        : [...currentGroups, groupKey],
    )
  }

  const addDraftHierarchySelection = () => {
    const groupId = Number(newHierarchySelectionGroupId)
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return
    }

    setDraftHierarchySelections((currentSelections) =>
      currentSelections.some((selection) => selection.groupId === groupId)
        ? currentSelections
        : [...currentSelections, { groupId, nodeIds: [] }],
    )
    setNewHierarchySelectionGroupId('')
  }

  const updateDraftHierarchySelectionNodes = (groupId: number, nodeIds: number[]) => {
    setDraftHierarchySelections((currentSelections) =>
      currentSelections.map((selection) =>
        selection.groupId === groupId ? { ...selection, nodeIds } : selection,
      ),
    )
  }

  const removeDraftHierarchySelection = (groupId: number) => {
    setDraftHierarchySelections((currentSelections) =>
      currentSelections.filter((selection) => selection.groupId !== groupId),
    )
  }

  const toggleSidebarSection = (section: WorkspaceSection) => {
    setCollapsedSidebarSections((currentSections) =>
      currentSections.includes(section)
        ? currentSections.filter((currentSection) => currentSection !== section)
        : [...currentSections, section],
    )
  }
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesStatus = status === 'All' || status === 'Active'
      const matchesQuery =
        normalizedQuery.length === 0 ||
        project.name.toLowerCase().includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [projects, query, status])

  const statusText = (value: ProjectStatus | 'All') => {
    const translationKey = `status${value}` as keyof typeof t
    return t[translationKey]
  }

  return (
    <main className="project-page" data-theme={theme} data-accent={accent}>
      <header className="project-header">
        <div className="project-heading">
          <p className="eyebrow">{t.appName}</p>
          <div className="project-title-row">
            <h1>{isWorkspace ? selectedProject?.name : t.chooseProject}</h1>
            {isWorkspace && (
              <div className="workspace-tabs project-mode-tabs" role="group" aria-label="Workspace modes">
                {([
                  ['database', t.database],
                  ['relations', t.relations],
                  ['timeline', t.timeline],
                ] as Array<[WorkspaceTab, string]>).map(([tab, label]) => (
                  <button
                    className={workspaceTab === tab ? 'workspace-tab is-active' : 'workspace-tab'}
                    key={tab}
                    type="button"
                    onClick={() => setWorkspaceTab(tab)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          {isWorkspace && (
            <button className="secondary-action" type="button" onClick={() => navigate('/')}>
              {t.backToProjects}
            </button>
          )}
          {!isWorkspace && (
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                setEditingProject(null)
                setProjectName('')
                setProjectCoverImagePath(null)
                setEnabledObjectTypeKeys(['characters'])
                setNewProjectTab('details')
                setDialog('newProject')
              }}
            >
              {t.newProject}
            </button>
          )}
          <button
            className="secondary-action"
            type="button"
            onClick={() => setDialog('settings')}
          >
            {t.settings}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setDialog('auth')}
          >
            {t.auth}
          </button>
        </div>
      </header>

      {!isWorkspace && (
        <>
          <section className="toolbar" aria-label="Project filters">
            <label className="search-field">
              <span>{t.search}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
              />
            </label>

            <div className="status-tabs" role="group" aria-label={t.statusLabel}>
              {statuses.map((item) => (
                <button
                  className={item === status ? 'status-tab is-active' : 'status-tab'}
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                >
                  {statusText(item)}
                </button>
              ))}
            </div>
          </section>

            {apiError !== null && (
              <section className="empty-state" aria-live="polite">
                <h2>{apiError}</h2>
              </section>
            )}

            {isLoading && (
              <section className="empty-state" aria-live="polite">
                <h2>{t.loading}</h2>
              </section>
            )}

            <section className="project-grid" aria-label="Available projects">
              {visibleProjects.map((project) => (
                <ProjectCard
                  activeMenuId={activeProjectMenuId}
                  key={project.id}
                  project={project}
                  t={t}
                  onDelete={requestDeleteProject}
                  onEdit={openEditProject}
                  onMenuToggle={(projectId) =>
                    setActiveProjectMenuId((currentId) =>
                      currentId === projectId ? null : projectId,
                    )
                  }
                  onOpen={(projectToOpen) => void openProject(projectToOpen)}
                  statusText={statusText}
                />
            ))}
          </section>

          {visibleProjects.length === 0 && (
            <section className="empty-state" aria-live="polite">
              <h2>{t.noProjects}</h2>
              <p>{t.noProjectsHint}</p>
            </section>
          )}
        </>
      )}

      {isWorkspace && (
        <section className="workspace-shell">
          <aside className="workspace-sidebar" aria-label="Database categories">
            {enabledWorkspaceSections
              .filter((section) => section !== 'catalogs')
              .map((section) => {
              const isCollapsed = collapsedSidebarSections.includes(section)
              const isSectionActive = workspaceSection === section
              const sectionLabel = t[section]

              return (
                <div
                  className="sidebar-group"
                  key={section}
                >
                  <button
                    className={isSectionActive ? 'sidebar-button is-active' : 'sidebar-button'}
                    type="button"
                    onClick={() => {
                      setWorkspaceTab('database')
                      setWorkspaceSection(section)
                      setFormError(null)
                      setModuleSubTab('cards')
                    }}
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={isCollapsed ? 'sidebar-chevron is-collapsed' : 'sidebar-chevron'}
                      size={16}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleSidebarSection(section)
                      }}
                    />
                    <span>{sectionLabel}</span>
                  </button>

                  {section === 'hierarchy' && !isCollapsed && (
                    <div className="sidebar-subnav" role="group" aria-label={t.hierarchy}>
                      {hierarchyGroups.map((group) => (
                        <button
                          className={
                            isSectionActive && activeHierarchyGroupId === group.id
                              ? 'sidebar-subbutton is-active'
                              : 'sidebar-subbutton'
                          }
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setWorkspaceTab('database')
                            setWorkspaceSection('hierarchy')
                            setActiveHierarchyGroupId(group.id)
                            resetHierarchyNodeDraft()
                          }}
                        >
                          {group.name}
                        </button>
                      ))}
                      <button
                        className="sidebar-subbutton create-subbutton"
                        type="button"
                        onClick={() => {
                          setWorkspaceTab('database')
                          setWorkspaceSection('hierarchy')
                          void createHierarchyGroup()
                        }}
                      >
                        + {t.createAttributeGroup}
                      </button>
                    </div>
                  )}

                </div>
              )
            })}
            <CatalogSidebarSection
              activeAttributeGroupId={activeAttributeGroupId}
              activeCatalogId={activeCatalogId}
              attributeGroups={attributeGroups}
              catalogEntryGroupFilter={catalogEntryGroupFilter}
              catalogEntryGroups={catalogEntryGroups}
              catalogs={catalogs}
              moduleSubTab={moduleSubTab}
              t={t}
              workspaceSection={workspaceSection}
              onCreateAttributeGroup={() => void createAttributeGroup()}
              onCreateCatalog={() => {
                setWorkspaceTab('database')
                setWorkspaceSection('catalogs')
                setCatalogPanelPage('catalog')
                setActiveCatalogEntryId(null)
                void createQuickCatalog()
              }}
              onCreateCatalogEntryGroup={() => void createCatalogEntryGroup()}
              onOpenAttributeGroup={(groupId) => {
                setWorkspaceTab('database')
                setWorkspaceSection('attributes')
                setActiveAttributeGroupId(groupId)
                setModuleSubTab(groupId === null ? 'attributes' : 'attributeGroup')
                setEditingAttributeDefinitionId(null)
                setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
              }}
              onOpenAttributes={() => {
                setWorkspaceTab('database')
                setWorkspaceSection('attributes')
                setActiveAttributeGroupId(null)
                setModuleSubTab('attributes')
                setEditingAttributeDefinitionId(null)
                setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
              }}
              onOpenCatalog={(catalogId) => {
                setWorkspaceTab('database')
                setWorkspaceSection('catalogs')
                setActiveCatalogId(catalogId)
                setCatalogEntryGroupFilter('__all__')
                setCatalogPanelPage('catalog')
                setActiveCatalogEntryId(null)
                cancelInlineNameEdit()
              }}
              onOpenCatalogEntryGroup={(groupId) => {
                setCatalogEntryGroupFilter(String(groupId))
                setCatalogPanelPage('group')
                setActiveCatalogEntryId(null)
                cancelInlineNameEdit()
              }}
            />
          </aside>

          <section className="workspace-main">
            <header className="workspace-toolbar">
              <div className="workspace-actions">
                {workspaceTab === 'database' &&
                  workspaceSection === 'characters' &&
                  moduleSubTab === 'cards' && (
                  <button
                    className="primary-action compact"
                    type="button"
                    onClick={() => {
                      setEditingCharacter(null)
                      setCharacterName('')
                      setCharacterSurname('')
                      setCharacterDescription('')
                      setCharacterAge('')
                      setCharacterRole('')
                      setCharacterImagePath(null)
                      setIsAttributePickerOpen(false)
                      setIsCharacterAttributesExpanded(true)
                      setIsCharacterHierarchyExpanded(true)
                      setDraftHierarchySelections([])
                      setNewHierarchySelectionGroupId('')
                      setNewCharacterAttributeName('')
                      setNewCharacterAttributeValue('')
                      setNewCharacterAttributeDataType('text')
                      setNewCharacterAttributeOptionsText('')
                      setCollapsedCharacterAttributeGroups([])
                      setCollapsedDossierAttributeGroups([])
                      setDraftAttributes([{ name: '', value: '' }])
                      setDialog('newCharacter')
                    }}
                  >
                    {t.newCharacter}
                  </button>
                )}
                <div className="layout-toggle" role="group" aria-label="Layout">
                  <button
                    className={layoutMode === 'grid' ? 'layout-button is-active' : 'layout-button'}
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                  >
                    {t.gridView}
                  </button>
                  <button
                    className={layoutMode === 'list' ? 'layout-button is-active' : 'layout-button'}
                    type="button"
                    onClick={() => setLayoutMode('list')}
                  >
                    {t.listView}
                  </button>
                </div>
              </div>
            </header>

            {workspaceTab === 'database' &&
              workspaceSection === 'attributes' &&
              (moduleSubTab === 'attributes' || moduleSubTab === 'attributeGroup') &&
              formError !== null && (
                <div className="form-error" role="alert">
                  {formError}
                </div>
              )}

            {workspaceTab === 'database' &&
              workspaceSection === 'attributes' &&
              (moduleSubTab === 'attributes' || moduleSubTab === 'attributeGroup') && (
                <AttributeDefinitionsPanel
                  activeGroup={moduleSubTab === 'attributeGroup' ? activeAttributeGroup : null}
                  activeScope={effectiveAttributeScope}
                  attributeScopes={enabledAttributeScopes}
                  definitions={attributeDefinitions}
                  draft={attributeDefinitionDraft}
                  editingDefinitionId={editingAttributeDefinitionId}
                  t={t}
                  onCancelEdit={() => {
                    setEditingAttributeDefinitionId(null)
                    setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
                  }}
                  onDelete={(definition) => void deleteAttributeDefinition(definition)}
                  onDeleteGroup={(group) => void deleteAttributeGroup(group)}
                  onDraftChange={setAttributeDefinitionDraft}
                  onEdit={editAttributeDefinition}
                  onGroupNameChange={(group, name) => void updateAttributeGroupName(group, name)}
                  onScopeChange={(scope) => {
                    setAttributeScope(scope as ObjectTypeKey)
                    setActiveAttributeGroupId(null)
                    setModuleSubTab('attributes')
                    setEditingAttributeDefinitionId(null)
                    setAttributeDefinitionDraft(createEmptyAttributeDefinitionDraft())
                  }}
                  onSubmit={() => void saveAttributeDefinition()}
                />
              )}

            {workspaceTab === 'database' && workspaceSection === 'hierarchy' && (
              <HierarchyPanel
                activeGroup={activeHierarchyGroup}
                editingNodeId={editingHierarchyNodeId}
                nodeDescription={hierarchyNodeDescription}
                nodeName={hierarchyNodeName}
                nodeParentIds={hierarchyNodeParentIds}
                nodes={hierarchyNodes}
                t={t}
                onCreateGroup={() => void createHierarchyGroup()}
                onDeleteGroup={(group) => void deleteHierarchyGroup(group)}
                onDeleteNode={(node) => void deleteHierarchyNode(node)}
                onEditNode={editHierarchyNode}
                onGroupNameChange={(group, name) => void updateHierarchyGroupName(group, name)}
                onNodeDescriptionChange={setHierarchyNodeDescription}
                onNodeNameChange={setHierarchyNodeName}
                onResetNodeDraft={resetHierarchyNodeDraft}
                onSaveNode={saveHierarchyNode}
                onToggleParent={toggleHierarchyParent}
              />
            )}

            {workspaceTab === 'database' && workspaceSection === 'catalogs' && (
              <CatalogPanel
                activeCatalogEntryMenuId={activeCatalogEntryMenuId}
                activeCatalog={activeCatalog}
                activeCatalogEntry={activeCatalogEntry}
                activeCatalogEntryGroup={activeCatalogEntryGroup}
                catalogEntries={visibleCatalogEntries}
                catalogEntryGroups={catalogEntryGroups}
                catalogEntryDraft={catalogEntryDraft}
                catalogFieldDraft={catalogFieldDraft}
                catalogFields={catalogFieldDefinitions}
                catalogs={catalogs}
                formError={formError}
                layoutMode={layoutMode}
                nameDraft={inlineNameDraft}
                nameEdit={inlineNameEdit}
                editingCatalogEntryId={editingCatalogEntryId}
                editingCatalogFieldId={editingCatalogFieldId}
                page={catalogPanelPage}
                t={t}
                onBackToCatalog={() => {
                  setCatalogPanelPage('catalog')
                  setActiveCatalogEntryId(null)
                  setActiveCatalogEntryMenuId(null)
                  setCatalogEntryGroupFilter('__all__')
                }}
                onCancelCatalogEntryEdit={cancelCatalogEntryEdit}
                onCancelCatalogFieldEdit={cancelCatalogFieldEdit}
                onCancelNameEdit={cancelInlineNameEdit}
                onCatalogEntryDraftChange={setCatalogEntryDraft}
                onCreateCatalogEntry={() => void saveCatalogEntry()}
                onCreateCatalogEntryGroup={() => void createCatalogEntryGroup()}
                onCreateCatalogField={() => void saveCatalogFieldDefinition()}
                onDeleteCatalog={requestDeleteCatalog}
                onDeleteCatalogEntry={requestDeleteCatalogEntry}
                onDeleteCatalogEntryGroup={requestDeleteCatalogEntryGroup}
                onDeleteCatalogField={(field) => void deleteCatalogFieldDefinition(field)}
                onEditCatalogEntry={editCatalogEntry}
                onEditCatalogField={editCatalogFieldDefinition}
                onImageUploadError={() => setApiError(t.imageUploadFailed)}
                onCatalogEntryMenuToggle={(entryId) =>
                  setActiveCatalogEntryMenuId((currentId) =>
                    currentId === entryId ? null : entryId,
                  )
                }
                onCatalogFieldDraftChange={setCatalogFieldDraft}
                onNameDraftChange={setInlineNameDraft}
                onOpenCatalogEntry={(entry) => {
                  setActiveCatalogEntryId(entry.id)
                  setCatalogPanelPage('entry')
                  setActiveCatalogEntryMenuId(null)
                }}
                onSaveNameEdit={() => void saveInlineNameEdit()}
                onStartNameEdit={startInlineNameEdit}
                onShowTemplate={() => {
                  setCatalogPanelPage('template')
                  setActiveCatalogEntryId(null)
                  setActiveCatalogEntryMenuId(null)
                }}
              />
            )}

            {moduleSubTab === 'cards' && workspaceSection !== 'hierarchy' && workspaceSection !== 'catalogs' && (
              <div className={layoutMode === 'grid' ? 'folder-view grid' : 'folder-view list'}>
              {workspaceTab === 'database' &&
                workspaceSection === 'characters' &&
                characters.map((character) => (
                  <ObjectCard
                    activeMenuId={activeObjectMenuId}
                    key={character.id}
                    storyObject={character}
                    t={t}
                    onDelete={requestDeleteObject}
                    onEdit={openEditCharacter}
                    onMenuToggle={(objectId) =>
                      setActiveObjectMenuId((currentId) =>
                        currentId === objectId ? null : objectId,
                      )
                    }
                    onOpen={(storyObject) => {
                      setSelectedCharacter(storyObject)
                      setDialog('character')
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      {dialog !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeDialog}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <p className="panel-kicker">
                  {dialog === 'settings'
                    ? t.appearance
                    : dialog === 'auth'
                      ? t.authTitle
                      : dialog === 'newProject' || dialog === 'editProject'
                        ? t.newProject
                        : dialog === 'newCharacter' || dialog === 'editCharacter'
                          ? t.newCharacter
                          : t.dossier}
                </p>
                <h2 id="modal-title">
                  {dialog === 'settings'
                    ? t.interfaceLanguage
                    : dialog === 'auth'
                      ? t.signInPlaceholder
                      : dialog === 'editProject'
                        ? t.editProject
                        : dialog === 'newProject'
                        ? t.newProject
                        : dialog === 'editCharacter'
                          ? t.editCharacter
                        : dialog === 'newCharacter'
                          ? t.newCharacter
                          : selectedCharacter?.name}
                </h2>
              </div>
              <div className="modal-actions">
                {dialog === 'character' && (
                  <button
                    className="icon-action"
                    type="button"
                    aria-label={t.edit}
                    title={t.edit}
                    onClick={() => {
                      if (selectedCharacter !== null) {
                        openEditCharacter(selectedCharacter)
                      }
                    }}
                  >
                    <Pencil size={18} strokeWidth={2.2} />
                  </button>
                )}
                <button className="close-button" type="button" onClick={closeDialog}>
                  {t.close}
                </button>
              </div>
            </header>

            {formError !== null && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}

            {dialog === 'settings' && (
              <div className="settings-stack">
                <section className="settings-block">
                  <p className="setting-label">{t.interfaceLanguage}</p>
                  <div className="option-row" role="group" aria-label={t.interfaceLanguage}>
                    <button
                      className={language === 'en' ? 'setting-option is-active' : 'setting-option'}
                      type="button"
                      onClick={() => setLanguage('en')}
                    >
                      {t.english}
                    </button>
                    <button
                      className={language === 'ru' ? 'setting-option is-active' : 'setting-option'}
                      type="button"
                      onClick={() => setLanguage('ru')}
                    >
                      {t.russian}
                    </button>
                  </div>
                </section>

                <section className="settings-block">
                  <p className="setting-label">{t.theme}</p>
                  <div className="option-row" role="group" aria-label={t.theme}>
                    <button
                      className={theme === 'light' ? 'setting-option is-active' : 'setting-option'}
                      type="button"
                      onClick={() => setTheme('light')}
                    >
                      {t.lightTheme}
                    </button>
                    <button
                      className={theme === 'dark' ? 'setting-option is-active' : 'setting-option'}
                      type="button"
                      onClick={() => setTheme('dark')}
                    >
                      {t.darkTheme}
                    </button>
                  </div>
                </section>

                <section className="settings-block">
                  <p className="setting-label">{t.accent}</p>
                  <div className="option-row" role="group" aria-label={t.accent}>
                    <button
                      className={
                        accent === 'forest'
                          ? 'setting-option swatch-option is-active'
                          : 'setting-option swatch-option'
                      }
                      type="button"
                      onClick={() => setAccent('forest')}
                    >
                      <span className="swatch forest" aria-hidden="true" />
                      {t.forestAccent}
                    </button>
                    <button
                      className={
                        accent === 'ember'
                          ? 'setting-option swatch-option is-active'
                          : 'setting-option swatch-option'
                      }
                      type="button"
                      onClick={() => setAccent('ember')}
                    >
                      <span className="swatch ember" aria-hidden="true" />
                      {t.emberAccent}
                    </button>
                    <button
                      className={
                        accent === 'indigo'
                          ? 'setting-option swatch-option is-active'
                          : 'setting-option swatch-option'
                      }
                      type="button"
                      onClick={() => setAccent('indigo')}
                    >
                      <span className="swatch indigo" aria-hidden="true" />
                      {t.indigoAccent}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {dialog === 'auth' && <p className="auth-note">{t.authSubtitle}</p>}

            {dialog === 'character' && selectedCharacter !== null && (
              <section className="character-dossier">
                {resolveAssetUrl(selectedCharacter.imagePath) === null ? (
                  <div className="character-portrait dossier-portrait" aria-hidden="true">
                    {selectedCharacter.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </div>
                ) : (
                  <div className="character-portrait dossier-portrait" aria-hidden="true">
                    <img src={resolveAssetUrl(selectedCharacter.imagePath) ?? undefined} alt="" />
                  </div>
                )}
                <div className="dossier-fields">
                  <div>
                    <p className="setting-label">{t.characters}</p>
                    <h3>
                      {selectedCharacter.name}
                      {selectedCharacter.surname !== null && (
                        <span className="dossier-surname"> {selectedCharacter.surname}</span>
                      )}
                    </h3>
                  </div>
                  <dl className="character-detail-summary">
                    <div>
                      <dt>{t.characterAge}</dt>
                      <dd>{selectedCharacter.age ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>{t.characterRole}</dt>
                      <dd>{selectedCharacter.role ?? '-'}</dd>
                    </div>
                  </dl>
                  <div>
                    <p className="setting-label">{t.description}</p>
                    <p>{selectedCharacter.description}</p>
                  </div>
                  <div className="dossier-data-blocks">
                  {dossierAttributeGroups.length > 0 && (
                    <section className="dossier-attributes-section">
                      <h4>{t.attributes}</h4>
                      <div className="dossier-attribute-groups">
                        {dossierAttributeGroups.map((group) => {
                          const isCollapsed = collapsedDossierAttributeGroups.includes(group.key)

                          return (
                            <section className="dossier-attribute-group" key={group.key}>
                              <button
                                className="dossier-attribute-group-header"
                                type="button"
                                onClick={() => toggleDossierAttributeGroup(group.key)}
                              >
                                <span>{isCollapsed ? '>' : 'v'}</span>
                                <strong>{group.name}</strong>
                                <small>{group.attributes.length}</small>
                              </button>

                              {!isCollapsed && (
                                <dl className="attribute-list grouped">
                                  {group.attributes.map((attribute) => (
                                    <div key={attribute.id}>
                                      <dt>{attribute.name}</dt>
                                      <dd>{attribute.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </section>
                          )
                        })}
                      </div>
                    </section>
                  )}
                  {selectedCharacter.hierarchySelections.length > 0 && (
                    <section className="dossier-attributes-section">
                      <h4>{t.hierarchy}</h4>
                      <div className="dossier-attribute-groups">
                        {selectedCharacter.hierarchySelections.map((selection) => (
                          <section className="dossier-attribute-group" key={selection.groupId}>
                            <div className="dossier-attribute-group-header static-heading">
                              <span>v</span>
                              <strong>{selection.groupName}</strong>
                              <small>{selection.nodes.length}</small>
                            </div>
                            <dl className="attribute-list grouped">
                              <div>
                                <dt>{t.hierarchyNodes}</dt>
                                <dd>{selection.nodes.map((node) => node.name).join(', ')}</dd>
                              </div>
                            </dl>
                          </section>
                        ))}
                      </div>
                    </section>
                  )}
                  </div>
                </div>
              </section>
            )}

            {(dialog === 'newCharacter' || dialog === 'editCharacter') && (
              <form
                className="new-project-details"
                onSubmit={dialog === 'editCharacter' ? updateCharacter : createCharacter}
              >
                <ImageDropzone
                  imagePath={characterImagePath}
                  label={t.cover}
                  placeholder={t.coverDropzone}
                  onChange={setCharacterImagePath}
                  onError={() => setApiError(t.imageUploadFailed)}
                />

                <div className="character-detail-fields">
                  <label className="project-name-field">
                    <span>{t.characterName}</span>
                    <input
                      type="text"
                      value={characterName}
                      onChange={(event) => setCharacterName(event.target.value)}
                      placeholder={t.characterNamePlaceholder}
                    />
                  </label>

                  <label className="project-name-field">
                    <span>{t.characterSurname}</span>
                    <input
                      type="text"
                      value={characterSurname}
                      onChange={(event) => setCharacterSurname(event.target.value)}
                      placeholder={t.characterSurnamePlaceholder}
                    />
                  </label>

                  <label className="project-name-field">
                    <span>{t.characterAge}</span>
                    <input
                      type="text"
                      value={characterAge}
                      onChange={(event) => setCharacterAge(event.target.value)}
                      placeholder={t.characterAgePlaceholder}
                    />
                  </label>

                  <label className="project-name-field">
                    <span>{t.characterRole}</span>
                    <input
                      type="text"
                      value={characterRole}
                      onChange={(event) => setCharacterRole(event.target.value)}
                      placeholder={t.characterRolePlaceholder}
                    />
                  </label>
                </div>

                <label className="project-name-field character-description-field">
                  <span>{t.description}</span>
                  <textarea
                    value={characterDescription}
                    onChange={(event) => setCharacterDescription(event.target.value)}
                    placeholder={t.descriptionPlaceholder}
                  />
                </label>

                <div className="character-data-blocks">
                <section className="attribute-editor collapsible-block">
                  <div className="attribute-editor-header">
                    <button
                      className="collapse-heading"
                      type="button"
                      onClick={() =>
                        setIsCharacterAttributesExpanded((isExpanded) => !isExpanded)
                      }
                    >
                      {t.attributes}
                    </button>
                    <button
                      className="secondary-action compact"
                      type="button"
                      onClick={() => setIsAttributePickerOpen((isOpen) => !isOpen)}
                    >
                      {t.addGroupToCharacter}
                    </button>
                  </div>

                  {isCharacterAttributesExpanded && (
                    <div className="attribute-editor-body">
                      {isAttributePickerOpen && (
                        <section className="attribute-picker-modal" aria-label={t.addGroupToCharacter}>
                          <div className="attribute-picker-list">
                            {attributeGroupsWithMain.map((group) => {
                              const groupDefinitions = attributeDefinitions.filter((definition) =>
                                group.id === 0
                                  ? definition.groupName === null
                                  : definition.groupName === group.name,
                              )

                              return (
                                <button
                                  key={group.id}
                                  type="button"
                                  onClick={() => {
                                    appendDraftAttributes(
                                      groupDefinitions.map((definition) => ({
                                        name: definition.name,
                                        value: '',
                                      })),
                                    )
                                    setIsAttributePickerOpen(false)
                                  }}
                                >
                                  <span>{group.name}</span>
                                  <small>{groupDefinitions.length}</small>
                                </button>
                              )
                            })}
                          </div>
                        </section>
                      )}

                      {[
                        ...(characterAttributeGroups.some((group) => group.key === '__main__')
                          ? []
                          : [{ key: '__main__', name: t.primaryAttributeGroup, attributes: [] }]),
                        ...characterAttributeGroups,
                      ].map((group) => {
                        const isCollapsed = collapsedCharacterAttributeGroups.includes(group.key)

                        return (
                          <section className="character-attribute-group" key={group.key}>
                            <div className="character-attribute-group-header-row">
                              <button
                                className="character-attribute-group-header"
                                type="button"
                                onClick={() => toggleCharacterAttributeGroup(group.key)}
                              >
                                <span>{isCollapsed ? '>' : 'v'}</span>
                                <strong>{group.name}</strong>
                                <small>{group.attributes.length}</small>
                              </button>
                              {group.key !== '__main__' && (
                                <button
                                  className="secondary-action compact danger-action"
                                  type="button"
                                  onClick={() =>
                                    removeDraftAttributeGroup(
                                      group.attributes.map((attribute) => attribute.name),
                                    )
                                  }
                                >
                                  {t.removeAttributeGroupFromCharacter}
                                </button>
                              )}
                            </div>

                            {!isCollapsed && (
                              <div className="character-attribute-group-content">
                                {group.attributes.map((attribute) => (
                                  <div className="attribute-row" key={attribute.name}>
                                    <span className="attribute-name-pill">{attribute.name}</span>
                                    <input
                                      type="text"
                                      value={attribute.value}
                                      onChange={(event) => {
                                        const normalizedName = attribute.name.trim().toLowerCase()
                                        setDraftAttributes((currentAttributes) =>
                                          currentAttributes.map((currentAttribute) =>
                                            currentAttribute.name.trim().toLowerCase() === normalizedName
                                              ? { ...currentAttribute, value: event.target.value }
                                              : currentAttribute,
                                          ),
                                        )
                                      }}
                                      placeholder={t.attributeValue}
                                    />
                                    <button
                                      className="icon-action danger-icon"
                                      type="button"
                                      aria-label={t.delete}
                                      title={t.delete}
                                      onClick={() => removeDraftAttribute(attribute.name)}
                                    >
                                      <Trash2 size={16} strokeWidth={2.2} />
                                    </button>
                                  </div>
                                ))}

                                {group.key === '__main__' && (
                                  <div className="attribute-row new-attribute-row">
                                    <input
                                      list="character-attribute-definitions"
                                      type="text"
                                      value={newCharacterAttributeName}
                                      onChange={(event) => setNewCharacterAttributeName(event.target.value)}
                                      placeholder={t.attributeName}
                                    />
                                    <select
                                      value={newCharacterAttributeDataType}
                                      onChange={(event) =>
                                        setNewCharacterAttributeDataType(
                                          event.target.value as AttributeDataType,
                                        )
                                      }
                                    >
                                      {(['text', 'number', 'select'] as AttributeDataType[]).map((dataType) => (
                                        <option key={dataType} value={dataType}>
                                          {t[`attributeType${dataType}`]}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={newCharacterAttributeValue}
                                      onChange={(event) => setNewCharacterAttributeValue(event.target.value)}
                                      placeholder={t.attributeValue}
                                    />
                                    <div className="attribute-row-actions">
                                      <button
                                        className="icon-action"
                                        type="button"
                                        aria-label={t.confirmAttribute}
                                        title={t.confirmAttribute}
                                        onClick={() => void addMainCharacterAttribute()}
                                      >
                                        <Check size={17} strokeWidth={2.4} />
                                      </button>
                                      <button
                                        className="icon-action danger-icon"
                                        type="button"
                                        aria-label={t.delete}
                                        title={t.delete}
                                        onClick={() => {
                                          setNewCharacterAttributeName('')
                                          setNewCharacterAttributeValue('')
                                          setNewCharacterAttributeDataType('text')
                                          setNewCharacterAttributeOptionsText('')
                                        }}
                                      >
                                        <Trash2 size={16} strokeWidth={2.2} />
                                      </button>
                                    </div>
                                    {newCharacterAttributeDataType === 'select' && (
                                      <input
                                        className="attribute-options-input"
                                        type="text"
                                        value={newCharacterAttributeOptionsText}
                                        onChange={(event) =>
                                          setNewCharacterAttributeOptionsText(event.target.value)
                                        }
                                        placeholder={t.attributeOptionsPlaceholder}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </section>
                        )
                      })}

                      <datalist id="character-attribute-definitions">
                        {attributeDefinitions.map((definition) => (
                          <option key={definition.id} value={definition.name} />
                        ))}
                      </datalist>
                    </div>
                  )}
                </section>
                {isHierarchyModuleEnabled && (
                  <section className="attribute-editor collapsible-block">
                    <div className="attribute-editor-header">
                      <button
                        className="collapse-heading"
                        type="button"
                        onClick={() =>
                          setIsCharacterHierarchyExpanded((isExpanded) => !isExpanded)
                        }
                      >
                        {t.hierarchy}
                      </button>
                      <div className="hierarchy-selection-add">
                        <select
                          value={newHierarchySelectionGroupId}
                          onChange={(event) => setNewHierarchySelectionGroupId(event.target.value)}
                        >
                          <option value="">{t.addGroupToCharacter}</option>
                          {availableHierarchyGroupsForCharacter.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="secondary-action compact"
                          type="button"
                          onClick={addDraftHierarchySelection}
                        >
                          {t.addGroupToCharacter}
                        </button>
                      </div>
                    </div>

                    {isCharacterHierarchyExpanded && (
                      <div className="attribute-editor-body">
                        {draftHierarchySelectionsWithDetails.length === 0 && (
                          <p className="empty-state compact">{t.noHierarchyGroups}</p>
                        )}
                        {draftHierarchySelectionsWithDetails.map((selection) => (
                          <section className="character-attribute-group" key={selection.groupId}>
                            <div className="character-attribute-group-header-row">
                              <div className="character-attribute-group-header static-heading">
                                <span>v</span>
                                <strong>{selection.group?.name}</strong>
                                <small>{selection.nodeIds.length}</small>
                              </div>
                              <button
                                className="secondary-action compact danger-action"
                                type="button"
                                onClick={() => removeDraftHierarchySelection(selection.groupId)}
                              >
                                {t.removeAttributeGroupFromCharacter}
                              </button>
                            </div>
                            <label className="hierarchy-selection-field">
                              <span>{t.hierarchyNodes}</span>
                              <select
                                multiple
                                value={selection.nodeIds.map(String)}
                                onChange={(event) =>
                                  updateDraftHierarchySelectionNodes(
                                    selection.groupId,
                                    Array.from(event.target.selectedOptions).map((option) =>
                                      Number(option.value),
                                    ),
                                  )
                                }
                              >
                                {selection.nodes.map((node) => (
                                  <option key={node.id} value={node.id}>
                                    {node.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </section>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                </div>
                <button className="primary-action" type="submit">
                  {dialog === 'editCharacter' ? t.save : t.createCharacter}
                </button>
              </form>
            )}

            {(dialog === 'newProject' || dialog === 'editProject') && (
              <form
                className="new-project-panel"
                onSubmit={dialog === 'editProject' ? updateProject : createProject}
              >
                <div className="modal-tabs" role="group" aria-label={t.newProject}>
                  <button
                    className={
                      newProjectTab === 'details' ? 'modal-tab is-active' : 'modal-tab'
                    }
                    type="button"
                    onClick={() => setNewProjectTab('details')}
                  >
                    {t.projectDetails}
                  </button>
                  <button
                    className={
                      newProjectTab === 'modules' ? 'modal-tab is-active' : 'modal-tab'
                    }
                    type="button"
                    onClick={() => setNewProjectTab('modules')}
                  >
                    {t.databaseModules}
                  </button>
                </div>

                {newProjectTab === 'details' && (
                  <section className="new-project-details">
                    <label className="project-name-field">
                      <span>{t.projectName}</span>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder={t.projectNamePlaceholder}
                      />
                    </label>

                    <ImageDropzone
                      imagePath={projectCoverImagePath}
                      label={t.cover}
                      placeholder={t.coverDropzone}
                      onChange={setProjectCoverImagePath}
                      onError={() => setApiError(t.imageUploadFailed)}
                    />
                  </section>
                )}

                {newProjectTab === 'modules' && (
                  <DatabaseModulesPanel
                    enabledKeys={enabledObjectTypeKeys}
                    t={t}
                    onChange={(keys) => setEnabledObjectTypeKeys(normalizeObjectTypeKeys(keys))}
                  />
                )}
                <button className="primary-action" type="submit">
                  {dialog === 'editProject' ? t.save : t.createProject}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      <ConfirmDeleteDialog
        pendingDelete={pendingDelete}
        t={t}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StoryDbApp />} />
        <Route path="/projects/:projectId" element={<StoryDbApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
