using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Audit;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Observability;

public sealed class AuditLogService(StoryDbContext dbContext) : IAuditLogService
{
    public async Task WriteRequestAuditAsync(AuditLogWriteRequest request, CancellationToken cancellationToken = default)
    {
        var projectId = request.ProjectId;
        if (projectId.HasValue &&
            !await dbContext.Projects
                .AsNoTracking()
                .AnyAsync(project => project.Id == projectId.Value, cancellationToken))
        {
            projectId = null;
        }

        var auditLog = new AuditLog
        {
            CreatedAt = request.CreatedAt,
            UserId = request.UserId,
            ProjectId = projectId,
            TraceId = request.TraceId,
            Action = request.Action,
            HttpMethod = request.HttpMethod,
            Path = request.Path,
            QueryString = request.QueryString,
            StatusCode = request.StatusCode,
            DurationMs = request.DurationMs,
            IpAddress = request.IpAddress,
            UserAgent = request.UserAgent,
            RequestContentType = request.RequestContentType,
            RequestContentLength = request.RequestContentLength,
            EndpointName = request.EndpointName,
            RouteValuesJson = request.RouteValuesJson,
            MetadataJson = request.MetadataJson,
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
}
