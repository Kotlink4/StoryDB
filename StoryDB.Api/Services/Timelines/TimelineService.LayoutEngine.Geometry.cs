using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private static bool IsHorizontalPointLink(TimelineEventLink link) =>
        link.LinkType.Equals("precedes", StringComparison.OrdinalIgnoreCase) ||
        link.LinkType.Equals("causes", StringComparison.OrdinalIgnoreCase) ||
        link.LinkType.Equals("related", StringComparison.OrdinalIgnoreCase);

    private static TimelineLaneSegment CreateLaneSegment(
        int lane,
        decimal startX,
        decimal endX,
        decimal startValue,
        int? ownerParentEventId,
        int? secondaryOwnerParentEventId = null,
        bool blocksDurationRegardlessOfStart = false) =>
        startX <= endX
            ? new TimelineLaneSegment(lane, startX, endX, startValue, ownerParentEventId, secondaryOwnerParentEventId, blocksDurationRegardlessOfStart)
            : new TimelineLaneSegment(lane, endX, startX, startValue, ownerParentEventId, secondaryOwnerParentEventId, blocksDurationRegardlessOfStart);

    private static bool RangesOverlap(decimal firstStart, decimal firstEnd, decimal secondStart, decimal secondEnd) =>
        firstStart < secondEnd && firstEnd > secondStart;

    private static bool ValueRangesOverlap(decimal firstStart, decimal firstEnd, decimal secondStart, decimal secondEnd) =>
        firstStart < secondEnd && firstEnd > secondStart;

    private readonly record struct TimelineLaneSegment(
        int Lane,
        decimal StartX,
        decimal EndX,
        decimal StartValue,
        int? OwnerParentEventId,
        int? SecondaryOwnerParentEventId,
        bool BlocksDurationRegardlessOfStart);

    private readonly record struct TimelineLaneValueSegment(
        int Lane,
        decimal StartValue,
        decimal EndValue,
        int EventId);

    private static Dictionary<int, int?> BuildParentEventMap(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var parentEventIds = events.ToDictionary(timelineEvent => timelineEvent.Id, timelineEvent => timelineEvent.ParentEventId);

        foreach (var link in links.Where(link => link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
            {
                continue;
            }

            if (sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            {
                parentEventIds[link.SourceEventId] = link.TargetEventId;
                continue;
            }

            if (targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            {
                parentEventIds[link.TargetEventId] = link.SourceEventId;
            }
        }

        return parentEventIds;
    }

    private static Dictionary<int, int> BuildPreferredLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds)
    {
        return events.ToDictionary(timelineEvent => timelineEvent.Id, _ => 0);
    }

    private static Dictionary<int, int> BuildDurationPreferredLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var preferredLanes = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(timelineEvent => timelineEvent.Id, _ => 0);

        foreach (var link in links.Where(IsHorizontalPointLink))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
            {
                continue;
            }

            var pointEvent = sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;
            var durationEvent = sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;

            if (pointEvent is null ||
                durationEvent is null ||
                parentEventIds.GetValueOrDefault(pointEvent.Id) == durationEvent.Id ||
                !eventItems.TryGetValue(pointEvent.Id, out var pointItem))
            {
                continue;
            }

            preferredLanes[durationEvent.Id] = Math.Max(
                preferredLanes.GetValueOrDefault(durationEvent.Id),
                pointItem.Lane);
        }

        return preferredLanes;
    }

    private static int ResolveLane(
        Dictionary<int, decimal> laneEndValues,
        decimal start,
        decimal end,
        string eventType,
        int preferredLane,
        TimelineLayoutItem? parentItem)
    {
        if (eventType.Equals("era", StringComparison.OrdinalIgnoreCase))
        {
            return -2;
        }

        if (eventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return -1;
        }

        if (parentItem is not null && eventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return parentItem.Lane;
        }

        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            if (!laneEndValues.TryGetValue(lane, out var laneEnd) || start > laneEnd)
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, laneEndValues.Count);
    }

    private static int ResolveStandalonePointLane(
        Dictionary<int, decimal> laneEndValues,
        IReadOnlyList<TimelineLaneValueSegment> durationValueSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            var pointLaneIsFree = !laneEndValues.TryGetValue(lane, out var laneEnd) || start > laneEnd;
            var durationLaneIsFree = !durationValueSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));

            if (pointLaneIsFree && durationLaneIsFree)
            {
                return lane;
            }
        }

        var nextDurationLane = durationValueSegments.Count == 0
            ? 0
            : durationValueSegments.Max(segment => segment.Lane) + 1;
        return Math.Max(preferredLane, Math.Max(laneEndValues.Count, nextDurationLane));
    }

    private static int ResolvePointLane(
        IReadOnlyList<TimelineLaneValueSegment> pointSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            if (!pointSegments.Any(segment =>
                    segment.Lane == lane &&
                    ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue)))
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, pointSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1);
    }

    private static int ResolveStandalonePointLane(
        IReadOnlyList<TimelineLaneValueSegment> pointSegments,
        IReadOnlyList<TimelineLaneValueSegment> durationValueSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        var firstLane = Math.Max(preferredLane, 0);

        for (var lane = firstLane; lane < 24; lane++)
        {
            var pointLaneIsFree = !pointSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));
            var durationLaneIsFree = !durationValueSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));

            if (pointLaneIsFree && durationLaneIsFree)
            {
                return lane;
            }
        }

        var nextPointLane = pointSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1;
        var nextDurationLane = durationValueSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1;
        return Math.Max(firstLane, Math.Max(nextPointLane, nextDurationLane));
    }

    private static decimal ResolveY(string eventType, int lane, TimelineLayoutItem? parentItem, TimelineLayoutRulesConfig rules)
    {
        if (parentItem is not null && eventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return parentItem.Y + rules.DurationTitleHeight + (rules.DurationPointBandHeight - rules.PointSize) / 2;
        }

        return ResolveY(eventType, lane, rules);
    }

    private static decimal ResolveY(string eventType, int lane, TimelineLayoutRulesConfig rules) =>
        eventType switch
        {
            var value when value.Equals("era", StringComparison.OrdinalIgnoreCase) => rules.EraY,
            var value when value.Equals("chapter", StringComparison.OrdinalIgnoreCase) => rules.ChapterY,
            var value when value.Equals("duration", StringComparison.OrdinalIgnoreCase) =>
                rules.AxisY - rules.DurationGap - rules.DurationHeight - lane * rules.LaneStep,
            var value when value.Equals("point", StringComparison.OrdinalIgnoreCase) => ResolvePointY(lane, rules),
            _ => ResolvePointY(lane, rules),
        };

    private static decimal ResolvePointY(int lane, TimelineLayoutRulesConfig rules) =>
        rules.AxisY - rules.DurationGap - rules.DurationHeight + rules.DurationTitleHeight +
        rules.DurationPointBandHeight / 2 - rules.PointSize / 2 - Math.Max(lane, 0) * rules.LaneStep;

    private static decimal ResolveStandalonePointY(int lane, int maxDurationLane, TimelineLayoutRulesConfig rules)
        => ResolvePointY(lane, rules);

    private static decimal GetEventStartValue(TimelineEvent timelineEvent, int index) =>
        timelineEvent.StartValue ?? index;

    private static decimal GetEventEndValue(TimelineEvent timelineEvent, int index)
    {
        var start = GetEventStartValue(timelineEvent, index);
        return timelineEvent.EndValue is null || timelineEvent.EndValue < start
            ? start
            : timelineEvent.EndValue.Value;
    }

    private static int ResolveLayer(string eventType) =>
        eventType switch
        {
            var value when value.Equals("era", StringComparison.OrdinalIgnoreCase) => 0,
            var value when value.Equals("chapter", StringComparison.OrdinalIgnoreCase) => 1,
            var value when value.Equals("duration", StringComparison.OrdinalIgnoreCase) => 2,
            _ => 3,
        };

    private static decimal ScaleToCanvas(decimal value, decimal minValue, decimal maxValue)
    {
        var range = maxValue - minValue;
        if (range <= 0)
        {
            return 96;
        }

        return 96 + (value - minValue) / range * 960;
    }
}
