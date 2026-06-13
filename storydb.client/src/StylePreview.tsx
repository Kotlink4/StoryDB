import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { scaleLinear, type ScaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import {
  Activity,
  Atom,
  BookOpen,
  Brain,
  Circle,
  Dumbbell,
  Eye,
  Flame,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Star,
  Sword,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import type { ElkNode } from 'elkjs/lib/elk-api'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  addObjectGalleryImageRequest,
  addTimelineEventGalleryImageRequest,
  createAttributeDefinitionRequest,
  createAttributeGroupRequest,
  createCatalogEntryRequest,
  createCatalogEntryGroupRequest,
  createCatalogFieldDefinitionRequest,
  createCatalogRequest,
  createObjectRequest,
  createTimelineEventRequest,
  createTimelineEventLinkRequest,
  deleteAttributeDefinitionRequest,
  deleteAttributeGroupRequest,
  deleteCatalogEntryRequest,
  deleteObjectGalleryImageRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogFieldDefinitionRequest,
  deleteCatalogRequest,
  deleteObjectRequest,
  deleteTimelineEventRequest,
  deleteTimelineEventGalleryImageRequest,
  deleteTimelineEventLinkRequest,
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
  fetchRelationGraph,
  fetchRelationGraphLayout,
  fetchTimelineEvents,
  fetchTimelineEventLinks,
  fetchTimelineInfo,
  fetchTimelineLayout,
  fetchTimelineLayoutRules,
  generateTimelineLayoutRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  resolveAssetUrl,
  saveRelationGraphLayoutRequest,
  updateObjectRequest,
  updateAttributeDefinitionRequest,
  updateAttributeGroupRequest,
  updateCurrentUserRequest,
  updateCatalogEntryRequest,
  updateCatalogEntryGroupRequest,
  updateCatalogFieldDefinitionRequest,
  updateCatalogRequest,
  updateTimelineEventRequest,
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
  CatalogFieldDataType,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectAttribute,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphEdge,
  RelationGraphLayout,
  RelationGraphNode,
  StoryObject,
  StoryProject,
  TimelineEvent,
  TimelineChangeDraft,
  TimelineEventDraft,
  TimelineEventLink,
  TimelineEventLinkDraft,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutItem,
  TimelineLayoutRules,
} from './types'
import {
  getTimelineEventValidationMessage,
  validateAttributeDefinitionDraft,
  validateAttributeGroupDraft,
  validateAuthDraft,
  validateCatalogDraft,
  validateCatalogEntryDraft,
  validateCatalogFieldDraft,
  validateCatalogGroupDraft,
  validateObjectDraft,
  validateProfileDraft,
  validateTimelineLinkDraft,
} from './validation'
import '@xyflow/react/dist/style.css'
import './StylePreview.css'

type PreviewTab = 'database' | 'relations' | 'timeline'
type DetailMode = 'panel' | 'modal' | 'page'
type GroupDisplayMode = 'blocks' | 'subtabs'
type PreviewTheme = 'light' | 'dark'
type PreviewLanguage = 'ru' | 'en'
type UtilityPage = 'profile' | 'settings' | null
type PreviewSection = ObjectTypeKey | 'attributes' | 'catalogs'
type ObjectEditorTab = 'main' | 'attributes' | 'catalogs' | 'hierarchy' | 'relations' | 'timeline'
type ObjectDossierTab = 'main' | 'relations' | 'timeline' | 'gallery'
type TimelineEventDossierTab = 'main' | 'participants' | 'links' | 'changes' | 'gallery'
type CatalogDialogTab = 'main' | 'template'
type TimelineChange = TimelineEvent['changes'][number]
const TIMELINE_DURATION_TITLE_HEIGHT = 34
const TIMELINE_DURATION_POINT_BAND_HEIGHT = 30
type DraftTimelineParticipation = {
  timelineEventId: string
  role: string
}
type PreviewDialogKind =
  | 'auth'
  | 'object'
  | 'profile'
  | 'detail'
  | 'relationDetail'
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
  | 'timelineEventDetail'
  | 'timelineLink'
  | 'confirmDeleteTimelineEvent'
  | null

const emptyAttributeDefinitionDraft: AttributeDefinitionDraft = {
  name: '',
  dataType: 'text',
  groupName: '',
  iconKey: '',
  minValue: '',
  maxValue: '',
  unit: '',
  optionsText: '',
}

const attributeIconOptions: Array<{ key: string; label: string; Icon: LucideIcon }> = [
  { key: 'none', label: 'Нет', Icon: Circle },
  { key: 'star', label: 'Звезда', Icon: Star },
  { key: 'heart', label: 'Сердце', Icon: Heart },
  { key: 'brain', label: 'Разум', Icon: Brain },
  { key: 'activity', label: 'Активность', Icon: Activity },
  { key: 'dumbbell', label: 'Сила', Icon: Dumbbell },
  { key: 'eye', label: 'Взгляд', Icon: Eye },
  { key: 'flame', label: 'Огонь', Icon: Flame },
  { key: 'leaf', label: 'Природа', Icon: Leaf },
  { key: 'sparkles', label: 'Магия', Icon: Sparkles },
  { key: 'zap', label: 'Энергия', Icon: Zap },
  { key: 'shield', label: 'Защита', Icon: Shield },
  { key: 'sword', label: 'Бой', Icon: Sword },
  { key: 'book', label: 'Знание', Icon: BookOpen },
  { key: 'atom', label: 'Система', Icon: Atom },
]

const attributeDataTypeLabels: Record<AttributeDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
}

const emptyCatalogFieldDraft: CatalogFieldDraft = {
  name: '',
  dataType: 'text',
  isRequired: false,
  minValue: '',
  maxValue: '',
  optionsText: '',
  referenceCatalogId: '',
}

const emptyTimelineEventDraft: TimelineEventDraft = {
  title: '',
  eventType: 'point',
  parentEventId: '',
  description: '',
  startLabel: '',
  endLabel: '',
  startValue: '',
  endValue: '',
  category: '',
  color: '',
  imagePath: null,
  participants: [],
  changes: [],
}

const catalogFieldDataTypes: CatalogFieldDataType[] = [
  'text',
  'longText',
  'number',
  'select',
  'entryReference',
  'multipleEntryReference',
]

const catalogFieldDataTypeLabels: Record<CatalogFieldDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  longText: { ru: 'Длинный текст', en: 'Long text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
  entryReference: { ru: 'Ссылка на запись', en: 'Entry link' },
  multipleEntryReference: { ru: 'Несколько ссылок', en: 'Multiple links' },
}

const catalogTemplateLabels = {
  ru: {
    addField: '+ Поле шаблона',
    dataType: 'Тип данных',
    fields: 'Поля шаблона',
    max: 'Максимум',
    min: 'Минимум',
    noFields: 'Поля шаблона пока не настроены.',
    options: 'Варианты',
    optionsPlaceholder: 'Например: огонь, вода, воздух',
    referenceCatalog: 'Каталог для ссылки',
    required: 'Обязательное',
    template: 'Шаблон записи',
  },
  en: {
    addField: '+ Template field',
    dataType: 'Data type',
    fields: 'Template fields',
    max: 'Maximum',
    min: 'Minimum',
    noFields: 'No template fields yet.',
    options: 'Options',
    optionsPlaceholder: 'Example: fire, water, air',
    referenceCatalog: 'Reference catalog',
    required: 'Required',
    template: 'Entry template',
  },
} satisfies Record<PreviewLanguage, Record<string, string>>

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
    avatar: 'Аватар',
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
    displayName: 'Отображаемое имя',
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
    profileData: 'Данные профиля',
    profileProjects: 'Выбор проекта',
    profileSignIn: 'Для профиля нужен вход в аккаунт.',
    project: 'Проект',
    projectSearch: 'Поиск по проектам...',
    projectNotSelected: 'Проект не выбран',
    projects: 'Проекты',
    objectsCount: 'объектов',
    realCatalogs: 'Реальные справочники проекта',
    register: 'Регистрация',
    relations: 'Связи',
    role: 'Роль',
    save: 'Сохранить',
    saveTimelineChange: 'Сохранить как изменение таймлайна',
    searchPlaceholder: 'Поиск по объектам, каталогам, связям...',
    selectProject: 'Открыть проект',
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
    avatar: 'Avatar',
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
    displayName: 'Display name',
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
    profileData: 'Profile data',
    profileProjects: 'Project selection',
    profileSignIn: 'Sign in to manage your profile.',
    project: 'Project',
    projectSearch: 'Search projects...',
    projectNotSelected: 'No project selected',
    projects: 'Projects',
    objectsCount: 'objects',
    realCatalogs: 'Real project reference catalogs',
    register: 'Register',
    relations: 'Relations',
    role: 'Role',
    save: 'Save',
    saveTimelineChange: 'Save as timeline change',
    searchPlaceholder: 'Search objects, catalogs, relations...',
    selectProject: 'Open project',
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
      utilityPage:
        parts[0] === 'profile' ? 'profile' as UtilityPage : parts[0] === 'settings' ? 'settings' as UtilityPage : null,
    }
  }

  if (routeKind === 'relations' || routeKind === 'timeline') {
    return {
      activeSection: null,
      activeTab: routeKind as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
      utilityPage: null,
    }
  }

  if (routeKind === 'catalogs') {
    return {
      activeSection: 'catalogs' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: parsePositiveNumber(parts[3]),
      objectId: null,
      projectId,
      utilityPage: null,
    }
  }

  if (routeKind === 'attributes') {
    return {
      activeSection: 'attributes' as PreviewSection,
      activeTab: 'database' as PreviewTab,
      catalogId: null,
      objectId: null,
      projectId,
      utilityPage: null,
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
      utilityPage: null,
    }
  }

  return {
    activeSection: 'characters' as PreviewSection,
    activeTab: 'database' as PreviewTab,
    catalogId: null,
    objectId: null,
    projectId,
    utilityPage: null,
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
  const [timelineLinks, setTimelineLinks] = useState<TimelineEventLink[]>([])
  const [timelineInfo, setTimelineInfo] = useState<TimelineInfo | null>(null)
  const [timelineLayout, setTimelineLayout] = useState<TimelineLayout | null>(null)
  const [timelineLayoutRules, setTimelineLayoutRules] = useState<TimelineLayoutRules | null>(null)
  const [isTimelineGenerating, setIsTimelineGenerating] = useState(false)
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<number | null>(null)
  const [editingTimelineEventId, setEditingTimelineEventId] = useState<number | null>(null)
  const [pendingDeleteTimelineEventId, setPendingDeleteTimelineEventId] = useState<number | null>(null)
  const [relationGraph, setRelationGraph] = useState<RelationGraph>({ nodes: [], edges: [] })
  const [relationGraphLayout, setRelationGraphLayout] = useState<RelationGraphLayout | null>(null)
  const [isRelationLayoutGenerating, setIsRelationLayoutGenerating] = useState(false)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(
    routeState.objectId ?? initialPreviewState.selectedObjectId ?? null,
  )
  const [selectedRelationEdgeId, setSelectedRelationEdgeId] = useState<string | null>(null)
  const [selectedRelationObjectId, setSelectedRelationObjectId] = useState<number | null>(null)
  const [detailMode, setDetailMode] = useState<DetailMode>(initialPreviewState.detailMode ?? 'panel')
  const [groupDisplayMode, setGroupDisplayMode] = useState<GroupDisplayMode>(
    initialPreviewState.groupDisplayMode ?? 'blocks',
  )
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>(initialPreviewState.previewTheme ?? 'light')
  const [previewLanguage, setPreviewLanguage] = useState<PreviewLanguage>(initialPreviewState.previewLanguage ?? 'ru')
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(routeState.utilityPage === 'settings')
  const [isProfilePageOpen, setIsProfilePageOpen] = useState(routeState.utilityPage === 'profile')
  const [isObjectPageOpen, setIsObjectPageOpen] = useState(
    routeState.objectId !== null || initialPreviewState.isObjectPageOpen === true,
  )
  const [isRelationPageOpen, setIsRelationPageOpen] = useState(false)
  const [isTimelineEventPageOpen, setIsTimelineEventPageOpen] = useState(false)
  const [activeObjectMenuId, setActiveObjectMenuId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PreviewDialogKind>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarImagePath, setProfileAvatarImagePath] = useState<string | null>(null)
  const [profileProjectQuery, setProfileProjectQuery] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [editingObjectId, setEditingObjectId] = useState<number | null>(null)
  const [objectName, setObjectName] = useState('')
  const [objectSurname, setObjectSurname] = useState('')
  const [objectRole, setObjectRole] = useState('')
  const [objectAge, setObjectAge] = useState('')
  const [objectDescription, setObjectDescription] = useState('')
  const [objectImagePath, setObjectImagePath] = useState<string | null>(null)
  const [objectEditorTab, setObjectEditorTab] = useState<ObjectEditorTab>('main')
  const [dossierTab, setDossierTab] = useState<ObjectDossierTab>('main')
  const [dossierTimelineEventId, setDossierTimelineEventId] = useState('')
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
  const [attributeGroupIconKey, setAttributeGroupIconKey] = useState('')
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
  const [catalogFieldsByCatalogId, setCatalogFieldsByCatalogId] = useState<Record<number, CatalogFieldDefinition[]>>({})
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null)
  const [galleryImageCaption, setGalleryImageCaption] = useState('')
  const [timelineGalleryImagePath, setTimelineGalleryImagePath] = useState<string | null>(null)
  const [timelineGalleryImageCaption, setTimelineGalleryImageCaption] = useState('')
  const [editorTimelineEventId, setEditorTimelineEventId] = useState('')
  const [saveObjectAsTimelineChange, setSaveObjectAsTimelineChange] = useState(false)
  const [draftTimelineParticipations, setDraftTimelineParticipations] = useState<DraftTimelineParticipation[]>([])
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(routeState.catalogId)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogGroups, setCatalogGroups] = useState<CatalogEntryGroup[]>([])
  const [catalogName, setCatalogName] = useState('')
  const [catalogDescription, setCatalogDescription] = useState('')
  const [catalogSupportsHierarchy, setCatalogSupportsHierarchy] = useState(false)
  const [catalogDialogTab, setCatalogDialogTab] = useState<CatalogDialogTab>('main')
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null)
  const [editingCatalogFieldId, setEditingCatalogFieldId] = useState<number | null>(null)
  const [catalogFieldDraft, setCatalogFieldDraft] = useState<CatalogFieldDraft>(emptyCatalogFieldDraft)
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
  const [timelineDraft, setTimelineDraft] = useState<TimelineEventDraft>(emptyTimelineEventDraft)
  const [timelineLinkDraft, setTimelineLinkDraft] = useState<TimelineEventLinkDraft>({
    sourceEventId: '',
    targetEventId: '',
    linkType: 'precedes',
    description: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [isObjectSaving, setIsObjectSaving] = useState(false)
  const ui = previewText[previewLanguage]
  const catalogTemplateUi = catalogTemplateLabels[previewLanguage]

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const currentUserAvatarUrl = resolveAssetUrl(currentUser?.avatarImagePath ?? null)
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
  const timelineDraftIsRangeEvent = timelineDraft.eventType === 'duration' || timelineDraft.eventType === 'era'
  const timelineDraftIsPointEvent = timelineDraft.eventType === 'point'
  const timelineDraftParentOptions = useMemo(
    () =>
      visibleTimelineEvents.filter(
        (event) =>
          event.id !== editingTimelineEventId &&
          (event.eventType === 'duration' || event.eventType === 'era'),
      ),
    [editingTimelineEventId, visibleTimelineEvents],
  )
  const selectedTimelineEvent = useMemo(
    () => visibleTimelineEvents.find((event) => event.id === selectedTimelineEventId) ?? null,
    [selectedTimelineEventId, visibleTimelineEvents],
  )
  const selectedObject = useMemo(
    () => visibleObjects.find((storyObject) => storyObject.id === selectedObjectId) ?? null,
    [selectedObjectId, visibleObjects],
  )
  const selectedRelationEdge = useMemo(
    () => relationGraph.edges.find((edge) => edge.id === selectedRelationEdgeId) ?? null,
    [relationGraph.edges, selectedRelationEdgeId],
  )
  const selectedCatalog = useMemo(
    () => visibleCatalogs.find((catalog) => catalog.id === selectedCatalogId) ?? visibleCatalogs[0] ?? null,
    [selectedCatalogId, visibleCatalogs],
  )
  const selectedCatalogFields = useMemo(
    () => (selectedCatalog === null ? [] : catalogFieldsByCatalogId[selectedCatalog.id] ?? []),
    [catalogFieldsByCatalogId, selectedCatalog],
  )
  const catalogDialogFields = useMemo(() => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    return targetCatalogId === null ? [] : catalogFieldsByCatalogId[targetCatalogId] ?? []
  }, [catalogFieldsByCatalogId, editingCatalogId, selectedCatalog])
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
        setIsProfilePageOpen(false)
      }

      setIsSettingsPageOpen(routeState.utilityPage === 'settings')
      setIsProfilePageOpen(routeState.utilityPage === 'profile')

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
    routeState.utilityPage,
  ])

  const navigateToWorkspace = (
    tab: PreviewTab,
    section: PreviewSection = activeSection,
    objectId: number | null = null,
    catalogId: number | null = selectedCatalogId,
  ) => {
    setIsSettingsPageOpen(false)
    setIsProfilePageOpen(false)
    if (tab !== 'relations') {
      setSelectedRelationEdgeId(null)
      setSelectedRelationObjectId(null)
      setIsRelationPageOpen(false)
    }
    if (tab !== 'timeline') {
      setSelectedTimelineEventId(null)
      setIsTimelineEventPageOpen(false)
    }
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
    if (
      routeState.utilityPage === null &&
      routeState.projectId === null &&
      selectedProjectId !== null &&
      projects.length > 0
    ) {
      navigateToPreview(selectedProjectId, activeTab, activeSection, selectedObjectId, selectedCatalogId, true)
    }
  }, [
    activeSection,
    activeTab,
    navigateToPreview,
    projects.length,
    routeState.projectId,
    routeState.utilityPage,
    selectedCatalogId,
    selectedObjectId,
    selectedProjectId,
  ])

  useEffect(() => {
    setProfileDisplayName(currentUser?.displayName ?? '')
    setProfileEmail(currentUser?.email ?? '')
    setProfileAvatarImagePath(currentUser?.avatarImagePath ?? null)
  }, [currentUser])

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
      setRelationGraph({ nodes: [], edges: [] })
      setRelationGraphLayout(null)
      return undefined
    }

    fetchRelationGraph(selectedProjectId)
      .then((graph) => {
        if (isActive) {
          setRelationGraph(graph)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraph({ nodes: [], edges: [] })
          setMessage('Не удалось загрузить граф связей.')
        }
      })

    fetchRelationGraphLayout(selectedProjectId)
      .then((layout) => {
        if (isActive) {
          setRelationGraphLayout(layout)
        }
      })
      .catch(() => {
        if (isActive) {
          setRelationGraphLayout(null)
          setMessage('Граф загружен без сохраненной раскладки.')
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedProjectId])

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
      setTimelineInfo(null)
      setTimelineLayout(null)
      setTimelineLayoutRules(null)
      setTimelineLinks([])
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

      const [loadedEvents, loadedTimelineInfo, loadedTimelineLayout, loadedTimelineLinks, loadedTimelineRules] = await Promise.all([
        fetchTimelineEvents(selectedProjectId),
        fetchTimelineInfo(selectedProjectId),
        fetchTimelineLayout(selectedProjectId),
        fetchTimelineEventLinks(selectedProjectId),
        fetchTimelineLayoutRules(selectedProjectId),
      ])
      if (isActive) {
        setTimelineEvents(loadedEvents)
        setTimelineInfo(loadedTimelineInfo)
        setTimelineLayout(loadedTimelineLayout)
        setTimelineLinks(loadedTimelineLinks)
        setTimelineLayoutRules(loadedTimelineRules)
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
          setMessage('Не удалось загрузить досье объекта.')
        }
      })

    return () => {
      isActive = false
    }
  }, [activeSection, selectedObjectId, selectedProjectId])

  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null || selectedCatalogId === null || activeSection !== 'catalogs') {
      setCatalogEntries([])
      setCatalogGroups([])
      return undefined
    }

    const loadCatalogWorkspace = async () => {
      const [loadedEntries, loadedGroups, loadedFields] = await Promise.all([
        fetchCatalogEntries(selectedProjectId, selectedCatalogId),
        fetchCatalogEntryGroups(selectedProjectId, selectedCatalogId),
        fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalogId),
      ])

      if (isActive) {
        setCatalogEntries(loadedEntries)
        setCatalogGroups(loadedGroups)
        setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
          ...currentFieldsByCatalogId,
          [selectedCatalogId]: loadedFields,
        }))
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
    const validationMessage = validateAuthDraft(
      authEmail,
      authPassword,
      authMode === 'register' ? authDisplayName : null,
    )
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

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
    setIsProfilePageOpen(false)
    setIsSettingsPageOpen(false)
    navigate(previewRouteBase)
  }

  const uploadProfileAvatar = async (file: File) => {
    try {
      const result = await uploadImageRequest(file)
      setProfileAvatarImagePath(result.path)
    } catch {
      setMessage('Не удалось загрузить аватар.')
    }
  }

  const saveProfile = async () => {
    if (isProfileSaving || currentUser === null) {
      return
    }

    const validationMessage = validateProfileDraft(profileEmail, profileDisplayName, profileAvatarImagePath)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      setIsProfileSaving(true)
      const updatedUser = await updateCurrentUserRequest(profileEmail, profileDisplayName, profileAvatarImagePath)
      setCurrentUser(updatedUser)
      setMessage('Профиль сохранен.')
    } catch {
      setMessage('Не удалось сохранить профиль.')
    } finally {
      setIsProfileSaving(false)
    }
  }

  const createObject = async () => {
    if (selectedProjectId === null || !isObjectSection(activeSection)) {
      return
    }

    const validationMessage = validateObjectDraft(
      objectName,
      '',
      objectDescription,
      objectAge,
      objectRole,
      objectImagePath,
    )
    if (validationMessage !== null) {
      setMessage(validationMessage)
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
      const result = await uploadImageRequest(file, selectedProjectId)
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
    setDraftTimelineParticipations([])
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
        setMessage('Не удалось загрузить данные редактора объекта.')
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
      [
        ...objectToEdit.outgoingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(objectToEdit.id),
          targetCharacterId: String(relationship.character.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'outgoing' as const,
        })),
        ...objectToEdit.incomingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(relationship.character.id),
          targetCharacterId: String(objectToEdit.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'incoming' as const,
        })),
      ],
    )
    setOwnedItemIds(objectToEdit.ownedItems.map((item) => item.id))
    setOwnerCharacterIds(objectToEdit.owners.map((owner) => owner.id))
    setTerritoryPlaceIds(objectToEdit.territoryPlaces.map((place) => place.id))
    setOwnerOrganizationIds(objectToEdit.ownerOrganizations.map((organization) => organization.id))
    setParentObjectIds(objectToEdit.hierarchyParents.map((parent) => parent.id))
    setDraftTimelineParticipations(
      timelineEvents
        .filter((event) =>
          event.participants.some(
            (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
          ),
        )
        .map((event) => ({
          timelineEventId: String(event.id),
          role:
            event.participants.find(
              (participant) => participant.targetType === 'storyObject' && participant.targetId === objectToEdit.id,
            )?.role ?? '',
        })),
    )
    setDialog('object')
  }

  const syncObjectTimelineParticipations = async (
    projectId: number,
    objectId: number,
    participations: DraftTimelineParticipation[],
  ) => {
    const desiredRolesByEventId = new Map<number, string>()

    participations.forEach((participation) => {
      const eventId = Number(participation.timelineEventId)
      if (Number.isInteger(eventId) && eventId > 0) {
        desiredRolesByEventId.set(eventId, participation.role)
      }
    })

    const eventsToUpdate = timelineEvents.filter((event) => {
      const currentParticipant = event.participants.find(
        (participant) => participant.targetType === 'storyObject' && participant.targetId === objectId,
      )
      const nextRole = desiredRolesByEventId.get(event.id)

      if (currentParticipant === undefined) {
        return nextRole !== undefined
      }

      return nextRole === undefined || (currentParticipant.role ?? '') !== nextRole
    })

    if (eventsToUpdate.length === 0) {
      return
    }

    const updatedEvents = await Promise.all(
      eventsToUpdate.map((event) => {
        const nextParticipants = event.participants
          .filter((participant) => !(participant.targetType === 'storyObject' && participant.targetId === objectId))
          .map((participant) => ({
            targetType: participant.targetType,
            targetId: String(participant.targetId),
            role: participant.role ?? '',
          }))
        const nextRole = desiredRolesByEventId.get(event.id)

        if (nextRole !== undefined) {
          nextParticipants.push({
            targetType: 'storyObject',
            targetId: String(objectId),
            role: nextRole,
          })
        }

        return updateTimelineEventRequest(projectId, event.id, {
          ...toTimelineEventDraft(event),
          participants: nextParticipants,
        })
      }),
    )

    const updatedEventsById = new Map(updatedEvents.map((event) => [event.id, event]))
    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => updatedEventsById.get(event.id) ?? event),
    )
    setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
  }

  const normalizeTimelineChangeText = (value: string | null | undefined) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length === 0 ? '' : normalizedValue
  }

  const stableJson = (value: unknown) => JSON.stringify(value)

  const buildObjectTimelineChanges = (baseObject: StoryObject, targetObjectId: number): TimelineChangeDraft[] => {
    const changes: TimelineChangeDraft[] = []
    const addChange = (
      changeType: TimelineChangeDraft['changeType'],
      fieldName: string,
      oldValue: string | null | undefined,
      newValue: string | null | undefined,
      notes = '',
    ) => {
      const normalizedOldValue = normalizeTimelineChangeText(oldValue)
      const normalizedNewValue = normalizeTimelineChangeText(newValue)

      if (normalizedOldValue === normalizedNewValue) {
        return
      }

      changes.push({
        changeType,
        targetType: 'storyObject',
        targetId: String(targetObjectId),
        fieldName,
        oldValue: normalizedOldValue,
        newValue: normalizedNewValue,
        notes,
      })
    }

    addChange('field', 'name', baseObject.name, objectName)
    addChange('field', 'surname', baseObject.surname, objectSurname)
    addChange('field', 'description', baseObject.description, objectDescription)
    addChange('field', 'age', baseObject.age, objectAge)
    addChange('field', 'role', baseObject.role, objectRole)
    addChange('field', 'imagePath', baseObject.imagePath, objectImagePath)

    const currentAttributes = new Map(
      baseObject.attributes.map((attribute) => [attribute.name.trim().toLowerCase(), attribute.value ?? '']),
    )
    const nextAttributes = new Map(
      draftAttributes
        .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
        .filter((attribute) => attribute.name.length > 0)
        .map((attribute) => [attribute.name.toLowerCase(), attribute.value] as const),
    )
    const attributeNames = new Set([...currentAttributes.keys(), ...nextAttributes.keys()])

    attributeNames.forEach((attributeKey) => {
      const displayName =
        draftAttributes.find((attribute) => attribute.name.trim().toLowerCase() === attributeKey)?.name.trim() ||
        baseObject.attributes.find((attribute) => attribute.name.trim().toLowerCase() === attributeKey)?.name ||
        attributeKey

      addChange('attribute', displayName, currentAttributes.get(attributeKey), nextAttributes.get(attributeKey))
    })

    const currentCatalogSelections = baseObject.catalogSelections
      .map((selection) => ({
        targetType: selection.targetType,
        catalogId: selection.catalogId,
        catalogEntryGroupId: selection.catalogEntryGroupId,
        catalogEntryId: selection.catalogEntryId,
      }))
      .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))
    const nextCatalogSelections = draftCatalogSelections
      .filter((selection) => selection.catalogId.trim().length > 0)
      .map((selection) => ({
        targetType: selection.targetType,
        catalogId: Number(selection.catalogId),
        catalogEntryGroupId:
          selection.catalogEntryGroupId.trim().length === 0 ? null : Number(selection.catalogEntryGroupId),
        catalogEntryId: selection.catalogEntryId.trim().length === 0 ? null : Number(selection.catalogEntryId),
      }))
      .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))

    addChange(
      'catalogSelection',
      'catalogSelections',
      stableJson(currentCatalogSelections),
      stableJson(nextCatalogSelections),
    )

    const currentHierarchySelections = baseObject.hierarchySelections
      .map((selection) => ({
        groupId: selection.groupId,
        nodeIds: selection.nodes.map((node) => node.id).sort((left, right) => left - right),
      }))
      .sort((left, right) => left.groupId - right.groupId)
    const nextHierarchySelections = draftHierarchySelections
      .filter((selection) => selection.groupId > 0)
      .map((selection) => ({
        groupId: selection.groupId,
        nodeIds: [...selection.nodeIds].sort((left, right) => left - right),
      }))
      .sort((left, right) => left.groupId - right.groupId)

    addChange(
      'hierarchySelection',
      'hierarchySelections',
      stableJson(currentHierarchySelections),
      stableJson(nextHierarchySelections),
    )

    addChange(
      'ownership',
      'ownedItemIds',
      stableJson(baseObject.ownedItems.map((item) => item.id).sort((left, right) => left - right)),
      stableJson([...ownedItemIds].sort((left, right) => left - right)),
    )
    addChange(
      'ownership',
      'ownerCharacterIds',
      stableJson(baseObject.owners.map((owner) => owner.id).sort((left, right) => left - right)),
      stableJson([...ownerCharacterIds].sort((left, right) => left - right)),
    )
    addChange(
      'location',
      'territoryPlaceIds',
      stableJson(baseObject.territoryPlaces.map((place) => place.id).sort((left, right) => left - right)),
      stableJson([...territoryPlaceIds].sort((left, right) => left - right)),
    )
    addChange(
      'ownership',
      'ownerOrganizationIds',
      stableJson(baseObject.ownerOrganizations.map((organization) => organization.id).sort((left, right) => left - right)),
      stableJson([...ownerOrganizationIds].sort((left, right) => left - right)),
    )
    addChange(
      'hierarchySelection',
      'parentObjectIds',
      stableJson(baseObject.hierarchyParents.map((parent) => parent.id).sort((left, right) => left - right)),
      stableJson([...parentObjectIds].sort((left, right) => left - right)),
    )

    const currentRelationships = [
      ...baseObject.outgoingCharacterRelationships.map((relationship) => ({
        direction: 'outgoing',
        characterId: relationship.character.id,
        relationType: relationship.relationType,
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description ?? '',
      })),
      ...baseObject.incomingCharacterRelationships.map((relationship) => ({
        direction: 'incoming',
        characterId: relationship.character.id,
        relationType: relationship.relationType,
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description ?? '',
      })),
    ].sort((left, right) => stableJson(left).localeCompare(stableJson(right)))
    const nextRelationships = draftCharacterRelationships
      .map((relationship) => ({
        direction: relationship.direction,
        characterId: Number(
          relationship.direction === 'incoming' ? relationship.sourceCharacterId : relationship.targetCharacterId,
        ),
        relationType: relationship.relationType.trim(),
        strength: Number(relationship.strength),
        tension: Number(relationship.tension),
        isBidirectional: relationship.isBidirectional,
        description: relationship.description.trim(),
      }))
      .filter((relationship) => Number.isInteger(relationship.characterId) && relationship.characterId > 0)
      .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))

    addChange('relationship', 'characterRelationships', stableJson(currentRelationships), stableJson(nextRelationships))

    return changes
  }

  const saveObject = async () => {
    if (isObjectSaving || selectedProjectId === null || !isObjectSection(activeSection)) {
      return
    }

    const validationMessage = validateObjectDraft(
      objectName,
      objectSurname,
      objectDescription,
      objectAge,
      objectRole,
      objectImagePath,
    )
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    const projectId = selectedProjectId
    const section = activeSection
    const objectId = editingObjectId
    const previousObject = selectedObject
    const timelineParticipationsToSave = draftTimelineParticipations

    if (saveObjectAsTimelineChange) {
      const targetEventId = Number(editorTimelineEventId)
      const baseObject =
        objectId === null
          ? null
          : previousObject?.id === objectId
            ? previousObject
            : objects.find((storyObject) => storyObject.id === objectId) ?? null
      const targetEvent = timelineEvents.find((event) => event.id === targetEventId) ?? null

      if (objectId === null || baseObject === null) {
        setMessage('Сначала нужно сохранить объект, потом можно записывать изменения во времени.')
        return
      }

      if (!Number.isInteger(targetEventId) || targetEventId <= 0 || targetEvent === null) {
        setMessage('Выбери событие таймлайна для сохранения изменений.')
        return
      }

      const objectChanges = buildObjectTimelineChanges(baseObject, objectId)

      if (objectChanges.length === 0) {
        setMessage('Изменений для таймлайна пока нет.')
        return
      }

      try {
        setIsObjectSaving(true)
        const changedFieldNames = new Set(objectChanges.map((change) => `${change.changeType}:${change.fieldName}`))
        const eventDraft = toTimelineEventDraft(targetEvent)
        const retainedChanges = eventDraft.changes.filter(
          (change) =>
            !(
              change.targetType === 'storyObject' &&
              Number(change.targetId) === objectId &&
              changedFieldNames.has(`${change.changeType}:${change.fieldName}`)
            ),
        )
        const participationRole =
          timelineParticipationsToSave.find((participation) => participation.timelineEventId === String(targetEvent.id))
            ?.role ?? ''
        const participants = [
          ...eventDraft.participants.filter(
            (participant) => !(participant.targetType === 'storyObject' && Number(participant.targetId) === objectId),
          ),
          { targetType: 'storyObject', targetId: String(objectId), role: participationRole },
        ]
        const savedEvent = await updateTimelineEventRequest(projectId, targetEvent.id, {
          ...eventDraft,
          participants,
          changes: [...retainedChanges, ...objectChanges],
        })

        setTimelineEvents((currentEvents) =>
          currentEvents.map((event) => (event.id === savedEvent.id ? savedEvent : event)),
        )
        setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
        setSelectedTimelineEventId(savedEvent.id)
        setDialog(null)
        resetObjectForm()
        setMessage('Изменения сохранены в таймлайне.')
      } catch {
        setMessage('Не удалось сохранить изменения в таймлайне.')
      } finally {
        setIsObjectSaving(false)
      }

      return
    }

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
      try {
        await syncObjectTimelineParticipations(projectId, saved.id, timelineParticipationsToSave)
      } catch {
        setMessage('Объект сохранен, но участие в событиях таймлайна не обновилось.')
      }
      void fetchObject(projectId, saved.id)
        .then((loadedObject) => {
          setObjects((currentObjects) =>
            currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject)),
          )
        })
        .catch(() => undefined)
      void fetchRelationGraph(projectId)
        .then((graph) => {
          setRelationGraph(graph)
          setRelationGraphLayout((currentLayout) =>
            currentLayout === null ? null : { ...currentLayout, isStale: true },
          )
        })
        .catch(() => {
          setMessage('Объект сохранен, но граф связей не удалось обновить.')
        })
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
      setRelationGraph((currentGraph) => ({
        nodes: currentGraph.nodes.filter((node) => node.id !== selectedObject.id),
        edges: currentGraph.edges.filter(
          (edge) => edge.sourceId !== selectedObject.id && edge.targetId !== selectedObject.id,
        ),
      }))
      setRelationGraphLayout((currentLayout) =>
        currentLayout === null
          ? null
          : {
              ...currentLayout,
              isStale: true,
              items: currentLayout.items.filter((item) => item.storyObjectId !== selectedObject.id),
            },
      )
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

  const openRelationDetail = (edgeId: string) => {
    setSelectedRelationEdgeId(edgeId)
    setSelectedRelationObjectId(null)
    setActiveTab('relations')
    setIsRelationPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('relationDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'relations', activeSection)
    }
  }

  const openRelationObjectDetail = (storyObject: StoryObject) => {
    if (detailMode === 'page') {
      openObjectDetail(storyObject)
      return
    }

    setSelectedCatalogEntryId(null)
    setSelectedRelationEdgeId(null)
    setSelectedRelationObjectId(storyObject.id)
    setSelectedObjectId(storyObject.id)
    setActiveTab('relations')
    setIsRelationPageOpen(false)
    setIsObjectPageOpen(false)
    setObjects((currentObjects) =>
      currentObjects.some((currentObject) => currentObject.id === storyObject.id)
        ? currentObjects.map((currentObject) => (currentObject.id === storyObject.id ? storyObject : currentObject))
        : [storyObject, ...currentObjects],
    )

    if (detailMode === 'modal') {
      setDialog('detail')
    } else {
      setDialog(null)
    }
  }

  const openTimelineEventDetail = (eventId: number) => {
    setSelectedTimelineEventId(eventId)
    setActiveTab('timeline')
    setIsObjectPageOpen(false)
    setIsRelationPageOpen(false)
    setIsTimelineEventPageOpen(detailMode === 'page')

    if (detailMode === 'modal') {
      setDialog('timelineEventDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'timeline', activeSection)
    }
  }

  const openTimelineEventFromDossier = (event: TimelineEvent) => {
    openTimelineEventDetail(event.id)
  }

  const saveAttributeGroup = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeGroupDraft(attributeGroupName, attributeGroupIconKey)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      const previousGroupName =
        editingAttributeGroupId === null
          ? null
          : attributeGroups.find((group) => group.id === editingAttributeGroupId)?.name ?? null
      const saved =
        editingAttributeGroupId === null
          ? await createAttributeGroupRequest(selectedProjectId, 'characters', attributeGroupName, attributeGroupIconKey)
          : await updateAttributeGroupRequest(
              selectedProjectId,
              'characters',
              editingAttributeGroupId,
              attributeGroupName,
              attributeGroupIconKey,
            )
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
      setAttributeGroupIconKey('')
      setEditingAttributeGroupId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось создать группу характеристик.')
    }
  }

  const saveAttributeDefinition = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateAttributeDefinitionDraft(attributeDefinitionDraft)
    if (validationMessage !== null) {
      setMessage(validationMessage)
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
    setAttributeGroupIconKey(group.iconKey ?? '')
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
      iconKey: definition.iconKey ?? '',
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
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateCatalogDraft(catalogName, catalogDescription)
    if (validationMessage !== null) {
      setMessage(validationMessage)
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
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogGroupDraft(catalogGroupName)
    if (validationMessage !== null) {
      setMessage(validationMessage)
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

  const saveCatalogField = async () => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    const validationMessage = validateCatalogFieldDraft(catalogFieldDraft)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogFieldId === null
          ? await createCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, catalogFieldDraft)
          : await updateCatalogFieldDefinitionRequest(
              selectedProjectId,
              targetCatalogId,
              editingCatalogFieldId,
              catalogFieldDraft,
            )

      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]:
          editingCatalogFieldId === null
            ? [...(currentFieldsByCatalogId[targetCatalogId] ?? []), saved]
            : (currentFieldsByCatalogId[targetCatalogId] ?? []).map((field) =>
                field.id === saved.id ? saved : field,
              ),
      }))
      setCatalogFieldDraft(emptyCatalogFieldDraft)
      setEditingCatalogFieldId(null)
    } catch {
      setMessage('Не удалось сохранить поле шаблона.')
    }
  }

  const editCatalogField = (field: CatalogFieldDefinition) => {
    setEditingCatalogFieldId(field.id)
    setCatalogFieldDraft({
      name: field.name,
      dataType: field.dataType,
      isRequired: field.isRequired,
      minValue: field.minValue === null ? '' : String(field.minValue),
      maxValue: field.maxValue === null ? '' : String(field.maxValue),
      optionsText: field.options.join(', '),
      referenceCatalogId: field.referenceCatalogId === null ? '' : String(field.referenceCatalogId),
    })
    setCatalogDialogTab('template')
  }

  const deleteCatalogField = async (fieldId: number) => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    try {
      await deleteCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, fieldId)
      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]: (currentFieldsByCatalogId[targetCatalogId] ?? []).filter((field) => field.id !== fieldId),
      }))
      setCatalogEntries((currentEntries) =>
        currentEntries.map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [targetCatalogId]: (currentEntriesByCatalogId[targetCatalogId] ?? []).map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      }))
      setCatalogEntryDraft((draft) => {
        const fieldValues = { ...draft.fieldValues }
        delete fieldValues[fieldId]
        return { ...draft, fieldValues }
      })
      if (editingCatalogFieldId === fieldId) {
        setEditingCatalogFieldId(null)
        setCatalogFieldDraft(emptyCatalogFieldDraft)
      }
    } catch {
      setMessage('Не удалось удалить поле шаблона.')
    }
  }

  const saveCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogEntryDraft(catalogEntryDraft)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      const fieldDefinitions =
        catalogFieldsByCatalogId[selectedCatalog.id] ?? (await fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalog.id))
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
    setCatalogDialogTab('main')
    setEditingCatalogFieldId(null)
    setCatalogFieldDraft(emptyCatalogFieldDraft)
    if (selectedProjectId !== null) {
      void fetchCatalogFieldDefinitions(selectedProjectId, catalog.id)
        .then((fields) =>
          setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
            ...currentFieldsByCatalogId,
            [catalog.id]: fields,
          })),
        )
        .catch(() => setMessage('Не удалось загрузить шаблон каталога.'))
    }
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
  const selectedRelationObject = useMemo(
    () =>
      selectedRelationObjectId === null
        ? null
        : linkableObjects.find((storyObject) => storyObject.id === selectedRelationObjectId) ?? null,
    [linkableObjects, selectedRelationObjectId],
  )

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

  const toTimelineEventDraft = (event: TimelineEvent): TimelineEventDraft => ({
    title: event.title,
    eventType: event.eventType,
    parentEventId: event.parentEventId === null ? '' : String(event.parentEventId),
    description: event.description ?? '',
    startLabel: event.startLabel ?? '',
    endLabel: event.endLabel ?? '',
    startValue: event.startValue === null ? '' : String(event.startValue),
    endValue: event.endValue === null ? '' : String(event.endValue),
    category: event.category ?? '',
    color: event.color ?? '',
    imagePath: event.imagePath,
    participants: event.participants.map((participant) => ({
      targetType: participant.targetType,
      targetId: String(participant.targetId),
      role: participant.role ?? '',
    })),
    changes: event.changes.map((change) => ({
      changeType: change.changeType,
      targetType: change.targetType,
      targetId: String(change.targetId),
      fieldName: change.fieldName ?? change.fieldKey ?? '',
      oldValue: change.oldValueJson ?? '',
      newValue: change.newValueJson ?? '',
      notes: change.notes ?? '',
    })),
  })

  const openTimelineEventEditor = (event: TimelineEvent | null = null) => {
    setEditingTimelineEventId(event?.id ?? null)
    setTimelineDraft(event === null ? emptyTimelineEventDraft : toTimelineEventDraft(event))
    setDialog('timelineEvent')
  }

  const updateTimelineDraftEventType = (eventType: TimelineEventDraft['eventType']) => {
    const isRangeEvent = eventType === 'duration' || eventType === 'era'

    setTimelineDraft((draft) => ({
      ...draft,
      eventType,
      parentEventId: eventType === 'point' ? draft.parentEventId : '',
      endLabel: isRangeEvent ? draft.endLabel : '',
      endValue: isRangeEvent ? draft.endValue : '',
    }))
  }

  const saveTimelineEvent = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = getTimelineEventValidationMessage(timelineDraft)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingTimelineEventId === null
          ? await createTimelineEventRequest(selectedProjectId, timelineDraft)
          : await updateTimelineEventRequest(selectedProjectId, editingTimelineEventId, timelineDraft)
      setTimelineEvents((currentEvents) =>
        editingTimelineEventId === null
          ? [...currentEvents, saved]
          : currentEvents.map((event) => (event.id === saved.id ? saved : event)),
      )
      setSelectedTimelineEventId(saved.id)
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setTimelineDraft(emptyTimelineEventDraft)
      setEditingTimelineEventId(null)
      setDialog(null)
      setActiveTab('timeline')
    } catch {
      setMessage('Не удалось создать событие.')
    }
  }

  const updateSelectedTimelineEvent = (updatedEvent: TimelineEvent) => {
    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    )
    setSelectedTimelineEventId(updatedEvent.id)
  }

  const addTimelineGalleryImage = async () => {
    if (selectedProjectId === null || selectedTimelineEvent === null || timelineGalleryImagePath === null) {
      return
    }

    try {
      const updatedEvent = await addTimelineEventGalleryImageRequest(
        selectedProjectId,
        selectedTimelineEvent.id,
        timelineGalleryImagePath,
        timelineGalleryImageCaption,
      )
      updateSelectedTimelineEvent(updatedEvent)
      setTimelineGalleryImagePath(null)
      setTimelineGalleryImageCaption('')
    } catch {
      setMessage('Не удалось добавить изображение в галерею события.')
    }
  }

  const deleteTimelineGalleryImage = async (imageId: number) => {
    if (selectedProjectId === null || selectedTimelineEvent === null) {
      return
    }

    try {
      const updatedEvent = await deleteTimelineEventGalleryImageRequest(
        selectedProjectId,
        selectedTimelineEvent.id,
        imageId,
      )
      updateSelectedTimelineEvent(updatedEvent)
    } catch {
      setMessage('Не удалось удалить изображение из галереи события.')
    }
  }

  const uploadTimelineGalleryImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setTimelineGalleryImagePath(result.path)
    } catch {
      setMessage('Не удалось загрузить изображение для галереи события.')
    }
  }

  const deletePendingTimelineEvent = async () => {
    if (selectedProjectId === null || pendingDeleteTimelineEventId === null) {
      return
    }

    try {
      await deleteTimelineEventRequest(selectedProjectId, pendingDeleteTimelineEventId)
      setTimelineEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== pendingDeleteTimelineEventId),
      )
      setTimelineLinks((currentLinks) =>
        currentLinks.filter(
          (link) =>
            link.sourceEventId !== pendingDeleteTimelineEventId &&
            link.targetEventId !== pendingDeleteTimelineEventId,
        ),
      )
      setSelectedTimelineEventId((currentId) => (currentId === pendingDeleteTimelineEventId ? null : currentId))
      setEditingTimelineEventId((currentId) => (currentId === pendingDeleteTimelineEventId ? null : currentId))
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setPendingDeleteTimelineEventId(null)
      setDialog(null)
    } catch {
      setMessage('Не удалось удалить событие.')
    }
  }

  const saveTimelineLink = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateTimelineLinkDraft(timelineLinkDraft)
    if (validationMessage !== null) {
      setMessage(validationMessage)
      return
    }

    try {
      const created = await createTimelineEventLinkRequest(selectedProjectId, timelineLinkDraft)
      setTimelineLinks((currentLinks) => [...currentLinks, created])
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
      setTimelineLinkDraft({
        sourceEventId: '',
        targetEventId: '',
        linkType: 'precedes',
        description: '',
      })
      setDialog(null)
    } catch {
      setMessage('Не удалось создать связь событий.')
    }
  }

  const deleteTimelineLink = async (linkId: number) => {
    if (selectedProjectId === null) {
      return
    }

    try {
      await deleteTimelineEventLinkRequest(selectedProjectId, linkId)
      setTimelineLinks((currentLinks) => currentLinks.filter((link) => link.id !== linkId))
      setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
    } catch {
      setMessage('Не удалось удалить связь событий.')
    }
  }

  const generateTimelineLayout = async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsTimelineGenerating(true)
    try {
      const layout = await generateTimelineLayoutRequest(selectedProjectId)
      setTimelineLayout(layout)
    } catch {
      setMessage('Не удалось сформировать таймлайн.')
    } finally {
      setIsTimelineGenerating(false)
    }
  }

  const generateRelationGraphLayout = async () => {
    if (selectedProjectId === null || relationGraph.nodes.length === 0) {
      return
    }

    setIsRelationLayoutGenerating(true)
    try {
      const positions = await calculateRelationLayout(relationGraph, linkableObjects)
      const layout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        items: relationGraph.nodes.map((node) => {
          const position = positions.get(node.id) ?? { x: 0, y: 0 }

          return {
            storyObjectId: node.id,
            x: position.x,
            y: position.y,
            width: relationNodeWidth,
            height: relationNodeHeight,
            isPinned: false,
          }
        }),
      })
      setRelationGraphLayout(layout)
    } catch {
      setMessage('Не удалось сформировать граф связей.')
    } finally {
      setIsRelationLayoutGenerating(false)
    }
  }

  const saveRelationGraphNodePosition = async (
    storyObjectId: number,
    position: {
      x: number
      y: number
    },
  ) => {
    if (selectedProjectId === null) {
      return
    }

    const graphNodeIds = new Set(relationGraph.nodes.map((node) => node.id))
    const existingItems = new Map(
      (relationGraphLayout?.items ?? [])
        .filter((item) => graphNodeIds.has(item.storyObjectId))
        .map((item) => [item.storyObjectId, item]),
    )
    const currentItem = existingItems.get(storyObjectId)

    existingItems.set(storyObjectId, {
      id: currentItem?.id ?? 0,
      storyObjectId,
      x: position.x,
      y: position.y,
      width: currentItem?.width ?? relationNodeWidth,
      height: currentItem?.height ?? relationNodeHeight,
      isPinned: true,
    })

    const optimisticLayout: RelationGraphLayout = {
      id: relationGraphLayout?.id ?? 0,
      projectId: selectedProjectId,
      algorithmVersion: relationGraphLayout?.algorithmVersion ?? 'relation-elk-v1',
      isDefault: true,
      isStale: relationGraphLayout?.isStale ?? false,
      generatedAt: relationGraphLayout?.generatedAt ?? new Date().toISOString(),
      items: Array.from(existingItems.values()),
    }
    setRelationGraphLayout(optimisticLayout)

    try {
      const savedLayout = await saveRelationGraphLayoutRequest(selectedProjectId, {
        items: optimisticLayout.items.map((item) => ({
          storyObjectId: item.storyObjectId,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          isPinned: item.isPinned,
        })),
      })
      setRelationGraphLayout(savedLayout)
    } catch {
      setMessage('Не удалось сохранить положение узла графа.')
    }
  }

  const renderContent = () => {
    if (isProfilePageOpen) {
      return (
        <ProfilePage
          avatarImagePath={profileAvatarImagePath}
          currentUser={currentUser}
          displayName={profileDisplayName}
          email={profileEmail}
          isSaving={isProfileSaving}
          projectQuery={profileProjectQuery}
          projects={projects}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onAvatarUpload={(file) => void uploadProfileAvatar(file)}
          onDisplayNameChange={setProfileDisplayName}
          onEmailChange={setProfileEmail}
          onOpenProject={(project) => {
            setIsProfilePageOpen(false)
            navigateToPreview(project.id, 'database', 'characters')
          }}
          onProjectQueryChange={setProfileProjectQuery}
          onSave={() => void saveProfile()}
        />
      )
    }

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
      if (detailMode === 'page' && isRelationPageOpen && selectedRelationEdge !== null) {
        return (
          <div className="sp-object-page">
            <div className="sp-content-head">
              <div>
                <h2>{getRelationLabel(selectedRelationEdge.relationType)}</h2>
                <p>Отдельная страница связи</p>
              </div>
              <button
                className="sp-button sp-back-button"
                type="button"
                onClick={() => setIsRelationPageOpen(false)}
              >
                Назад к графу
              </button>
            </div>
            <RelationDetail
              edge={selectedRelationEdge}
              graph={relationGraph}
              objects={linkableObjects}
              ui={ui}
              onClose={() => setIsRelationPageOpen(false)}
              onOpenObject={openRelationObjectDetail}
            />
          </div>
        )
      }

      return (
        <RelationsPage
          graph={relationGraph}
          isLayoutGenerating={isRelationLayoutGenerating}
          layout={relationGraphLayout}
          objects={linkableObjects}
          selectedEdgeId={selectedRelationEdgeId}
          ui={ui}
          onGenerateLayout={() => void generateRelationGraphLayout()}
          onSaveNodePosition={(storyObjectId, position) => void saveRelationGraphNodePosition(storyObjectId, position)}
          onSelectEdge={openRelationDetail}
          onSelect={openRelationObjectDetail}
        />
      )
    }

    if (activeTab === 'timeline') {
      if (detailMode === 'page' && isTimelineEventPageOpen && selectedTimelineEvent !== null) {
        return (
          <div className="sp-object-page">
            <div className="sp-content-head">
              <div>
                <h2>{selectedTimelineEvent.title}</h2>
                <p>Отдельная страница события</p>
              </div>
              <button
                className="sp-button sp-back-button"
                type="button"
                onClick={() => setIsTimelineEventPageOpen(false)}
              >
                Назад к таймлайну
              </button>
            </div>
            <TimelineEventDetail
              event={selectedTimelineEvent}
              events={visibleTimelineEvents}
              galleryImageCaption={timelineGalleryImageCaption}
              galleryImagePath={timelineGalleryImagePath}
              links={timelineLinks}
              objects={linkableObjects}
              ui={ui}
              onAddGalleryImage={() => void addTimelineGalleryImage()}
              onClose={() => setIsTimelineEventPageOpen(false)}
              onDelete={(eventId) => {
                setPendingDeleteTimelineEventId(eventId)
                setDialog('confirmDeleteTimelineEvent')
              }}
              onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
              onEdit={openTimelineEventEditor}
              onGalleryCaptionChange={setTimelineGalleryImageCaption}
              onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
              onOpenEvent={openTimelineEventDetail}
              onOpenObject={openObjectDetail}
            />
          </div>
        )
      }

      return (
        <TimelinePage
          events={visibleTimelineEvents}
          isGenerating={isTimelineGenerating}
          layout={timelineLayout}
          layoutRules={timelineLayoutRules}
          links={timelineLinks}
          selectedEvent={selectedTimelineEvent}
          timeline={timelineInfo}
          ui={ui}
          onCreate={() => openTimelineEventEditor()}
          onCreateLink={() => setDialog('timelineLink')}
          onDeleteLink={(linkId) => void deleteTimelineLink(linkId)}
          onGenerate={() => void generateTimelineLayout()}
          onSelectEvent={openTimelineEventDetail}
        />
      )
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
            attributeGroups={attributeGroups}
            dossierTimelineEventId={dossierTimelineEventId}
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
                const result = await uploadImageRequest(file, selectedProjectId)
                setGalleryImagePath(result.path)
              }
            }}
            onDossierTimelineEventIdChange={setDossierTimelineEventId}
            onOpenTimelineEvent={openTimelineEventFromDossier}
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
            fieldDefinitions={selectedCatalogFields}
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
          attributeGroupIconKey={attributeGroupIconKey}
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
          onAttributeGroupIconChange={setAttributeGroupIconKey}
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
          {currentUser !== null && (
            <button className="sp-button primary sp-content-create" type="button" onClick={openCreateObjectDialog}>
              + {ui.newObject}
            </button>
          )}
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
    <main
      className={`style-preview ${previewTheme === 'dark' ? 'theme-dark' : 'theme-light'} tab-${activeTab}`}
      lang={previewLanguage}
    >
      <div className="sp-shell">
        <header className="sp-topbar">
          <div className="sp-brand">
            <div className="sp-logo">S</div>
            <div>
              <h1>StoryDB</h1>
              <span>{ui.appSubtitle}</span>
            </div>
          </div>
          <div className="sp-tabs sp-main-tabs">
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
              {currentUserAvatarUrl === null ? (
                currentUser?.displayName.slice(0, 1).toUpperCase() ?? 'A'
              ) : (
                <img alt="" src={currentUserAvatarUrl} />
              )}
            </button>
            {isSettingsOpen && (
              <div className="sp-profile-menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsProfilePageOpen(true)
                    setIsSettingsPageOpen(false)
                    setDialog(null)
                    navigate(`${previewRouteBase}/profile`)
                  }}
                >
                  {ui.profile}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsProfilePageOpen(false)
                    setIsSettingsPageOpen(true)
                    setDialog(null)
                    navigate(`${previewRouteBase}/settings`)
                  }}
                >
                  {ui.settings}
                </button>
                {currentUser !== null && (
                  <button type="button" onClick={() => void logout()}>
                    {ui.logout}
                  </button>
                )}
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
            isSettingsPageOpen || isProfilePageOpen
              ? 'utility-page'
              : ''
          } ${
            !isSettingsPageOpen && !isProfilePageOpen && activeTab === 'timeline'
              ? 'no-sidebar'
              : ''
          } ${
            !isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            ((activeTab === 'database' &&
              (selectedObject !== null || (activeSection === 'catalogs' && selectedCatalogEntry !== null))) ||
              (activeTab === 'relations' && (selectedRelationEdge !== null || selectedRelationObject !== null)) ||
              (activeTab === 'timeline' && selectedTimelineEvent !== null))
              ? 'with-detail'
              : ''
          }`}
        >
          {activeTab !== 'timeline' && (
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
                    setCatalogDialogTab('main')
                    setEditingCatalogFieldId(null)
                    setCatalogFieldDraft(emptyCatalogFieldDraft)
                    setDialog('catalog')
                  }}
                >
                  + {ui.newCatalog}
                </button>
              )}
            </section>
          </aside>
          )}

          <section
            className={`sp-content${activeTab === 'timeline' ? ' timeline-content' : ''}${activeTab === 'relations' ? ' relations-content' : ''}`}
          >
            {isLoading ? <div className="sp-empty">{ui.loading}</div> : renderContent()}
          </section>

          {!isSettingsPageOpen && !isProfilePageOpen && detailMode === 'panel' && activeTab === 'database' && selectedObject !== null && (
            <aside className="sp-detail">
              <ObjectDetail
                activeTab={dossierTab}
                attributeDefinitions={attributeDefinitions}
                attributeGroups={attributeGroups}
                dossierTimelineEventId={dossierTimelineEventId}
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
                    const result = await uploadImageRequest(file, selectedProjectId)
                    setGalleryImagePath(result.path)
                  }
                }}
                onDossierTimelineEventIdChange={setDossierTimelineEventId}
                onOpenTimelineEvent={openTimelineEventFromDossier}
                onTabChange={setDossierTab}
              />
            </aside>
          )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'relations' &&
            selectedRelationObject !== null && (
              <aside className="sp-detail">
                <ObjectDetail
                  activeTab={dossierTab}
                  attributeDefinitions={attributeDefinitions}
                  attributeGroups={attributeGroups}
                  dossierTimelineEventId={dossierTimelineEventId}
                  galleryImageCaption={galleryImageCaption}
                  galleryImagePath={galleryImagePath}
                  storyObject={selectedRelationObject}
                  textLinkTargets={textLinkTargets}
                  timelineEvents={timelineEvents}
                  ui={ui}
                  onAddGalleryImage={() => void addGalleryImage()}
                  onDelete={() => {
                    setSelectedObjectId(selectedRelationObject.id)
                    setDialog('confirmDeleteObject')
                  }}
                  onDeleteGalleryImage={(imageId) => void deleteGalleryImage(imageId)}
                  onEdit={() => openEditObjectDialog(selectedRelationObject)}
                  onGalleryCaptionChange={setGalleryImageCaption}
                  onGalleryImageUpload={async (file) => {
                    if (file !== null) {
                      const result = await uploadImageRequest(file, selectedProjectId)
                      setGalleryImagePath(result.path)
                    }
                  }}
                  onDossierTimelineEventIdChange={setDossierTimelineEventId}
                  onOpenTimelineEvent={openTimelineEventFromDossier}
                  onTabChange={setDossierTab}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'relations' &&
            selectedRelationEdge !== null && (
              <aside className="sp-detail">
                <RelationDetail
                  edge={selectedRelationEdge}
                  graph={relationGraph}
                  objects={linkableObjects}
                  ui={ui}
                  onClose={() => setSelectedRelationEdgeId(null)}
                  onOpenObject={openRelationObjectDetail}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'timeline' &&
            selectedTimelineEvent !== null && (
              <aside className="sp-detail">
                <TimelineEventDetail
                  event={selectedTimelineEvent}
                  events={visibleTimelineEvents}
                  galleryImageCaption={timelineGalleryImageCaption}
                  galleryImagePath={timelineGalleryImagePath}
                  links={timelineLinks}
                  objects={linkableObjects}
                  ui={ui}
                  onAddGalleryImage={() => void addTimelineGalleryImage()}
                  onClose={() => setSelectedTimelineEventId(null)}
                  onDelete={(eventId) => {
                    setPendingDeleteTimelineEventId(eventId)
                    setDialog('confirmDeleteTimelineEvent')
                  }}
                  onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
                  onEdit={openTimelineEventEditor}
                  onGalleryCaptionChange={setTimelineGalleryImageCaption}
                  onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
                  onOpenEvent={openTimelineEventDetail}
                  onOpenObject={openObjectDetail}
                />
              </aside>
            )}
          {!isSettingsPageOpen &&
            !isProfilePageOpen &&
            detailMode === 'panel' &&
            activeTab === 'database' &&
            activeSection === 'catalogs' &&
            selectedObject === null &&
            selectedCatalogEntry !== null && (
              <aside className="sp-detail">
                <CatalogEntryDetail
                  catalog={selectedCatalog}
                  catalogEntryLinksById={catalogEntryLinksById}
                  fieldDefinitions={selectedCatalogFields}
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
            draftTimelineParticipations={draftTimelineParticipations}
            editingObjectId={editingObjectId}
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
            onDraftTimelineParticipationsChange={setDraftTimelineParticipations}
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
                draftTimelineParticipations={draftTimelineParticipations}
                editingObjectId={editingObjectId}
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
                onDraftTimelineParticipationsChange={setDraftTimelineParticipations}
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
            attributeGroups={attributeGroups}
            dossierTimelineEventId={dossierTimelineEventId}
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
                const result = await uploadImageRequest(file, selectedProjectId)
                setGalleryImagePath(result.path)
              }
            }}
            onDossierTimelineEventIdChange={setDossierTimelineEventId}
            onOpenTimelineEvent={openTimelineEventFromDossier}
            onTabChange={setDossierTab}
          />
        </PreviewDialog>
      )}
      {dialog === 'relationDetail' && selectedRelationEdge !== null && (
        <PreviewDialog
          title={`Связь: ${getRelationLabel(selectedRelationEdge.relationType)}`}
          onClose={() => {
            setDialog(null)
            setSelectedRelationEdgeId(null)
          }}
        >
          <RelationDetail
            edge={selectedRelationEdge}
            graph={relationGraph}
            objects={linkableObjects}
            ui={ui}
            onClose={() => {
              setDialog(null)
              setSelectedRelationEdgeId(null)
            }}
            onOpenObject={openRelationObjectDetail}
          />
        </PreviewDialog>
      )}
      {dialog === 'timelineEventDetail' && selectedTimelineEvent !== null && (
        <PreviewDialog
          title={`Событие: ${selectedTimelineEvent.title}`}
          onClose={() => {
            setDialog(null)
            setSelectedTimelineEventId(null)
          }}
        >
          <TimelineEventDetail
            event={selectedTimelineEvent}
            events={visibleTimelineEvents}
            galleryImageCaption={timelineGalleryImageCaption}
            galleryImagePath={timelineGalleryImagePath}
            links={timelineLinks}
            objects={linkableObjects}
            ui={ui}
            onAddGalleryImage={() => void addTimelineGalleryImage()}
            onClose={() => {
              setDialog(null)
              setSelectedTimelineEventId(null)
            }}
            onDelete={(eventId) => {
              setPendingDeleteTimelineEventId(eventId)
              setDialog('confirmDeleteTimelineEvent')
            }}
            onDeleteGalleryImage={(imageId) => void deleteTimelineGalleryImage(imageId)}
            onEdit={openTimelineEventEditor}
            onGalleryCaptionChange={setTimelineGalleryImageCaption}
            onGalleryImageUpload={(file) => void uploadTimelineGalleryImage(file)}
            onOpenEvent={openTimelineEventDetail}
            onOpenObject={openObjectDetail}
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
            <label className="wide">
              Иконка
              <AttributeIconPicker value={attributeGroupIconKey} onChange={setAttributeGroupIconKey} />
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
          <div className="sp-catalog-editor">
            <div className="sp-object-editor-tabs">
              <button
                className={catalogDialogTab === 'main' ? 'active' : ''}
                type="button"
                onClick={() => setCatalogDialogTab('main')}
              >
                {ui.main}
              </button>
              <button
                className={catalogDialogTab === 'template' ? 'active' : ''}
                disabled={editingCatalogId === null}
                type="button"
                onClick={() => setCatalogDialogTab('template')}
              >
                {catalogTemplateUi.template}
              </button>
            </div>
            {catalogDialogTab === 'main' && (
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
            )}
            {catalogDialogTab === 'template' && (
              <div className="sp-template-editor">
                <div className="sp-form sp-template-form">
                  <label>
                    {ui.firstName}
                    <input
                      value={catalogFieldDraft.name}
                      onChange={(event) =>
                        setCatalogFieldDraft((draft) => ({ ...draft, name: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    {catalogTemplateUi.dataType}
                    <select
                      value={catalogFieldDraft.dataType}
                      onChange={(event) =>
                        setCatalogFieldDraft((draft) => ({
                          ...draft,
                          dataType: event.target.value as CatalogFieldDataType,
                        }))
                      }
                    >
                      {catalogFieldDataTypes.map((dataType) => (
                        <option key={dataType} value={dataType}>
                          {catalogFieldDataTypeLabels[dataType][previewLanguage]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sp-checkbox-field">
                    {catalogTemplateUi.required}
                    <input
                      checked={catalogFieldDraft.isRequired}
                      type="checkbox"
                      onChange={(event) =>
                        setCatalogFieldDraft((draft) => ({ ...draft, isRequired: event.target.checked }))
                      }
                    />
                  </label>
                  {catalogFieldDraft.dataType === 'number' && (
                    <>
                      <label>
                        {catalogTemplateUi.min}
                        <input
                          type="number"
                          value={catalogFieldDraft.minValue}
                          onChange={(event) =>
                            setCatalogFieldDraft((draft) => ({ ...draft, minValue: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        {catalogTemplateUi.max}
                        <input
                          type="number"
                          value={catalogFieldDraft.maxValue}
                          onChange={(event) =>
                            setCatalogFieldDraft((draft) => ({ ...draft, maxValue: event.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}
                  {catalogFieldDraft.dataType === 'select' && (
                    <label className="wide">
                      {catalogTemplateUi.options}
                      <input
                        placeholder={catalogTemplateUi.optionsPlaceholder}
                        value={catalogFieldDraft.optionsText}
                        onChange={(event) =>
                          setCatalogFieldDraft((draft) => ({ ...draft, optionsText: event.target.value }))
                        }
                      />
                    </label>
                  )}
                  {(catalogFieldDraft.dataType === 'entryReference' ||
                    catalogFieldDraft.dataType === 'multipleEntryReference') && (
                    <label className="wide">
                      {catalogTemplateUi.referenceCatalog}
                      <select
                        value={catalogFieldDraft.referenceCatalogId}
                        onChange={(event) =>
                          setCatalogFieldDraft((draft) => ({ ...draft, referenceCatalogId: event.target.value }))
                        }
                      >
                        <option value="">-</option>
                        {visibleCatalogs.map((catalog) => (
                          <option key={catalog.id} value={catalog.id}>
                            {catalog.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="sp-dialog-actions">
                    {editingCatalogFieldId !== null && (
                      <button
                        className="sp-button"
                        type="button"
                        onClick={() => {
                          setEditingCatalogFieldId(null)
                          setCatalogFieldDraft(emptyCatalogFieldDraft)
                        }}
                      >
                        {ui.cancel}
                      </button>
                    )}
                    <button className="sp-button primary" type="button" onClick={() => void saveCatalogField()}>
                      {editingCatalogFieldId === null ? catalogTemplateUi.addField : ui.save}
                    </button>
                  </div>
                </div>
                <section className="sp-panel">
                  <h3>{catalogTemplateUi.fields}</h3>
                  {catalogDialogFields.length === 0 ? (
                    <p>{catalogTemplateUi.noFields}</p>
                  ) : (
                    catalogDialogFields.map((field) => (
                      <div className="sp-row with-menu" key={field.id}>
                        <span>
                          {field.name}
                          {field.isRequired ? ' *' : ''}
                        </span>
                        <strong>{formatCatalogFieldDefinition(field, visibleCatalogs, previewLanguage)}</strong>
                        <KebabMenu
                          ui={ui}
                          onDelete={() => void deleteCatalogField(field.id)}
                          onEdit={() => editCatalogField(field)}
                        />
                      </div>
                    ))
                  )}
                </section>
                <div className="sp-dialog-actions">
                  <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                    {ui.cancel}
                  </button>
                </div>
              </div>
            )}
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
                void uploadImageRequest(file, selectedProjectId).then((result) =>
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
            <section className="sp-form-section wide">
              <h3>{catalogTemplateUi.template}</h3>
              {selectedCatalogFields.length === 0 ? (
                <p>{catalogTemplateUi.noFields}</p>
              ) : (
                <div className="sp-template-field-grid">
                  {selectedCatalogFields.map((field) => (
                    <CatalogEntryFieldInput
                      catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                      field={field}
                      key={field.id}
                      language={previewLanguage}
                      value={catalogEntryDraft.fieldValues[field.id] ?? ''}
                      onChange={(value) =>
                        setCatalogEntryDraft((draft) => ({
                          ...draft,
                          fieldValues: {
                            ...draft.fieldValues,
                            [field.id]: value,
                          },
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </section>
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
            fieldDefinitions={selectedCatalogFields}
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

      {dialog === 'timelineLink' && (
        <PreviewDialog title="Связь событий" onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Исходное событие
              <select
                value={timelineLinkDraft.sourceEventId}
                onChange={(event) =>
                  setTimelineLinkDraft((draft) => ({ ...draft, sourceEventId: event.target.value }))
                }
              >
                <option value="">Выбери событие</option>
                {timelineEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Целевое событие
              <select
                value={timelineLinkDraft.targetEventId}
                onChange={(event) =>
                  setTimelineLinkDraft((draft) => ({ ...draft, targetEventId: event.target.value }))
                }
              >
                <option value="">Выбери событие</option>
                {timelineEvents.map((event) => (
                  <option key={event.id} value={event.id} disabled={String(event.id) === timelineLinkDraft.sourceEventId}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Тип связи
              <select
                value={timelineLinkDraft.linkType}
                onChange={(event) =>
                  setTimelineLinkDraft((draft) => ({
                    ...draft,
                    linkType: event.target.value as TimelineEventLinkDraft['linkType'],
                  }))
                }
              >
                <option value="precedes">Предшествует</option>
                <option value="causes">Причина / следствие</option>
                <option value="simultaneous">Одновременно</option>
                <option value="partOf">Часть события</option>
                <option value="related">Связано тематически</option>
              </select>
            </label>
            <label className="wide">
              Описание
              <textarea
                value={timelineLinkDraft.description}
                onChange={(event) =>
                  setTimelineLinkDraft((draft) => ({ ...draft, description: event.target.value }))
                }
              />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveTimelineLink()}>
                Создать
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'timelineEvent' && (
        <PreviewDialog title={editingTimelineEventId === null ? ui.newEvent : 'Редактор события'} onClose={() => setDialog(null)}>
          <div className="sp-form">
            <label>
              Тип события
              <select
                value={timelineDraft.eventType}
                onChange={(event) =>
                  updateTimelineDraftEventType(event.target.value as TimelineEventDraft['eventType'])
                }
              >
                <option value="point">Точечное событие</option>
                <option value="duration">Длительное событие</option>
                <option value="era">Эпоха / фон</option>
                <option value="chapter">Глава / разделитель</option>
              </select>
            </label>
            <label>
              Название
              <input
                value={timelineDraft.title}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, title: event.target.value }))}
              />
            </label>
            <label>
              {timelineDraft.eventType === 'point'
                ? 'Момент'
                : timelineDraft.eventType === 'chapter'
                  ? 'Подпись главы'
                  : 'Начало'}
              <input
                value={timelineDraft.startLabel}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, startLabel: event.target.value }))}
              />
            </label>
            <label>
              {timelineDraft.eventType === 'point'
                ? 'Позиция на шкале'
                : timelineDraft.eventType === 'chapter'
                  ? 'Позиция главы'
                  : 'Позиция начала'}
              <input
                inputMode="decimal"
                value={timelineDraft.startValue}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, startValue: event.target.value }))}
              />
            </label>
            {timelineDraftIsRangeEvent && (
              <>
                <label>
                  Конец
                  <input
                    value={timelineDraft.endLabel}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, endLabel: event.target.value }))}
                  />
                </label>
                <label>
                  Позиция конца
                  <input
                    inputMode="decimal"
                    value={timelineDraft.endValue}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, endValue: event.target.value }))}
                  />
                </label>
              </>
            )}
            {timelineDraftIsPointEvent && (
              <label>
                Лента / эпоха
                <select
                  value={timelineDraft.parentEventId}
                  onChange={(event) => setTimelineDraft((draft) => ({ ...draft, parentEventId: event.target.value }))}
                >
                  <option value="">Без ленты</option>
                  {timelineDraftParentOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Категория
              <input
                value={timelineDraft.category}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, category: event.target.value }))}
              />
            </label>
            <label>
              Цвет
              <input
                type="color"
                value={timelineDraft.color || '#2563eb'}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, color: event.target.value }))}
              />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={timelineDraft.imagePath}
              label="Обложка события"
              onFileSelected={async (file) => {
                try {
                  const result = await uploadImageRequest(file, selectedProjectId)
                  setTimelineDraft((draft) => ({ ...draft, imagePath: result.path }))
                } catch {
                  setMessage('Не удалось загрузить обложку события.')
                }
              }}
            />
            <label className="wide">
              Описание
              <textarea
                value={timelineDraft.description}
                onChange={(event) => setTimelineDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </label>
            <section className="sp-form-section wide">
              <div className="sp-section-title-row">
                <h3>Участники</h3>
                <button
                  className="sp-button"
                  type="button"
                  onClick={() =>
                    setTimelineDraft((draft) => ({
                      ...draft,
                      participants: [
                        ...draft.participants,
                        { targetType: 'storyObject', targetId: '', role: '' },
                      ],
                    }))
                  }
                >
                  + Участник
                </button>
              </div>
              {timelineDraft.participants.length === 0 ? (
                <p>Участников пока нет.</p>
              ) : (
                <div className="sp-timeline-participant-editor">
                  {timelineDraft.participants.map((participant, index) => (
                    <div className="sp-form-row" key={index}>
                      <label>
                        Объект
                        <select
                          value={participant.targetId}
                          onChange={(event) =>
                            setTimelineDraft((draft) => ({
                              ...draft,
                              participants: draft.participants.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, targetType: 'storyObject', targetId: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">Выберите объект</option>
                          {linkableObjects.map((storyObject) => (
                            <option key={storyObject.id} value={storyObject.id}>
                              {getObjectFullName(storyObject)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Роль
                        <input
                          value={participant.role}
                          onChange={(event) =>
                            setTimelineDraft((draft) => ({
                              ...draft,
                              participants: draft.participants.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, role: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <button
                        className="sp-icon-button danger"
                        type="button"
                        onClick={() =>
                          setTimelineDraft((draft) => ({
                            ...draft,
                            participants: draft.participants.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={() => setDialog(null)}>
                Отмена
              </button>
              <button className="sp-button primary" type="button" onClick={() => void saveTimelineEvent()}>
                {editingTimelineEventId === null ? 'Создать' : 'Сохранить'}
              </button>
            </div>
          </div>
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteTimelineEvent' && (
        <PreviewDialog title="Удалить событие" onClose={() => setDialog(null)}>
          <div className="sp-note">
            <strong>{timelineEvents.find((event) => event.id === pendingDeleteTimelineEventId)?.title ?? 'Событие'}</strong>
            <span>Событие и его связи на таймлайне будут удалены.</span>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button" type="button" onClick={() => setDialog(null)}>
              Отмена
            </button>
            <button className="sp-button danger" type="button" onClick={() => void deletePendingTimelineEvent()}>
              Удалить
            </button>
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

function AttributeIcon({ iconKey }: { iconKey: string | null | undefined }) {
  const option = attributeIconOptions.find((item) => item.key === iconKey)
  if (option === undefined || option.key === 'none') {
    return null
  }

  const Icon = option.Icon
  return (
    <span className="sp-attribute-icon" aria-hidden="true">
      <Icon size={16} strokeWidth={2.4} />
    </span>
  )
}

function AttributeIconPicker({
  value,
  onChange,
}: {
  value: string | null | undefined
  onChange: (iconKey: string) => void
}) {
  const normalizedValue = value === null || value === undefined || value.length === 0 ? 'none' : value

  return (
    <div className="sp-icon-picker">
      {attributeIconOptions.map(({ key, label, Icon }) => (
        <button
          aria-label={label}
          className={normalizedValue === key ? 'active' : ''}
          key={key}
          title={label}
          type="button"
          onClick={() => onChange(key === 'none' ? '' : key)}
        >
          <Icon size={18} strokeWidth={2.4} />
        </button>
      ))}
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

function ProfilePage({
  avatarImagePath,
  currentUser,
  displayName,
  email,
  isSaving,
  projectQuery,
  projects,
  selectedProjectId,
  ui,
  onAvatarUpload,
  onDisplayNameChange,
  onEmailChange,
  onOpenProject,
  onProjectQueryChange,
  onSave,
}: {
  avatarImagePath: string | null
  currentUser: AuthUser | null
  displayName: string
  email: string
  isSaving: boolean
  projectQuery: string
  projects: StoryProject[]
  selectedProjectId: number | null
  ui: PreviewText
  onAvatarUpload: (file: File) => void
  onDisplayNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onOpenProject: (project: StoryProject) => void
  onProjectQueryChange: (value: string) => void
  onSave: () => void
}) {
  const normalizedQuery = projectQuery.trim().toLowerCase()
  const visibleProjects = projects.filter((project) =>
    normalizedQuery.length === 0 ? true : project.name.toLowerCase().includes(normalizedQuery),
  )

  if (currentUser === null) {
    return (
      <section className="sp-profile-page">
        <div className="sp-empty">
          <strong>{ui.profile}</strong>
          <span>{ui.profileSignIn}</span>
        </div>
      </section>
    )
  }

  return (
    <section className="sp-profile-page">
      <div className="sp-content-head">
        <div>
          <h2>{ui.profile}</h2>
          <p>{currentUser.email}</p>
        </div>
      </div>

      <div className="sp-profile-grid">
        <article className="sp-profile-card">
          <div className="sp-profile-card-head">
            <CoverDropzone
              className="avatar"
              imagePath={avatarImagePath}
              label={ui.avatar}
              onFileSelected={onAvatarUpload}
            />
            <div>
              <span>{ui.profileData}</span>
              <h3>{displayName || currentUser.displayName}</h3>
              <p>{email || currentUser.email}</p>
            </div>
          </div>
          <div className="sp-form sp-profile-form">
            <label>
              {ui.displayName}
              <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
            </label>
            <label>
              {ui.email}
              <input value={email} onChange={(event) => onEmailChange(event.target.value)} />
            </label>
          </div>
          <div className="sp-dialog-actions">
            <button className="sp-button primary" disabled={isSaving} type="button" onClick={onSave}>
              {isSaving ? ui.loading : ui.save}
            </button>
          </div>
        </article>

        <article className="sp-profile-card sp-profile-projects">
          <div className="sp-content-head compact">
            <div>
              <h3>{ui.profileProjects}</h3>
              <p>
                {projects.length} {ui.projects}
              </p>
            </div>
          </div>
          <label className="sp-profile-project-search">
            <input
              type="search"
              value={projectQuery}
              onChange={(event) => onProjectQueryChange(event.target.value)}
              placeholder={ui.projectSearch}
            />
          </label>
          <div className="sp-profile-project-grid">
            {visibleProjects.map((project) => (
              <ProfileProjectCard
                isSelected={project.id === selectedProjectId}
                key={project.id}
                project={project}
                ui={ui}
                onOpen={() => onOpenProject(project)}
              />
            ))}
            {visibleProjects.length === 0 && (
              <div className="sp-empty">
                <strong>{ui.projectNotSelected}</strong>
                <span>{ui.projectSearch}</span>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function ProfileProjectCard({
  isSelected,
  project,
  ui,
  onOpen,
}: {
  isSelected: boolean
  project: StoryProject
  ui: PreviewText
  onOpen: () => void
}) {
  const coverUrl = resolveAssetUrl(project.coverImagePath)

  return (
    <button className={`sp-profile-project-card ${isSelected ? 'selected' : ''}`} type="button" onClick={onOpen}>
      <div className="sp-profile-project-cover">
        {coverUrl === null ? getInitials(project.name) : <img alt="" src={coverUrl} />}
      </div>
      <div>
        <strong>{project.name}</strong>
        <span>
          {project.objectCount} {ui.objectsCount}
        </span>
      </div>
      <em>{ui.selectProject}</em>
    </button>
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
  attributeGroupIconKey,
  attributeGroupName,
  attributeGroups,
  groupDisplayMode,
  editingAttributeDefinitionId,
  selectedAttributeGroupId,
  ui,
  onCancelAttributeEdit,
  onAttributeDefinitionDraftChange,
  onAttributeGroupIconChange,
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
  attributeGroupIconKey: string
  attributeGroupName: string
  attributeGroups: AttributeGroup[]
  groupDisplayMode: GroupDisplayMode
  editingAttributeDefinitionId: number | null
  selectedAttributeGroupId: number | null
  ui: PreviewText
  onCancelAttributeEdit: () => void
  onAttributeDefinitionDraftChange: (draft: AttributeDefinitionDraft) => void
  onAttributeGroupIconChange: (iconKey: string) => void
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
              <strong className="sp-label-with-icon">
                <AttributeIcon iconKey={group.iconKey} />
                {group.name}
              </strong>
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
            <AttributeIconPicker value={attributeGroupIconKey} onChange={onAttributeGroupIconChange} />
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
              <AttributeIconPicker value={attributeGroupIconKey} onChange={onAttributeGroupIconChange} />
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
            <label className="sp-wide-label">
              Иконка
              <AttributeIconPicker value={attributeDefinitionDraft.iconKey} onChange={(iconKey) => updateDraft({ iconKey })} />
            </label>
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
                  <strong className="sp-label-with-icon">
                    <AttributeIcon iconKey={attributeGroups.find((item) => item.name === group.name)?.iconKey} />
                    {group.name}
                  </strong>
                  <span>{group.attributes.length}</span>
                </div>
                {group.attributes.map((attribute) => {
                  const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                  return (
                    <div className="sp-row with-menu" key={attribute.id}>
                      <span className="sp-label-with-icon">
                        <AttributeIcon iconKey={definition?.iconKey} />
                        {attribute.name}
                      </span>
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
  draftTimelineParticipations,
  editingObjectId,
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
  onDraftTimelineParticipationsChange,
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
  draftTimelineParticipations: DraftTimelineParticipation[]
  editingObjectId: number | null
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
  onDraftTimelineParticipationsChange: (participations: DraftTimelineParticipation[]) => void
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
      {
        id: null,
        sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId),
        targetCharacterId: '',
        relationType: '',
        strength: '50',
        tension: '0',
        isBidirectional: true,
        description: '',
        direction: 'outgoing',
      },
    ])
  const updateRelationship = (index: number, patch: Partial<DraftCharacterRelationship>) =>
    onDraftCharacterRelationshipsChange(
      draftCharacterRelationships.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  const getRelationshipCharacterId = (relationship: DraftCharacterRelationship) =>
    relationship.direction === 'incoming' ? relationship.sourceCharacterId : relationship.targetCharacterId
  const updateRelationshipCharacter = (index: number, characterId: string) => {
    const relationship = draftCharacterRelationships[index]

    if (relationship === undefined) {
      return
    }

    updateRelationship(
      index,
      relationship.direction === 'incoming'
        ? { sourceCharacterId: characterId, targetCharacterId: editingObjectId === null ? '' : String(editingObjectId) }
        : { sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId), targetCharacterId: characterId },
    )
  }
  const updateRelationshipDirection = (index: number, direction: DraftCharacterRelationship['direction']) => {
    const relationship = draftCharacterRelationships[index]

    if (relationship === undefined) {
      return
    }

    const relatedCharacterId = getRelationshipCharacterId(relationship)

    updateRelationship(
      index,
      direction === 'incoming'
        ? {
            direction,
            sourceCharacterId: relatedCharacterId,
            targetCharacterId: editingObjectId === null ? '' : String(editingObjectId),
          }
        : {
            direction,
            sourceCharacterId: editingObjectId === null ? '' : String(editingObjectId),
            targetCharacterId: relatedCharacterId,
          },
    )
  }
  const relationshipCharacters = objectsByType.characters.filter((character) => character.id !== editingObjectId)
  const getTimelineParticipation = (eventId: number) =>
    draftTimelineParticipations.find((participation) => participation.timelineEventId === String(eventId))
  const toggleTimelineParticipation = (eventId: number, isSelected: boolean) => {
    const eventIdText = String(eventId)

    if (isSelected) {
      if (draftTimelineParticipations.some((participation) => participation.timelineEventId === eventIdText)) {
        return
      }

      onDraftTimelineParticipationsChange([
        ...draftTimelineParticipations,
        { timelineEventId: eventIdText, role: '' },
      ])
      return
    }

    onDraftTimelineParticipationsChange(
      draftTimelineParticipations.filter((participation) => participation.timelineEventId !== eventIdText),
    )
  }
  const updateTimelineParticipationRole = (eventId: number, role: string) => {
    const eventIdText = String(eventId)
    const hasParticipation = draftTimelineParticipations.some(
      (participation) => participation.timelineEventId === eventIdText,
    )

    onDraftTimelineParticipationsChange(
      hasParticipation
        ? draftTimelineParticipations.map((participation) =>
            participation.timelineEventId === eventIdText ? { ...participation, role } : participation,
          )
        : [...draftTimelineParticipations, { timelineEventId: eventIdText, role }],
    )
  }

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
                <section className="sp-editor-block sp-relationship-editor" key={`${relationship.id ?? 'new'}-${index}`}>
                  <div className="sp-editor-row multi">
                    <label>
                      Направление
                      <select
                        value={relationship.direction}
                        onChange={(event) =>
                          updateRelationshipDirection(index, event.target.value as DraftCharacterRelationship['direction'])
                        }
                      >
                        <option value="outgoing">От этого персонажа</option>
                        <option value="incoming" disabled={editingObjectId === null}>
                          К этому персонажу
                        </option>
                      </select>
                    </label>
                    <label>
                      Персонаж
                      <select
                        value={getRelationshipCharacterId(relationship)}
                        onChange={(event) => updateRelationshipCharacter(index, event.target.value)}
                      >
                        <option value="">{ui.characters}</option>
                        {relationshipCharacters.map((character) => (
                          <option key={character.id} value={character.id}>
                            {getObjectFullName(character)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Тип связи
                      <input
                        placeholder="Союз, конфликт, семья..."
                        value={relationship.relationType}
                        onChange={(event) => updateRelationship(index, { relationType: event.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onDraftCharacterRelationshipsChange(
                          draftCharacterRelationships.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      {ui.delete}
                    </button>
                  </div>
                  <div className="sp-editor-row multi">
                    <label>
                      Сила связи
                      <input
                        min={0}
                        max={100}
                        type="number"
                        value={relationship.strength}
                        onChange={(event) => updateRelationship(index, { strength: event.target.value })}
                      />
                    </label>
                    <label>
                      Напряжение
                      <input
                        min={0}
                        max={100}
                        type="number"
                        value={relationship.tension}
                        onChange={(event) => updateRelationship(index, { tension: event.target.value })}
                      />
                    </label>
                    <label className="sp-checkline">
                      <input
                        checked={relationship.isBidirectional}
                        type="checkbox"
                        onChange={(event) => updateRelationship(index, { isBidirectional: event.target.checked })}
                      />
                      Двусторонняя
                    </label>
                  </div>
                  <label>
                    Описание связи
                    <textarea
                      value={relationship.description}
                      onChange={(event) => updateRelationship(index, { description: event.target.value })}
                    />
                  </label>
                </section>
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
          <section className="sp-editor-block">
            <strong>Участие в событиях</strong>
            {timelineEvents.length === 0 ? (
              <p className="sp-editor-hint">Событий пока нет.</p>
            ) : (
              <div className="sp-timeline-participation-list">
                {timelineEvents.map((event) => {
                  const participation = getTimelineParticipation(event.id)
                  const isSelected = participation !== undefined

                  return (
                    <div className="sp-timeline-participation-row" key={event.id}>
                      <label className="sp-checkline">
                        <input
                          checked={isSelected}
                          type="checkbox"
                          onChange={(inputEvent) => toggleTimelineParticipation(event.id, inputEvent.target.checked)}
                        />
                        <span>
                          <strong>{event.title}</strong>
                          <em>{[event.startLabel, event.endLabel].filter(Boolean).join(' - ') || event.category || 'Событие'}</em>
                        </span>
                      </label>
                      <input
                        disabled={!isSelected}
                        placeholder="Роль в событии"
                        value={participation?.role ?? ''}
                        onChange={(inputEvent) => updateTimelineParticipationRole(event.id, inputEvent.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
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
  attributeGroups: attributeGroupDefinitions,
  dossierTimelineEventId = '',
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
  onDossierTimelineEventIdChange,
  onOpenTimelineEvent,
  onTabChange,
}: {
  activeTab?: ObjectDossierTab
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  dossierTimelineEventId?: string
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
  onDossierTimelineEventIdChange?: (eventId: string) => void
  onOpenTimelineEvent?: (event: TimelineEvent) => void
  onTabChange?: (tab: ObjectDossierTab) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dossierTimelineEvent =
    timelineEvents.find((event) => String(event.id) === dossierTimelineEventId) ?? null
  const objectTimelineChanges =
    dossierTimelineEvent?.changes.filter(
      (change) => change.targetType === 'storyObject' && change.targetId === storyObject.id,
    ) ?? []
  const displayStoryObject = applyTimelineChangesToObject(storyObject, objectTimelineChanges)
  const relatedTimelineEvents = timelineEvents.filter((event) =>
    event.participants.some(
      (participant) => participant.targetType === 'storyObject' && participant.targetId === storyObject.id,
    ),
  )
  const attributeGroups = groupAttributesByDefinition(displayStoryObject.attributes, attributeDefinitions, 'Основная')
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
        <ObjectPortrait storyObject={displayStoryObject} />
        <div>
          <span>{ui.dossier}</span>
          <h2>{getObjectFullName(displayStoryObject)}</h2>
          <p>
            <LinkedText targets={textLinkTargets} text={displayStoryObject.role ?? displayStoryObject.typeKey} />
          </p>
        </div>
      </div>
      <div className="sp-fields">
        <div><span>{ui.yearAge}</span><strong>{displayStoryObject.age ?? '-'}</strong></div>
        <div>
          <span>{ui.role}</span>
          <strong>
            <LinkedText emptyText="-" targets={textLinkTargets} text={displayStoryObject.role} />
          </strong>
        </div>
        <div><span>{ui.objectType}</span><strong>{displayStoryObject.typeKey}</strong></div>
      </div>
      {timelineEvents.length > 0 && (
        <section className="sp-panel sp-timeline-context-panel">
          <div>
            <span>Временной контекст</span>
            <strong>{dossierTimelineEvent?.title ?? 'Базовое состояние'}</strong>
          </div>
          <select
            value={dossierTimelineEventId}
            onChange={(event) => onDossierTimelineEventIdChange?.(event.target.value)}
          >
            <option value="">Базовое состояние</option>
            {timelineEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </section>
      )}
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={displayStoryObject.description} />
        </p>
      </section>
      {dossierTimelineEvent !== null && objectTimelineChanges.length > 0 && (
        <section className="sp-panel sp-context-change-list">
          <h3>Изменения выбранного события</h3>
          {objectTimelineChanges.map((change) => (
            <div className="sp-row" key={change.id}>
              <span>{change.fieldName ?? change.fieldKey ?? change.changeType}</span>
              <strong>
                {formatTimelineChangeValue(change.oldValueJson)} → {formatTimelineChangeValue(change.newValueJson)}
              </strong>
            </div>
          ))}
        </section>
      )}
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
            {displayStoryObject.attributes.length === 0 ? (
              <p>Характеристик пока нет.</p>
            ) : (
              attributeGroups.map((group) => (
                <article className="sp-attribute-group" key={group.name}>
                  <div className="sp-attribute-group-head">
                    <strong className="sp-label-with-icon">
                      <AttributeIcon iconKey={attributeGroupDefinitions.find((item) => item.name === group.name)?.iconKey} />
                      {group.name}
                    </strong>
                    <span>{group.attributes.length}</span>
                  </div>
                  {group.attributes.map((attribute) => {
                    const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                    return (
                      <div className="sp-row" key={attribute.id}>
                        <span className="sp-label-with-icon">
                          <AttributeIcon iconKey={definition?.iconKey} />
                          {attribute.name}
                        </span>
                        <strong>
                          <LinkedText emptyText="-" targets={textLinkTargets} text={attribute.value} />
                        </strong>
                      </div>
                    )
                  })}
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
                <strong>
                  {onOpenTimelineEvent === undefined ? (
                    event.title
                  ) : (
                    <button className="sp-link-button" type="button" onClick={() => onOpenTimelineEvent(event)}>
                      {event.title}
                    </button>
                  )}
                </strong>
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

const formatCatalogFieldDefinition = (
  field: CatalogFieldDefinition,
  catalogs: Catalog[],
  language: PreviewLanguage,
) => {
  const parts = [catalogFieldDataTypeLabels[field.dataType][language]]

  if (field.dataType === 'number') {
    const bounds = [field.minValue ?? '', field.maxValue ?? ''].join(' - ').trim()
    if (bounds.length > 0) {
      parts.push(bounds)
    }
  }

  if (field.dataType === 'select' && field.options.length > 0) {
    parts.push(field.options.join(', '))
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    parts.push(catalogs.find((catalog) => catalog.id === field.referenceCatalogId)?.name ?? '-')
  }

  return parts.join(' · ')
}

function CatalogEntryFieldInput({
  catalogEntriesByCatalogId,
  field,
  language,
  value,
  onChange,
}: {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  field: CatalogFieldDefinition
  language: PreviewLanguage
  value: string
  onChange: (value: string) => void
}) {
  const requiredLabel = catalogTemplateLabels[language].required

  if (field.dataType === 'longText') {
    return (
      <label className="wide">
        {field.name}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    )
  }

  if (field.dataType === 'select') {
    return (
      <label>
        {field.name}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.isRequired ? requiredLabel : '-'}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    const referenceEntries =
      field.referenceCatalogId === null ? [] : catalogEntriesByCatalogId[field.referenceCatalogId] ?? []
    const selectedIds = value
      .split(',')
      .map((entryId) => Number(entryId))
      .filter((entryId) => Number.isInteger(entryId) && entryId > 0)

    if (field.dataType === 'multipleEntryReference') {
      return (
        <label className="wide">
          {field.name}
          <select
            multiple
            value={selectedIds.map(String)}
            onChange={(event) =>
              onChange(
                Array.from(event.target.selectedOptions)
                  .map((option) => option.value)
                  .join(','),
              )
            }
          >
            {referenceEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      )
    }

    return (
      <label>
        {field.name}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.isRequired ? requiredLabel : '-'}</option>
          {referenceEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label>
      {field.name}
      <input
        max={field.dataType === 'number' && field.maxValue !== null ? field.maxValue : undefined}
        min={field.dataType === 'number' && field.minValue !== null ? field.minValue : undefined}
        required={field.isRequired}
        type={field.dataType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function CatalogEntryFieldValue({
  catalogEntryLinksById,
  entry,
  field,
  textLinkTargets,
}: {
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  entry: CatalogEntry
  field: CatalogFieldDefinition
  textLinkTargets: TextLinkTarget[]
}) {
  const entryValue = entry.fieldValues.find((fieldValue) => fieldValue.fieldDefinitionId === field.id)

  if (entryValue === undefined) {
    return <>-</>
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    if (entryValue.referencedEntryIds.length === 0) {
      return <>-</>
    }

    return (
      <>
        {entryValue.referencedEntryIds.map((entryId, index) => {
          const target = catalogEntryLinksById.get(entryId)

          return (
            <span key={entryId}>
              {index > 0 && ', '}
              <LinkedText targets={textLinkTargets} text={target?.entry.name ?? `#${entryId}`} />
            </span>
          )
        })}
      </>
    )
  }

  return <LinkedText emptyText="-" targets={textLinkTargets} text={entryValue.value} />
}

function CatalogEntryDetail({
  catalog,
  catalogEntryLinksById,
  fieldDefinitions,
  entry,
  textLinkTargets,
  ui,
  onDelete,
  onEdit,
}: {
  catalog: Catalog | null
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  fieldDefinitions: CatalogFieldDefinition[]
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
        {fieldDefinitions.length === 0 ? (
          <p>Дополнительных полей пока нет.</p>
        ) : (
          fieldDefinitions.map((field) => (
            <div className="sp-row" key={field.id}>
              <span>{field.name}</span>
              <strong>
                <CatalogEntryFieldValue
                  catalogEntryLinksById={catalogEntryLinksById}
                  entry={entry}
                  field={field}
                  textLinkTargets={textLinkTargets}
                />
              </strong>
            </div>
          ))
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
              <div className="sp-catalog-entry-actions">
                <button className="sp-button primary" type="button" onClick={onCreateEntry}>
                  + {ui.newCatalogEntry}
                </button>
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

type RelationNodeData = {
  storyObject: StoryObject
  relationCount: number
  onSelect: (storyObject: StoryObject) => void
}

type RelationObjectFlowNode = Node<RelationNodeData, 'relationObject'>

const relationNodeTypes = {
  relationObject: RelationObjectNode,
}

const relationCategoryColors: Record<string, string> = {
  character: '#2563eb',
  object: '#0f766e',
  ownership: '#9333ea',
}

const objectRelationLabels: Record<string, string> = {
  hierarchyParent: 'иерархия',
  locatedOnTerritory: 'на территории',
  territoryOwner: 'владелец территории',
}

const relationNodeWidth = 220
const relationNodeHeight = 72
const relationHandlePositions = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
]
type RelationLayoutEngine = {
  layout(graph: ElkNode): Promise<ElkNode>
}
let relationLayoutEnginePromise: Promise<RelationLayoutEngine> | null = null

const getRelationLayoutEngine = () => {
  relationLayoutEnginePromise ??= import('elkjs/lib/elk.bundled.js').then(
    ({ default: ElkConstructor }) => new ElkConstructor() as unknown as RelationLayoutEngine,
  )

  return relationLayoutEnginePromise
}

function RelationObjectNode({ data }: NodeProps<RelationObjectFlowNode>) {
  return (
    <button className="sp-flow-node" type="button" onClick={() => data.onSelect(data.storyObject)}>
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`source-${handle.id}`}
          key={`source-${handle.id}`}
          position={handle.position}
          type="source"
        />
      ))}
      {relationHandlePositions.map((handle) => (
        <Handle
          className="sp-flow-handle"
          id={`target-${handle.id}`}
          key={`target-${handle.id}`}
          position={handle.position}
          type="target"
        />
      ))}
      <ObjectPortrait storyObject={data.storyObject} />
      <div>
        <strong>{getObjectFullName(data.storyObject)}</strong>
        <span>{data.storyObject.typeKey}</span>
      </div>
      <em>{data.relationCount}</em>
    </button>
  )
}

const relationGraphNodeToStoryObject = (node: RelationGraphNode): StoryObject => ({
  id: node.id,
  name: node.name,
  surname: node.surname,
  description: null,
  age: null,
  role: null,
  imagePath: node.imagePath,
  typeKey: node.typeKey,
  attributes: [],
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
})

const getRelationLabel = (relationType: string) => objectRelationLabels[relationType] ?? relationType

const getRelationGraphNodes = (graph: RelationGraph, objects: StoryObject[]) =>
  graph.nodes.length > 0
    ? graph.nodes
    : objects.map((storyObject) => ({
        id: storyObject.id,
        name: storyObject.name,
        surname: storyObject.surname,
        imagePath: storyObject.imagePath,
        typeKey: storyObject.typeKey as ObjectTypeKey,
      }))

const getRelationDegrees = (graph: RelationGraph, graphNodes: RelationGraphNode[]) => {
  const degree = new Map<number, number>()

  graphNodes.forEach((node) => degree.set(node.id, 0))
  graph.edges.forEach((edge) => {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1)
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1)
  })

  return degree
}

const getRelationPairKey = (firstId: number, secondId: number) =>
  firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`

const getRelationComponents = (graphNodes: RelationGraphNode[], edges: RelationGraph['edges']) => {
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]))
  const adjacency = new Map<number, Set<number>>()

  graphNodes.forEach((node) => adjacency.set(node.id, new Set()))
  edges.forEach((edge) => {
    if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) {
      return
    }

    adjacency.get(edge.sourceId)?.add(edge.targetId)
    adjacency.get(edge.targetId)?.add(edge.sourceId)
  })

  const visited = new Set<number>()
  const components: RelationGraphNode[][] = []

  graphNodes.forEach((node) => {
    if (visited.has(node.id)) {
      return
    }

    const stack = [node.id]
    const component: RelationGraphNode[] = []

    visited.add(node.id)
    while (stack.length > 0) {
      const currentId = stack.pop()
      const currentNode = currentId === undefined ? undefined : nodeById.get(currentId)

      if (currentId === undefined || currentNode === undefined) {
        continue
      }

      component.push(currentNode)
      adjacency.get(currentId)?.forEach((nextId) => {
        if (!visited.has(nextId)) {
          visited.add(nextId)
          stack.push(nextId)
        }
      })
    }

    components.push(component)
  })

  return components
}

const getRelationTriangle = (component: RelationGraphNode[], relationPairs: Set<string>, degree: Map<number, number>) => {
  const sortedNodes = [...component].sort((firstNode, secondNode) => {
    const degreeDelta = (degree.get(secondNode.id) ?? 0) - (degree.get(firstNode.id) ?? 0)

    return degreeDelta !== 0 ? degreeDelta : firstNode.name.localeCompare(secondNode.name)
  })

  for (let firstIndex = 0; firstIndex < sortedNodes.length - 2; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < sortedNodes.length - 1; secondIndex += 1) {
      for (let thirdIndex = secondIndex + 1; thirdIndex < sortedNodes.length; thirdIndex += 1) {
        const firstNode = sortedNodes[firstIndex]
        const secondNode = sortedNodes[secondIndex]
        const thirdNode = sortedNodes[thirdIndex]

        if (
          relationPairs.has(getRelationPairKey(firstNode.id, secondNode.id)) &&
          relationPairs.has(getRelationPairKey(firstNode.id, thirdNode.id)) &&
          relationPairs.has(getRelationPairKey(secondNode.id, thirdNode.id))
        ) {
          return [firstNode, secondNode, thirdNode]
        }
      }
    }
  }

  return null
}

const centerRelationNode = (centerX: number, centerY: number) => ({
  x: centerX - relationNodeWidth / 2,
  y: centerY - relationNodeHeight / 2,
})

const getPositionedNeighbor = (
  nodeId: number,
  edges: RelationGraph['edges'],
  positions: Map<number, { x: number; y: number }>,
) => {
  const edge = edges.find((relationEdge) => {
    if (relationEdge.sourceId === nodeId && positions.has(relationEdge.targetId)) {
      return true
    }

    return relationEdge.targetId === nodeId && positions.has(relationEdge.sourceId)
  })

  if (edge === undefined) {
    return null
  }

  const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
  const neighborPosition = positions.get(neighborId)

  if (neighborPosition === undefined) {
    return null
  }

  return { id: neighborId, position: neighborPosition }
}

const getConnectedPositionedNeighbor = (
  nodeId: number,
  preferredNeighborIds: Set<number>,
  edges: RelationGraph['edges'],
  positions: Map<number, { x: number; y: number }>,
) => {
  const edge = edges.find((relationEdge) => {
    const neighborId =
      relationEdge.sourceId === nodeId
        ? relationEdge.targetId
        : relationEdge.targetId === nodeId
          ? relationEdge.sourceId
          : null

    return neighborId !== null && preferredNeighborIds.has(neighborId) && positions.has(neighborId)
  })

  if (edge === undefined) {
    return null
  }

  const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
  const neighborPosition = positions.get(neighborId)

  return neighborPosition === undefined ? null : { id: neighborId, position: neighborPosition }
}

const getSatellitePosition = (
  anchorId: number,
  anchorPosition: { x: number; y: number },
  index: number,
  triangleRoles: Map<number, 'top' | 'left' | 'right'>,
) => {
  const role = triangleRoles.get(anchorId)
  const verticalStep = relationNodeHeight + 34
  const horizontalStep = relationNodeWidth + 80

  if (role === 'top') {
    return {
      x: anchorPosition.x + (index - 0.5) * horizontalStep,
      y: anchorPosition.y - verticalStep - 50,
    }
  }

  if (role === 'left') {
    return {
      x: anchorPosition.x - horizontalStep,
      y: anchorPosition.y + index * verticalStep,
    }
  }

  if (role === 'right') {
    return {
      x: anchorPosition.x + horizontalStep,
      y: anchorPosition.y + index * verticalStep,
    }
  }

  return {
    x: anchorPosition.x + horizontalStep,
    y: anchorPosition.y + index * verticalStep,
  }
}

const getRelationHandleIds = (
  sourcePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
) => {
  const sourceCenter = {
    x: sourcePosition.x + relationNodeWidth / 2,
    y: sourcePosition.y + relationNodeHeight / 2,
  }
  const targetCenter = {
    x: targetPosition.x + relationNodeWidth / 2,
    y: targetPosition.y + relationNodeHeight / 2,
  }
  const deltaX = targetCenter.x - sourceCenter.x
  const deltaY = targetCenter.y - sourceCenter.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      sourceHandle: deltaX >= 0 ? 'source-right' : 'source-left',
      targetHandle: deltaX >= 0 ? 'target-left' : 'target-right',
    }
  }

  return {
    sourceHandle: deltaY >= 0 ? 'source-bottom' : 'source-top',
    targetHandle: deltaY >= 0 ? 'target-top' : 'target-bottom',
  }
}

const calculateSmallRelationLayout = (graph: RelationGraph, graphNodes: RelationGraphNode[]) => {
  const primaryEdges = graph.edges.filter((edge) => edge.category === 'character')
  const primaryNodeIds = new Set(primaryEdges.flatMap((edge) => [edge.sourceId, edge.targetId]))
  const primaryNodes = graphNodes.filter((node) => primaryNodeIds.has(node.id))
  const layoutNodes = primaryNodes.length > 0 ? primaryNodes : graphNodes
  const layoutEdges = primaryEdges.length > 0 ? primaryEdges : graph.edges
  const components = getRelationComponents(layoutNodes, layoutEdges)

  if (components.some((component) => component.length > 8) || graphNodes.length > 14) {
    return null
  }

  const relationPairs = new Set(layoutEdges.map((edge) => getRelationPairKey(edge.sourceId, edge.targetId)))
  const degree = getRelationDegrees({ ...graph, edges: layoutEdges }, layoutNodes)
  const positions = new Map<number, { x: number; y: number }>()
  let offsetX = 120
  let offsetY = 120
  let rowHeight = 0

  components.forEach((component) => {
    const triangle = getRelationTriangle(component, relationPairs, degree)

    if (triangle !== null) {
      const [topNode, leftNode, rightNode] = triangle
      const triangleIds = new Set(triangle.map((node) => node.id))
      const restNodes = component.filter((node) => !triangleIds.has(node.id))
      const triangleRoles = new Map<number, 'top' | 'left' | 'right'>([
        [topNode.id, 'top'],
        [leftNode.id, 'left'],
        [rightNode.id, 'right'],
      ])
      const triangleAttachmentCounts = new Map<number, number>()

      positions.set(topNode.id, centerRelationNode(offsetX + 370, offsetY + 70))
      positions.set(leftNode.id, centerRelationNode(offsetX + 120, offsetY + 310))
      positions.set(rightNode.id, centerRelationNode(offsetX + 620, offsetY + 310))
      restNodes.forEach((node, index) => {
        const positionedNeighbor = getConnectedPositionedNeighbor(node.id, triangleIds, layoutEdges, positions)

        if (positionedNeighbor === null) {
          positions.set(node.id, centerRelationNode(offsetX + 120 + index * 250, offsetY + 540))
          return
        }

        const attachmentIndex = triangleAttachmentCounts.get(positionedNeighbor.id) ?? 0
        triangleAttachmentCounts.set(positionedNeighbor.id, attachmentIndex + 1)
        positions.set(node.id, getSatellitePosition(positionedNeighbor.id, positionedNeighbor.position, attachmentIndex, triangleRoles))
      })

      offsetX += Math.max(820, 240 + restNodes.length * 250)
      rowHeight = Math.max(rowHeight, restNodes.length > 0 ? 660 : 430)
      return
    }

    const radius = Math.max(210, component.length * 62)
    const centerX = offsetX + radius + relationNodeWidth / 2
    const centerY = offsetY + radius + relationNodeHeight / 2

    component
      .sort((firstNode, secondNode) => {
        const degreeDelta = (degree.get(secondNode.id) ?? 0) - (degree.get(firstNode.id) ?? 0)

        return degreeDelta !== 0 ? degreeDelta : firstNode.name.localeCompare(secondNode.name)
      })
      .forEach((node, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(component.length, 1)

        positions.set(node.id, centerRelationNode(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius))
      })

    offsetX += radius * 2 + relationNodeWidth + 140
    rowHeight = Math.max(rowHeight, radius * 2 + relationNodeHeight)

    if (offsetX > 1500) {
      offsetX = 120
      offsetY += rowHeight + 140
      rowHeight = 0
    }
  })

  const attachmentCounts = new Map<number, number>()
  const attachmentNodes = graphNodes.filter((node) => !positions.has(node.id))

  attachmentNodes.forEach((node, index) => {
    const positionedNeighbor = getPositionedNeighbor(node.id, graph.edges, positions)

    if (positionedNeighbor === null) {
      positions.set(node.id, centerRelationNode(120 + index * 260, offsetY + rowHeight + 220))
      return
    }

    const attachmentIndex = attachmentCounts.get(positionedNeighbor.id) ?? 0
    attachmentCounts.set(positionedNeighbor.id, attachmentIndex + 1)
    positions.set(node.id, {
      x: positionedNeighbor.position.x + relationNodeWidth + 170,
      y: positionedNeighbor.position.y + attachmentIndex * (relationNodeHeight + 28),
    })
  })

  return positions
}

const calculateRelationLayout = async (graph: RelationGraph, objects: StoryObject[]) => {
  const graphNodes = getRelationGraphNodes(graph, objects)

  if (graphNodes.length === 0) {
    return new Map<number, { x: number; y: number }>()
  }

  const smallLayout = calculateSmallRelationLayout(graph, graphNodes)

  if (smallLayout !== null) {
    return smallLayout
  }

  const elkGraph: ElkNode = {
    id: 'relations-root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'SPLINES',
      'elk.spacing.nodeNode': '90',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: graphNodes.map((node) => ({
      id: String(node.id),
      width: relationNodeWidth,
      height: relationNodeHeight,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [String(edge.sourceId)],
      targets: [String(edge.targetId)],
    })),
  }

  const layoutEngine = await getRelationLayoutEngine()
  const layout = await layoutEngine.layout(elkGraph)
  const positions = new Map<number, { x: number; y: number }>()

  layout.children?.forEach((node) => {
    positions.set(Number(node.id), {
      x: node.x ?? 0,
      y: node.y ?? 0,
    })
  })

  return positions
}

const buildRelationFlow = (
  graph: RelationGraph,
  objects: StoryObject[],
  onSelect: (storyObject: StoryObject) => void,
  layoutPositions: Map<number, { x: number; y: number }>,
  selectedEdgeId: string | null,
) => {
  const objectById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const graphNodes = getRelationGraphNodes(graph, objects)
  const degree = getRelationDegrees(graph, graphNodes)

  const centerNode = graphNodes.reduce<RelationGraphNode | null>((bestNode, node) => {
    if (bestNode === null) {
      return node
    }

    return (degree.get(node.id) ?? 0) > (degree.get(bestNode.id) ?? 0) ? node : bestNode
  }, null)
  const centerId = centerNode?.id ?? null
  const neighborIds = new Set<number>()

  if (centerId !== null) {
    graph.edges.forEach((edge) => {
      if (edge.sourceId === centerId) {
        neighborIds.add(edge.targetId)
      }
      if (edge.targetId === centerId) {
        neighborIds.add(edge.sourceId)
      }
    })
  }

  const positions = new Map<number, { x: number; y: number }>()
  if (centerNode !== null && graph.edges.length > 0) {
    positions.set(centerNode.id, { x: 520, y: 300 })
    const neighbors = graphNodes.filter((node) => neighborIds.has(node.id))
    const rest = graphNodes.filter((node) => node.id !== centerNode.id && !neighborIds.has(node.id))

    neighbors.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(neighbors.length, 1)
      positions.set(node.id, {
        x: 520 + Math.cos(angle) * 360,
        y: 300 + Math.sin(angle) * 230,
      })
    })

    rest.forEach((node, index) => {
      positions.set(node.id, {
        x: 80 + (index % 5) * 250,
        y: 650 + Math.floor(index / 5) * 150,
      })
    })
  } else {
    graphNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: 80 + (index % 4) * 260,
        y: 90 + Math.floor(index / 4) * 150,
      })
    })
  }

  const getNodePosition = (nodeId: number) => layoutPositions.get(nodeId) ?? positions.get(nodeId) ?? { x: 0, y: 0 }
  const nodes: RelationObjectFlowNode[] = graphNodes.map((node) => ({
    id: String(node.id),
    type: 'relationObject',
    position: getNodePosition(node.id),
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      storyObject: objectById.get(node.id) ?? relationGraphNodeToStoryObject(node),
      relationCount: degree.get(node.id) ?? 0,
      onSelect,
    },
  }))

  const edges: Edge[] = graph.edges.map((edge) => {
    const color = relationCategoryColors[edge.category] ?? '#334155'
    const strength = edge.strength ?? 55
    const { sourceHandle, targetHandle } = getRelationHandleIds(getNodePosition(edge.sourceId), getNodePosition(edge.targetId))
    const isSelected = selectedEdgeId === edge.id

    return {
      id: edge.id,
      source: String(edge.sourceId),
      sourceHandle,
      target: String(edge.targetId),
      targetHandle,
      type: 'straight',
      animated: (edge.tension ?? 0) >= 65,
      selected: isSelected,
      label: getRelationLabel(edge.relationType),
      markerEnd: { type: MarkerType.ArrowClosed, color },
      markerStart: edge.isBidirectional ? { type: MarkerType.ArrowClosed, color } : undefined,
      style: {
        stroke: color,
        strokeWidth: Math.max(isSelected ? 4 : 2, Math.min(isSelected ? 8 : 6, (isSelected ? 3 : 2) + strength / 28)),
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 10,
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.92,
      },
      labelStyle: {
        fill: color,
        fontSize: 12,
        fontWeight: 800,
      },
    }
  })

  return { nodes, edges }
}

const relationCategoryLabels: Record<string, string> = {
  character: 'Связь персонажей',
  object: 'Связь объектов',
  ownership: 'Владение',
}

const getRelationEndpointObject = (
  edge: RelationGraphEdge,
  graph: RelationGraph,
  objects: StoryObject[],
  endpoint: 'source' | 'target',
) => {
  const targetId = endpoint === 'source' ? edge.sourceId : edge.targetId
  const storyObject = objects.find((item) => item.id === targetId)

  if (storyObject !== undefined) {
    return storyObject
  }

  const graphNode = graph.nodes.find((node) => node.id === targetId)

  return graphNode === undefined ? null : relationGraphNodeToStoryObject(graphNode)
}

function RelationEndpointButton({
  storyObject,
  onOpen,
}: {
  storyObject: StoryObject | null
  onOpen: (storyObject: StoryObject) => void
}) {
  if (storyObject === null) {
    return <span className="sp-relation-endpoint missing">Неизвестный объект</span>
  }

  return (
    <button className="sp-relation-endpoint" type="button" onClick={() => onOpen(storyObject)}>
      <ObjectPortrait storyObject={storyObject} />
      <span>
        <strong>{getObjectFullName(storyObject)}</strong>
        <em>{storyObject.typeKey}</em>
      </span>
    </button>
  )
}

function RelationMeter({ label, value }: { label: string; value: number | null }) {
  const normalizedValue = Math.max(0, Math.min(100, value ?? 0))

  return (
    <div className="sp-relation-meter">
      <span>{label}</span>
      <div>
        <i style={{ width: `${normalizedValue}%` }} />
      </div>
      <strong>{value === null ? '-' : `${normalizedValue}%`}</strong>
    </div>
  )
}

function RelationDetail({
  edge,
  graph,
  objects,
  ui,
  onClose,
  onOpenObject,
}: {
  edge: RelationGraphEdge
  graph: RelationGraph
  objects: StoryObject[]
  ui: PreviewText
  onClose?: () => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  const sourceObject = getRelationEndpointObject(edge, graph, objects, 'source')
  const targetObject = getRelationEndpointObject(edge, graph, objects, 'target')
  const directionLabel = edge.isBidirectional ? 'Двусторонняя' : 'Односторонняя'

  return (
    <div className="sp-detail-card sp-relation-detail">
      <div className="sp-relation-detail-head">
        <div>
          <span>{relationCategoryLabels[edge.category] ?? edge.category}</span>
          <h2>{getRelationLabel(edge.relationType)}</h2>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="sp-relation-route">
        <RelationEndpointButton storyObject={sourceObject} onOpen={onOpenObject} />
        <strong>{edge.isBidirectional ? '↔' : '→'}</strong>
        <RelationEndpointButton storyObject={targetObject} onOpen={onOpenObject} />
      </div>

      <div className="sp-fields">
        <div>
          <span>Тип</span>
          <strong>{getRelationLabel(edge.relationType)}</strong>
        </div>
        <div>
          <span>Направление</span>
          <strong>{directionLabel}</strong>
        </div>
        <div>
          <span>Категория</span>
          <strong>{relationCategoryLabels[edge.category] ?? edge.category}</strong>
        </div>
      </div>

      <section className="sp-panel">
        <h3>Параметры</h3>
        <RelationMeter label="Сила связи" value={edge.strength} />
        <RelationMeter label="Напряжение" value={edge.tension} />
      </section>

      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>{edge.description?.trim() || 'Описание пока не заполнено.'}</p>
      </section>
    </div>
  )
}

function TimelineEventDetail({
  event,
  events,
  galleryImageCaption = '',
  galleryImagePath = null,
  links,
  objects,
  ui,
  onAddGalleryImage,
  onClose,
  onDelete,
  onDeleteGalleryImage,
  onEdit,
  onGalleryCaptionChange,
  onGalleryImageUpload,
  onOpenEvent,
  onOpenObject,
}: {
  event: TimelineEvent
  events: TimelineEvent[]
  galleryImageCaption?: string
  galleryImagePath?: string | null
  links: TimelineEventLink[]
  objects: StoryObject[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onClose?: () => void
  onDelete: (eventId: number) => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit: (event: TimelineEvent) => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onOpenEvent: (eventId: number) => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  const [activeTab, setActiveTab] = useState<TimelineEventDossierTab>('main')
  const eventsById = new Map(events.map((timelineEvent) => [timelineEvent.id, timelineEvent]))
  const objectsById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const parentEvent = event.parentEventId === null ? null : eventsById.get(event.parentEventId) ?? null
  const childEvents = events.filter((timelineEvent) => timelineEvent.parentEventId === event.id)
  const relatedLinks = links.filter((link) => link.sourceEventId === event.id || link.targetEventId === event.id)
  const timeLabel =
    [event.startLabel, event.endLabel].filter(Boolean).join(' - ') ||
    [event.startValue, event.endValue].filter((value) => value !== null).join(' - ') ||
    event.category ||
    'Время не указано'
  const eventColor = event.color ?? getTimelineEventColor(event.eventType)
  const eventImageUrl = resolveAssetUrl(event.imagePath)

  return (
    <article className="sp-detail-card sp-timeline-detail">
      <div className="sp-timeline-detail-head">
        {eventImageUrl === null ? (
          <div className="sp-timeline-detail-cover" style={{ background: eventColor }}>
            {event.title.slice(0, 1).toUpperCase()}
          </div>
        ) : (
          <img className="sp-timeline-detail-cover" alt="" src={eventImageUrl} />
        )}
        <div>
          <span>{getTimelineEventTypeLabel(event.eventType)}</span>
          <h2>{event.title}</h2>
          <p>{timeLabel}</p>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose}>
            x
          </button>
        )}
      </div>

      <div className="sp-fields">
        <div><span>Тип</span><strong>{getTimelineEventTypeLabel(event.eventType)}</strong></div>
        <div><span>Время</span><strong>{timeLabel}</strong></div>
        <div><span>Категория</span><strong>{event.category ?? '-'}</strong></div>
        <div>
          <span>Родитель</span>
          <strong>
            {parentEvent === null ? '-' : (
              <button className="sp-link-button" type="button" onClick={() => onOpenEvent(parentEvent.id)}>
                {parentEvent.title}
              </button>
            )}
          </strong>
        </div>
      </div>

      <section className="sp-panel">
        <div className="sp-object-editor-tabs">
          {[
            ['main', ui.main],
            ['participants', 'Участники'],
            ['links', 'Связи'],
            ['changes', 'Изменения'],
            ['gallery', ui.gallery],
          ].map(([tab, label]) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as TimelineEventDossierTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'main' && (
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>{event.description?.trim() || 'Описание пока не заполнено.'}</p>
      </section>
      )}

      {activeTab === 'participants' && (
      <section className="sp-panel">
        <h3>Участники</h3>
        {event.participants.length === 0 ? (
          <p>Участников пока нет.</p>
        ) : (
          <div className="sp-timeline-detail-list">
            {event.participants.map((participant) => {
              const participantObject =
                participant.targetType === 'storyObject' ? objectsById.get(participant.targetId) : undefined

              return participantObject === undefined ? (
                <div className="sp-row" key={participant.id}>
                  <span>{participant.targetType}</span>
                  <strong>{participant.role ?? '-'}</strong>
                </div>
              ) : (
                <button
                  className="sp-timeline-participant-card"
                  key={participant.id}
                  type="button"
                  onClick={() => onOpenObject(participantObject)}
                >
                  <ObjectPortrait storyObject={participantObject} />
                  <span>
                    <strong>{getObjectFullName(participantObject)}</strong>
                    <em>{participant.role ?? participantObject.typeKey}</em>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'links' && (
      <section className="sp-panel">
        <h3>Связанные события</h3>
        {relatedLinks.length === 0 && childEvents.length === 0 ? (
          <p>Связей пока нет.</p>
        ) : (
          <div className="sp-timeline-detail-list">
            {parentEvent !== null && (
              <div className="sp-row">
                <span>Часть события</span>
                <strong>
                  <button className="sp-link-button" type="button" onClick={() => onOpenEvent(parentEvent.id)}>
                    {parentEvent.title}
                  </button>
                </strong>
              </div>
            )}
            {childEvents.map((childEvent) => (
              <div className="sp-row" key={`child-${childEvent.id}`}>
                <span>Внутри события</span>
                <strong>
                  <button className="sp-link-button" type="button" onClick={() => onOpenEvent(childEvent.id)}>
                    {childEvent.title}
                  </button>
                </strong>
              </div>
            ))}
            {relatedLinks.map((link) => {
              const otherEventId = link.sourceEventId === event.id ? link.targetEventId : link.sourceEventId
              const otherEvent = eventsById.get(otherEventId)

              if (otherEvent === undefined) {
                return null
              }

              return (
                <div className="sp-row" key={link.id}>
                  <span>{getTimelineLinkTypeLabel(link.linkType)}</span>
                  <strong>
                    <button className="sp-link-button" type="button" onClick={() => onOpenEvent(otherEvent.id)}>
                      {otherEvent.title}
                    </button>
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'changes' && (
      <section className="sp-panel">
        <h3>Изменения</h3>
        {event.changes.length === 0 ? (
          <p>Изменений пока нет.</p>
        ) : (
          <div className="sp-timeline-changes">
            {event.changes.map((change) => {
              const changedObject =
                change.targetType === 'storyObject' ? objectsById.get(change.targetId) : undefined

              return (
                <div className="sp-timeline-change-row" key={change.id}>
                  <span>
                    {changedObject === undefined ? change.targetType : getObjectFullName(changedObject)} ·{' '}
                    {change.fieldName ?? change.fieldKey ?? change.changeType}
                  </span>
                  <strong>
                    {formatTimelineChangeValue(change.oldValueJson)} → {formatTimelineChangeValue(change.newValueJson)}
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'gallery' && (
        <section className="sp-panel">
          <h3>{ui.gallery}</h3>
          {onGalleryImageUpload !== undefined && (
            <div className="sp-timeline-gallery-upload">
              <CoverDropzone
                imagePath={galleryImagePath}
                label="Новое изображение"
                onFileSelected={(file) => onGalleryImageUpload(file)}
              />
              <div className="sp-editor-row">
                <input
                  placeholder="Подпись"
                  value={galleryImageCaption}
                  onChange={(inputEvent) => onGalleryCaptionChange?.(inputEvent.target.value)}
                />
                <button disabled={galleryImagePath === null} type="button" onClick={onAddGalleryImage}>
                  Добавить
                </button>
              </div>
            </div>
          )}
          {event.galleryImages.length === 0 ? (
            <p>В галерее пока нет изображений.</p>
          ) : (
            <div className="sp-gallery-grid">
              {event.galleryImages.map((image) => (
                <article className="sp-gallery-card" key={image.id}>
                  <img alt="" src={resolveAssetUrl(image.imagePath) ?? undefined} />
                  <span>{image.caption ?? '-'}</span>
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

      <div className="sp-detail-actions">
        <button className="sp-button" type="button" onClick={() => onEdit(event)}>
          {ui.edit}
        </button>
        <button className="sp-button danger" type="button" onClick={() => onDelete(event.id)}>
          {ui.delete}
        </button>
      </div>
    </article>
  )
}

function RelationsPage({
  graph,
  isLayoutGenerating,
  layout,
  objects,
  selectedEdgeId,
  ui,
  onGenerateLayout,
  onSaveNodePosition,
  onSelectEdge,
  onSelect,
}: {
  graph: RelationGraph
  isLayoutGenerating: boolean
  layout: RelationGraphLayout | null
  objects: StoryObject[]
  selectedEdgeId: string | null
  ui: PreviewText
  onGenerateLayout: () => void
  onSaveNodePosition: (storyObjectId: number, position: { x: number; y: number }) => void
  onSelectEdge: (edgeId: string) => void
  onSelect: (storyObject: StoryObject) => void
}) {
  const layoutPositions = useMemo(
    () =>
      new Map(
        layout?.items.map((item) => [
          item.storyObjectId,
          {
            x: item.x,
            y: item.y,
          },
        ]) ?? [],
      ),
    [layout],
  )
  const { nodes, edges } = useMemo(
    () => buildRelationFlow(graph, objects, onSelect, layoutPositions, selectedEdgeId),
    [graph, layoutPositions, objects, onSelect, selectedEdgeId],
  )
  const [flowNodes, setFlowNodes] = useState(nodes)
  const relationTypes = Array.from(new Set(graph.edges.map((edge) => getRelationLabel(edge.relationType)))).sort()
  const layoutStatus =
    layout === null
      ? 'раскладка не сформирована'
      : layout.isStale
        ? 'раскладка устарела'
        : 'раскладка сохранена'
  const layoutButtonLabel = layout === null ? 'Сформировать' : layout.isStale ? 'Обновить раскладку' : 'Сформировать заново'
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as RelationObjectFlowNode[]),
    [],
  )

  useEffect(() => {
    setFlowNodes(nodes)
  }, [nodes])

  return (
    <div className="sp-relations-page">
      <div className="sp-relations-overlay-head">
        <div>
          <h2>{ui.relations}</h2>
          <p>
            {graph.nodes.length} объектов · {graph.edges.length} связей · {layoutStatus}
          </p>
        </div>
        <div className="sp-relations-overlay-actions">
          <button
            className="sp-button"
            type="button"
            disabled={isLayoutGenerating || graph.nodes.length === 0}
            onClick={onGenerateLayout}
          >
            {isLayoutGenerating ? 'Формируется...' : layoutButtonLabel}
          </button>
        </div>
      </div>
      <div className="sp-relations-workspace">
        <aside className="sp-relations-legend">
          <strong>{ui.relations}</strong>
          <span className="sp-legend-line character">Персонажи</span>
          <span className="sp-legend-line ownership">Владение</span>
          <span className="sp-legend-line object">Объекты</span>
          <p>Нажми на узел, чтобы открыть досье. Узлы можно перетаскивать вручную.</p>
          {relationTypes.length > 0 && (
            <div className="sp-relation-types">
              {relationTypes.map((relationType) => (
                <span key={relationType}>{relationType}</span>
              ))}
            </div>
          )}
        </aside>
        <div className="sp-graph">
          {flowNodes.length === 0 ? (
            <div className="sp-empty">
              <strong>{ui.noObjects}</strong>
              <span>{ui.noRelationships}</span>
            </div>
          ) : (
            <ReactFlow
              edges={edges}
              fitView
              maxZoom={1.6}
              minZoom={0.2}
              nodes={flowNodes}
              nodeTypes={relationNodeTypes}
              onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
              onNodeDragStop={(_, node) => onSaveNodePosition(Number(node.id), node.position)}
              onNodesChange={onNodesChange}
            >
              <Background gap={32} variant={BackgroundVariant.Lines} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  )
}

function TimelinePage({
  events,
  isGenerating,
  layout,
  layoutRules,
  links,
  selectedEvent,
  timeline,
  ui,
  onCreate,
  onCreateLink,
  onDeleteLink,
  onGenerate,
  onSelectEvent,
}: {
  events: TimelineEvent[]
  isGenerating: boolean
  layout: TimelineLayout | null
  layoutRules: TimelineLayoutRules | null
  links: TimelineEventLink[]
  selectedEvent: TimelineEvent | null
  timeline: TimelineInfo | null
  ui: PreviewText
  onCreate: () => void
  onCreateLink: () => void
  onDeleteLink: (linkId: number) => void
  onGenerate: () => void
  onSelectEvent: (eventId: number) => void
}) {
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineZoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null)
  const [timelineTransform, setTimelineTransform] = useState<ZoomTransform>(zoomIdentity)
  const [isTimelinePanning, setIsTimelinePanning] = useState(false)
  const [isLinksPopoverOpen, setIsLinksPopoverOpen] = useState(false)
  const timelineZoom = timelineTransform.k
  const layoutItemsByEventId = useMemo(
    () => new Map(layout?.items.map((item) => [item.timelineEventId, item]) ?? []),
    [layout],
  )
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events])
  const eventIndexesById = useMemo(
    () => new Map(events.map((event, index) => [event.id, index])),
    [events],
  )
  const layoutItems = layout?.items ?? []
  const timelineWidth = Math.max(
    1600,
    ...layoutItems.map((item) => item.x + item.width + 640),
  )
  const timelineHeight = Math.max(
    760,
    ...layoutItems.map((item) => item.y + item.height + 120),
  )
  const numericValues = events
    .flatMap((event) => [event.startValue, event.endValue])
    .filter((value): value is number => typeof value === 'number')
  const timelineDomainValues = numericValues.length === 0 ? [0, Math.max(events.length, 1)] : [...numericValues, 0]
  const minValue = Math.min(...timelineDomainValues)
  const maxValue = Math.max(...timelineDomainValues, minValue + 1)
  const baseTimeScale = useMemo(
    () => scaleLinear().domain([minValue, maxValue]).range([96, 1056]),
    [maxValue, minValue],
  )
  const timelineTimeScale = useMemo(
    () => timelineTransform.rescaleX(baseTimeScale),
    [baseTimeScale, timelineTransform],
  )
  const axisTicks = buildTimelineAxisTicks(timelineTimeScale, timelineWidth, timelineZoom)
  const storyStartX = timelineTimeScale(0)
  const renderedLayoutItemsByEventId = useMemo(() => {
    if (layout === null) {
      return new Map<number, TimelineLayoutItem>()
    }

    return new Map(
      events.flatMap((event) => {
        const item = layoutItemsByEventId.get(event.id)
        if (item === undefined) {
          return []
        }

        const index = eventIndexesById.get(event.id) ?? 0
        const startValue = getTimelineEventStartValue(event, index)
        const endValue = getTimelineEventEndValue(event, index)
        const startX = timelineTimeScale(startValue)
        const endX = timelineTimeScale(endValue)
        const width =
          event.eventType === 'point' || event.eventType === 'chapter'
            ? item.width
            : Math.max(item.width, Math.abs(endX - startX))
        const x = event.eventType === 'point'
          ? startX - item.width / 2
          : Math.min(startX, endX)

        return [[
          event.id,
          {
            ...item,
            x,
            width,
          },
        ]]
      }),
    )
  }, [eventIndexesById, events, layout, layoutItemsByEventId, timelineTimeScale])
  const eventCounts = {
    era: events.filter((event) => event.eventType === 'era').length,
    duration: events.filter((event) => event.eventType === 'duration').length,
    point: events.filter((event) => event.eventType === 'point').length,
    chapter: events.filter((event) => event.eventType === 'chapter').length,
  }
  const linkLines =
    layout === null
      ? []
      : links
          .map((link) => {
            const source = renderedLayoutItemsByEventId.get(link.sourceEventId)
            const target = renderedLayoutItemsByEventId.get(link.targetEventId)
            const sourceEvent = eventsById.get(link.sourceEventId)
            const targetEvent = eventsById.get(link.targetEventId)
            if (source === undefined || target === undefined) {
              return null
            }
            if (link.linkType === 'partOf') {
              return null
            }
            const sourceAnchor = getTimelineAnchor(source, sourceEvent?.eventType, target)
            const targetAnchor = getTimelineAnchor(target, targetEvent?.eventType, source)
            const path = getTimelineLinkRoute(sourceAnchor, targetAnchor)

            return {
              link,
              path,
            }
          })
          .filter((line): line is NonNullable<typeof line> => line !== null)
  useEffect(() => {
    const viewport = timelineViewportRef.current
    if (viewport === null) {
      return undefined
    }

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.25, 48])
      .filter((event) => {
        if (event.type === 'dblclick') {
          return false
        }

        if (event.type === 'wheel') {
          return true
        }

        return !(event.target instanceof Element &&
          event.target.closest('.sp-timeline-item, button, a, input, select, textarea') !== null)
      })
      .on('start', () => setIsTimelinePanning(true))
      .on('zoom', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        setTimelineTransform(event.transform)
      })
      .on('end', () => setIsTimelinePanning(false))

    timelineZoomBehaviorRef.current = behavior
    select(viewport).call(behavior).on('dblclick.zoom', null)

    return () => {
      select(viewport).on('.zoom', null)
      timelineZoomBehaviorRef.current = null
    }
  }, [])
  const zoomTimeline = useCallback((nextZoom: number) => {
    const viewport = timelineViewportRef.current
    const behavior = timelineZoomBehaviorRef.current
    if (viewport === null || behavior === null) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const clampedZoom = Math.min(48, Math.max(0.25, nextZoom))
    behavior.scaleTo(select(viewport), clampedZoom, [rect.width / 2, rect.height / 2])
  }, [])
  const resetTimelineViewport = useCallback(() => {
    const viewport = timelineViewportRef.current
    const behavior = timelineZoomBehaviorRef.current
    if (viewport === null || behavior === null) {
      return
    }

    behavior.transform(select(viewport), zoomIdentity)
  }, [])
  const modeLabel =
    timeline?.mode === 'dated'
      ? 'Шкала с датами'
      : timeline?.mode === 'freeform'
        ? 'Свободный порядок'
        : 'Главы / сюжетная структура'
  const layoutButtonLabel = layout === null ? 'Сформировать' : layout.isStale ? 'Обновить раскладку' : 'Сформировать заново'
  const layoutSourceStatus = layoutRules?.coordinateStorage === 'project-file'
    ? `file: ${layoutRules.layoutStateFile}`
    : 'layout rules loading'
  const timelineStatus = layout === null
    ? 'раскладка не сформирована'
    : layout.isStale
      ? 'раскладка устарела'
      : 'раскладка сохранена'

  return (
    <div className="sp-timeline-page">
      <div className="sp-timeline-overlay-head">
        <div>
          <h2>{ui.timeline}</h2>
          <p>
            {modeLabel} · {events.length} событий · {timelineStatus}
          </p>
          <div className="sp-timeline-type-summary">
            <span className="era">Эпохи: {eventCounts.era}</span>
            <span className="duration">Ленты: {eventCounts.duration}</span>
            <span className="point">Точки: {eventCounts.point}</span>
            <span className="chapter">Главы: {eventCounts.chapter}</span>
            <span className="layout-source">{layoutSourceStatus}</span>
          </div>
        </div>
      </div>
      <div className="sp-timeline-overlay-actions">
          <button className="sp-button" type="button" disabled={isGenerating} onClick={onGenerate}>
            {isGenerating ? 'Формируется...' : layoutButtonLabel}
          </button>
          <button
            className="sp-button"
            type="button"
            aria-expanded={isLinksPopoverOpen}
            onClick={() => setIsLinksPopoverOpen((value) => !value)}
          >
            Связи событий
            <span className="sp-button-count">{links.length}</span>
          </button>
          <button className="sp-button" type="button" disabled={events.length < 2} onClick={onCreateLink}>
            Связать события
          </button>
          <button className="sp-button primary" type="button" onClick={onCreate}>
            {ui.newEvent}
          </button>
      </div>
      {isLinksPopoverOpen && (
        <div className="sp-timeline-links-popover">
          <div className="sp-timeline-links-popover-head">
            <div>
              <strong>Связи событий</strong>
              <span>{links.length} связей</span>
            </div>
            <button className="sp-icon-button" type="button" onClick={() => setIsLinksPopoverOpen(false)}>
              x
            </button>
          </div>
          {links.length > 0 ? (
            <div className="sp-timeline-links-list">
              {links.map((link) => (
                <div className="sp-timeline-link-row" key={link.id}>
                  <span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinksPopoverOpen(false)
                        onSelectEvent(link.sourceEventId)
                      }}
                    >
                      {eventsById.get(link.sourceEventId)?.title ?? 'Событие'}
                    </button>
                    {' → '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinksPopoverOpen(false)
                        onSelectEvent(link.targetEventId)
                      }}
                    >
                      {eventsById.get(link.targetEventId)?.title ?? 'Событие'}
                    </button>
                  </span>
                  <em>{getTimelineLinkTypeLabel(link.linkType)}</em>
                  <button className="sp-icon-button" type="button" onClick={() => onDeleteLink(link.id)}>
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="sp-empty compact">
              Связей пока нет.
            </div>
          )}
        </div>
      )}
      <div className="sp-timeline">
        <div className="sp-timeline-tools">
          <button type="button" onClick={() => zoomTimeline(timelineZoom / 1.18)} title="Уменьшить">
            -
          </button>
          <strong>{Math.round(timelineZoom * 100)}%</strong>
          <button type="button" onClick={() => zoomTimeline(timelineZoom * 1.18)} title="Увеличить">
            +
          </button>
          <button type="button" onClick={resetTimelineViewport} title="Сбросить масштаб">
            1:1
          </button>
        </div>
        <div
          className={`sp-timeline-viewport${isTimelinePanning ? ' is-panning' : ''}`}
          ref={timelineViewportRef}
        >
          <div
            className="sp-timeline-scale-frame"
            style={{ height: `${timelineHeight}px`, width: `${timelineWidth}px` }}
          >
        <div
          className={`sp-axis${layout === null ? ' is-unformed' : ''}`}
          style={{
            height: `${timelineHeight}px`,
            transform: `translateY(${timelineTransform.y}px)`,
            width: `${timelineWidth}px`,
          }}
        >
          {layout !== null && (
            <div className="sp-timeline-ticks">
              {axisTicks.map((tick) => (
                <span
                  className={tick.kind}
                  key={`${tick.kind}-${tick.value}`}
                  style={{ left: `${tick.x}px` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          )}
          {layout !== null && (
            <div className="sp-timeline-origin" style={{ left: `${storyStartX}px` }}>
              <span>Начало истории</span>
            </div>
          )}
          {linkLines.length > 0 && (
            <svg
              className="sp-timeline-link-lines"
              aria-hidden="true"
              height={timelineHeight}
              width={timelineWidth}
            >
              {linkLines.map(({ link, path }) => (
                <g className={`sp-timeline-link-line ${link.linkType}`} key={link.id}>
                  <path d={path} vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </svg>
          )}
          {layout !== null &&
            events.map((event) => {
              const item = renderedLayoutItemsByEventId.get(event.id)
              if (item === undefined) {
                return null
              }
              const timeLabel = [event.startLabel, event.endLabel].filter(Boolean).join(' - ') ||
                event.category ||
                getTimelineEventTypeLabel(event.eventType)
              const eventZIndex =
                event.eventType === 'point'
                  ? 70 + item.layer
                  : event.eventType === 'duration'
                    ? 20 + item.layer
                    : event.eventType === 'chapter'
                      ? 8 + item.layer
                      : 4 + item.layer
              const eventStyle = {
                '--event-color': event.color ?? getTimelineEventColor(event.eventType),
                height: event.eventType === 'era' ? `${timelineHeight}px` : `${item.height}px`,
                left: `${item.x}px`,
                top: event.eventType === 'era' ? '0px' : `${item.y}px`,
                width: `${item.width}px`,
                zIndex: eventZIndex,
              } as CSSProperties

              return (
                <article
                  className={`sp-timeline-item ${event.eventType}${selectedEvent?.id === event.id ? ' is-selected' : ''}`}
                  key={event.id}
                  onClick={event.eventType === 'era' ? undefined : () => onSelectEvent(event.id)}
                  style={eventStyle}
                >
                  {event.eventType === 'chapter' ? (
                    <span className="sp-timeline-chapter-label">
                      <strong>{event.title}</strong>
                      <em>{timeLabel}</em>
                    </span>
                  ) : event.eventType === 'point' ? (
                    null
                  ) : (
                    <>
                      <i className="sp-timeline-item-marker" />
                      <strong>{event.title}</strong>
                      {event.eventType !== 'duration' && <span>{timeLabel}</span>}
                      {event.description !== null &&
                        event.description.trim().length > 0 &&
                        event.eventType !== 'era' &&
                        event.eventType !== 'duration' && (
                        <em>{event.description}</em>
                      )}
                    </>
                  )}
                </article>
              )
            })}
          {layout === null && events.slice(0, 8).map((event, index) => (
            <div className="sp-timepoint" key={event.id} style={{ left: `${8 + index * 12}%` }}>
              <i />
              <article
                className={`${index % 2 === 0 ? 'top' : 'bottom'}${selectedEvent?.id === event.id ? ' is-selected' : ''}`}
                onClick={() => onSelectEvent(event.id)}
              >
                <strong>{event.title}</strong>
                <span>{event.startLabel ?? event.category ?? 'Событие'}</span>
              </article>
            </div>
          ))}
          {events.length === 0 && (
            <div className="sp-empty sp-timeline-empty">
              <strong>Событий пока нет</strong>
              <span>Создай событие или загрузи демонстрационный набор.</span>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimelineAnchor(
  item: TimelineLayoutItem,
  eventType: TimelineEvent['eventType'] | undefined,
  otherItem: TimelineLayoutItem,
) {
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2

  if (eventType === 'point') {
    return { x: centerX, y: centerY }
  }

  const otherCenterX = otherItem.x + otherItem.width / 2
  const anchorY = eventType === 'duration'
    ? item.y + TIMELINE_DURATION_TITLE_HEIGHT + TIMELINE_DURATION_POINT_BAND_HEIGHT / 2
    : centerY

  return {
    x: otherCenterX >= centerX ? item.x + item.width : item.x,
    y: anchorY,
  }
}

function getTimelineLinkRoute(source: { x: number; y: number }, target: { x: number; y: number }) {
  if (Math.abs(source.x - target.x) < 1 || Math.abs(source.y - target.y) < 1) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
  }

  const elbowX = target.x

  return `M ${source.x} ${source.y} L ${elbowX} ${source.y} L ${target.x} ${target.y}`
}

function getTimelineEventStartValue(event: TimelineEvent, index: number) {
  return event.startValue ?? index
}

function getTimelineEventEndValue(event: TimelineEvent, index: number) {
  const startValue = getTimelineEventStartValue(event, index)
  if (event.endValue === null || event.endValue < startValue) {
    return startValue
  }

  return event.endValue
}

function getTimelineEventTypeLabel(eventType: TimelineEvent['eventType']) {
  if (eventType === 'duration') {
    return 'Длительное событие'
  }

  if (eventType === 'era') {
    return 'Эпоха'
  }

  if (eventType === 'chapter') {
    return 'Глава'
  }

  return 'Событие'
}

function getTimelineEventColor(eventType: TimelineEvent['eventType']) {
  if (eventType === 'duration') {
    return '#2563eb'
  }

  if (eventType === 'era') {
    return '#64748b'
  }

  if (eventType === 'chapter') {
    return '#7c3aed'
  }

  return '#059669'
}

function formatTimelineTickLabel(value: number) {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value))
  }

  return value.toFixed(1).replace(/\.0$/, '')
}

function buildTimelineAxisTicks(timeScale: ScaleLinear<number, number>, canvasWidth: number, zoom: number) {
  const visibleStart = timeScale.invert(0)
  const visibleEnd = timeScale.invert(canvasWidth)
  const minValue = Math.min(visibleStart, visibleEnd)
  const maxValue = Math.max(visibleStart, visibleEnd)
  const pixelsPerValue = Math.abs(timeScale(1) - timeScale(0))
  const majorStep = getNiceTimelineStep(120 / Math.max(pixelsPerValue, 0.001))
  const minorCandidates = [5, 4, 2].map((division) => ({
    division,
    step: majorStep / division,
  }))
  const minorStep = zoom > 0.7
    ? minorCandidates.find((candidate) => candidate.step * pixelsPerValue >= 22)?.step ?? majorStep
    : majorStep
  const precision = Math.max(0, Math.ceil(-Math.log10(minorStep)) + 2)
  const firstValue = Math.ceil(minValue / minorStep) * minorStep
  const ticks: Array<{ kind: 'major' | 'minor'; label: string; value: number; x: number }> = []

  for (let value = firstValue; value <= maxValue + minorStep * 0.5; value += minorStep) {
    const normalizedValue = Number(value.toFixed(precision))
    if (normalizedValue < minValue - minorStep * 0.25 || normalizedValue > maxValue + minorStep * 0.25) {
      continue
    }

    const majorRatio = Math.abs(normalizedValue / majorStep - Math.round(normalizedValue / majorStep))
    const isMajor = majorRatio < 0.001 || Math.abs(normalizedValue - minValue) < minorStep * 0.25
    ticks.push({
      kind: isMajor ? 'major' : 'minor',
      label: isMajor ? formatTimelineTickLabel(normalizedValue) : '',
      value: normalizedValue,
      x: timeScale(normalizedValue),
    })
  }

  return ticks
}

function getNiceTimelineStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10

  return niceNormalized * magnitude
}

function getTimelineLinkTypeLabel(linkType: TimelineEventLink['linkType']) {
  if (linkType === 'precedes') {
    return 'предшествует'
  }

  if (linkType === 'causes') {
    return 'причина'
  }

  if (linkType === 'simultaneous') {
    return 'одновременно'
  }

  if (linkType === 'partOf') {
    return 'часть события'
  }

  return 'связано'
}

function formatTimelineChangeValue(value: string | null) {
  if (value === null || value.trim().length === 0) {
    return '-'
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (Array.isArray(parsedValue)) {
      return parsedValue.length === 0 ? '[]' : `${parsedValue.length} записей`
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
      return JSON.stringify(parsedValue)
    }
  } catch {
    // Timeline changes can store either plain text or JSON snapshots.
  }

  return value
}

function readTimelineChangeRawValue(value: string | null) {
  if (value === null || value.trim().length === 0) {
    return ''
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (typeof parsedValue === 'string') {
      return parsedValue
    }

    if (parsedValue === null) {
      return ''
    }

    return JSON.stringify(parsedValue)
  } catch {
    return value
  }
}

function getTimelineChangeFieldKey(change: TimelineChange) {
  return (change.fieldName ?? change.fieldKey ?? '').trim().toLowerCase()
}

function getLatestObjectTimelineChange(changes: TimelineChange[], changeType: string, fieldName: string) {
  const normalizedFieldName = fieldName.trim().toLowerCase()

  return [...changes]
    .reverse()
    .find((change) => change.changeType === changeType && getTimelineChangeFieldKey(change) === normalizedFieldName)
}

function getChangedNullableField(changes: TimelineChange[], fieldName: string, fallback: string | null) {
  const change = getLatestObjectTimelineChange(changes, 'field', fieldName)

  if (change === undefined) {
    return fallback
  }

  const value = readTimelineChangeRawValue(change.newValueJson).trim()

  return value.length === 0 ? null : value
}

function applyTimelineChangesToObject(storyObject: StoryObject, changes: TimelineChange[]): StoryObject {
  if (changes.length === 0) {
    return storyObject
  }

  const displayAttributes = [...storyObject.attributes]

  changes
    .filter((change) => change.changeType === 'attribute')
    .forEach((change, index) => {
      const attributeName = (change.fieldName ?? change.fieldKey ?? '').trim()

      if (attributeName.length === 0) {
        return
      }

      const value = readTimelineChangeRawValue(change.newValueJson).trim()
      const attributeIndex = displayAttributes.findIndex(
        (attribute) => attribute.name.trim().toLowerCase() === attributeName.toLowerCase(),
      )

      if (attributeIndex >= 0) {
        displayAttributes[attributeIndex] = {
          ...displayAttributes[attributeIndex],
          value: value.length === 0 ? null : value,
        }
        return
      }

      displayAttributes.push({
        id: -100000 - index,
        attributeDefinitionId: 0,
        name: attributeName,
        value: value.length === 0 ? null : value,
      })
    })

  return {
    ...storyObject,
    name: getChangedNullableField(changes, 'name', storyObject.name) ?? storyObject.name,
    surname: getChangedNullableField(changes, 'surname', storyObject.surname),
    description: getChangedNullableField(changes, 'description', storyObject.description),
    age: getChangedNullableField(changes, 'age', storyObject.age),
    role: getChangedNullableField(changes, 'role', storyObject.role),
    imagePath: getChangedNullableField(changes, 'imagePath', storyObject.imagePath),
    attributes: displayAttributes,
  }
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


