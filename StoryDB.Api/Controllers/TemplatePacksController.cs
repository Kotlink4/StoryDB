using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.TemplatePacks;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Services.TemplatePacks;

namespace StoryDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/template-packs")]
public class TemplatePacksController(
    ITemplatePackService templatePackService,
    IProjectAccessService projectAccessService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TemplatePackListItemDto>>> GetTemplatePacks(
        [FromQuery] string scope = "mine",
        CancellationToken cancellationToken = default)
    {
        var packs = await templatePackService.GetTemplatePacksAsync(scope, cancellationToken);
        return Ok(packs);
    }

    [HttpPost("from-project")]
    public async Task<ActionResult<TemplatePackListItemDto>> CreateFromProject(
        CreateTemplatePackFromProjectRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Name.Trim().Length == 0)
        {
            return BadRequest("Название набора обязательно.");
        }

        var pack = await templatePackService.CreateFromProjectAsync(request, cancellationToken);
        if (pack is null)
        {
            return NotFound();
        }

        return CreatedAtAction(nameof(GetTemplatePacks), new { id = pack.Id }, ToDto(pack));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TemplatePackListItemDto>> UpdateTemplatePack(
        int id,
        UpdateTemplatePackRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Name.Trim().Length == 0)
        {
            return BadRequest("Название набора обязательно.");
        }

        var pack = await templatePackService.UpdateAsync(id, request, cancellationToken);
        return pack is null ? NotFound() : Ok(ToDto(pack));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTemplatePack(int id, CancellationToken cancellationToken)
    {
        var wasDeleted = await templatePackService.DeleteAsync(id, cancellationToken);
        return wasDeleted ? NoContent() : NotFound();
    }

    [HttpPut("{id:int}/favorite")]
    public async Task<ActionResult<TemplatePackListItemDto>> SetFavorite(
        int id,
        SetTemplatePackFavoriteRequest request,
        CancellationToken cancellationToken)
    {
        var pack = await templatePackService.SetFavoriteAsync(id, request.IsFavorite, cancellationToken);
        return pack is null ? NotFound() : Ok(ToDto(pack));
    }

    [HttpPost("/api/projects/{projectId:int}/template-packs/{id:int}/apply")]
    public async Task<IActionResult> ApplyTemplatePack(
        int projectId,
        int id,
        CancellationToken cancellationToken)
    {
        if (!await projectAccessService.HasProjectWriteAccessAsync(projectId, cancellationToken))
        {
            return NotFound();
        }

        var wasApplied = await templatePackService.ApplyTemplatePackAsync(projectId, id, cancellationToken);
        return wasApplied ? NoContent() : NotFound();
    }

    [HttpPost("/api/projects/{projectId:int}/template-packs/apply")]
    public async Task<IActionResult> ApplyTemplatePacks(
        int projectId,
        ApplyTemplatePackRequest request,
        CancellationToken cancellationToken)
    {
        if (!await projectAccessService.HasProjectWriteAccessAsync(projectId, cancellationToken))
        {
            return NotFound();
        }

        await templatePackService.ApplyTemplatePacksAsync(projectId, request.TemplatePackIds, cancellationToken);
        return NoContent();
    }

    private TemplatePackListItemDto ToDto(ProjectTemplatePack pack)
    {
        return new TemplatePackListItemDto(
            pack.Id,
            pack.Name,
            pack.Description,
            pack.IsPublic,
            pack.Favorites.Any(favorite => favorite.UserId == projectAccessService.CurrentUserId),
            pack.OwnerUserId,
            pack.OwnerUser?.DisplayName ?? "Автор",
            pack.SourceProjectId,
            pack.SourceProject?.Name,
            pack.UpdatedAt,
            new TemplatePackSummaryDto(pack.AttributeCount, pack.CatalogCount, pack.StructureCount));
    }
}
