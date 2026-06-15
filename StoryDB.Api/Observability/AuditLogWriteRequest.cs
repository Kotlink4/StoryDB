using System.Diagnostics;
using System.Text.Json;

namespace StoryDB.Api.Observability;

public sealed record AuditLogWriteRequest(
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
    string? RequestContentType,
    long? RequestContentLength,
    string? EndpointName,
    string? RouteValuesJson,
    string? MetadataJson)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static AuditLogWriteRequest FromHttpContext(HttpContext context, long durationMs)
    {
        var routeValues = context.Request.RouteValues
            .Where(item => item.Value is not null)
            .ToDictionary(item => item.Key, item => Convert.ToString(item.Value));
        var metadata = new Dictionary<string, object?>
        {
            ["scheme"] = context.Request.Scheme,
            ["host"] = context.Request.Host.Value,
            ["protocol"] = context.Request.Protocol,
            ["referer"] = context.Request.Headers.Referer.ToString(),
            ["origin"] = context.Request.Headers.Origin.ToString(),
        };

        return new AuditLogWriteRequest(
            DateTime.UtcNow,
            RequestObservation.GetUserId(context),
            RequestObservation.GetProjectId(context),
            Activity.Current?.Id ?? context.TraceIdentifier,
            ResolveAction(context),
            context.Request.Method,
            context.Request.Path.Value ?? string.Empty,
            NormalizeQueryString(context.Request.QueryString.Value),
            context.Response.StatusCode,
            durationMs,
            context.Connection.RemoteIpAddress?.ToString(),
            Truncate(context.Request.Headers.UserAgent.ToString(), 512),
            Truncate(context.Request.ContentType, 160),
            context.Request.ContentLength,
            Truncate(context.GetEndpoint()?.DisplayName, 300),
            routeValues.Count == 0 ? null : JsonSerializer.Serialize(routeValues, JsonOptions),
            JsonSerializer.Serialize(metadata, JsonOptions));
    }

    private static string ResolveAction(HttpContext context)
    {
        var endpoint = context.GetEndpoint()?.DisplayName;
        if (!string.IsNullOrWhiteSpace(endpoint))
        {
            return endpoint;
        }

        return $"{context.Request.Method} {context.Request.Path}";
    }

    private static string? NormalizeQueryString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Truncate(value, 1000);
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
