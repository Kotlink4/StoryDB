import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, EdgeMouseHandler, Node, NodeMouseHandler } from '@xyflow/react'
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
  createTimelineEventRequest,
  addObjectGalleryImageRequest,
  deleteAttributeGroupRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogEntryRequest,
  deleteCatalogFieldDefinitionRequest,
  deleteCatalogRequest,
  deleteHierarchyGroupRequest,
  deleteHierarchyNodeRequest,
  deleteObjectGalleryImageRequest,
  deleteTimelineEventRequest,
  createObjectRequest,
  createProjectRequest,
  deleteAttributeDefinitionRequest,
  deleteObjectRequest,
  deleteProjectRequest,
  fetchCurrentUser,
  fetchAttributeDefinitions,
  fetchAttributeGroups,
  fetchCatalogEntries,
  fetchCatalogEntryGroups,
  fetchCatalogFieldDefinitions,
  fetchCatalogs,
  fetchObjects,
  fetchHierarchyGroups,
  fetchHierarchyNodes,
  fetchProjects,
  fetchTimelineEvents,
  loginRequest,
  logoutRequest,
  registerRequest,
  updateObjectRequest,
  updateObjectGalleryImageRequest,
  updateCatalogEntryGroupRequest,
  updateCatalogEntryRequest,
  updateCatalogRequest,
  updateCatalogFieldDefinitionRequest,
  updateHierarchyGroupRequest,
  updateHierarchyNodeRequest,
  updateTimelineEventRequest,
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
  AuthUser,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogHierarchyMode,
  CatalogPanelPage,
  CharacterRelationship,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  Dialog,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
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
  TimelineChange,
  TimelineEvent,
  TimelineChangeType,
  TimelineEventDraft,
  WorkspaceSection,
  WorkspaceTab,
} from './types'
import { AttributeDefinitionsPanel } from './components/AttributeDefinitionsPanel'
import { CatalogPanel } from './components/CatalogPanel'
import { CatalogSidebarSection } from './components/CatalogSidebarSection'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { HierarchyPanel } from './components/HierarchyPanel'
import { ImageDropzone } from './components/ImageDropzone'
import { ObjectCard } from './components/ObjectCard'
import { ProjectCard } from './components/ProjectCard'
import { ReadySolutionsPanel } from './components/ReadySolutionsPanel'
import { StylePreview } from './StylePreview'
import { validateProjectDraft } from './validation'
import '@xyflow/react/dist/style.css'
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
    databaseModules: 'Ready solutions',
    readySolutions: 'Ready solutions',
    readySolutionsHint: 'Choose prepared catalogs and characteristic groups to add to this project.',
    presetKindAttributes: 'Characteristics',
    presetKindCatalogs: 'Catalogs',
    presetCharacterBasics: 'Character basics',
    presetCharacterBasicsDescription: 'Origin, race, status, and short dossier fields for characters.',
    presetBodyAttributes: 'Body',
    presetBodyAttributesDescription: 'Height, weight, build, eyes, hair, and similar character details.',
    presetWorldCatalogs: 'World reference',
    presetWorldCatalogsDescription: 'Races, cultures, factions, locations, and artifacts catalogs.',
    presetMagicSkillsCatalogs: 'Magic and skills',
    presetMagicSkillsCatalogsDescription: 'Catalogs for magic schools, spells, skills, and abilities.',
    projects: 'Projects',
    settings: 'Settings',
    auth: 'Account',
    logout: 'Sign out',
    backToProjects: 'Projects',
    back: 'Back',
    characters: 'Characters',
    items: 'Items',
    places: 'Places',
    organizations: 'Organizations',
    catalogs: 'Catalogs',
    catalogValues: 'Catalog values',
    ownedItems: 'Owned items',
    itemOwners: 'Owners',
    territoryPlaces: 'Territories',
    organizationsOnTerritory: 'Organizations on this territory',
    ownerOrganizations: 'Owner organizations',
    ownedTerritories: 'Owned territories',
    objectHierarchyParents: 'Hierarchy parents',
    objectHierarchyChildren: 'Hierarchy children',
    objectRelations: 'Object relations',
    characterRelationships: 'Character relationships',
    addCharacterRelationship: 'Add relationship',
    relatedCharacter: 'Character',
    relationshipType: 'Relationship type',
    relationshipTypePlaceholder: 'Ally, conflict, family...',
    relationshipStrength: 'Strength',
    relationshipTension: 'Tension',
    relationshipMutual: 'Mutual',
    relationshipDescription: 'Relationship notes',
    noCharacterRelationships: 'No character relationships yet',
    relationGraphEmpty: 'Add character relationships to see the graph.',
    relationGraphHint: 'Click a connection to inspect it.',
    mainTab: 'Main',
    linksTab: 'Relations',
    timelineTab: 'Timeline',
    galleryTab: 'Gallery',
    galleryEmpty: 'No gallery images yet.',
    addGalleryImage: 'Add image',
    galleryImageCaption: 'Caption',
    galleryCaptionPlaceholder: 'Short note for this image',
    timelineEmpty: 'Timeline will collect scenes and events later.',
    timelineEvents: 'Timeline events',
    newTimelineEvent: 'New event',
    editTimelineEvent: 'Edit event',
    eventTitle: 'Event title',
    eventTitlePlaceholder: 'Name the event',
    eventStartLabel: 'Start label',
    eventEndLabel: 'End label',
    eventStartValue: 'Start value',
    eventEndValue: 'End value',
    eventCategory: 'Category',
    eventColor: 'Color',
    eventPeriod: 'Period',
    noTimelineEvents: 'No timeline events yet',
    eventParticipants: 'Participants',
    addEventParticipant: 'Add participant',
    participantRole: 'Role in event',
    eventChanges: 'Changes',
    addEventChange: 'Add change',
    changeFieldName: 'What changed',
    changeType: 'Change type',
    oldValue: 'Before',
    newValue: 'After',
    changeNotes: 'Notes',
    changeTypeField: 'Field',
    changeTypeAttribute: 'Attribute',
    changeTypeRelationship: 'Relationship',
    changeTypeOwnership: 'Ownership',
    changeTypeCatalogSelection: 'Catalog value',
    changeTypeHierarchySelection: 'Hierarchy',
    changeTypeLocation: 'Location',
    changeTypeStatus: 'Status',
    changeTypeCustom: 'Other',
    timelineFieldChanges: 'Field and attribute changes',
    timelineRelationChanges: 'Relation changes',
    timelineCatalogChanges: 'Catalog and hierarchy changes',
    timelineOtherChanges: 'Other changes',
    timelineContext: 'Timeline context',
    currentData: 'Current data',
    saveAsTimelineChange: 'Save as timeline change',
    saveAsTimelineChangeHint: 'When enabled, object fields are written to the selected event instead of replacing the current object.',
    timelineEventForChanges: 'Event for changes',
    objectTimelineEvents: 'Object timeline',
    noObjectTimelineEvents: 'This object is not attached to timeline events yet.',
    attachObjectToEvent: 'Attach to event',
    addCatalogValue: 'Add catalog value',
    catalogValueType: 'Value type',
    newCatalog: 'New catalog',
    catalogName: 'Catalog name',
    catalogDescription: 'Catalog description',
    supportsHierarchy: 'Supports hierarchy',
    catalogHierarchyMode: 'Hierarchy mode',
    catalogHierarchyEntries: 'Catalog entries',
    catalogHierarchyEntriesInGroup: 'Entries inside group',
    catalogHierarchyGroups: 'Groups',
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
    objectName: 'Name',
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
    authSubtitle: 'Sign in to keep projects under your account.',
    signInPlaceholder: 'Sign in',
    registerTitle: 'Create account',
    authEmail: 'Email',
    authPassword: 'Password',
    authDisplayName: 'Display name',
    authEmailPlaceholder: 'you@example.com',
    authPasswordPlaceholder: 'At least 6 characters',
    authDisplayNamePlaceholder: 'How to show your name',
    signInAction: 'Sign in',
    registerAction: 'Create account',
    switchToRegister: 'Create a new account',
    switchToLogin: 'I already have an account',
    notSignedIn: 'Sign in to open your projects.',
    authFailed: 'Could not sign in. Check the data and try again.',
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
    deleteTimelineEventTitle: 'Delete timeline event',
    deleteProjectConfirm: 'Delete this project and all its data?',
    deleteObjectConfirm: 'Delete this object?',
    deleteCatalogConfirm: 'Delete this catalog and all entries inside it?',
    deleteCatalogGroupConfirm: 'Delete this group? Entries from it will stay in the catalog.',
    deleteCatalogEntryConfirm: 'Delete this catalog entry?',
    deleteTimelineEventConfirm: 'Delete this timeline event?',
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
    databaseModules: 'Готовые решения',
    readySolutions: 'Готовые решения',
    readySolutionsHint: 'Выбери готовые справочники и группы характеристик, которые нужно добавить в проект.',
    presetKindAttributes: 'Характеристики',
    presetKindCatalogs: 'Справочники',
    presetCharacterBasics: 'Основы персонажа',
    presetCharacterBasicsDescription: 'Происхождение, раса, статус и короткие поля для досье персонажей.',
    presetBodyAttributes: 'Тело',
    presetBodyAttributesDescription: 'Рост, вес, телосложение, глаза, волосы и похожие детали персонажа.',
    presetWorldCatalogs: 'Справочник мира',
    presetWorldCatalogsDescription: 'Справочники рас, культур, фракций, локаций и артефактов.',
    presetMagicSkillsCatalogs: 'Магия и навыки',
    presetMagicSkillsCatalogsDescription: 'Справочники школ магии, заклинаний, навыков и способностей.',
    projects: 'Проекты',
    settings: 'Настройки',
    auth: 'Аккаунт',
    logout: 'Выйти',
    backToProjects: 'Проекты',
    back: 'Назад',
    characters: 'Персонажи',
    items: 'Предметы',
    places: 'Места',
    organizations: 'Организации',
    catalogs: 'Каталоги',
    catalogValues: 'Значения каталогов',
    ownedItems: 'Предметы во владении',
    itemOwners: 'Владельцы',
    territoryPlaces: 'Территории',
    organizationsOnTerritory: 'Организации на территории',
    ownerOrganizations: 'Организации-владельцы',
    ownedTerritories: 'Территории во владении',
    objectHierarchyParents: 'Родители иерархии',
    objectHierarchyChildren: 'Дочерние элементы',
    objectRelations: 'Связи объектов',
    characterRelationships: 'Связи персонажа',
    addCharacterRelationship: 'Добавить связь',
    relatedCharacter: 'Персонаж',
    relationshipType: 'Тип связи',
    relationshipTypePlaceholder: 'Союз, конфликт, семья...',
    relationshipStrength: 'Сила связи',
    relationshipTension: 'Напряжение',
    relationshipMutual: 'Взаимная',
    relationshipDescription: 'Заметки о связи',
    noCharacterRelationships: 'Связей персонажа пока нет',
    relationGraphEmpty: 'Добавь связи персонажей, чтобы увидеть граф.',
    relationGraphHint: 'Нажми на линию, чтобы посмотреть детали.',
    mainTab: 'Основная',
    linksTab: 'Связи',
    timelineTab: 'Таймлайн',
    galleryTab: 'Галерея',
    galleryEmpty: 'В галерее пока нет изображений.',
    addGalleryImage: 'Добавить изображение',
    galleryImageCaption: 'Подпись',
    galleryCaptionPlaceholder: 'Короткая заметка к изображению',
    timelineEmpty: 'Здесь позже будут сцены и события таймлайна.',
    timelineEvents: 'События таймлайна',
    newTimelineEvent: 'Новое событие',
    editTimelineEvent: 'Изменить событие',
    eventTitle: 'Название события',
    eventTitlePlaceholder: 'Назови событие',
    eventStartLabel: 'Метка начала',
    eventEndLabel: 'Метка конца',
    eventStartValue: 'Число начала',
    eventEndValue: 'Число конца',
    eventCategory: 'Категория',
    eventColor: 'Цвет',
    eventPeriod: 'Период',
    noTimelineEvents: 'Событий таймлайна пока нет',
    eventParticipants: 'Участники',
    addEventParticipant: 'Добавить участника',
    participantRole: 'Роль в событии',
    eventChanges: 'Изменения',
    addEventChange: 'Добавить изменение',
    changeFieldName: 'Что изменилось',
    changeType: 'Тип изменения',
    oldValue: 'Было',
    newValue: 'Стало',
    changeNotes: 'Заметки',
    changeTypeField: 'Поле',
    changeTypeAttribute: 'Характеристика',
    changeTypeRelationship: 'Связь',
    changeTypeOwnership: 'Владение',
    changeTypeCatalogSelection: 'Значение каталога',
    changeTypeHierarchySelection: 'Иерархия',
    changeTypeLocation: 'Местоположение',
    changeTypeStatus: 'Статус',
    changeTypeCustom: 'Другое',
    timelineFieldChanges: 'Изменения полей и характеристик',
    timelineRelationChanges: 'Изменения связей',
    timelineCatalogChanges: 'Каталоги и иерархии',
    timelineOtherChanges: 'Другие изменения',
    timelineContext: 'Временной контекст',
    currentData: 'Текущие данные',
    saveAsTimelineChange: 'Сохранить как изменение таймлайна',
    saveAsTimelineChangeHint: 'Если включено, поля объекта записываются в выбранное событие, а текущий объект не заменяется.',
    timelineEventForChanges: 'Событие для изменений',
    objectTimelineEvents: 'Таймлайн объекта',
    noObjectTimelineEvents: 'Этот объект пока не привязан к событиям таймлайна.',
    attachObjectToEvent: 'Привязать к событию',
    addCatalogValue: 'Добавить значение каталога',
    catalogValueType: 'Тип значения',
    newCatalog: 'Новый каталог',
    catalogName: 'Название каталога',
    catalogDescription: 'Описание каталога',
    supportsHierarchy: 'Поддерживает иерархию',
    catalogHierarchyMode: 'Режим иерархии',
    catalogHierarchyEntries: 'Записи каталога',
    catalogHierarchyEntriesInGroup: 'Записи внутри группы',
    catalogHierarchyGroups: 'Группы',
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
    objectName: 'Название',
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
    authSubtitle: 'Войди, чтобы проекты хранились в твоем аккаунте.',
    signInPlaceholder: 'Вход',
    registerTitle: 'Создание аккаунта',
    authEmail: 'Email',
    authPassword: 'Пароль',
    authDisplayName: 'Имя в приложении',
    authEmailPlaceholder: 'you@example.com',
    authPasswordPlaceholder: 'Минимум 6 символов',
    authDisplayNamePlaceholder: 'Как тебя показывать',
    signInAction: 'Войти',
    registerAction: 'Создать аккаунт',
    switchToRegister: 'Создать новый аккаунт',
    switchToLogin: 'У меня уже есть аккаунт',
    notSignedIn: 'Войди, чтобы открыть свои проекты.',
    authFailed: 'Не удалось войти. Проверь данные и попробуй снова.',
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
    deleteTimelineEventTitle: 'Удалить событие таймлайна',
    deleteProjectConfirm: 'Удалить этот проект и все его данные?',
    deleteObjectConfirm: 'Удалить этот объект?',
    deleteCatalogConfirm: 'Удалить этот каталог и все записи внутри него?',
    deleteCatalogGroupConfirm: 'Удалить эту группу? Записи из нее останутся в каталоге.',
    deleteCatalogEntryConfirm: 'Удалить эту запись каталога?',
    deleteTimelineEventConfirm: 'Удалить это событие таймлайна?',
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
const defaultProjectObjectTypeKeys: ObjectTypeKey[] = [
  'characters',
  'items',
  'places',
  'organizations',
]
const timelineChangeTypes: TimelineChangeType[] = [
  'field',
  'attribute',
  'relationship',
  'ownership',
  'catalogSelection',
  'hierarchySelection',
  'location',
  'status',
  'custom',
]
type ObjectDialogTab = 'main' | 'relations' | 'timeline' | 'gallery'

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
  parentEntryIds: [],
  fieldValues: {},
})

const createEmptyDraftCatalogSelection = (): DraftCatalogSelection => ({
  targetType: 'catalog',
  catalogId: '',
  catalogEntryGroupId: '',
  catalogEntryId: '',
})

const createEmptyDraftCharacterRelationship = (): DraftCharacterRelationship => ({
  id: null,
  sourceCharacterId: '',
  targetCharacterId: '',
  relationType: '',
  strength: '50',
  tension: '0',
  isBidirectional: true,
  description: '',
  direction: 'outgoing',
})

const createEmptyTimelineEventDraft = (): TimelineEventDraft => ({
  title: '',
  eventType: 'point',
  parentEventId: '',
  description: '',
  startLabel: '',
  endLabel: '',
  startValue: '',
  endValue: '',
  category: '',
  color: '#1f5b4f',
  imagePath: null,
  participants: [],
  changes: [],
})

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
  color: event.color ?? '#1f5b4f',
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
    fieldName: change.fieldName ?? '',
    oldValue: change.oldValueJson ?? '',
    newValue: change.newValueJson ?? '',
    notes: change.notes ?? '',
  })),
})

const relationshipPalette = ['#2f9e44', '#d9480f', '#4263eb', '#7048e8', '#f08c00', '#0b7285']

const getRelationshipColor = (relationType: string) => {
  const normalizedType = relationType.trim().toLowerCase()
  const hash = Array.from(normalizedType).reduce(
    (currentHash, character) => currentHash + character.charCodeAt(0),
    0,
  )

  return relationshipPalette[hash % relationshipPalette.length]
}

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
    parentEntryIds: entry.parentEntryIds,
    fieldValues,
  }
}

function StoryDbApp() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const timelineBoardRef = useRef<HTMLDivElement | null>(null)
  const timelineDragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const routeProjectId = projectId === undefined ? null : Number(projectId)
  const [storedSettings] = useState(readStoredSettings)
  const [language, setLanguage] = useState<Language>(storedSettings.language ?? 'en')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [newProjectTab, setNewProjectTab] = useState<NewProjectTab>('details')
  const [dossierTab, setDossierTab] = useState<ObjectDialogTab>('main')
  const [editorTab, setEditorTab] = useState<ObjectDialogTab>('main')
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
  const [ownershipCharacters, setOwnershipCharacters] = useState<StoryObject[]>([])
  const [ownershipItems, setOwnershipItems] = useState<StoryObject[]>([])
  const [relationPlaces, setRelationPlaces] = useState<StoryObject[]>([])
  const [relationOrganizations, setRelationOrganizations] = useState<StoryObject[]>([])
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
  const [catalogEntriesByCatalogId, setCatalogEntriesByCatalogId] = useState<
    Record<number, CatalogEntry[]>
  >({})
  const [catalogEntryGroupsByCatalogId, setCatalogEntryGroupsByCatalogId] = useState<
    Record<number, CatalogEntryGroup[]>
  >({})
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
    ...defaultProjectObjectTypeKeys,
  ])
  const [selectedProjectPresetKeys, setSelectedProjectPresetKeys] = useState<string[]>([])
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
  const [draftCatalogSelections, setDraftCatalogSelections] = useState<DraftCatalogSelection[]>([])
  const [draftOwnedItemIds, setDraftOwnedItemIds] = useState<number[]>([])
  const [draftOwnerCharacterIds, setDraftOwnerCharacterIds] = useState<number[]>([])
  const [draftTerritoryPlaceIds, setDraftTerritoryPlaceIds] = useState<number[]>([])
  const [draftOwnerOrganizationIds, setDraftOwnerOrganizationIds] = useState<number[]>([])
  const [draftParentObjectIds, setDraftParentObjectIds] = useState<number[]>([])
  const [draftCharacterRelationships, setDraftCharacterRelationships] = useState<
    DraftCharacterRelationship[]
  >([])
  const [selectedGraphRelationship, setSelectedGraphRelationship] =
    useState<CharacterRelationship | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [activeTimelineEventId, setActiveTimelineEventId] = useState<number | null>(null)
  const [editingTimelineEventId, setEditingTimelineEventId] = useState<number | null>(null)
  const [timelineEventDraft, setTimelineEventDraft] =
    useState<TimelineEventDraft>(createEmptyTimelineEventDraft)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [dossierTimelineContextEventId, setDossierTimelineContextEventId] = useState('')
  const [saveObjectAsTimelineChange, setSaveObjectAsTimelineChange] = useState(false)
  const [editorTimelineEventId, setEditorTimelineEventId] = useState('')
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null)
  const [galleryImageCaption, setGalleryImageCaption] = useState('')
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
  const [areProjectsLoaded, setAreProjectsLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const t = translations[language]
  const timelineChangeTypeLabels: Record<TimelineChangeType, string> = {
    field: t.changeTypeField,
    attribute: t.changeTypeAttribute,
    relationship: t.changeTypeRelationship,
    ownership: t.changeTypeOwnership,
    catalogSelection: t.changeTypeCatalogSelection,
    hierarchySelection: t.changeTypeHierarchySelection,
    location: t.changeTypeLocation,
    status: t.changeTypeStatus,
    custom: t.changeTypeCustom,
  }
  const isWorkspace = routeProjectId !== null && Number.isFinite(routeProjectId)
  const isLoading = !isAuthChecked || (currentUser !== null && !areProjectsLoaded)
  const availableProjects = useMemo(
    () => (currentUser === null && isAuthChecked ? [] : projects),
    [currentUser, isAuthChecked, projects],
  )
  const selectedProject = useMemo(
    () =>
      routeProjectId === null
        ? null
        : availableProjects.find((currentProject) => currentProject.id === routeProjectId) ?? null,
    [availableProjects, routeProjectId],
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
  const currentObjectTypeKey = attributeScopeKeys.includes(workspaceSection as ObjectTypeKey)
    ? (workspaceSection as ObjectTypeKey)
    : 'characters'
  const currentObjectTypeLabel = t[currentObjectTypeKey] ?? t.characters
  const isObjectWorkspaceSection = attributeScopeKeys.includes(workspaceSection as ObjectTypeKey)
  const dialogObjectTypeKey = (editingCharacter?.typeKey as ObjectTypeKey | undefined) ?? currentObjectTypeKey
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

  const displayedDossierObject = useMemo(() => {
    if (selectedCharacter === null) {
      return null
    }

    const contextEvent =
      dossierTimelineContextEventId === ''
        ? null
        : timelineEvents.find((timelineEvent) => timelineEvent.id === Number(dossierTimelineContextEventId)) ??
          null
    if (contextEvent === null) {
      return selectedCharacter
    }

    const nextObject: StoryObject = {
      ...selectedCharacter,
      attributes: selectedCharacter.attributes.map((attribute) => ({ ...attribute })),
    }
    const attributesByName = new Map(
      nextObject.attributes.map((attribute) => [attribute.name.trim().toLowerCase(), attribute]),
    )
    const baseFieldLabels = new Map<string, keyof Pick<StoryObject, 'name' | 'surname' | 'description' | 'age' | 'role'>>([
      [t.characterName.trim().toLowerCase(), 'name'],
      [t.objectName.trim().toLowerCase(), 'name'],
      ['name', 'name'],
      [t.characterSurname.trim().toLowerCase(), 'surname'],
      ['surname', 'surname'],
      [t.description.trim().toLowerCase(), 'description'],
      ['description', 'description'],
      [t.characterAge.trim().toLowerCase(), 'age'],
      ['age', 'age'],
      [t.characterRole.trim().toLowerCase(), 'role'],
      ['role', 'role'],
    ])

    contextEvent.changes
      .filter(
        (change) =>
          change.targetType === 'storyObject' &&
          change.targetId === selectedCharacter.id &&
          (change.changeType === 'field' || change.changeType === 'attribute'),
      )
      .forEach((change) => {
        const newValue = change.newValueJson
        if (newValue === null) {
          return
        }

        const fieldName = (change.fieldName ?? change.fieldKey ?? '').trim()
        if (fieldName.length === 0) {
          return
        }

        const normalizedFieldName = fieldName.toLowerCase()
        const baseField = baseFieldLabels.get(normalizedFieldName)
        if (baseField !== undefined) {
          if (baseField === 'name') {
            nextObject.name = newValue
          } else if (baseField === 'surname') {
            nextObject.surname = newValue
          } else if (baseField === 'description') {
            nextObject.description = newValue
          } else if (baseField === 'age') {
            nextObject.age = newValue
          } else {
            nextObject.role = newValue
          }
          return
        }

        const existingAttribute = attributesByName.get(normalizedFieldName)
        if (existingAttribute !== undefined) {
          existingAttribute.value = newValue
          return
        }

        const virtualAttribute = {
          id: -attributesByName.size - 1,
          attributeDefinitionId: 0,
          name: fieldName,
          value: newValue,
        }
        nextObject.attributes.push(virtualAttribute)
        attributesByName.set(normalizedFieldName, virtualAttribute)
      })

    return nextObject
  }, [
    dossierTimelineContextEventId,
    selectedCharacter,
    t.characterAge,
    t.characterName,
    t.characterRole,
    t.characterSurname,
    t.description,
    t.objectName,
    timelineEvents,
  ])

  const dossierAttributeGroups = useMemo(() => {
    if (displayedDossierObject === null) {
      return []
    }

    const definitionsByName = new Map(
      attributeDefinitions.map((definition) => [definition.name.trim().toLowerCase(), definition]),
    )
    const groups = new Map<
      string,
      { key: string; name: string; attributes: StoryObject['attributes'] }
    >()

    displayedDossierObject.attributes.forEach((attribute) => {
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
  }, [attributeDefinitions, displayedDossierObject, t.primaryAttributeGroup])
  const characterGraphEdges = useMemo(
    () => {
      const rawEdges = ownershipCharacters.flatMap((character) =>
        character.outgoingCharacterRelationships.map((relationship) => ({
          ...relationship,
          sourceCharacter: character,
        })),
      )
      const pairCounts = new Map<string, number>()

      rawEdges.forEach((relationship) => {
        const pairKey = [relationship.sourceCharacter.id, relationship.character.id]
          .sort((left, right) => left - right)
          .join('-')
        pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1)
      })

      const pairIndexes = new Map<string, number>()

      return rawEdges.map((relationship) => {
        const pairKey = [relationship.sourceCharacter.id, relationship.character.id]
          .sort((left, right) => left - right)
          .join('-')
        const pairIndex = pairIndexes.get(pairKey) ?? 0
        const pairCount = pairCounts.get(pairKey) ?? 1
        pairIndexes.set(pairKey, pairIndex + 1)

        return {
          ...relationship,
          curveOffset: (pairIndex - (pairCount - 1) / 2) * 5,
        }
      })
    },
    [ownershipCharacters],
  )
  const characterGraphNodes = useMemo(() => {
    const connectedIds = new Set<number>()
    characterGraphEdges.forEach((relationship) => {
      connectedIds.add(relationship.sourceCharacter.id)
      connectedIds.add(relationship.character.id)
    })

    const visibleCharacters =
      connectedIds.size === 0
        ? ownershipCharacters
        : ownershipCharacters.filter((character) => connectedIds.has(character.id))
    const centerX = 380
    const centerY = 270
    const radius = Math.max(150, Math.min(260, visibleCharacters.length * 44))

    return visibleCharacters.map((character, index) => {
      const startAngle = visibleCharacters.length === 2 ? 0 : -Math.PI / 2
      const angle = visibleCharacters.length <= 1
        ? 0
        : (Math.PI * 2 * index) / visibleCharacters.length + startAngle

      return {
        character,
        x: visibleCharacters.length <= 1 ? centerX : centerX + Math.cos(angle) * radius,
        y: visibleCharacters.length <= 1 ? centerY : centerY + Math.sin(angle) * radius,
      }
    })
  }, [characterGraphEdges, ownershipCharacters])
  const initialRelationshipNodes = useMemo<Node[]>(
    () =>
      characterGraphNodes.map((node) => ({
        id: String(node.character.id),
        type: 'default',
        position: { x: node.x, y: node.y },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <span className="relationship-flow-label">
              <span className="relationship-node-avatar">
                {resolveAssetUrl(node.character.imagePath) === null ? (
                  node.character.name[0]
                ) : (
                  <img src={resolveAssetUrl(node.character.imagePath) ?? undefined} alt="" />
                )}
              </span>
              <strong>{node.character.name}</strong>
            </span>
          ),
          storyObject: node.character,
        },
        className: 'relationship-flow-node',
      })),
    [characterGraphNodes],
  )
  const initialRelationshipEdges = useMemo<Edge[]>(
    () =>
      characterGraphEdges.map((relationship) => {
        const color = getRelationshipColor(relationship.relationType)

        return {
          id: String(relationship.id),
          source: String(relationship.sourceCharacter.id),
          target: String(relationship.character.id),
          type: 'smoothstep',
          label: relationship.relationType,
          animated: relationship.tension > 70,
          markerEnd: relationship.isBidirectional
            ? undefined
            : {
                type: MarkerType.ArrowClosed,
                color,
              },
          data: { relationship },
          style: {
            stroke: color,
            strokeWidth: Math.max(2, relationship.strength / 24),
          },
          labelStyle: {
            fill: color,
            fontWeight: 900,
          },
          labelBgStyle: {
            fill: 'var(--surface)',
            stroke: 'var(--border-soft)',
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 999,
        }
      }),
    [characterGraphEdges],
  )
  const [relationshipNodes, setRelationshipNodes, onRelationshipNodesChange] =
    useNodesState<Node>([])
  const [relationshipEdges, setRelationshipEdges, onRelationshipEdgesChange] =
    useEdgesState<Edge>([])
  const handleRelationshipNodeClick: NodeMouseHandler = (_, node) => {
    const storyObject = node.data.storyObject as StoryObject | undefined
    if (storyObject === undefined) {
      return
    }

    setSelectedCharacter(storyObject)
    setDossierTab('main')
    setDialog('character')
  }
  const handleRelationshipEdgeClick: EdgeMouseHandler = (_, edge) => {
    const relationship = edge.data?.relationship as CharacterRelationship | undefined
    if (relationship !== undefined) {
      setSelectedGraphRelationship(relationship)
    }
  }
  const relationshipLegend = useMemo(
    () =>
      Array.from(new Set(characterGraphEdges.map((relationship) => relationship.relationType)))
        .filter((relationType) => relationType.trim().length > 0)
        .sort((left, right) => left.localeCompare(right)),
    [characterGraphEdges],
  )
  useEffect(() => {
    setRelationshipNodes(initialRelationshipNodes)
  }, [initialRelationshipNodes, setRelationshipNodes])

  useEffect(() => {
    setRelationshipEdges(initialRelationshipEdges)
  }, [initialRelationshipEdges, setRelationshipEdges])

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
  const activeTimelineEvent = useMemo(
    () =>
      activeTimelineEventId === null
        ? null
        : timelineEvents.find((timelineEvent) => timelineEvent.id === activeTimelineEventId) ?? null,
    [activeTimelineEventId, timelineEvents],
  )
  const timelineLayout = useMemo(() => {
    const normalizedEvents = timelineEvents.map((timelineEvent, index) => {
      const start = timelineEvent.startValue ?? index + 1
      const rawEnd = timelineEvent.endValue ?? start
      const end = rawEnd < start ? start : rawEnd

      return {
        event: timelineEvent,
        start,
        end,
        lane: index % 4,
      }
    })
    const numericValues = normalizedEvents.flatMap((item) => [item.start, item.end])
    const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0
    const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1
    const span = Math.max(1, maxValue - minValue)
    const pixelsPerUnit = 92 * timelineZoom
    const leftPadding = 110
    const rightPadding = 130
    const width = Math.max(760, span * pixelsPerUnit + leftPadding + rightPadding)
    const tickCount = Math.min(8, Math.max(2, Math.ceil(span) + 1))
    const ticks = Array.from({ length: tickCount }, (_, index) => {
      const ratio = tickCount === 1 ? 0 : index / (tickCount - 1)
      const value = minValue + span * ratio

      return {
        value,
        left: leftPadding + (value - minValue) * pixelsPerUnit,
      }
    })
    const items = normalizedEvents
      .sort((left, right) => left.start - right.start || left.event.title.localeCompare(right.event.title))
      .map((item) => ({
        ...item,
        left: leftPadding + (item.start - minValue) * pixelsPerUnit,
        width: Math.max(18, (item.end - item.start) * pixelsPerUnit),
      }))

    return { items, ticks, width }
  }, [timelineEvents, timelineZoom])
  const selectedObjectTimelineEvents = useMemo(() => {
    if (selectedCharacter === null) {
      return []
    }

    return timelineEvents.filter((timelineEvent) =>
      timelineEvent.participants.some(
        (participant) =>
          participant.targetType === 'storyObject' &&
          participant.targetId === selectedCharacter.id,
      ) ||
      timelineEvent.changes.some(
        (change) =>
          change.targetType === 'storyObject' &&
          change.targetId === selectedCharacter.id,
      ),
    )
  }, [selectedCharacter, timelineEvents])
  const dossierTimelineContextEvent = useMemo(
    () =>
      dossierTimelineContextEventId === ''
        ? null
        : timelineEvents.find((timelineEvent) => timelineEvent.id === Number(dossierTimelineContextEventId)) ??
          null,
    [dossierTimelineContextEventId, timelineEvents],
  )
  const dossierTimelineChangesByType = useMemo(() => {
    const emptyGroups = {
      fields: [] as TimelineChange[],
      relations: [] as TimelineChange[],
      catalogs: [] as TimelineChange[],
      other: [] as TimelineChange[],
    }

    if (selectedCharacter === null || dossierTimelineContextEvent === null) {
      return emptyGroups
    }

    return dossierTimelineContextEvent.changes
      .filter(
        (change) =>
          change.targetType === 'storyObject' &&
          change.targetId === selectedCharacter.id,
      )
      .reduce((groups, change) => {
        if (change.changeType === 'field' || change.changeType === 'attribute') {
          groups.fields.push(change)
        } else if (
          change.changeType === 'relationship' ||
          change.changeType === 'ownership' ||
          change.changeType === 'location'
        ) {
          groups.relations.push(change)
        } else if (
          change.changeType === 'catalogSelection' ||
          change.changeType === 'hierarchySelection'
        ) {
          groups.catalogs.push(change)
        } else {
          groups.other.push(change)
        }

        return groups
      }, emptyGroups)
  }, [dossierTimelineContextEvent, selectedCharacter])
  const timelineTargetObjects = useMemo(
    () => [
      ...ownershipCharacters.map((storyObject) => ({ ...storyObject, targetType: 'storyObject' })),
      ...ownershipItems.map((storyObject) => ({ ...storyObject, targetType: 'storyObject' })),
      ...relationPlaces.map((storyObject) => ({ ...storyObject, targetType: 'storyObject' })),
      ...relationOrganizations.map((storyObject) => ({ ...storyObject, targetType: 'storyObject' })),
    ],
    [ownershipCharacters, ownershipItems, relationOrganizations, relationPlaces],
  )
  useEffect(() => {
    let isActive = true

    void fetchCurrentUser()
      .then((user) => {
        if (isActive) {
          setCurrentUser(user)
        }
      })
      .catch(() => {
        if (isActive) {
          setApiError(t.apiUnavailable)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsAuthChecked(true)
        }
      })

    return () => {
      isActive = false
    }
  }, [t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isAuthChecked) {
      return undefined
    }

    if (currentUser === null) {
      return undefined
    }

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
          setAreProjectsLoaded(true)
        }
      })

    return () => {
      isActive = false
    }
  }, [currentUser, isAuthChecked, t.apiUnavailable])

  useEffect(() => {
    let isActive = true

    if (!isWorkspace || selectedProject === null) {
      return undefined
    }

    if (!isObjectWorkspaceSection) {
      return undefined
    }

    void fetchObjects(selectedProject.id, currentObjectTypeKey)
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
  }, [
    currentObjectTypeKey,
    isObjectWorkspaceSection,
    isWorkspace,
    selectedProject,
    t.apiUnavailable,
  ])

  useEffect(() => {
    let isActive = true

    if (
      !isWorkspace ||
      selectedProject === null ||
      (workspaceSection !== 'attributes' && !isObjectWorkspaceSection)
    ) {
      return undefined
    }

    const typeKey = workspaceSection === 'attributes' ? effectiveAttributeScope : currentObjectTypeKey

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
  }, [
    currentObjectTypeKey,
    effectiveAttributeScope,
    isObjectWorkspaceSection,
    isWorkspace,
    selectedProject,
    t.apiUnavailable,
    workspaceSection,
  ])

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

    if (
      !isWorkspace ||
      selectedProject === null ||
      (workspaceTab !== 'timeline' &&
        dialog !== 'character' &&
        dialog !== 'editCharacter' &&
        dialog !== 'newCharacter')
    ) {
      return undefined
    }

    void fetchTimelineEvents(selectedProject.id)
      .then((events) => {
        if (isActive) {
          setTimelineEvents(events)
          setActiveTimelineEventId((currentId) =>
            currentId !== null && events.some((event) => event.id === currentId)
              ? currentId
              : events[0]?.id ?? null,
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
  }, [dialog, isWorkspace, selectedProject, t.apiUnavailable, workspaceTab])

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
          setCatalogEntriesByCatalogId((currentEntries) => ({
            ...currentEntries,
            [activeCatalogId]: entries,
          }))
          setCatalogEntryGroups(groups)
          setCatalogEntryGroupsByCatalogId((currentGroups) => ({
            ...currentGroups,
            [activeCatalogId]: groups,
          }))
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

    if (!isWorkspace || selectedProject === null) {
      return undefined
    }

    const referenceCatalogIds = Array.from(
      new Set(
        catalogFieldDefinitions
          .filter(
            (field) =>
              (field.dataType === 'entryReference' ||
                field.dataType === 'multipleEntryReference') &&
              field.referenceCatalogId !== null,
          )
          .map((field) => field.referenceCatalogId as number),
      ),
    ).filter((catalogId) => catalogEntriesByCatalogId[catalogId] === undefined)

    if (referenceCatalogIds.length === 0) {
      return undefined
    }

    void Promise.all(
      referenceCatalogIds.map((catalogId) =>
        fetchCatalogEntries(selectedProject.id, catalogId).then((entries) => [catalogId, entries] as const),
      ),
    )
      .then((entriesByCatalog) => {
        if (isActive) {
          setCatalogEntriesByCatalogId((currentEntries) => ({
            ...currentEntries,
            ...Object.fromEntries(entriesByCatalog),
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
  }, [
    catalogEntriesByCatalogId,
    catalogFieldDefinitions,
    isWorkspace,
    selectedProject,
    t.apiUnavailable,
  ])

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
      selectedProject === null ||
      (dialog !== 'newCharacter' && dialog !== 'editCharacter') ||
      catalogs.length === 0
    ) {
      return undefined
    }

    const missingCatalogs = catalogs.filter(
      (catalog) =>
        catalogEntriesByCatalogId[catalog.id] === undefined ||
        catalogEntryGroupsByCatalogId[catalog.id] === undefined,
    )
    if (missingCatalogs.length === 0) {
      return undefined
    }

    void Promise.all(
      missingCatalogs.map(async (catalog) => {
        const [entries, groups] = await Promise.all([
          fetchCatalogEntries(selectedProject.id, catalog.id),
          fetchCatalogEntryGroups(selectedProject.id, catalog.id),
        ])

        return [catalog.id, entries, groups] as const
      }),
    )
      .then((loadedCatalogs) => {
        if (isActive) {
          setCatalogEntriesByCatalogId((currentEntries) => ({
            ...currentEntries,
            ...Object.fromEntries(loadedCatalogs.map(([catalogId, entries]) => [catalogId, entries])),
          }))
          setCatalogEntryGroupsByCatalogId((currentGroups) => ({
            ...currentGroups,
            ...Object.fromEntries(loadedCatalogs.map(([catalogId, , groups]) => [catalogId, groups])),
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
  }, [
    catalogEntriesByCatalogId,
    catalogEntryGroupsByCatalogId,
    catalogs,
    dialog,
    selectedProject,
    t.apiUnavailable,
  ])

  useEffect(() => {
    let isActive = true

    if (
      selectedProject === null ||
      (dialog !== 'newCharacter' &&
        dialog !== 'editCharacter' &&
        dialog !== 'character' &&
        workspaceTab !== 'relations' &&
        workspaceTab !== 'timeline')
    ) {
      return undefined
    }

    void Promise.all([
      fetchObjects(selectedProject.id, 'characters'),
      fetchObjects(selectedProject.id, 'items'),
      fetchObjects(selectedProject.id, 'places'),
      fetchObjects(selectedProject.id, 'organizations'),
    ])
      .then(([loadedCharacters, loadedItems, loadedPlaces, loadedOrganizations]) => {
        if (isActive) {
          setOwnershipCharacters(loadedCharacters)
          setOwnershipItems(loadedItems)
          setRelationPlaces(loadedPlaces)
          setRelationOrganizations(loadedOrganizations)
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
  }, [dialog, selectedProject, t.apiUnavailable, workspaceTab])

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
    setDraftCatalogSelections([])
    setDraftOwnedItemIds([])
    setDraftOwnerCharacterIds([])
    setDraftTerritoryPlaceIds([])
    setDraftOwnerOrganizationIds([])
    setDraftParentObjectIds([])
    setNewHierarchySelectionGroupId('')
    setNewCharacterAttributeName('')
    setNewCharacterAttributeValue('')
    setNewCharacterAttributeDataType('text')
    setNewCharacterAttributeOptionsText('')
    setCollapsedCharacterAttributeGroups([])
    setCollapsedDossierAttributeGroups([])
    setGalleryImagePath(null)
    setGalleryImageCaption('')
  }

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()

    try {
      setApiError(null)
      setFormError(null)
      const user =
        authMode === 'login'
          ? await loginRequest(authEmail, authPassword)
          : await registerRequest(authEmail, authPassword, authDisplayName)

      setAreProjectsLoaded(false)
      setCurrentUser(user)
      setAuthPassword('')
      setAuthDisplayName('')
      closeDialog()
    } catch {
      setFormError(t.authFailed)
    }
  }

  const logout = async () => {
    try {
      setApiError(null)
      await logoutRequest()
      setCurrentUser(null)
      setAreProjectsLoaded(false)
      setProjects([])
      setCharacters([])
      navigate('/')
    } catch {
      setApiError(t.apiUnavailable)
    }
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
    setSelectedProjectPresetKeys([])
    setDialog('editProject')
  }

  const openEditCharacter = (storyObject: StoryObject) => {
    setActiveObjectMenuId(null)
    setSelectedCharacter(storyObject)
    setEditingCharacter(storyObject)
    setEditorTab('main')
    setSaveObjectAsTimelineChange(false)
    setEditorTimelineEventId('')
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
    setDraftCatalogSelections(
      storyObject.catalogSelections.map((selection) => ({
        targetType: selection.targetType,
        catalogId: String(selection.catalogId),
        catalogEntryGroupId:
          selection.catalogEntryGroupId === null ? '' : String(selection.catalogEntryGroupId),
        catalogEntryId: selection.catalogEntryId === null ? '' : String(selection.catalogEntryId),
      })),
    )
    setDraftOwnedItemIds(storyObject.ownedItems.map((item) => item.id))
    setDraftOwnerCharacterIds(storyObject.owners.map((owner) => owner.id))
    setDraftTerritoryPlaceIds(storyObject.territoryPlaces.map((place) => place.id))
    setDraftOwnerOrganizationIds(storyObject.ownerOrganizations.map((organization) => organization.id))
    setDraftParentObjectIds(storyObject.hierarchyParents.map((parent) => parent.id))
    setDraftCharacterRelationships(
      [
        ...storyObject.outgoingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(storyObject.id),
          targetCharacterId: String(relationship.character.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'outgoing' as const,
        })),
        ...storyObject.incomingCharacterRelationships.map((relationship) => ({
          id: relationship.id,
          sourceCharacterId: String(relationship.character.id),
          targetCharacterId: String(storyObject.id),
          relationType: relationship.relationType,
          strength: String(relationship.strength),
          tension: String(relationship.tension),
          isBidirectional: relationship.isBidirectional,
          description: relationship.description ?? '',
          direction: 'incoming' as const,
        })),
      ],
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
    const validationError = validateProjectDraft(trimmedName, projectCoverImagePath)
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
        selectedProjectPresetKeys,
      )
      setProjectName('')
      setProjectCoverImagePath(null)
      setEnabledObjectTypeKeys([...defaultProjectObjectTypeKeys])
      setSelectedProjectPresetKeys([])
      closeDialog()
      setProjects((currentProjects) => [createdProject, ...currentProjects])
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateProject = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = projectName.trim()
    const validationError = validateProjectDraft(trimmedName, projectCoverImagePath)
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
        selectedProjectPresetKeys,
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
      setEnabledObjectTypeKeys([...defaultProjectObjectTypeKeys])
      setSelectedProjectPresetKeys([])
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
      setOwnershipCharacters((currentObjects) =>
        currentObjects.filter((currentObject) => currentObject.id !== storyObject.id),
      )
      setOwnershipItems((currentObjects) =>
        currentObjects.filter((currentObject) => currentObject.id !== storyObject.id),
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
      setCatalogEntriesByCatalogId((currentEntries) =>
        Object.fromEntries(
          Object.entries(currentEntries).filter(
            ([catalogId]) => Number(catalogId) !== catalog.id,
          ),
        ),
      )

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
      setCatalogEntriesByCatalogId((currentEntries) => ({
        ...currentEntries,
        [activeCatalogId]: (currentEntries[activeCatalogId] ?? catalogEntries).filter(
          (currentEntry) => currentEntry.id !== entry.id,
        ),
      }))
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

  const resetTimelineEventDraft = () => {
    setEditingTimelineEventId(null)
    setTimelineEventDraft(createEmptyTimelineEventDraft())
  }

  const editTimelineEvent = (timelineEvent: TimelineEvent) => {
    setActiveTimelineEventId(timelineEvent.id)
    setEditingTimelineEventId(timelineEvent.id)
    setTimelineEventDraft(toTimelineEventDraft(timelineEvent))
    setFormError(null)
  }

  const addTimelineParticipant = () => {
    const firstTarget = timelineTargetObjects[0]
    if (firstTarget === undefined) {
      return
    }

    setTimelineEventDraft((draft) => ({
      ...draft,
      participants: [
        ...draft.participants,
        { targetType: firstTarget.targetType, targetId: String(firstTarget.id), role: '' },
      ],
    }))
  }

  const removeTimelineParticipant = (index: number) => {
    setTimelineEventDraft((draft) => ({
      ...draft,
      participants: draft.participants.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const addTimelineChange = () => {
    const firstTarget = timelineTargetObjects[0]
    if (firstTarget === undefined) {
      return
    }

    setTimelineEventDraft((draft) => ({
      ...draft,
      changes: [
        ...draft.changes,
        {
          changeType: 'field',
          targetType: firstTarget.targetType,
          targetId: String(firstTarget.id),
          fieldName: '',
          oldValue: '',
          newValue: '',
          notes: '',
        },
      ],
    }))
  }

  const removeTimelineChange = (index: number) => {
    setTimelineEventDraft((draft) => ({
      ...draft,
      changes: draft.changes.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const upsertTimelineEvent = (savedEvent: TimelineEvent) => {
    setTimelineEvents((currentEvents) => {
      const hasEvent = currentEvents.some((currentEvent) => currentEvent.id === savedEvent.id)
      const nextEvents = hasEvent
        ? currentEvents.map((currentEvent) =>
            currentEvent.id === savedEvent.id ? savedEvent : currentEvent,
          )
        : [...currentEvents, savedEvent]

      return nextEvents.sort((left, right) => {
        const leftValue = left.startValue ?? Number.MAX_SAFE_INTEGER
        const rightValue = right.startValue ?? Number.MAX_SAFE_INTEGER
        if (leftValue !== rightValue) {
          return leftValue - rightValue
        }

        return left.title.localeCompare(right.title)
      })
    })
  }

  const attachObjectToTimelineEvent = async (storyObject: StoryObject, eventId: number) => {
    if (selectedProject === null) {
      return
    }

    const timelineEvent = timelineEvents.find((event) => event.id === eventId)
    if (timelineEvent === undefined) {
      return
    }

    const alreadyAttached = timelineEvent.participants.some(
      (participant) =>
        participant.targetType === 'storyObject' && participant.targetId === storyObject.id,
    )
    if (alreadyAttached) {
      return
    }

    try {
      setApiError(null)
      const draft = toTimelineEventDraft(timelineEvent)
      const savedEvent = await updateTimelineEventRequest(selectedProject.id, eventId, {
        ...draft,
        participants: [
          ...draft.participants,
          { targetType: 'storyObject', targetId: String(storyObject.id), role: '' },
        ],
      })
      upsertTimelineEvent(savedEvent)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const saveObjectChangesToTimelineEvent = async (storyObject: StoryObject, eventId: number) => {
    if (selectedProject === null) {
      return false
    }

    const timelineEvent = timelineEvents.find((event) => event.id === eventId)
    if (timelineEvent === undefined) {
      setFormError(t.timelineEventForChanges)
      return false
    }

    const currentAttributesByName = new Map(
      storyObject.attributes.map((attribute) => [
        attribute.name.trim().toLowerCase(),
        attribute.value ?? '',
      ]),
    )
    const changes = [
      {
        changeType: 'field' as TimelineChangeType,
        fieldName: t.characterName,
        oldValue: storyObject.name,
        newValue: characterName.trim(),
      },
      {
        changeType: 'field' as TimelineChangeType,
        fieldName: t.characterSurname,
        oldValue: storyObject.surname ?? '',
        newValue: storyObject.typeKey === 'characters' ? characterSurname.trim() : '',
      },
      {
        changeType: 'field' as TimelineChangeType,
        fieldName: t.description,
        oldValue: storyObject.description ?? '',
        newValue: characterDescription.trim(),
      },
      {
        changeType: 'field' as TimelineChangeType,
        fieldName: t.characterAge,
        oldValue: storyObject.age ?? '',
        newValue: storyObject.typeKey === 'characters' ? characterAge.trim() : '',
      },
      {
        changeType: 'field' as TimelineChangeType,
        fieldName: t.characterRole,
        oldValue: storyObject.role ?? '',
        newValue: storyObject.typeKey === 'characters' ? characterRole.trim() : '',
      },
      ...draftAttributes
        .filter((attribute) => attribute.name.trim().length > 0)
        .map((attribute) => ({
          changeType: 'attribute' as TimelineChangeType,
          fieldName: attribute.name.trim(),
          oldValue: currentAttributesByName.get(attribute.name.trim().toLowerCase()) ?? '',
          newValue: attribute.value.trim(),
        })),
    ].filter((change) => change.oldValue !== change.newValue && change.fieldName.trim().length > 0)

    try {
      setApiError(null)
      const draft = toTimelineEventDraft(timelineEvent)
      const hasParticipant = draft.participants.some(
        (participant) =>
          participant.targetType === 'storyObject' &&
          Number(participant.targetId) === storyObject.id,
      )
      const savedEvent = await updateTimelineEventRequest(selectedProject.id, eventId, {
        ...draft,
        participants: hasParticipant
          ? draft.participants
          : [
              ...draft.participants,
              { targetType: 'storyObject', targetId: String(storyObject.id), role: '' },
            ],
        changes: [
          ...draft.changes,
          ...changes.map((change) => ({
            changeType: change.changeType,
            targetType: 'storyObject',
            targetId: String(storyObject.id),
            fieldName: change.fieldName,
            oldValue: change.oldValue,
            newValue: change.newValue,
            notes: '',
          })),
        ],
      })
      upsertTimelineEvent(savedEvent)
      return true
    } catch {
      setApiError(t.apiUnavailable)
      return false
    }
  }

  const saveTimelineEvent = async (event: FormEvent) => {
    event.preventDefault()
    if (selectedProject === null) {
      return
    }

    const titleError = validateName(timelineEventDraft.title)
    if (titleError !== null) {
      setFormError(titleError)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      const savedEvent =
        editingTimelineEventId === null
          ? await createTimelineEventRequest(selectedProject.id, timelineEventDraft)
          : await updateTimelineEventRequest(
              selectedProject.id,
              editingTimelineEventId,
              timelineEventDraft,
            )

      setTimelineEvents((currentEvents) => {
        const hasEvent = currentEvents.some((currentEvent) => currentEvent.id === savedEvent.id)
        const nextEvents = hasEvent
          ? currentEvents.map((currentEvent) =>
              currentEvent.id === savedEvent.id ? savedEvent : currentEvent,
            )
          : [...currentEvents, savedEvent]

        return nextEvents.sort((left, right) => {
          const leftValue = left.startValue ?? Number.MAX_SAFE_INTEGER
          const rightValue = right.startValue ?? Number.MAX_SAFE_INTEGER
          return leftValue - rightValue || left.title.localeCompare(right.title)
        })
      })
      setActiveTimelineEventId(savedEvent.id)
      resetTimelineEventDraft()
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteTimelineEvent = async (timelineEvent: TimelineEvent) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      await deleteTimelineEventRequest(selectedProject.id, timelineEvent.id)
      const remainingEvents = timelineEvents.filter((event) => event.id !== timelineEvent.id)
      setTimelineEvents(remainingEvents)
      if (activeTimelineEventId === timelineEvent.id) {
        setActiveTimelineEventId(remainingEvents[0]?.id ?? null)
      }
      if (editingTimelineEventId === timelineEvent.id) {
        resetTimelineEventDraft()
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
          catalog.hierarchyMode,
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
          catalogEntryGroups.find((group) => group.id === inlineNameEdit.id)?.parentGroupIds ?? [],
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

  const applyUpdatedStoryObject = (updatedObject: StoryObject) => {
    setCharacters((currentObjects) =>
      currentObjects.map((storyObject) =>
        storyObject.id === updatedObject.id ? updatedObject : storyObject,
      ),
    )
    if (updatedObject.typeKey === 'characters') {
      setOwnershipCharacters((currentObjects) =>
        currentObjects.map((storyObject) =>
          storyObject.id === updatedObject.id ? updatedObject : storyObject,
        ),
      )
    }
    if (updatedObject.typeKey === 'items') {
      setOwnershipItems((currentObjects) =>
        currentObjects.map((storyObject) =>
          storyObject.id === updatedObject.id ? updatedObject : storyObject,
        ),
      )
    }
    if (updatedObject.typeKey === 'places') {
      setRelationPlaces((currentObjects) =>
        currentObjects.map((storyObject) =>
          storyObject.id === updatedObject.id ? updatedObject : storyObject,
        ),
      )
    }
    if (updatedObject.typeKey === 'organizations') {
      setRelationOrganizations((currentObjects) =>
        currentObjects.map((storyObject) =>
          storyObject.id === updatedObject.id ? updatedObject : storyObject,
        ),
      )
    }
    setSelectedCharacter((currentObject) =>
      currentObject?.id === updatedObject.id ? updatedObject : currentObject,
    )
  }

  const addGalleryImage = async () => {
    if (selectedProject === null || selectedCharacter === null || galleryImagePath === null) {
      return
    }

    try {
      setApiError(null)
      const updatedObject = await addObjectGalleryImageRequest(
        selectedProject.id,
        selectedCharacter.id,
        galleryImagePath,
        galleryImageCaption,
      )
      applyUpdatedStoryObject(updatedObject)
      setGalleryImagePath(null)
      setGalleryImageCaption('')
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateGalleryImageCaption = async (imageId: number, imagePath: string, caption: string) => {
    if (selectedProject === null || selectedCharacter === null) {
      return
    }

    try {
      setApiError(null)
      const updatedObject = await updateObjectGalleryImageRequest(
        selectedProject.id,
        selectedCharacter.id,
        imageId,
        imagePath,
        caption,
      )
      applyUpdatedStoryObject(updatedObject)
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (selectedProject === null || selectedCharacter === null) {
      return
    }

    try {
      setApiError(null)
      const updatedObject = await deleteObjectGalleryImageRequest(
        selectedProject.id,
        selectedCharacter.id,
        imageId,
      )
      applyUpdatedStoryObject(updatedObject)
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

    if (pendingDelete.kind === 'timelineEvent') {
      await deleteTimelineEvent(pendingDelete.item)
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
        currentObjectTypeKey,
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
    if (
      currentObjectTypeKey === 'characters' &&
      (characterSurname.length > 120 || characterAge.length > 120 || characterRole.length > 120)
    ) {
      setFormError(t.validationCharacterDetailTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      await ensureDraftAttributeDefinitions()
      const createdCharacter = await createObjectRequest(
        selectedProject.id,
        currentObjectTypeKey,
        characterName.trim(),
        currentObjectTypeKey === 'characters' ? characterSurname : '',
        characterDescription,
        currentObjectTypeKey === 'characters' ? characterAge : '',
        currentObjectTypeKey === 'characters' ? characterRole : '',
        characterImagePath,
        draftAttributes,
        draftHierarchySelections,
        draftCatalogSelections,
        currentObjectTypeKey === 'characters' ? draftOwnedItemIds : [],
        currentObjectTypeKey === 'items' ? draftOwnerCharacterIds : [],
        currentObjectTypeKey === 'organizations' ? draftTerritoryPlaceIds : [],
        currentObjectTypeKey === 'places' ? draftOwnerOrganizationIds : [],
        currentObjectTypeKey === 'places' || currentObjectTypeKey === 'organizations'
          ? draftParentObjectIds
          : [],
        currentObjectTypeKey === 'characters' ? draftCharacterRelationships : [],
      )
      setCharacters((currentCharacters) => [...currentCharacters, createdCharacter])
      if (createdCharacter.typeKey === 'characters') {
        setOwnershipCharacters((currentObjects) => [...currentObjects, createdCharacter])
      }
      if (createdCharacter.typeKey === 'items') {
        setOwnershipItems((currentObjects) => [...currentObjects, createdCharacter])
      }
      setCharacterName('')
      setCharacterSurname('')
      setCharacterDescription('')
      setCharacterAge('')
      setCharacterRole('')
      setCharacterImagePath(null)
      setDraftAttributes([{ name: '', value: '' }])
      setDraftHierarchySelections([])
      setDraftCatalogSelections([])
      setDraftOwnedItemIds([])
      setDraftOwnerCharacterIds([])
      setDraftTerritoryPlaceIds([])
      setDraftOwnerOrganizationIds([])
      setDraftParentObjectIds([])
      setDraftCharacterRelationships([])
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
    if (
      editingCharacter.typeKey === 'characters' &&
      (characterSurname.length > 120 || characterAge.length > 120 || characterRole.length > 120)
    ) {
      setFormError(t.validationCharacterDetailTooLong)
      return
    }

    try {
      setApiError(null)
      setFormError(null)
      if (saveObjectAsTimelineChange) {
        const eventId = Number(editorTimelineEventId)
        if (!Number.isInteger(eventId) || eventId <= 0) {
          setFormError(t.timelineEventForChanges)
          return
        }

        const isSaved = await saveObjectChangesToTimelineEvent(editingCharacter, eventId)
        if (isSaved) {
          setSaveObjectAsTimelineChange(false)
          setEditorTimelineEventId('')
          closeDialog()
        }
        return
      }

      await ensureDraftAttributeDefinitions()
      const updatedCharacter = await updateObjectRequest(
        selectedProject.id,
        editingCharacter.id,
        characterName.trim(),
        editingCharacter.typeKey === 'characters' ? characterSurname : '',
        characterDescription,
        editingCharacter.typeKey === 'characters' ? characterAge : '',
        editingCharacter.typeKey === 'characters' ? characterRole : '',
        characterImagePath,
        draftAttributes,
        draftHierarchySelections,
        draftCatalogSelections,
        editingCharacter.typeKey === 'characters' ? draftOwnedItemIds : [],
        editingCharacter.typeKey === 'items' ? draftOwnerCharacterIds : [],
        editingCharacter.typeKey === 'organizations' ? draftTerritoryPlaceIds : [],
        editingCharacter.typeKey === 'places' ? draftOwnerOrganizationIds : [],
        editingCharacter.typeKey === 'places' || editingCharacter.typeKey === 'organizations'
          ? draftParentObjectIds
          : [],
        editingCharacter.typeKey === 'characters' ? draftCharacterRelationships : [],
      )
      setCharacters((currentCharacters) =>
        currentCharacters.map((character) =>
          character.id === updatedCharacter.id ? updatedCharacter : character,
        ),
      )
      if (updatedCharacter.typeKey === 'characters') {
        setOwnershipCharacters((currentObjects) =>
          currentObjects.map((storyObject) =>
            storyObject.id === updatedCharacter.id ? updatedCharacter : storyObject,
          ),
        )
      }
      if (updatedCharacter.typeKey === 'items') {
        setOwnershipItems((currentObjects) =>
          currentObjects.map((storyObject) =>
            storyObject.id === updatedCharacter.id ? updatedCharacter : storyObject,
          ),
        )
      }
      setSelectedCharacter(updatedCharacter)
      setCharacterName('')
      setCharacterSurname('')
      setCharacterDescription('')
      setCharacterAge('')
      setCharacterRole('')
      setCharacterImagePath(null)
      setDraftAttributes([{ name: '', value: '' }])
      setDraftHierarchySelections([])
      setDraftCatalogSelections([])
      setDraftOwnedItemIds([])
      setDraftOwnerCharacterIds([])
      setDraftTerritoryPlaceIds([])
      setDraftOwnerOrganizationIds([])
      setDraftParentObjectIds([])
      setDraftCharacterRelationships([])
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
      if (attributeScopeKeys.includes(definition.typeKey)) {
        const updatedCharacters = await fetchObjects(selectedProject.id, definition.typeKey)
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
          catalogFieldDefinitions,
        )
        setCatalogEntries((currentEntries) => [...currentEntries, createdEntry])
        setCatalogEntriesByCatalogId((currentEntries) => ({
          ...currentEntries,
          [activeCatalogId]: [...(currentEntries[activeCatalogId] ?? []), createdEntry],
        }))
        setActiveCatalogEntryId(createdEntry.id)
        setCatalogPanelPage('entry')
      } else {
        const updatedEntry = await updateCatalogEntryRequest(
          selectedProject.id,
          activeCatalogId,
          editingCatalogEntryId,
          catalogEntryDraft,
          catalogFieldDefinitions,
        )
        setCatalogEntries((currentEntries) =>
          currentEntries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
        )
        setCatalogEntriesByCatalogId((currentEntries) => ({
          ...currentEntries,
          [activeCatalogId]: (currentEntries[activeCatalogId] ?? catalogEntries).map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry,
          ),
        }))
        setActiveCatalogEntryId(updatedEntry.id)
        setCatalogPanelPage('entry')
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
    setCatalogPanelPage('entryForm')
    setCatalogEntryGroupFilter(entry.entryGroupId === null ? '__all__' : String(entry.entryGroupId))
  }

  const cancelCatalogEntryEdit = () => {
    const previousGroupId = catalogEntryDraft.entryGroupId
    setCatalogEntryDraft(createEmptyCatalogEntryDraft())
    setEditingCatalogEntryId(null)
    setCatalogPanelPage(previousGroupId === '' ? 'catalog' : 'group')
    setCatalogEntryGroupFilter(previousGroupId === '' ? '__all__' : previousGroupId)
  }

  const showCatalogEntryForm = () => {
    setCatalogEntryDraft({
      ...createEmptyCatalogEntryDraft(),
      entryGroupId: activeCatalogEntryGroup?.id === undefined ? '' : String(activeCatalogEntryGroup.id),
    })
    setEditingCatalogEntryId(null)
    setActiveCatalogEntryId(null)
    setActiveCatalogEntryMenuId(null)
    setCatalogPanelPage('entryForm')
  }

  const openReferencedCatalogEntry = (catalogId: number, entryId: number) => {
    setWorkspaceTab('database')
    setWorkspaceSection('catalogs')
    setActiveCatalogId(catalogId)
    setActiveCatalogEntryId(entryId)
    setCatalogEntryGroupFilter('__all__')
    setActiveCatalogEntryMenuId(null)
    setCatalogPanelPage('entry')
  }

  const openObjectReference = async (typeKey: ObjectTypeKey, objectId: number) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      const objects = await fetchObjects(selectedProject.id, typeKey)
      setWorkspaceTab('database')
      setWorkspaceSection(typeKey)
      setModuleSubTab('cards')
      setCharacters(objects)
      const storyObject = objects.find((currentObject) => currentObject.id === objectId) ?? null
      if (storyObject !== null) {
        setSelectedCharacter(storyObject)
        setDossierTab('main')
        setDialog('character')
      }
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateCatalogHierarchySettings = async (
    catalog: Catalog,
    supportsHierarchy: boolean,
    hierarchyMode: CatalogHierarchyMode,
  ) => {
    if (selectedProject === null) {
      return
    }

    try {
      setApiError(null)
      const updatedCatalog = await updateCatalogRequest(
        selectedProject.id,
        catalog.id,
        catalog.name,
        catalog.description ?? '',
        supportsHierarchy,
        hierarchyMode,
      )
      setCatalogs((currentCatalogs) =>
        currentCatalogs.map((currentCatalog) =>
          currentCatalog.id === updatedCatalog.id ? updatedCatalog : currentCatalog,
        ),
      )
    } catch {
      setApiError(t.apiUnavailable)
    }
  }

  const updateCatalogEntryGroupParents = async (group: CatalogEntryGroup, parentGroupIds: number[]) => {
    if (selectedProject === null || activeCatalogId === null) {
      return
    }

    try {
      setApiError(null)
      const updatedGroup = await updateCatalogEntryGroupRequest(
        selectedProject.id,
        activeCatalogId,
        group.id,
        group.name,
        parentGroupIds,
      )
      setCatalogEntryGroups((currentGroups) =>
        currentGroups.map((currentGroup) =>
          currentGroup.id === updatedGroup.id ? updatedGroup : currentGroup,
        ),
      )
    } catch {
      setApiError(t.apiUnavailable)
    }
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
      if (attributeScopeKeys.includes(group.typeKey)) {
        const removedNames = new Set(removedDefinitionNames)
        const updatedCharacters = await fetchObjects(selectedProject.id, group.typeKey)
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

  const addDraftCatalogSelection = () => {
    setDraftCatalogSelections((currentSelections) => [
      ...currentSelections,
      createEmptyDraftCatalogSelection(),
    ])
  }

  const updateDraftCatalogSelection = (
    index: number,
    selection: DraftCatalogSelection,
  ) => {
    setDraftCatalogSelections((currentSelections) =>
      currentSelections.map((currentSelection, currentIndex) =>
        currentIndex === index ? selection : currentSelection,
      ),
    )
  }

  const removeDraftCatalogSelection = (index: number) => {
    setDraftCatalogSelections((currentSelections) =>
      currentSelections.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const addDraftCharacterRelationship = () => {
    setDraftCharacterRelationships((currentRelationships) => [
      ...currentRelationships,
      createEmptyDraftCharacterRelationship(),
    ])
  }

  const updateDraftCharacterRelationship = (
    index: number,
    relationship: DraftCharacterRelationship,
  ) => {
    setDraftCharacterRelationships((currentRelationships) =>
      currentRelationships.map((currentRelationship, currentIndex) =>
        currentIndex === index ? relationship : currentRelationship,
      ),
    )
  }

  const removeDraftCharacterRelationship = (index: number) => {
    setDraftCharacterRelationships((currentRelationships) =>
      currentRelationships.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const openCatalogSelection = (selection: StoryObject['catalogSelections'][number]) => {
    setDialog(null)
    setWorkspaceTab('database')
    setWorkspaceSection('catalogs')
    setActiveCatalogId(selection.catalogId)
    setActiveCatalogEntryMenuId(null)

    if (selection.targetType === 'entry' && selection.catalogEntryId !== null) {
      setActiveCatalogEntryId(selection.catalogEntryId)
      setCatalogEntryGroupFilter('__all__')
      setCatalogPanelPage('entry')
      return
    }

    setActiveCatalogEntryId(null)
    if (selection.targetType === 'group' && selection.catalogEntryGroupId !== null) {
      setCatalogEntryGroupFilter(String(selection.catalogEntryGroupId))
      setCatalogPanelPage('group')
      return
    }

    setCatalogEntryGroupFilter('__all__')
    setCatalogPanelPage('catalog')
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

    return availableProjects.filter((project) => {
      const matchesStatus = status === 'All' || status === 'Active'
      const matchesQuery =
        normalizedQuery.length === 0 ||
        project.name.toLowerCase().includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [availableProjects, query, status])

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
          {!isWorkspace && currentUser !== null && (
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                setEditingProject(null)
                setProjectName('')
                setProjectCoverImagePath(null)
                setEnabledObjectTypeKeys([...defaultProjectObjectTypeKeys])
                setSelectedProjectPresetKeys([])
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
          {currentUser === null ? (
            <button
              className="secondary-action"
              type="button"
              onClick={() => setDialog('auth')}
            >
              {t.auth}
            </button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => void logout()}>
              {currentUser.displayName} / {t.logout}
            </button>
          )}
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

          {currentUser === null && !isLoading && apiError === null && (
            <section className="empty-state" aria-live="polite">
              <h2>{t.notSignedIn}</h2>
              <button className="primary-action" type="button" onClick={() => setDialog('auth')}>
                {t.signInAction}
              </button>
            </section>
          )}

          {currentUser !== null && visibleProjects.length === 0 && !isLoading && (
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
                  isObjectWorkspaceSection &&
                  moduleSubTab === 'cards' && (
                  <button
                    className="primary-action compact"
                    type="button"
                    onClick={() => {
                      setEditingCharacter(null)
                      setEditorTab('main')
                      setSaveObjectAsTimelineChange(false)
                      setEditorTimelineEventId('')
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
                      setDraftCatalogSelections([])
                      setDraftOwnedItemIds([])
                      setDraftOwnerCharacterIds([])
                      setDraftTerritoryPlaceIds([])
                      setDraftOwnerOrganizationIds([])
                      setDraftParentObjectIds([])
                      setDraftCharacterRelationships([])
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
                    {`${t.newCharacter}: ${currentObjectTypeLabel}`}
                  </button>
                )}
                {workspaceTab === 'database' && (
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
                )}
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
                catalogEntriesByCatalogId={catalogEntriesByCatalogId}
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
                onCatalogHierarchySettingsChange={(catalog, supportsHierarchy, hierarchyMode) =>
                  void updateCatalogHierarchySettings(catalog, supportsHierarchy, hierarchyMode)
                }
                onCatalogEntryGroupParentsChange={(group, parentGroupIds) =>
                  void updateCatalogEntryGroupParents(group, parentGroupIds)
                }
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
                onOpenReferencedCatalogEntry={openReferencedCatalogEntry}
                onSaveNameEdit={() => void saveInlineNameEdit()}
                onStartNameEdit={startInlineNameEdit}
                onShowTemplate={() => {
                  setCatalogPanelPage('template')
                  setActiveCatalogEntryId(null)
                  setActiveCatalogEntryMenuId(null)
                }}
                onShowEntryForm={showCatalogEntryForm}
              />
            )}

            {workspaceTab === 'relations' && (
              <section className="relationships-workspace">
                <aside className="relationships-legend">
                  <h3>{t.relations}</h3>
                  {relationshipLegend.length === 0 ? (
                    <p className="empty-state compact">{t.relationGraphEmpty}</p>
                  ) : (
                    relationshipLegend.map((relationType) => (
                      <div className="legend-row" key={relationType}>
                        <span
                          className="legend-line"
                          style={{ background: getRelationshipColor(relationType) }}
                        />
                        <span>{relationType}</span>
                      </div>
                    ))
                  )}
                  <p className="relationship-hint">{t.relationGraphHint}</p>
                </aside>
                <div className="relationships-canvas" aria-label={t.relations}>
                  <ReactFlow
                    nodes={relationshipNodes}
                    edges={relationshipEdges}
                    onNodesChange={onRelationshipNodesChange}
                    onEdgesChange={onRelationshipEdgesChange}
                    onNodeClick={handleRelationshipNodeClick}
                    onEdgeClick={handleRelationshipEdgeClick}
                    fitView
                    fitViewOptions={{ padding: 0.24 }}
                    minZoom={0.35}
                    maxZoom={1.8}
                    nodesDraggable
                    panOnDrag
                    zoomOnScroll
                  >
                    <Background color="var(--page-grid)" gap={24} />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
                <aside className="relationships-details">
                  {selectedGraphRelationship === null ? (
                    <p className="empty-state compact">{t.relationGraphHint}</p>
                  ) : (
                    <article className="relationship-detail-card">
                      <h3>{selectedGraphRelationship.relationType}</h3>
                      <button
                        className="inline-link-button"
                        type="button"
                        onClick={() =>
                          void openObjectReference(
                            'characters',
                            selectedGraphRelationship.character.id,
                          )
                        }
                      >
                        {selectedGraphRelationship.character.name}
                      </button>
                      <div className="relationship-meter-row">
                        <span>{t.relationshipStrength}</span>
                        <meter min={0} max={100} value={selectedGraphRelationship.strength} />
                        <b>{selectedGraphRelationship.strength}%</b>
                      </div>
                      <div className="relationship-meter-row">
                        <span>{t.relationshipTension}</span>
                        <meter min={0} max={100} value={selectedGraphRelationship.tension} />
                        <b>{selectedGraphRelationship.tension}%</b>
                      </div>
                      {selectedGraphRelationship.description !== null && (
                        <p>{selectedGraphRelationship.description}</p>
                      )}
                    </article>
                  )}
                </aside>
              </section>
            )}

            {workspaceTab === 'timeline' && (
              <section className="timeline-workspace">
                <div className="timeline-events-panel">
                  <div className="timeline-panel-header">
                    <div>
                      <h3>{t.timelineEvents}</h3>
                      <p>{timelineEvents.length}</p>
                    </div>
                    <button
                      className="secondary-action compact"
                      type="button"
                      onClick={resetTimelineEventDraft}
                    >
                      {t.newTimelineEvent}
                    </button>
                  </div>
                  {timelineEvents.length === 0 ? (
                    <p className="empty-state compact">{t.noTimelineEvents}</p>
                  ) : (
                    <div className="timeline-event-list">
                      {timelineEvents.map((timelineEvent) => (
                        <button
                          className={
                            activeTimelineEventId === timelineEvent.id
                              ? 'timeline-event-card is-active'
                              : 'timeline-event-card'
                          }
                          key={timelineEvent.id}
                          type="button"
                          onClick={() => setActiveTimelineEventId(timelineEvent.id)}
                        >
                          <span
                            className="timeline-event-color"
                            style={{ background: timelineEvent.color ?? 'var(--accent)' }}
                          />
                          <strong>{timelineEvent.title}</strong>
                          <small>
                            {[timelineEvent.startLabel, timelineEvent.endLabel]
                              .filter(Boolean)
                              .join(' - ') || t.eventPeriod}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <section className="timeline-board-panel" aria-label={t.timelineTab}>
                  <div className="timeline-panel-header">
                    <div>
                      <h3>{t.timelineTab}</h3>
                      <p>
                        {activeTimelineEvent === null
                          ? t.noTimelineEvents
                          : activeTimelineEvent.title}
                      </p>
                    </div>
                    <div className="timeline-zoom-controls" role="group" aria-label={t.timelineTab}>
                      <button
                        className="secondary-action compact"
                        type="button"
                        onClick={() => setTimelineZoom((zoom) => Math.max(0.5, zoom - 0.25))}
                      >
                        -
                      </button>
                      <span>{Math.round(timelineZoom * 100)}%</span>
                      <button
                        className="secondary-action compact"
                        type="button"
                        onClick={() => setTimelineZoom((zoom) => Math.min(3, zoom + 0.25))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div
                    className="horizontal-timeline"
                    ref={timelineBoardRef}
                    onMouseDown={(event) => {
                      const target = event.target as HTMLElement
                      if (target.closest('button') !== null) {
                        return
                      }

                      const board = timelineBoardRef.current
                      if (board === null) {
                        return
                      }

                      timelineDragStateRef.current = {
                        isDragging: true,
                        startX: event.clientX,
                        scrollLeft: board.scrollLeft,
                      }
                    }}
                    onMouseLeave={() => {
                      timelineDragStateRef.current.isDragging = false
                    }}
                    onMouseMove={(event) => {
                      const board = timelineBoardRef.current
                      if (board === null || !timelineDragStateRef.current.isDragging) {
                        return
                      }

                      const deltaX = event.clientX - timelineDragStateRef.current.startX
                      board.scrollLeft = timelineDragStateRef.current.scrollLeft - deltaX
                    }}
                    onMouseUp={() => {
                      timelineDragStateRef.current.isDragging = false
                    }}
                    onWheel={(event) => {
                      if (!event.ctrlKey) {
                        return
                      }

                      event.preventDefault()
                      setTimelineZoom((zoom) =>
                        Math.min(3, Math.max(0.5, zoom + (event.deltaY > 0 ? -0.15 : 0.15))),
                      )
                    }}
                  >
                    <div
                      className="horizontal-timeline-inner"
                      style={{ width: `${timelineLayout.width}px` }}
                    >
                      <div className="timeline-axis" />
                      {timelineLayout.ticks.map((tick) => (
                        <div
                          className="timeline-tick"
                          key={`${tick.value}-${tick.left}`}
                          style={{ left: `${tick.left}px` }}
                        >
                          <span />
                          <small>{Number.isInteger(tick.value) ? tick.value : tick.value.toFixed(1)}</small>
                        </div>
                      ))}
                      {timelineLayout.items.map((item) => {
                        const isRange = item.end > item.start
                        const eventColor = item.event.color ?? 'var(--accent)'

                        return (
                          <button
                            className={
                              activeTimelineEventId === item.event.id
                                ? 'timeline-node is-active'
                                : 'timeline-node'
                            }
                            key={item.event.id}
                            style={{
                              left: `${item.left}px`,
                              top: `${54 + item.lane * 78}px`,
                              width: `${isRange ? item.width : 18}px`,
                              borderColor: eventColor,
                              background: isRange
                                ? `color-mix(in srgb, ${eventColor} 18%, var(--surface))`
                                : eventColor,
                            }}
                            type="button"
                            onClick={() => setActiveTimelineEventId(item.event.id)}
                            onDoubleClick={() => editTimelineEvent(item.event)}
                          >
                            <span className="timeline-node-label">
                              <strong>{item.event.title}</strong>
                              <small>
                                {[item.event.startLabel, item.event.endLabel]
                                  .filter(Boolean)
                                  .join(' - ') || item.start}
                              </small>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </section>

                <form className="timeline-editor-panel" onSubmit={saveTimelineEvent}>
                  <div className="timeline-panel-header">
                    <div>
                      <h3>
                        {editingTimelineEventId === null
                          ? t.newTimelineEvent
                          : t.editTimelineEvent}
                      </h3>
                      {activeTimelineEvent !== null && (
                        <p>{activeTimelineEvent.title}</p>
                      )}
                    </div>
                    {activeTimelineEvent !== null && (
                      <div className="timeline-editor-actions">
                        <button
                          className="secondary-action compact"
                          type="button"
                          onClick={() => editTimelineEvent(activeTimelineEvent)}
                        >
                          {t.edit}
                        </button>
                        <button
                          className="secondary-action compact danger-action"
                          type="button"
                          onClick={() =>
                            setPendingDelete({ kind: 'timelineEvent', item: activeTimelineEvent })
                          }
                        >
                          {t.delete}
                        </button>
                      </div>
                    )}
                  </div>

                  {formError !== null && (
                    <div className="form-error" role="alert">
                      {formError}
                    </div>
                  )}

                  <div className="timeline-form-grid">
                    <label className="project-name-field">
                      <span>{t.eventTitle}</span>
                      <input
                        type="text"
                        value={timelineEventDraft.title}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            title: event.target.value,
                          }))
                        }
                        placeholder={t.eventTitlePlaceholder}
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventCategory}</span>
                      <input
                        type="text"
                        value={timelineEventDraft.category}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            category: event.target.value,
                          }))
                        }
                        placeholder={t.eventCategory}
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventStartLabel}</span>
                      <input
                        type="text"
                        value={timelineEventDraft.startLabel}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            startLabel: event.target.value,
                          }))
                        }
                        placeholder="Глава 1"
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventEndLabel}</span>
                      <input
                        type="text"
                        value={timelineEventDraft.endLabel}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            endLabel: event.target.value,
                          }))
                        }
                        placeholder="Глава 2"
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventStartValue}</span>
                      <input
                        type="number"
                        value={timelineEventDraft.startValue}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            startValue: event.target.value,
                          }))
                        }
                        placeholder="1"
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventEndValue}</span>
                      <input
                        type="number"
                        value={timelineEventDraft.endValue}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            endValue: event.target.value,
                          }))
                        }
                        placeholder="2"
                      />
                    </label>
                    <label className="project-name-field">
                      <span>{t.eventColor}</span>
                      <input
                        type="color"
                        value={timelineEventDraft.color}
                        onChange={(event) =>
                          setTimelineEventDraft((draft) => ({
                            ...draft,
                            color: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="project-name-field character-description-field">
                    <span>{t.description}</span>
                    <textarea
                      value={timelineEventDraft.description}
                      onChange={(event) =>
                        setTimelineEventDraft((draft) => ({
                          ...draft,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t.descriptionPlaceholder}
                    />
                  </label>

                  <section className="timeline-linked-section">
                    <div className="timeline-panel-header">
                      <h3>{t.eventParticipants}</h3>
                      <button
                        className="secondary-action compact"
                        type="button"
                        onClick={addTimelineParticipant}
                        disabled={timelineTargetObjects.length === 0}
                      >
                        {t.addEventParticipant}
                      </button>
                    </div>
                    {timelineEventDraft.participants.map((participant, index) => (
                      <div className="timeline-linked-row" key={`participant-${index}`}>
                        <label className="project-name-field">
                          <span>{t.eventParticipants}</span>
                          <select
                            value={`${participant.targetType}:${participant.targetId}`}
                            onChange={(event) => {
                              const [targetType, targetId] = event.target.value.split(':')
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                participants: draft.participants.map((currentParticipant, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentParticipant, targetType, targetId }
                                    : currentParticipant,
                                ),
                              }))
                            }}
                          >
                            {timelineTargetObjects.map((storyObject) => (
                              <option
                                key={`${storyObject.typeKey}-${storyObject.id}`}
                                value={`${storyObject.targetType}:${storyObject.id}`}
                              >
                                {t[storyObject.typeKey as ObjectTypeKey]}: {storyObject.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="project-name-field">
                          <span>{t.participantRole}</span>
                          <input
                            type="text"
                            value={participant.role}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                participants: draft.participants.map((currentParticipant, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentParticipant, role: event.target.value }
                                    : currentParticipant,
                                ),
                              }))
                            }
                          />
                        </label>
                        <button
                          className="danger-icon"
                          type="button"
                          onClick={() => removeTimelineParticipant(index)}
                        >
                          <Trash2 size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    ))}
                  </section>

                  <section className="timeline-linked-section">
                    <div className="timeline-panel-header">
                      <h3>{t.eventChanges}</h3>
                      <button
                        className="secondary-action compact"
                        type="button"
                        onClick={addTimelineChange}
                        disabled={timelineTargetObjects.length === 0}
                      >
                        {t.addEventChange}
                      </button>
                    </div>
                    {timelineEventDraft.changes.map((change, index) => (
                      <div className="timeline-change-row" key={`change-${index}`}>
                        <label className="project-name-field">
                          <span>{t.changeType}</span>
                          <select
                            value={change.changeType}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                        ...currentChange,
                                        changeType: event.target.value as TimelineChangeType,
                                      }
                                    : currentChange,
                                ),
                              }))
                            }
                          >
                            {timelineChangeTypes.map((changeType) => (
                              <option key={changeType} value={changeType}>
                                {timelineChangeTypeLabels[changeType]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="project-name-field">
                          <span>{t.eventParticipants}</span>
                          <select
                            value={`${change.targetType}:${change.targetId}`}
                            onChange={(event) => {
                              const [targetType, targetId] = event.target.value.split(':')
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentChange, targetType, targetId }
                                    : currentChange,
                                ),
                              }))
                            }}
                          >
                            {timelineTargetObjects.map((storyObject) => (
                              <option
                                key={`${storyObject.typeKey}-${storyObject.id}`}
                                value={`${storyObject.targetType}:${storyObject.id}`}
                              >
                                {t[storyObject.typeKey as ObjectTypeKey]}: {storyObject.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="project-name-field">
                          <span>{t.changeFieldName}</span>
                          <input
                            type="text"
                            value={change.fieldName}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentChange, fieldName: event.target.value }
                                    : currentChange,
                                ),
                              }))
                            }
                          />
                        </label>
                        <label className="project-name-field">
                          <span>{t.oldValue}</span>
                          <input
                            type="text"
                            value={change.oldValue}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentChange, oldValue: event.target.value }
                                    : currentChange,
                                ),
                              }))
                            }
                          />
                        </label>
                        <label className="project-name-field">
                          <span>{t.newValue}</span>
                          <input
                            type="text"
                            value={change.newValue}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentChange, newValue: event.target.value }
                                    : currentChange,
                                ),
                              }))
                            }
                          />
                        </label>
                        <label className="project-name-field timeline-change-notes">
                          <span>{t.changeNotes}</span>
                          <input
                            type="text"
                            value={change.notes}
                            onChange={(event) =>
                              setTimelineEventDraft((draft) => ({
                                ...draft,
                                changes: draft.changes.map((currentChange, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentChange, notes: event.target.value }
                                    : currentChange,
                                ),
                              }))
                            }
                          />
                        </label>
                        <button
                          className="danger-icon"
                          type="button"
                          onClick={() => removeTimelineChange(index)}
                        >
                          <Trash2 size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    ))}
                  </section>

                  <button className="primary-action" type="submit">
                    {editingTimelineEventId === null ? t.newTimelineEvent : t.save}
                  </button>
                </form>
              </section>
            )}

            {workspaceTab === 'database' && moduleSubTab === 'cards' && isObjectWorkspaceSection && (
              <div className={layoutMode === 'grid' ? 'folder-view grid' : 'folder-view list'}>
              {workspaceTab === 'database' &&
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
                      setDossierTab('main')
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
                      ? authMode === 'login'
                        ? t.signInPlaceholder
                        : t.registerTitle
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

            {dialog === 'auth' && (
              <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
                <p className="auth-note">{t.authSubtitle}</p>
                <label className="project-name-field">
                  <span>{t.authEmail}</span>
                  <input
                    autoComplete="email"
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder={t.authEmailPlaceholder}
                    required
                  />
                </label>
                <label className="project-name-field">
                  <span>{t.authPassword}</span>
                  <input
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder={t.authPasswordPlaceholder}
                    minLength={6}
                    required
                  />
                </label>
                {authMode === 'register' && (
                  <label className="project-name-field">
                    <span>{t.authDisplayName}</span>
                    <input
                      autoComplete="name"
                      value={authDisplayName}
                      onChange={(event) => setAuthDisplayName(event.target.value)}
                      placeholder={t.authDisplayNamePlaceholder}
                    />
                  </label>
                )}
                <div className="auth-actions">
                  <button className="primary-action" type="submit">
                    {authMode === 'login' ? t.signInAction : t.registerAction}
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => {
                      setFormError(null)
                      setAuthMode((mode) => (mode === 'login' ? 'register' : 'login'))
                    }}
                  >
                    {authMode === 'login' ? t.switchToRegister : t.switchToLogin}
                  </button>
                </div>
              </form>
            )}

            {dialog === 'character' && selectedCharacter !== null && displayedDossierObject !== null && (
              <section className="character-dossier">
                {resolveAssetUrl(displayedDossierObject.imagePath) === null ? (
                  <div className="character-portrait dossier-portrait" aria-hidden="true">
                    {displayedDossierObject.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </div>
                ) : (
                  <div className="character-portrait dossier-portrait" aria-hidden="true">
                    <img src={resolveAssetUrl(displayedDossierObject.imagePath) ?? undefined} alt="" />
                  </div>
                )}
                <div className="dossier-fields">
                  <div>
                    <p className="setting-label">
                      {t[displayedDossierObject.typeKey as ObjectTypeKey] ?? displayedDossierObject.typeKey}
                    </p>
                    <h3>
                      {displayedDossierObject.name}
                      {displayedDossierObject.surname !== null && (
                        <span className="dossier-surname"> {displayedDossierObject.surname}</span>
                      )}
                    </h3>
                  </div>
                  {displayedDossierObject.typeKey === 'characters' && (
                    <dl className="character-detail-summary">
                      <div>
                        <dt>{t.characterAge}</dt>
                        <dd>{displayedDossierObject.age ?? '-'}</dd>
                      </div>
                      <div>
                        <dt>{t.characterRole}</dt>
                        <dd>{displayedDossierObject.role ?? '-'}</dd>
                      </div>
                    </dl>
                  )}
                  <div>
                    <p className="setting-label">{t.description}</p>
                    <p>{displayedDossierObject.description}</p>
                  </div>
                  <label className="project-name-field dossier-time-context">
                    <span>{t.timelineContext}</span>
                    <select
                      value={dossierTimelineContextEventId}
                      onChange={(event) => setDossierTimelineContextEventId(event.target.value)}
                    >
                      <option value="">{t.currentData}</option>
                      {selectedObjectTimelineEvents.map((timelineEvent) => (
                        <option key={timelineEvent.id} value={timelineEvent.id}>
                          {timelineEvent.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="modal-tabs object-dialog-tabs" role="group" aria-label={t.dossier}>
                    {([
                      ['main', t.mainTab],
                      ['relations', t.linksTab],
                      ['timeline', t.timelineTab],
                      ['gallery', t.galleryTab],
                    ] as const).map(([tabKey, label]) => (
                      <button
                        className={dossierTab === tabKey ? 'modal-tab is-active' : 'modal-tab'}
                        key={tabKey}
                        type="button"
                        onClick={() => setDossierTab(tabKey)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="dossier-data-blocks">
                  {dossierTab === 'main' && (
                    <>
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
                  {selectedCharacter.catalogSelections.length > 0 && (
                    <section className="dossier-attributes-section">
                      <h4>{t.catalogValues}</h4>
                      <div className="catalog-reference-values">
                        {selectedCharacter.catalogSelections.map((selection) => (
                          <button
                            className="inline-link-button"
                            key={`${selection.targetType}-${selection.catalogId}-${selection.catalogEntryGroupId ?? 0}-${selection.catalogEntryId ?? 0}`}
                            type="button"
                            onClick={() => openCatalogSelection(selection)}
                          >
                            {selection.targetType === 'entry'
                              ? selection.catalogEntryName
                              : selection.targetType === 'group'
                                ? selection.catalogEntryGroupName
                                : selection.catalogName}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                    </>
                  )}
                  {dossierTab === 'relations' && (
                    <>
                  {selectedCharacter.typeKey === 'characters' &&
                    (selectedCharacter.outgoingCharacterRelationships.length > 0 ||
                      selectedCharacter.incomingCharacterRelationships.length > 0) && (
                      <section className="dossier-attributes-section">
                        <h4>{t.characterRelationships}</h4>
                        <div className="relationship-summary-list">
                          {[
                            ...selectedCharacter.outgoingCharacterRelationships,
                            ...selectedCharacter.incomingCharacterRelationships,
                          ].map((relationship) => (
                            <article className="relationship-summary-card" key={`${relationship.direction}-${relationship.id}`}>
                              <button
                                className="inline-link-button"
                                type="button"
                                onClick={() =>
                                  void openObjectReference('characters', relationship.character.id)
                                }
                              >
                                {relationship.character.name}
                              </button>
                              <strong>{relationship.relationType}</strong>
                              <div className="relationship-meter-row">
                                <span>{t.relationshipStrength}</span>
                                <meter min={0} max={100} value={relationship.strength} />
                                <b>{relationship.strength}%</b>
                              </div>
                              <div className="relationship-meter-row">
                                <span>{t.relationshipTension}</span>
                                <meter min={0} max={100} value={relationship.tension} />
                                <b>{relationship.tension}%</b>
                              </div>
                              {relationship.description !== null && (
                                <p>{relationship.description}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    )}
                  {selectedCharacter.ownedItems.length > 0 && (
                    <section className="dossier-attributes-section">
                      <h4>{t.ownedItems}</h4>
                      <div className="catalog-reference-values">
                        {selectedCharacter.ownedItems.map((item) => (
                          <button
                            className="inline-link-button"
                            key={item.id}
                            type="button"
                            onClick={() => void openObjectReference('items', item.id)}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {selectedCharacter.owners.length > 0 && (
                    <section className="dossier-attributes-section">
                      <h4>{t.itemOwners}</h4>
                      <div className="catalog-reference-values">
                        {selectedCharacter.owners.map((owner) => (
                          <button
                            className="inline-link-button"
                            key={owner.id}
                            type="button"
                            onClick={() => void openObjectReference('characters', owner.id)}
                          >
                            {owner.name}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {[
                    { title: t.territoryPlaces, values: selectedCharacter.territoryPlaces },
                    { title: t.organizationsOnTerritory, values: selectedCharacter.organizationsOnTerritory },
                    { title: t.ownerOrganizations, values: selectedCharacter.ownerOrganizations },
                    { title: t.ownedTerritories, values: selectedCharacter.ownedTerritories },
                    { title: t.objectHierarchyParents, values: selectedCharacter.hierarchyParents },
                    { title: t.objectHierarchyChildren, values: selectedCharacter.hierarchyChildren },
                  ]
                    .filter((group) => group.values.length > 0)
                    .map((group) => (
                      <section className="dossier-attributes-section" key={group.title}>
                        <h4>{group.title}</h4>
                        <div className="catalog-reference-values">
                          {group.values.map((objectReference) => (
                            <button
                              className="inline-link-button"
                              key={`${group.title}-${objectReference.id}`}
                              type="button"
                              onClick={() =>
                                void openObjectReference(
                                  objectReference.typeKey as ObjectTypeKey,
                                  objectReference.id,
                                )
                              }
                            >
                              {objectReference.name}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                    </>
                  )}
                  {dossierTab === 'timeline' && (
                    <section className="dossier-attributes-section">
                      <h4>{t.objectTimelineEvents}</h4>
                      {selectedObjectTimelineEvents.length === 0 ? (
                        <p className="empty-state compact">{t.noObjectTimelineEvents}</p>
                      ) : (
                        <div className="relationship-summary-list">
                          {selectedObjectTimelineEvents.map((timelineEvent) => (
                            <article className="relationship-summary-card" key={timelineEvent.id}>
                              <button
                                className="inline-link-button"
                                type="button"
                                onClick={() => {
                                  setActiveTimelineEventId(timelineEvent.id)
                                  setWorkspaceTab('timeline')
                                  closeDialog()
                                }}
                              >
                                {timelineEvent.title}
                              </button>
                              <strong>
                                {[timelineEvent.startLabel, timelineEvent.endLabel]
                                  .filter(Boolean)
                                  .join(' - ') || t.eventPeriod}
                              </strong>
                              {timelineEvent.participants
                                .filter(
                                  (participant) =>
                                    participant.targetType === 'storyObject' &&
                                    participant.targetId === selectedCharacter.id &&
                                    participant.role !== null,
                                )
                                .map((participant) => (
                                  <p key={participant.id}>{participant.role}</p>
                                ))}
                            </article>
                          ))}
                        </div>
                      )}
                      {dossierTimelineContextEvent !== null && (
                        <section className="timeline-context-changes">
                          <h4>{dossierTimelineContextEvent.title}</h4>
                          {[
                            { title: t.timelineFieldChanges, changes: dossierTimelineChangesByType.fields },
                            { title: t.timelineRelationChanges, changes: dossierTimelineChangesByType.relations },
                            { title: t.timelineCatalogChanges, changes: dossierTimelineChangesByType.catalogs },
                            { title: t.timelineOtherChanges, changes: dossierTimelineChangesByType.other },
                          ]
                            .filter((group) => group.changes.length > 0)
                            .map((group) => (
                              <section className="timeline-change-group" key={group.title}>
                                <h5>{group.title}</h5>
                                <dl className="attribute-list grouped">
                                  {group.changes.map((change) => (
                                    <div key={change.id}>
                                      <dt>
                                        {change.fieldName ?? change.fieldKey ?? timelineChangeTypeLabels[change.changeType]}
                                      </dt>
                                      <dd>
                                        <span className="timeline-change-type">
                                          {timelineChangeTypeLabels[change.changeType]}
                                        </span>
                                        {(change.oldValueJson ?? '-') + ' -> ' + (change.newValueJson ?? '-')}
                                        {change.notes !== null && (
                                          <small>{change.notes}</small>
                                        )}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </section>
                            ))}
                        </section>
                      )}
                    </section>
                  )}
                  {dossierTab === 'gallery' && (
                    <section className="dossier-attributes-section">
                      <h4>{t.galleryTab}</h4>
                      <div className="gallery-upload-row">
                        <ImageDropzone
                          imagePath={galleryImagePath}
                          label={t.addGalleryImage}
                          placeholder={t.coverDropzone}
                          onChange={setGalleryImagePath}
                          onError={() => setApiError(t.imageUploadFailed)}
                        />
                        <label className="project-name-field">
                          <span>{t.galleryImageCaption}</span>
                          <input
                            type="text"
                            value={galleryImageCaption}
                            onChange={(event) => setGalleryImageCaption(event.target.value)}
                            placeholder={t.galleryCaptionPlaceholder}
                          />
                        </label>
                        <button
                          className="primary-action"
                          type="button"
                          disabled={galleryImagePath === null}
                          onClick={() => void addGalleryImage()}
                        >
                          {t.addGalleryImage}
                        </button>
                      </div>
                      {selectedCharacter.galleryImages.length === 0 ? (
                        <p className="empty-state compact">{t.galleryEmpty}</p>
                      ) : (
                        <div className="object-gallery-grid">
                          {selectedCharacter.galleryImages.map((image) => (
                            <article className="object-gallery-card" key={image.id}>
                              <img src={resolveAssetUrl(image.imagePath) ?? undefined} alt="" />
                              <input
                                type="text"
                                defaultValue={image.caption ?? ''}
                                placeholder={t.galleryCaptionPlaceholder}
                                onBlur={(event) =>
                                  void updateGalleryImageCaption(
                                    image.id,
                                    image.imagePath,
                                    event.target.value,
                                  )
                                }
                              />
                              <button
                                className="icon-action danger-icon"
                                type="button"
                                aria-label={t.delete}
                                title={t.delete}
                                onClick={() => void deleteGalleryImage(image.id)}
                              >
                                <Trash2 size={16} strokeWidth={2.2} />
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
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
                <div className="modal-tabs object-dialog-tabs" role="group" aria-label={t.newCharacter}>
                  {([
                    ['main', t.mainTab],
                    ['relations', t.linksTab],
                    ['timeline', t.timelineTab],
                  ] as const).map(([tabKey, label]) => (
                    <button
                      className={editorTab === tabKey ? 'modal-tab is-active' : 'modal-tab'}
                      key={tabKey}
                      type="button"
                      onClick={() => setEditorTab(tabKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {editorTab === 'main' && (
                  <>
                <ImageDropzone
                  imagePath={characterImagePath}
                  label={t.cover}
                  placeholder={t.coverDropzone}
                  onChange={setCharacterImagePath}
                  onError={() => setApiError(t.imageUploadFailed)}
                />

                <div className="character-detail-fields">
                  <label className="project-name-field">
                    <span>{dialogObjectTypeKey === 'characters' ? t.characterName : t.objectName}</span>
                    <input
                      type="text"
                      value={characterName}
                      onChange={(event) => setCharacterName(event.target.value)}
                      placeholder={
                        dialogObjectTypeKey === 'characters'
                          ? t.characterNamePlaceholder
                          : t.objectName
                      }
                    />
                  </label>

                  {dialogObjectTypeKey === 'characters' && (
                    <>
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
                    </>
                  )}
                </div>

                <label className="project-name-field character-description-field">
                  <span>{t.description}</span>
                  <textarea
                    value={characterDescription}
                    onChange={(event) => setCharacterDescription(event.target.value)}
                    placeholder={t.descriptionPlaceholder}
                  />
                </label>
                  </>
                )}

                <div className="character-data-blocks">
                {editorTab === 'main' && (
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
                )}
                {editorTab === 'main' && isHierarchyModuleEnabled && (
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
                {editorTab === 'relations' &&
                  (dialogObjectTypeKey === 'characters' || dialogObjectTypeKey === 'items') && (
                  <section className="attribute-editor collapsible-block">
                    <div className="attribute-editor-header">
                      <div className="collapse-heading static-heading">
                        {dialogObjectTypeKey === 'characters' ? t.ownedItems : t.itemOwners}
                      </div>
                    </div>
                    <div className="attribute-editor-body">
                      {dialogObjectTypeKey === 'characters' && (
                        <label className="hierarchy-selection-field">
                          <span>{t.ownedItems}</span>
                          <select
                            multiple
                            value={draftOwnedItemIds.map(String)}
                            onChange={(event) =>
                              setDraftOwnedItemIds(
                                Array.from(event.target.selectedOptions).map((option) =>
                                  Number(option.value),
                                ),
                              )
                            }
                          >
                            {ownershipItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {dialogObjectTypeKey === 'items' && (
                        <label className="hierarchy-selection-field">
                          <span>{t.itemOwners}</span>
                          <select
                            multiple
                            value={draftOwnerCharacterIds.map(String)}
                            onChange={(event) =>
                              setDraftOwnerCharacterIds(
                                Array.from(event.target.selectedOptions).map((option) =>
                                  Number(option.value),
                                ),
                              )
                            }
                          >
                            {ownershipCharacters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </section>
                )}
                {editorTab === 'relations' && dialogObjectTypeKey === 'characters' && (
                  <section className="attribute-editor collapsible-block">
                    <div className="attribute-editor-header">
                      <div className="collapse-heading static-heading">{t.characterRelationships}</div>
                      <button
                        className="secondary-action compact"
                        type="button"
                        onClick={addDraftCharacterRelationship}
                      >
                        {t.addCharacterRelationship}
                      </button>
                    </div>
                    <div className="attribute-editor-body">
                      {draftCharacterRelationships.length === 0 && (
                        <p className="empty-state compact">{t.noCharacterRelationships}</p>
                      )}
                      {draftCharacterRelationships.map((relationship, index) => {
                        const relatedCharacterId =
                          relationship.direction === 'incoming'
                            ? relationship.sourceCharacterId
                            : relationship.targetCharacterId

                        return (
                        <section className="relationship-editor-card" key={index}>
                          <div className="relationship-editor-grid">
                            <label className="project-name-field">
                              <span>Направление</span>
                              <select
                                value={relationship.direction}
                                onChange={(event) => {
                                  const direction = event.target.value as DraftCharacterRelationship['direction']
                                  updateDraftCharacterRelationship(index, {
                                    ...relationship,
                                    direction,
                                    sourceCharacterId:
                                      direction === 'incoming'
                                        ? relatedCharacterId
                                        : editingCharacter === null
                                          ? ''
                                          : String(editingCharacter.id),
                                    targetCharacterId:
                                      direction === 'incoming'
                                        ? editingCharacter === null
                                          ? ''
                                          : String(editingCharacter.id)
                                        : relatedCharacterId,
                                  })
                                }}
                              >
                                <option value="outgoing">От этого персонажа</option>
                                <option value="incoming" disabled={editingCharacter === null}>
                                  К этому персонажу
                                </option>
                              </select>
                            </label>
                            <label className="project-name-field">
                              <span>{t.relatedCharacter}</span>
                              <select
                                value={relatedCharacterId}
                                onChange={(event) =>
                                  updateDraftCharacterRelationship(index, {
                                    ...relationship,
                                    sourceCharacterId:
                                      relationship.direction === 'incoming'
                                        ? event.target.value
                                        : editingCharacter === null
                                          ? ''
                                          : String(editingCharacter.id),
                                    targetCharacterId:
                                      relationship.direction === 'incoming'
                                        ? editingCharacter === null
                                          ? ''
                                          : String(editingCharacter.id)
                                        : event.target.value,
                                  })
                                }
                              >
                                <option value="">{t.relatedCharacter}</option>
                                {ownershipCharacters
                                  .filter((character) => character.id !== editingCharacter?.id)
                                  .map((character) => (
                                    <option key={character.id} value={character.id}>
                                      {character.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label className="project-name-field">
                              <span>{t.relationshipType}</span>
                              <input
                                type="text"
                                value={relationship.relationType}
                                onChange={(event) =>
                                  updateDraftCharacterRelationship(index, {
                                    ...relationship,
                                    relationType: event.target.value,
                                  })
                                }
                                placeholder={t.relationshipTypePlaceholder}
                              />
                            </label>
                            <label className="project-name-field">
                              <span>{t.relationshipStrength}</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={relationship.strength}
                                onChange={(event) =>
                                  updateDraftCharacterRelationship(index, {
                                    ...relationship,
                                    strength: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="project-name-field">
                              <span>{t.relationshipTension}</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={relationship.tension}
                                onChange={(event) =>
                                  updateDraftCharacterRelationship(index, {
                                    ...relationship,
                                    tension: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={relationship.isBidirectional}
                              onChange={(event) =>
                                updateDraftCharacterRelationship(index, {
                                  ...relationship,
                                  isBidirectional: event.target.checked,
                                })
                              }
                            />
                            <span>{t.relationshipMutual}</span>
                          </label>
                          <label className="project-name-field character-description-field">
                            <span>{t.relationshipDescription}</span>
                            <textarea
                              value={relationship.description}
                              onChange={(event) =>
                                updateDraftCharacterRelationship(index, {
                                  ...relationship,
                                  description: event.target.value,
                                })
                              }
                              placeholder={t.relationshipDescription}
                            />
                          </label>
                          <button
                            className="secondary-action compact danger-action"
                            type="button"
                            onClick={() => removeDraftCharacterRelationship(index)}
                          >
                            {t.delete}
                          </button>
                        </section>
                        )
                      })}
                    </div>
                  </section>
                )}
                {editorTab === 'relations' &&
                  (dialogObjectTypeKey === 'places' || dialogObjectTypeKey === 'organizations') && (
                  <section className="attribute-editor collapsible-block">
                    <div className="attribute-editor-header">
                      <div className="collapse-heading static-heading">{t.objectRelations}</div>
                    </div>
                    <div className="attribute-editor-body">
                      {dialogObjectTypeKey === 'organizations' && (
                        <label className="hierarchy-selection-field">
                          <span>{t.territoryPlaces}</span>
                          <select
                            multiple
                            value={draftTerritoryPlaceIds.map(String)}
                            onChange={(event) =>
                              setDraftTerritoryPlaceIds(
                                Array.from(event.target.selectedOptions).map((option) =>
                                  Number(option.value),
                                ),
                              )
                            }
                          >
                            {relationPlaces.map((place) => (
                              <option key={place.id} value={place.id}>
                                {place.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {dialogObjectTypeKey === 'places' && (
                        <label className="hierarchy-selection-field">
                          <span>{t.ownerOrganizations}</span>
                          <select
                            multiple
                            value={draftOwnerOrganizationIds.map(String)}
                            onChange={(event) =>
                              setDraftOwnerOrganizationIds(
                                Array.from(event.target.selectedOptions).map((option) =>
                                  Number(option.value),
                                ),
                              )
                            }
                          >
                            {relationOrganizations.map((organization) => (
                              <option key={organization.id} value={organization.id}>
                                {organization.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="hierarchy-selection-field">
                        <span>{t.objectHierarchyParents}</span>
                        <select
                          multiple
                          value={draftParentObjectIds.map(String)}
                          onChange={(event) =>
                            setDraftParentObjectIds(
                              Array.from(event.target.selectedOptions).map((option) =>
                                Number(option.value),
                              ),
                            )
                          }
                        >
                          {[...relationPlaces, ...relationOrganizations]
                            .filter((storyObject) => storyObject.id !== editingCharacter?.id)
                            .map((storyObject) => (
                              <option key={`${storyObject.typeKey}-${storyObject.id}`} value={storyObject.id}>
                                {storyObject.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  </section>
                )}
                {editorTab === 'main' && (
                <section className="attribute-editor collapsible-block">
                  <div className="attribute-editor-header">
                    <div className="collapse-heading static-heading">{t.catalogValues}</div>
                    <button
                      className="secondary-action compact"
                      type="button"
                      onClick={addDraftCatalogSelection}
                    >
                      {t.addCatalogValue}
                    </button>
                  </div>
                  <div className="attribute-editor-body">
                    {draftCatalogSelections.length === 0 && (
                      <p className="empty-state compact">{t.noCatalogs}</p>
                    )}
                    {draftCatalogSelections.map((selection, index) => {
                      const selectedCatalogId = Number(selection.catalogId)
                      const selectedGroups = catalogEntryGroupsByCatalogId[selectedCatalogId] ?? []
                      const selectedEntries = catalogEntriesByCatalogId[selectedCatalogId] ?? []

                      return (
                        <div className="catalog-selection-row" key={index}>
                          <label className="project-name-field">
                            <span>{t.catalogValueType}</span>
                            <select
                              value={selection.targetType}
                              onChange={(event) =>
                                updateDraftCatalogSelection(index, {
                                  ...selection,
                                  targetType: event.target.value as DraftCatalogSelection['targetType'],
                                  catalogEntryGroupId: '',
                                  catalogEntryId: '',
                                })
                              }
                            >
                              <option value="catalog">{t.catalogs}</option>
                              <option value="group">{t.attributeGroup}</option>
                              <option value="entry">{t.catalogEntryName}</option>
                            </select>
                          </label>
                          <label className="project-name-field">
                            <span>{t.catalogName}</span>
                            <select
                              value={selection.catalogId}
                              onChange={(event) =>
                                updateDraftCatalogSelection(index, {
                                  ...selection,
                                  catalogId: event.target.value,
                                  catalogEntryGroupId: '',
                                  catalogEntryId: '',
                                })
                              }
                            >
                              <option value="">{t.catalogName}</option>
                              {catalogs.map((catalog) => (
                                <option key={catalog.id} value={catalog.id}>
                                  {catalog.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          {selection.targetType === 'group' && (
                            <label className="project-name-field">
                              <span>{t.attributeGroup}</span>
                              <select
                                value={selection.catalogEntryGroupId}
                                onChange={(event) =>
                                  updateDraftCatalogSelection(index, {
                                    ...selection,
                                    catalogEntryGroupId: event.target.value,
                                  })
                                }
                              >
                                <option value="">{t.attributeGroup}</option>
                                {selectedGroups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {selection.targetType === 'entry' && (
                            <label className="project-name-field">
                              <span>{t.catalogEntryName}</span>
                              <select
                                value={selection.catalogEntryId}
                                onChange={(event) =>
                                  updateDraftCatalogSelection(index, {
                                    ...selection,
                                    catalogEntryId: event.target.value,
                                  })
                                }
                              >
                                <option value="">{t.catalogEntryName}</option>
                                {selectedEntries.map((entry) => (
                                  <option key={entry.id} value={entry.id}>
                                    {entry.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <button
                            className="icon-action danger-icon"
                            type="button"
                            aria-label={t.delete}
                            title={t.delete}
                            onClick={() => removeDraftCatalogSelection(index)}
                          >
                            <Trash2 size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>
                )}
                {editorTab === 'timeline' && (
                  <section className="attribute-editor collapsible-block timeline-editor-block">
                    <div className="attribute-editor-header">
                      <div className="collapse-heading static-heading">{t.timelineTab}</div>
                    </div>
                    <div className="attribute-editor-body">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={saveObjectAsTimelineChange}
                          disabled={dialog !== 'editCharacter'}
                          onChange={(event) => setSaveObjectAsTimelineChange(event.target.checked)}
                        />
                        <span>{t.saveAsTimelineChange}</span>
                      </label>
                      <p className="relationship-hint">{t.saveAsTimelineChangeHint}</p>
                      <label className="project-name-field">
                        <span>{t.timelineEventForChanges}</span>
                        <select
                          value={editorTimelineEventId}
                          onChange={(event) => setEditorTimelineEventId(event.target.value)}
                        >
                          <option value="">{t.timelineEventForChanges}</option>
                          {timelineEvents.map((timelineEvent) => (
                            <option key={timelineEvent.id} value={timelineEvent.id}>
                              {timelineEvent.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      {dialog === 'editCharacter' && editingCharacter !== null && (
                        <button
                          className="secondary-action compact"
                          type="button"
                          disabled={editorTimelineEventId === ''}
                          onClick={() =>
                            void attachObjectToTimelineEvent(
                              editingCharacter,
                              Number(editorTimelineEventId),
                            )
                          }
                        >
                          {t.attachObjectToEvent}
                        </button>
                      )}
                      {editingCharacter !== null && selectedObjectTimelineEvents.length > 0 && (
                        <div className="relationship-summary-list">
                          {selectedObjectTimelineEvents.map((timelineEvent) => (
                            <article className="relationship-summary-card" key={timelineEvent.id}>
                              <strong>{timelineEvent.title}</strong>
                              <span>
                                {[timelineEvent.startLabel, timelineEvent.endLabel]
                                  .filter(Boolean)
                                  .join(' - ') || t.eventPeriod}
                              </span>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
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
                      newProjectTab === 'presets' ? 'modal-tab is-active' : 'modal-tab'
                    }
                    type="button"
                    onClick={() => setNewProjectTab('presets')}
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

                {newProjectTab === 'presets' && (
                  <ReadySolutionsPanel
                    selectedKeys={selectedProjectPresetKeys}
                    t={t}
                    onChange={setSelectedProjectPresetKeys}
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
        <Route path="/style-preview/*" element={<StylePreview />} />
        <Route path="/projects/:projectId" element={<StoryDbApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
