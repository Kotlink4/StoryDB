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
}



