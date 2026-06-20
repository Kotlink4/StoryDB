namespace StoryDB.Api.Data.Entities;

public class MediaAsset
{
    public int Id { get; set; }
    public int? OwnerUserId { get; set; }
    public int? ProjectId { get; set; }
    public required string OriginalFileName { get; set; }
    public required string StorageDirectory { get; set; }
    public required string OriginalPath { get; set; }
    public required string PublicPath { get; set; }
    public required string ContentType { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser? OwnerUser { get; set; }
    public Project? Project { get; set; }
    public List<MediaAssetVariant> Variants { get; set; } = [];
}
