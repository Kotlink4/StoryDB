import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  addObjectGalleryImageRequest,
  createAttributeDefinitionRequest,
  createAttributeGroupRequest,
  createCatalogEntryRequest,
  createCatalogEntryGroupRequest,
  createCatalogRequest,
  createObjectRequest,
  createTimelineEventRequest,
  deleteAttributeDefinitionRequest,
  deleteAttributeGroupRequest,
  deleteCatalogEntryRequest,
  deleteObjectGalleryImageRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogRequest,
  deleteObjectRequest,
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogs,
  fetchCatalogEntries,
  fetchCatalogFieldDefinitions,
  fetchCatalogEntryGroups,
  fetchCurrentUser,
  fetchObject,
  fetchObjects,
  fetchProjects,
  fetchTimelineEvents,
  loginRequest,
  logoutRequest,
  registerRequest,
  resolveAssetUrl,
  updateObjectRequest,
  updateAttributeDefinitionRequest,
  updateAttributeGroupRequest,
  updateCatalogEntryRequest,
  updateCatalogEntryGroupRequest,
  updateCatalogRequest,
  uploadImageRequest,
} from './api'
import type {
  AuthUser,
  AttributeDataType,
  AttributeDefinition,
  AttributeDefinitionDraft,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectAttribute,
  ObjectTypeKey,
  StoryObject,
  StoryProject,
  TimelineEvent,
  TimelineEventDraft,
} from './types'
import './StylePreview.css'

type PreviewTab = 'database' | 'relations' | 'timeline'
type DetailMode = 'panel' | 'modal' | 'page'
type GroupDisplayMode = 'blocks' | 'subtabs'
type PreviewTheme = 'light' | 'dark'
type PreviewLanguage = 'ru' | 'en'
type PreviewSection = ObjectTypeKey | 'attributes' | 'catalogs'
type ObjectEditorTab = 'main' | 'attributes' | 'catalogs' | 'hierarchy' | 'relations' | 'timeline'
type ObjectDossierTab = 'main' | 'relations' | 'timeline' | 'gallery'
type PreviewDialogKind =
  | 'auth'
  | 'object'
  | 'profile'
  | 'detail'
  | 'objectLegacy'
  | 'confirmDeleteObject'
  | 'attributeGroup'
  | 'confirmDeleteAttribute'
  | 'confirmDeleteAttributeGroup'
  | 'catalog'
  | 'catalogGroup'
  | 'confirmDeleteCatalog'
  | 'confirmDeleteCatalogGroup'
  | 'catalogEntry'
  | 'catalogEntryDetail'
  | 'confirmDeleteCatalogEntry'
  | 'timelineEvent'
  | null

const emptyAttributeDefinitionDraft: AttributeDefinitionDraft = {
  name: '',
  dataType: 'text',
  groupName: '',
  minValue: '',
  maxValue: '',
  unit: '',
  optionsText: '',
}

const attributeDataTypeLabels: Record<AttributeDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
}

const objectSections: Array<{ key: ObjectTypeKey; labelKey: 'characters' | 'items' | 'places' | 'organizations'; icon: 'characters' | 'items' | 'places' | 'organizations' }> = [
  { key: 'characters', labelKey: 'characters', icon: 'characters' },
  { key: 'items', labelKey: 'items', icon: 'items' },
  { key: 'places', labelKey: 'places', icon: 'places' },
  { key: 'organizations', labelKey: 'organizations', icon: 'organizations' },
]

const previewText = {
  ru: {
    account: 'Аккаунт',
    addCatalogEntry: '+ Каталог / группа / запись',
    addCharacterRelationship: '+ Связь персонажа',
    addExistingAttribute: 'Добавить существующую характеристику',
    addGalleryImage: 'Добавить изображение',
    addAttribute: '+ Характеристика',
    addAttributeGroup: 'Добавить группу характеристик',
    all: 'Все',
    allCatalogs: 'Все каталоги',
    appSubtitle: 'База мира и истории',
    attributes: 'Характеристики',
    cancel: 'Отмена',
    catalog: 'Каталог',
    catalogNoSelection: 'Каталог не выбран',
    catalogs: 'Каталоги',
    characters: 'Персонажи',
    chooseCatalog: 'Выберите каталог',
    chooseEntry: 'Выберите запись',
    chooseEvent: 'Выберите событие',
    chooseGroup: 'Выберите группу',
    create: 'Создать',
    createAccount: 'Создать аккаунт',
    database: 'База данных',
    delete: 'Удалить',
    deleteCatalog: 'Удалить каталог',
    deleteGroup: 'Удалить группу',
    deleteObject: 'Удалить объект',
    description: 'Описание',
    detailDisplay: 'Отображение досье',
    detailModal: 'Окно',
    detailPage: 'Страница',
    detailPanel: 'Правая панель',
    dossier: 'Досье объекта',
    edit: 'Изменить',
    editor: 'Редактор объекта',
    email: 'Email',
    entry: 'Запись',
    firstName: 'Название',
    gallery: 'Галерея',
    group: 'Группа',
    image: 'Обложка',
    items: 'Предметы',
    language: 'Язык',
    loading: 'Загрузка...',
    login: 'Вход',
    logout: 'Выйти',
    main: 'Основное',
    newCatalog: 'Новый каталог',
    newCatalogEntry: 'Новая запись',
    newEvent: 'Новое событие',
    newGroup: 'Новая группа',
    newObject: 'Новый объект',
    noCatalogs: 'Каталогов пока нет.',
    noEntries: 'Записей пока нет',
    noObjects: 'Объектов пока нет',
    noObjectsHint: 'Нажмите “Новый объект”, чтобы создать запись в этом стиле.',
    noRelationships: 'Связей пока нет.',
    objectData: 'Реальные данные из API проекта',
    objectType: 'Тип',
    organizations: 'Организации',
    password: 'Пароль',
    places: 'Места',
    profile: 'Профиль',
    project: 'Проект',
    projectNotSelected: 'Проект не выбран',
    realCatalogs: 'Реальные справочники проекта',
    register: 'Регистрация',
    relations: 'Связи',
    role: 'Роль',
    save: 'Сохранить',
    saveTimelineChange: 'Сохранить как изменение таймлайна',
    searchPlaceholder: 'Поиск по объектам, каталогам, связям...',
    settings: 'Настройки',
    surname: 'Фамилия',
    theme: 'Тема',
    themeDark: 'Темная',
    themeLight: 'Светлая',
    timeline: 'Таймлайн',
    unknownDescription: 'Описание пока не заполнено.',
    view: 'Вид',
    yearAge: 'Возраст',
  },
  en: {
    account: 'Account',
    addCatalogEntry: '+ Catalog / group / entry',
    addCharacterRelationship: '+ Character relationship',
    addExistingAttribute: 'Add existing attribute',
    addGalleryImage: 'Add image',
    addAttribute: '+ Attribute',
    addAttributeGroup: 'Add attribute group',
    all: 'All',
    allCatalogs: 'All catalogs',
    appSubtitle: 'World and story database',
    attributes: 'Attributes',
    cancel: 'Cancel',
    catalog: 'Catalog',
    catalogNoSelection: 'No catalog selected',
    catalogs: 'Catalogs',
    characters: 'Characters',
    chooseCatalog: 'Choose catalog',
    chooseEntry: 'Choose entry',
    chooseEvent: 'Choose event',
    chooseGroup: 'Choose group',
    create: 'Create',
    createAccount: 'Create account',
    database: 'Database',
    delete: 'Delete',
    deleteCatalog: 'Delete catalog',
    deleteGroup: 'Delete group',
    deleteObject: 'Delete object',
    description: 'Description',
    detailDisplay: 'Dossier display',
    detailModal: 'Modal',
    detailPage: 'Page',
    detailPanel: 'Right panel',
    dossier: 'Object dossier',
    edit: 'Edit',
    editor: 'Object editor',
    email: 'Email',
    entry: 'Entry',
    firstName: 'Name',
    gallery: 'Gallery',
    group: 'Group',
    image: 'Cover',
    items: 'Items',
    language: 'Language',
    loading: 'Loading...',
    login: 'Sign in',
    logout: 'Sign out',
    main: 'Main',
    newCatalog: 'New catalog',
    newCatalogEntry: 'New entry',
    newEvent: 'New event',
    newGroup: 'New group',
    newObject: 'New object',
    noCatalogs: 'No catalogs yet.',
    noEntries: 'No entries yet',
    noObjects: 'No objects yet',
    noObjectsHint: 'Click “New object” to create an entry in this style.',
    noRelationships: 'No relationships yet.',
    objectData: 'Real project API data',
    objectType: 'Type',
    organizations: 'Organizations',
    password: 'Password',
    places: 'Places',
    profile: 'Profile',
    project: 'Project',
    projectNotSelected: 'No project selected',
    realCatalogs: 'Real project reference catalogs',
    register: 'Register',
    relations: 'Relations',
    role: 'Role',
    save: 'Save',
    saveTimelineChange: 'Save as timeline change',
    searchPlaceholder: 'Search objects, catalogs, relations...',
    settings: 'Settings',
    surname: 'Surname',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    timeline: 'Timeline',
    unknownDescription: 'No description yet.',
    view: 'View',
    yearAge: 'Age',
  },
} as const

type PreviewText = (typeof previewText)[PreviewLanguage]

type TextLinkTarget = {
  key: string
  label: string
  onOpen: () => void
}

type CatalogEntryLinkTarget = {
  catalogId: number
  entry: CatalogEntry
}

const fallbackObjectTypes: ObjectTypeKey[] = ['characters', 'items', 'places', 'organizations']

const isObjectSection = (section: PreviewSection): section is ObjectTypeKey =>
  section !== 'attributes' && section !== 'catalogs'

const isPreviewObjectSection = (value: string | undefined): value is ObjectTypeKey =>
  objectSections.some((section) => section.key === value)

const getInitials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'

const previewRouteBase = '/style-preview'

const parsePositiveNumber = (value: string | undefined) => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const buildStylePreviewPath = (
  projectId: number | null,
  tab: PreviewTab = 'database',
  section: PreviewSection = 'characters',
  objectId: number | null = null,
  catalogId: number | null = null,
) => {
  if (projectId === null) {
    return previewRouteBase
  }

  if (tab === 'relations' || tab === 'timeline') {
    return `${previewRouteBase}/projects/${projectId}/${tab}`
  }

  if (section === 'catalogs') {
    return catalogId === null
      ? `${previewRouteBase}/projects/${projectId}/catalogs`
      : `${previewRouteBase}/projects/${projectId}/catalogs/${catalogId}`
  }

  if (section === 'attributes') {
    return `${previewRouteBase}/projects/${projectId}/attributes`
  }

  const sectionPath = `${previewRouteBase}/projects/${projectId}/database/${section}`

  return objectId === null ? sectionPath : `${sectionPath}/objects/${objectId}`
}

const parseStylePreviewPath = (pathname: string) => {
  const parts = pathname
    .replace(new RegExp(`^${previewRouteBase}/?`), '')
    .split('/')
    .filter(Boolean)
  const projectId = parts[0] === 'projects' ? parsePositiveNumber(parts[1]) : null
  const routeKind = parts[2]

  if (projectId === null) {
    return {
      activeSection: null,
      activeTab: null,
      catalogId: null,
      objectId: null,
      projectId: null,
    }
  }

  if (routeKind === 'relations' || routeKind === 'timeline') {
    return {
      activeSection: null,
      activeTab: routeKind as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
    }
  }

  if (routeKind === 'catalogs') {
    return {
      activeSection: 'catalogs' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: parsePositiveNumber(parts[3]),
      objectId: null,
      projectId,
    }
  }

  if (routeKind === 'attributes') {
    return {
      activeSection: 'attributes' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
    }
  }

  if (routeKind === 'database') {
    const activeSection = isPreviewObjectSection(parts[3]) ? parts[3] : 'characters'

    return {
      activeSection,
      activeTab: 'database' as PreviewTab,
      catalogId: null,
      objectId: parts[4] === 'objects' ? parsePositiveNumber(parts[5]) : null,
      projectId,
    }
  }

  return {
    activeSection: 'characters' as PreviewSection,
    activeTab: 'database' as PreviewTab,
    catalogId: null,
    objectId: null,
    projectId,
  }
}

const groupAttributesByDefinition = (
  attributes: ObjectAttribute[],
  definitions: AttributeDefinition[],
  defaultGroupName: string,
) => {
  const buckets = new Map<string, { name: string; attributes: ObjectAttribute[] }>()

  attributes.forEach((attribute) => {
    const definition = definitions.find(
      (item) => item.id === attribute.attributeDefinitionId || item.name === attribute.name,
    )
    const groupName = definition?.groupName?.trim() || defaultGroupName

    if (!buckets.has(groupName)) {
      buckets.set(groupName, { name: groupName, attributes: [] })
    }

    buckets.get(groupName)?.attributes.push(attribute)
  })

  return Array.from(buckets.values())
}

const getObjectFullName = (storyObject: Pick<StoryObject, 'name' | 'surname'>) =>
  [storyObject.name, storyObject.surname?.trim()].filter(Boolean).join(' ')

const isTextBoundaryCharacter = (character: string | undefined) =>
  character === undefined || !/[\p{L}\p{N}_]/u.test(character)

const getUniqueTextLinkTargets = (targets: TextLinkTarget[]) => {
  const uniqueTargets = new Map<string, TextLinkTarget>()

  targets.forEach((target) => {
    const normalizedLabel = target.label.trim()
    if (normalizedLabel.length < 2) {
      return
    }

    const key = normalizedLabel.toLocaleLowerCase()
    if (!uniqueTargets.has(key)) {
      uniqueTargets.set(key, { ...target, label: normalizedLabel })
    }
  })

  return Array.from(uniqueTargets.values()).sort((left, right) => right.label.length - left.label.length)
}

function LinkedText({
  emptyText,
  targets,
  text,
}: {
  emptyText?: string
  targets: TextLinkTarget[]
  text: string | null | undefined
}) {
  const sourceText = text === null || text === undefined || text.length === 0 ? emptyText ?? '' : text
  const linkTargets = getUniqueTextLinkTargets(targets)

  if (sourceText.length === 0 || linkTargets.length === 0) {
    return <>{sourceText}</>
  }

  const normalizedText = sourceText.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let index = 0

  while (index < sourceText.length) {
    const match = linkTargets.find((target) => {
      const normalizedLabel = target.label.toLocaleLowerCase()

      return (
        normalizedText.startsWith(normalizedLabel, index) &&
        isTextBoundaryCharacter(sourceText[index - 1]) &&
        isTextBoundaryCharacter(sourceText[index + target.label.length])
      )
    })

    if (match === undefined) {
      const lastPart = parts[parts.length - 1]
      if (typeof lastPart === 'string') {
        parts[parts.length - 1] = lastPart + sourceText[index]
      } else {
        parts.push(sourceText[index])
      }
      index += 1
      continue
    }

    const linkedText = sourceText.slice(index, index + match.label.length)
    parts.push(
      <button
        className="sp-text-link"
        key={`${match.key}-${index}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          match.onOpen()
        }}
      >
        {linkedText}
      </button>,
    )
    index += match.label.length
  }

  return <>{parts}</>
}

const previewStorageKey = 'storydb.stylePreview'

const readPreviewState = () => {
  try {
    const rawValue = localStorage.getItem(previewStorageKey)
    return rawValue === null
      ? {}
      : (JSON.parse(rawValue) as Partial<{
          activeSection: PreviewSection
          activeTab: PreviewTab
          detailMode: DetailMode
          groupDisplayMode: GroupDisplayMode
          isObjectPageOpen: boolean
          previewLanguage: PreviewLanguage
          previewTheme: PreviewTheme
          selectedObjectId: number
          selectedProjectId: number
        }>)
  } catch {
    return {}
  }
}

const savePreviewState = (
  state: Partial<{
    activeSection: PreviewSection
    activeTab: PreviewTab
    detailMode: DetailMode
    groupDisplayMode: GroupDisplayMode
    isObjectPageOpen: boolean
    previewLanguage: PreviewLanguage
    previewTheme: PreviewTheme
    selectedObjectId: number | null
    selectedProjectId: number | null
  }>,
) => {
  try {
    const currentState = readPreviewState()
    localStorage.setItem(previewStorageKey, JSON.stringify({ ...currentState, ...state }))
  } catch {
    // localStorage can be unavailable in private contexts; the preview still works without persistence.
  }
}

export function StylePreview() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialPreviewState = useMemo(() => readPreviewState(), [])
  const routeState = useMemo(() => parseStylePreviewPath(location.pathname), [location.pathname])
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    routeState.projectId ?? initialPreviewState.selectedProjectId ?? null,
  )
  const [activeTab, setActiveTab] = useState<PreviewTab>(routeState.activeTab ?? initialPreviewState.activeTab ?? 'database')
  const [activeSection, setActiveSection] = useState<PreviewSection>(
    routeState.activeSection ?? initialPreviewState.activeSection ?? 'characters',
  )
  const [objects, setObjects] = useState<StoryObject[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(
    routeState.objectId ?? initialPreviewState.selectedObjectId ?? null,
  )
  const [detailMode, setDetailMode] = useState<DetailMode>(initialPreviewState.detailMode ?? 'panel')
  const [groupDisplayMode, setGroupDisplayMode] = useState<GroupDisplayMode>(
    initialPreviewState.groupDisplayMode ?? 'blocks',
  )
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>(initialPreviewState.previewTheme ?? 'light')
  const [previewLanguage, setPreviewLanguage] = useState<PreviewLanguage>(initialPreviewState.previewLanguage ?? 'ru')
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(false)
  const [isObjectPageOpen, setIsObjectPageOpen] = useState(
    routeState.objectId !== null || initialPreviewState.isObjectPageOpen === true,
  )
  const [activeObjectMenuId, setActiveObjectMenuId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PreviewDialogKind>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [editingObjectId, setEditingObjectId] = useState<number | null>(null)
  const [objectName, setObjectName] = useState('')
  const [objectSurname, setObjectSurname] = useState('')
  const [objectRole, setObjectRole] = useState('')
  const [objectAge, setObjectAge] = useState('')
  const [objectDescription, setObjectDescription] = useState('')
  const [objectImagePath, setObjectImagePath] = useState<string | null>(null)
  const [objectEditorTab, setObjectEditorTab] = useState<ObjectEditorTab>('main')
  const [dossierTab, setDossierTab] = useState<ObjectDossierTab>('main')
  const [draftAttributes, setDraftAttributes] = useState<DraftAttribute[]>([])
  const [draftHierarchySelections, setDraftHierarchySelections] = useState<DraftHierarchySelection[]>([])
  const [draftCatalogSelections, setDraftCatalogSelections] = useState<DraftCatalogSelection[]>([])
  const [draftCharacterRelationships, setDraftCharacterRelationships] = useState<DraftCharacterRelationship[]>([])
  const [ownedItemIds, setOwnedItemIds] = useState<number[]>([])
  const [ownerCharacterIds, setOwnerCharacterIds] = useState<number[]>([])
  const [territoryPlaceIds, setTerritoryPlaceIds] = useState<number[]>([])
  const [ownerOrganizationIds, setOwnerOrganizationIds] = useState<number[]>([])
  const [parentObjectIds, setParentObjectIds] = useState<number[]>([])
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([])
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [selectedAttributeGroupId, setSelectedAttributeGroupId] = useState<number | null>(null)
  const [attributeGroupName, setAttributeGroupName] = useState('')
  const [editingAttributeGroupId, setEditingAttributeGroupId] = useState<number | null>(null)
  const [editingAttributeDefinitionId, setEditingAttributeDefinitionId] = useState<number | null>(null)
  const [pendingDeleteAttributeGroupId, setPendingDeleteAttributeGroupId] = useState<number | null>(null)
  const [pendingDeleteAttributeDefinitionId, setPendingDeleteAttributeDefinitionId] = useState<number | null>(null)
  const [attributeDefinitionDraft, setAttributeDefinitionDraft] = useState<AttributeDefinitionDraft>(
    emptyAttributeDefinitionDraft,
  )
  const [hierarchyGroups, setHierarchyGroups] = useState<HierarchyGroup[]>([])
  const [hierarchyNodesByGroupId, setHierarchyNodesByGroupId] = useState<Record<number, HierarchyNode[]>>({})
  const [objectsByType, setObjectsByType] = useState<Record<ObjectTypeKey, StoryObject[]>>({
    characters: [],
    items: [],
    places: [],
    organizations: [],
    hierarchy: [],
  })
  const [catalogEntriesByCatalogId, setCatalogEntriesByCatalogId] = useState<Record<number, CatalogEntry[]>>({})
  const [catalogGroupsByCatalogId, setCatalogGroupsByCatalogId] = useState<Record<number, CatalogEntryGroup[]>>({})
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null)
  const [galleryImageCaption, setGalleryImageCaption] = useState('')
  const [editorTimelineEventId, setEditorTimelineEventId] = useState('')
  const [saveObjectAsTimelineChange, setSaveObjectAsTimelineChange] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(routeState.catalogId)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogGroups, setCatalogGroups] = useState<CatalogEntryGroup[]>([])
  const [catalogName, setCatalogName] = useState('')
  const [catalogDescription, setCatalogDescription] = useState('')
  const [catalogSupportsHierarchy, setCatalogSupportsHierarchy] = useState(false)
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null)
  const [pendingDeleteCatalogId, setPendingDeleteCatalogId] = useState<number | null>(null)
  const [catalogGroupName, setCatalogGroupName] = useState('')
  const [editingCatalogGroupId, setEditingCatalogGroupId] = useState<number | null>(null)
  const [selectedCatalogGroupId, setSelectedCatalogGroupId] = useState<number | null>(null)
  const [editingCatalogEntryId, setEditingCatalogEntryId] = useState<number | null>(null)
  const [selectedCatalogEntryId, setSelectedCatalogEntryId] = useState<number | null>(null)
  const [pendingDeleteCatalogEntryId, setPendingDeleteCatalogEntryId] = useState<number | null>(null)
  const [catalogEntryDraft, setCatalogEntryDraft] = useState<CatalogEntryDraft>({
    name: '',
    description: '',
    imagePath: null,
    entryGroupId: '',
    parentEntryIds: [],
    fieldValues: {},
  })
  const [timelineDraft, setTimelineDraft] = useState<TimelineEventDraft>({
    title: '',
    description: '',
    startLabel: '',
    endLabel: '',
    startValue: '',
    endValue: '',
    category: '',
    color: '',
    participants: [],
    changes: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [isObjectSaving, setIsObjectSaving] = useState(false)
  const ui = previewText[previewLanguage]

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const visibleObjects = useMemo(
    () => (selectedProjectId === null ? [] : objects),
    [objects, selectedProjectId],
  )
  const visibleCatalogs = useMemo(
    () => (selectedProjectId === null ? [] : catalogs),
    [catalogs, selectedProjectId],
  )
  const visibleTimelineEvents = useMemo(
    () => (selectedProjectId === null ? [] : timelineEvents),
    [selectedProjectId, timelineEvents],
  )
  const selectedObject = useMemo(
    () => visibleObjects.find((storyObject) => storyObject.id === selectedObjectId) ?? null,
    [selectedObjectId, visibleObjects],
  )
  const selectedCatalog = useMemo(
    () => visibleCatalogs.find((catalog) => catalog.id === selectedCatalogId) ?? visibleCatalogs[0] ?? null,
    [selectedCatalogId, visibleCatalogs],
  )
  const selectedCatalogEntry = useMemo(
    () =>
      catalogEntries.find((entry) => entry.id === selectedCatalogEntryId) ??
      Object.values(catalogEntriesByCatalogId)
        .flat()
        .find((entry) => entry.id === selectedCatalogEntryId) ??
      null,
    [catalogEntries, catalogEntriesByCatalogId, selectedCatalogEntryId],
  )
  const enabledObjectTypes = useMemo(() => {
    if (selectedProject === null) {
      return fallbackObjectTypes
    }

    const enabled = selectedProject.objectTypes
      .filter((objectType) => objectType.isEnabled && objectType.key !== 'hierarchy')
      .map((objectType) => objectType.key)

    return enabled.length === 0 ? fallbackObjectTypes : enabled
  }, [selectedProject])
  const getObjectSectionLabel = (sectionKey: ObjectTypeKey) => {
    const section = objectSections.find((item) => item.key === sectionKey)
    return section === undefined ? sectionKey : ui[section.labelKey]
  }

  const navigateToPreview = useCallback(
    (
      projectId: number | null,
      tab: PreviewTab = 'database',
      section: PreviewSection = 'characters',
      objectId: number | null = null,
      catalogId: number | null = null,
      replace = false,
    ) => {
      navigate(buildStylePreviewPath(projectId, tab, section, objectId, catalogId), { replace })
    },
    [navigate],
  )

  useEffect(() => {
    let isActive = true

    queueMicrotask(() => {
      if (!isActive) {
        return
      }

      if (routeState.projectId !== null) {
        setSelectedProjectId(routeState.projectId)
      }

      if (routeState.activeTab !== null) {
        setActiveTab(routeState.activeTab)
      }

      if (routeState.activeSection !== null) {
        setActiveSection(routeState.activeSection)
        setIsSettingsPageOpen(false)
      }

      setSelectedObjectId(routeState.objectId)
      setIsObjectPageOpen(routeState.objectId !== null)

      if (routeState.catalogId !== null) {
        setSelectedCatalogId(routeState.catalogId)
      }
    })

    return () => {
      isActive = false
    }
  }, [
    routeState.activeSection,
    routeState.activeTab,
    routeState.catalogId,
    routeState.objectId,
    routeState.projectId,
  ])

  const navigateToWorkspace = (
    tab: PreviewTab,
    section: PreviewSection = activeSection,
    objectId: number | null = null,
    catalogId: number | null = selectedCatalogId,
  ) => {
    setIsSettingsPageOpen(false)
    navigateToPreview(selectedProjectId, tab, section, objectId, catalogId)
  }

  const loadProjects = useCallback(async () => {
    const user = await fetchCurrentUser()
    setCurrentUser(user)
    if (user === null) {
      setProjects([])
      setSelectedProjectId(null)
      return
    }

    const loadedProjects = await fetchProjects()
    setProjects(loadedProjects)
    setSelectedProjectId((currentId) =>
      routeState.projectId !== null && loadedProjects.some((project) => project.id === routeState.projectId)
        ? routeState.projectId
        : currentId !== null && loadedProjects.some((project) => project.id === currentId)
        ? currentId
        : initialPreviewState.selectedProjectId !== undefined &&
            loadedProjects.some((project) => project.id === initialPreviewState.selectedProjectId)
          ? initialPreviewState.selectedProjectId
          : loadedProjects[0]?.id ?? null,
    )
  }, [initialPreviewState.selectedProjectId, routeState.projectId])

  useEffect(() => {
    let isActive = true
    void Promise.resolve()
      .then(loadProjects)
      .catch(() => {
        if (isActive) {
          setMessage('API недоступен или требуется вход.')
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
  }, [loadProjects])

  useEffect(() => {
    if (routeState.projectId === null && selectedProjectId !== null && projects.length > 0) {
      navigateToPreview(selectedProjectId, activeTab, activeSection, selectedObjectId, selectedCatalogId, true)
    }
  }, [
    activeSection,
    activeTab,
    navigateToPreview,
    projects.length,
    routeState.projectId,
    selectedCatalogId,
    selectedObjectId,
    selectedProjectId,
  ])

  useEffect(() => {
    savePreviewState({
      activeSection,
      activeTab,
      detailMode,
      groupDisplayMode,
      isObjectPageOpen,
      previewLanguage,
      previewTheme,
      selectedObjectId,
      selectedProjectId,
    })
  }, [activeSection, activeTab, detailMode, groupDisplayMode, isObjectPageOpen, previewLanguage, previewTheme, selectedObjectId, selectedProjectId])

  useEffect(() => {
    const closeFloatingMenus = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-card-menu, .sp-profile') === null) {
        setActiveObjectMenuId(null)
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeFloatingMenus)
    return () => document.removeEventListener('pointerdown', closeFloatingMenus)
  }, [])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setObjectsByType({
        characters: [],
        items: [],
        places: [],
        organizations: [],
        hierarchy: [],
      })
      setCatalogEntriesByCatalogId({})
      return undefined
    }

    const loadTextLinkTargets = async () => {
      const projectId = selectedProjectId
      const [charactersResult, itemsResult, placesResult, organizationsResult, catalogsResult] =
        await Promise.allSettled([
          fetchObjects(projectId, 'characters'),
          fetchObjects(projectId, 'items'),
          fetchObjects(projectId, 'places'),
          fetchObjects(projectId, 'organizations'),
          fetchCatalogs(projectId),
        ])

      if (!isActive) {
        return
      }

      setObjectsByType((currentObjectsByType) => ({
        ...currentObjectsByType,
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : currentObjectsByType.characters,
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : currentObjectsByType.items,
        places: placesResult.status === 'fulfilled' ? placesResult.value : currentObjectsByType.places,
        organizations:
          organizationsResult.status === 'fulfilled' ? organizationsResult.value : currentObjectsByType.organizations,
      }))

      if (catalogsResult.status !== 'fulfilled') {
        return
      }

      const entriesByCatalogResults = await Promise.allSettled(
        catalogsResult.value.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
      )

      if (!isActive) {
        return
      }

      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        ...Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      }))
    }

    void loadTextLinkTargets()

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setCatalogs([])
      return undefined
    }

    fetchCatalogs(selectedProjectId)
      .then((loadedCatalogs) => {
        if (!isActive) {
          return
        }

        setCatalogs(loadedCatalogs)
        setSelectedCatalogId((currentId) =>
          currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : currentId,
        )
      })
      .catch(() => {
        if (isActive) {
          setMessage('Не удалось загрузить каталоги проекта.')
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    setSelectedAttributeGroupId((currentGroupId) =>
      currentGroupId !== null && attributeGroups.some((group) => group.id === currentGroupId)
        ? currentGroupId
        : null,
    )
  }, [attributeGroups])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      return undefined
    }

    const loadWorkspace = async () => {
      if (isObjectSection(activeSection)) {
        const [loadedObjects, definitions, groups] = await Promise.all([
          fetchObjects(selectedProjectId, activeSection),
          fetchAttributeDefinitions(selectedProjectId, activeSection),
          fetchAttributeGroups(selectedProjectId, activeSection),
        ])
        if (isActive) {
          setObjects(loadedObjects)
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          setSelectedObjectId((currentId) =>
            currentId !== null && loadedObjects.some((storyObject) => storyObject.id === currentId)
              ? currentId
              : null,
          )
        }
      } else if (activeSection === 'attributes') {
        const [definitions, groups] = await Promise.all([
          fetchAttributeDefinitions(selectedProjectId, 'characters'),
          fetchAttributeGroups(selectedProjectId, 'characters'),
        ])
        if (isActive) {
          setAttributeDefinitions(definitions)
          setAttributeGroups(groups)
          setObjects([])
        }
      } else {
        const loadedCatalogs = await fetchCatalogs(selectedProjectId)
        if (isActive) {
          setCatalogs(loadedCatalogs)
          setSelectedCatalogId((currentId) =>
            currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
              ? currentId
              : loadedCatalogs[0]?.id ?? null,
          )
        }
      }

      const loadedEvents = await fetchTimelineEvents(selectedProjectId)
      if (isActive) {
        setTimelineEvents(loadedEvents)
      }
    }

    loadWorkspace()
      .catch(() => {
        if (isActive) {
          setMessage('Не удалось загрузить данные проекта.')
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
  }, [activeSection, selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (
      selectedProjectId === null ||
      selectedObjectId === null ||
      selectedObjectId <= 0 ||
      !isObjectSection(activeSection)
    ) {
      return undefined
    }

    fetchObject(selectedProjectId, selectedObjectId)
      .then((loadedObject) => {
        if (!isActive) {
          return
        }

        setObjects((currentObjects) =>
          currentObjects.some((storyObject) => storyObject.id === loadedObject.id)
            ? currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject))
            : [loadedObject, ...currentObjects],
        )
      })
      .catch(() => {
        if (isActive) {
          setMessage('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґРѕСЃСЊРµ РѕР±СЉРµРєС‚Р°.')
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedObjectId, selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null || selectedCatalogId === null || activeSection !== 'catalogs') {
      return undefined
    }

    const loadCatalogWorkspace = async () => {
      const [loadedEntries, loadedGroups] = await Promise.all([
        fetchCatalogEntries(selectedProjectId, selectedCatalogId),
        fetchCatalogEntryGroups(selectedProjectId, selectedCatalogId),
      ])

      if (isActive) {
        setCatalogEntries(loadedEntries)
        setCatalogGroups(loadedGroups)
      }
    }

    loadCatalogWorkspace().catch(() => {
      if (isActive) {
        setMessage('Не удалось загрузить записи каталога.')
      }
    })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedCatalogId, selectedProjectId])

  const loadObjectEditorData = useCallback(
    async (typeKey: ObjectTypeKey) => {
      if (selectedProjectId === null) {
        return
      }

      const projectId = selectedProjectId
      const [
        definitionsResult,
        groupsResult,
        catalogsResult,
        charactersResult,
        itemsResult,
        placesResult,
        organizationsResult,
      ] = await Promise.allSettled([
        fetchAttributeDefinitions(projectId, typeKey),
        fetchAttributeGroups(projectId, typeKey),
        fetchCatalogs(projectId),
        fetchObjects(projectId, 'characters'),
        fetchObjects(projectId, 'items'),
        fetchObjects(projectId, 'places'),
        fetchObjects(projectId, 'organizations'),
      ])

      const loadedCatalogs = catalogsResult.status === 'fulfilled' ? catalogsResult.value : []

      const [entriesByCatalogResults, groupsByCatalogResults] = await Promise.all([
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntries(projectId, catalog.id)] as const),
        ),
        Promise.allSettled(
          loadedCatalogs.map(async (catalog) => [catalog.id, await fetchCatalogEntryGroups(projectId, catalog.id)] as const),
        ),
      ])

      setAttributeDefinitions(definitionsResult.status === 'fulfilled' ? definitionsResult.value : [])
      setAttributeGroups(groupsResult.status === 'fulfilled' ? groupsResult.value : [])
      setCatalogs(loadedCatalogs)
      setHierarchyGroups([])
      setObjectsByType({
        characters: charactersResult.status === 'fulfilled' ? charactersResult.value : [],
        items: itemsResult.status === 'fulfilled' ? itemsResult.value : [],
        places: placesResult.status === 'fulfilled' ? placesResult.value : [],
        organizations: organizationsResult.status === 'fulfilled' ? organizationsResult.value : [],
        hierarchy: [],
      })
      setCatalogEntriesByCatalogId(
        Object.fromEntries(
          entriesByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntry[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setCatalogGroupsByCatalogId(
        Object.fromEntries(
          groupsByCatalogResults
            .filter((result): result is PromiseFulfilledResult<readonly [number, CatalogEntryGroup[]]> => result.status === 'fulfilled')
            .map((result) => result.value),
        ),
      )
      setHierarchyNodesByGroupId({})
    },
    [selectedProjectId],
  )

  const submitAuth = async () => {
    try {
      const user =
        authMode === 'login'
          ? await loginRequest(authEmail, authPassword)
          : await registerRequest(authEmail, authPassword, authDisplayName)
      setCurrentUser(user)
      setDialog(null)
      await loadProjects()
    } catch {
      setMessage('Не удалось войти или зарегистрироваться.')
    }
  }

  const logout = async () => {
    await logoutRequest()
    setCurrentUser(null)
    setProjects([])
    setSelectedProjectId(null)
    setObjects([])
  }

  const createObject = async () => {
    if (selectedProjectId === null || !isObjectSection(activeSection) || objectName.trim().length === 0) {
      return
    }

    try {
      const created = await createObjectRequest(
        selectedProjectId,
        activeSection,
        objectName,
        '',
        objectDescription,
        objectAge,
        objectRole,
        objectImagePath,
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      )
      setObjects((currentObjects) => [created, ...currentObjects])
      setSelectedObjectId(created.id)
      setDialog(null)
      setObjectName('')
      setObjectRole('')
      setObjectAge('')
      setObjectDescription('')
      setObjectImagePath(null)
    } catch {
      setMessage('Не удалось создать объект.')
    }
  }

  const uploadObjectImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file)
      setObjectImagePath(result.path)
    } catch {
      setMessage('Не удалось загрузить изображение.')
    }
  }

  void createObject

  const resetObjectForm = () => {
    setEditingObjectId(null)
    setObjectName('')
    setObjectSurname('')
    setObjectRole('')
    setObjectAge('')
    setObjectDescription('')
    setObjectImagePath(null)
    setObjectEditorTab('main')
    setDraftAttributes([])
    setDraftHierarchySelections([])
    setDraftCatalogSelections([])
    setDraftCharacterRelationships([])
    setOwnedItemIds([])
    setOwnerCharacterIds([])
    setTerritoryPlaceIds([])
    setOwnerOrganizationIds([])
    setParentObjectIds([])
    setEditorTimelineEventId('')
    setSaveObjectAsTimelineChange(false)
  }

  const openCreateObjectDialog = () => {
    resetObjectForm()
    if (isObjectSection(activeSection)) {
      void loadObjectEditorData(activeSection)
    }
    setDialog('object')
  }

  const openEditObjectDialog = async (storyObject: StoryObject) => {
    let objectToEdit = storyObject
    const editorTypeKey = isObjectSection(activeSection)
      ? activeSection
      : isPreviewObjectSection(storyObject.typeKey)
        ? storyObject.typeKey
        : 'characters'

    void loadObjectEditorData(editorTypeKey)

    if (selectedProjectId !== null && storyObject.id > 0) {
      try {
        objectToEdit = await fetchObject(selectedProjectId, storyObject.id)
        setObjects((currentObjects) =>
          currentObjects.map((currentObject) => (currentObject.id === objectToEdit.id ? objectToEdit : currentObject)),
        )
      } catch {
        setMessage('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ СЂРµРґР°РєС‚РѕСЂР° РѕР±СЉРµРєС‚Р°.')
      }
    }

    setEditingObjectId(objectToEdit.id)
    setObjectName(objectToEdit.name)
    setObjectSurname(objectToEdit.surname ?? '')
    setObjectRole(objectToEdit.role ?? '')
    setObjectAge(objectToEdit.age ?? '')
    setObjectDescription(objectToEdit.description ?? '')
    setObjectImagePath(objectToEdit.imagePath)
    setObjectEditorTab('main')
    setDraftAttributes(objectToEdit.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value ?? '' })))
    setDraftHierarchySelections(
      objectToEdit.hierarchySelections.map((selection) => ({
        groupId: selection.groupId,
        nodeIds: selection.nodes.map((node) => node.id),
      })),
    )
    setDraftCatalogSelections(
      objectToEdit.catalogSelections.map((selection) => ({
        targetType: selection.targetType,
        catalogId: String(selection.catalogId),
        catalogEntryGroupId: selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
        catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
      })),
    )
    setDraftCharacterRelationships(
      objectToEdit.outgoingCharacterRelationships.map((relationship) => ({
        targetCharacterId: String(relationship.character.id),
        relationType: relationship.relationType,
        strength: String(relationship.strength),
        tension: String(relationship.tension),
        isBidirectional: relationship.isBidirectional,
        description: relationship.description ?? '',
      })),
    )
    setOwnedItemIds(objectToEdit.ownedItems.map((item) => item.id))
    setOwnerCharacterIds(objectToEdit.owners.map((owner) => owner.id))
    setTerritoryPlaceIds(objectToEdit.territoryPlaces.map((place) => place.id))
    setOwnerOrganizationIds(objectToEdit.ownerOrganizations.map((organization) => organization.id))
    setParentObjectIds(objectToEdit.hierarchyParents.map((parent) => parent.id))
    setDialog('object')
  }

  const saveObject = async () => {
    if (isObjectSaving || selectedProjectId === null || !isObjectSection(activeSection) || objectName.trim().length === 0) {
      return
    }

    const projectId = selectedProjectId
    const section = activeSection
    const objectId = editingObjectId
    const previousObject = selectedObject
    const temporaryObjectId = objectId === null ? -Date.now() : objectId
    const optimisticObject =
      objectId === null || (previousObject !== null && previousObject.id === objectId)
        ? {
            ...(previousObject ?? {
              id: temporaryObjectId,
              typeKey: section,
              hierarchySelections: [],
              catalogSelections: [],
              ownedItems: [],
              owners: [],
              territoryPlaces: [],
              organizationsOnTerritory: [],
              ownerOrganizations: [],
              ownedTerritories: [],
              hierarchyParents: [],
              hierarchyChildren: [],
              galleryImages: [],
              outgoingCharacterRelationships: [],
              incomingCharacterRelationships: [],
            }),
            id: temporaryObjectId,
            name: objectName.trim(),
            surname: objectSurname.trim() || null,
            description: objectDescription.trim() || null,
            age: objectAge.trim() || null,
            role: objectRole.trim() || null,
            imagePath: objectImagePath,
            attributes: draftAttributes
              .map((attribute, index) => {
                const name = attribute.name.trim()
                const existingAttribute = previousObject?.attributes.find(
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
        : null

    setIsObjectSaving(true)
    if (optimisticObject !== null) {
      setObjects((currentObjects) =>
        objectId === null
          ? [optimisticObject, ...currentObjects]
          : currentObjects.map((storyObject) => (storyObject.id === optimisticObject.id ? optimisticObject : storyObject)),
      )
      setSelectedObjectId(optimisticObject.id)
      setDialog(null)
      resetObjectForm()
    }

    try {
      const saved =
        objectId === null
          ? await createObjectRequest(
              projectId,
              section,
              objectName,
              objectSurname,
              objectDescription,
              objectAge,
              objectRole,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )
          : await updateObjectRequest(
              projectId,
              objectId,
              objectName,
              objectSurname,
              objectDescription,
              objectAge,
              objectRole,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )

      const mergeSavedSummary = (storyObject: StoryObject): StoryObject => ({
        ...storyObject,
        id: saved.id,
        name: saved.name,
        surname: saved.surname,
        description: saved.description,
        age: saved.age,
        role: saved.role,
        imagePath: saved.imagePath,
        typeKey: saved.typeKey,
        attributes: saved.attributes,
      })

      setObjects((currentObjects) =>
        objectId === null
          ? currentObjects.map((storyObject) => (storyObject.id === temporaryObjectId ? mergeSavedSummary(storyObject) : storyObject))
          : currentObjects.map((storyObject) => (storyObject.id === saved.id ? mergeSavedSummary(storyObject) : storyObject)),
      )
      setSelectedObjectId(saved.id)
      navigateToPreview(projectId, 'database', section, saved.id)
      void fetchObject(projectId, saved.id)
        .then((loadedObject) => {
          setObjects((currentObjects) =>
            currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject)),
          )
        })
        .catch(() => undefined)
    } catch {
      if (optimisticObject !== null && previousObject !== null) {
        setObjects((currentObjects) =>
          currentObjects.map((storyObject) => (storyObject.id === previousObject.id ? previousObject : storyObject)),
        )
        setSelectedObjectId(previousObject.id)
      } else if (optimisticObject !== null) {
        setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== optimisticObject.id))
        setSelectedObjectId(null)
      }
      setMessage('Не удалось сохранить объект.')
    } finally {
      setIsObjectSaving(false)
    }
  }

  const deleteSelectedObject = async () => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      await deleteObjectRequest(selectedProjectId, selectedObject.id)
      setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== selectedObject.id))
      setSelectedObjectId(null)
      navigateToPreview(selectedProjectId, 'database', activeSection)
      setDialog(null)
    } catch {
      setMessage('Не удалось удалить объект.')
    }
  }

  const toggleNumberSelection = (values: number[], value: number) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

  const updateSelectedObject = (updatedObject: StoryObject) => {
    setObjects((currentObjects) =>
      currentObjects.map((storyObject) => (storyObject.id === updatedObject.id ? updatedObject : storyObject)),
    )
    setSelectedObjectId(updatedObject.id)
  }

  const addGalleryImage = async () => {
    if (selectedProjectId === null || selectedObject === null || galleryImagePath === null) {
      return
    }

    try {
      const updatedObject = await addObjectGalleryImageRequest(
        selectedProjectId,
        selectedObject.id,
        galleryImagePath,
        galleryImageCaption,
      )
      updateSelectedObject(updatedObject)
      setGalleryImagePath(null)
      setGalleryImageCaption('')
    } catch {
      setMessage('Не удалось добавить изображение в галерею.')
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      const updatedObject = await deleteObjectGalleryImageRequest(selectedProjectId, selectedObject.id, imageId)
      updateSelectedObject(updatedObject)
    } catch {
      setMessage('Не удалось удалить изображение из галереи.')
    }
  }

  const openObjectDetail = (storyObject: StoryObject) => {
    const targetSection = isPreviewObjectSection(storyObject.typeKey)
      ? storyObject.typeKey
      : isObjectSection(activeSection)
        ? activeSection
        : 'characters'

    setSelectedCatalogEntryId(null)
    setActiveTab('database')
    setActiveSection(targetSection)
    setObjects((currentObjects) => {
      const baseObjects = targetSection === activeSection ? currentObjects : objectsByType[targetSection] ?? []

      return baseObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? baseObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...baseObjects]
    })
    setSelectedObjectId(storyObject.id)
    setIsObjectPageOpen(detailMode === 'page')
    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', targetSection, storyObject.id)
    }
  }

  const saveAttributeGroup = async () => {
    if (selectedProjectId === null || attributeGroupName.trim().length === 0) {
      return
    }

    try {
      const previousGroupName =
        editingAttributeGroupId === null
          ? null
          : attributeGroups.find((group) => group.id === editingAttributeGroupId)?.name ?? null
      const saved =
        editingAttributeGroupId === null
          ? await createAttributeGroupRequest(selectedProjectId, 'characters', attributeGroupName)
          : await updateAttributeGroupRequest(selectedProjectId, 'characters', editingAttributeGroupId, attributeGroupName)
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
      setAttributeGroupName('')
      setEditingAttributeGroupId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось создать группу характеристик.')
    }
  }

  const saveAttributeDefinition = async () => {
    if (selectedProjectId === null || attributeDefinitionDraft.name.trim().length === 0) {
      return
    }

    const selectedGroup = attributeGroups.find((group) => group.id === selectedAttributeGroupId)
    const groupName = selectedGroup?.name ?? attributeDefinitionDraft.groupName

    try {
      const saved =
        editingAttributeDefinitionId === null
          ? await createAttributeDefinitionRequest(selectedProjectId, 'characters', {
              ...attributeDefinitionDraft,
              groupName,
            })
          : await updateAttributeDefinitionRequest(selectedProjectId, 'characters', editingAttributeDefinitionId, {
              ...attributeDefinitionDraft,
              groupName,
            })
      setAttributeDefinitions((currentDefinitions) =>
        editingAttributeDefinitionId === null
          ? [...currentDefinitions, saved]
          : currentDefinitions.map((definition) => (definition.id === saved.id ? saved : definition)),
      )
      setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
      setEditingAttributeDefinitionId(null)
    } catch {
      setMessage('Не удалось создать характеристику.')
    }
  }

  const openEditAttributeGroup = (group: AttributeGroup) => {
    setEditingAttributeGroupId(group.id)
    setAttributeGroupName(group.name)
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
      setMessage('Не удалось удалить группу характеристик.')
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
      setMessage('Не удалось удалить характеристику.')
    }
  }

  const saveCatalog = async () => {
    if (selectedProjectId === null || catalogName.trim().length === 0) {
      return
    }

    try {
      const saved =
        editingCatalogId === null
          ? await createCatalogRequest(
              selectedProjectId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? 'entries' : 'entries',
            )
          : await updateCatalogRequest(
              selectedProjectId,
              editingCatalogId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? 'entries' : 'entries',
            )
      setCatalogs((currentCatalogs) =>
        editingCatalogId === null
          ? [...currentCatalogs, saved]
          : currentCatalogs.map((catalog) => (catalog.id === saved.id ? saved : catalog)),
      )
      setSelectedCatalogId(saved.id)
      setCatalogName('')
      setCatalogDescription('')
      setCatalogSupportsHierarchy(false)
      setEditingCatalogId(null)
      setDialog(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, saved.id)
    } catch {
      setMessage('Не удалось создать каталог.')
    }
  }

  const deleteSelectedCatalog = async () => {
    if (selectedProjectId === null) {
      return
    }

    const targetCatalog =
      visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog
    if (targetCatalog === null) {
      return
    }

    try {
      await deleteCatalogRequest(selectedProjectId, targetCatalog.id)
      setCatalogs((currentCatalogs) => currentCatalogs.filter((catalog) => catalog.id !== targetCatalog.id))
      setSelectedCatalogId(null)
      setCatalogEntries([])
      setCatalogGroups([])
      setPendingDeleteCatalogId(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs')
      setDialog(null)
    } catch {
      setMessage('Не удалось удалить каталог.')
    }
  }

  const saveCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null || catalogGroupName.trim().length === 0) {
      return
    }

    try {
      const saved =
        editingCatalogGroupId === null
          ? await createCatalogEntryGroupRequest(selectedProjectId, selectedCatalog.id, catalogGroupName)
          : await updateCatalogEntryGroupRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogGroupId,
              catalogGroupName,
              catalogGroups.find((group) => group.id === editingCatalogGroupId)?.parentGroupIds ?? [],
            )
      setCatalogGroups((currentGroups) =>
        editingCatalogGroupId === null
          ? [...currentGroups, saved]
          : currentGroups.map((group) => (group.id === saved.id ? saved : group)),
      )
      setSelectedCatalogGroupId(saved.id)
      setCatalogGroupName('')
      setEditingCatalogGroupId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось создать группу.')
    }
  }

  const saveCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null || catalogEntryDraft.name.trim().length === 0) {
      return
    }

    try {
      const fieldDefinitions = await fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalog.id)
      const saved =
        editingCatalogEntryId === null
          ? await createCatalogEntryRequest(selectedProjectId, selectedCatalog.id, catalogEntryDraft, fieldDefinitions)
          : await updateCatalogEntryRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogEntryId,
              catalogEntryDraft,
              fieldDefinitions,
            )
      setCatalogEntries((currentEntries) =>
        editingCatalogEntryId === null
          ? [saved, ...currentEntries]
          : currentEntries.map((entry) => (entry.id === saved.id ? saved : entry)),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]:
          editingCatalogEntryId === null
            ? [saved, ...(currentEntriesByCatalogId[selectedCatalog.id] ?? [])]
            : (currentEntriesByCatalogId[selectedCatalog.id] ?? []).map((entry) =>
                entry.id === saved.id ? saved : entry,
              ),
      }))
      setCatalogEntryDraft({
        name: '',
        description: '',
        imagePath: null,
        entryGroupId: '',
        parentEntryIds: [],
        fieldValues: {},
      })
      setEditingCatalogEntryId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось создать запись каталога.')
    }
  }

  const deleteSelectedCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null || selectedCatalogGroupId === null) {
      return
    }

    try {
      await deleteCatalogEntryGroupRequest(selectedProjectId, selectedCatalog.id, selectedCatalogGroupId)
      setCatalogGroups((currentGroups) => currentGroups.filter((group) => group.id !== selectedCatalogGroupId))
      setSelectedCatalogGroupId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось удалить группу.')
    }
  }

  const openEditCatalog = (catalog: Catalog) => {
    setEditingCatalogId(catalog.id)
    setCatalogName(catalog.name)
    setCatalogDescription(catalog.description ?? '')
    setCatalogSupportsHierarchy(catalog.supportsHierarchy)
    setDialog('catalog')
  }

  const openEditCatalogGroup = (group: CatalogEntryGroup) => {
    setEditingCatalogGroupId(group.id)
    setCatalogGroupName(group.name)
    setDialog('catalogGroup')
  }

  const openEditCatalogEntry = (entry: CatalogEntry) => {
    setEditingCatalogEntryId(entry.id)
    setCatalogEntryDraft({
      name: entry.name,
      description: entry.description ?? '',
      imagePath: entry.imagePath,
      entryGroupId: entry.entryGroupId === null ? '' : String(entry.entryGroupId),
      parentEntryIds: entry.parentEntryIds,
      fieldValues: Object.fromEntries(
        entry.fieldValues.map((fieldValue) => [
          fieldValue.fieldDefinitionId,
          fieldValue.referencedEntryIds.length > 0
            ? fieldValue.referencedEntryIds.join(',')
            : fieldValue.value ?? '',
        ]),
      ),
    })
    setDialog('catalogEntry')
  }

  const openCatalogEntryDetail = (entry: CatalogEntry, catalogId?: number) => {
    const catalogEntryBucket = Object.entries(catalogEntriesByCatalogId).find(([, entries]) =>
      entries.some((catalogEntry) => catalogEntry.id === entry.id),
    )
    const targetCatalogId =
      catalogId ?? (catalogEntryBucket === undefined ? selectedCatalog?.id ?? null : Number(catalogEntryBucket[0]))

    setSelectedObjectId(null)
    setActiveTab('database')
    setActiveSection('catalogs')
    setIsObjectPageOpen(false)
    if (targetCatalogId !== null && Number.isFinite(targetCatalogId)) {
      setSelectedCatalogId(targetCatalogId)
      setCatalogEntries((catalogEntriesByCatalogId[targetCatalogId] ?? [entry]).map((catalogEntry) =>
        catalogEntry.id === entry.id ? entry : catalogEntry,
      ))
    }
    setSelectedCatalogEntryId(entry.id)
    if (detailMode === 'modal') {
      setDialog('catalogEntryDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, targetCatalogId)
    }
  }

  const linkableObjects = useMemo(() => {
    const objectsById = new Map<number, StoryObject>()

    Object.values(objectsByType).flat().forEach((storyObject) => objectsById.set(storyObject.id, storyObject))
    visibleObjects.forEach((storyObject) => objectsById.set(storyObject.id, storyObject))
    if (selectedObject !== null) {
      objectsById.set(selectedObject.id, selectedObject)
    }

    return Array.from(objectsById.values())
  }, [objectsByType, selectedObject, visibleObjects])

  const catalogEntryLinkTargets = useMemo(() => {
    const entriesById = new Map<number, CatalogEntryLinkTarget>()

    Object.entries(catalogEntriesByCatalogId).forEach(([catalogId, entries]) => {
      entries.forEach((entry) => entriesById.set(entry.id, { catalogId: Number(catalogId), entry }))
    })

    if (selectedCatalog !== null) {
      catalogEntries.forEach((entry) => entriesById.set(entry.id, { catalogId: selectedCatalog.id, entry }))
    }

    if (selectedCatalog !== null && selectedCatalogEntry !== null) {
      entriesById.set(selectedCatalogEntry.id, { catalogId: selectedCatalog.id, entry: selectedCatalogEntry })
    }

    return Array.from(entriesById.values())
  }, [catalogEntries, catalogEntriesByCatalogId, selectedCatalog, selectedCatalogEntry])

  const catalogEntryLinksById = useMemo(
    () => new Map(catalogEntryLinkTargets.map((target) => [target.entry.id, target])),
    [catalogEntryLinkTargets],
  )

  const textLinkTargets = useMemo(() => {
    const targets: TextLinkTarget[] = []

    linkableObjects.forEach((storyObject) => {
      const labels = [storyObject.name, storyObject.surname ?? '', getObjectFullName(storyObject)]

      labels
        .map((label) => label.trim())
        .filter((label, index, labelsList) => label.length > 0 && labelsList.indexOf(label) === index)
        .forEach((label) => {
          targets.push({
            key: `object-${storyObject.id}-${label}`,
            label,
            onOpen: () => openObjectDetail(storyObject),
          })
        })
    })

    catalogEntryLinkTargets.forEach(({ catalogId, entry }) => {
      targets.push({
        key: `catalog-entry-${catalogId}-${entry.id}`,
        label: entry.name,
        onOpen: () => openCatalogEntryDetail(entry, catalogId),
      })
    })

    return targets
  }, [catalogEntryLinkTargets, linkableObjects, openCatalogEntryDetail, openObjectDetail])

  const deletePendingCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null || pendingDeleteCatalogEntryId === null) {
      return
    }

    try {
      await deleteCatalogEntryRequest(selectedProjectId, selectedCatalog.id, pendingDeleteCatalogEntryId)
      setCatalogEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== pendingDeleteCatalogEntryId))
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]: (currentEntriesByCatalogId[selectedCatalog.id] ?? []).filter(
          (entry) => entry.id !== pendingDeleteCatalogEntryId,
        ),
      }))
      setSelectedCatalogEntryId((currentId) => (currentId === pendingDeleteCatalogEntryId ? null : currentId))
      setPendingDeleteCatalogEntryId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось удалить запись каталога.')
    }
  }

  const saveTimelineEvent = async () => {
    if (selectedProjectId === null || timelineDraft.title.trim().length === 0) {
      return
    }

    try {
      const created = await createTimelineEventRequest(selectedProjectId, timelineDraft)
      setTimelineEvents((currentEvents) => [...currentEvents, created])
      setTimelineDraft({
        title: '',
        description: '',
        startLabel: '',
        endLabel: '',
        startValue: '',
        endValue: '',
        category: '',
        color: '',
        participants: [],
        changes: [],
      })
      setDialog(null)
      setActiveTab('timeline')
    } catch {
      setMessage('Не удалось создать событие.')
    }
  }

  const renderContent = () => {
    if (isSettingsPageOpen) {
      return (
        <SettingsPage
          detailMode={detailMode}
          groupDisplayMode={groupDisplayMode}
          previewLanguage={previewLanguage}
          previewTheme={previewTheme}
          ui={ui}
          onDetailModeChange={setDetailMode}
          onGroupDisplayModeChange={setGroupDisplayMode}
          onLanguageChange={setPreviewLanguage}
          onThemeChange={setPreviewTheme}
        />
      )
    }

    if (selectedProject === null) {
      return (
        <div className="sp-empty">
          <strong>{currentUser === null ? 'Войдите в аккаунт' : 'Проектов пока нет'}</strong>
          <span>
            {currentUser === null
              ? 'Макет использует настоящие API-функции, поэтому нужен вход.'
              : 'Создание проектов пока оставлено в основном интерфейсе.'}
          </span>
        </div>
      )
    }

    if (activeTab === 'relations') {
      return <RelationsPage objects={visibleObjects} ui={ui} onSelect={openObjectDetail} />
    }

    if (activeTab === 'timeline') {
      return <TimelinePage events={visibleTimelineEvents} ui={ui} onCreate={() => setDialog('timelineEvent')} />
    }

    if (detailMode === 'page' && isObjectPageOpen && selectedObject !== null) {
      return (
        <div className="sp-object-page">
          <div className="sp-content-head">
            <div>
              <h2>{selectedObject.name}</h2>
              <p>Отдельная страница досье объекта</p>
            </div>
            <button
              className="sp-button sp-back-button"
              type="button"
              onClick={() => navigateToPreview(selectedProjectId, 'database', activeSection)}
            >
              Вернуть панель
            </button>
          </div>
          <ObjectDetail
            activeTab={dossierTab}
            attributeDefinitions={attributeDefinitions}
            galleryImageCaption={galleryImageCaption}
            galleryImagePath={galleryImagePath}
            storyObject={selectedObject}
            textLinkTargets={textLinkTargets}
            timelineEvents={timelineEvents}
            ui={ui}
            onAddGalleryImage={() => void addGalleryImage()}
            onDelete={() => setDialog('confirmDeleteObject')}
            onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
            onEdit={() => openEditObjectDialog(selectedObject)}
            onGalleryCaptionChange={setGalleryImageCaption}
            onGalleryImageUpload={async (file) => {
              if (file !== null) {
                const result = await uploadImageRequest(file)
                setGalleryImagePath(result.path)
              }
            }}
            onTabChange={setDossierTab}
          />
        </div>
      )
    }

    if (activeSection === 'catalogs' && detailMode === 'page' && selectedCatalogEntry !== null) {
      return (
        <div className="sp-object-page">
          <div className="sp-content-head">
            <div>
              <h2>{selectedCatalogEntry.name}</h2>
              <p>{selectedCatalog?.name ?? ui.catalog}</p>
            </div>
            <button className="sp-button sp-back-button" type="button" onClick={() => setSelectedCatalogEntryId(null)}>
              Назад
            </button>
          </div>
          <CatalogEntryDetail
            catalog={selectedCatalog}
            catalogEntryLinksById={catalogEntryLinksById}
            entry={selectedCatalogEntry}
            textLinkTargets={textLinkTargets}
            ui={ui}
            onDelete={() => {
              setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
              setDialog('confirmDeleteCatalogEntry')
            }}
            onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
          />
        </div>
      )
    }

    if (activeSection === 'catalogs') {
      return (
        <CatalogsWorkspace
          catalogEntries={catalogEntries}
          catalogGroups={catalogGroups}
          catalogs={visibleCatalogs}
          groupDisplayMode={groupDisplayMode}
          selectedCatalog={selectedCatalog}
          selectedCatalogGroupId={selectedCatalogGroupId}
          textLinkTargets={textLinkTargets}
          ui={ui}
          onDeleteEntry={(entry) => {
            setPendingDeleteCatalogEntryId(entry.id)
            setDialog('confirmDeleteCatalogEntry')
          }}
          onEditCatalog={(catalog) => openEditCatalog(catalog)}
          onEditEntry={(entry) => openEditCatalogEntry(entry)}
          onEditGroup={(group) => openEditCatalogGroup(group)}
          onCreateGroup={() => {
            setCatalogGroupName('')
            setEditingCatalogGroupId(null)
            setDialog('catalogGroup')
          }}
          onCreateEntry={() => {
            setCatalogEntryDraft({
              name: '',
              description: '',
              imagePath: null,
              entryGroupId: selectedCatalogGroupId === null ? '' : String(selectedCatalogGroupId),
              parentEntryIds: [],
              fieldValues: {},
            })
            setEditingCatalogEntryId(null)
            setDialog('catalogEntry')
          }}
          onDeleteCatalog={() => {
            setPendingDeleteCatalogId(selectedCatalog?.id ?? null)
            setDialog('confirmDeleteCatalog')
          }}
          onDeleteGroup={(groupId) => {
            setSelectedCatalogGroupId(groupId)
            setDialog('confirmDeleteCatalogGroup')
          }}
          onSelectCatalog={(catalogId) => navigateToPreview(selectedProjectId, 'database', 'catalogs', null, catalogId)}
          onOpenEntry={openCatalogEntryDetail}
          onSelectGroup={setSelectedCatalogGroupId}
        />
      )
    }

    if (activeSection === 'attributes') {
      return (
        <AttributesWorkspace
          attributeDefinitionDraft={attributeDefinitionDraft}
          attributeDefinitions={attributeDefinitions}
          attributeGroupName={attributeGroupName}
          attributeGroups={attributeGroups}
          groupDisplayMode={groupDisplayMode}
          editingAttributeDefinitionId={editingAttributeDefinitionId}
          selectedAttributeGroupId={selectedAttributeGroupId}
          ui={ui}
          onCancelAttributeEdit={() => {
            setEditingAttributeDefinitionId(null)
            setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
          }}
          onAttributeDefinitionDraftChange={setAttributeDefinitionDraft}
          onAttributeGroupNameChange={setAttributeGroupName}
          onCreateAttribute={() => void saveAttributeDefinition()}
          onCreateGroup={() => void saveAttributeGroup()}
          onDeleteAttribute={(definition) => {
            setPendingDeleteAttributeDefinitionId(definition.id)
            setDialog('confirmDeleteAttribute')
          }}
          onDeleteGroup={(group) => {
            setPendingDeleteAttributeGroupId(group.id)
            setDialog('confirmDeleteAttributeGroup')
          }}
          onEditAttribute={openEditAttributeDefinition}
          onEditGroup={openEditAttributeGroup}
          onSelectGroup={setSelectedAttributeGroupId}
        />
      )
    }

    return (
      <>
        <div className="sp-content-head">
          <div>
            <h2>{isObjectSection(activeSection) ? getObjectSectionLabel(activeSection) : ui.database}</h2>
            <p>{ui.objectData}</p>
          </div>
          <div className="sp-filters">
            <button className="sp-pill active" type="button">{ui.all}</button>
            <button className="sp-pill" type="button">Активные</button>
            <button className="sp-pill" type="button">Избранные</button>
          </div>
        </div>
        <div className="sp-toolbar">
          <span>
            {ui.view}: {ui.database} / {isObjectSection(activeSection) ? getObjectSectionLabel(activeSection) : ui.catalogs}
          </span>
          <div className="sp-switch">
            <button
              className={layoutMode === 'grid' ? 'active' : ''}
              type="button"
              onClick={() => setLayoutMode('grid')}
              aria-label="Grid"
            >
              <span className="sp-view-icon grid" aria-hidden="true" />
            </button>
            <button
              className={layoutMode === 'list' ? 'active' : ''}
              type="button"
              onClick={() => setLayoutMode('list')}
              aria-label="List"
            >
              <span className="sp-view-icon list" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={`sp-cards ${layoutMode === 'list' ? 'list' : ''}`}>
          {visibleObjects.map((storyObject) => (
            <article
              className={`sp-card ${storyObject.id === selectedObject?.id ? 'selected' : ''}`}
              key={storyObject.id}
            >
              <button className="sp-card-main" type="button" onClick={() => openObjectDetail(storyObject)}>
                <ObjectPortrait storyObject={storyObject} />
              </button>
              <div className="sp-card-body" onClick={() => openObjectDetail(storyObject)}>
                <h3>{getObjectFullName(storyObject)}</h3>
                <span>{storyObject.role ?? storyObject.typeKey}</span>
                <div className="sp-tags">
                  {storyObject.attributes.slice(0, 3).map((attribute) => (
                    <span key={attribute.id}>{attribute.name}</span>
                  ))}
                </div>
              </div>
              <div className="sp-card-menu">
                <button
                  aria-label={`${storyObject.name}: действия`}
                  type="button"
                  onClick={() =>
                    setActiveObjectMenuId((currentId) => (currentId === storyObject.id ? null : storyObject.id))
                  }
                >
                  ⋮
                </button>
                {activeObjectMenuId === storyObject.id && (
                  <div className="sp-card-dropdown">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveObjectMenuId(null)
                        openEditObjectDialog(storyObject)
                      }}
                    >
                      {ui.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveObjectMenuId(null)
                        setSelectedObjectId(storyObject.id)
                        setDialog('confirmDeleteObject')
                      }}
                    >
                      {ui.delete}
                    </button>
                  </div>
                )}
              </div>
              <div className="sp-card-actions" aria-hidden="true">
                <button type="button" onClick={() => openEditObjectDialog(storyObject)}>
                  {ui.edit}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedObjectId(storyObject.id)
                    setDialog('confirmDeleteObject')
                  }}
                >
                  {ui.delete}
                </button>
              </div>
            </article>
          ))}
          {visibleObjects.length === 0 && (
            <div className="sp-empty">
              <strong>{ui.noObjects}</strong>
              <span>{ui.noObjectsHint}</span>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <main className={`style-preview ${previewTheme === 'dark' ? 'theme-dark' : 'theme-light'}`} lang={previewLanguage}>
      <div className="sp-shell">
        <header className="sp-topbar">
          <div className="sp-brand">
            <div className="sp-logo">S</div>
            <div>
              <h1>StoryDB</h1>
              <span>{ui.appSubtitle}</span>
            </div>
          </div>
          <label className="sp-search">
            <svg aria-hidden="true" className="sp-search-svg" fill="none" viewBox="0 0 24 24">
              <path d="m21 21-4.4-4.4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input placeholder={ui.searchPlaceholder} />
          </label>
          <div className="sp-actions">
            <button className="sp-button" type="button" onClick={() => setIsSettingsOpen((value) => !value)}>
              {ui.settings}
            </button>
            <div className="sp-profile">
            <button className="sp-avatar-button" type="button" onClick={() => setIsSettingsOpen((value) => !value)}>
              {currentUser?.displayName.slice(0, 1).toUpperCase() ?? 'A'}
            </button>
            {isSettingsOpen && (
              <div className="sp-profile-menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsSettingsPageOpen(true)
                    setDialog(null)
                  }}
                >
                  {ui.settings}
                </button>
              </div>
            )}
            </div>
            {currentUser === null ? (
              <button className="sp-button primary" type="button" onClick={() => setDialog('auth')}>
                {ui.login}
              </button>
            ) : (
              <button className="sp-button primary sp-top-create" type="button" onClick={openCreateObjectDialog}>
                + {ui.newObject}
              </button>
            )}
          </div>
        </header>

        <div className="sp-projectbar">
          <div>
            <span>{ui.project}</span>
            <select
              value={selectedProjectId ?? ''}
              onChange={(event) => {
                const nextProjectId = event.target.value === '' ? null : Number(event.target.value)

                navigateToPreview(nextProjectId, 'database', 'characters', null, null)
              }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sp-tabs">
            {(['database', 'relations', 'timeline'] as PreviewTab[]).map((tab) => (
              <button
                className={activeTab === tab ? 'active' : ''}
                key={tab}
                type="button"
                onClick={() => {
                  navigateToWorkspace(tab, activeSection, null, selectedCatalogId)
                }}
              >
                {tab === 'database' ? ui.database : tab === 'relations' ? ui.relations : ui.timeline}
              </button>
            ))}
          </div>
          {currentUser !== null && (
            <button className="sp-button primary sp-project-create" type="button" onClick={openCreateObjectDialog}>
              + {ui.newObject}
            </button>
          )}
        </div>

        <div
          className={`sp-workspace ${
            !isSettingsPageOpen &&
            detailMode === 'panel' &&
            activeTab === 'database' &&
            (selectedObject !== null || (activeSection === 'catalogs' && selectedCatalogEntry !== null))
              ? 'with-detail'
              : ''
          }`}
        >
          <aside className="sp-sidebar">
            <nav className="sp-sidebar-tabs" aria-label={ui.project}>
              {(['database', 'relations', 'timeline'] as PreviewTab[]).map((tab) => (
                <button
                  className={activeTab === tab ? 'active' : ''}
                  key={tab}
                  type="button"
                  onClick={() => {
                    navigateToWorkspace(tab, activeSection, null, selectedCatalogId)
                  }}
                >
                  {tab === 'database' ? ui.database : tab === 'relations' ? ui.relations : ui.timeline}
                </button>
              ))}
              {currentUser !== null && (
                <button className="create" type="button" onClick={openCreateObjectDialog}>
                  + {ui.newObject}
                </button>
              )}
            </nav>
            <div className="sp-project-card">
              <strong>{selectedProject?.name ?? ui.projectNotSelected}</strong>
              <span>{visibleObjects.length} объектов · {visibleTimelineEvents.length} событий</span>
            </div>
            <section>
              <p>{ui.database}</p>
              {objectSections
                .filter((section) => enabledObjectTypes.includes(section.key))
                .map((section) => (
                  <button
                    className={activeSection === section.key && activeTab === 'database' ? 'active' : ''}
                    key={section.key}
                    type="button"
                    onClick={() => navigateToWorkspace('database', section.key)}
                  >
                    <SectionIcon name={section.icon} />
                    {ui[section.labelKey]}
                  </button>
                ))}
            </section>
            <section>
              <p>{ui.catalogs}</p>
              <button
                className={activeSection === 'attributes' && activeTab === 'database' ? 'active' : ''}
                type="button"
                onClick={() => navigateToWorkspace('database', 'attributes')}
              >
                <SectionIcon name="attributes" />
                {ui.attributes}
              </button>
              {groupDisplayMode === 'subtabs' && activeSection === 'attributes' && activeTab === 'database' && (
                <div className="sp-sidebar-subtabs">
                  <button
                    className={selectedAttributeGroupId === null ? 'active' : ''}
                    type="button"
                    onClick={() => setSelectedAttributeGroupId(null)}
                  >
                    {ui.all}
                  </button>
                  {attributeGroups.map((group) => (
                    <div className="sp-sidebar-subtab-row" key={group.id}>
                    <button
                      className={selectedAttributeGroupId === group.id ? 'active' : ''}
                      type="button"
                      onClick={() => setSelectedAttributeGroupId(group.id)}
                    >
                      {group.name}
                    </button>
                    <KebabMenu
                      ui={ui}
                      onDelete={() => {
                        setPendingDeleteAttributeGroupId(group.id)
                        setDialog('confirmDeleteAttributeGroup')
                      }}
                      onEdit={() => openEditAttributeGroup(group)}
                    />
                    </div>
                  ))}
                </div>
              )}
              {visibleCatalogs.map((catalog) => (
                <div className="sp-sidebar-catalog" key={catalog.id}>
                  <div className="sp-sidebar-catalog-row">
                  <button
                    className={
                      activeSection === 'catalogs' && activeTab === 'database' && selectedCatalog?.id === catalog.id
                        ? 'active'
                        : ''
                    }
                    type="button"
                    onClick={() => {
                      setSelectedCatalogGroupId(null)
                      navigateToWorkspace('database', 'catalogs', null, catalog.id)
                    }}
                  >
                    <SectionIcon name="catalogs" />
                    {catalog.name}
                  </button>
                  <KebabMenu
                    ui={ui}
                    onDelete={() => {
                      setPendingDeleteCatalogId(catalog.id)
                      setDialog('confirmDeleteCatalog')
                    }}
                    onEdit={() => openEditCatalog(catalog)}
                  />
                  </div>
                  {groupDisplayMode === 'subtabs' && activeSection === 'catalogs' && activeTab === 'database' && selectedCatalog?.id === catalog.id && (
                    <div className="sp-sidebar-subtabs">
                      <button
                        className={selectedCatalogGroupId === null ? 'active' : ''}
                        type="button"
                        onClick={() => setSelectedCatalogGroupId(null)}
                      >
                        {ui.all}
                      </button>
                      {catalogGroups.map((group) => (
                        <div className="sp-sidebar-subtab-row" key={group.id}>
                        <button
                          className={selectedCatalogGroupId === group.id ? 'active' : ''}
                          type="button"
                          onClick={() => setSelectedCatalogGroupId(group.id)}
                        >
                          {group.name}
                        </button>
                        <KebabMenu
                          ui={ui}
                          onDelete={() => {
                            setSelectedCatalogGroupId(group.id)
                            setDialog('confirmDeleteCatalogGroup')
                          }}
                          onEdit={() => openEditCatalogGroup(group)}
                        />
                        </div>
                      ))}
                      <button
                        className="sp-sidebar-create"
                        type="button"
                        onClick={() => {
                          setCatalogGroupName('')
                          setEditingCatalogGroupId(null)
                          setDialog('catalogGroup')
                        }}
                      >
                        + {ui.newGroup}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {currentUser !== null && (
                <button
                  className="sp-sidebar-create"
                  type="button"
                  onClick={() => {
                    setEditingCatalogId(null)
                    setCatalogName('')
                    setCatalogDescription('')
                    setCatalogSupportsHierarchy(false)
                    setDialog('catalog')
                  }}
                >
                  + {ui.newCatalog}
                </button>
              )}
            </section>
          </aside>

          <section className="sp-content">
            {isLoading ? <div className="sp-empty">{ui.loading}</div> : renderContent()}
          </section>

          {!isSettingsPageOpen && detailMode === 'panel' && activeTab === 'database' && selectedObject !== null && (
            <aside className="sp-detail">
              <ObjectDetail
                activeTab={dossierTab}
                attributeDefinitions={attributeDefinitions}
                galleryImageCaption={galleryImageCaption}
                galleryImagePath={galleryImagePath}
                storyObject={selectedObject}
                textLinkTargets={textLinkTargets}
                timelineEvents={timelineEvents}
                ui={ui}
                onAddGalleryImage={() => void addGalleryImage()}
                onDelete={() => setDialog('confirmDeleteObject')}
                onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
                onEdit={() => openEditObjectDialog(selectedObject)}
                onGalleryCaptionChange={setGalleryImageCaption}
                onGalleryImageUpload={async (file) => {
                  if (file !== null) {
                    const result = await uploadImageRequest(file)
                    setGalleryImagePath(result.path)
                  }
                }}
                onTabChange={setDossierTab}
              />
            </aside>
          )}
          {!isSettingsPageOpen &&
            detailMode === 'panel' &&
            activeTab === 'database' &&
            activeSection === 'catalogs' &&
            selectedObject === null &&
            selectedCatalogEntry !== null && (
              <aside className="sp-detail">
                <CatalogEntryDetail
                  catalog={selectedCatalog}
                  catalogEntryLinksById={catalogEntryLinksById}
                  entry={selectedCatalogEntry}
                  textLinkTargets={textLinkTargets}
                  ui={ui}
                  onDelete={() => {
                    setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
                    setDialog('confirmDeleteCatalogEntry')
                  }}
                  onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
                />
              </aside>
            )}
        </div>
      </div>

      {message !== null && (
        <button className="sp-toast" type="button" onClick={() => setMessage(null)}>
          {message}
        </button>
      )}

      {dialog === 'auth' && (
        <PreviewDialog title={authMode === 'login' ? ui.login : ui.register} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Email
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
            </label>
            <label>
              {ui.password}
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
            </label>
            {authMode === 'register' && (
              <label>
                Имя
                <input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} />
              </label>
            )}
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? ui.createAccount : ui.login}
              </button>
              <button className="sp-button primary" type="button" onClick={() => void submitAuth()}>
                Продолжить
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'profile' && (
        <PreviewDialog title={ui.profile} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{currentUser?.displayName ?? 'Гость'}</strong>
            <span>{currentUser?.email ?? 'Вход не выполнен'}</span>
          </div>
          {currentUser !== null && (
            <button className="sp-button" type="button" onClick={() => void logout()}>
              {ui.logout}
            </button>
          )}
        </PreviewDialog>
      )}

      {dialog === 'object' && (
        <PreviewDialog title={editingObjectId === null ? ui.newObject : ui.editor} onClose={() => setDialog(null)}>
          <ObjectEditor
            activeType={isObjectSection(activeSection) ? activeSection : 'characters'}
            attributeDefinitions={attributeDefinitions}
            attributeGroups={attributeGroups}
            catalogEntriesByCatalogId={catalogEntriesByCatalogId}
            catalogGroupsByCatalogId={catalogGroupsByCatalogId}
            catalogs={catalogs}
            draftAttributes={draftAttributes}
            draftCatalogSelections={draftCatalogSelections}
            draftCharacterRelationships={draftCharacterRelationships}
            draftHierarchySelections={draftHierarchySelections}
            editorTimelineEventId={editorTimelineEventId}
            hierarchyGroups={hierarchyGroups}
            hierarchyNodesByGroupId={hierarchyNodesByGroupId}
            objectAge={objectAge}
            objectDescription={objectDescription}
            objectEditorTab={objectEditorTab}
            objectImagePath={objectImagePath}
            objectName={objectName}
            objectRole={objectRole}
            objectSurname={objectSurname}
            objectsByType={objectsByType}
            ownedItemIds={ownedItemIds}
            ownerCharacterIds={ownerCharacterIds}
            ownerOrganizationIds={ownerOrganizationIds}
            saveObjectAsTimelineChange={saveObjectAsTimelineChange}
            timelineEvents={timelineEvents}
            territoryPlaceIds={territoryPlaceIds}
            ui={ui}
            isSaving={isObjectSaving}
            onCancel={() => setDialog(null)}
            onDraftAttributesChange={setDraftAttributes}
            onDraftCatalogSelectionsChange={setDraftCatalogSelections}
            onDraftCharacterRelationshipsChange={setDraftCharacterRelationships}
            onDraftHierarchySelectionsChange={setDraftHierarchySelections}
            onEditorTimelineEventIdChange={setEditorTimelineEventId}
            onImageUpload={uploadObjectImage}
            onObjectAgeChange={setObjectAge}
            onObjectDescriptionChange={setObjectDescription}
            onObjectEditorTabChange={setObjectEditorTab}
            onObjectNameChange={setObjectName}
            onObjectRoleChange={setObjectRole}
            onObjectSurnameChange={setObjectSurname}
            onOwnedItemIdsChange={setOwnedItemIds}
            onOwnerCharacterIdsChange={setOwnerCharacterIds}
            onOwnerOrganizationIdsChange={setOwnerOrganizationIds}
            onSave={() => void saveObject()}
            onSaveObjectAsTimelineChange={setSaveObjectAsTimelineChange}
            onTerritoryPlaceIdsChange={setTerritoryPlaceIds}
            toggleNumberSelection={toggleNumberSelection}
          />
        </PreviewDialog>
      )}

      {dialog === 'objectLegacy' && (
        <PreviewDialog title="Новый объект" onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Название
              <ObjectEditor
                activeType={isObjectSection(activeSection) ? activeSection : 'characters'}
                attributeDefinitions={attributeDefinitions}
                attributeGroups={attributeGroups}
                catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                catalogGroupsByCatalogId={catalogGroupsByCatalogId}
                catalogs={catalogs}
                draftAttributes={draftAttributes}
                draftCatalogSelections={draftCatalogSelections}
                draftCharacterRelationships={draftCharacterRelationships}
                draftHierarchySelections={draftHierarchySelections}
                editorTimelineEventId={editorTimelineEventId}
                hierarchyGroups={hierarchyGroups}
                hierarchyNodesByGroupId={hierarchyNodesByGroupId}
                objectAge={objectAge}
                objectDescription={objectDescription}
                objectEditorTab={objectEditorTab}
                objectImagePath={objectImagePath}
                objectName={objectName}
                objectRole={objectRole}
                objectSurname={objectSurname}
                objectsByType={objectsByType}
                ownedItemIds={ownedItemIds}
                ownerCharacterIds={ownerCharacterIds}
                ownerOrganizationIds={ownerOrganizationIds}
                saveObjectAsTimelineChange={saveObjectAsTimelineChange}
                timelineEvents={timelineEvents}
                territoryPlaceIds={territoryPlaceIds}
                ui={ui}
                isSaving={isObjectSaving}
                onCancel={() => setDialog(null)}
                onDraftAttributesChange={setDraftAttributes}
                onDraftCatalogSelectionsChange={setDraftCatalogSelections}
                onDraftCharacterRelationshipsChange={setDraftCharacterRelationships}
                onDraftHierarchySelectionsChange={setDraftHierarchySelections}
                onEditorTimelineEventIdChange={setEditorTimelineEventId}
                onImageUpload={uploadObjectImage}
                onObjectAgeChange={setObjectAge}
                onObjectDescriptionChange={setObjectDescription}
                onObjectEditorTabChange={setObjectEditorTab}
                onObjectNameChange={setObjectName}
                onObjectRoleChange={setObjectRole}
                onObjectSurnameChange={setObjectSurname}
                onOwnedItemIdsChange={setOwnedItemIds}
                onOwnerCharacterIdsChange={setOwnerCharacterIds}
                onOwnerOrganizationIdsChange={setOwnerOrganizationIds}
                onSave={() => void saveObject()}
                onSaveObjectAsTimelineChange={setSaveObjectAsTimelineChange}
                onTerritoryPlaceIdsChange={setTerritoryPlaceIds}
                toggleNumberSelection={toggleNumberSelection}
              />
              <input className="sp-legacy-object-input" value={objectName} onChange={(event) => setObjectName(event.target.value)} />
            </label>
            <label>
              Фамилия
              <input value={objectSurname} onChange={(event) => setObjectSurname(event.target.value)} />
            </label>
            <label>
              Роль
              <input value={objectRole} onChange={(event) => setObjectRole(event.target.value)} />
            </label>
            <label>
              Возраст
              <input value={objectAge} onChange={(event) => setObjectAge(event.target.value)} />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={objectImagePath}
              label={ui.image}
              onFileSelected={(file) => void uploadObjectImage(file)}
            />
            <label className="wide">
              Описание
              <textarea value={objectDescription} onChange={(event) => setObjectDescription(event.target.value)} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveObject()}>
                Сохранить
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'detail' && selectedObject !== null && (
        <PreviewDialog title={`Досье: ${selectedObject.name}`} onClose={() => setDialog(null)}>
          <ObjectDetail
            activeTab={dossierTab}
            attributeDefinitions={attributeDefinitions}
            galleryImageCaption={galleryImageCaption}
            galleryImagePath={galleryImagePath}
            storyObject={selectedObject}
            textLinkTargets={textLinkTargets}
            timelineEvents={timelineEvents}
            ui={ui}
            onAddGalleryImage={() => void addGalleryImage()}
            onDelete={() => setDialog('confirmDeleteObject')}
            onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
            onEdit={() => openEditObjectDialog(selectedObject)}
            onGalleryCaptionChange={setGalleryImageCaption}
            onGalleryImageUpload={async (file) => {
              if (file !== null) {
                const result = await uploadImageRequest(file)
                setGalleryImagePath(result.path)
              }
            }}
            onTabChange={setDossierTab}
          />
        </PreviewDialog>
      )}
      {dialog === 'confirmDeleteObject' && selectedObject !== null && (
        <PreviewDialog title={ui.deleteObject} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{selectedObject.name}</strong>
            <span>Объект будет удален из проекта.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              {ui.cancel}
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deleteSelectedObject()}>
              {ui.delete}
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'attributeGroup' && (
        <PreviewDialog title={editingAttributeGroupId === null ? ui.newGroup : ui.edit} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label className="wide">
              Название группы
              <input value={attributeGroupName} onChange={(event) => setAttributeGroupName(event.target.value)} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                {ui.cancel}
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveAttributeGroup()}>
                {ui.save}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteAttributeGroup' && (
        <PreviewDialog title={ui.deleteGroup} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{attributeGroups.find((group) => group.id === pendingDeleteAttributeGroupId)?.name ?? 'Группа'}</strong>
            <span>Группа и характеристики внутри нее будут удалены.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              {ui.cancel}
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deletePendingAttributeGroup()}>
              {ui.delete}
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteAttribute' && (
        <PreviewDialog title={ui.delete} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{attributeDefinitions.find((definition) => definition.id === pendingDeleteAttributeDefinitionId)?.name ?? ui.attributes}</strong>
            <span>Характеристика будет удалена из списка и из связанных объектов.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              {ui.cancel}
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deletePendingAttributeDefinition()}>
              {ui.delete}
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'catalog' && (
        <PreviewDialog title={editingCatalogId === null ? ui.newCatalog : ui.edit} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Название
              <input value={catalogName} onChange={(event) => setCatalogName(event.target.value)} />
            </label>
            <label>
              Иерархия
              <select
                value={catalogSupportsHierarchy ? 'yes' : 'no'}
                onChange={(event) => setCatalogSupportsHierarchy(event.target.value === 'yes')}
              >
                <option value="no">Обычный</option>
                <option value="yes">Иерархический</option>
              </select>
            </label>
            <label className="wide">
              Описание
              <textarea value={catalogDescription} onChange={(event) => setCatalogDescription(event.target.value)} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveCatalog()}>
                {editingCatalogId === null ? ui.create : ui.save}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'catalogGroup' && selectedCatalog !== null && (
        <PreviewDialog title={`${editingCatalogGroupId === null ? ui.newGroup : ui.edit}: ${selectedCatalog.name}`} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label className="wide">
              Название группы
              <input value={catalogGroupName} onChange={(event) => setCatalogGroupName(event.target.value)} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveCatalogGroup()}>
                {editingCatalogGroupId === null ? ui.create : ui.save}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'catalogEntry' && selectedCatalog !== null && (
        <PreviewDialog title={`${editingCatalogEntryId === null ? ui.newCatalogEntry : ui.edit}: ${selectedCatalog.name}`} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Название
              <input
                value={catalogEntryDraft.name}
                onChange={(event) => setCatalogEntryDraft((draft) => ({ ...draft, name: event.target.value }))}
              />
            </label>
            <label>
              Группа
              <select
                value={catalogEntryDraft.entryGroupId}
                onChange={(event) => setCatalogEntryDraft((draft) => ({ ...draft, entryGroupId: event.target.value }))}
              >
                <option value="">Без группы</option>
                {catalogGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <CoverDropzone
              className="wide"
              imagePath={catalogEntryDraft.imagePath}
              label={ui.image}
              onFileSelected={(file) => {
                void uploadImageRequest(file).then((result) =>
                  setCatalogEntryDraft((draft) => ({ ...draft, imagePath: result.path })),
                )
              }}
            />
            <label className="wide">
              {ui.description}
              <textarea
                value={catalogEntryDraft.description}
                onChange={(event) => setCatalogEntryDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                {ui.cancel}
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveCatalogEntry()}>
                {editingCatalogEntryId === null ? ui.create : ui.save}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'catalogEntryDetail' && selectedCatalogEntry !== null && (
        <PreviewDialog title={selectedCatalogEntry.name} onClose={() => setDialog(null)}>
          <CatalogEntryDetail
            catalog={selectedCatalog}
            catalogEntryLinksById={catalogEntryLinksById}
            entry={selectedCatalogEntry}
            textLinkTargets={textLinkTargets}
            ui={ui}
            onDelete={() => {
              setPendingDeleteCatalogEntryId(selectedCatalogEntry.id)
              setDialog('confirmDeleteCatalogEntry')
            }}
            onEdit={() => openEditCatalogEntry(selectedCatalogEntry)}
          />
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteCatalogEntry' && (
        <PreviewDialog title={ui.delete} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{catalogEntries.find((entry) => entry.id === pendingDeleteCatalogEntryId)?.name ?? ui.entry}</strong>
            <span>Запись будет удалена из каталога.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              {ui.cancel}
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deletePendingCatalogEntry()}>
              {ui.delete}
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteCatalog' && (visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog) !== null && (
        <PreviewDialog title={ui.deleteCatalog} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{(visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog)?.name}</strong>
            <span>Каталог и связанные с ним данные будут удалены.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              Отмена
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deleteSelectedCatalog()}>
              Удалить
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteCatalogGroup' && (
        <PreviewDialog title={ui.deleteGroup} onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{catalogGroups.find((group) => group.id === selectedCatalogGroupId)?.name ?? 'Группа'}</strong>
            <span>Группа будет удалена из выбранного каталога.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              Отмена
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deleteSelectedCatalogGroup()}>
              Удалить
            </button>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'timelineEvent' && (
        <PreviewDialog title={ui.newEvent} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Название
              <input
                value={timelineDraft.title}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, title: event.target.value }))}
              />
            </label>
            <label>
              Категория
              <input
                value={timelineDraft.category}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, category: event.target.value }))}
              />
            </label>
            <label>
              Начало
              <input
                value={timelineDraft.startLabel}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, startLabel: event.target.value }))}
              />
            </label>
            <label>
              Значение начала
              <input
                value={timelineDraft.startValue}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, startValue: event.target.value }))}
              />
            </label>
            <label className="wide">
              Описание
              <textarea
                value={timelineDraft.description}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveTimelineEvent()}>
                Создать
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}
    </main>
  )
}

function ObjectPortrait({ storyObject }: { storyObject: StoryObject }) {
  const imageUrl = resolveAssetUrl(storyObject.imagePath)
  return (
    <div className="sp-portrait">
      {imageUrl === null ? (
        getInitials(storyObject.name)
      ) : (
        <img alt="" src={imageUrl} />
      )}
    </div>
  )
}

function SectionIcon({ name }: { name: 'characters' | 'items' | 'places' | 'organizations' | 'attributes' | 'catalogs' }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'sp-nav-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  if (name === 'characters') {
    return (
      <svg {...commonProps}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }

  if (name === 'items') {
    return (
      <svg {...commonProps}>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    )
  }

  if (name === 'places') {
    return (
      <svg {...commonProps}>
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
        <path d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    )
  }

  if (name === 'organizations') {
    return (
      <svg {...commonProps}>
        <path d="M4 21V8l8-4 8 4v13" />
        <path d="M9 21v-7h6v7" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    )
  }

  if (name === 'attributes') {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16" />
        <path d="M7 12h10" />
        <path d="M10 17h4" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16" />
      <path d="M9 5v14" />
    </svg>
  )
}

function KebabMenu({
  ui,
  onDelete,
  onEdit,
}: {
  ui: PreviewText
  onDelete: () => void
  onEdit: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="sp-inline-menu">
      <button aria-label="Действия" type="button" onClick={() => setIsOpen((value) => !value)}>
        ⋮
      </button>
      {isOpen && (
        <div className="sp-card-dropdown">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onEdit()
            }}
          >
            {ui.edit}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onDelete()
            }}
          >
            {ui.delete}
          </button>
        </div>
      )}
    </div>
  )
}

function CoverDropzone({
  className = '',
  imagePath,
  label,
  onFileSelected,
}: {
  className?: string
  imagePath: string | null
  label: string
  onFileSelected: (file: File) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const imageUrl = resolveAssetUrl(imagePath)
  const pickFile = (file: File | null | undefined) => {
    if (file !== null && file !== undefined && file.type.startsWith('image/')) {
      onFileSelected(file)
    }
  }

  return (
    <div
      className={`sp-cover-field ${className} ${isDragging ? 'dragging' : ''}`}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        pickFile(event.dataTransfer.files?.[0])
      }}
    >
      <span>{label}</span>
      <label className="sp-cover-dropzone">
        <input accept="image/*" type="file" onChange={(event) => pickFile(event.target.files?.[0])} />
        {imageUrl === null ? (
          <div className="sp-cover-placeholder">
            <strong>Перетащи изображение сюда</strong>
            <small>или нажми, чтобы выбрать файл</small>
          </div>
        ) : (
          <>
            <img alt="" src={imageUrl} />
            <div className="sp-cover-overlay">
              <strong>Заменить обложку</strong>
              <small>Перетащи новый файл или нажми</small>
            </div>
          </>
        )}
      </label>
    </div>
  )
}

function SettingsPage({
  detailMode,
  groupDisplayMode,
  previewLanguage,
  previewTheme,
  ui,
  onDetailModeChange,
  onGroupDisplayModeChange,
  onLanguageChange,
  onThemeChange,
}: {
  detailMode: DetailMode
  groupDisplayMode: GroupDisplayMode
  previewLanguage: PreviewLanguage
  previewTheme: PreviewTheme
  ui: PreviewText
  onDetailModeChange: (mode: DetailMode) => void
  onGroupDisplayModeChange: (mode: GroupDisplayMode) => void
  onLanguageChange: (language: PreviewLanguage) => void
  onThemeChange: (theme: PreviewTheme) => void
}) {
  const groupModeTitle = previewLanguage === 'ru' ? 'Отображение групп' : 'Group display'
  const groupModeBlocks = previewLanguage === 'ru' ? 'Блоки' : 'Blocks'
  const groupModeSubtabs = previewLanguage === 'ru' ? 'Подзаголовки' : 'Subtabs'

  return (
    <section className="sp-settings-page">
      <div className="sp-content-head">
        <div>
          <h2>{ui.settings}</h2>
          <p>{ui.detailDisplay}</p>
        </div>
      </div>
      <div className="sp-settings-grid">
        <label className="sp-setting-card">
          <span>{ui.language}</span>
          <select value={previewLanguage} onChange={(event) => onLanguageChange(event.target.value as PreviewLanguage)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="sp-setting-card">
          <span>{ui.theme}</span>
          <select value={previewTheme} onChange={(event) => onThemeChange(event.target.value as PreviewTheme)}>
            <option value="light">{ui.themeLight}</option>
            <option value="dark">{ui.themeDark}</option>
          </select>
        </label>
        <div className="sp-setting-card wide">
          <span>{ui.detailDisplay}</span>
          <div className="sp-segments">
            {(['modal', 'page', 'panel'] as DetailMode[]).map((mode) => (
              <button
                className={detailMode === mode ? 'active' : ''}
                key={mode}
                type="button"
                onClick={() => onDetailModeChange(mode)}
              >
                {mode === 'modal' ? ui.detailModal : mode === 'page' ? ui.detailPage : ui.detailPanel}
              </button>
            ))}
          </div>
        </div>
        <div className="sp-setting-card wide">
          <span>{groupModeTitle}</span>
          <div className="sp-segments">
            {(['blocks', 'subtabs'] as GroupDisplayMode[]).map((mode) => (
              <button
                className={groupDisplayMode === mode ? 'active' : ''}
                key={mode}
                type="button"
                onClick={() => onGroupDisplayModeChange(mode)}
              >
                {mode === 'blocks' ? groupModeBlocks : groupModeSubtabs}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AttributesWorkspace({
  attributeDefinitionDraft,
  attributeDefinitions,
  attributeGroupName,
  attributeGroups,
  groupDisplayMode,
  editingAttributeDefinitionId,
  selectedAttributeGroupId,
  ui,
  onCancelAttributeEdit,
  onAttributeDefinitionDraftChange,
  onAttributeGroupNameChange,
  onCreateAttribute,
  onCreateGroup,
  onDeleteAttribute,
  onDeleteGroup,
  onEditAttribute,
  onEditGroup,
  onSelectGroup,
}: {
  attributeDefinitionDraft: AttributeDefinitionDraft
  attributeDefinitions: AttributeDefinition[]
  attributeGroupName: string
  attributeGroups: AttributeGroup[]
  groupDisplayMode: GroupDisplayMode
  editingAttributeDefinitionId: number | null
  selectedAttributeGroupId: number | null
  ui: PreviewText
  onCancelAttributeEdit: () => void
  onAttributeDefinitionDraftChange: (draft: AttributeDefinitionDraft) => void
  onAttributeGroupNameChange: (name: string) => void
  onCreateAttribute: () => void
  onCreateGroup: () => void
  onDeleteAttribute: (definition: AttributeDefinition) => void
  onDeleteGroup: (group: AttributeGroup) => void
  onEditAttribute: (definition: AttributeDefinition) => void
  onEditGroup: (group: AttributeGroup) => void
  onSelectGroup: (groupId: number | null) => void
}) {
  const selectedGroup = attributeGroups.find((group) => group.id === selectedAttributeGroupId) ?? null
  const visibleDefinitions =
    selectedGroup === null
      ? attributeDefinitions
      : attributeDefinitions.filter((definition) => definition.groupName === selectedGroup.name)
  const language = ui === previewText.en ? 'en' : 'ru'
  const definitionsByGroup = groupAttributesByDefinition(
    visibleDefinitions.map((definition) => ({
      id: definition.id,
      attributeDefinitionId: definition.id,
      name: definition.name,
      value: definition.dataType,
    })),
    visibleDefinitions,
    ui.main,
  )
  const updateDraft = (patch: Partial<AttributeDefinitionDraft>) =>
    onAttributeDefinitionDraftChange({ ...attributeDefinitionDraft, ...patch })
  const groupNameForDraft = selectedGroup?.name ?? attributeDefinitionDraft.groupName

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{ui.attributes}</h2>
          <p>{ui.objectData}</p>
        </div>
      </div>
      <div className={`sp-attribute-catalog ${groupDisplayMode === 'subtabs' ? 'single' : ''}`}>
        {groupDisplayMode === 'blocks' && (
        <aside className="sp-catalog-list">
          <button className={selectedAttributeGroupId === null ? 'active' : ''} type="button" onClick={() => onSelectGroup(null)}>
            <strong>{ui.all}</strong>
            <span>{attributeDefinitions.length}</span>
          </button>
          {attributeGroups.map((group) => (
            <div className="sp-list-menu-row" key={group.id}>
            <button
              className={selectedAttributeGroupId === group.id ? 'active' : ''}
              type="button"
              onClick={() => onSelectGroup(group.id)}
            >
              <strong>{group.name}</strong>
              <span>{attributeDefinitions.filter((definition) => definition.groupName === group.name).length}</span>
            </button>
            <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group)} onEdit={() => onEditGroup(group)} />
            </div>
          ))}
          <div className="sp-inline-create">
            <input
              placeholder={ui.newGroup}
              value={attributeGroupName}
              onChange={(event) => onAttributeGroupNameChange(event.target.value)}
            />
            <button className="sp-button primary" type="button" onClick={onCreateGroup}>
              +
            </button>
          </div>
        </aside>
        )}
        <section className="sp-catalog-main">
          {groupDisplayMode === 'subtabs' && (
            <div className="sp-inline-create sp-inline-create-wide">
              <input
                placeholder={ui.newGroup}
                value={attributeGroupName}
                onChange={(event) => onAttributeGroupNameChange(event.target.value)}
              />
              <button className="sp-button primary" type="button" onClick={onCreateGroup}>
                +
              </button>
            </div>
          )}
          <div className="sp-attribute-definition-form">
            <div className="sp-form-row">
              <label>
                {ui.firstName}
                <input
                  list="sp-existing-attribute-definitions"
                  value={attributeDefinitionDraft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
              </label>
              <datalist id="sp-existing-attribute-definitions">
                {attributeDefinitions.map((definition) => (
                  <option key={definition.id} value={definition.name} />
                ))}
              </datalist>
              <label>
                Тип данных
                <select
                  value={attributeDefinitionDraft.dataType}
                  onChange={(event) => updateDraft({ dataType: event.target.value as AttributeDataType })}
                >
                  {(['text', 'number', 'select'] as AttributeDataType[]).map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {attributeDataTypeLabels[dataType][language]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedGroup === null && (
                <label>
                  {ui.group}
                  <select value={groupNameForDraft} onChange={(event) => updateDraft({ groupName: event.target.value })}>
                    <option value="">Без группы</option>
                    {attributeGroups.map((group) => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {attributeDefinitionDraft.dataType === 'number' && (
              <div className="sp-form-row">
                <label>
                  Мин.
                  <input value={attributeDefinitionDraft.minValue} onChange={(event) => updateDraft({ minValue: event.target.value })} />
                </label>
                <label>
                  Макс.
                  <input value={attributeDefinitionDraft.maxValue} onChange={(event) => updateDraft({ maxValue: event.target.value })} />
                </label>
                <label>
                  Ед.
                  <input value={attributeDefinitionDraft.unit} onChange={(event) => updateDraft({ unit: event.target.value })} />
                </label>
              </div>
            )}
            {attributeDefinitionDraft.dataType === 'select' && (
              <label className="sp-wide-label">
                Варианты через запятую
                <input
                  value={attributeDefinitionDraft.optionsText}
                  onChange={(event) => updateDraft({ optionsText: event.target.value })}
                />
              </label>
            )}
            {selectedGroup !== null && <span className="sp-muted-line">Группа: {selectedGroup.name}</span>}
            <div className="sp-inline-actions">
              {editingAttributeDefinitionId !== null && (
                <button className="sp-button" type="button" onClick={onCancelAttributeEdit}>
                  {ui.cancel}
                </button>
              )}
              <button className="sp-button primary" type="button" onClick={onCreateAttribute}>
                {editingAttributeDefinitionId === null ? ui.addAttribute : ui.save}
              </button>
            </div>
          </div>

          {visibleDefinitions.length === 0 ? (
            <div className="sp-empty">
              <strong>{ui.noObjects}</strong>
              <span>{ui.attributes}</span>
            </div>
          ) : (
            definitionsByGroup.map((group) => (
              <article className="sp-attribute-group" key={group.name}>
                <div className="sp-attribute-group-head">
                  <strong>{group.name}</strong>
                  <span>{group.attributes.length}</span>
                </div>
                {group.attributes.map((attribute) => {
                  const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                  return (
                    <div className="sp-row with-menu" key={attribute.id}>
                      <span>{attribute.name}</span>
                      <strong>{attribute.value ?? '-'}</strong>
                      {definition !== undefined && (
                        <KebabMenu
                          ui={ui}
                          onDelete={() => onDeleteAttribute(definition)}
                          onEdit={() => onEditAttribute(definition)}
                        />
                      )}
                    </div>
                  )
                })}
              </article>
            ))
          )}
        </section>
      </div>
    </>
  )
}

function ObjectEditor({
  activeType,
  attributeDefinitions,
  attributeGroups,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  editorTimelineEventId,
  hierarchyGroups,
  hierarchyNodesByGroupId,
  objectAge,
  objectDescription,
  objectEditorTab,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectsByType,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  saveObjectAsTimelineChange,
  timelineEvents,
  territoryPlaceIds,
  ui,
  isSaving,
  onCancel,
  onDraftAttributesChange,
  onDraftCatalogSelectionsChange,
  onDraftCharacterRelationshipsChange,
  onDraftHierarchySelectionsChange,
  onEditorTimelineEventIdChange,
  onImageUpload,
  onObjectAgeChange,
  onObjectDescriptionChange,
  onObjectEditorTabChange,
  onObjectNameChange,
  onObjectRoleChange,
  onObjectSurnameChange,
  onOwnedItemIdsChange,
  onOwnerCharacterIdsChange,
  onOwnerOrganizationIdsChange,
  onSave,
  onSaveObjectAsTimelineChange,
  onTerritoryPlaceIdsChange,
  toggleNumberSelection,
}: {
  activeType: ObjectTypeKey
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  draftAttributes: DraftAttribute[]
  draftCatalogSelections: DraftCatalogSelection[]
  draftCharacterRelationships: DraftCharacterRelationship[]
  draftHierarchySelections: DraftHierarchySelection[]
  editorTimelineEventId: string
  hierarchyGroups: HierarchyGroup[]
  hierarchyNodesByGroupId: Record<number, HierarchyNode[]>
  objectAge: string
  objectDescription: string
  objectEditorTab: ObjectEditorTab
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  saveObjectAsTimelineChange: boolean
  timelineEvents: TimelineEvent[]
  territoryPlaceIds: number[]
  ui: PreviewText
  isSaving: boolean
  onCancel: () => void
  onDraftAttributesChange: (attributes: DraftAttribute[]) => void
  onDraftCatalogSelectionsChange: (selections: DraftCatalogSelection[]) => void
  onDraftCharacterRelationshipsChange: (relationships: DraftCharacterRelationship[]) => void
  onDraftHierarchySelectionsChange: (selections: DraftHierarchySelection[]) => void
  onEditorTimelineEventIdChange: (eventId: string) => void
  onImageUpload: (file: File | null) => void
  onObjectAgeChange: (value: string) => void
  onObjectDescriptionChange: (value: string) => void
  onObjectEditorTabChange: (tab: ObjectEditorTab) => void
  onObjectNameChange: (value: string) => void
  onObjectRoleChange: (value: string) => void
  onObjectSurnameChange: (value: string) => void
  onOwnedItemIdsChange: (ids: number[]) => void
  onOwnerCharacterIdsChange: (ids: number[]) => void
  onOwnerOrganizationIdsChange: (ids: number[]) => void
  onSave: () => void
  onSaveObjectAsTimelineChange: (value: boolean) => void
  onTerritoryPlaceIdsChange: (ids: number[]) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
  const allCatalogEntries = Object.values(catalogEntriesByCatalogId).flat()
  const addAttribute = () => onDraftAttributesChange([...draftAttributes, { name: '', value: '' }])
  const addExistingAttribute = (definitionId: string) => {
    const definition = attributeDefinitions.find((item) => item.id === Number(definitionId))
    if (definition === undefined || draftAttributes.some((attribute) => attribute.name === definition.name)) {
      return
    }

    onDraftAttributesChange([...draftAttributes, { name: definition.name, value: '' }])
  }
  const addAttributeGroup = (groupName: string) => {
    const groupDefinitions = attributeDefinitions.filter((definition) =>
      groupName === '__main__' ? definition.groupName === null : definition.groupName === groupName,
    )
    const existingNames = new Set(draftAttributes.map((attribute) => attribute.name))
    const nextAttributes = [
      ...draftAttributes,
      ...groupDefinitions
        .filter((definition) => !existingNames.has(definition.name))
        .map((definition) => ({ name: definition.name, value: '' })),
    ]
    onDraftAttributesChange(nextAttributes)
  }
  const getDraftAttributeGroupName = (attribute: DraftAttribute) => {
    const definition = attributeDefinitions.find((item) => item.name === attribute.name)
    return definition?.groupName?.trim() || ui.main
  }
  const groupedDraftAttributes = Array.from(
    draftAttributes.reduce((groups, attribute, index) => {
      const groupName = getDraftAttributeGroupName(attribute)
      const group = groups.get(groupName) ?? { name: groupName, items: [] as { attribute: DraftAttribute; index: number }[] }

      group.items.push({ attribute, index })
      groups.set(groupName, group)

      return groups
    }, new Map<string, { name: string; items: { attribute: DraftAttribute; index: number }[] }>()),
  ).map(([, group]) => group)
  const removeDraftAttributeGroup = (groupName: string) => {
    onDraftAttributesChange(draftAttributes.filter((attribute) => getDraftAttributeGroupName(attribute) !== groupName))
  }
  const addCatalogSelection = () =>
    onDraftCatalogSelectionsChange([
      ...draftCatalogSelections,
      { targetType: 'catalog', catalogId: '', catalogEntryGroupId: '', catalogEntryId: '' },
    ])
  const addHierarchySelection = () =>
    onDraftHierarchySelectionsChange([...draftHierarchySelections, { groupId: 0, nodeIds: [] }])
  const addRelationship = () =>
    onDraftCharacterRelationshipsChange([
      ...draftCharacterRelationships,
      { targetCharacterId: '', relationType: '', strength: '50', tension: '0', isBidirectional: true, description: '' },
    ])

  return (
    <section className="sp-object-editor">
      <div className="sp-object-editor-tabs">
        {[
          ['main', ui.main],
          ['attributes', ui.attributes],
          ['catalogs', ui.catalogs],
          ['relations', ui.relations],
          ['timeline', ui.timeline],
        ].map(([tab, label]) => (
          <button
            className={objectEditorTab === tab ? 'active' : ''}
            key={tab}
            type="button"
            onClick={() => onObjectEditorTabChange(tab as ObjectEditorTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {objectEditorTab === 'main' && (
        <div className="sp-form">
          <label>
            {ui.firstName}
            <input value={objectName} onChange={(event) => onObjectNameChange(event.target.value)} />
          </label>
          <label>
            {ui.surname}
            <input value={objectSurname} onChange={(event) => onObjectSurnameChange(event.target.value)} />
          </label>
          <label>
            {ui.surname}
            <select value="" onChange={(event) => onObjectSurnameChange(event.target.value)}>
              <option value="">Выбрать фамилию из каталога</option>
              {allCatalogEntries.map((entry) => (
                <option key={entry.id} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ui.yearAge}
            <input value={objectAge} onChange={(event) => onObjectAgeChange(event.target.value)} />
          </label>
          <label>
            {ui.role}
            <input value={objectRole} onChange={(event) => onObjectRoleChange(event.target.value)} />
          </label>
          <CoverDropzone
            className="wide"
            imagePath={objectImagePath}
            label={ui.image}
            onFileSelected={(file) => onImageUpload(file)}
          />
          <label className="wide">
            {ui.description}
            <textarea value={objectDescription} onChange={(event) => onObjectDescriptionChange(event.target.value)} />
          </label>
        </div>
      )}

      {objectEditorTab === 'attributes' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addAttribute}>
            {ui.addAttribute}
          </button>
          <div className="sp-editor-row">
            <select defaultValue="" onChange={(event) => addExistingAttribute(event.target.value)}>
              <option value="">{ui.addExistingAttribute}</option>
              {attributeDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
            <select defaultValue="" onChange={(event) => addAttributeGroup(event.target.value)}>
              <option value="">{ui.addAttributeGroup}</option>
              <option value="__main__">Основная</option>
              {attributeGroups.map((group) => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
            <span className="sp-editor-hint">Значения задаются для этого объекта.</span>
          </div>
          {groupedDraftAttributes.map((group) => (
            <section className="sp-editor-attribute-group" key={group.name}>
              <div className="sp-attribute-group-head">
                <strong>{group.name}</strong>
                <button type="button" onClick={() => removeDraftAttributeGroup(group.name)}>
                  {ui.delete}
                </button>
              </div>
              {group.items.map(({ attribute, index }) => (
                <div className="sp-editor-row" key={index}>
                  <input
                    list="sp-attribute-definitions"
                    placeholder="Название"
                    value={attribute.name}
                    onChange={(event) =>
                      onDraftAttributesChange(
                        draftAttributes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    placeholder="Значение"
                    value={attribute.value}
                    onChange={(event) =>
                      onDraftAttributesChange(
                        draftAttributes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </section>
          ))}
          <datalist id="sp-attribute-definitions">
            {attributeDefinitions.map((definition) => (
              <option key={definition.id} value={definition.name} />
            ))}
          </datalist>
        </div>
      )}

      {objectEditorTab === 'catalogs' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addCatalogSelection}>
            {ui.addCatalogEntry}
          </button>
          {draftCatalogSelections.map((selection, index) => {
            const catalogId = Number(selection.catalogId)
            return (
              <div className="sp-editor-row multi" key={index}>
                <select
                  value={selection.targetType}
                  onChange={(event) =>
                    onDraftCatalogSelectionsChange(
                      draftCatalogSelections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, targetType: event.target.value as DraftCatalogSelection['targetType'] }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="catalog">{ui.catalog}</option>
                  <option value="group">{ui.group}</option>
                  <option value="entry">{ui.entry}</option>
                </select>
                <select
                  value={selection.catalogId}
                  onChange={(event) =>
                    onDraftCatalogSelectionsChange(
                      draftCatalogSelections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, catalogId: event.target.value, catalogEntryGroupId: '', catalogEntryId: '' }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">{ui.chooseCatalog}</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                {selection.targetType === 'group' && (
                  <select
                    value={selection.catalogEntryGroupId}
                    onChange={(event) =>
                      onDraftCatalogSelectionsChange(
                        draftCatalogSelections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, catalogEntryGroupId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{ui.chooseGroup}</option>
                    {(catalogGroupsByCatalogId[catalogId] ?? []).map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
                {selection.targetType === 'entry' && (
                  <select
                    value={selection.catalogEntryId}
                    onChange={(event) =>
                      onDraftCatalogSelectionsChange(
                        draftCatalogSelections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, catalogEntryId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{ui.chooseEntry}</option>
                    {(catalogEntriesByCatalogId[catalogId] ?? []).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => onDraftCatalogSelectionsChange(draftCatalogSelections.filter((_, itemIndex) => itemIndex !== index))}>
                  {ui.delete}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {objectEditorTab === 'hierarchy' && (
        <div className="sp-editor-stack">
          <button className="sp-button" type="button" onClick={addHierarchySelection}>
            + Группа иерархии
          </button>
          {draftHierarchySelections.map((selection, index) => (
            <div className="sp-editor-block" key={index}>
              <select
                value={selection.groupId}
                onChange={(event) =>
                  onDraftHierarchySelectionsChange(
                    draftHierarchySelections.map((item, itemIndex) =>
                      itemIndex === index ? { groupId: Number(event.target.value), nodeIds: [] } : item,
                    ),
                  )
                }
              >
                <option value={0}>Выберите группу</option>
                {hierarchyGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <div className="sp-checkbox-grid">
                {(hierarchyNodesByGroupId[selection.groupId] ?? []).map((node) => (
                  <label key={node.id}>
                    <input
                      type="checkbox"
                      checked={selection.nodeIds.includes(node.id)}
                      onChange={() =>
                        onDraftHierarchySelectionsChange(
                          draftHierarchySelections.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, nodeIds: toggleNumberSelection(item.nodeIds, node.id) }
                              : item,
                          ),
                        )
                      }
                    />
                    {node.name}
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => onDraftHierarchySelectionsChange(draftHierarchySelections.filter((_, itemIndex) => itemIndex !== index))}>
                Убрать группу
              </button>
            </div>
          ))}
        </div>
      )}

      {objectEditorTab === 'relations' && (
        <div className="sp-editor-stack">
          {activeType === 'characters' && (
            <>
              <button className="sp-button" type="button" onClick={addRelationship}>
                {ui.addCharacterRelationship}
              </button>
              {draftCharacterRelationships.map((relationship, index) => (
                <div className="sp-editor-row multi" key={index}>
                  <select
                    value={relationship.targetCharacterId}
                    onChange={(event) =>
                      onDraftCharacterRelationshipsChange(
                        draftCharacterRelationships.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, targetCharacterId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{ui.characters}</option>
                    {objectsByType.characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Тип связи"
                    value={relationship.relationType}
                    onChange={(event) =>
                      onDraftCharacterRelationshipsChange(
                        draftCharacterRelationships.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, relationType: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    min={0}
                    max={100}
                    type="number"
                    value={relationship.strength}
                    onChange={(event) =>
                      onDraftCharacterRelationshipsChange(
                        draftCharacterRelationships.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, strength: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    min={0}
                    max={100}
                    type="number"
                    value={relationship.tension}
                    onChange={(event) =>
                      onDraftCharacterRelationshipsChange(
                        draftCharacterRelationships.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, tension: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <button type="button" onClick={() => onDraftCharacterRelationshipsChange(draftCharacterRelationships.filter((_, itemIndex) => itemIndex !== index))}>
                    {ui.delete}
                  </button>
                </div>
              ))}
            </>
          )}
          {activeType === 'characters' && (
            <MultiObjectPicker label="Владеет предметами" objects={objectsByType.items} selectedIds={ownedItemIds} onChange={onOwnedItemIdsChange} toggleNumberSelection={toggleNumberSelection} />
          )}
          {activeType === 'items' && (
            <MultiObjectPicker label="Владельцы" objects={objectsByType.characters} selectedIds={ownerCharacterIds} onChange={onOwnerCharacterIdsChange} toggleNumberSelection={toggleNumberSelection} />
          )}
          {activeType === 'places' && (
            <MultiObjectPicker label="Организации на территории" objects={objectsByType.organizations} selectedIds={ownerOrganizationIds} onChange={onOwnerOrganizationIdsChange} toggleNumberSelection={toggleNumberSelection} />
          )}
          {activeType === 'organizations' && (
            <MultiObjectPicker label="Территории организации" objects={objectsByType.places} selectedIds={territoryPlaceIds} onChange={onTerritoryPlaceIdsChange} toggleNumberSelection={toggleNumberSelection} />
          )}
        </div>
      )}

      {objectEditorTab === 'timeline' && (
        <div className="sp-editor-stack">
          <label className="sp-checkline">
            <input
              checked={saveObjectAsTimelineChange}
              type="checkbox"
              onChange={(event) => onSaveObjectAsTimelineChange(event.target.checked)}
            />
            {ui.saveTimelineChange}
          </label>
          <select value={editorTimelineEventId} onChange={(event) => onEditorTimelineEventIdChange(event.target.value)}>
            <option value="">{ui.chooseEvent}</option>
            {timelineEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <p className="sp-editor-hint">
            Сейчас событие можно выбрать для привязки контекста. Полное сохранение изменений по времени будет отдельным шагом.
          </p>
        </div>
      )}

      <div className="sp-dialog-actions">
        <button className="sp-button" type="button" onClick={onCancel}>
          {ui.cancel}
        </button>
        <button className="sp-button primary" type="button" disabled={isSaving} onClick={onSave}>
          {isSaving ? 'Сохранение...' : ui.save}
        </button>
      </div>
    </section>
  )
}

function MultiObjectPicker({
  label,
  objects,
  selectedIds,
  onChange,
  toggleNumberSelection,
}: {
  label: string
  objects: StoryObject[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}) {
  return (
    <div className="sp-editor-block">
      <strong>{label}</strong>
      <div className="sp-checkbox-grid">
        {objects.map((storyObject) => (
          <label key={storyObject.id}>
            <input
              checked={selectedIds.includes(storyObject.id)}
              type="checkbox"
              onChange={() => onChange(toggleNumberSelection(selectedIds, storyObject.id))}
            />
            {storyObject.name}
          </label>
        ))}
        {objects.length === 0 && <span>Нет доступных объектов.</span>}
      </div>
    </div>
  )
}

function ObjectDetail({
  activeTab = 'main',
  attributeDefinitions,
  galleryImageCaption = '',
  galleryImagePath = null,
  storyObject,
  textLinkTargets,
  timelineEvents = [],
  ui,
  onAddGalleryImage,
  onDelete,
  onDeleteGalleryImage,
  onEdit,
  onGalleryCaptionChange,
  onGalleryImageUpload,
  onTabChange,
}: {
  activeTab?: ObjectDossierTab
  attributeDefinitions: AttributeDefinition[]
  galleryImageCaption?: string
  galleryImagePath?: string | null
  storyObject: StoryObject
  textLinkTargets: TextLinkTarget[]
  timelineEvents?: TimelineEvent[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onDelete?: () => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit?: () => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onTabChange?: (tab: ObjectDossierTab) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const relatedTimelineEvents = timelineEvents.filter((event) =>
    event.participants.some((participant) => participant.targetId === storyObject.id),
  )
  const attributeGroups = groupAttributesByDefinition(storyObject.attributes, attributeDefinitions, 'Основная')
  const characterRelationships = [
    ...storyObject.outgoingCharacterRelationships,
    ...storyObject.incomingCharacterRelationships,
  ]

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-detail-menu') === null) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [])

  return (
    <div className="sp-detail-card">
      {(onDelete !== undefined || onEdit !== undefined) && (
        <div className="sp-detail-menu">
          <button type="button" onClick={() => setIsMenuOpen((value) => !value)}>
            ⋮
          </button>
          {isMenuOpen && (
            <div className="sp-card-dropdown">
              {onEdit !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onEdit()
                  }}
                >
                  {ui.edit}
                </button>
              )}
              {onDelete !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onDelete()
                  }}
                >
                  {ui.delete}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="sp-dossier-head">
        <ObjectPortrait storyObject={storyObject} />
        <div>
          <span>{ui.dossier}</span>
          <h2>{getObjectFullName(storyObject)}</h2>
          <p>
            <LinkedText targets={textLinkTargets} text={storyObject.role ?? storyObject.typeKey} />
          </p>
        </div>
      </div>
      <div className="sp-fields">
        <div><span>{ui.yearAge}</span><strong>{storyObject.age ?? '-'}</strong></div>
        <div>
          <span>{ui.role}</span>
          <strong>
            <LinkedText emptyText="-" targets={textLinkTargets} text={storyObject.role} />
          </strong>
        </div>
        <div><span>{ui.objectType}</span><strong>{storyObject.typeKey}</strong></div>
      </div>
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={storyObject.description} />
        </p>
      </section>
      <section className="sp-panel">
        <div className="sp-object-editor-tabs">
          {[
            ['main', ui.main],
            ['relations', ui.relations],
            ['timeline', ui.timeline],
            ['gallery', ui.gallery],
          ].map(([tab, label]) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab as ObjectDossierTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {activeTab === 'main' && (
        <>
          <section className="sp-panel">
            <h3>{ui.attributes}</h3>
            {storyObject.attributes.length === 0 ? (
              <p>Характеристик пока нет.</p>
            ) : (
              attributeGroups.map((group) => (
                <article className="sp-attribute-group" key={group.name}>
                  <div className="sp-attribute-group-head">
                    <strong>{group.name}</strong>
                    <span>{group.attributes.length}</span>
                  </div>
                  {group.attributes.map((attribute) => (
                    <div className="sp-row" key={attribute.id}>
                      <span>{attribute.name}</span>
                      <strong>
                        <LinkedText emptyText="-" targets={textLinkTargets} text={attribute.value} />
                      </strong>
                    </div>
                  ))}
                </article>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>{ui.catalogs}</h3>
            {storyObject.catalogSelections.length === 0 ? (
              <p>Каталожных значений пока нет.</p>
            ) : (
              storyObject.catalogSelections.map((selection) => (
                <div className="sp-row" key={`${selection.targetType}-${selection.catalogId}-${selection.catalogEntryGroupId}-${selection.catalogEntryId}`}>
                  <span>{selection.catalogName}</span>
                  <strong>
                    <LinkedText
                      targets={textLinkTargets}
                      text={selection.catalogEntryName ?? selection.catalogEntryGroupName ?? selection.targetType}
                    />
                  </strong>
                </div>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>Иерархии</h3>
            {storyObject.hierarchySelections.length === 0 ? (
              <p>Иерархий пока нет.</p>
            ) : (
              storyObject.hierarchySelections.map((selection) => (
                <div className="sp-row" key={selection.groupId}>
                  <span>{selection.groupName}</span>
                  <strong>
                    <LinkedText targets={textLinkTargets} text={selection.nodes.map((node) => node.name).join(', ')} />
                  </strong>
                </div>
              ))
            )}
          </section>
        </>
      )}
      {activeTab === 'relations' && (
        <>
          <section className="sp-panel">
            <h3>{ui.relations}</h3>
            {characterRelationships.length === 0 ? (
              <p>{ui.noRelationships}</p>
            ) : (
              characterRelationships.map((relationship) => (
                <div className="sp-row" key={`${relationship.direction}-${relationship.id}`}>
                  <span>
                    <LinkedText targets={textLinkTargets} text={relationship.character.name} />
                  </span>
                  <strong>{relationship.relationType}</strong>
                </div>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>Связанные объекты</h3>
            {[storyObject.ownedItems, storyObject.owners, storyObject.territoryPlaces, storyObject.organizationsOnTerritory, storyObject.ownerOrganizations, storyObject.ownedTerritories]
              .flat()
              .map((reference) => (
                <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
                  <span>{reference.typeKey}</span>
                  <strong>
                    <LinkedText targets={textLinkTargets} text={reference.name} />
                  </strong>
                </div>
              ))}
          </section>
        </>
      )}
      {activeTab === 'timeline' && (
        <section className="sp-panel">
          <h3>{ui.timeline}</h3>
          {relatedTimelineEvents.length === 0 ? (
            <p>Объект пока не участвует в событиях.</p>
          ) : (
            relatedTimelineEvents.map((event) => (
              <div className="sp-row" key={event.id}>
                <span>{event.startLabel ?? event.category ?? 'Событие'}</span>
                <strong>{event.title}</strong>
              </div>
            ))
          )}
        </section>
      )}
      {activeTab === 'gallery' && (
        <section className="sp-panel">
          <h3>{ui.gallery}</h3>
          {onGalleryImageUpload !== undefined && (
            <div className="sp-editor-row">
              <input type="file" accept="image/*" onChange={(event) => onGalleryImageUpload(event.target.files?.[0] ?? null)} />
              <input
                placeholder="Подпись"
                value={galleryImageCaption}
                onChange={(event) => onGalleryCaptionChange?.(event.target.value)}
              />
              <button disabled={galleryImagePath === null} type="button" onClick={onAddGalleryImage}>
                Добавить
              </button>
            </div>
          )}
          {storyObject.galleryImages.length === 0 ? (
            <p>В галерее пока нет изображений.</p>
          ) : (
            <div className="sp-gallery-grid">
              {storyObject.galleryImages.map((image) => (
                <article className="sp-gallery-card" key={image.id}>
                  <img alt="" src={resolveAssetUrl(image.imagePath) ?? undefined} />
                  <span>
                    <LinkedText emptyText="-" targets={textLinkTargets} text={image.caption} />
                  </span>
                  {onDeleteGalleryImage !== undefined && (
                    <button type="button" onClick={() => onDeleteGalleryImage(image.id)}>
                      Удалить
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function CatalogsPage({ catalogs }: { catalogs: Catalog[] }) {
  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>Каталоги</h2>
          <p>Реальные справочники проекта</p>
        </div>
      </div>
      <div className="sp-cards">
        {catalogs.map((catalog) => (
          <article className="sp-card" key={catalog.id}>
            <div className="sp-portrait">#</div>
            <div className="sp-card-body">
              <h3>{catalog.name}</h3>
              <span>{catalog.description ?? 'Без описания'}</span>
              <div className="sp-tags">
                <span>{catalog.supportsHierarchy ? 'иерархия' : 'обычный'}</span>
                <span>{catalog.hierarchyMode}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function CatalogEntryDetail({
  catalog,
  catalogEntryLinksById,
  entry,
  textLinkTargets,
  ui,
  onDelete,
  onEdit,
}: {
  catalog: Catalog | null
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  entry: CatalogEntry
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
  onDelete: () => void
  onEdit: () => void
}) {
  const imageUrl = resolveAssetUrl(entry.imagePath)

  return (
    <article className="sp-detail-card">
      <div className="sp-detail-menu">
        <KebabMenu ui={ui} onDelete={onDelete} onEdit={onEdit} />
      </div>
      <div className="sp-dossier-head">
        <div className="sp-portrait">
          {imageUrl === null ? getInitials(entry.name) : <img alt="" src={imageUrl} />}
        </div>
        <div>
          <span>{catalog?.name ?? ui.catalog}</span>
          <h2>{entry.name}</h2>
          <p>{entry.entryGroupName ?? 'Без группы'}</p>
        </div>
      </div>
      <div className="sp-fields">
        <div><span>{ui.catalog}</span><strong>{catalog?.name ?? '-'}</strong></div>
        <div><span>{ui.group}</span><strong>{entry.entryGroupName ?? '-'}</strong></div>
        <div><span>{ui.entry}</span><strong>{entry.id}</strong></div>
      </div>
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={entry.description} />
        </p>
      </section>
      <section className="sp-panel">
        <h3>Поля</h3>
        {entry.fieldValues.length === 0 ? (
          <p>Дополнительных полей пока нет.</p>
        ) : (
          entry.fieldValues.map((fieldValue) => {
            const referencedEntries = fieldValue.referencedEntryIds
              .map((entryId) => catalogEntryLinksById.get(entryId))
              .filter((target): target is CatalogEntryLinkTarget => target !== undefined)

            return (
              <div className="sp-row" key={fieldValue.fieldDefinitionId}>
                <span>#{fieldValue.fieldDefinitionId}</span>
                <strong>
                  {referencedEntries.length > 0 ? (
                    referencedEntries.map((target, index) => (
                      <span key={target.entry.id}>
                        {index > 0 && ', '}
                        <LinkedText targets={textLinkTargets} text={target.entry.name} />
                      </span>
                    ))
                  ) : (
                    <LinkedText emptyText="-" targets={textLinkTargets} text={fieldValue.value} />
                  )}
                </strong>
              </div>
            )
          })
        )}
      </section>
    </article>
  )
}

void CatalogsPage

function CatalogsWorkspace({
  catalogEntries,
  catalogGroups,
  catalogs,
  groupDisplayMode,
  selectedCatalog,
  selectedCatalogGroupId,
  textLinkTargets,
  ui,
  onDeleteEntry,
  onEditCatalog,
  onEditEntry,
  onEditGroup,
  onCreateEntry,
  onCreateGroup,
  onDeleteCatalog,
  onDeleteGroup,
  onOpenEntry,
  onSelectCatalog,
  onSelectGroup,
}: {
  catalogEntries: CatalogEntry[]
  catalogGroups: CatalogEntryGroup[]
  catalogs: Catalog[]
  groupDisplayMode: GroupDisplayMode
  selectedCatalog: Catalog | null
  selectedCatalogGroupId: number | null
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
  onDeleteEntry: (entry: CatalogEntry) => void
  onEditCatalog: (catalog: Catalog) => void
  onEditEntry: (entry: CatalogEntry) => void
  onEditGroup: (group: CatalogEntryGroup) => void
  onCreateEntry: () => void
  onCreateGroup: () => void
  onDeleteCatalog: () => void
  onDeleteGroup: (groupId: number) => void
  onOpenEntry: (entry: CatalogEntry) => void
  onSelectCatalog: (catalogId: number) => void
  onSelectGroup: (groupId: number | null) => void
}) {
  const visibleEntries =
    selectedCatalogGroupId === null
      ? catalogEntries
      : catalogEntries.filter((entry) => entry.entryGroupId === selectedCatalogGroupId)

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{selectedCatalog?.name ?? ui.catalogs}</h2>
          <p>
            <LinkedText
              emptyText="Справочники проекта с группами и записями."
              targets={textLinkTargets}
              text={selectedCatalog?.description}
            />
          </p>
        </div>
        <div className="sp-filters">
          {selectedCatalog !== null && (
            <>
              <KebabMenu ui={ui} onDelete={onDeleteCatalog} onEdit={() => onEditCatalog(selectedCatalog)} />
              {groupDisplayMode === 'subtabs' && (
                <button className="sp-button" type="button" onClick={onCreateGroup}>
                  {ui.newGroup}
                </button>
              )}
              <button className="sp-button primary" type="button" onClick={onCreateEntry}>
                {ui.newCatalogEntry}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="sp-catalog-layout single">
        <aside className="sp-catalog-list">
          {catalogs.map((catalog) => (
            <button
              className={catalog.id === selectedCatalog?.id ? 'active' : ''}
              key={catalog.id}
              type="button"
              onClick={() => onSelectCatalog(catalog.id)}
            >
              <strong>{catalog.name}</strong>
              <span>{catalog.supportsHierarchy ? 'иерархический' : 'обычный'}</span>
            </button>
          ))}
          {catalogs.length === 0 && <p>Каталогов пока нет.</p>}
        </aside>
        <section className="sp-catalog-main">
          {selectedCatalog === null ? (
            <div className="sp-empty">
              <strong>{ui.catalogNoSelection}</strong>
              <span>Создайте каталог или выберите существующий.</span>
            </div>
          ) : (
            <>
              {groupDisplayMode === 'blocks' && (
                <div className="sp-group-blocks">
                  <button
                    className={selectedCatalogGroupId === null ? 'active' : ''}
                    type="button"
                    onClick={() => onSelectGroup(null)}
                  >
                    <strong>{ui.all}</strong>
                    <span>{catalogEntries.length}</span>
                  </button>
                  {catalogGroups.map((group) => (
                    <div className="sp-group-block" key={group.id}>
                      <button
                        className={selectedCatalogGroupId === group.id ? 'active' : ''}
                        type="button"
                        onClick={() => onSelectGroup(group.id)}
                      >
                        <strong>{group.name}</strong>
                        <span>{catalogEntries.filter((entry) => entry.entryGroupId === group.id).length}</span>
                      </button>
                      <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group.id)} onEdit={() => onEditGroup(group)} />
                    </div>
                  ))}
                  <button className="create" type="button" onClick={onCreateGroup}>
                    + {ui.newGroup}
                  </button>
                </div>
              )}
              <div className={`sp-group-strip ${groupDisplayMode === 'blocks' || groupDisplayMode === 'subtabs' ? 'is-hidden' : ''}`}>
                <button
                  className={selectedCatalogGroupId === null ? 'active' : ''}
                  type="button"
                  onClick={() => onSelectGroup(null)}
                >
                  {ui.all}
                </button>
                {catalogGroups.map((group) => (
                  <span className="sp-group-chip" key={group.id}>
                    <button
                      className={selectedCatalogGroupId === group.id ? 'active' : ''}
                      type="button"
                      onClick={() => onSelectGroup(group.id)}
                    >
                      {group.name}
                    </button>
                    <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group.id)} onEdit={() => onEditGroup(group)} />
                  </span>
                ))}
              </div>
              <div className="sp-cards">
                {visibleEntries.map((entry) => (
                  <article className="sp-card compact" key={entry.id}>
                    <button className="sp-card-main" type="button" onClick={() => onOpenEntry(entry)}>
                      <div className="sp-portrait">
                        {resolveAssetUrl(entry.imagePath) === null ? '#' : <img alt="" src={resolveAssetUrl(entry.imagePath) ?? undefined} />}
                      </div>
                    </button>
                    <div className="sp-card-body" onClick={() => onOpenEntry(entry)}>
                      <h3>{entry.name}</h3>
                      <span>{entry.entryGroupName ?? 'Без группы'}</span>
                      <p>
                        <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={entry.description} />
                      </p>
                    </div>
                    <KebabMenu ui={ui} onDelete={() => onDeleteEntry(entry)} onEdit={() => onEditEntry(entry)} />
                  </article>
                ))}
                {visibleEntries.length === 0 && (
                  <div className="sp-empty">
                    <strong>{ui.noEntries}</strong>
                    <span>Создание и редактирование записей оставлено в основном интерфейсе до переноса шаблонов.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}

function RelationsPage({
  objects,
  ui,
  onSelect,
}: {
  objects: StoryObject[]
  ui: PreviewText
  onSelect: (storyObject: StoryObject) => void
}) {
  const nodes = objects.slice(0, 5)

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{ui.relations}</h2>
          <p>Черновой граф на реальных объектах текущего раздела</p>
        </div>
      </div>
      <div className="sp-graph">
        {nodes.map((storyObject, index) => (
          <button
            className="sp-graph-node"
            key={storyObject.id}
            style={{
              left: `${18 + (index % 3) * 28}%`,
              top: `${18 + Math.floor(index / 3) * 36}%`,
            }}
            type="button"
            onClick={() => onSelect(storyObject)}
          >
            <ObjectPortrait storyObject={storyObject} />
            <strong>{storyObject.name}</strong>
          </button>
        ))}
      </div>
    </>
  )
}

function TimelinePage({ events, ui, onCreate }: { events: TimelineEvent[]; ui: PreviewText; onCreate: () => void }) {
  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{ui.timeline}</h2>
          <p>События проекта из API</p>
        </div>
        <button className="sp-button primary" type="button" onClick={onCreate}>
          {ui.newEvent}
        </button>
      </div>
      <div className="sp-timeline">
        <div className="sp-axis">
          {events.slice(0, 8).map((event, index) => (
            <div className="sp-timepoint" key={event.id} style={{ left: `${8 + index * 12}%` }}>
              <i />
              <article className={index % 2 === 0 ? 'top' : 'bottom'}>
                <strong>{event.title}</strong>
                <span>{event.startLabel ?? event.category ?? 'Событие'}</span>
              </article>
            </div>
          ))}
          {events.length === 0 && <div className="sp-empty">Событий пока нет.</div>}
        </div>
      </div>
    </>
  )
}

function PreviewDialog({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode
  title: string
  onClose: () => void
}) {
  return (
    <div className="sp-modal" role="dialog" aria-modal="true">
      <div className="sp-dialog">
        <div className="sp-dialog-head">
          <h2>{title}</h2>
          <button className="sp-icon-button" type="button" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

