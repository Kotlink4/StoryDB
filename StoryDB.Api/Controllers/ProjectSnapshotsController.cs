using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Services.Projects;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/snapshot")]
public sealed class ProjectSnapshotsController(
    IProjectSnapshotService snapshotService,
    IProjectAccessService projectAccessService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ProjectSnapshotDto>> GetLatestSnapshot(
        int projectId,
        [FromQuery] string? scope,
        CancellationToken cancellationToken)
    {
        var normalizedScope = NormalizeScope(scope);
        if (normalizedScope == ProjectSnapshotScope.Current)
        {
            if (projectAccessService.CurrentUserId is null)
            {
                return Unauthorized();
            }

            var hasWriteAccess = await projectAccessService.HasProjectWriteAccessAsync(projectId, cancellationToken);
            if (!hasWriteAccess)
            {
                return NotFound();
            }
        }
        else
        {
            var hasPublicAccess = await projectAccessService.HasProjectPublicReadAccessAsync(projectId, cancellationToken);
            if (!hasPublicAccess)
            {
                return NotFound();
            }
        }

        var result = await snapshotService.GetLatestSnapshotAsync(projectId, normalizedScope, cancellationToken);
        return ToActionResult(result);
    }

    [HttpPost("publish")]
    public async Task<ActionResult<ProjectSnapshotDto>> PublishCurrentSnapshot(
        int projectId,
        CancellationToken cancellationToken)
    {
        var result = await snapshotService.PublishCurrentSnapshotAsync(projectId, cancellationToken);
        return ToActionResult(result);
    }

    [HttpPost("rebuild")]
    public async Task<ActionResult<ProjectSnapshotDto>> RebuildCurrentSnapshotSections(
        int projectId,
        ProjectSnapshotRebuildRequest request,
        CancellationToken cancellationToken)
    {
        var result = await snapshotService.RebuildCurrentSnapshotSectionsAsync(
            projectId,
            request.Sections,
            cancellationToken);
        return ToActionResult(result);
    }

    [HttpPost("publish-public")]
    public async Task<ActionResult<ProjectSnapshotDto>> PublishPublishedSnapshot(
        int projectId,
        CancellationToken cancellationToken)
    {
        var hasManageAccess = await projectAccessService.HasProjectManageAccessAsync(projectId, cancellationToken);
        if (!hasManageAccess)
        {
            return NotFound();
        }

        var result = await snapshotService.PublishPublishedSnapshotAsync(projectId, cancellationToken);
        return ToActionResult(result);
    }

    private static string NormalizeScope(string? scope) =>
        string.Equals(scope, ProjectSnapshotScope.Published, StringComparison.OrdinalIgnoreCase)
            ? ProjectSnapshotScope.Published
            : ProjectSnapshotScope.Current;

    private ActionResult<ProjectSnapshotDto> ToActionResult(ProjectSnapshotServiceResult<ProjectSnapshotDto> result) =>
        result.Status switch
        {
            ProjectSnapshotServiceStatus.Success => Ok(result.Value),
            ProjectSnapshotServiceStatus.NotFound => NotFound(),
            ProjectSnapshotServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
}
