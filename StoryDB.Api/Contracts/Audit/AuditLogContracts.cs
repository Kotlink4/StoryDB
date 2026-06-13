namespace StoryDB.Api.Contracts.Audit;

public record AuditLogDto(
    int Id,
    DateTime CreatedAt,
    int? UserId,
    int? ProjectId,
    string TraceId,
    string Action,
    string HttpMethod,
    string Path,
    string? QueryString,
    int StatusCode,
    long DurationMs,
    string? IpAddress,
    string? UserAgent,
    string? EndpointName,
    string? RouteValuesJson,
    string? MetadataJson);
