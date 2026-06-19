using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private static void AlignLinkedPointItems(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        int maxDurationLane,
        TimelineLayoutRulesConfig rules)
    {
        var pointEventIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();

        for (var pass = 0; pass < Math.Max(events.Count, 1); pass++)
        {
            var changed = false;
            foreach (var link in links.OrderBy(link => link.SortOrder).ThenBy(link => link.Id))
            {
                if (!pointEventIds.Contains(link.SourceEventId) ||
                    !pointEventIds.Contains(link.TargetEventId) ||
                    !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                    !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
                {
                    continue;
                }

                var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
                var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
                var sourcePinned = pinnedEventIds.Contains(link.SourceEventId);
                var targetPinned = pinnedEventIds.Contains(link.TargetEventId);

                if (link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
                {
                    if (sourceParentId is null && targetParentId is null)
                    {
                        if (!targetPinned)
                        {
                            var nextLane = targetItem.Lane == sourceItem.Lane
                                ? sourceItem.Lane + 1
                                : targetItem.Lane;
                            changed |= MovePointItem(targetItem, sourceItem.X, ResolveStandalonePointY(nextLane, maxDurationLane, rules), nextLane);
                        }
                        else if (!sourcePinned)
                        {
                            var nextLane = sourceItem.Lane == targetItem.Lane
                                ? targetItem.Lane + 1
                                : sourceItem.Lane;
                            changed |= MovePointItem(sourceItem, targetItem.X, ResolveStandalonePointY(nextLane, maxDurationLane, rules), nextLane);
                        }

                        continue;
                    }

                    var sharedX = sourcePinned
                        ? sourceItem.X
                        : targetPinned
                            ? targetItem.X
                            : sourceParentId is not null
                                ? sourceItem.X
                                : targetParentId is not null
                                    ? targetItem.X
                                    : sourceItem.X;

                    if (!sourcePinned)
                    {
                        changed |= MovePointItem(sourceItem, sharedX, sourceItem.Y, sourceItem.Lane);
                    }

                    if (!targetPinned)
                    {
                        changed |= MovePointItem(targetItem, sharedX, targetItem.Y, targetItem.Lane);
                    }

                    continue;
                }

                if (targetPinned || targetParentId is not null)
                {
                    continue;
                }

                if (link.LinkType.Equals("precedes", StringComparison.OrdinalIgnoreCase) ||
                    link.LinkType.Equals("causes", StringComparison.OrdinalIgnoreCase) ||
                    link.LinkType.Equals("related", StringComparison.OrdinalIgnoreCase))
                {
                    changed |= MovePointItem(targetItem, targetItem.X, sourceItem.Y, sourceItem.Lane);
                }
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static bool MovePointItem(TimelineLayoutItem item, decimal x, decimal y, int lane)
    {
        if (item.X == x && item.Y == y && item.Lane == lane)
        {
            return false;
        }

        item.X = x;
        item.Y = y;
        item.Lane = lane;
        return true;
    }

    private static void CompactVerticalLinkedStandalonePoints(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var pointIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var preferredLanes = new Dictionary<int, int>();

        foreach (var link in links.Where(link => link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase)))
        {
            if (!pointIds.Contains(link.SourceEventId) || !pointIds.Contains(link.TargetEventId))
            {
                continue;
            }

            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
            if (sourceParentId is not null && targetParentId is null && eventItems.TryGetValue(sourceParentId.Value, out var sourceParentItem))
            {
                preferredLanes[link.TargetEventId] = Math.Max(
                    preferredLanes.GetValueOrDefault(link.TargetEventId),
                    sourceParentItem.Lane + 1);
            }

            if (targetParentId is not null && sourceParentId is null && eventItems.TryGetValue(targetParentId.Value, out var targetParentItem))
            {
                preferredLanes[link.SourceEventId] = Math.Max(
                    preferredLanes.GetValueOrDefault(link.SourceEventId),
                    targetParentItem.Lane + 1);
            }
        }

        var movablePointEvents = preferredLanes.Keys
            .Where(pointId =>
                !pinnedEventIds.Contains(pointId) &&
                parentEventIds.GetValueOrDefault(pointId) is null &&
                eventsById.TryGetValue(pointId, out var timelineEvent) &&
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                eventItems.ContainsKey(pointId))
            .Select(pointId => eventsById[pointId])
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();
        if (movablePointEvents.Count == 0)
        {
            return;
        }

        var movablePointIds = movablePointEvents.Select(timelineEvent => timelineEvent.Id).ToHashSet();
        var fixedPointSegments = new List<TimelineLaneValueSegment>();
        var pointWindow = Math.Max(1, (maxValue - minValue) / 60);

        foreach (var timelineEvent in events)
        {
            if (!timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                movablePointIds.Contains(timelineEvent.Id) ||
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is not null ||
                !eventItems.TryGetValue(timelineEvent.Id, out var pointItem))
            {
                continue;
            }

            var start = GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]);
            var occupiedEnd = start + pointWindow;
            fixedPointSegments.Add(new TimelineLaneValueSegment(pointItem.Lane, start, occupiedEnd, timelineEvent.Id));
        }

        foreach (var timelineEvent in movablePointEvents)
        {
            var pointItem = eventItems[timelineEvent.Id];
            var start = GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]);
            var occupiedEnd = start + pointWindow;
            var lane = ResolvePointLane(fixedPointSegments, start, occupiedEnd, preferredLanes[timelineEvent.Id]);

            MovePointItem(pointItem, pointItem.X, ResolveStandalonePointY(lane, 0, rules), lane);
            fixedPointSegments.Add(new TimelineLaneValueSegment(lane, start, occupiedEnd, timelineEvent.Id));
        }
    }

    private static void AlignDurationsToLinkedPointLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);

        foreach (var link in links.OrderBy(link => link.SortOrder).ThenBy(link => link.Id))
        {
            if (!IsHorizontalPointLink(link) ||
                !eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
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
                pinnedEventIds.Contains(durationEvent.Id) ||
                parentEventIds.GetValueOrDefault(pointEvent.Id) == durationEvent.Id ||
                !eventItems.TryGetValue(pointEvent.Id, out var pointItem) ||
                !eventItems.TryGetValue(durationEvent.Id, out var durationItem))
            {
                continue;
            }

            var nextLane = Math.Max(durationItem.Lane, pointItem.Lane);
            if (nextLane == durationItem.Lane)
            {
                continue;
            }

            durationItem.Lane = nextLane;
            durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
            MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);
        }
    }

}
