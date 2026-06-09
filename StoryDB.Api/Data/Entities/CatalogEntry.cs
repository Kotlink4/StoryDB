namespace StoryDB.Api.Data.Entities;

public class CatalogEntry
{
    public int Id { get; set; }
    public int CatalogId { get; set; }
    public int? EntryGroupId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? ImagePath { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Catalog? Catalog { get; set; }
    public CatalogEntryGroup? EntryGroup { get; set; }
    public List<CatalogEntryFieldValue> FieldValues { get; set; } = [];
    public List<CatalogEntryHierarchyLink> ParentLinks { get; set; } = [];
    public List<CatalogEntryHierarchyLink> ChildLinks { get; set; } = [];
}
