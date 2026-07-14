using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    public async Task<StructureServiceResult<IReadOnlyList<StructureUsageDto>>> GetStructureUsagesAsync(
        int projectId,
        string? targetKind,
        int? targetId,
        int? structureId)
    {
        if (!await ProjectExists(projectId))
        {
            return StructureServiceResult<IReadOnlyList<StructureUsageDto>>.NotFound();
        }

        var normalizedTargetKind = NormalizeOptionalText(targetKind);
        var query = dbContext.StructureUsages
            .AsNoTracking()
            .Where(usage => usage.ProjectId == projectId);

        if (normalizedTargetKind is not null)
        {
            query = query.Where(usage => usage.TargetKind == normalizedTargetKind);
        }

        if (targetId is not null)
        {
            query = query.Where(usage => usage.TargetId == targetId);
        }

        if (structureId is not null)
        {
            query = query.Where(usage => usage.StructureId == structureId);
        }

        var usages = normalizedTargetKind is null && targetId is null && structureId is null
            ? await cacheSingleFlight.GetOrCreateAsync(
                ProjectCacheKeys.StructureUsages(projectId),
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = StructureReadCacheDuration;
                    return await ReadStructureUsagesAsync(query);
                })
            : await ReadStructureUsagesAsync(query);

        return StructureServiceResult<IReadOnlyList<StructureUsageDto>>.Success(usages);
    }

    public async Task<StructureServiceResult<StructureUsageDto>> AssignStructureAsync(
        int projectId,
        int structureId,
        StructureUsageRequest request)
    {
        if (!await StructureExists(projectId, structureId))
        {
            return StructureServiceResult<StructureUsageDto>.NotFound();
        }

        var validationError = await ValidateStructureUsageRequest(projectId, request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureUsageDto>.Invalid(validationError);
        }

        var targetKind = request.TargetKind.Trim();
        var targetId = NormalizeUsageTargetId(targetKind, request.TargetId);
        var existingUsage = await dbContext.StructureUsages.FirstOrDefaultAsync(usage =>
            usage.ProjectId == projectId &&
            usage.StructureId == structureId &&
            usage.TargetKind == targetKind &&
            usage.TargetId == targetId);
        if (existingUsage is not null)
        {
            return StructureServiceResult<StructureUsageDto>.Invalid("Structure is already assigned to this target.");
        }

        var now = DateTime.UtcNow;
        if (request.IsPrimary)
        {
            await ClearPrimaryUsage(projectId, targetKind, targetId);
        }

        var usage = new StructureUsage
        {
            ProjectId = projectId,
            StructureId = structureId,
            TargetKind = targetKind,
            TargetId = targetId,
            DisplayName = NormalizeOptionalText(request.DisplayName),
            Notes = NormalizeOptionalText(request.Notes),
            IsPrimary = request.IsPrimary,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.StructureUsages.Add(usage);
        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureUsageDto>.Success(await GetStructureUsageDto(usage.Id));
    }

    private static Task<List<StructureUsageDto>> ReadStructureUsagesAsync(IQueryable<StructureUsage> query) =>
        query
            .OrderByDescending(usage => usage.IsPrimary)
            .ThenBy(usage => usage.Structure!.Name)
            .Select(usage => new StructureUsageDto(
                usage.Id,
                usage.ProjectId,
                usage.StructureId,
                usage.Structure!.Name,
                usage.TargetKind,
                usage.TargetId,
                usage.DisplayName,
                usage.Notes,
                usage.IsPrimary))
            .ToListAsync();

    public async Task<StructureServiceResult<StructureUsageDto>> UpdateStructureUsageAsync(
        int projectId,
        int usageId,
        StructureUsageRequest request)
    {
        var usage = await dbContext.StructureUsages
            .FirstOrDefaultAsync(currentUsage =>
                currentUsage.ProjectId == projectId &&
                currentUsage.Id == usageId);
        if (usage is null)
        {
            return StructureServiceResult<StructureUsageDto>.NotFound();
        }

        var validationError = await ValidateStructureUsageRequest(projectId, request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureUsageDto>.Invalid(validationError);
        }

        var targetKind = request.TargetKind.Trim();
        var targetId = NormalizeUsageTargetId(targetKind, request.TargetId);
        var duplicateUsage = await dbContext.StructureUsages.AnyAsync(currentUsage =>
            currentUsage.ProjectId == projectId &&
            currentUsage.Id != usageId &&
            currentUsage.StructureId == usage.StructureId &&
            currentUsage.TargetKind == targetKind &&
            currentUsage.TargetId == targetId);
        if (duplicateUsage)
        {
            return StructureServiceResult<StructureUsageDto>.Invalid("Structure is already assigned to this target.");
        }

        if (request.IsPrimary)
        {
            await ClearPrimaryUsage(projectId, targetKind, targetId, usageId);
        }

        usage.TargetKind = targetKind;
        usage.TargetId = targetId;
        usage.DisplayName = NormalizeOptionalText(request.DisplayName);
        usage.Notes = NormalizeOptionalText(request.Notes);
        usage.IsPrimary = request.IsPrimary;
        usage.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureUsageDto>.Success(await GetStructureUsageDto(usage.Id));
    }

    public async Task<StructureServiceResult<StructureUsageDto>> MakeStructureUsageIndividualAsync(
        int projectId,
        int usageId)
    {
        var usage = await dbContext.StructureUsages
            .Include(currentUsage => currentUsage.Structure)
                .ThenInclude(structure => structure!.Nodes)
            .Include(currentUsage => currentUsage.Structure)
                .ThenInclude(structure => structure!.Edges)
            .FirstOrDefaultAsync(currentUsage =>
                currentUsage.ProjectId == projectId &&
                currentUsage.Id == usageId);
        if (usage?.Structure is null)
        {
            return StructureServiceResult<StructureUsageDto>.NotFound();
        }

        var now = DateTime.UtcNow;
        var sourceStructure = usage.Structure;
        var individualStructure = new Structure
        {
            ProjectId = projectId,
            Name = await BuildIndividualStructureName(projectId, usage, sourceStructure.Name),
            Description = sourceStructure.Description,
            OwnerKind = usage.TargetKind,
            OwnerId = usage.TargetKind == "project" ? null : usage.TargetId,
            ApplicationScope = sourceStructure.ApplicationScope,
            LayoutKind = sourceStructure.LayoutKind,
            NodeBindingMode = "none",
            CatalogSyncMode = "manual",
            LinkedCatalogId = null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Structures.Add(individualStructure);
        await dbContext.SaveChangesAsync();

        var nodesBySourceId = new Dictionary<int, StructureNode>();
        foreach (var sourceNode in sourceStructure.Nodes.OrderBy(node => node.LevelIndex).ThenBy(node => node.SortOrder))
        {
            var copiedNode = new StructureNode
            {
                StructureId = individualStructure.Id,
                LinkedCatalogEntryId = null,
                LinkedCatalogEntryGroupId = null,
                Name = sourceNode.Name,
                Description = sourceNode.Description,
                NodeType = sourceNode.NodeType,
                Color = sourceNode.Color,
                IconKey = sourceNode.IconKey,
                LevelIndex = sourceNode.LevelIndex,
                SortOrder = sourceNode.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.StructureNodes.Add(copiedNode);
            nodesBySourceId[sourceNode.Id] = copiedNode;
        }

        await dbContext.SaveChangesAsync();

        foreach (var sourceNode in sourceStructure.Nodes.Where(node => node.ParentNodeId is not null))
        {
            var copiedNode = nodesBySourceId[sourceNode.Id];
            copiedNode.ParentNodeId = nodesBySourceId[sourceNode.ParentNodeId!.Value].Id;
        }

        foreach (var sourceEdge in sourceStructure.Edges.OrderBy(edge => edge.SortOrder))
        {
            dbContext.StructureEdges.Add(new StructureEdge
            {
                StructureId = individualStructure.Id,
                SourceNodeId = nodesBySourceId[sourceEdge.SourceNodeId].Id,
                TargetNodeId = nodesBySourceId[sourceEdge.TargetNodeId].Id,
                RelationType = sourceEdge.RelationType,
                Description = sourceEdge.Description,
                SortOrder = sourceEdge.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        var assignments = await dbContext.StructureAssignments
            .Where(assignment =>
                assignment.ProjectId == projectId &&
                assignment.StructureUsageId == usageId)
            .ToListAsync();
        foreach (var assignment in assignments)
        {
            assignment.StructureNodeId = nodesBySourceId[assignment.StructureNodeId].Id;
            assignment.UpdatedAt = now;
        }

        usage.StructureId = individualStructure.Id;
        usage.UpdatedAt = now;

        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureUsageDto>.Success(await GetStructureUsageDto(usage.Id));
    }

    public async Task<StructureServiceResult> DeleteStructureUsageAsync(int projectId, int usageId)
    {
        var usage = await dbContext.StructureUsages.FirstOrDefaultAsync(currentUsage =>
            currentUsage.ProjectId == projectId &&
            currentUsage.Id == usageId);
        if (usage is null)
        {
            return StructureServiceResult.NotFound();
        }

        if (await dbContext.StructureAssignments.AnyAsync(assignment =>
            assignment.ProjectId == projectId &&
            assignment.StructureUsageId == usageId))
        {
            return StructureServiceResult.Invalid(
                "Structure usage has object assignments. Remove assignments before disconnecting the structure.");
        }

        if (await TargetHasTimelineReferences(projectId, "structureUsage", usageId))
        {
            return StructureServiceResult.Invalid(
                "Structure usage is referenced by timeline events and cannot be disconnected.");
        }

        dbContext.StructureUsages.Remove(usage);
        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult.Success();
    }
}

