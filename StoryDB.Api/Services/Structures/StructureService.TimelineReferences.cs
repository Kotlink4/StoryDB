using Microsoft.EntityFrameworkCore;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    private async Task<bool> StructureHasTimelineReferences(int projectId, int structureId)
    {
        var structureNodeIds = dbContext.StructureNodes
            .Where(node => node.StructureId == structureId)
            .Select(node => node.Id);
        var structureUsageIds = dbContext.StructureUsages
            .Where(usage =>
                usage.ProjectId == projectId &&
                usage.StructureId == structureId)
            .Select(usage => usage.Id);
        var structureAssignmentIds = dbContext.StructureAssignments
            .Where(assignment =>
                assignment.ProjectId == projectId &&
                assignment.StructureUsage != null &&
                assignment.StructureUsage.StructureId == structureId)
            .Select(assignment => assignment.Id);

        return await dbContext.TimelineParticipants.AnyAsync(participant =>
                participant.TimelineEvent != null &&
                participant.TimelineEvent.ProjectId == projectId &&
                ((participant.TargetType.ToLower() == "structure" && participant.TargetId == structureId) ||
                 (participant.TargetType.ToLower() == "structurenode" && structureNodeIds.Contains(participant.TargetId)) ||
                 (participant.TargetType.ToLower() == "structureusage" && structureUsageIds.Contains(participant.TargetId)) ||
                 (participant.TargetType.ToLower() == "structureassignment" && structureAssignmentIds.Contains(participant.TargetId)))) ||
            await dbContext.TimelineChanges.AnyAsync(change =>
                change.TimelineEvent != null &&
                change.TimelineEvent.ProjectId == projectId &&
                ((change.TargetType.ToLower() == "structure" && change.TargetId == structureId) ||
                 (change.TargetType.ToLower() == "structurenode" && structureNodeIds.Contains(change.TargetId)) ||
                 (change.TargetType.ToLower() == "structureusage" && structureUsageIds.Contains(change.TargetId)) ||
                 (change.TargetType.ToLower() == "structureassignment" && structureAssignmentIds.Contains(change.TargetId))));
    }

    private async Task<bool> TargetHasTimelineReferences(int projectId, string targetType, int targetId) =>
        await dbContext.TimelineParticipants.AnyAsync(participant =>
            participant.TimelineEvent != null &&
            participant.TimelineEvent.ProjectId == projectId &&
            participant.TargetType.ToLower() == targetType.ToLower() &&
            participant.TargetId == targetId) ||
        await dbContext.TimelineChanges.AnyAsync(change =>
            change.TimelineEvent != null &&
            change.TimelineEvent.ProjectId == projectId &&
            change.TargetType.ToLower() == targetType.ToLower() &&
            change.TargetId == targetId);

    private async Task<Dictionary<int, int>> CountTimelineReferencesByStructure(
        int projectId,
        IReadOnlyCollection<int> structureIds)
    {
        var ids = structureIds.Distinct().ToArray();
        var counts = ids.ToDictionary(id => id, _ => 0);
        if (ids.Length == 0)
        {
            return counts;
        }

        void AddCounts(IEnumerable<(int StructureId, int Count)> items)
        {
            foreach (var (structureId, count) in items)
            {
                counts[structureId] = counts.GetValueOrDefault(structureId) + count;
            }
        }

        AddCounts((await dbContext.TimelineParticipants
            .Where(participant =>
                participant.TimelineEvent != null &&
                participant.TimelineEvent.ProjectId == projectId &&
                participant.TargetType.ToLower() == "structure" &&
                ids.Contains(participant.TargetId))
            .GroupBy(participant => participant.TargetId)
            .Select(group => new ValueTuple<int, int>(group.Key, group.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await dbContext.TimelineChanges
            .Where(change =>
                change.TimelineEvent != null &&
                change.TimelineEvent.ProjectId == projectId &&
                change.TargetType.ToLower() == "structure" &&
                ids.Contains(change.TargetId))
            .GroupBy(change => change.TargetId)
            .Select(group => new ValueTuple<int, int>(group.Key, group.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from participant in dbContext.TimelineParticipants
            join node in dbContext.StructureNodes on participant.TargetId equals node.Id
            where participant.TimelineEvent != null &&
                  participant.TimelineEvent.ProjectId == projectId &&
                  participant.TargetType.ToLower() == "structurenode" &&
                  ids.Contains(node.StructureId)
            group participant by node.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from change in dbContext.TimelineChanges
            join node in dbContext.StructureNodes on change.TargetId equals node.Id
            where change.TimelineEvent != null &&
                  change.TimelineEvent.ProjectId == projectId &&
                  change.TargetType.ToLower() == "structurenode" &&
                  ids.Contains(node.StructureId)
            group change by node.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from participant in dbContext.TimelineParticipants
            join usage in dbContext.StructureUsages on participant.TargetId equals usage.Id
            where participant.TimelineEvent != null &&
                  participant.TimelineEvent.ProjectId == projectId &&
                  participant.TargetType.ToLower() == "structureusage" &&
                  usage.ProjectId == projectId &&
                  ids.Contains(usage.StructureId)
            group participant by usage.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from change in dbContext.TimelineChanges
            join usage in dbContext.StructureUsages on change.TargetId equals usage.Id
            where change.TimelineEvent != null &&
                  change.TimelineEvent.ProjectId == projectId &&
                  change.TargetType.ToLower() == "structureusage" &&
                  usage.ProjectId == projectId &&
                  ids.Contains(usage.StructureId)
            group change by usage.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from participant in dbContext.TimelineParticipants
            join assignment in dbContext.StructureAssignments on participant.TargetId equals assignment.Id
            join usage in dbContext.StructureUsages on assignment.StructureUsageId equals usage.Id
            where participant.TimelineEvent != null &&
                  participant.TimelineEvent.ProjectId == projectId &&
                  participant.TargetType.ToLower() == "structureassignment" &&
                  assignment.ProjectId == projectId &&
                  ids.Contains(usage.StructureId)
            group participant by usage.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        AddCounts((await (
            from change in dbContext.TimelineChanges
            join assignment in dbContext.StructureAssignments on change.TargetId equals assignment.Id
            join usage in dbContext.StructureUsages on assignment.StructureUsageId equals usage.Id
            where change.TimelineEvent != null &&
                  change.TimelineEvent.ProjectId == projectId &&
                  change.TargetType.ToLower() == "structureassignment" &&
                  assignment.ProjectId == projectId &&
                  ids.Contains(usage.StructureId)
            group change by usage.StructureId into grouped
            select new ValueTuple<int, int>(grouped.Key, grouped.Count()))
            .ToListAsync())
            .Select(item => (item.Item1, item.Item2)));

        return counts;
    }
}
