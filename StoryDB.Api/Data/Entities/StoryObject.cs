namespace StoryDB.Api.Data.Entities;

public class StoryObject
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int ObjectTypeId { get; set; }
    public required string Name { get; set; }
    public string? Surname { get; set; }
    public string? Description { get; set; }
    public string? Age { get; set; }
    public string? Role { get; set; }
    public string? ImagePath { get; set; }
    public string? DataJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public ObjectType? ObjectType { get; set; }
    public List<ObjectAttribute> Attributes { get; set; } = [];
    public List<StoryObjectHierarchySelection> HierarchySelections { get; set; } = [];
    public List<StoryObjectCatalogSelection> CatalogSelections { get; set; } = [];
    public List<ObjectOwnership> OwnedItems { get; set; } = [];
    public List<ObjectOwnership> Owners { get; set; } = [];
    public List<ObjectRelation> OutgoingRelations { get; set; } = [];
    public List<ObjectRelation> IncomingRelations { get; set; } = [];
    public List<CharacterRelationship> OutgoingCharacterRelationships { get; set; } = [];
    public List<CharacterRelationship> IncomingCharacterRelationships { get; set; } = [];
}
