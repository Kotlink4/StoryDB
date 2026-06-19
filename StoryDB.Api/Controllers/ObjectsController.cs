using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Objects;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/objects")]
public class ObjectsController(IObjectService objectService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoryObjectDto>>> GetObjects(
        int projectId,
        [FromQuery] string? typeKey)
    {
        return Ok(await objectService.GetObjectsAsync(projectId, typeKey));
    }

    [HttpGet("summaries")]
    public async Task<ActionResult<IReadOnlyList<StoryObjectSummaryDto>>> GetObjectSummaries(
        int projectId,
        [FromQuery] string? typeKey)
    {
        return Ok(await objectService.GetObjectSummariesAsync(projectId, typeKey));
    }

    [HttpGet("{objectId:int}")]
    public async Task<ActionResult<StoryObjectDto>> GetObject(int projectId, int objectId)
    {
        var result = await objectService.GetObjectAsync(projectId, objectId);
        return ToActionResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<StoryObjectDto>> CreateObject(int projectId, CreateStoryObjectRequest request)
    {
        var result = await objectService.CreateObjectAsync(projectId, request);
        return result.Status switch
        {
            ObjectServiceStatus.Success => CreatedAtAction(
                nameof(GetObject),
                new { projectId, objectId = result.Value!.Id },
                result.Value),
            ObjectServiceStatus.NotFound => NotFound(),
            ObjectServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("{objectId:int}")]
    public async Task<ActionResult<StoryObjectDto>> UpdateObject(
        int projectId,
        int objectId,
        UpdateStoryObjectRequest request)
    {
        var result = await objectService.UpdateObjectAsync(projectId, objectId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{objectId:int}")]
    public async Task<IActionResult> DeleteObject(int projectId, int objectId)
    {
        var result = await objectService.DeleteObjectAsync(projectId, objectId);
        return ToNoContentResult(result);
    }

    [HttpGet("{objectId:int}/gallery")]
    public async Task<ActionResult<IReadOnlyList<ObjectGalleryImageDto>>> GetGalleryImages(
        int projectId,
        int objectId)
    {
        var result = await objectService.GetGalleryImagesAsync(projectId, objectId);
        return ToActionResult(result);
    }

    [HttpPost("{objectId:int}/gallery")]
    public async Task<ActionResult<StoryObjectDto>> AddGalleryImage(
        int projectId,
        int objectId,
        ObjectGalleryImageRequest request)
    {
        var result = await objectService.AddGalleryImageAsync(projectId, objectId, request);
        return ToActionResult(result);
    }

    [HttpPut("{objectId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<StoryObjectDto>> UpdateGalleryImage(
        int projectId,
        int objectId,
        int imageId,
        ObjectGalleryImageRequest request)
    {
        var result = await objectService.UpdateGalleryImageAsync(projectId, objectId, imageId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{objectId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<StoryObjectDto>> DeleteGalleryImage(
        int projectId,
        int objectId,
        int imageId)
    {
        var result = await objectService.DeleteGalleryImageAsync(projectId, objectId, imageId);
        return ToActionResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(ObjectServiceResult<TValue> result)
    {
        return result.Status switch
        {
            ObjectServiceStatus.Success => Ok(result.Value),
            ObjectServiceStatus.NotFound => NotFound(),
            ObjectServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(ObjectServiceResult result)
    {
        return result.Status switch
        {
            ObjectServiceStatus.Success => NoContent(),
            ObjectServiceStatus.NotFound => NotFound(),
            ObjectServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}


