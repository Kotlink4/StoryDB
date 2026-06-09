namespace StoryDB.Api.Data.Entities;

public class ObjectType
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Key { get; set; }
    public required string Name { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;

    public Project? Project { get; set; }
    public List<StoryObject> Objects { get; set; } = [];
}
