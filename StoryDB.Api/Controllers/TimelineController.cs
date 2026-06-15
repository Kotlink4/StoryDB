using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Services.Timelines;
using System.Text.Json.Serialization;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/timeline/events")]
public class TimelineController(ITimelineService timelineService) : ControllerBase
{
    [HttpGet("~/api/projects/{projectId:int}/timeline")]
    public async Task<ActionResult<TimelineDto>> GetTimeline(int projectId)
    {
        var result = await timelineService.GetTimelineAsync(projectId);
        return ToActionResult(result);
    }

    [HttpPut("~/api/projects/{projectId:int}/timeline")]
    public async Task<ActionResult<TimelineDto>> UpdateTimeline(int projectId, TimelineSettingsRequest request)
    {
        var result = await timelineService.UpdateTimelineAsync(projectId, request);
        return ToActionResult(result);
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/layout")]
    public async Task<ActionResult<TimelineLayoutDto?>> GetDefaultLayout(int projectId)
    {
        var result = await timelineService.GetDefaultLayoutAsync(projectId);
        return ToActionResult(result);
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/layout/rules")]
    public async Task<ActionResult<TimelineLayoutRulesConfig>> GetLayoutRules(int projectId)
    {
        var result = await timelineService.GetLayoutRulesAsync(projectId);
        return ToActionResult(result);
    }

    [HttpPost("~/api/projects/{projectId:int}/timeline/layout/generate")]
    public async Task<ActionResult<TimelineLayoutDto>> GenerateDefaultLayout(int projectId)
    {
        var result = await timelineService.GenerateDefaultLayoutAsync(projectId);
        return ToActionResult(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TimelineEventDto>>> GetEvents(int projectId)
    {
        var result = await timelineService.GetEventsAsync(projectId);
        return ToActionResult(result);
    }

    [HttpGet("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> GetEvent(int projectId, int eventId)
    {
        var result = await timelineService.GetEventAsync(projectId, eventId);
        return ToActionResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<TimelineEventDto>> CreateEvent(int projectId, TimelineEventRequest request)
    {
        var result = await timelineService.CreateEventAsync(projectId, request);
        return result.Status switch
        {
            TimelineServiceStatus.Success => CreatedAtAction(
                nameof(GetEvent),
                new { projectId, eventId = result.Value!.Id },
                result.Value),
            TimelineServiceStatus.NotFound => NotFound(),
            TimelineServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> UpdateEvent(
        int projectId,
        int eventId,
        TimelineEventRequest request)
    {
        var result = await timelineService.UpdateEventAsync(projectId, eventId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int projectId, int eventId)
    {
        var result = await timelineService.DeleteEventAsync(projectId, eventId);
        return ToNoContentResult(result);
    }

    [HttpPost("{eventId:int}/gallery")]
    public async Task<ActionResult<TimelineEventDto>> AddGalleryImage(
        int projectId,
        int eventId,
        TimelineEventGalleryImageRequest request)
    {
        var result = await timelineService.AddGalleryImageAsync(projectId, eventId, request);
        return ToActionResult(result);
    }

    [HttpPut("{eventId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<TimelineEventDto>> UpdateGalleryImage(
        int projectId,
        int eventId,
        int imageId,
        TimelineEventGalleryImageRequest request)
    {
        var result = await timelineService.UpdateGalleryImageAsync(projectId, eventId, imageId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{eventId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<TimelineEventDto>> DeleteGalleryImage(
        int projectId,
        int eventId,
        int imageId)
    {
        var result = await timelineService.DeleteGalleryImageAsync(projectId, eventId, imageId);
        return ToActionResult(result);
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/links")]
    public async Task<ActionResult<IReadOnlyList<TimelineEventLinkDto>>> GetEventLinks(int projectId)
    {
        var result = await timelineService.GetEventLinksAsync(projectId);
        return ToActionResult(result);
    }

    [HttpPost("~/api/projects/{projectId:int}/timeline/links")]
    public async Task<ActionResult<TimelineEventLinkDto>> CreateEventLink(int projectId, TimelineEventLinkRequest request)
    {
        var result = await timelineService.CreateEventLinkAsync(projectId, request);
        return ToActionResult(result);
    }

    [HttpPut("~/api/projects/{projectId:int}/timeline/links/{linkId:int}")]
    public async Task<ActionResult<TimelineEventLinkDto>> UpdateEventLink(
        int projectId,
        int linkId,
        TimelineEventLinkRequest request)
    {
        var result = await timelineService.UpdateEventLinkAsync(projectId, linkId, request);
        return ToActionResult(result);
    }

    [HttpDelete("~/api/projects/{projectId:int}/timeline/links/{linkId:int}")]
    public async Task<IActionResult> DeleteEventLink(int projectId, int linkId)
    {
        var result = await timelineService.DeleteEventLinkAsync(projectId, linkId);
        return ToNoContentResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(TimelineServiceResult<TValue> result)
    {
        return result.Status switch
        {
            TimelineServiceStatus.Success => Ok(result.Value),
            TimelineServiceStatus.NotFound => NotFound(),
            TimelineServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(TimelineServiceResult result)
    {
        return result.Status switch
        {
            TimelineServiceStatus.Success => NoContent(),
            TimelineServiceStatus.NotFound => NotFound(),
            TimelineServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}


