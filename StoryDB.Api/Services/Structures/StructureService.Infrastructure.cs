using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    private void InvalidateRelationGraphCache(int projectId)
    {
        cacheSingleFlight.Remove(ProjectCacheKeys.RelationGraph(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.Catalogs(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.CatalogDetailsPrefix(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureSummaries(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.StructureDetailsPrefix(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureUsages(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureAssignments(projectId));
    }

    private async Task ReplaceStructureItems(Structure structure, StructureRequest request, DateTime now)
    {
        var nodesByClientId = request.Nodes.ToDictionary(node => node.ClientId.Trim());
        var savedNodesByClientId = new Dictionary<string, StructureNode>();

        foreach (var requestedNode in request.Nodes.OrderBy(node => node.LevelIndex).ThenBy(node => node.SortOrder))
        {
            var node = new StructureNode
            {
                StructureId = structure.Id,
                Name = requestedNode.Name.Trim(),
                Description = NormalizeOptionalText(requestedNode.Description),
                NodeType = NormalizeOptionalText(requestedNode.NodeType),
                Color = NormalizeOptionalText(requestedNode.Color),
                IconKey = NormalizeOptionalText(requestedNode.IconKey),
                LinkedCatalogEntryId = null,
                LinkedCatalogEntryGroupId = null,
                LevelIndex = requestedNode.LevelIndex,
                SortOrder = requestedNode.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.StructureNodes.Add(node);
            savedNodesByClientId[requestedNode.ClientId.Trim()] = node;
        }

        await dbContext.SaveChangesAsync();

        foreach (var requestedNode in request.Nodes.Where(node => !string.IsNullOrWhiteSpace(node.ParentClientId)))
        {
            var node = savedNodesByClientId[requestedNode.ClientId.Trim()];
            var parentKey = requestedNode.ParentClientId!.Trim();
            node.ParentNodeId = savedNodesByClientId[parentKey].Id;
        }

        foreach (var requestedEdge in request.Edges.Select((edge, index) => new { Edge = edge, Index = index }))
        {
            dbContext.StructureEdges.Add(new StructureEdge
            {
                StructureId = structure.Id,
                SourceNodeId = savedNodesByClientId[requestedEdge.Edge.SourceClientId.Trim()].Id,
                TargetNodeId = savedNodesByClientId[requestedEdge.Edge.TargetClientId.Trim()].Id,
                RelationType = requestedEdge.Edge.RelationType.Trim(),
                Description = NormalizeOptionalText(requestedEdge.Edge.Description),
                SortOrder = requestedEdge.Edge.SortOrder >= 0 ? requestedEdge.Edge.SortOrder : requestedEdge.Index,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task ClearPrimaryUsage(int projectId, string targetKind, int targetId, int? exceptUsageId = null)
    {
        var primaryUsages = await dbContext.StructureUsages
            .Where(usage =>
                usage.ProjectId == projectId &&
                usage.TargetKind == targetKind &&
                usage.TargetId == targetId &&
                usage.IsPrimary &&
                (exceptUsageId == null || usage.Id != exceptUsageId))
            .ToListAsync();

        foreach (var usage in primaryUsages)
        {
            usage.IsPrimary = false;
            usage.UpdatedAt = DateTime.UtcNow;
        }
    }

    private Task<bool> ProjectExists(int projectId) =>
        dbContext.Projects.AnyAsync(project => project.Id == projectId);

    private Task<bool> StructureExists(int projectId, int structureId) =>
        dbContext.Structures.AnyAsync(structure =>
            structure.ProjectId == projectId &&
            structure.Id == structureId);

    private Task<bool> StructureHasAssignments(int projectId, int structureId) =>
        dbContext.StructureAssignments.AnyAsync(assignment =>
            assignment.ProjectId == projectId &&
            assignment.StructureUsage!.StructureId == structureId);

    private Task<bool> CatalogExists(int projectId, int catalogId) =>
        dbContext.Catalogs.AnyAsync(catalog =>
            catalog.ProjectId == projectId &&
            catalog.Id == catalogId);

    private async Task<bool> CatalogEntriesExist(int catalogId, IReadOnlyList<int> entryIds)
    {
        var count = await dbContext.CatalogEntries.CountAsync(entry =>
            entry.CatalogId == catalogId &&
            entryIds.Contains(entry.Id));

        return count == entryIds.Count;
    }

    private async Task<bool> CatalogEntryGroupsExist(int catalogId, IReadOnlyList<int> groupIds)
    {
        var count = await dbContext.CatalogEntryGroups.CountAsync(group =>
            group.CatalogId == catalogId &&
            groupIds.Contains(group.Id));

        return count == groupIds.Count;
    }

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

    private static int? NormalizeOwnerId(string ownerKind, int? ownerId) =>
        ownerKind.Trim() == "project" ? null : ownerId;

    private static int NormalizeUsageTargetId(string targetKind, int targetId) => targetId;

    private static string NormalizeApplicationScope(string? applicationScope) =>
        string.IsNullOrWhiteSpace(applicationScope) ? "characters" : applicationScope.Trim();

    private static StructureAssignmentTarget NormalizeAssignmentTarget(StructureAssignmentRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.TargetKind) && request.TargetId is not null)
        {
            var targetKind = request.TargetKind.Trim();
            var targetId = request.TargetId.Value;
            return new StructureAssignmentTarget(
                targetKind,
                targetId,
                targetKind == "storyObject" ? targetId : null);
        }

        var storyObjectId = request.StoryObjectId ?? 0;
        return new StructureAssignmentTarget("storyObject", storyObjectId, storyObjectId > 0 ? storyObjectId : null);
    }

    private static string? GetStructureApplicationScopeForObjectType(string objectTypeKey) =>
        objectTypeKey switch
        {
            "characters" => "characters",
            "items" => "items",
            "places" => "locations",
            "organizations" => "organizations",
            _ => null,
        };

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

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

