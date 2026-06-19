using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Attributes;

public sealed partial class AttributeDefinitionService(
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
}
