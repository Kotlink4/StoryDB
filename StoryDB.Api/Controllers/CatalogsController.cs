using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Catalogs;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/catalogs")]
public class CatalogsController(ICatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CatalogDto>>> GetCatalogs(
        int projectId,
        CancellationToken cancellationToken)
    {
        var catalogs = await catalogService.GetCatalogsAsync(projectId, cancellationToken);

        return Ok(catalogs.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CatalogDto>> CreateCatalog(
        int projectId,
        CatalogRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalog(
            request.Name,
            request.Description,
            request.HierarchyMode,
            catalogService.SupportedHierarchyModes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.CreateCatalogAsync(projectId, ToDraft(request), cancellationToken);
        return ToCreatedResult(result, nameof(GetCatalogs), new { projectId }, ToDto);
    }

    [HttpPut("{catalogId:int}")]
    public async Task<ActionResult<CatalogDto>> UpdateCatalog(
        int projectId,
        int catalogId,
        CatalogRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalog(
            request.Name,
            request.Description,
            request.HierarchyMode,
            catalogService.SupportedHierarchyModes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.UpdateCatalogAsync(projectId, catalogId, ToDraft(request), cancellationToken);
        return ToActionResult(result, ToDto);
    }

    [HttpDelete("{catalogId:int}")]
    public async Task<IActionResult> DeleteCatalog(int projectId, int catalogId, CancellationToken cancellationToken)
    {
        var result = await catalogService.DeleteCatalogAsync(projectId, catalogId, cancellationToken);
        return ToNoContentResult(result);
    }

    [HttpGet("{catalogId:int}/entries")]
    public async Task<ActionResult<IReadOnlyList<CatalogEntryDto>>> GetEntries(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.GetEntriesAsync(projectId, catalogId, cancellationToken);
        return ToListActionResult(result, ToDto);
    }

    [HttpPost("{catalogId:int}/entries")]
    public async Task<ActionResult<CatalogEntryDto>> CreateEntry(
        int projectId,
        int catalogId,
        CatalogEntryRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalogEntry(
            request.Name,
            request.Description,
            request.ImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.CreateEntryAsync(projectId, catalogId, ToDraft(request), cancellationToken);
        return ToCreatedResult(result, nameof(GetEntries), new { projectId, catalogId }, ToDto);
    }

    [HttpPut("{catalogId:int}/entries/{entryId:int}")]
    public async Task<ActionResult<CatalogEntryDto>> UpdateEntry(
        int projectId,
        int catalogId,
        int entryId,
        CatalogEntryRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalogEntry(
            request.Name,
            request.Description,
            request.ImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.UpdateEntryAsync(projectId, catalogId, entryId, ToDraft(request), cancellationToken);
        return ToActionResult(result, ToDto);
    }

    [HttpDelete("{catalogId:int}/entries/{entryId:int}")]
    public async Task<IActionResult> DeleteEntry(
        int projectId,
        int catalogId,
        int entryId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.DeleteEntryAsync(projectId, catalogId, entryId, cancellationToken);
        return ToNoContentResult(result);
    }

    [HttpGet("{catalogId:int}/entry-groups")]
    public async Task<ActionResult<IReadOnlyList<CatalogEntryGroupDto>>> GetEntryGroups(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.GetEntryGroupsAsync(projectId, catalogId, cancellationToken);
        return ToListActionResult(result, ToDto);
    }

    [HttpPost("{catalogId:int}/entry-groups")]
    public async Task<ActionResult<CatalogEntryGroupDto>> CreateEntryGroup(
        int projectId,
        int catalogId,
        CatalogEntryGroupRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateName(request.Name, "Catalog entry group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.CreateEntryGroupAsync(projectId, catalogId, ToDraft(request), cancellationToken);
        return ToCreatedResult(result, nameof(GetEntryGroups), new { projectId, catalogId }, ToDto);
    }

    [HttpPut("{catalogId:int}/entry-groups/{groupId:int}")]
    public async Task<ActionResult<CatalogEntryGroupDto>> UpdateEntryGroup(
        int projectId,
        int catalogId,
        int groupId,
        CatalogEntryGroupRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateName(request.Name, "Catalog entry group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.UpdateEntryGroupAsync(
            projectId,
            catalogId,
            groupId,
            ToDraft(request),
            cancellationToken);
        return ToActionResult(result, ToDto);
    }

    [HttpDelete("{catalogId:int}/entry-groups/{groupId:int}")]
    public async Task<IActionResult> DeleteEntryGroup(
        int projectId,
        int catalogId,
        int groupId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.DeleteEntryGroupAsync(projectId, catalogId, groupId, cancellationToken);
        return ToNoContentResult(result);
    }

    [HttpGet("{catalogId:int}/field-groups")]
    public async Task<ActionResult<IReadOnlyList<CatalogFieldGroupDto>>> GetFieldGroups(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.GetFieldGroupsAsync(projectId, catalogId, cancellationToken);
        return ToListActionResult(result, group => new CatalogFieldGroupDto(group.Id, group.Name));
    }

    [HttpPost("{catalogId:int}/field-groups")]
    public async Task<ActionResult<CatalogFieldGroupDto>> CreateFieldGroup(
        int projectId,
        int catalogId,
        CatalogFieldGroupRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateName(request.Name, "Field group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.CreateFieldGroupAsync(projectId, catalogId, ToDraft(request), cancellationToken);
        return ToCreatedResult(result, nameof(GetFieldGroups), new { projectId, catalogId }, group => new CatalogFieldGroupDto(group.Id, group.Name));
    }

    [HttpGet("{catalogId:int}/fields")]
    public async Task<ActionResult<IReadOnlyList<CatalogFieldDefinitionDto>>> GetFieldDefinitions(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.GetFieldDefinitionsAsync(projectId, catalogId, cancellationToken);
        return ToListActionResult(result, ToDto);
    }

    [HttpPost("{catalogId:int}/fields")]
    public async Task<ActionResult<CatalogFieldDefinitionDto>> CreateFieldDefinition(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalogFieldDefinition(
            request.Name,
            request.DataType,
            request.MinValue,
            request.MaxValue,
            request.Options,
            request.ReferenceCatalogId,
            catalogService.SupportedFieldTypes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.CreateFieldDefinitionAsync(projectId, catalogId, ToDraft(request), cancellationToken);
        return ToCreatedResult(result, nameof(GetFieldDefinitions), new { projectId, catalogId }, ToDto);
    }

    [HttpPut("{catalogId:int}/fields/{fieldId:int}")]
    public async Task<ActionResult<CatalogFieldDefinitionDto>> UpdateFieldDefinition(
        int projectId,
        int catalogId,
        int fieldId,
        CatalogFieldDefinitionRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateCatalogFieldDefinition(
            request.Name,
            request.DataType,
            request.MinValue,
            request.MaxValue,
            request.Options,
            request.ReferenceCatalogId,
            catalogService.SupportedFieldTypes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await catalogService.UpdateFieldDefinitionAsync(
            projectId,
            catalogId,
            fieldId,
            ToDraft(request),
            cancellationToken);
        return ToActionResult(result, ToDto);
    }

    [HttpDelete("{catalogId:int}/fields/{fieldId:int}")]
    public async Task<IActionResult> DeleteFieldDefinition(
        int projectId,
        int catalogId,
        int fieldId,
        CancellationToken cancellationToken)
    {
        var result = await catalogService.DeleteFieldDefinitionAsync(projectId, catalogId, fieldId, cancellationToken);
        return ToNoContentResult(result);
    }

    private ActionResult<TDto> ToActionResult<TEntity, TDto>(
        CatalogServiceResult<TEntity> result,
        Func<TEntity, TDto> map)
    {
        return result.Status switch
        {
            CatalogServiceStatus.Success => Ok(map(result.Value!)),
            CatalogServiceStatus.NotFound => NotFound(),
            CatalogServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private ActionResult<IReadOnlyList<TDto>> ToListActionResult<TEntity, TDto>(
        CatalogServiceResult<IReadOnlyList<TEntity>> result,
        Func<TEntity, TDto> map)
    {
        return result.Status switch
        {
            CatalogServiceStatus.Success => Ok(result.Value!.Select(map).ToList()),
            CatalogServiceStatus.NotFound => NotFound(),
            CatalogServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private ActionResult<TDto> ToCreatedResult<TEntity, TDto>(
        CatalogServiceResult<TEntity> result,
        string actionName,
        object routeValues,
        Func<TEntity, TDto> map)
    {
        return result.Status switch
        {
            CatalogServiceStatus.Success => CreatedAtAction(actionName, routeValues, map(result.Value!)),
            CatalogServiceStatus.NotFound => NotFound(),
            CatalogServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(CatalogServiceResult result)
    {
        return result.Status switch
        {
            CatalogServiceStatus.Success => NoContent(),
            CatalogServiceStatus.NotFound => NotFound(),
            CatalogServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private static CatalogDraft ToDraft(CatalogRequest request) =>
        new(request.Name, request.Description, request.SupportsHierarchy, request.HierarchyMode);

    private static CatalogEntryDraft ToDraft(CatalogEntryRequest request) =>
        new(
            request.Name,
            request.Description,
            request.ImagePath,
            request.EntryGroupId,
            request.ParentEntryIds,
            request.FieldValues?.Select(ToDraft).ToList());

    private static CatalogEntryFieldValueDraft ToDraft(CatalogEntryFieldValueRequest request) =>
        new(request.FieldDefinitionId, request.Value, request.ReferencedEntryIds);

    private static CatalogEntryGroupDraft ToDraft(CatalogEntryGroupRequest request) =>
        new(request.Name, request.ParentGroupIds);

    private static CatalogFieldGroupDraft ToDraft(CatalogFieldGroupRequest request) =>
        new(request.Name);

    private static CatalogFieldDefinitionDraft ToDraft(CatalogFieldDefinitionRequest request) =>
        new(
            request.Name,
            request.DataType,
            request.IsRequired,
            request.FieldGroupId,
            request.MinValue,
            request.MaxValue,
            request.Options,
            request.ReferenceCatalogId);

    private static CatalogDto ToDto(Catalog catalog)
    {
        return new CatalogDto(
            catalog.Id,
            catalog.Key,
            catalog.Name,
            catalog.Description,
            catalog.IsSystem,
            catalog.SupportsHierarchy,
            catalog.HierarchyMode);
    }

    private static CatalogEntryDto ToDto(CatalogEntry entry)
    {
        var values = entry.FieldValues
            .GroupBy(value => value.FieldDefinitionId)
            .Select(group => new CatalogEntryFieldValueDto(
                group.Key,
                group.FirstOrDefault(value => value.Value != null)?.Value,
                group
                    .Where(value => value.ReferencedEntryId != null)
                    .Select(value => value.ReferencedEntryId!.Value)
                    .OrderBy(id => id)
                    .ToList()))
            .ToList();

        return new CatalogEntryDto(
            entry.Id,
            entry.Name,
            entry.Description,
            entry.ImagePath,
            entry.EntryGroupId,
            entry.EntryGroup?.Name,
            entry.ParentLinks
                .Select(link => link.ParentEntryId)
                .OrderBy(id => id)
                .ToList(),
            values);
    }

    private static CatalogEntryGroupDto ToDto(CatalogEntryGroup group)
    {
        return new CatalogEntryGroupDto(
            group.Id,
            group.Name,
            group.ParentLinks
                .Select(link => link.ParentGroupId)
                .OrderBy(id => id)
                .ToList());
    }

    private static CatalogFieldDefinitionDto ToDto(CatalogFieldDefinition field)
    {
        return new CatalogFieldDefinitionDto(
            field.Id,
            field.Name,
            field.DataType,
            field.IsRequired,
            field.FieldGroupId,
            field.FieldGroup?.Name,
            field.MinValue,
            field.MaxValue,
            string.IsNullOrWhiteSpace(field.OptionsJson)
                ? []
                : JsonSerializer.Deserialize<IReadOnlyList<string>>(field.OptionsJson) ?? [],
            field.ReferenceCatalogId);
    }
}

public record CatalogRequest(
    string Name,
    string? Description,
    bool SupportsHierarchy,
    string? HierarchyMode);

public record CatalogEntryRequest(
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    IReadOnlyList<int>? ParentEntryIds,
    IReadOnlyList<CatalogEntryFieldValueRequest>? FieldValues);

public record CatalogEntryFieldValueRequest(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int>? ReferencedEntryIds);

public record CatalogEntryGroupRequest(string Name, IReadOnlyList<int>? ParentGroupIds);

public record CatalogFieldGroupRequest(string Name);

public record CatalogFieldDefinitionRequest(
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string>? Options,
    int? ReferenceCatalogId);

public record CatalogDto(
    int Id,
    string Key,
    string Name,
    string? Description,
    bool IsSystem,
    bool SupportsHierarchy,
    string HierarchyMode);

public record CatalogEntryDto(
    int Id,
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    string? EntryGroupName,
    IReadOnlyList<int> ParentEntryIds,
    IReadOnlyList<CatalogEntryFieldValueDto> FieldValues);

public record CatalogEntryFieldValueDto(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int> ReferencedEntryIds);

public record CatalogEntryGroupDto(int Id, string Name, IReadOnlyList<int> ParentGroupIds);

public record CatalogFieldGroupDto(int Id, string Name);

public record CatalogFieldDefinitionDto(
    int Id,
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    string? FieldGroupName,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string> Options,
    int? ReferenceCatalogId);
