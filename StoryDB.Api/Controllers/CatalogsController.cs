using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Catalogs;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/catalogs")]
public partial class CatalogsController : ControllerBase
{
    private readonly ICatalogService catalogService;

    public CatalogsController(ICatalogService catalogService)
    {
        this.catalogService = catalogService;
    }

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


