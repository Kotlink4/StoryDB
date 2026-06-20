using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

public partial class CatalogsController
{
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
}
