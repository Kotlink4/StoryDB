using StoryDB.Api.Contracts.Audit;

namespace StoryDB.Api.Observability;

public interface IAuditLogService
{
    Task WriteRequestAuditAsync(AuditLogWriteRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogDto>> GetProjectLogsAsync(int projectId, int limit, CancellationToken cancellationToken = default);
}
