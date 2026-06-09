namespace StoryDB.Api.Data.Entities;

public class CatalogFieldGroup
{
    public int Id { get; set; }
    public int CatalogId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }

    public Catalog? Catalog { get; set; }
    public List<CatalogFieldDefinition> FieldDefinitions { get; set; } = [];
}
