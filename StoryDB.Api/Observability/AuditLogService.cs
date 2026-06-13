using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Audit;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Observability;

public sealed class AuditLogService(StoryDbContext dbContext) : IAuditLogService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task WriteRequestAuditAsync(
        HttpContext context,
        long durationMs,
        CancellationToken cancellationToken = default)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
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

        var auditLog = new AuditLog
        {
            CreatedAt = DateTime.UtcNow,
            UserId = RequestObservation.GetUserId(context),
            ProjectId = RequestObservation.GetProjectId(context),
            TraceId = traceId,
            Action = ResolveAction(context),
            HttpMethod = context.Request.Method,
            Path = context.Request.Path.Value ?? string.Empty,
            QueryString = NormalizeQueryString(context.Request.QueryString.Value),
            StatusCode = context.Response.StatusCode,
            DurationMs = durationMs,
            IpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Truncate(context.Request.Headers.UserAgent.ToString(), 512),
            RequestContentType = Truncate(context.Request.ContentType, 160),
            RequestContentLength = context.Request.ContentLength,
            EndpointName = Truncate(context.GetEndpoint()?.DisplayName, 300),
            RouteValuesJson = routeValues.Count == 0 ? null : JsonSerializer.Serialize(routeValues, JsonOptions),
            MetadataJson = JsonSerializer.Serialize(metadata, JsonOptions),
        };

        dbContext.AuditLogs.Add(auditLog);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLogDto>> GetProjectLogsAsync(
        int projectId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        return await dbContext.AuditLogs
            .AsNoTracking()
            .Where(log => log.ProjectId == projectId)
            .OrderByDescending(log => log.CreatedAt)
            .ThenByDescending(log => log.Id)
            .Take(safeLimit)
            .Select(log => ToDto(log))
            .ToListAsync(cancellationToken);
    }

    private static AuditLogDto ToDto(AuditLog log) =>
        new(
            log.Id,
            log.CreatedAt,
            log.UserId,
            log.ProjectId,
            log.TraceId,
            log.Action,
            log.HttpMethod,
            log.Path,
            log.QueryString,
            log.StatusCode,
            log.DurationMs,
            log.IpAddress,
            log.UserAgent,
            log.EndpointName,
            log.RouteValuesJson,
            log.MetadataJson);

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
