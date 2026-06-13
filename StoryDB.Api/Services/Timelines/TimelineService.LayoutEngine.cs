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
    private static List<TimelineLayoutItem> GenerateLayoutItems(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyList<TimelineLayoutItem> pinnedItems,
        DateTime now,
        TimelineLayoutRulesConfig rules)
    {
        var generatedItems = new List<TimelineLayoutItem>();
        var eventItems = new Dictionary<int, TimelineLayoutItem>();
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var parentEventIds = BuildParentEventMap(events, links);
        var minValue = events.Select(timelineEvent => timelineEvent.StartValue).OfType<decimal>().DefaultIfEmpty(0).Min();
        var maxValue = events
            .Select(timelineEvent => timelineEvent.EndValue ?? timelineEvent.StartValue)
            .OfType<decimal>()
            .DefaultIfEmpty(Math.Max(minValue + 1, 1))
            .Max();
        if (maxValue <= minValue)
        {
            maxValue = minValue + Math.Max(events.Count, 1);
        }

        foreach (var timelineEvent in events
            .Select((timelineEvent, index) => new { Event = timelineEvent, Index = index })
            .OrderBy(item => ResolveLayer(item.Event.EventType))
            .ThenBy(item => GetEventStartValue(item.Event, item.Index))
            .ThenBy(item => item.Event.SortOrder)
            .ThenBy(item => item.Event.Id))
        {
            if (!timelineEvent.Event.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) &&
                !timelineEvent.Event.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            AddTimelineLayoutItem(
                timelineEvent.Event,
                timelineEvent.Index,
                timelineEvent.Event.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ? -2 : -1,
                eventsById,
                parentEventIds,
                eventItems,
                generatedItems,
                minValue,
                maxValue,
                now,
                rules);
        }

        var occupiedSegments = new List<TimelineLayoutLaneSegment>();
        var protectedSegments = new List<TimelineLayoutLaneSegment>();
        var linkedComponents = BuildLinkedTimelineComponents(events, links, parentEventIds);
        var linkedEventIds = linkedComponents
            .SelectMany(component => component.EventIds)
            .ToHashSet();

        foreach (var component in linkedComponents.OrderBy(component => component.StartValue).ThenBy(component => component.FirstSortOrder))
        {
            var laneOffsets = ResolveLinkedComponentLaneOffsets(component.EventIds, links, parentEventIds, eventsById);
            var baseLane = ResolveLinkedComponentBaseLane(
                component.EventIds,
                laneOffsets,
                eventsById,
                eventIndexes,
                parentEventIds,
                occupiedSegments,
                protectedSegments,
                minValue,
                maxValue,
                rules);

            foreach (var timelineEvent in component.EventIds
                .Select(eventId => eventsById[eventId])
                .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
                .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
                .ThenBy(timelineEvent => timelineEvent.SortOrder)
                .ThenBy(timelineEvent => timelineEvent.Id))
            {
                var lane = baseLane + laneOffsets.GetValueOrDefault(timelineEvent.Id);
                AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }

            foreach (var timelineEvent in component.EventIds
                .Select(eventId => eventsById[eventId])
                .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
                .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
                .ThenBy(timelineEvent => timelineEvent.SortOrder)
                .ThenBy(timelineEvent => timelineEvent.Id))
            {
                var parentEventId = parentEventIds.GetValueOrDefault(timelineEvent.Id);
                var lane = parentEventId is not null && eventItems.TryGetValue(parentEventId.Value, out var parentItem)
                    ? parentItem.Lane
                    : baseLane + laneOffsets.GetValueOrDefault(timelineEvent.Id);
                AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }

            foreach (var durationEventId in component.EventIds
                .Where(eventId => eventsById[eventId].EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)))
            {
                if (!eventItems.TryGetValue(durationEventId, out var durationItem))
                {
                    continue;
                }

                foreach (var childEvent in events
                    .Where(childEvent =>
                        childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                        parentEventIds.GetValueOrDefault(childEvent.Id) == durationEventId &&
                        !eventItems.ContainsKey(childEvent.Id))
                    .OrderBy(childEvent => GetEventStartValue(childEvent, eventIndexes[childEvent.Id]))
                    .ThenBy(childEvent => childEvent.SortOrder)
                    .ThenBy(childEvent => childEvent.Id))
                {
                    AddTimelineLayoutItem(childEvent, eventIndexes[childEvent.Id], durationItem.Lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
                }
            }

            AddOccupiedSegments(component.EventIds, eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);
            protectedSegments = BuildTimelineProtectedLinkSegments(events, links, parentEventIds, eventItems, rules);
        }

        foreach (var timelineEvent in events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) &&
                !eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id))
        {
            var lane = ResolveFirstFreeTimelineLane(timelineEvent, eventIndexes[timelineEvent.Id], occupiedSegments, protectedSegments, minValue, maxValue, rules, 0);
            AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            AddOccupiedSegments([timelineEvent.Id], eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);

            foreach (var childEvent in events
                .Where(childEvent =>
                    childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                    parentEventIds.GetValueOrDefault(childEvent.Id) == timelineEvent.Id &&
                    !eventItems.ContainsKey(childEvent.Id))
                .OrderBy(childEvent => GetEventStartValue(childEvent, eventIndexes[childEvent.Id]))
                .ThenBy(childEvent => childEvent.SortOrder)
                .ThenBy(childEvent => childEvent.Id))
            {
                AddTimelineLayoutItem(childEvent, eventIndexes[childEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }
        }

        foreach (var timelineEvent in events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is null &&
                !eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id))
        {
            var lane = ResolveFirstFreeTimelineLane(timelineEvent, eventIndexes[timelineEvent.Id], occupiedSegments, protectedSegments, minValue, maxValue, rules, 0);
            AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            AddOccupiedSegments([timelineEvent.Id], eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);
        }

        MoveIndependentEventsAwayFromLinkSegments(
            events,
            links,
            parentEventIds,
            eventItems,
            linkedEventIds,
            minValue,
            maxValue,
            rules);

        return generatedItems;
    }

    private sealed record TimelineLinkedComponent(HashSet<int> EventIds, decimal StartValue, int FirstSortOrder);

    private readonly record struct TimelineLayoutLaneSegment(int Lane, decimal StartX, decimal EndX, int EventId);

    private readonly record struct TimelineLayoutAnchor(decimal X, int Lane);

    private static List<TimelineLinkedComponent> BuildLinkedTimelineComponents(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var layoutEventIds = events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var adjacency = layoutEventIds.ToDictionary(eventId => eventId, _ => new HashSet<int>());

        foreach (var link in links.Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!layoutEventIds.Contains(link.SourceEventId) || !layoutEventIds.Contains(link.TargetEventId))
            {
                continue;
            }

            adjacency[link.SourceEventId].Add(link.TargetEventId);
            adjacency[link.TargetEventId].Add(link.SourceEventId);

            foreach (var eventId in new[] { link.SourceEventId, link.TargetEventId })
            {
                var parentEventId = parentEventIds.GetValueOrDefault(eventId);
                if (parentEventId is null || !layoutEventIds.Contains(parentEventId.Value))
                {
                    continue;
                }

                adjacency[eventId].Add(parentEventId.Value);
                adjacency[parentEventId.Value].Add(eventId);
            }
        }

        var visited = new HashSet<int>();
        var components = new List<TimelineLinkedComponent>();
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);

        foreach (var eventId in layoutEventIds.OrderBy(eventId => GetEventStartValue(eventsById[eventId], eventIndexes[eventId])))
        {
            if (visited.Contains(eventId) || adjacency[eventId].Count == 0)
            {
                continue;
            }

            var stack = new Stack<int>();
            var componentIds = new HashSet<int>();
            stack.Push(eventId);

            while (stack.Count > 0)
            {
                var currentId = stack.Pop();
                if (!visited.Add(currentId))
                {
                    continue;
                }

                componentIds.Add(currentId);
                foreach (var nextId in adjacency[currentId])
                {
                    if (!visited.Contains(nextId))
                    {
                        stack.Push(nextId);
                    }
                }
            }

            var startValue = componentIds
                .Select(componentEventId => GetEventStartValue(eventsById[componentEventId], eventIndexes[componentEventId]))
                .DefaultIfEmpty(0)
                .Min();
            var firstSortOrder = componentIds
                .Select(componentEventId => eventsById[componentEventId].SortOrder)
                .DefaultIfEmpty(0)
                .Min();
            components.Add(new TimelineLinkedComponent(componentIds, startValue, firstSortOrder));
        }

        return components;
    }

    private static Dictionary<int, int> ResolveLinkedComponentLaneOffsets(
        IReadOnlySet<int> eventIds,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineEvent> eventsById)
    {
        var offsets = eventIds.ToDictionary(eventId => eventId, _ => 0);
        var maxPassCount = Math.Max(1, eventIds.Count * 4 + links.Count);

        for (var pass = 0; pass < maxPassCount; pass++)
        {
            var changed = false;

            foreach (var item in parentEventIds.Where(item => item.Value is not null && eventIds.Contains(item.Key) && eventIds.Contains(item.Value.Value)))
            {
                var sharedOffset = Math.Max(offsets[item.Key], offsets[item.Value!.Value]);
                if (offsets[item.Key] != sharedOffset)
                {
                    offsets[item.Key] = sharedOffset;
                    changed = true;
                }

                if (offsets[item.Value.Value] != sharedOffset)
                {
                    offsets[item.Value.Value] = sharedOffset;
                    changed = true;
                }
            }

            foreach (var link in links.Where(link => eventIds.Contains(link.SourceEventId) && eventIds.Contains(link.TargetEventId)))
            {
                if (link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
                {
                    if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                        !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
                    {
                        continue;
                    }

                    var isPointDurationLink =
                        (sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                         targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)) ||
                        (sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) &&
                         targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase));
                    if (isPointDurationLink)
                    {
                        continue;
                    }

                    var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
                    var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);

                    if (sourceParentId is not null && targetParentId is null)
                    {
                        var targetOffset = offsets[link.SourceEventId] + 1;
                        if (offsets[link.TargetEventId] < targetOffset)
                        {
                            offsets[link.TargetEventId] = targetOffset;
                            changed = true;
                        }

                        continue;
                    }

                    if (targetParentId is not null && sourceParentId is null)
                    {
                        var sourceOffset = offsets[link.TargetEventId] + 1;
                        if (offsets[link.SourceEventId] < sourceOffset)
                        {
                            offsets[link.SourceEventId] = sourceOffset;
                            changed = true;
                        }

                        continue;
                    }

                    var defaultTargetOffset = offsets[link.SourceEventId] + 1;
                    if (offsets[link.TargetEventId] < defaultTargetOffset)
                    {
                        offsets[link.TargetEventId] = defaultTargetOffset;
                        changed = true;
                    }

                    continue;
                }

                var sharedOffset = Math.Max(offsets[link.SourceEventId], offsets[link.TargetEventId]);
                if (offsets[link.SourceEventId] != sharedOffset)
                {
                    offsets[link.SourceEventId] = sharedOffset;
                    changed = true;
                }

                if (offsets[link.TargetEventId] != sharedOffset)
                {
                    offsets[link.TargetEventId] = sharedOffset;
                    changed = true;
                }
            }

            if (!changed)
            {
                break;
            }
        }

        var minOffset = offsets.Values.DefaultIfEmpty(0).Min();
        foreach (var eventId in offsets.Keys.ToList())
        {
            offsets[eventId] -= minOffset;
        }

        return offsets;
    }

    private static int ResolveLinkedComponentBaseLane(
        IReadOnlySet<int> eventIds,
        IReadOnlyDictionary<int, int> laneOffsets,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        for (var baseLane = 0; baseLane < 48; baseLane++)
        {
            var hasConflict = eventIds.Any(eventId =>
            {
                var timelineEvent = eventsById[eventId];
                if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                    parentEventIds.GetValueOrDefault(eventId) is not null)
                {
                    return false;
                }

                var lane = baseLane + laneOffsets.GetValueOrDefault(eventId);
                return TimelineEventHasLaneConflict(
                    timelineEvent,
                    eventIndexes[eventId],
                    lane,
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules,
                    eventId);
            });

            if (!hasConflict)
            {
                return baseLane;
            }
        }

        return 48;
    }

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

    private static List<TimelineLayoutLaneSegment> BuildTimelineProtectedLinkSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var protectedSegments = new List<TimelineLayoutLaneSegment>();

        foreach (var link in links.Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceAnchor = GetTimelineLayoutAnchor(sourceEvent, sourceItem);
            var targetAnchor = GetTimelineLayoutAnchor(targetEvent, targetItem);

            if (sourceAnchor.Lane == targetAnchor.Lane)
            {
                protectedSegments.Add(new TimelineLayoutLaneSegment(
                    sourceAnchor.Lane,
                    Math.Min(sourceAnchor.X, targetAnchor.X) - rules.PointSize,
                    Math.Max(sourceAnchor.X, targetAnchor.X) + rules.PointSize,
                    0));
                continue;
            }

            if (Math.Abs(sourceAnchor.X - targetAnchor.X) < 1)
            {
                var firstLane = Math.Min(sourceAnchor.Lane, targetAnchor.Lane);
                var lastLane = Math.Max(sourceAnchor.Lane, targetAnchor.Lane);
                for (var lane = firstLane; lane <= lastLane; lane++)
                {
                    protectedSegments.Add(new TimelineLayoutLaneSegment(
                        lane,
                        sourceAnchor.X - rules.PointSize,
                        sourceAnchor.X + rules.PointSize,
                        0));
                }

                continue;
            }

            var midX = sourceAnchor.X + (targetAnchor.X - sourceAnchor.X) / 2;
            protectedSegments.Add(new TimelineLayoutLaneSegment(
                sourceAnchor.Lane,
                Math.Min(sourceAnchor.X, midX) - rules.PointSize,
                Math.Max(sourceAnchor.X, midX) + rules.PointSize,
                0));
            protectedSegments.Add(new TimelineLayoutLaneSegment(
                targetAnchor.Lane,
                Math.Min(midX, targetAnchor.X) - rules.PointSize,
                Math.Max(midX, targetAnchor.X) + rules.PointSize,
                0));

            var firstRouteLane = Math.Min(sourceAnchor.Lane, targetAnchor.Lane);
            var lastRouteLane = Math.Max(sourceAnchor.Lane, targetAnchor.Lane);
            for (var lane = firstRouteLane; lane <= lastRouteLane; lane++)
            {
                protectedSegments.Add(new TimelineLayoutLaneSegment(
                    lane,
                    midX - rules.PointSize,
                    midX + rules.PointSize,
                    0));
            }
        }

        return protectedSegments;
    }

    private static TimelineLayoutAnchor GetTimelineLayoutAnchor(TimelineEvent timelineEvent, TimelineLayoutItem item)
    {
        var x = timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
            ? item.X + item.Width / 2
            : item.X + item.Width / 2;
        return new TimelineLayoutAnchor(x, item.Lane);
    }

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

    private static decimal GetTimelineEventX(
        TimelineEvent timelineEvent,
        int index,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var start = GetEventStartValue(timelineEvent, index);
        var scaledStart = ScaleToCanvas(start, minValue, maxValue);
        return timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? scaledStart - rules.PointSize / 2
            : scaledStart;
    }

    private static decimal GetTimelineEventWidth(
        TimelineEvent timelineEvent,
        int index,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        if (timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return 2;
        }

        if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return rules.PointSize;
        }

        var startX = ScaleToCanvas(GetEventStartValue(timelineEvent, index), minValue, maxValue);
        var endX = ScaleToCanvas(GetEventEndValue(timelineEvent, index), minValue, maxValue);
        return Math.Max(rules.MinimumDurationWidth, endX - startX);
    }

    private static decimal GetTimelineEventHeight(TimelineEvent timelineEvent, TimelineLayoutRulesConfig rules)
    {
        if (timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase))
        {
            return rules.EraHeight;
        }

        if (timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return rules.ChapterHeight;
        }

        return timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? rules.PointSize
            : rules.DurationHeight;
    }

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


