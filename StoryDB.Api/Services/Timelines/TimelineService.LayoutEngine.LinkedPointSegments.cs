using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private static List<TimelineLaneSegment> BuildLinkedPointLaneSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        var eventStartValues = events
            .Select((timelineEvent, index) => new { timelineEvent.Id, Value = GetEventStartValue(timelineEvent, index) })
            .ToDictionary(item => item.Id, item => item.Value);
        var pointIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var durationIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var linkedPointIds = links
            .Where(link =>
                !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase) &&
                (pointIds.Contains(link.SourceEventId) || pointIds.Contains(link.TargetEventId)))
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .Where(pointIds.Contains)
            .ToHashSet();
        var verticalProtectedPointIds = links
            .Where(link => link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
            .Where(link =>
                pointIds.Contains(link.SourceEventId) &&
                pointIds.Contains(link.TargetEventId) &&
                eventItems.TryGetValue(link.SourceEventId, out var sourceItem) &&
                eventItems.TryGetValue(link.TargetEventId, out var targetItem) &&
                sourceItem.Lane != targetItem.Lane)
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .ToHashSet();
        var segments = new List<TimelineLaneSegment>();

        foreach (var pointId in linkedPointIds)
        {
            if (!eventItems.TryGetValue(pointId, out var pointItem))
            {
                continue;
            }

            var centerX = pointItem.X + pointItem.Width / 2;
            var ownerParentId = parentEventIds.GetValueOrDefault(pointId);
            segments.Add(CreateLaneSegment(
                pointItem.Lane,
                centerX - rules.PointSize,
                centerX + rules.PointSize,
                eventStartValues.GetValueOrDefault(pointId),
                ownerParentId,
                blocksDurationRegardlessOfStart: verticalProtectedPointIds.Contains(pointId)));
        }

        foreach (var link in links)
        {
            if (!IsHorizontalPointLink(link) ||
                !pointIds.Contains(link.SourceEventId) ||
                !pointIds.Contains(link.TargetEventId) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceCenterX = sourceItem.X + sourceItem.Width / 2;
            var targetCenterX = targetItem.X + targetItem.Width / 2;
            var segmentValue = Math.Min(
                eventStartValues.GetValueOrDefault(link.SourceEventId),
                eventStartValues.GetValueOrDefault(link.TargetEventId));
            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
            segments.Add(CreateLaneSegment(
                sourceItem.Lane,
                Math.Min(sourceCenterX, targetCenterX) - rules.PointSize,
                Math.Max(sourceCenterX, targetCenterX) + rules.PointSize,
                segmentValue,
                sourceParentId,
                targetParentId));
        }

        foreach (var link in links)
        {
            if (!link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase) ||
                !pointIds.Contains(link.SourceEventId) ||
                !pointIds.Contains(link.TargetEventId) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceCenterX = sourceItem.X + sourceItem.Width / 2;
            var targetCenterX = targetItem.X + targetItem.Width / 2;
            var verticalX = Math.Abs(sourceCenterX - targetCenterX) < 1
                ? sourceCenterX
                : targetCenterX;
            var firstLane = Math.Min(sourceItem.Lane, targetItem.Lane);
            var lastLane = Math.Max(sourceItem.Lane, targetItem.Lane);
            var hasVerticalSpan = firstLane != lastLane;
            var segmentValue = Math.Min(
                eventStartValues.GetValueOrDefault(link.SourceEventId),
                eventStartValues.GetValueOrDefault(link.TargetEventId));
            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);

            for (var lane = firstLane; lane <= lastLane; lane++)
            {
                segments.Add(CreateLaneSegment(
                    lane,
                    verticalX - rules.PointSize,
                    verticalX + rules.PointSize,
                    segmentValue,
                    sourceParentId,
                    targetParentId,
                    hasVerticalSpan));
            }
        }

        foreach (var link in links)
        {
            if (link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase) ||
                !((pointIds.Contains(link.SourceEventId) && durationIds.Contains(link.TargetEventId)) ||
                  (pointIds.Contains(link.TargetEventId) && durationIds.Contains(link.SourceEventId))))
            {
                continue;
            }

            var pointId = pointIds.Contains(link.SourceEventId) ? link.SourceEventId : link.TargetEventId;
            var durationId = durationIds.Contains(link.SourceEventId) ? link.SourceEventId : link.TargetEventId;

            if (!eventItems.TryGetValue(pointId, out var pointItem) ||
                !eventItems.TryGetValue(durationId, out var durationItem) ||
                parentEventIds.GetValueOrDefault(pointId) == durationId)
            {
                continue;
            }

            var pointCenterX = pointItem.X + pointItem.Width / 2;
            var durationStartX = durationItem.X;
            var durationEndX = durationItem.X + durationItem.Width;
            segments.Add(CreateLaneSegment(
                pointItem.Lane,
                Math.Min(pointCenterX, durationStartX) - rules.PointSize,
                Math.Max(pointCenterX, durationEndX) + rules.PointSize,
                eventStartValues.GetValueOrDefault(pointId),
                durationId));
        }

        return segments;
    }
}
