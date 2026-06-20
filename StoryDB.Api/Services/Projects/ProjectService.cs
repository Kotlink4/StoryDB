using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.TemplatePacks;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Projects;

public sealed partial class ProjectService(
    StoryDbContext dbContext,
    IProjectAccessService projectAccessService,
    ITemplatePackService templatePackService,
    ICacheSingleFlight cacheSingleFlight) : IProjectService
{
    private static readonly ObjectTypeTemplate[] ObjectTypeTemplates =
    [
        new("characters", "Characters", "user", "#1f5b4f", 10, true),
        new("items", "Items", "package", "#b75332", 20, false),
        new("places", "Places", "map-pin", "#515a9d", 30, false),
        new("organizations", "Organizations", "building-2", "#7a4d8f", 40, false),
        new("hierarchy", "Hierarchical", "git-branch", "#5d7a42", 50, false),
    ];

    private static readonly string[] DefaultEnabledObjectTypeKeys = ["characters", "items", "places", "organizations"];

    public async Task<IReadOnlyList<ProjectListItem>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        var projects = await projectAccessService.GetAccessibleProjects()
            .AsNoTracking()
            .OrderByDescending(project => project.UpdatedAt)
            .Select(project => new ProjectListItem(
                project.Id,
                project.OwnerUserId,
                project.Name,
                project.CoverImagePath,
                project.Objects.Count,
                project.UpdatedAt,
                project.Visibility,
                project.ObjectTypes
                    .OrderBy(type => type.SortOrder)
                    .Select(type => new ProjectObjectTypeListItem(type.Key, type.Name, type.IsEnabled, type.SortOrder))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return projects;
    }

    public async Task<Project?> CreateProjectAsync(ProjectDraft draft, CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        var enabledKeys = NormalizeEnabledObjectTypeKeys(draft.EnabledObjectTypeKeys);
        var now = DateTime.UtcNow;
        var project = new Project
        {
            OwnerUserId = userId.Value,
            Name = draft.Name.Trim(),
            CoverImagePath = ValidationRules.NormalizeOptionalText(draft.CoverImagePath),
            Visibility = ProjectVisibility.Normalize(draft.Visibility),
            CreatedAt = now,
            UpdatedAt = now,
            ObjectTypes = ObjectTypeTemplates
                .Select(type => new ObjectType
                {
                    Key = type.Key,
                    Name = type.Name,
                    Icon = type.Icon,
                    Color = type.Color,
                    SortOrder = type.SortOrder,
                    IsEnabled = enabledKeys.Contains(type.Key),
                })
                .ToList(),
        };

        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync(cancellationToken);
        await ApplyPresetSolutions(project.Id, draft.PresetKeys, cancellationToken);
        await templatePackService.ApplyTemplatePacksAsync(project.Id, draft.TemplatePackIds, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCaches(project.Id);

        return project;
    }

    public async Task<Project?> UpdateProjectAsync(
        int projectId,
        ProjectDraft draft,
        CancellationToken cancellationToken = default)
    {
        var project = await projectAccessService.GetEditableProjects()
            .Include(currentProject => currentProject.Objects)
            .Include(currentProject => currentProject.ObjectTypes)
            .FirstOrDefaultAsync(currentProject => currentProject.Id == projectId, cancellationToken);

        if (project is null)
        {
            return null;
        }

        project.Name = draft.Name.Trim();
        project.CoverImagePath = ValidationRules.NormalizeOptionalText(draft.CoverImagePath);
        if (project.OwnerUserId == projectAccessService.CurrentUserId)
        {
            project.Visibility = ProjectVisibility.Normalize(draft.Visibility);
        }
        project.UpdatedAt = DateTime.UtcNow;

        if (draft.EnabledObjectTypeKeys is not null)
        {
            var enabledKeys = NormalizeEnabledObjectTypeKeys(draft.EnabledObjectTypeKeys);
            EnsureProjectObjectTypes(project);

            foreach (var objectType in project.ObjectTypes)
            {
                objectType.IsEnabled = enabledKeys.Contains(objectType.Key);
            }
        }

        await ApplyPresetSolutions(project.Id, draft.PresetKeys, cancellationToken);
        await templatePackService.ApplyTemplatePacksAsync(project.Id, draft.TemplatePackIds, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCaches(projectId);

        return project;
    }

    public async Task<bool> DeleteProjectAsync(int projectId, CancellationToken cancellationToken = default)
    {
        var project = await projectAccessService.FindOwnedProjectAsync(projectId, cancellationToken);
        if (project is null)
        {
            return false;
        }

        var hierarchyNodeIds = await dbContext.HierarchyNodes
            .Where(node => node.Group!.ProjectId == projectId)
            .Select(node => node.Id)
            .ToListAsync(cancellationToken);
        var hierarchyLinks = dbContext.HierarchyLinks.Where(link =>
            hierarchyNodeIds.Contains(link.ParentNodeId) ||
            hierarchyNodeIds.Contains(link.ChildNodeId));
        dbContext.HierarchyLinks.RemoveRange(hierarchyLinks);

        var catalogEntryIds = await dbContext.CatalogEntries
            .Where(entry => entry.Catalog!.ProjectId == projectId)
            .Select(entry => entry.Id)
            .ToListAsync(cancellationToken);
        var catalogHierarchyLinks = dbContext.CatalogEntryHierarchyLinks.Where(link =>
            catalogEntryIds.Contains(link.ParentEntryId) ||
            catalogEntryIds.Contains(link.ChildEntryId));
        dbContext.CatalogEntryHierarchyLinks.RemoveRange(catalogHierarchyLinks);

        var catalogEntryGroupIds = await dbContext.CatalogEntryGroups
            .Where(group => group.Catalog!.ProjectId == projectId)
            .Select(group => group.Id)
            .ToListAsync(cancellationToken);
        var catalogGroupHierarchyLinks = dbContext.CatalogEntryGroupHierarchyLinks.Where(link =>
            catalogEntryGroupIds.Contains(link.ParentGroupId) ||
            catalogEntryGroupIds.Contains(link.ChildGroupId));
        dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(catalogGroupHierarchyLinks);

        var catalogSelections = dbContext.StoryObjectCatalogSelections.Where(selection =>
            selection.StoryObject!.ProjectId == projectId ||
            selection.Catalog!.ProjectId == projectId);
        dbContext.StoryObjectCatalogSelections.RemoveRange(catalogSelections);

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private void InvalidateProjectCaches(int projectId) =>
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.ProjectPrefix(projectId));

    private static HashSet<string> NormalizeEnabledObjectTypeKeys(IReadOnlyList<string>? enabledObjectTypeKeys)
    {
        var allowedKeys = ObjectTypeTemplates.Select(type => type.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var enabledKeys = (enabledObjectTypeKeys ?? [])
            .Where(allowedKeys.Contains)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var key in DefaultEnabledObjectTypeKeys)
        {
            enabledKeys.Add(key);
        }

        return enabledKeys;
    }

    private static void EnsureProjectObjectTypes(Project project)
    {
        foreach (var template in ObjectTypeTemplates)
        {
            var existingType = project.ObjectTypes.FirstOrDefault(type => type.Key == template.Key);
            if (existingType is not null)
            {
                existingType.Name = template.Name;
                existingType.Icon = template.Icon;
                existingType.Color = template.Color;
                existingType.SortOrder = template.SortOrder;
                continue;
            }

            project.ObjectTypes.Add(new ObjectType
            {
                Key = template.Key,
                Name = template.Name,
                Icon = template.Icon,
                Color = template.Color,
                SortOrder = template.SortOrder,
                IsEnabled = template.IsRequired,
            });
        }
    }

    private sealed record ObjectTypeTemplate(
        string Key,
        string Name,
        string Icon,
        string Color,
        int SortOrder,
        bool IsRequired);

}
