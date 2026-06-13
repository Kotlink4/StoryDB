namespace StoryDB.Api.Data.Entities;

public class Project
{
    public int Id { get; set; }
    public int OwnerUserId { get; set; }
    public required string Name { get; set; }
    public string? CoverImagePath { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser? OwnerUser { get; set; }
    public List<ObjectType> ObjectTypes { get; set; } = [];
    public List<StoryObject> Objects { get; set; } = [];
    public List<Timeline> Timelines { get; set; } = [];
}
