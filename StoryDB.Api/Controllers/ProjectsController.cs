using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController(StoryDbContext dbContext) : ControllerBase
{
    private const int LocalUserId = 1;
    private static readonly ObjectTypeTemplate[] ObjectTypeTemplates =
    [
        new("characters", "Characters", "user", "#1f5b4f", 10, true),
        new("items", "Items", "package", "#b75332", 20, false),
        new("places", "Places", "map-pin", "#515a9d", 30, false),
        new("organizations", "Organizations", "building-2", "#7a4d8f", 40, false),
        new("hierarchy", "Hierarchical", "git-branch", "#5d7a42", 50, false),
    ];
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectListItemDto>>> GetProjects()
    {
        var projects = await dbContext.Projects
            .Include(project => project.Objects)
            .Include(project => project.ObjectTypes)
            .Where(project => project.OwnerUserId == LocalUserId)
            .OrderByDescending(project => project.UpdatedAt)
            .ToListAsync();

        var hasMissingObjectTypes = false;
        foreach (var project in projects)
        {
            var objectTypeCount = project.ObjectTypes.Count;
            EnsureProjectObjectTypes(project);
            hasMissingObjectTypes = hasMissingObjectTypes || project.ObjectTypes.Count != objectTypeCount;
        }

        if (hasMissingObjectTypes)
        {
            await dbContext.SaveChangesAsync();
        }

        return Ok(projects.Select(ToProjectListItemDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ProjectListItemDto>> CreateProject(CreateProjectRequest request)
    {
        var nameError = ValidateName(request.Name, "Project name");
        if (nameError is not null)
        {
            return BadRequest(nameError);
        }

        await EnsureLocalUserExists();

        var enabledKeys = NormalizeEnabledObjectTypeKeys(request.EnabledObjectTypeKeys);
        var now = DateTime.UtcNow;
        var project = new Project
        {
            OwnerUserId = LocalUserId,
            Name = request.Name.Trim(),
            CoverImagePath = request.CoverImagePath,
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
        await dbContext.SaveChangesAsync();

        var dto = ToProjectListItemDto(project);
        return CreatedAtAction(nameof(GetProjects), new { id = project.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProjectListItemDto>> UpdateProject(int id, UpdateProjectRequest request)
    {
        var nameError = ValidateName(request.Name, "Project name");
        if (nameError is not null)
        {
            return BadRequest(nameError);
        }

        var project = await dbContext.Projects
            .Include(project => project.Objects)
            .Include(project => project.ObjectTypes)
            .FirstOrDefaultAsync(project => project.Id == id && project.OwnerUserId == LocalUserId);

        if (project is null)
        {
            return NotFound();
        }

        project.Name = request.Name.Trim();
        project.CoverImagePath = request.CoverImagePath;
        project.UpdatedAt = DateTime.UtcNow;
        if (request.EnabledObjectTypeKeys is not null)
        {
            var enabledKeys = NormalizeEnabledObjectTypeKeys(request.EnabledObjectTypeKeys);
            EnsureProjectObjectTypes(project);

            foreach (var objectType in project.ObjectTypes)
            {
                objectType.IsEnabled = enabledKeys.Contains(objectType.Key);
            }
        }

        await dbContext.SaveChangesAsync();

        var dto = ToProjectListItemDto(project);

        return Ok(dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await dbContext.Projects
            .FirstOrDefaultAsync(project => project.Id == id && project.OwnerUserId == LocalUserId);

        if (project is null)
        {
            return NotFound();
        }

        var hierarchyNodeIds = await dbContext.HierarchyNodes
            .Where(node => node.Group!.ProjectId == id)
            .Select(node => node.Id)
            .ToListAsync();
        var hierarchyLinks = dbContext.HierarchyLinks.Where(link =>
            hierarchyNodeIds.Contains(link.ParentNodeId) ||
            hierarchyNodeIds.Contains(link.ChildNodeId));
        dbContext.HierarchyLinks.RemoveRange(hierarchyLinks);

        var catalogEntryIds = await dbContext.CatalogEntries
            .Where(entry => entry.Catalog!.ProjectId == id)
            .Select(entry => entry.Id)
            .ToListAsync();
        var catalogHierarchyLinks = dbContext.CatalogEntryHierarchyLinks.Where(link =>
            catalogEntryIds.Contains(link.ParentEntryId) ||
            catalogEntryIds.Contains(link.ChildEntryId));
        dbContext.CatalogEntryHierarchyLinks.RemoveRange(catalogHierarchyLinks);

        var catalogEntryGroupIds = await dbContext.CatalogEntryGroups
            .Where(group => group.Catalog!.ProjectId == id)
            .Select(group => group.Id)
            .ToListAsync();
        var catalogGroupHierarchyLinks = dbContext.CatalogEntryGroupHierarchyLinks.Where(link =>
            catalogEntryGroupIds.Contains(link.ParentGroupId) ||
            catalogEntryGroupIds.Contains(link.ChildGroupId));
        dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(catalogGroupHierarchyLinks);

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private static string? ValidateName(string name, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"{fieldName} is required.";
        }

        if (name.Trim().Length > 120)
        {
            return $"{fieldName} must be 120 characters or shorter.";
        }

        return null;
    }
    private async Task EnsureLocalUserExists()
    {
        var exists = await dbContext.Users.AnyAsync(user => user.Id == LocalUserId);
        if (exists)
        {
            return;
        }

        dbContext.Users.Add(new AppUser
        {
            Id = LocalUserId,
            DisplayName = "Local User",
            CreatedAt = DateTime.UtcNow,
        });
    }

    private static HashSet<string> NormalizeEnabledObjectTypeKeys(IReadOnlyList<string>? enabledObjectTypeKeys)
    {
        var allowedKeys = ObjectTypeTemplates.Select(type => type.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var enabledKeys = (enabledObjectTypeKeys ?? [])
            .Where(allowedKeys.Contains)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        enabledKeys.Add("characters");
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


    private static ProjectListItemDto ToProjectListItemDto(Project project)
    {
        return new ProjectListItemDto(
            project.Id,
            project.Name,
            project.CoverImagePath,
            project.Objects.Count,
            project.UpdatedAt,
            project.ObjectTypes
                .OrderBy(type => type.SortOrder)
                .Select(type => new ObjectTypeDto(type.Key, type.Name, type.IsEnabled))
                .ToList());
    }
}

public record CreateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys);

public record UpdateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys);

public record ProjectListItemDto(
    int Id,
    string Name,
    string? CoverImagePath,
    int ObjectCount,
    DateTime UpdatedAt,
    IReadOnlyList<ObjectTypeDto> ObjectTypes);

public record ObjectTypeDto(string Key, string Name, bool IsEnabled);

public record ObjectTypeTemplate(
    string Key,
    string Name,
    string Icon,
    string Color,
    int SortOrder,
    bool IsRequired);
