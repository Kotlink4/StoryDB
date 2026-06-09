namespace StoryDB.Api.Data.Entities;

public class StoryObjectCatalogSelection
{
    public int Id { get; set; }
    public int StoryObjectId { get; set; }
    public required string TargetType { get; set; }
    public int CatalogId { get; set; }
    public int? CatalogEntryGroupId { get; set; }
    public int? CatalogEntryId { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? StoryObject { get; set; }
    public Catalog? Catalog { get; set; }
    public CatalogEntryGroup? CatalogEntryGroup { get; set; }
    public CatalogEntry? CatalogEntry { get; set; }
}
