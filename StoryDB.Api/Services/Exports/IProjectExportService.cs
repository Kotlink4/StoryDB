using StoryDB.Api.Contracts.Exports;

namespace StoryDB.Api.Services.Exports;

public interface IProjectExportService
{
    Task<ProjectExportServiceResult<ProjectDossierExportDocument>> ExportDossiersAsync(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default);
}
