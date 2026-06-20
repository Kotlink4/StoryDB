using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

public partial class CatalogsController
{
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
}
