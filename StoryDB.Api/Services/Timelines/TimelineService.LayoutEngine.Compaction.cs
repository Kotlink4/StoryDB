using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private static void RepackDurationLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var durationEvents = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? 0)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();
        var durationPreferredLanes = BuildDurationPreferredLanes(events, links, parentEventIds, eventItems);
        var pointSegments = BuildLinkedPointLaneSegments(events, links, parentEventIds, eventItems, rules);
        var placedDurationSegments = new List<TimelineLaneSegment>();

        foreach (var durationEvent in durationEvents.Where(durationEvent => pinnedEventIds.Contains(durationEvent.Id)))
        {
            if (!eventItems.TryGetValue(durationEvent.Id, out var pinnedItem))
            {
                continue;
            }

            placedDurationSegments.Add(CreateLaneSegment(
                pinnedItem.Lane,
                pinnedItem.X,
                pinnedItem.X + pinnedItem.Width,
                durationEvent.StartValue ?? 0,
                durationEvent.Id));
        }

        foreach (var durationEvent in durationEvents.Where(durationEvent => !pinnedEventIds.Contains(durationEvent.Id)))
        {
            if (!eventItems.TryGetValue(durationEvent.Id, out var durationItem))
            {
                continue;
            }

            var nextLane = durationPreferredLanes.GetValueOrDefault(durationEvent.Id);
            while (DurationLaneHasConflict(durationEvent, durationItem, nextLane, pointSegments, placedDurationSegments))
            {
                nextLane++;
            }

            durationItem.Lane = nextLane;
            durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
            MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);

            placedDurationSegments.Add(CreateLaneSegment(
                durationItem.Lane,
                durationItem.X,
                durationItem.X + durationItem.Width,
                durationEvent.StartValue ?? 0,
                durationEvent.Id));
        }
    }

    private static void LiftDurationsAboveLinkedPointLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var durationEvents = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? 0)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();

        for (var pass = 0; pass < Math.Max(durationEvents.Count, 1); pass++)
        {
            var changed = false;
            var pointSegments = BuildLinkedPointLaneSegments(events, links, parentEventIds, eventItems, rules);

            foreach (var durationEvent in durationEvents)
            {
                if (pinnedEventIds.Contains(durationEvent.Id) ||
                    !eventItems.TryGetValue(durationEvent.Id, out var durationItem))
                {
                    continue;
                }

                var nextLane = durationItem.Lane;
                while (DurationLaneHasConflict(durationEvent, durationItem, nextLane, durationEvents, eventItems, pointSegments))
                {
                    nextLane++;
                }

                if (nextLane == durationItem.Lane)
                {
                    continue;
                }

                durationItem.Lane = nextLane;
                durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
                MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);
                changed = true;
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static void CompactUnlinkedStandalonePoints(
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
        var linkedPointIds = links
            .Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase))
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .Where(eventId =>
                eventsById.TryGetValue(eventId, out var timelineEvent) &&
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .ToHashSet();
        var durationValueSegments = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Where(timelineEvent => eventItems.ContainsKey(timelineEvent.Id))
            .Select(timelineEvent => new TimelineLaneValueSegment(
                eventItems[timelineEvent.Id].Lane,
                GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]),
                GetEventEndValue(timelineEvent, eventIndexes[timelineEvent.Id]),
                timelineEvent.Id))
            .ToList();
        var fixedPointSegments = new List<TimelineLaneValueSegment>();
        var movablePointEvents = events
            .Select((timelineEvent, index) => new { Event = timelineEvent, Index = index })
            .Where(item =>
                item.Event.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                parentEventIds.GetValueOrDefault(item.Event.Id) is null &&
                !linkedPointIds.Contains(item.Event.Id) &&
                !pinnedEventIds.Contains(item.Event.Id) &&
                eventItems.ContainsKey(item.Event.Id))
            .OrderBy(item => GetEventStartValue(item.Event, item.Index))
            .ThenBy(item => item.Event.SortOrder)
            .ThenBy(item => item.Event.Id)
            .ToList();
        var movablePointIds = movablePointEvents.Select(item => item.Event.Id).ToHashSet();
        var pointWindow = Math.Max(1, (maxValue - minValue) / 60);

        foreach (var item in events.Select((timelineEvent, index) => new { Event = timelineEvent, Index = index }))
        {
            if (!item.Event.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                movablePointIds.Contains(item.Event.Id) ||
                !eventItems.TryGetValue(item.Event.Id, out var pointItem))
            {
                continue;
            }

            var start = GetEventStartValue(item.Event, item.Index);
            var occupiedEnd = start + pointWindow;
            fixedPointSegments.Add(new TimelineLaneValueSegment(pointItem.Lane, start, occupiedEnd, item.Event.Id));
        }

        foreach (var pointEvent in movablePointEvents)
        {
            var pointItem = eventItems[pointEvent.Event.Id];
            var start = GetEventStartValue(pointEvent.Event, pointEvent.Index);
            var occupiedEnd = start + pointWindow;
            var nextLane = ResolveStandalonePointLane(fixedPointSegments, durationValueSegments, start, occupiedEnd, 0);

            pointItem.Lane = nextLane;
            pointItem.Y = ResolveStandalonePointY(nextLane, 0, rules);
            fixedPointSegments.Add(new TimelineLaneValueSegment(nextLane, start, occupiedEnd, pointEvent.Event.Id));
        }
    }

    private static bool DurationLaneHasConflict(
        TimelineEvent durationEvent,
        TimelineLayoutItem durationItem,
        int lane,
        IReadOnlyList<TimelineEvent> durationEvents,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        IReadOnlyList<TimelineLaneSegment> pointSegments)
    {
        var durationStartX = durationItem.X;
        var durationEndX = durationItem.X + durationItem.Width;
        var durationStartValue = durationEvent.StartValue ?? 0;

        if (pointSegments.Any(segment =>
                segment.Lane == lane &&
                (segment.BlocksDurationRegardlessOfStart || segment.StartValue <= durationStartValue) &&
                segment.OwnerParentEventId != durationEvent.Id &&
                segment.SecondaryOwnerParentEventId != durationEvent.Id &&
                RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX)))
        {
            return true;
        }

        return durationEvents.Any(otherEvent =>
            otherEvent.Id != durationEvent.Id &&
            (otherEvent.StartValue ?? 0) <= durationStartValue &&
            eventItems.TryGetValue(otherEvent.Id, out var otherItem) &&
            otherItem.Lane == lane &&
            RangesOverlap(durationStartX, durationEndX, otherItem.X, otherItem.X + otherItem.Width));
    }

    private static bool DurationLaneHasConflict(
        TimelineEvent durationEvent,
        TimelineLayoutItem durationItem,
        int lane,
        IReadOnlyList<TimelineLaneSegment> pointSegments,
        IReadOnlyList<TimelineLaneSegment> durationSegments)
    {
        var durationStartX = durationItem.X;
        var durationEndX = durationItem.X + durationItem.Width;
        var durationStartValue = durationEvent.StartValue ?? 0;

        if (pointSegments.Any(segment =>
                segment.Lane == lane &&
                (segment.BlocksDurationRegardlessOfStart || segment.StartValue <= durationStartValue) &&
                segment.OwnerParentEventId != durationEvent.Id &&
                segment.SecondaryOwnerParentEventId != durationEvent.Id &&
                RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX)))
        {
            return true;
        }

        return durationSegments.Any(segment =>
            segment.Lane == lane &&
            segment.OwnerParentEventId != durationEvent.Id &&
            RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX));
    }

    private static void MoveChildPointsWithDuration(
        int durationEventId,
        TimelineLayoutItem durationItem,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        foreach (var child in parentEventIds.Where(item => item.Value == durationEventId))
        {
            if (!eventsById.TryGetValue(child.Key, out var childEvent) ||
                !childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                !eventItems.TryGetValue(child.Key, out var childItem))
            {
                continue;
            }

            childItem.Lane = durationItem.Lane;
            childItem.Y = ResolveY(childEvent.EventType, durationItem.Lane, durationItem, rules);
        }
    }
}

