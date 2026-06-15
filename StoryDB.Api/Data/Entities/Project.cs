namespace StoryDB.Api.Data.Entities;

public class Project
{
    public int Id { get; set; }
    public int OwnerUserId { get; set; }
    public required string Name { get; set; }
    public string? CoverImagePath { get; set; }
    public string Visibility { get; set; } = ProjectVisibility.Private;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser? OwnerUser { get; set; }
    public List<ObjectType> ObjectTypes { get; set; } = [];
    public List<StoryObject> Objects { get; set; } = [];
    public List<Timeline> Timelines { get; set; } = [];
    public List<ProjectTemplatePack> TemplatePacks { get; set; } = [];
}

public static class ProjectVisibility
{
    public const string Private = "private";
    public const string PublicRead = "publicRead";
    public const string PublicEdit = "publicEdit";

    public static readonly string[] All = [Private, PublicRead, PublicEdit];

    public static string Normalize(string? value) =>
        All.Contains(value, StringComparer.OrdinalIgnoreCase)
            ? All.First(currentValue => string.Equals(currentValue, value, StringComparison.OrdinalIgnoreCase))
            : Private;
}
