namespace StoryDB.Api.Data.Entities;

public class ObjectAttribute
{
    public int Id { get; set; }
    public int StoryObjectId { get; set; }
    public int AttributeDefinitionId { get; set; }
    public string? Value { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? StoryObject { get; set; }
    public AttributeDefinition? AttributeDefinition { get; set; }
}