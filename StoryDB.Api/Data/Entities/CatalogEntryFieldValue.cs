namespace StoryDB.Api.Data.Entities;

public class CatalogEntryFieldValue
{
    public int Id { get; set; }
    public int CatalogEntryId { get; set; }
    public int FieldDefinitionId { get; set; }
    public string? Value { get; set; }
    public int? ReferencedEntryId { get; set; }

    public CatalogEntry? CatalogEntry { get; set; }
    public CatalogFieldDefinition? FieldDefinition { get; set; }
    public CatalogEntry? ReferencedEntry { get; set; }
}
