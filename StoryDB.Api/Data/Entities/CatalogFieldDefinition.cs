namespace StoryDB.Api.Data.Entities;

public class CatalogFieldDefinition
{
    public int Id { get; set; }
    public int CatalogId { get; set; }
    public int? FieldGroupId { get; set; }
    public required string Name { get; set; }
    public required string DataType { get; set; }
    public bool IsRequired { get; set; }
    public double? MinValue { get; set; }
    public double? MaxValue { get; set; }
    public string? OptionsJson { get; set; }
    public int? ReferenceCatalogId { get; set; }
    public int SortOrder { get; set; }

    public Catalog? Catalog { get; set; }
    public CatalogFieldGroup? FieldGroup { get; set; }
    public Catalog? ReferenceCatalog { get; set; }
    public List<CatalogEntryFieldValue> FieldValues { get; set; } = [];
}
