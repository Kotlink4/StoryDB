using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    private Task<StructureDto> GetCachedStructureDto(int projectId, int structureId) =>
        cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.StructureDetail(projectId, structureId),
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = StructureReadCacheDuration;
                return await GetStructureDto(structureId);
            });

    private async Task<StructureDto> GetStructureDto(int structureId)
    {
        var structure = await dbContext.Structures
            .AsNoTracking()
            .Where(currentStructure => currentStructure.Id == structureId)
            .Select(currentStructure => new StructureDto(
                currentStructure.Id,
                currentStructure.ProjectId,
                currentStructure.Name,
                currentStructure.Description,
                currentStructure.OwnerKind,
                currentStructure.OwnerId,
                currentStructure.ApplicationScope,
                currentStructure.LayoutKind,
                "none",
                "manual",
                null,
                0,
                currentStructure.Nodes
                    .OrderBy(node => node.LevelIndex)
                    .ThenBy(node => node.SortOrder)
                    .ThenBy(node => node.Id)
                    .Select(node => new StructureNodeDto(
                        node.Id,
                        node.ParentNodeId,
                        null,
                        null,
                        node.Name,
                        node.Description,
                        node.NodeType,
                        node.Color,
                        node.IconKey,
                        node.LevelIndex,
                        node.SortOrder))
                    .ToList(),
                currentStructure.Edges
                    .OrderBy(edge => edge.SortOrder)
                    .ThenBy(edge => edge.Id)
                    .Select(edge => new StructureEdgeDto(
                        edge.Id,
                        edge.SourceNodeId,
                        edge.TargetNodeId,
                        edge.RelationType,
                        edge.Description,
                        edge.SortOrder))
                    .ToList()))
            .FirstAsync();

        var timelineReferenceCounts = await CountTimelineReferencesByStructure(structure.ProjectId, [structure.Id]);
        return structure with
        {
            TimelineReferenceCount = timelineReferenceCounts.GetValueOrDefault(structure.Id),
        };
    }

    private static StructureNodeDto ToStructureNodeDto(StructureNode node) =>
        new(
            node.Id,
            node.ParentNodeId,
            null,
            null,
            node.Name,
            node.Description,
            node.NodeType,
            node.Color,
            node.IconKey,
            node.LevelIndex,
            node.SortOrder);

    private async Task<StructureUsageDto> GetStructureUsageDto(int usageId)
    {
        var usage = await dbContext.StructureUsages
            .AsNoTracking()
            .Where(currentUsage => currentUsage.Id == usageId)
            .Select(currentUsage => new StructureUsageDto(
                currentUsage.Id,
                currentUsage.ProjectId,
                currentUsage.StructureId,
                currentUsage.Structure!.Name,
                currentUsage.TargetKind,
                currentUsage.TargetId,
                currentUsage.DisplayName,
                currentUsage.Notes,
                currentUsage.IsPrimary))
            .FirstAsync();

        return usage;
    }

    private async Task<string> BuildIndividualStructureName(
        int projectId,
        StructureUsage usage,
        string sourceStructureName)
    {
        var targetName = usage.TargetKind switch
        {
            "object" => await dbContext.Objects
                .Where(storyObject => storyObject.ProjectId == projectId && storyObject.Id == usage.TargetId)
                .Select(storyObject => storyObject.Name)
                .FirstOrDefaultAsync(),
            "catalog" => await dbContext.Catalogs
                .Where(catalog => catalog.ProjectId == projectId && catalog.Id == usage.TargetId)
                .Select(catalog => catalog.Name)
                .FirstOrDefaultAsync(),
            _ => null,
        };

        var suffix = string.IsNullOrWhiteSpace(targetName) ? "individual" : targetName.Trim();
        var baseName = $"{sourceStructureName} - {suffix}";
        if (baseName.Length <= 160)
        {
            return baseName;
        }

        var maxSuffixLength = Math.Max(1, 157 - sourceStructureName.Length);
        var shortSuffix = suffix.Length <= maxSuffixLength ? suffix : suffix[..maxSuffixLength];
        return $"{sourceStructureName} - {shortSuffix}"[..160];
    }

    private async Task<StructureAssignmentDto> GetStructureAssignmentDto(int assignmentId)
    {
        var assignment = await dbContext.StructureAssignments
            .AsNoTracking()
            .Include(currentAssignment => currentAssignment.StructureUsage)
                .ThenInclude(usage => usage!.Structure)
            .Include(currentAssignment => currentAssignment.StructureNode)
            .Include(currentAssignment => currentAssignment.StoryObject)
                .ThenInclude(storyObject => storyObject!.ObjectType)
            .Where(currentAssignment => currentAssignment.Id == assignmentId)
            .FirstAsync();

        var catalogEntriesById = assignment.TargetKind == "catalogEntry"
            ? await dbContext.CatalogEntries
                .AsNoTracking()
                .Include(entry => entry.Catalog)
                .Where(entry => entry.Id == assignment.TargetId)
                .ToDictionaryAsync(entry => entry.Id)
            : new Dictionary<int, CatalogEntry>();

        return ToStructureAssignmentDto(assignment, catalogEntriesById);
    }

    private static StructureAssignmentDto ToStructureAssignmentDto(
        StructureAssignment assignment,
        IReadOnlyDictionary<int, CatalogEntry> catalogEntriesById)
    {
        var storyObjectName = assignment.StoryObject?.Name;
        var storyObjectTypeKey = assignment.StoryObject?.ObjectType?.Key;
        var catalogEntry = assignment.TargetKind == "catalogEntry"
            ? catalogEntriesById.GetValueOrDefault(assignment.TargetId)
            : null;
        var targetName = assignment.TargetKind == "catalogEntry"
            ? catalogEntry?.Name ?? $"#{assignment.TargetId}"
            : storyObjectName ?? $"#{assignment.TargetId}";
        var targetTypeKey = assignment.TargetKind == "catalogEntry"
            ? "catalogEntry"
            : storyObjectTypeKey ?? "storyObject";

        return new StructureAssignmentDto(
            assignment.Id,
            assignment.ProjectId,
            assignment.StructureUsageId,
            assignment.StructureUsage!.StructureId,
            assignment.StructureUsage.Structure!.Name,
            assignment.StructureNodeId,
            assignment.StructureNode!.Name,
            assignment.TargetKind,
            assignment.TargetId,
            targetName,
            targetTypeKey,
            assignment.StoryObjectId,
            storyObjectName,
            storyObjectTypeKey,
            assignment.RoleLabel,
            assignment.Notes,
            assignment.SortOrder);
    }
}
