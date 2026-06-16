namespace StoryDB.Api.Contracts.Exports;

public sealed record ProjectDossierExportRequest(
    IReadOnlyList<int> ObjectIds,
    bool IncludeAttributes = true,
    bool IncludeCatalogs = true,
    bool IncludeRelations = true,
    bool IncludeStructureAssignments = true);

public sealed record ProjectDossierExportDocument(
    string FileName,
    string ContentType,
    byte[] Content);

public sealed record ProjectCompletedExportFile(
    string FilePath,
    string FileName,
    string ContentType);

public sealed record ProjectExportJobDto(
    Guid Id,
    int ProjectId,
    string Kind,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string? FileName,
    string? Error);

public sealed record ProjectExportQueueStatsDto(
    int Capacity,
    int QueueDepth,
    int RetainedJobs,
    long EnqueuedTotal,
    long StartedTotal,
    long CompletedTotal,
    int Queued,
    int Running,
    int Succeeded,
    int Failed);
