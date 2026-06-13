namespace StoryDB.Api.Data.Entities;

public class MediaAssetVariant
{
    public int Id { get; set; }
    public int MediaAssetId { get; set; }
    public required string VariantKey { get; set; }
    public required string Path { get; set; }
    public required string ContentType { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }

    public MediaAsset? MediaAsset { get; set; }
}
