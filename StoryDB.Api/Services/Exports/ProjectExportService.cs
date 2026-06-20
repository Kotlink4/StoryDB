using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Files;
using StoryDB.Api.Services.Projects;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService(
    IProjectSnapshotService snapshotService,
    IFileStorageService fileStorageService) : IProjectExportService
{
    private const int MaxExportedObjects = 100;
    private const string DocxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private const string Navy = "0B2545";
    private const string Blue = "2E74B5";
    private const string DarkBlue = "1F4D78";
    private const string Ink = "171F2A";
    private const string Muted = "5B6F87";
    private const string LightBlueFill = "E8EEF5";
    private const string SoftFill = "F4F6F9";
    private const string BorderColor = "CAD6E2";

    public async Task<ProjectExportServiceResult<ProjectDossierExportDocument>> ExportDossiersAsync(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default)
    {
        var objectIds = request.ObjectIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        if (objectIds.Length == 0)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                "Select at least one object to export.");
        }

        if (objectIds.Length > MaxExportedObjects)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                $"A single Word export can include up to {MaxExportedObjects} objects.");
        }

        var snapshotResult = await snapshotService.GetLatestSnapshotAsync(projectId, "current", cancellationToken);
        if (snapshotResult.Status == ProjectSnapshotServiceStatus.NotFound)
        {
            snapshotResult = await snapshotService.PublishCurrentSnapshotAsync(projectId, cancellationToken);
        }

        if (snapshotResult.Status == ProjectSnapshotServiceStatus.NotFound)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        if (snapshotResult.Status == ProjectSnapshotServiceStatus.Invalid)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                snapshotResult.Error ?? "Project snapshot is not ready for export.");
        }

        var snapshot = snapshotResult.Value!;
        if (string.Equals(snapshot.Status, "failed", StringComparison.OrdinalIgnoreCase))
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                "Project snapshot is not ready for export.");
        }

        var objects = SelectSnapshotObjects(snapshot.Data, objectIds);
        if (objects.Count != objectIds.Length)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        var typeOrder = snapshot.Data.ObjectTypes
            .Select((type, index) => new { type.Key, type.Name, Index = index })
            .ToDictionary(type => type.Key, type => type, StringComparer.OrdinalIgnoreCase);
        var orderedObjects = objects
            .OrderBy(storyObject => typeOrder.TryGetValue(storyObject.TypeKey, out var type) ? type.Index : int.MaxValue)
            .ThenBy(storyObject => typeOrder.TryGetValue(storyObject.TypeKey, out var type) ? type.Name : storyObject.TypeKey)
            .ThenBy(storyObject => GetObjectDisplayName(storyObject))
            .ToList();

        var content = BuildDossierDocument(snapshot.Data, orderedObjects, request);
        var fileName = $"{ToFileName(snapshot.Data.Project.Name)}-dossiers-{DateTime.UtcNow:yyyyMMdd-HHmm}.docx";

        return ProjectExportServiceResult<ProjectDossierExportDocument>.Success(
            new ProjectDossierExportDocument(fileName, DocxContentType, content));
    }

    private static List<StoryObjectDto> SelectSnapshotObjects(
        ProjectSnapshotDataDto snapshotData,
        IReadOnlyCollection<int> objectIds) =>
        snapshotData.ObjectsByType
            .Values
            .SelectMany(objects => objects)
            .Where(storyObject => objectIds.Contains(storyObject.Id))
            .GroupBy(storyObject => storyObject.Id)
            .Select(group => group.First())
            .ToList();
}
