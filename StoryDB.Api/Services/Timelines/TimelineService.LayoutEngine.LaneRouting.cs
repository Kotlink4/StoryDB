using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private readonly record struct TimelineLayoutLaneSegment(int Lane, decimal StartX, decimal EndX, int EventId);

    private static void AddTimelineLayoutItem(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        List<TimelineLayoutItem> generatedItems,
        decimal minValue,
        decimal maxValue,
        DateTime now,
        TimelineLayoutRulesConfig rules)
    {
        if (eventItems.ContainsKey(timelineEvent.Id))
        {
            return;
        }

        var start = GetEventStartValue(timelineEvent, index);
        var end = GetEventEndValue(timelineEvent, index);
        var x = GetTimelineEventX(timelineEvent, index, minValue, maxValue, rules);
        var width = GetTimelineEventWidth(timelineEvent, index, minValue, maxValue, rules);
        var height = GetTimelineEventHeight(timelineEvent, rules);
        var parentEventId = parentEventIds.GetValueOrDefault(timelineEvent.Id);
        var parentItem = parentEventId is null ? null : eventItems.GetValueOrDefault(parentEventId.Value);
        var itemLane = parentItem is not null && timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? parentItem.Lane
            : lane;
        var y = ResolveY(timelineEvent.EventType, itemLane, parentItem, rules);

        if (timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) && end < start)
        {
            width = rules.MinimumDurationWidth;
        }

        var layoutItem = new TimelineLayoutItem
        {
            TimelineEventId = timelineEvent.Id,
            X = x,
            Y = y,
            Width = width,
            Height = height,
            Lane = itemLane,
            Layer = ResolveLayer(timelineEvent.EventType),
            IsPinned = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        generatedItems.Add(layoutItem);
        eventItems[timelineEvent.Id] = layoutItem;
    }

    private static void AddOccupiedSegments(
        IEnumerable<int> eventIds,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        List<TimelineLayoutLaneSegment> occupiedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        foreach (var eventId in eventIds)
        {
            if (!eventsById.TryGetValue(eventId, out var timelineEvent) ||
                !eventItems.TryGetValue(eventId, out var layoutItem) ||
                timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ||
                timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase) ||
                (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                 parentEventIds.GetValueOrDefault(eventId) is not null))
            {
                continue;
            }

            occupiedSegments.RemoveAll(segment => segment.EventId == eventId);
            occupiedSegments.Add(GetTimelineLayoutSegment(timelineEvent, eventIndexes[eventId], layoutItem.Lane, minValue, maxValue, rules));
        }
    }

    private static List<TimelineLayoutLaneSegment> BuildAllOccupiedSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int? excludedEventId = null)
    {
        var segments = new List<TimelineLayoutLaneSegment>();
        AddOccupiedSegments(
            events
                .Where(timelineEvent => timelineEvent.Id != excludedEventId)
                .Select(timelineEvent => timelineEvent.Id),
            events.ToDictionary(timelineEvent => timelineEvent.Id),
            eventIndexes,
            parentEventIds,
            eventItems,
            segments,
            minValue,
            maxValue,
            rules);
        return segments;
    }

    private static int ResolveFirstFreeTimelineLane(
        TimelineEvent timelineEvent,
        int index,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 64; lane++)
        {
            if (!TimelineEventHasLaneConflict(
                    timelineEvent,
                    index,
                    lane,
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules))
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, 64);
    }

    private static bool TimelineEventHasLaneConflict(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int? ignoredEventId = null)
    {
        if (timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ||
            timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var segment = GetTimelineLayoutSegment(timelineEvent, index, lane, minValue, maxValue, rules);
        return occupiedSegments
            .Concat(protectedSegments)
            .Where(existingSegment => ignoredEventId is null || existingSegment.EventId != ignoredEventId.Value)
            .Any(existingSegment => TimelineSegmentsConflict(segment, existingSegment));
    }

    private static TimelineLayoutLaneSegment GetTimelineLayoutSegment(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var x = GetTimelineEventX(timelineEvent, index, minValue, maxValue, rules);
        var width = GetTimelineEventWidth(timelineEvent, index, minValue, maxValue, rules);

        if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            var centerX = x + width / 2;
            return new TimelineLayoutLaneSegment(lane, centerX - rules.PointSize, centerX + rules.PointSize, timelineEvent.Id);
        }

        return new TimelineLayoutLaneSegment(lane, x, x + width, timelineEvent.Id);
    }

    private static bool TimelineSegmentsConflict(TimelineLayoutLaneSegment first, TimelineLayoutLaneSegment second) =>
        first.Lane == second.Lane && RangesOverlap(first.StartX, first.EndX, second.StartX, second.EndX);

    private static void MoveIndependentEventsAwayFromLinkSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        IReadOnlySet<int> linkedEventIds,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var movableEvents = events
            .Where(timelineEvent =>
                !linkedEventIds.Contains(timelineEvent.Id) &&
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is null &&
                (timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) ||
                 timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)) &&
                eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();

        for (var pass = 0; pass < 20; pass++)
        {
            var changed = false;
            var protectedSegments = BuildTimelineProtectedLinkSegments(events, links, parentEventIds, eventItems, rules);

            foreach (var timelineEvent in movableEvents)
            {
                var item = eventItems[timelineEvent.Id];
                if (!TimelineEventHasLaneConflict(
                        timelineEvent,
                        eventIndexes[timelineEvent.Id],
                        item.Lane,
                        [],
                        protectedSegments,
                        minValue,
                        maxValue,
                        rules,
                        timelineEvent.Id))
                {
                    continue;
                }

                var occupiedSegments = BuildAllOccupiedSegments(events, eventIndexes, parentEventIds, eventItems, minValue, maxValue, rules, timelineEvent.Id);
                var nextLane = ResolveFirstFreeTimelineLane(
                    timelineEvent,
                    eventIndexes[timelineEvent.Id],
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules,
                    item.Lane + 1);

                if (nextLane == item.Lane)
                {
                    continue;
                }

                MoveTimelineEventToLane(timelineEvent, nextLane, eventsById, parentEventIds, eventItems, rules);
                changed = true;
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static void MoveTimelineEventToLane(
        TimelineEvent timelineEvent,
        int lane,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        if (!eventItems.TryGetValue(timelineEvent.Id, out var item))
        {
            return;
        }

        item.Lane = lane;
        item.Y = ResolveY(timelineEvent.EventType, lane, rules);

        if (!timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        foreach (var childEventId in parentEventIds
            .Where(parent => parent.Value == timelineEvent.Id)
            .Select(parent => parent.Key))
        {
            if (!eventsById.TryGetValue(childEventId, out var childEvent) ||
                !eventItems.TryGetValue(childEventId, out var childItem))
            {
                continue;
            }

            childItem.Lane = lane;
            childItem.Y = ResolveY(childEvent.EventType, lane, item, rules);
        }
    }
}


