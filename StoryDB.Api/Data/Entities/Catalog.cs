namespace StoryDB.Api.Data.Entities;

public class Catalog
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Key { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public bool SupportsHierarchy { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public List<CatalogEntry> Entries { get; set; } = [];
    public List<CatalogEntryGroup> EntryGroups { get; set; } = [];
    public List<CatalogFieldGroup> FieldGroups { get; set; } = [];
    public List<CatalogFieldDefinition> FieldDefinitions { get; set; } = [];
}
