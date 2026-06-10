namespace StoryDB.Api.Data.Entities;

public class ObjectGalleryImage
{
    public int Id { get; set; }
    public int StoryObjectId { get; set; }
    public required string ImagePath { get; set; }
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public StoryObject? StoryObject { get; set; }
}
