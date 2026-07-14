from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, sin, pi
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_db_schema_overview.png"
SVG_NOTE_PATH = OUT_DIR / "storydb_db_schema_overview.mmd"


@dataclass(frozen=True)
class Node:
    key: str
    title: str
    fields: list[str]
    x: int
    y: int
    w: int
    h: int
    fill: str = "#FFFFFF"


@dataclass(frozen=True)
class Group:
    title: str
    x: int
    y: int
    w: int
    h: int
    fill: str


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    label: str = ""
    dashed: bool = False


@dataclass(frozen=True)
class DiagramSpec:
    title: str
    subtitle: str
    path: Path
    width: int
    height: int
    groups: list[Group]
    nodes: list[Node]
    edges: list[Edge]
    footer: str = ""


WIDTH = 2600
HEIGHT = 1800


GROUPS = [
    Group("Пользователи, проекты и публикация", 40, 100, 670, 720, "#F6F8FA"),
    Group("Объекты художественного мира", 740, 100, 540, 720, "#F3F8FF"),
    Group("Каталоги и справочники", 1310, 100, 610, 720, "#F6FFF2"),
    Group("Структуры и иерархии", 40, 860, 740, 650, "#FFF8EA"),
    Group("Таймлайн и изменения", 820, 860, 790, 650, "#F7F2FF"),
    Group("Медиа и раскладки", 1640, 860, 900, 650, "#FFF3F6"),
]


NODES = [
    Node("AppUser", "AppUser", ["Id PK", "Email", "DisplayName"], 70, 170, 280, 95, "#FFFFFF"),
    Node("AuditLog", "AuditLog", ["Id PK", "UserId FK?", "ProjectId FK?", "Action"], 70, 315, 280, 105),
    Node("ProjectTemplatePack", "ProjectTemplatePack", ["Id PK", "OwnerUserId FK", "SourceProjectId FK?"], 70, 465, 280, 115),
    Node("ProjectTemplatePackFavorite", "ProjectTemplatePackFavorite", ["UserId PK/FK", "TemplatePackId PK/FK"], 70, 625, 280, 90),
    Node("Project", "Project", ["Id PK", "OwnerUserId FK", "Name", "Visibility"], 390, 170, 280, 115, "#FFF8D6"),
    Node("ObjectType", "ObjectType", ["Id PK", "ProjectId FK", "Key", "IsEnabled"], 390, 325, 280, 95),
    Node("ProjectSnapshot", "ProjectSnapshot", ["Id PK", "ProjectId FK", "Scope", "DataJson jsonb"], 390, 465, 280, 105),

    Node("StoryObject", "StoryObject", ["Id PK", "ProjectId FK", "ObjectTypeId FK", "Name", "ImagePath"], 775, 170, 450, 125, "#EAF4FF"),
    Node("ObjectAttribute", "ObjectAttribute", ["Id PK", "StoryObjectId FK", "AttributeDefinitionId FK", "Value"], 770, 335, 220, 105),
    Node("AttributeDefinition", "AttributeDefinition", ["Id PK", "ProjectId FK", "ObjectTypeId FK", "AttributeGroupId FK?"], 1010, 335, 230, 105),
    Node("AttributeGroup", "AttributeGroup", ["Id PK", "ProjectId FK", "ObjectTypeId FK"], 1010, 475, 230, 90),
    Node("ObjectRelation", "ObjectRelation", ["Id PK", "SourceObjectId FK", "TargetObjectId FK"], 770, 475, 220, 95),
    Node("CharacterRelationship", "CharacterRelationship", ["Id PK", "SourceCharacterId FK", "TargetCharacterId FK"], 770, 605, 230, 105),
    Node("ObjectOwnership", "ObjectOwnership", ["OwnerCharacterId PK/FK", "ItemObjectId PK/FK"], 1010, 605, 230, 95),
    Node("ObjectGalleryImage", "ObjectGalleryImage", ["Id PK", "StoryObjectId FK", "ImagePath"], 1010, 725, 230, 80),
    Node("StoryObjectCatalogSelection", "StoryObjectCatalogSelection", ["Id PK", "StoryObjectId FK", "Catalog/Group/Entry FK"], 770, 725, 220, 80),

    Node("Catalog", "Catalog", ["Id PK", "ProjectId FK", "Key", "HierarchyMode"], 1340, 170, 250, 105, "#EBFFE8"),
    Node("CatalogEntry", "CatalogEntry", ["Id PK", "CatalogId FK", "EntryGroupId FK?", "Name"], 1340, 315, 250, 95),
    Node("CatalogEntryGroup", "CatalogEntryGroup", ["Id PK", "CatalogId FK", "Name"], 1620, 315, 250, 95),
    Node("CatalogFieldDefinition", "CatalogFieldDefinition", ["Id PK", "CatalogId FK", "FieldGroupId FK?", "ReferenceCatalogId FK?"], 1340, 450, 250, 115),
    Node("CatalogFieldGroup", "CatalogFieldGroup", ["Id PK", "CatalogId FK", "Name"], 1620, 450, 250, 95),
    Node("CatalogEntryFieldValue", "CatalogEntryFieldValue", ["Id PK", "CatalogEntryId FK", "FieldDefinitionId FK", "ReferencedEntryId FK?"], 1340, 605, 250, 115),
    Node("CatalogEntryHierarchyLink", "CatalogEntryHierarchyLink", ["ParentEntryId PK/FK", "ChildEntryId PK/FK"], 1620, 595, 250, 90),
    Node("CatalogEntryGroupHierarchyLink", "CatalogEntryGroupHierarchyLink", ["ParentGroupId PK/FK", "ChildGroupId PK/FK"], 1620, 710, 250, 90),

    Node("Structure", "Structure", ["Id PK", "ProjectId FK", "LinkedCatalogId FK?", "OwnerKind/OwnerId"], 80, 940, 260, 115, "#FFF4D8"),
    Node("StructureNode", "StructureNode", ["Id PK", "StructureId FK", "ParentNodeId FK?", "LinkedCatalogEntryId FK?"], 80, 1100, 260, 125),
    Node("StructureEdge", "StructureEdge", ["Id PK", "StructureId FK", "SourceNodeId FK", "TargetNodeId FK"], 80, 1270, 260, 115),
    Node("StructureUsage", "StructureUsage", ["Id PK", "ProjectId FK", "StructureId FK", "TargetKind/TargetId"], 390, 1030, 310, 115),
    Node("StructureAssignment", "StructureAssignment", ["Id PK", "UsageId FK", "StructureNodeId FK", "StoryObjectId FK?", "TargetKind/TargetId"], 390, 1200, 310, 135),

    Node("Timeline", "Timeline", ["Id PK", "ProjectId FK", "Name", "Mode"], 860, 940, 250, 95, "#F0E8FF"),
    Node("TimelineEvent", "TimelineEvent", ["Id PK", "ProjectId FK", "TimelineId FK", "ParentEventId FK?", "Start/End"], 860, 1075, 250, 130),
    Node("TimelineEventLink", "TimelineEventLink", ["Id PK", "TimelineId FK", "SourceEventId FK", "TargetEventId FK"], 860, 1250, 250, 110),
    Node("TimelineLayoutItem", "TimelineLayoutItem", ["Id PK", "TimelineLayoutId FK", "TimelineEventId FK", "X/Y/Lane"], 860, 1405, 250, 95),
    Node("TimelineParticipant", "TimelineParticipant", ["Id PK", "TimelineEventId FK", "TargetType/TargetId"], 1160, 1075, 250, 95),
    Node("TimelineChange", "TimelineChange", ["Id PK", "TimelineEventId FK", "ChangeType", "TargetType/TargetId", "NewValueJson"], 1160, 1210, 250, 125),
    Node("TimelineLayout", "TimelineLayout", ["Id PK", "TimelineId FK", "OwnerUserId FK?", "AlgorithmVersion"], 1160, 1380, 250, 105),

    Node("MediaAsset", "MediaAsset", ["Id PK", "ProjectId FK", "OwnerUserId FK?", "PublicPath", "Sha256"], 1680, 940, 270, 120, "#FFEAF0"),
    Node("MediaAssetVariant", "MediaAssetVariant", ["Id PK", "MediaAssetId FK", "VariantKey", "Path"], 1680, 1105, 270, 95),
    Node("RelationGraphLayout", "RelationGraphLayout", ["Id PK", "ProjectId FK", "OwnerUserId FK?", "GraphKey"], 1990, 940, 270, 105),
    Node("RelationGraphLayoutItem", "RelationGraphLayoutItem", ["Id PK", "RelationGraphLayoutId FK", "StoryObjectId FK", "X/Y"], 1990, 1095, 270, 105),
]


EDGES = [
    Edge("AppUser", "Project", ""),
    Edge("AppUser", "AuditLog", ""),
    Edge("Project", "AuditLog", ""),
    Edge("AppUser", "ProjectTemplatePack", ""),
    Edge("ProjectTemplatePackFavorite", "AppUser", ""),
    Edge("ProjectTemplatePackFavorite", "ProjectTemplatePack", ""),
    Edge("Project", "ObjectType", ""),
    Edge("Project", "ProjectSnapshot", ""),
    Edge("Project", "StoryObject", ""),
    Edge("ObjectType", "StoryObject", ""),
    Edge("ObjectType", "AttributeDefinition", ""),
    Edge("ObjectType", "AttributeGroup", ""),
    Edge("StoryObject", "ObjectAttribute", ""),
    Edge("AttributeDefinition", "ObjectAttribute", ""),
    Edge("AttributeGroup", "AttributeDefinition", ""),
    Edge("StoryObject", "ObjectRelation", ""),
    Edge("StoryObject", "CharacterRelationship", ""),
    Edge("StoryObject", "ObjectOwnership", ""),
    Edge("StoryObject", "ObjectGalleryImage", ""),
    Edge("StoryObject", "StoryObjectCatalogSelection", ""),
    Edge("Project", "Catalog", ""),
    Edge("Catalog", "CatalogEntry", ""),
    Edge("Catalog", "CatalogEntryGroup", ""),
    Edge("CatalogEntryGroup", "CatalogEntry", ""),
    Edge("Catalog", "CatalogFieldDefinition", ""),
    Edge("Catalog", "CatalogFieldGroup", ""),
    Edge("CatalogFieldGroup", "CatalogFieldDefinition", ""),
    Edge("CatalogEntry", "CatalogEntryFieldValue", ""),
    Edge("CatalogFieldDefinition", "CatalogEntryFieldValue", ""),
    Edge("CatalogEntry", "CatalogEntryHierarchyLink", ""),
    Edge("CatalogEntryGroup", "CatalogEntryGroupHierarchyLink", ""),
    Edge("Project", "Structure", ""),
    Edge("Structure", "StructureNode", ""),
    Edge("StructureNode", "StructureEdge", ""),
    Edge("Structure", "StructureUsage", ""),
    Edge("StructureUsage", "StructureAssignment", ""),
    Edge("StructureNode", "StructureAssignment", ""),
    Edge("Project", "Timeline", ""),
    Edge("Timeline", "TimelineEvent", ""),
    Edge("TimelineEvent", "TimelineEventLink", ""),
    Edge("TimelineEvent", "TimelineParticipant", ""),
    Edge("TimelineEvent", "TimelineChange", ""),
    Edge("Timeline", "TimelineLayout", ""),
    Edge("TimelineLayout", "TimelineLayoutItem", ""),
    Edge("TimelineEvent", "TimelineLayoutItem", ""),
    Edge("Project", "MediaAsset", ""),
    Edge("MediaAsset", "MediaAssetVariant", ""),
    Edge("Project", "RelationGraphLayout", ""),
    Edge("RelationGraphLayout", "RelationGraphLayoutItem", ""),
    Edge("StoryObject", "RelationGraphLayoutItem", ""),
]


SPLIT_DIAGRAMS = [
    DiagramSpec(
        title="Схема БД StoryDB: пользователи, проекты и публикация",
        subtitle="Базовый контур владения проектами, шаблонов, аудита и снимков данных.",
        path=OUT_DIR / "storydb_db_schema_01_projects.png",
        width=1400,
        height=920,
        groups=[Group("Контур проекта", 40, 120, 1320, 670, "#F6F8FA")],
        nodes=[
            Node("AppUser", "AppUser", ["Id PK", "Email", "DisplayName"], 80, 190, 310, 120),
            Node("Project", "Project", ["Id PK", "OwnerUserId FK", "Name", "Visibility"], 520, 190, 340, 140, "#FFF8D6"),
            Node("AuditLog", "AuditLog", ["Id PK", "UserId FK?", "ProjectId FK?", "Action"], 960, 190, 310, 120),
            Node("ObjectType", "ObjectType", ["Id PK", "ProjectId FK", "Key", "Name"], 150, 460, 300, 120),
            Node("ProjectSnapshot", "ProjectSnapshot", ["Id PK", "ProjectId FK", "Scope", "DataJson jsonb"], 540, 460, 320, 120),
            Node("ProjectTemplatePack", "ProjectTemplatePack", ["Id PK", "OwnerUserId FK", "SourceProjectId FK?", "Title", "Visibility"], 930, 440, 320, 140),
            Node("ProjectTemplatePackFavorite", "ProjectTemplatePackFavorite", ["UserId PK/FK", "TemplatePackId PK/FK"], 930, 640, 320, 105),
        ],
        edges=[
            Edge("AppUser", "Project"),
            Edge("AppUser", "AuditLog"),
            Edge("Project", "AuditLog"),
            Edge("Project", "ObjectType"),
            Edge("Project", "ProjectSnapshot"),
            Edge("AppUser", "ProjectTemplatePack"),
            Edge("Project", "ProjectTemplatePack", dashed=True),
            Edge("ProjectTemplatePackFavorite", "AppUser"),
            Edge("ProjectTemplatePackFavorite", "ProjectTemplatePack"),
        ],
        footer="Project является агрегирующей сущностью: большая часть предметных таблиц привязана к проекту.",
    ),
    DiagramSpec(
        title="Схема БД StoryDB: объекты художественного мира",
        subtitle="Персонажи, локации, предметы и другие сущности мира произведения с атрибутами и связями.",
        path=OUT_DIR / "storydb_db_schema_02_story_objects.png",
        width=1500,
        height=980,
        groups=[Group("Объекты и связи", 40, 120, 1420, 735, "#F3F8FF")],
        nodes=[
            Node("Project", "Project", ["Id PK", "OwnerUserId FK", "Name"], 70, 190, 260, 105, "#FFF8D6"),
            Node("ObjectType", "ObjectType", ["Id PK", "ProjectId FK", "Key"], 70, 370, 260, 105),
            Node("StoryObject", "StoryObject", ["Id PK", "ProjectId FK", "ObjectTypeId FK", "Name", "ImagePath"], 445, 230, 360, 145, "#EAF4FF"),
            Node("AttributeGroup", "AttributeGroup", ["Id PK", "ProjectId FK", "ObjectTypeId FK", "Name"], 900, 185, 260, 120),
            Node("AttributeDefinition", "AttributeDefinition", ["Id PK", "ProjectId FK", "ObjectTypeId FK", "AttributeGroupId FK?", "Key", "DataType"], 900, 350, 300, 150),
            Node("ObjectAttribute", "ObjectAttribute", ["Id PK", "StoryObjectId FK", "AttributeDefinitionId FK", "Value"], 515, 475, 290, 120),
            Node("ObjectRelation", "ObjectRelation", ["Id PK", "SourceObjectId FK", "TargetObjectId FK", "RelationType"], 130, 610, 300, 120),
            Node("CharacterRelationship", "CharacterRelationship", ["Id PK", "SourceCharacterId FK", "TargetCharacterId FK", "RelationshipType"], 500, 650, 330, 120),
            Node("ObjectOwnership", "ObjectOwnership", ["OwnerCharacterId PK/FK", "ItemObjectId PK/FK"], 900, 650, 300, 105),
            Node("ObjectGalleryImage", "ObjectGalleryImage", ["Id PK", "StoryObjectId FK", "ImagePath"], 1210, 235, 230, 115),
            Node("StoryObjectCatalogSelection", "StoryObjectCatalogSelection", ["Id PK", "StoryObjectId FK", "Catalog/Group/Entry FK"], 1210, 430, 230, 120),
        ],
        edges=[
            Edge("Project", "ObjectType"),
            Edge("Project", "StoryObject"),
            Edge("ObjectType", "StoryObject"),
            Edge("ObjectType", "AttributeGroup"),
            Edge("ObjectType", "AttributeDefinition"),
            Edge("AttributeGroup", "AttributeDefinition"),
            Edge("StoryObject", "ObjectAttribute"),
            Edge("AttributeDefinition", "ObjectAttribute"),
            Edge("StoryObject", "ObjectRelation"),
            Edge("StoryObject", "CharacterRelationship"),
            Edge("StoryObject", "ObjectOwnership"),
            Edge("StoryObject", "ObjectGalleryImage"),
            Edge("StoryObject", "StoryObjectCatalogSelection"),
        ],
        footer="ObjectRelation, CharacterRelationship и ObjectOwnership моделируют разные типы связей между StoryObject.",
    ),
    DiagramSpec(
        title="Схема БД StoryDB: каталоги и справочники",
        subtitle="Настраиваемые справочники проекта, поля записей и иерархические связи.",
        path=OUT_DIR / "storydb_db_schema_03_catalogs.png",
        width=1500,
        height=980,
        groups=[Group("Каталоги", 40, 120, 1420, 735, "#F6FFF2")],
        nodes=[
            Node("Project", "Project", ["Id PK", "Name"], 70, 200, 240, 95, "#FFF8D6"),
            Node("Catalog", "Catalog", ["Id PK", "ProjectId FK", "Key", "HierarchyMode"], 430, 190, 280, 125, "#EBFFE8"),
            Node("CatalogEntryGroup", "CatalogEntryGroup", ["Id PK", "CatalogId FK", "Name"], 860, 190, 280, 115),
            Node("CatalogEntry", "CatalogEntry", ["Id PK", "CatalogId FK", "EntryGroupId FK?", "Name"], 860, 365, 280, 125),
            Node("CatalogFieldGroup", "CatalogFieldGroup", ["Id PK", "CatalogId FK", "Name"], 430, 430, 280, 115),
            Node("CatalogFieldDefinition", "CatalogFieldDefinition", ["Id PK", "CatalogId FK", "FieldGroupId FK?", "ReferenceCatalogId FK?", "DataType"], 430, 605, 300, 145),
            Node("CatalogEntryFieldValue", "CatalogEntryFieldValue", ["Id PK", "CatalogEntryId FK", "FieldDefinitionId FK", "ReferencedEntryId FK?", "Value"], 860, 590, 300, 145),
            Node("CatalogEntryHierarchyLink", "CatalogEntryHierarchyLink", ["ParentEntryId PK/FK", "ChildEntryId PK/FK"], 1190, 360, 260, 100),
            Node("CatalogEntryGroupHierarchyLink", "CatalogEntryGroupHierarchyLink", ["ParentGroupId PK/FK", "ChildGroupId PK/FK"], 1190, 535, 260, 100),
        ],
        edges=[
            Edge("Project", "Catalog"),
            Edge("Catalog", "CatalogEntryGroup"),
            Edge("Catalog", "CatalogEntry"),
            Edge("CatalogEntryGroup", "CatalogEntry"),
            Edge("Catalog", "CatalogFieldGroup"),
            Edge("Catalog", "CatalogFieldDefinition"),
            Edge("CatalogFieldGroup", "CatalogFieldDefinition"),
            Edge("CatalogEntry", "CatalogEntryFieldValue"),
            Edge("CatalogFieldDefinition", "CatalogEntryFieldValue"),
            Edge("CatalogEntry", "CatalogEntryHierarchyLink"),
            Edge("CatalogEntryGroup", "CatalogEntryGroupHierarchyLink"),
        ],
        footer="ReferenceCatalogId в CatalogFieldDefinition задает каталог, на записи которого можно ссылаться.",
    ),
    DiagramSpec(
        title="Схема БД StoryDB: структуры и иерархии",
        subtitle="Деревья, графы и назначения объектов на элементы пользовательских структур.",
        path=OUT_DIR / "storydb_db_schema_04_structures.png",
        width=1400,
        height=920,
        groups=[Group("Структуры проекта", 40, 120, 1320, 665, "#FFF8EA")],
        nodes=[
            Node("Project", "Project", ["Id PK", "Name"], 80, 200, 240, 95, "#FFF8D6"),
            Node("Catalog", "Catalog", ["Id PK", "ProjectId FK"], 80, 390, 240, 95, "#EBFFE8"),
            Node("Structure", "Structure", ["Id PK", "ProjectId FK", "LinkedCatalogId FK?", "OwnerKind/OwnerId", "Name"], 470, 190, 320, 140, "#FFF4D8"),
            Node("StructureNode", "StructureNode", ["Id PK", "StructureId FK", "ParentNodeId FK?", "LinkedCatalogEntryId FK?", "Title"], 470, 405, 320, 145),
            Node("StructureEdge", "StructureEdge", ["Id PK", "StructureId FK", "SourceNodeId FK", "TargetNodeId FK"], 850, 405, 300, 120),
            Node("StructureUsage", "StructureUsage", ["Id PK", "ProjectId FK", "StructureId FK", "TargetKind/TargetId"], 850, 190, 300, 120),
            Node("StructureAssignment", "StructureAssignment", ["Id PK", "UsageId FK", "StructureNodeId FK", "StoryObjectId FK?", "TargetKind/TargetId"], 850, 600, 330, 140),
            Node("StoryObject", "StoryObject", ["Id PK", "ProjectId FK", "Name"], 210, 620, 260, 95, "#EAF4FF"),
        ],
        edges=[
            Edge("Project", "Catalog"),
            Edge("Project", "Structure"),
            Edge("Catalog", "Structure", dashed=True),
            Edge("Structure", "StructureNode"),
            Edge("StructureNode", "StructureNode", dashed=True),
            Edge("Structure", "StructureEdge"),
            Edge("StructureNode", "StructureEdge"),
            Edge("Structure", "StructureUsage"),
            Edge("Project", "StructureUsage"),
            Edge("StructureUsage", "StructureAssignment"),
            Edge("StructureNode", "StructureAssignment"),
            Edge("StoryObject", "StructureAssignment"),
        ],
        footer="OwnerKind/OwnerId и TargetKind/TargetId позволяют использовать одну модель структур для разных разделов проекта.",
    ),
    DiagramSpec(
        title="Схема БД StoryDB: таймлайн и изменения",
        subtitle="События произведения, участники, причинные связи, изменения состояний и пользовательские раскладки.",
        path=OUT_DIR / "storydb_db_schema_05_timeline.png",
        width=1500,
        height=980,
        groups=[Group("Таймлайн", 40, 120, 1420, 735, "#F7F2FF")],
        nodes=[
            Node("Project", "Project", ["Id PK", "Name"], 70, 200, 240, 95, "#FFF8D6"),
            Node("Timeline", "Timeline", ["Id PK", "ProjectId FK", "Name", "Mode"], 430, 190, 280, 115, "#F0E8FF"),
            Node("TimelineEvent", "TimelineEvent", ["Id PK", "ProjectId FK", "TimelineId FK", "ParentEventId FK?", "Title", "StartValue/EndValue", "ImagePath"], 430, 390, 320, 165),
            Node("TimelineEventLink", "TimelineEventLink", ["Id PK", "TimelineId FK", "SourceEventId FK", "TargetEventId FK", "LinkType"], 90, 615, 310, 135),
            Node("TimelineParticipant", "TimelineParticipant", ["Id PK", "TimelineEventId FK", "TargetType/TargetId"], 825, 310, 290, 105),
            Node("TimelineChange", "TimelineChange", ["Id PK", "TimelineEventId FK", "ChangeType", "TargetType/TargetId", "NewValueJson"], 825, 500, 310, 140),
            Node("StoryObject", "StoryObject", ["Id PK", "ProjectId FK", "Name"], 825, 700, 290, 95, "#EAF4FF"),
            Node("TimelineLayout", "TimelineLayout", ["Id PK", "TimelineId FK", "OwnerUserId FK?", "AlgorithmVersion"], 1165, 190, 280, 120),
            Node("TimelineLayoutItem", "TimelineLayoutItem", ["Id PK", "TimelineLayoutId FK", "TimelineEventId FK", "X/Y/Lane", "Width/Height"], 1165, 405, 290, 140),
            Node("AppUser", "AppUser", ["Id PK", "Email"], 1165, 630, 260, 95),
        ],
        edges=[
            Edge("Project", "Timeline"),
            Edge("Project", "TimelineEvent"),
            Edge("Timeline", "TimelineEvent"),
            Edge("TimelineEvent", "TimelineEvent", dashed=True),
            Edge("TimelineEvent", "TimelineEventLink"),
            Edge("Timeline", "TimelineEventLink"),
            Edge("TimelineEvent", "TimelineParticipant"),
            Edge("TimelineEvent", "TimelineChange"),
            Edge("TimelineChange", "StoryObject", dashed=True),
            Edge("Timeline", "TimelineLayout"),
            Edge("TimelineLayout", "TimelineLayoutItem"),
            Edge("TimelineEvent", "TimelineLayoutItem"),
            Edge("AppUser", "TimelineLayout"),
            Edge("TimelineParticipant", "StoryObject", dashed=True),
        ],
        footer="TargetType/TargetId в участниках и изменениях указывает на объект, каталог или другую сущность предметной области.",
    ),
    DiagramSpec(
        title="Схема БД StoryDB: медиа и пользовательские раскладки",
        subtitle="Файлы проекта, производные варианты изображений и сохраненные позиции объектов на графах.",
        path=OUT_DIR / "storydb_db_schema_06_media_layouts.png",
        width=1400,
        height=900,
        groups=[Group("Медиа и раскладки", 40, 120, 1320, 650, "#FFF3F6")],
        nodes=[
            Node("Project", "Project", ["Id PK", "Name"], 80, 190, 240, 95, "#FFF8D6"),
            Node("AppUser", "AppUser", ["Id PK", "Email"], 80, 390, 240, 95),
            Node("MediaAsset", "MediaAsset", ["Id PK", "ProjectId FK", "OwnerUserId FK?", "PublicPath", "Sha256", "MimeType"], 460, 185, 330, 145, "#FFEAF0"),
            Node("MediaAssetVariant", "MediaAssetVariant", ["Id PK", "MediaAssetId FK", "VariantKey", "Path", "Width/Height"], 460, 420, 330, 125),
            Node("StoryObject", "StoryObject", ["Id PK", "ProjectId FK", "Name", "ImagePath"], 930, 185, 300, 115, "#EAF4FF"),
            Node("ObjectGalleryImage", "ObjectGalleryImage", ["Id PK", "StoryObjectId FK", "ImagePath"], 930, 370, 300, 100),
            Node("RelationGraphLayout", "RelationGraphLayout", ["Id PK", "ProjectId FK", "OwnerUserId FK?", "GraphKey"], 460, 620, 330, 110),
            Node("RelationGraphLayoutItem", "RelationGraphLayoutItem", ["Id PK", "RelationGraphLayoutId FK", "StoryObjectId FK", "X/Y"], 930, 600, 310, 115),
        ],
        edges=[
            Edge("Project", "MediaAsset"),
            Edge("AppUser", "MediaAsset"),
            Edge("MediaAsset", "MediaAssetVariant"),
            Edge("Project", "StoryObject"),
            Edge("StoryObject", "ObjectGalleryImage"),
            Edge("MediaAsset", "StoryObject", dashed=True),
            Edge("MediaAsset", "ObjectGalleryImage", dashed=True),
            Edge("Project", "RelationGraphLayout"),
            Edge("AppUser", "RelationGraphLayout"),
            Edge("RelationGraphLayout", "RelationGraphLayoutItem"),
            Edge("StoryObject", "RelationGraphLayoutItem"),
        ],
        footer="ImagePath хранит публичный путь, а MediaAsset описывает физический файл и его варианты.",
    ),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_TITLE = load_font(30, True)
FONT_SUBTITLE = load_font(18)
FONT_GROUP = load_font(22, True)
FONT_NODE = load_font(19, True)
FONT_NODE_SMALL = load_font(15, True)
FONT_FIELD = load_font(13)
FONT_EDGE = load_font(12)


def draw_dashed_line(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill: str, width: int = 2) -> None:
    x1, y1 = start
    x2, y2 = end
    total = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    if total == 0:
        return
    dash = 12
    gap = 8
    t = 0
    while t < total:
        t2 = min(t + dash, total)
        sx = x1 + (x2 - x1) * t / total
        sy = y1 + (y2 - y1) * t / total
        ex = x1 + (x2 - x1) * t2 / total
        ey = y1 + (y2 - y1) * t2 / total
        draw.line((sx, sy, ex, ey), fill=fill, width=width)
        t += dash + gap


def center(node: Node) -> tuple[int, int]:
    return node.x + node.w // 2, node.y + node.h // 2


def border_point(source: Node, target: Node) -> tuple[int, int]:
    sx, sy = center(source)
    tx, ty = center(target)
    dx = tx - sx
    dy = ty - sy
    if dx == 0 and dy == 0:
        return sx, sy
    scale_x = source.w / 2 / abs(dx) if dx else float("inf")
    scale_y = source.h / 2 / abs(dy) if dy else float("inf")
    scale = min(scale_x, scale_y) * 0.93
    return int(sx + dx * scale), int(sy + dy * scale)


def draw_arrow(draw: ImageDraw.ImageDraw, source: Node, target: Node, label: str, dashed: bool = False) -> None:
    if source.key == target.key:
        color = "#7C3AED" if dashed else "#4B5563"
        x = source.x + source.w
        y = source.y + source.h // 2
        points = [
            (x - 8, y - 18),
            (x + 52, y - 18),
            (x + 52, y + 38),
            (x - 8, y + 38),
        ]
        for start, end in zip(points, points[1:]):
            if dashed:
                draw_dashed_line(draw, start, end, color, 2)
            else:
                draw.line((*start, *end), fill=color, width=2)
        end = points[-1]
        arrow = [(end[0], end[1]), (end[0] + 10, end[1] - 6), (end[0] + 10, end[1] + 6)]
        draw.polygon(arrow, fill=color)
        return

    start = border_point(source, target)
    end = border_point(target, source)
    color = "#4B5563" if not dashed else "#7C3AED"
    if dashed:
        draw_dashed_line(draw, start, end, color, 2)
    else:
        draw.line((*start, *end), fill=color, width=2)

    angle = atan2(end[1] - start[1], end[0] - start[0])
    size = 10
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)

    if label:
        lx = (start[0] + end[0]) // 2
        ly = (start[1] + end[1]) // 2
        bbox = draw.textbbox((lx, ly), label, font=FONT_EDGE)
        pad = 4
        draw.rounded_rectangle(
            (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
            radius=5,
            fill="#FFFFFF",
            outline="#E5E7EB",
        )
        draw.text((lx, ly), label, fill=color, font=FONT_EDGE, anchor="la")


def draw_node(draw: ImageDraw.ImageDraw, node: Node) -> None:
    header_height = 34
    draw.rounded_rectangle(
        (node.x, node.y, node.x + node.w, node.y + node.h),
        radius=14,
        fill=node.fill,
        outline="#111827",
        width=2,
    )
    draw.rectangle((node.x, node.y, node.x + node.w, node.y + header_height), fill="#E5E7EB", outline="#111827", width=1)
    title_font = FONT_NODE
    title_bbox = draw.textbbox((0, 0), node.title, font=title_font)
    if title_bbox[2] - title_bbox[0] > node.w - 24:
        title_font = FONT_NODE_SMALL
    draw.text((node.x + 12, node.y + 7), node.title, fill="#111827", font=title_font)
    y = node.y + header_height + 8
    max_chars = max(18, node.w // 12)
    line_height = 15
    bottom = node.y + node.h - 6
    for field in node.fields:
        for line in wrap(field, width=max_chars):
            if y + line_height > bottom:
                draw.text((node.x + 12, y), "...", fill="#374151", font=FONT_FIELD)
                return
            draw.text((node.x + 12, y), line, fill="#374151", font=FONT_FIELD)
            y += line_height


def draw_group(draw: ImageDraw.ImageDraw, group: Group) -> None:
    draw.rounded_rectangle(
        (group.x, group.y, group.x + group.w, group.y + group.h),
        radius=24,
        fill=group.fill,
        outline="#CBD5E1",
        width=2,
    )


def draw_png() -> None:
    draw_canvas(
        path=PNG_PATH,
        width=WIDTH,
        height=HEIGHT,
        title="Укрупненная схема базы данных StoryDB",
        subtitle="ER-обзор основных таблиц и связей. Для ВКР: читаемая схема, не полный лист всех индексов EF Core.",
        groups=GROUPS,
        nodes=NODES,
        edges=EDGES,
        footer="Примечание: связи TargetType/TargetId и ImagePath являются логическими; часть из них не оформлена физическим FK.",
    )


def draw_canvas(
    path: Path,
    width: int,
    height: int,
    title: str,
    subtitle: str,
    groups: list[Group],
    nodes: list[Node],
    edges: list[Edge],
    footer: str = "",
) -> None:
    img = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    for group in groups:
        draw_group(draw, group)

    node_map = {node.key: node for node in nodes}
    for edge in edges:
        draw_arrow(draw, node_map[edge.source], node_map[edge.target], edge.label, edge.dashed)

    for node in nodes:
        draw_node(draw, node)

    img.save(path)


def draw_split_pngs() -> None:
    for spec in SPLIT_DIAGRAMS:
        draw_canvas(
            path=spec.path,
            width=spec.width,
            height=spec.height,
            title=spec.title,
            subtitle=spec.subtitle,
            groups=spec.groups,
            nodes=spec.nodes,
            edges=spec.edges,
            footer=spec.footer,
        )


def write_mermaid() -> None:
    SVG_NOTE_PATH.write_text(
        """erDiagram
    AppUser ||--o{ Project : owns
    AppUser ||--o{ AuditLog : creates
    Project ||--o{ AuditLog : logs
    Project ||--o{ ObjectType : contains
    Project ||--o{ StoryObject : contains
    ObjectType ||--o{ StoryObject : classifies
    ObjectType ||--o{ AttributeDefinition : configures
    StoryObject ||--o{ ObjectAttribute : has
    AttributeDefinition ||--o{ ObjectAttribute : defines
    AttributeGroup ||--o{ AttributeDefinition : groups
    StoryObject ||--o{ ObjectRelation : source_or_target
    StoryObject ||--o{ CharacterRelationship : character_link
    StoryObject ||--o{ ObjectGalleryImage : gallery

    Project ||--o{ Catalog : contains
    Catalog ||--o{ CatalogEntry : entries
    Catalog ||--o{ CatalogEntryGroup : groups
    CatalogEntryGroup ||--o{ CatalogEntry : groups
    Catalog ||--o{ CatalogFieldDefinition : fields
    CatalogFieldDefinition ||--o{ CatalogEntryFieldValue : stores
    CatalogEntry ||--o{ CatalogEntryFieldValue : values

    Project ||--o{ Structure : contains
    Structure ||--o{ StructureNode : nodes
    StructureNode ||--o{ StructureEdge : source_or_target
    Structure ||--o{ StructureUsage : used_by
    StructureUsage ||--o{ StructureAssignment : assigns
    StructureNode ||--o{ StructureAssignment : receives

    Project ||--o{ Timeline : contains
    Timeline ||--o{ TimelineEvent : events
    TimelineEvent ||--o{ TimelineEventLink : source_or_target
    TimelineEvent ||--o{ TimelineParticipant : participants
    TimelineEvent ||--o{ TimelineChange : changes
    Timeline ||--o{ TimelineLayout : layouts
    TimelineLayout ||--o{ TimelineLayoutItem : items

    Project ||--o{ ProjectSnapshot : snapshots
    Project ||--o{ MediaAsset : media
    MediaAsset ||--o{ MediaAssetVariant : variants
    Project ||--o{ RelationGraphLayout : graph_layouts
    RelationGraphLayout ||--o{ RelationGraphLayoutItem : items
    StoryObject ||--o{ RelationGraphLayoutItem : placed
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    draw_split_pngs()
    write_mermaid()
    print(PNG_PATH)
    for diagram in SPLIT_DIAGRAMS:
        print(diagram.path)
    print(SVG_NOTE_PATH)
