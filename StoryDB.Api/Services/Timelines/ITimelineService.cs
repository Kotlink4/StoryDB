using StoryDB.Api.Contracts.Timelines;

namespace StoryDB.Api.Services.Timelines;

public interface ITimelineService
{
    Task<TimelineServiceResult<TimelineDto>> GetTimelineAsync(int projectId);

    Task<TimelineServiceResult<TimelineDto>> UpdateTimelineAsync(int projectId, TimelineSettingsRequest request);

    Task<TimelineServiceResult<TimelineLayoutDto?>> GetDefaultLayoutAsync(int projectId);

    Task<TimelineServiceResult<TimelineLayoutRulesConfig>> GetLayoutRulesAsync(int projectId);

    Task<TimelineServiceResult<TimelineLayoutDto>> GenerateDefaultLayoutAsync(int projectId);

    Task<TimelineServiceResult<IReadOnlyList<TimelineEventDto>>> GetEventsAsync(int projectId);

    Task<TimelineServiceResult<TimelineEventDto>> GetEventAsync(int projectId, int eventId);

    Task<TimelineServiceResult<TimelineEventDto>> CreateEventAsync(int projectId, TimelineEventRequest request);

    Task<TimelineServiceResult<TimelineEventDto>> UpdateEventAsync(int projectId, int eventId, TimelineEventRequest request);

    Task<TimelineServiceResult> DeleteEventAsync(int projectId, int eventId);

    Task<TimelineServiceResult<TimelineEventDto>> AddGalleryImageAsync(int projectId, int eventId, TimelineEventGalleryImageRequest request);

    Task<TimelineServiceResult<TimelineEventDto>> UpdateGalleryImageAsync(int projectId, int eventId, int imageId, TimelineEventGalleryImageRequest request);

    Task<TimelineServiceResult<TimelineEventDto>> DeleteGalleryImageAsync(int projectId, int eventId, int imageId);

    Task<TimelineServiceResult<IReadOnlyList<TimelineEventLinkDto>>> GetEventLinksAsync(int projectId);

    Task<TimelineServiceResult<TimelineEventLinkDto>> CreateEventLinkAsync(int projectId, TimelineEventLinkRequest request);

    Task<TimelineServiceResult<TimelineEventLinkDto>> UpdateEventLinkAsync(int projectId, int linkId, TimelineEventLinkRequest request);

    Task<TimelineServiceResult> DeleteEventLinkAsync(int projectId, int linkId);
}

