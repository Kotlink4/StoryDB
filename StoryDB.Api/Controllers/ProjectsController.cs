using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController(StoryDbContext dbContext) : ControllerBase
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
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectListItemDto>>> GetProjects()
    {
        var userId = GetCurrentUserId();
        var projects = await dbContext.Projects
            .Include(project => project.Objects)
            .Include(project => project.ObjectTypes)
            .Where(project => project.OwnerUserId == userId)
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

        var userId = GetCurrentUserId();

        var enabledKeys = NormalizeEnabledObjectTypeKeys(request.EnabledObjectTypeKeys);
        var now = DateTime.UtcNow;
        var project = new Project
        {
            OwnerUserId = userId,
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
        await ApplyPresetSolutions(project.Id, request.PresetKeys);
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
            .FirstOrDefaultAsync(project => project.Id == id && project.OwnerUserId == GetCurrentUserId());

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
        await ApplyPresetSolutions(project.Id, request.PresetKeys);

        await dbContext.SaveChangesAsync();

        var dto = ToProjectListItemDto(project);

        return Ok(dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await dbContext.Projects
            .FirstOrDefaultAsync(project => project.Id == id && project.OwnerUserId == GetCurrentUserId());

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

        var catalogSelections = dbContext.StoryObjectCatalogSelections.Where(selection =>
            selection.StoryObject!.ProjectId == id ||
            selection.Catalog!.ProjectId == id);
        dbContext.StoryObjectCatalogSelections.RemoveRange(catalogSelections);

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
    private int GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : 0;
    }

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

    private async Task ApplyPresetSolutions(int projectId, IReadOnlyList<string>? presetKeys)
    {
        var normalizedPresetKeys = (presetKeys ?? [])
            .Select(key => key.Trim())
            .Where(key => key.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (normalizedPresetKeys.Count == 0)
        {
            return;
        }

        var objectTypes = await dbContext.ObjectTypes
            .Where(type => type.ProjectId == projectId)
            .ToDictionaryAsync(type => type.Key, StringComparer.OrdinalIgnoreCase);

        if (normalizedPresetKeys.Contains("character-basics"))
        {
            await EnsureAttributeGroupWithDefinitions(
                projectId,
                objectTypes,
                "characters",
                "Основная",
                [
                    new AttributePreset("Раса", "text"),
                    new AttributePreset("Происхождение", "text"),
                    new AttributePreset("Статус", "select", Options: ["Жив", "Мертв", "Пропал", "Неизвестно"]),
                    new AttributePreset("Мировоззрение", "text"),
                ]);
        }

        if (normalizedPresetKeys.Contains("body-attributes"))
        {
            await EnsureAttributeGroupWithDefinitions(
                projectId,
                objectTypes,
                "characters",
                "Тело",
                [
                    new AttributePreset("Рост", "number", Unit: "см"),
                    new AttributePreset("Вес", "number", Unit: "кг"),
                    new AttributePreset("Телосложение", "text"),
                    new AttributePreset("Цвет глаз", "text"),
                    new AttributePreset("Цвет волос", "text"),
                ]);
        }

        if (normalizedPresetKeys.Contains("world-catalogs"))
        {
            await EnsureCatalog(projectId, "races", "Расы", "Народы, виды и происхождение персонажей.", true, "entries");
            await EnsureCatalog(projectId, "cultures", "Культуры", "Культуры, традиции и сообщества мира.", true, "entries");
            await EnsureCatalog(projectId, "factions", "Фракции", "Политические силы, объединения и группы влияния.", true, "entries");
            await EnsureCatalog(projectId, "artifacts", "Артефакты", "Важные предметы, реликвии и уникальные вещи.", false, "entries");
        }

        if (normalizedPresetKeys.Contains("magic-skills-catalogs"))
        {
            await EnsureCatalog(projectId, "magic-schools", "Школы магии", "Направления, традиции и источники магии.", true, "entries");
            await EnsureCatalog(projectId, "spells", "Заклинания", "Заклинания, техники и магические эффекты.", false, "entries");
            await EnsureCatalog(projectId, "skills", "Навыки", "Навыки, умения и владения персонажей.", true, "entries");
            await EnsureCatalog(projectId, "abilities", "Способности", "Уникальные способности и особые свойства.", false, "entries");
        }
    }

    private async Task EnsureAttributeGroupWithDefinitions(
        int projectId,
        IReadOnlyDictionary<string, ObjectType> objectTypes,
        string typeKey,
        string groupName,
        IReadOnlyList<AttributePreset> definitions)
    {
        if (!objectTypes.TryGetValue(typeKey, out var objectType))
        {
            return;
        }

        var group = await dbContext.AttributeGroups.FirstOrDefaultAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.ObjectTypeId == objectType.Id &&
            currentGroup.Name == groupName);
        if (group is null)
        {
            group = new AttributeGroup
            {
                ProjectId = projectId,
                ObjectTypeId = objectType.Id,
                Name = groupName,
                SortOrder = 100,
            };
            dbContext.AttributeGroups.Add(group);
            await dbContext.SaveChangesAsync();
        }

        var existingDefinitionNames = await dbContext.AttributeDefinitions
            .Where(definition => definition.ProjectId == projectId && definition.ObjectTypeId == objectType.Id)
            .Select(definition => definition.Name)
            .ToListAsync();
        var existingNames = existingDefinitionNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var sortOrder = 100;

        foreach (var definition in definitions)
        {
            if (existingNames.Contains(definition.Name))
            {
                continue;
            }

            dbContext.AttributeDefinitions.Add(new AttributeDefinition
            {
                ProjectId = projectId,
                ObjectTypeId = objectType.Id,
                AttributeGroupId = group.Id,
                Name = definition.Name,
                DataType = definition.DataType,
                Unit = definition.Unit,
                OptionsJson = definition.Options is null || definition.Options.Count == 0
                    ? null
                    : JsonSerializer.Serialize(definition.Options),
                SortOrder = sortOrder,
            });
            sortOrder += 10;
        }
    }

    private async Task EnsureCatalog(
        int projectId,
        string key,
        string name,
        string description,
        bool supportsHierarchy,
        string hierarchyMode)
    {
        var catalog = await dbContext.Catalogs.FirstOrDefaultAsync(currentCatalog =>
            currentCatalog.ProjectId == projectId &&
            (currentCatalog.Key == key || currentCatalog.Name == name));
        if (catalog is not null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        catalog = new Catalog
        {
            ProjectId = projectId,
            Key = key,
            Name = name,
            Description = description,
            IsSystem = false,
            SupportsHierarchy = supportsHierarchy,
            HierarchyMode = hierarchyMode,
            SortOrder = 100,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Catalogs.Add(catalog);
        await dbContext.SaveChangesAsync();

        dbContext.CatalogEntryGroups.Add(new CatalogEntryGroup
        {
            CatalogId = catalog.Id,
            Name = "Основная",
            SortOrder = 10,
        });
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
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

public record UpdateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

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

public record AttributePreset(
    string Name,
    string DataType,
    string? Unit = null,
    IReadOnlyList<string>? Options = null);
