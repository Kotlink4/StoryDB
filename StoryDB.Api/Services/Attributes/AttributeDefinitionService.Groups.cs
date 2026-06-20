using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Services;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Attributes;

public sealed partial class AttributeDefinitionService
{
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
}

