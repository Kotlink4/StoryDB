namespace StoryDB.Api.Data.Entities;

public class AppUser
{
    public int Id { get; set; }
    public required string DisplayName { get; set; }
    public string? Email { get; set; }
    public string? NormalizedEmail { get; set; }
    public string? AvatarImagePath { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<Project> Projects { get; set; } = [];
}
