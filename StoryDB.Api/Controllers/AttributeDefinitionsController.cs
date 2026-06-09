using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/attribute-definitions")]
public class AttributeDefinitionsController(StoryDbContext dbContext) : ControllerBase
{
    private static readonly HashSet<string> SupportedDataTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "number",
        "select",
    };

    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<AttributeGroupDto>>> GetGroups(
        int projectId,
        [FromQuery] string typeKey)
    {
        var objectType = await GetObjectType(projectId, typeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var groups = await dbContext.AttributeGroups
            .AsNoTracking()
            .Include(group => group.ObjectType)
            .Where(group => group.ProjectId == projectId && group.ObjectTypeId == objectType.Id)
            .OrderBy(group => group.SortOrder)
            .ThenBy(group => group.Name)
            .Select(group => ToDto(group))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost("groups")]
    public async Task<ActionResult<AttributeGroupDto>> CreateGroup(
        int projectId,
        AttributeGroupRequest request)
    {
        var validationError = ValidateGroupRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var group = await GetOrCreateGroup(projectId, objectType.Id, request.Name);
        if (group is null)
        {
            return BadRequest("Attribute group name is required.");
        }

        group.ObjectType = objectType;
        return CreatedAtAction(nameof(GetGroups), new { projectId, typeKey = request.TypeKey }, ToDto(group));
    }

    [HttpPut("groups/{groupId:int}")]
    public async Task<ActionResult<AttributeGroupDto>> UpdateGroup(
        int projectId,
        int groupId,
        AttributeGroupRequest request)
    {
        var validationError = ValidateGroupRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var group = await dbContext.AttributeGroups
            .Include(currentGroup => currentGroup.ObjectType)
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.ProjectId == projectId &&
                currentGroup.ObjectTypeId == objectType.Id &&
                currentGroup.Id == groupId);

        if (group is null)
        {
            return NotFound();
        }

        var hasDuplicateGroupName = await dbContext.AttributeGroups.AnyAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.ObjectTypeId == objectType.Id &&
            currentGroup.Id != groupId &&
            currentGroup.Name == request.Name.Trim());
        if (hasDuplicateGroupName)
        {
            return BadRequest("Attribute group with this name already exists.");
        }

        group.Name = request.Name.Trim();
        await dbContext.SaveChangesAsync();

        group.ObjectType = objectType;
        return Ok(ToDto(group));
    }

    [HttpDelete("groups/{groupId:int}")]
    public async Task<IActionResult> DeleteGroup(int projectId, int groupId)
    {
        var group = await dbContext.AttributeGroups
            .FirstOrDefaultAsync(group =>
                group.ProjectId == projectId &&
                group.Id == groupId);

        if (group is null)
        {
            return NotFound();
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

        return NoContent();
    }    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AttributeDefinitionDto>>> GetDefinitions(
        int projectId,
        [FromQuery] string typeKey)
    {
        var objectType = await GetObjectType(projectId, typeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var definitions = await dbContext.AttributeDefinitions
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

        return Ok(definitions);
    }

    [HttpPost]
    public async Task<ActionResult<AttributeDefinitionDto>> CreateDefinition(
        int projectId,
        AttributeDefinitionRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var hasDuplicateName = await dbContext.AttributeDefinitions.AnyAsync(definition =>
            definition.ProjectId == projectId &&
            definition.ObjectTypeId == objectType.Id &&
            definition.Name == request.Name.Trim());
        if (hasDuplicateName)
        {
            return BadRequest("Attribute with this name already exists.");
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
            SortOrder = sortOrder,
        };

        dbContext.AttributeDefinitions.Add(definition);
        await dbContext.SaveChangesAsync();

        definition.AttributeGroup = group;
        definition.ObjectType = objectType;
        return CreatedAtAction(nameof(GetDefinitions), new { projectId, typeKey = request.TypeKey }, ToDto(definition));
    }

    [HttpPut("{definitionId:int}")]
    public async Task<ActionResult<AttributeDefinitionDto>> UpdateDefinition(
        int projectId,
        int definitionId,
        AttributeDefinitionRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var definition = await dbContext.AttributeDefinitions
            .Include(currentDefinition => currentDefinition.ObjectType)
            .Include(currentDefinition => currentDefinition.AttributeGroup)
            .FirstOrDefaultAsync(currentDefinition =>
                currentDefinition.ProjectId == projectId &&
                currentDefinition.Id == definitionId);

        if (definition is null)
        {
            return NotFound();
        }

        var objectType = await GetObjectType(projectId, request.TypeKey);
        if (objectType is null)
        {
            return NotFound();
        }

        var hasDuplicateName = await dbContext.AttributeDefinitions.AnyAsync(currentDefinition =>
            currentDefinition.ProjectId == projectId &&
            currentDefinition.ObjectTypeId == objectType.Id &&
            currentDefinition.Id != definitionId &&
            currentDefinition.Name == request.Name.Trim());
        if (hasDuplicateName)
        {
            return BadRequest("Attribute with this name already exists.");
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

        await dbContext.SaveChangesAsync();
        return Ok(ToDto(definition));
    }

    [HttpDelete("{definitionId:int}")]
    public async Task<IActionResult> DeleteDefinition(int projectId, int definitionId)
    {
        var definition = await dbContext.AttributeDefinitions
            .FirstOrDefaultAsync(definition =>
                definition.ProjectId == projectId &&
                definition.Id == definitionId);

        if (definition is null)
        {
            return NotFound();
        }

        var objectAttributes = dbContext.ObjectAttributes
            .Where(attribute => attribute.AttributeDefinitionId == definitionId);
        dbContext.ObjectAttributes.RemoveRange(objectAttributes);
        dbContext.AttributeDefinitions.Remove(definition);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private async Task<ObjectType?> GetObjectType(int projectId, string typeKey)
    {
        return await dbContext.ObjectTypes
            .FirstOrDefaultAsync(type =>
                type.ProjectId == projectId &&
                type.Key == typeKey &&
                type.IsEnabled);
    }

    private async Task<AttributeGroup?> GetOrCreateGroup(
        int projectId,
        int objectTypeId,
        string? groupName)
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
            SortOrder = sortOrder,
        };
        dbContext.AttributeGroups.Add(group);
        await dbContext.SaveChangesAsync();

        return group;
    }

    private static string? ValidateGroupRequest(AttributeGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Attribute group name is required.";
        }

        if (request.Name.Trim().Length > 120)
        {
            return "Attribute group name must be 120 characters or shorter.";
        }

        if (string.IsNullOrWhiteSpace(request.TypeKey))
        {
            return "Object type key is required.";
        }

        return null;
    }
    private static string? ValidateRequest(AttributeDefinitionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Attribute name is required.";
        }

        if (request.Name.Trim().Length > 120)
        {
            return "Attribute name must be 120 characters or shorter.";
        }

        if (string.IsNullOrWhiteSpace(request.TypeKey))
        {
            return "Object type key is required.";
        }

        if (!SupportedDataTypes.Contains(request.DataType))
        {
            return "Unsupported attribute data type.";
        }

        if (
            request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
            request.MinValue is not null &&
            request.MaxValue is not null &&
            request.MinValue > request.MaxValue)
        {
            return "Minimum value cannot be greater than maximum value.";
        }

        if (
            request.DataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
            NormalizeOptions(request.Options).Count == 0)
        {
            return "Select attributes require at least one option.";
        }

        return null;
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
            group.Name);
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
            string.IsNullOrWhiteSpace(definition.OptionsJson)
                ? []
                : JsonSerializer.Deserialize<IReadOnlyList<string>>(definition.OptionsJson) ?? []);
    }
}

public record AttributeGroupRequest(string TypeKey, string Name);

public record AttributeGroupDto(int Id, string TypeKey, string Name);
public record AttributeDefinitionRequest(
    string TypeKey,
    string Name,
    string DataType,
    string? GroupName,
    double? MinValue,
    double? MaxValue,
    string? Unit,
    IReadOnlyList<string>? Options);

public record AttributeDefinitionDto(
    int Id,
    string TypeKey,
    string Name,
    string DataType,
    string? GroupName,
    double? MinValue,
    double? MaxValue,
    string? Unit,
    IReadOnlyList<string> Options);
