namespace StoryDB.Api.Data.Entities;

public class AttributeGroup
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int ObjectTypeId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }

    public Project? Project { get; set; }
    public ObjectType? ObjectType { get; set; }
    public List<AttributeDefinition> Definitions { get; set; } = [];
}
