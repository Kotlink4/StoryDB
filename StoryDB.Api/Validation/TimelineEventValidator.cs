using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data;

namespace StoryDB.Api.Validation;

public sealed partial class TimelineEventValidator(StoryDbContext dbContext)
{
    private static readonly HashSet<string> SupportedEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "point",
        "duration",
        "era",
        "chapter",
    };

    public async Task<ValidationResult> ValidateEventRequest(
        int projectId,
        int timelineId,
        TimelineEventRequest request,
        int? currentEventId = null)
    {
        var result = new ValidationResult();
        var eventType = NormalizeEventType(request.EventType);

        ValidationRules.Required(result, "title", request.Title, "Event title is required.");
        ValidationRules.MaxLength(result, "title", request.Title, 160, "Event title is too long.");

        if (!SupportedEventTypes.Contains(eventType))
        {
            result.Add("eventType", "Unsupported timeline event type.");
        }

        ValidateEventTime(result, eventType, request);

        ValidationRules.MaxLength(result, "description", request.Description, 4000, "Event description is too long.");
        ValidationRules.MaxLength(result, "startLabel", request.StartLabel, 120, "Timeline labels are too long.");
        ValidationRules.MaxLength(result, "endLabel", request.EndLabel, 120, "Timeline labels are too long.");
        ValidationRules.MaxLength(result, "category", request.Category, 80, "Event category is too long.");
        ValidationRules.MaxLength(result, "color", request.Color, 40, "Event color is too long.");
        ValidationRules.UploadedImagePath(result, "imagePath", request.ImagePath);

        await ValidateParent(projectId, timelineId, request, eventType, result, currentEventId);
        await ValidateTargets(projectId, request.Participants, result, "participants");
        await ValidateChanges(projectId, request.Changes, result);

        return result;
    }

    private static void ValidateEventTime(ValidationResult result, string eventType, TimelineEventRequest request)
    {
        if (eventType is "point")
        {
            ValidationRules.RequiredNumber(result, "startValue", request.StartValue, "Event time is required.");
            if (request.EndValue is not null)
            {
                result.Add("endValue", "Point events cannot have an end value.");
            }

            return;
        }

        if (eventType is "chapter")
        {
            ValidationRules.RequiredNumber(result, "startValue", request.StartValue, "Chapter position is required.");
            if (request.EndValue is not null)
            {
                result.Add("endValue", "Chapter events cannot have an end value.");
            }

            return;
        }

        if (eventType is "duration" or "era")
        {
            ValidationRules.RequiredNumber(result, "startValue", request.StartValue, "Event start value is required.");
            ValidationRules.RequiredNumber(result, "endValue", request.EndValue, "Event end value is required.");
            ValidationRules.OrderedRange(
                result,
                "startValue",
                "endValue",
                request.StartValue,
                request.EndValue,
                "Event end value cannot be earlier than start value.");
        }
    }

    private async Task ValidateParent(
        int projectId,
        int timelineId,
        TimelineEventRequest request,
        string eventType,
        ValidationResult result,
        int? currentEventId)
    {
        if (request.ParentEventId is null)
        {
            return;
        }

        if (eventType is not "point")
        {
            result.Add("parentEventId", "Only point events can be attached to a timeline band.");
            return;
        }

        if (request.ParentEventId == currentEventId)
        {
            result.Add("parentEventId", "Timeline event cannot be its own parent.");
            return;
        }

        var parentEvent = await dbContext.TimelineEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(timelineEvent =>
                timelineEvent.ProjectId == projectId &&
                timelineEvent.TimelineId == timelineId &&
                timelineEvent.Id == request.ParentEventId);
        if (parentEvent is null)
        {
            result.Add("parentEventId", "Parent timeline event was not found.");
            return;
        }

        if (!parentEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) &&
            !parentEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase))
        {
            result.Add("parentEventId", "Point events can only be attached to duration or era events.");
            return;
        }

        if (
            request.StartValue is not null &&
            parentEvent.StartValue is not null &&
            parentEvent.EndValue is not null &&
            (request.StartValue < parentEvent.StartValue || request.StartValue > parentEvent.EndValue))
        {
            result.Add("startValue", "Point event time must be inside the parent timeline band.");
        }
    }

    private static string NormalizeEventType(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "point" : normalizedValue.ToLowerInvariant();
    }
}

