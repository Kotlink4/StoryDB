using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Projects;

public sealed class ProjectService(
    StoryDbContext dbContext,
    IProjectAccessService projectAccessService) : IProjectService
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

    public async Task<IReadOnlyList<Project>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        var projects = await projectAccessService.GetAccessibleProjects()
            .Include(project => project.Objects)
            .Include(project => project.ObjectTypes)
            .OrderByDescending(project => project.UpdatedAt)
            .ToListAsync(cancellationToken);

        var hasMissingObjectTypes = false;
        foreach (var project in projects)
        {
            var objectTypeCount = project.ObjectTypes.Count;
            EnsureProjectObjectTypes(project);
            hasMissingObjectTypes = hasMissingObjectTypes || project.ObjectTypes.Count != objectTypeCount;
        }

        if (hasMissingObjectTypes)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

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
        await dbContext.SaveChangesAsync(cancellationToken);

        return project;
    }

    public async Task<Project?> UpdateProjectAsync(
        int projectId,
        ProjectDraft draft,
        CancellationToken cancellationToken = default)
    {
        var project = await projectAccessService.GetAccessibleProjects()
            .Include(currentProject => currentProject.Objects)
            .Include(currentProject => currentProject.ObjectTypes)
            .FirstOrDefaultAsync(currentProject => currentProject.Id == projectId, cancellationToken);

        if (project is null)
        {
            return null;
        }

        project.Name = draft.Name.Trim();
        project.CoverImagePath = ValidationRules.NormalizeOptionalText(draft.CoverImagePath);
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
        await dbContext.SaveChangesAsync(cancellationToken);

        return project;
    }

    public async Task<bool> DeleteProjectAsync(int projectId, CancellationToken cancellationToken = default)
    {
        var project = await projectAccessService.FindAccessibleProjectAsync(projectId, cancellationToken);
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

    private async Task ApplyPresetSolutions(
        int projectId,
        IReadOnlyList<string>? presetKeys,
        CancellationToken cancellationToken)
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
            .ToDictionaryAsync(type => type.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);

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
                ],
                cancellationToken);
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
                ],
                cancellationToken);
        }

        if (normalizedPresetKeys.Contains("world-catalogs"))
        {
            await EnsureCatalog(projectId, "races", "Расы", "Народы, виды и происхождение персонажей.", true, "entries", cancellationToken);
            await EnsureCatalog(projectId, "cultures", "Культуры", "Культуры, традиции и сообщества мира.", true, "entries", cancellationToken);
            await EnsureCatalog(projectId, "factions", "Фракции", "Политические силы, объединения и группы влияния.", true, "entries", cancellationToken);
            await EnsureCatalog(projectId, "artifacts", "Артефакты", "Важные предметы, реликвии и уникальные вещи.", false, "entries", cancellationToken);
        }

        if (normalizedPresetKeys.Contains("magic-skills-catalogs"))
        {
            await EnsureCatalog(projectId, "magic-schools", "Школы магии", "Направления, традиции и источники магии.", true, "entries", cancellationToken);
            await EnsureCatalog(projectId, "spells", "Заклинания", "Заклинания, техники и магические эффекты.", false, "entries", cancellationToken);
            await EnsureCatalog(projectId, "skills", "Навыки", "Навыки, умения и владения персонажей.", true, "entries", cancellationToken);
            await EnsureCatalog(projectId, "abilities", "Способности", "Уникальные способности и особые свойства.", false, "entries", cancellationToken);
        }
    }

    private async Task EnsureAttributeGroupWithDefinitions(
        int projectId,
        IReadOnlyDictionary<string, ObjectType> objectTypes,
        string typeKey,
        string groupName,
        IReadOnlyList<AttributePreset> definitions,
        CancellationToken cancellationToken)
    {
        if (!objectTypes.TryGetValue(typeKey, out var objectType))
        {
            return;
        }

        var group = await dbContext.AttributeGroups.FirstOrDefaultAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.ObjectTypeId == objectType.Id &&
            currentGroup.Name == groupName,
            cancellationToken);
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
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var existingDefinitionNames = await dbContext.AttributeDefinitions
            .Where(definition => definition.ProjectId == projectId && definition.ObjectTypeId == objectType.Id)
            .Select(definition => definition.Name)
            .ToListAsync(cancellationToken);
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
        string hierarchyMode,
        CancellationToken cancellationToken)
    {
        var catalog = await dbContext.Catalogs.FirstOrDefaultAsync(currentCatalog =>
            currentCatalog.ProjectId == projectId &&
            (currentCatalog.Key == key || currentCatalog.Name == name),
            cancellationToken);
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
        await dbContext.SaveChangesAsync(cancellationToken);

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

    private sealed record ObjectTypeTemplate(
        string Key,
        string Name,
        string Icon,
        string Color,
        int SortOrder,
        bool IsRequired);

    private sealed record AttributePreset(
        string Name,
        string DataType,
        string? Unit = null,
        IReadOnlyList<string>? Options = null);
}
