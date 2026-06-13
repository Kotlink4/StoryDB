using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StoryDB.Api.Services.Timelines;
public partial class TimelineService
{
    private static List<TimelineParticipant> ToParticipants(
        IReadOnlyList<TimelineParticipantRequest>? participants) =>
        (participants ?? Array.Empty<TimelineParticipantRequest>())
            .Where(participant =>
                !string.IsNullOrWhiteSpace(participant.TargetType) &&
                (participant.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || participant.TargetId > 0))
            .Select((participant, index) => new TimelineParticipant
            {
                TargetType = participant.TargetType.Trim(),
                TargetId = participant.TargetId,
                Role = NormalizeOptionalText(participant.Role),
                SortOrder = index,
            })
            .ToList();

    private static List<TimelineChange> ToChanges(IReadOnlyList<TimelineChangeRequest>? changes) =>
        (changes ?? Array.Empty<TimelineChangeRequest>())
            .Where(change =>
                !string.IsNullOrWhiteSpace(change.ChangeType) &&
                !string.IsNullOrWhiteSpace(change.TargetType) &&
                (change.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || change.TargetId > 0))
            .Select((change, index) => new TimelineChange
            {
                ChangeType = change.ChangeType.Trim(),
                TargetType = change.TargetType.Trim(),
                TargetId = change.TargetId,
                FieldKey = NormalizeOptionalText(change.FieldKey),
                FieldName = NormalizeOptionalText(change.FieldName),
                OldValueJson = NormalizeOptionalText(change.OldValueJson),
                NewValueJson = NormalizeOptionalText(change.NewValueJson),
                EffectiveFromLabel = NormalizeOptionalText(change.EffectiveFromLabel),
                EffectiveToLabel = NormalizeOptionalText(change.EffectiveToLabel),
                EffectiveFromValue = change.EffectiveFromValue,
                EffectiveToValue = change.EffectiveToValue,
                Notes = NormalizeOptionalText(change.Notes),
                SortOrder = index,
            })
            .ToList();

    private static TimelineDto ToTimelineDto(Timeline timeline) =>
        new(timeline.Id, timeline.ProjectId, timeline.Name, timeline.Mode, timeline.IsDefault, timeline.UpdatedAt);

    private static TimelineLayoutDto ToLayoutDto(
        int timelineId,
        DateTime generatedAt,
        IReadOnlyList<TimelineLayoutItem> items) =>
        new(
            timelineId,
            timelineId,
            LayoutAlgorithmVersion,
            false,
            generatedAt,
            items
                .OrderBy(item => item.Layer)
                .ThenBy(item => item.Lane)
                .ThenBy(item => item.X)
                .Select(item => new TimelineLayoutItemDto(
                    item.Id,
                    item.TimelineEventId,
                    item.X,
                    item.Y,
                    item.Width,
                    item.Height,
                    item.Lane,
                    item.Layer,
                    item.IsPinned))
                .ToList());

    private static List<TimelineLayoutItem> ToPinnedLayoutItems(IReadOnlyList<TimelineLayoutItemDto> items) =>
        items
            .Where(item => item.IsPinned)
            .Select(item => new TimelineLayoutItem
            {
                Id = item.Id,
                TimelineEventId = item.TimelineEventId,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                Lane = item.Lane,
                Layer = item.Layer,
                IsPinned = item.IsPinned,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            })
            .ToList();

    private static TimelineEventDto ToDto(TimelineEvent timelineEvent) =>
        new(
            timelineEvent.Id,
            timelineEvent.TimelineId,
            timelineEvent.ParentEventId,
            timelineEvent.Title,
            timelineEvent.EventType,
            timelineEvent.Description,
            timelineEvent.StartLabel,
            timelineEvent.EndLabel,
            timelineEvent.StartValue,
            timelineEvent.EndValue,
            timelineEvent.Category,
            timelineEvent.Color,
            timelineEvent.ImagePath,
            timelineEvent.GalleryImages
                .OrderBy(image => image.SortOrder)
                .ThenBy(image => image.Id)
                .Select(image => new TimelineEventGalleryImageDto(
                    image.Id,
                    image.ImagePath,
                    image.Caption,
                    image.SortOrder))
                .ToList(),
            timelineEvent.Participants
                .OrderBy(participant => participant.SortOrder)
                .Select(participant => new TimelineParticipantDto(
                    participant.Id,
                    participant.TargetType,
                    participant.TargetId,
                    participant.Role))
                .ToList(),
            timelineEvent.Changes
                .OrderBy(change => change.SortOrder)
                .Select(change => new TimelineChangeDto(
                    change.Id,
                    change.ChangeType,
                    change.TargetType,
                    change.TargetId,
                    change.FieldKey,
                    change.FieldName,
                    change.OldValueJson,
                    change.NewValueJson,
                    change.EffectiveFromLabel,
                    change.EffectiveToLabel,
                    change.EffectiveFromValue,
                    change.EffectiveToValue,
                    change.Notes))
                .ToList());

    private static TimelineEventLinkDto ToLinkDto(TimelineEventLink link) =>
        new(
            link.Id,
            link.SourceEventId,
            link.TargetEventId,
            link.LinkType,
            link.Description);

    private static string NormalizeTimelineMode(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "chapters" : normalizedValue;
    }

    private static string NormalizeEventType(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "point" : normalizedValue;
    }

    private static string NormalizeEventLinkType(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "related" : normalizedValue;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }
}

