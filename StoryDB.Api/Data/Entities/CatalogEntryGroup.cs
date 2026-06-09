namespace StoryDB.Api.Data.Entities;

public class CatalogEntryGroup
{
    public int Id { get; set; }
    public int CatalogId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }

    public Catalog? Catalog { get; set; }
    public List<CatalogEntry> Entries { get; set; } = [];
    public List<CatalogEntryGroupHierarchyLink> ParentLinks { get; set; } = [];
    public List<CatalogEntryGroupHierarchyLink> ChildLinks { get; set; } = [];
}
