namespace StoryDB.Api.Data.Entities;

public class AppUser
{
    public int Id { get; set; }
    public required string DisplayName { get; set; }
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<Project> Projects { get; set; } = [];
}
