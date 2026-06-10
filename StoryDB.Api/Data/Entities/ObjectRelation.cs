namespace StoryDB.Api.Data.Entities;

public class ObjectRelation
{
    public int Id { get; set; }
    public int SourceObjectId { get; set; }
    public int TargetObjectId { get; set; }
    public required string RelationType { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? SourceObject { get; set; }
    public StoryObject? TargetObject { get; set; }
}
