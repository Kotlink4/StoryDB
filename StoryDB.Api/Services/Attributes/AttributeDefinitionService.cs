using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Attributes;

public sealed class AttributeDefinitionService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IAttributeDefinitionService
{
    private static readonly TimeSpan AttributeDefinitionsCacheDuration = TimeSpan.FromSeconds(20);

    private static readonly HashSet<string> SupportedDataTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "number",
        "select",
    };

    public async Task<AttributeDefinitionServiceResult<IReadOnlyList<AttributeGroupDto>>> GetGroupsAsync(
        int projectId,
        string typeKey)
    {
        var objectType = await GetObjectType(projectId, typeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<IReadOnlyList<AttributeGroupDto>>.NotFound();
        }

        var groups = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.AttributeGroups(projectId, typeKey),
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = AttributeDefinitionsCacheDuration;

                return await dbContext.AttributeGroups
                    .AsNoTracking()
                    .Include(group => group.ObjectType)
                    .Where(group => group.ProjectId == projectId && group.ObjectTypeId == objectType.Id)
                    .OrderBy(group => group.SortOrder)
                    .ThenBy(group => group.Name)
                    .Select(group => ToDto(group))
                    .ToListAsync();
            });

        return AttributeDefinitionServiceResult<IReadOnlyList<AttributeGroupDto>>.Success(groups);
    }

    public async Task<AttributeDefinitionServiceResult<AttributeGroupDto>> CreateGroupAsync(
        int projectId,
        AttributeGroupRequest request)
    {
        var validationError = RequestValidators.ValidateAttributeGroup(
            request.TypeKey,
            request.Name,
            request.IconKey);
        if (validationError is not null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.Invalid(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.NotFound();
        }

        var group = await GetOrCreateGroup(projectId, objectType.Id, request.Name, request.IconKey);
        if (group is null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.Invalid("Attribute group name is required.");
        }

        group.ObjectType = objectType;
        InvalidateAttributeCaches(projectId, request.TypeKey);
        return AttributeDefinitionServiceResult<AttributeGroupDto>.Success(ToDto(group));
    }

    public async Task<AttributeDefinitionServiceResult<AttributeGroupDto>> UpdateGroupAsync(
        int projectId,
        int groupId,
        AttributeGroupRequest request)
    {
        var validationError = RequestValidators.ValidateAttributeGroup(
            request.TypeKey,
            request.Name,
            request.IconKey);
        if (validationError is not null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.Invalid(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.NotFound();
        }

        var group = await dbContext.AttributeGroups
            .Include(currentGroup => currentGroup.ObjectType)
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.ProjectId == projectId &&
                currentGroup.ObjectTypeId == objectType.Id &&
                currentGroup.Id == groupId);

        if (group is null)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.NotFound();
        }

        var hasDuplicateGroupName = await dbContext.AttributeGroups.AnyAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.ObjectTypeId == objectType.Id &&
            currentGroup.Id != groupId &&
            currentGroup.Name == request.Name.Trim());
        if (hasDuplicateGroupName)
        {
            return AttributeDefinitionServiceResult<AttributeGroupDto>.Invalid("Attribute group with this name already exists.");
        }

        group.Name = request.Name.Trim();
        group.IconKey = TrimToNull(request.IconKey);
        await dbContext.SaveChangesAsync();
        InvalidateAttributeCaches(projectId, request.TypeKey);

        group.ObjectType = objectType;
        return AttributeDefinitionServiceResult<AttributeGroupDto>.Success(ToDto(group));
    }

    public async Task<AttributeDefinitionServiceResult> DeleteGroupAsync(int projectId, int groupId)
    {
        var group = await dbContext.AttributeGroups
            .FirstOrDefaultAsync(group =>
                group.ProjectId == projectId &&
                group.Id == groupId);

        if (group is null)
        {
            return AttributeDefinitionServiceResult.NotFound();
        }

        var definitionIds = await dbContext.AttributeDefinitions
            .Where(definition =>
                definition.ProjectId == projectId &&
                definition.AttributeGroupId == groupId)
            .Select(definition => definition.Id)
            .ToListAsync();
        var objectAttributes = dbContext.ObjectAttributes
            .Where(attribute => definitionIds.Contains(attribute.AttributeDefinitionId));
        var definitions = dbContext.AttributeDefinitions
            .Where(definition => definitionIds.Contains(definition.Id));

        dbContext.ObjectAttributes.RemoveRange(objectAttributes);
        dbContext.AttributeDefinitions.RemoveRange(definitions);
        dbContext.AttributeGroups.Remove(group);
        await dbContext.SaveChangesAsync();
        InvalidateAllAttributeCaches(projectId);

        return AttributeDefinitionServiceResult.Success();
    }

    public async Task<AttributeDefinitionServiceResult<IReadOnlyList<AttributeDefinitionDto>>> GetDefinitionsAsync(
        int projectId,
        string typeKey)
    {
        var objectType = await GetObjectType(projectId, typeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<IReadOnlyList<AttributeDefinitionDto>>.NotFound();
        }

        var definitions = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.AttributeDefinitions(projectId, typeKey),
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = AttributeDefinitionsCacheDuration;

                return await dbContext.AttributeDefinitions
                    .AsNoTracking()
                    .Include(definition => definition.ObjectType)
                    .Include(definition => definition.AttributeGroup)
                    .Where(definition =>
                        definition.ProjectId == projectId &&
                        definition.ObjectTypeId == objectType.Id)
                    .OrderBy(definition => definition.AttributeGroup == null ? "" : definition.AttributeGroup.Name)
                    .ThenBy(definition => definition.SortOrder)
                    .ThenBy(definition => definition.Name)
                    .Select(definition => ToDto(definition))
                    .ToListAsync();
            });

        return AttributeDefinitionServiceResult<IReadOnlyList<AttributeDefinitionDto>>.Success(definitions);
    }

    public async Task<AttributeDefinitionServiceResult<AttributeDefinitionDto>> CreateDefinitionAsync(
        int projectId,
        AttributeDefinitionRequest request)
    {
        var validationError = RequestValidators.ValidateAttributeDefinition(
            request.TypeKey,
            request.Name,
            request.DataType,
            request.MinValue,
            request.MaxValue,
            request.Unit,
            request.IconKey,
            request.Options,
            SupportedDataTypes);
        if (validationError is not null)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Invalid(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.NotFound();
        }

        var hasDuplicateName = await dbContext.AttributeDefinitions.AnyAsync(definition =>
            definition.ProjectId == projectId &&
            definition.ObjectTypeId == objectType.Id &&
            definition.Name == request.Name.Trim());
        if (hasDuplicateName)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Invalid("Attribute with this name already exists.");
        }

        var group = await GetOrCreateGroup(projectId, objectType.Id, request.GroupName);
        var sortOrder = await dbContext.AttributeDefinitions
            .Where(definition =>
                definition.ProjectId == projectId &&
                definition.ObjectTypeId == objectType.Id)
            .CountAsync() * 10;

        var definition = new AttributeDefinition
        {
            ProjectId = projectId,
            ObjectTypeId = objectType.Id,
            AttributeGroupId = group?.Id,
            Name = request.Name.Trim(),
            DataType = request.DataType.Trim().ToLowerInvariant(),
            MinValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? request.MinValue
                : null,
            MaxValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? request.MaxValue
                : null,
            Unit = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? TrimToNull(request.Unit)
                : null,
            OptionsJson = request.DataType.Equals("select", StringComparison.OrdinalIgnoreCase)
                ? JsonSerializer.Serialize(NormalizeOptions(request.Options))
                : null,
            IconKey = TrimToNull(request.IconKey),
            SortOrder = sortOrder,
        };

        dbContext.AttributeDefinitions.Add(definition);
        await dbContext.SaveChangesAsync();
        InvalidateAttributeCaches(projectId, request.TypeKey);

        definition.AttributeGroup = group;
        definition.ObjectType = objectType;
        return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Success(ToDto(definition));
    }

    public async Task<AttributeDefinitionServiceResult<AttributeDefinitionDto>> UpdateDefinitionAsync(
        int projectId,
        int definitionId,
        AttributeDefinitionRequest request)
    {
        var validationError = RequestValidators.ValidateAttributeDefinition(
            request.TypeKey,
            request.Name,
            request.DataType,
            request.MinValue,
            request.MaxValue,
            request.Unit,
            request.IconKey,
            request.Options,
            SupportedDataTypes);
        if (validationError is not null)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Invalid(validationError);
        }

        var definition = await dbContext.AttributeDefinitions
            .Include(currentDefinition => currentDefinition.ObjectType)
            .Include(currentDefinition => currentDefinition.AttributeGroup)
            .FirstOrDefaultAsync(currentDefinition =>
                currentDefinition.ProjectId == projectId &&
                currentDefinition.Id == definitionId);

        if (definition is null)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.NotFound();
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.NotFound();
        }

        var hasDuplicateName = await dbContext.AttributeDefinitions.AnyAsync(currentDefinition =>
            currentDefinition.ProjectId == projectId &&
            currentDefinition.ObjectTypeId == objectType.Id &&
            currentDefinition.Id != definitionId &&
            currentDefinition.Name == request.Name.Trim());
        if (hasDuplicateName)
        {
            return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Invalid("Attribute with this name already exists.");
        }

        var group = await GetOrCreateGroup(projectId, objectType.Id, request.GroupName);
        definition.ObjectTypeId = objectType.Id;
        definition.ObjectType = objectType;
        definition.AttributeGroupId = group?.Id;
        definition.AttributeGroup = group;
        definition.Name = request.Name.Trim();
        definition.DataType = request.DataType.Trim().ToLowerInvariant();
        definition.MinValue = definition.DataType == "number" ? request.MinValue : null;
        definition.MaxValue = definition.DataType == "number" ? request.MaxValue : null;
        definition.Unit = definition.DataType == "number" ? TrimToNull(request.Unit) : null;
        definition.OptionsJson = definition.DataType == "select"
            ? JsonSerializer.Serialize(NormalizeOptions(request.Options))
            : null;
        definition.IconKey = TrimToNull(request.IconKey);

        await dbContext.SaveChangesAsync();
        InvalidateAllAttributeCaches(projectId);
        return AttributeDefinitionServiceResult<AttributeDefinitionDto>.Success(ToDto(definition));
    }

    public async Task<AttributeDefinitionServiceResult> DeleteDefinitionAsync(int projectId, int definitionId)
    {
        var definition = await dbContext.AttributeDefinitions
            .FirstOrDefaultAsync(definition =>
                definition.ProjectId == projectId &&
                definition.Id == definitionId);

        if (definition is null)
        {
            return AttributeDefinitionServiceResult.NotFound();
        }

        var objectAttributes = dbContext.ObjectAttributes
            .Where(attribute => attribute.AttributeDefinitionId == definitionId);
        dbContext.ObjectAttributes.RemoveRange(objectAttributes);
        dbContext.AttributeDefinitions.Remove(definition);
        await dbContext.SaveChangesAsync();
        InvalidateAllAttributeCaches(projectId);

        return AttributeDefinitionServiceResult.Success();
    }

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
