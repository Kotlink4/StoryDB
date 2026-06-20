using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private sealed record TimelineLinkedComponent(HashSet<int> EventIds, decimal StartValue, int FirstSortOrder);

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

}
