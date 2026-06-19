using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Files;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService(StoryDbContext dbContext, IFileStorageService fileStorageService) : IProjectExportService
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

        var project = await dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(currentProject => currentProject.Id == projectId, cancellationToken);
        if (project is null)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        var objects = await LoadObjects(projectId, objectIds, cancellationToken);
        if (objects.Count != objectIds.Length)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        var orderedObjects = objects
            .OrderBy(storyObject => storyObject.ObjectType?.SortOrder ?? int.MaxValue)
            .ThenBy(storyObject => storyObject.ObjectType?.Name ?? storyObject.ObjectType?.Key ?? "")
            .ThenBy(storyObject => GetObjectDisplayName(storyObject))
            .ToList();

        var content = BuildDossierDocument(project, orderedObjects, request);
        var fileName = $"{ToFileName(project.Name)}-dossiers-{DateTime.UtcNow:yyyyMMdd-HHmm}.docx";

        return ProjectExportServiceResult<ProjectDossierExportDocument>.Success(
            new ProjectDossierExportDocument(fileName, DocxContentType, content));
    }

    private async Task<List<StoryObject>> LoadObjects(
        int projectId,
        IReadOnlyCollection<int> objectIds,
        CancellationToken cancellationToken)
    {
        return await dbContext.Objects
            .AsNoTracking()
            .AsSplitQuery()
            .Where(storyObject => storyObject.ProjectId == projectId && objectIds.Contains(storyObject.Id))
            .Include(storyObject => storyObject.ObjectType)
            .Include(storyObject => storyObject.Attributes)
                .ThenInclude(attribute => attribute.AttributeDefinition)
                .ThenInclude(definition => definition!.AttributeGroup)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.Catalog)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.CatalogEntryGroup)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.CatalogEntry)
            .Include(storyObject => storyObject.HierarchySelections)
                .ThenInclude(selection => selection.HierarchyGroup)
            .Include(storyObject => storyObject.HierarchySelections)
                .ThenInclude(selection => selection.HierarchyNode)
            .Include(storyObject => storyObject.OwnedItems)
                .ThenInclude(link => link.ItemObject)
                .ThenInclude(item => item!.ObjectType)
            .Include(storyObject => storyObject.Owners)
                .ThenInclude(link => link.OwnerCharacter)
                .ThenInclude(owner => owner!.ObjectType)
            .Include(storyObject => storyObject.OutgoingRelations)
                .ThenInclude(relation => relation.TargetObject)
                .ThenInclude(target => target!.ObjectType)
            .Include(storyObject => storyObject.IncomingRelations)
                .ThenInclude(relation => relation.SourceObject)
                .ThenInclude(source => source!.ObjectType)
            .Include(storyObject => storyObject.OutgoingCharacterRelationships)
                .ThenInclude(relation => relation.TargetCharacter)
                .ThenInclude(target => target!.ObjectType)
            .Include(storyObject => storyObject.IncomingCharacterRelationships)
                .ThenInclude(relation => relation.SourceCharacter)
                .ThenInclude(source => source!.ObjectType)
            .Include(storyObject => storyObject.StructureAssignments)
                .ThenInclude(assignment => assignment.StructureUsage)
                .ThenInclude(usage => usage!.Structure)
            .Include(storyObject => storyObject.StructureAssignments)
                .ThenInclude(assignment => assignment.StructureNode)
            .ToListAsync(cancellationToken);
    }
}

