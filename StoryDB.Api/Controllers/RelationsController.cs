using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Services.Relations;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/relations")]
public class RelationsController(IRelationService relationService) : ControllerBase
{
    [HttpGet("graph")]
    public async Task<ActionResult<RelationGraphDto>> GetRelationGraph(int projectId)
    {
        var result = await relationService.GetRelationGraphAsync(projectId);
        return ToActionResult(result);
    }

    [HttpGet("layout")]
    public async Task<ActionResult<RelationGraphLayoutDto?>> GetDefaultLayout(
        int projectId,
        [FromQuery] string? graphKey)
    {
        var result = await relationService.GetDefaultLayoutAsync(projectId, graphKey);
        return ToActionResult(result);
    }

    [HttpPut("layout")]
    public async Task<ActionResult<RelationGraphLayoutDto>> SaveDefaultLayout(
        int projectId,
        RelationGraphLayoutRequest request)
    {
        var result = await relationService.SaveDefaultLayoutAsync(projectId, request);
        return ToActionResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(RelationServiceResult<TValue> result)
    {
        return result.Status switch
        {
            RelationServiceStatus.Success => Ok(result.Value),
            RelationServiceStatus.NotFound => NotFound(),
            RelationServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
