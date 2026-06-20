using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

public partial class CatalogsController
{
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
        return ToCreatedResult(
            result,
            nameof(GetFieldGroups),
            new { projectId, catalogId },
            group => new CatalogFieldGroupDto(group.Id, group.Name));
    }
}
