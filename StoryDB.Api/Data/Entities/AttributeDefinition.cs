namespace StoryDB.Api.Data.Entities;

public class AttributeDefinition
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int ObjectTypeId { get; set; }
    public int? AttributeGroupId { get; set; }
    public required string Name { get; set; }
    public required string DataType { get; set; }
    public double? MinValue { get; set; }
    public double? MaxValue { get; set; }
    public string? Unit { get; set; }
    public string? OptionsJson { get; set; }
    public string? IconKey { get; set; }
    public int SortOrder { get; set; }

    public Project? Project { get; set; }
    public ObjectType? ObjectType { get; set; }
    public AttributeGroup? AttributeGroup { get; set; }
    public List<ObjectAttribute> ObjectAttributes { get; set; } = [];
}
