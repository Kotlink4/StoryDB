using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService
{
    private readonly record struct TimelineLayoutAnchor(decimal X, int Lane);

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

            var sourceAnchor = GetTimelineLayoutAnchor(sourceItem);
            var targetAnchor = GetTimelineLayoutAnchor(targetItem);

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
                AddVerticalProtectedLinkSegments(protectedSegments, sourceAnchor, targetAnchor, rules);
                continue;
            }

            AddOrthogonalProtectedLinkSegments(protectedSegments, sourceAnchor, targetAnchor, rules);
        }

        return protectedSegments;
    }

    private static void AddVerticalProtectedLinkSegments(
        ICollection<TimelineLayoutLaneSegment> protectedSegments,
        TimelineLayoutAnchor sourceAnchor,
        TimelineLayoutAnchor targetAnchor,
        TimelineLayoutRulesConfig rules)
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
    }

    private static void AddOrthogonalProtectedLinkSegments(
        ICollection<TimelineLayoutLaneSegment> protectedSegments,
        TimelineLayoutAnchor sourceAnchor,
        TimelineLayoutAnchor targetAnchor,
        TimelineLayoutRulesConfig rules)
    {
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

    private static TimelineLayoutAnchor GetTimelineLayoutAnchor(TimelineLayoutItem item) =>
        new(item.X + item.Width / 2, item.Lane);
}
