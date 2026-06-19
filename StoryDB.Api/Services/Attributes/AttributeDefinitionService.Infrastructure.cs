using System.Text.Json;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace StoryDB.Api.Services.Attributes;

public sealed partial class AttributeDefinitionService
{
    private async Task<ObjectType?> GetObjectType(int projectId, string typeKey)
    {
        return await dbContext.ObjectTypes
            .FirstOrDefaultAsync(type =>
                type.ProjectId == projectId &&
                type.Key == typeKey &&
                type.IsEnabled);
    }

    private void InvalidateAttributeCaches(int projectId, string typeKey)
    {
        cacheSingleFlight.Remove(ProjectCacheKeys.AttributeGroups(projectId, typeKey));
        cacheSingleFlight.Remove(ProjectCacheKeys.AttributeDefinitions(projectId, typeKey));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.ObjectDetailsPrefix(projectId));
    }

    private void InvalidateAllAttributeCaches(int projectId)
    {
        foreach (var typeKey in new[] { "characters", "items", "places", "organizations", "hierarchy" })
        {
            InvalidateAttributeCaches(projectId, typeKey);
        }
    }

    private async Task<AttributeGroup?> GetOrCreateGroup(
        int projectId,
        int objectTypeId,
        string? groupName,
        string? iconKey = null)
    {
        var normalizedGroupName = TrimToNull(groupName);
        if (normalizedGroupName is null)
        {
            return null;
        }

        var group = await dbContext.AttributeGroups
            .FirstOrDefaultAsync(group =>
                group.ProjectId == projectId &&
                group.ObjectTypeId == objectTypeId &&
                group.Name == normalizedGroupName);

        if (group is not null)
        {
            if (!string.IsNullOrWhiteSpace(iconKey))
            {
                group.IconKey = TrimToNull(iconKey);
                await dbContext.SaveChangesAsync();
            }

            return group;
        }

        var sortOrder = await dbContext.AttributeGroups
            .Where(group => group.ProjectId == projectId && group.ObjectTypeId == objectTypeId)
            .CountAsync() * 10;

        group = new AttributeGroup
        {
            ProjectId = projectId,
            ObjectTypeId = objectTypeId,
            Name = normalizedGroupName,
            IconKey = TrimToNull(iconKey),
            SortOrder = sortOrder,
        };
        dbContext.AttributeGroups.Add(group);
        await dbContext.SaveChangesAsync();

        return group;
    }

    private static List<string> NormalizeOptions(IReadOnlyList<string>? options)
    {
        return (options ?? [])
            .Select(option => option.Trim())
            .Where(option => option.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static AttributeGroupDto ToDto(AttributeGroup group)
    {
        return new AttributeGroupDto(
            group.Id,
            group.ObjectType?.Key ?? "",
            group.Name,
            group.IconKey);
    }

    private static AttributeDefinitionDto ToDto(AttributeDefinition definition)
    {
        return new AttributeDefinitionDto(
            definition.Id,
            definition.ObjectType?.Key ?? "",
            definition.Name,
            definition.DataType,
            definition.AttributeGroup?.Name,
            definition.MinValue,
            definition.MaxValue,
            definition.Unit,
            definition.IconKey,
            string.IsNullOrWhiteSpace(definition.OptionsJson)
                ? []
                : JsonSerializer.Deserialize<IReadOnlyList<string>>(definition.OptionsJson) ?? []);
    }
}

