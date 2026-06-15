using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Contracts.Objects;

public record CreateStoryObjectRequest(
    string TypeKey,
    string Name,
    string? Surname,
    string? SurnameForm,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    IReadOnlyList<CreateObjectAttributeRequest> Attributes,
    IReadOnlyList<ObjectHierarchySelectionRequest> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionRequest> CatalogSelections,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds,
    IReadOnlyList<CharacterRelationshipRequest> CharacterRelationships);

public record CreateObjectAttributeRequest(string Name, string? Value);

public record ObjectHierarchySelectionRequest(int GroupId, IReadOnlyList<int> NodeIds);

public record ObjectCatalogSelectionRequest(
    string TargetType,
    int CatalogId,
    int? CatalogEntryGroupId,
    int? CatalogEntryId);

public record UpdateStoryObjectRequest(
    string Name,
    string? Surname,
    string? SurnameForm,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    IReadOnlyList<CreateObjectAttributeRequest> Attributes,
    IReadOnlyList<ObjectHierarchySelectionRequest> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionRequest> CatalogSelections,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds,
    IReadOnlyList<CharacterRelationshipRequest> CharacterRelationships);

public record StoryObjectDto(
    int Id,
    string Name,
    string? Surname,
    string? SurnameForm,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    string TypeKey,
    IReadOnlyList<ObjectAttributeDto> Attributes,
    IReadOnlyList<ObjectHierarchySelectionDto> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionDto> CatalogSelections,
    IReadOnlyList<ObjectReferenceDto> OwnedItems,
    IReadOnlyList<ObjectReferenceDto> Owners,
    IReadOnlyList<ObjectReferenceDto> TerritoryPlaces,
    IReadOnlyList<ObjectReferenceDto> OrganizationsOnTerritory,
    IReadOnlyList<ObjectReferenceDto> OwnerOrganizations,
    IReadOnlyList<ObjectReferenceDto> OwnedTerritories,
    IReadOnlyList<ObjectReferenceDto> HierarchyParents,
    IReadOnlyList<ObjectReferenceDto> HierarchyChildren,
    IReadOnlyList<OrganizationStructureLevelDto> OrganizationStructureLevels,
    IReadOnlyList<ObjectGalleryImageDto> GalleryImages,
    IReadOnlyList<CharacterRelationshipDto> OutgoingCharacterRelationships,
    IReadOnlyList<CharacterRelationshipDto> IncomingCharacterRelationships);

public record ObjectReferenceDto(int Id, string Name, string? ImagePath, string TypeKey);

public record OrganizationStructureLevelDto(
    int Id,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<OrganizationStructureSlotDto> Slots);

public record OrganizationStructureSlotDto(
    int Id,
    string Name,
    string? Description,
    string? SlotType,
    string? Color,
    string? IconKey,
    int SortOrder);

public record OrganizationStructureRequest(IReadOnlyList<OrganizationStructureLevelRequest> Levels);

public record OrganizationStructureLevelRequest(
    string Name,
    string? Description,
    IReadOnlyList<OrganizationStructureSlotRequest> Slots);

public record OrganizationStructureSlotRequest(
    string Name,
    string? Description,
    string? SlotType,
    string? Color,
    string? IconKey);

public record ObjectGalleryImageRequest(string ImagePath, string? Caption);

public record ObjectGalleryImageDto(int Id, string ImagePath, string? Caption, int SortOrder);

public record CharacterRelationshipRequest(
    int? Id,
    int? SourceCharacterId,
    int TargetCharacterId,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description);

public record CharacterRelationshipDto(
    int Id,
    ObjectReferenceDto Character,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description,
    string Direction);

public record ObjectAttributeDto(int Id, int AttributeDefinitionId, string Name, string? Value);

public record ObjectHierarchySelectionDto(
    int GroupId,
    string GroupName,
    IReadOnlyList<ObjectHierarchyNodeSelectionDto> Nodes);

public record ObjectHierarchyNodeSelectionDto(int Id, string Name);

public record ObjectCatalogSelectionDto(
    string TargetType,
    int CatalogId,
    string CatalogName,
    int? CatalogEntryGroupId,
    string? CatalogEntryGroupName,
    int? CatalogEntryId,
    string? CatalogEntryName);

public record AttributeDefinitionsValidationResult(
    string? Error,
    IReadOnlyDictionary<int, AttributeDefinition> Definitions);

public record HierarchySelectionsValidationResult(string? Error);

public record CatalogSelectionsValidationResult(string? Error);

public record OwnershipSelectionsValidationResult(
    string? Error,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds);

public record ObjectRelationsValidationResult(
    string? Error,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds);

public record CharacterRelationshipSelection(
    int? Id,
    int SourceCharacterId,
    int TargetCharacterId,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description,
    int SortOrder);

public record CharacterRelationshipsValidationResult(
    string? Error,
    IReadOnlyList<CharacterRelationshipSelection> Relationships);




