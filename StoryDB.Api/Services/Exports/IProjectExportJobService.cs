using StoryDB.Api.Contracts.Exports;

namespace StoryDB.Api.Services.Exports;

public interface IProjectExportJobService
{
    Task<ProjectExportJobDto> EnqueueDossierExportAsync(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default);

    ProjectExportJobDto? GetJob(Guid jobId);

    ProjectExportServiceResult<ProjectDossierExportDocument> GetCompletedDocument(Guid jobId);

    ProjectExportQueueStatsDto GetStats();
}
