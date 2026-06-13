namespace StoryDB.Api.Data.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? UserId { get; set; }
    public AppUser? User { get; set; }
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    public string TraceId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? QueryString { get; set; }
    public int StatusCode { get; set; }
    public long DurationMs { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? RequestContentType { get; set; }
    public long? RequestContentLength { get; set; }
    public string? EndpointName { get; set; }
    public string? RouteValuesJson { get; set; }
    public string? MetadataJson { get; set; }
}
