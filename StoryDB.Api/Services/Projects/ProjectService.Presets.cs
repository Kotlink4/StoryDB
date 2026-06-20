using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Projects;

public sealed partial class ProjectService
{
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

    private sealed record AttributePreset(
        string Name,
        string DataType,
        string? Unit = null,
        IReadOnlyList<string>? Options = null);
}
