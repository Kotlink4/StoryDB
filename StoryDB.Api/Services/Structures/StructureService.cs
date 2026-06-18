using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Structures;

public sealed class StructureService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IStructureService
{
    private static readonly TimeSpan StructureReadCacheDuration = TimeSpan.FromSeconds(15);
    private static readonly HashSet<string> SupportedOwnerKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedUsageTargetKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedLayoutKinds = ["levels", "tree", "graph"];
    private static readonly HashSet<string> SupportedNodeBindingModes = ["none", "catalogEntry", "catalogEntryGroup", "mixed"];
    private static readonly HashSet<string> SupportedCatalogSyncModes = ["manual", "catalogEntries", "catalogGroups", "catalogTree"];
    private const string CatalogSourceEntry = "entry";
    private const string CatalogSourceGroup = "group";

    public async Task<StructureServiceResult<IReadOnlyList<StructureSummaryDto>>> GetStructuresAsync(
        int projectId,
        string? ownerKind,
        int? ownerId)
    {
        if (!await ProjectExists(projectId))
        {
            return StructureServiceResult<IReadOnlyList<StructureSummaryDto>>.NotFound();
        }

        var normalizedOwnerKind = NormalizeOptionalText(ownerKind);
        var query = dbContext.Structures
            .AsNoTracking()
            .Where(structure => structure.ProjectId == projectId);

        if (normalizedOwnerKind is not null)
        {
            query = query.Where(structure => structure.OwnerKind == normalizedOwnerKind);
        }

        if (ownerId is not null)
        {
            query = query.Where(structure => structure.OwnerId == ownerId);
        }

        var structures = normalizedOwnerKind is null && ownerId is null
            ? await cacheSingleFlight.GetOrCreateAsync(
                ProjectCacheKeys.StructureSummaries(projectId),
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = StructureReadCacheDuration;
                    return await ReadStructureSummariesAsync(query);
                })
            : await ReadStructureSummariesAsync(query);

        return StructureServiceResult<IReadOnlyList<StructureSummaryDto>>.Success(structures);
    }

    public async Task<StructureServiceResult<StructureDto>> GetStructureAsync(int projectId, int structureId)
    {
        if (!await StructureExists(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.NotFound();
        }

        return StructureServiceResult<StructureDto>.Success(await GetCachedStructureDto(projectId, structureId));
    }

    private async Task<List<StructureSummaryDto>> ReadStructureSummariesAsync(IQueryable<Structure> query)
    {
        var summaries = await query
            .OrderBy(structure => structure.Name)
            .Select(structure => new StructureSummaryDto(
                structure.Id,
                structure.ProjectId,
                structure.Name,
                structure.Description,
                structure.OwnerKind,
                structure.OwnerId,
                structure.LayoutKind,
                structure.NodeBindingMode,
                structure.CatalogSyncMode,
                structure.LinkedCatalogId,
                structure.Nodes.Count,
                structure.Edges.Count,
                structure.Usages.Count,
                0))
            .ToListAsync();

        if (summaries.Count == 0)
        {
            return summaries;
        }

        var counts = await CountTimelineReferencesByStructure(
            summaries[0].ProjectId,
            summaries.Select(summary => summary.Id).ToArray());

        return summaries
            .Select(summary => summary with
            {
                TimelineReferenceCount = counts.GetValueOrDefault(summary.Id),
            })
            .ToList();
    }

    public async Task<StructureServiceResult<StructureDto>> CreateStructureAsync(int projectId, StructureRequest request)
    {
        var validationError = await ValidateStructureRequest(projectId, request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureDto>.Invalid(validationError);
        }

        var now = DateTime.UtcNow;
        var structure = new Structure
        {
            ProjectId = projectId,
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            OwnerKind = request.OwnerKind.Trim(),
            OwnerId = NormalizeOwnerId(request.OwnerKind, request.OwnerId),
            LayoutKind = request.LayoutKind.Trim(),
            NodeBindingMode = request.NodeBindingMode.Trim(),
            CatalogSyncMode = NormalizeCatalogSyncMode(request.CatalogSyncMode),
            LinkedCatalogId = request.LinkedCatalogId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Structures.Add(structure);
        await dbContext.SaveChangesAsync();
        await ReplaceStructureItems(structure, request, now);
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structure.Id));
    }

    public async Task<StructureServiceResult<StructureDto>> UpdateStructureAsync(
        int projectId,
        int structureId,
        StructureRequest request)
    {
        var structure = await dbContext.Structures
            .Include(currentStructure => currentStructure.Nodes)
            .Include(currentStructure => currentStructure.Edges)
            .FirstOrDefaultAsync(currentStructure =>
                currentStructure.ProjectId == projectId &&
                currentStructure.Id == structureId);
        if (structure is null)
        {
            return StructureServiceResult<StructureDto>.NotFound();
        }

        var validationError = await ValidateStructureRequest(projectId, request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureDto>.Invalid(validationError);
        }

        if (await StructureHasAssignments(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.Invalid(
                "Structure has object assignments. Remove assignments before editing the structure.");
        }

        if (await StructureHasTimelineReferences(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.Invalid(
                "Structure is referenced by timeline events. Remove timeline references before editing the structure topology.");
        }

        var now = DateTime.UtcNow;
        structure.Name = request.Name.Trim();
        structure.Description = NormalizeOptionalText(request.Description);
        structure.OwnerKind = request.OwnerKind.Trim();
        structure.OwnerId = NormalizeOwnerId(request.OwnerKind, request.OwnerId);
        structure.LayoutKind = request.LayoutKind.Trim();
        structure.NodeBindingMode = request.NodeBindingMode.Trim();
        structure.CatalogSyncMode = NormalizeCatalogSyncMode(request.CatalogSyncMode);
        structure.LinkedCatalogId = request.LinkedCatalogId;
        structure.UpdatedAt = now;

        dbContext.StructureEdges.RemoveRange(structure.Edges);
        dbContext.StructureNodes.RemoveRange(structure.Nodes);
        await dbContext.SaveChangesAsync();
        await ReplaceStructureItems(structure, request, now);
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structure.Id));
    }

    public async Task<StructureServiceResult<StructureDto>> UpdateStructureDetailsAsync(
        int projectId,
        int structureId,
        StructureDetailsRequest request)
    {
        var structure = await dbContext.Structures.FirstOrDefaultAsync(currentStructure =>
            currentStructure.ProjectId == projectId &&
            currentStructure.Id == structureId);
        if (structure is null)
        {
            return StructureServiceResult<StructureDto>.NotFound();
        }

        var validationError = ValidateStructureDetailsRequest(request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureDto>.Invalid(validationError);
        }

        structure.Name = request.Name.Trim();
        structure.Description = NormalizeOptionalText(request.Description);
        structure.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structure.Id));
    }

    public async Task<StructureServiceResult<StructureNodeDto>> UpdateStructureNodeDetailsAsync(
        int projectId,
        int structureId,
        int nodeId,
        StructureNodeDetailsRequest request)
    {
        var node = await dbContext.StructureNodes
            .Include(currentNode => currentNode.Structure)
            .FirstOrDefaultAsync(currentNode =>
                currentNode.Id == nodeId &&
                currentNode.StructureId == structureId &&
                currentNode.Structure != null &&
                currentNode.Structure.ProjectId == projectId);
        if (node is null)
        {
            return StructureServiceResult<StructureNodeDto>.NotFound();
        }

        var validationError = ValidateStructureNodeDetailsRequest(request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureNodeDto>.Invalid(validationError);
        }

        node.Name = request.Name.Trim();
        node.Description = NormalizeOptionalText(request.Description);
        node.NodeType = NormalizeOptionalText(request.NodeType);
        node.Color = NormalizeOptionalText(request.Color);
        node.IconKey = NormalizeOptionalText(request.IconKey);
        node.UpdatedAt = DateTime.UtcNow;
        node.Structure!.UpdatedAt = node.UpdatedAt;

        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureNodeDto>.Success(ToStructureNodeDto(node));
    }

    public async Task<StructureServiceResult> DeleteStructureAsync(int projectId, int structureId)
    {
        var structure = await dbContext.Structures
            .FirstOrDefaultAsync(currentStructure =>
                currentStructure.ProjectId == projectId &&
                currentStructure.Id == structureId);
        if (structure is null)
        {
            return StructureServiceResult.NotFound();
        }

        if (await dbContext.StructureUsages.AnyAsync(usage =>
            usage.ProjectId == projectId &&
            usage.StructureId == structureId))
        {
            return StructureServiceResult.Invalid("Structure is used by one or more targets and cannot be deleted.");
        }

        if (await StructureHasTimelineReferences(projectId, structureId))
        {
            return StructureServiceResult.Invalid(
                "Structure is referenced by timeline events and cannot be deleted.");
        }

        dbContext.Structures.Remove(structure);
        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult.Success();
    }

    public async Task<StructureServiceResult<StructureCatalogSyncPreviewDto>> PreviewCatalogSyncAsync(
        int projectId,
        int structureId)
    {
        var structure = await LoadStructureForCatalogSync(projectId, structureId);
        if (structure is null)
        {
            return StructureServiceResult<StructureCatalogSyncPreviewDto>.NotFound();
        }

        var validationError = ValidateCatalogSyncRequest(structure);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureCatalogSyncPreviewDto>.Invalid(validationError);
        }

        return StructureServiceResult<StructureCatalogSyncPreviewDto>.Success(await BuildCatalogSyncPreview(structure));
    }

    public async Task<StructureServiceResult<StructureCatalogSyncResultDto>> ApplyCatalogSyncAsync(
        int projectId,
        int structureId)
    {
        var structure = await LoadStructureForCatalogSync(projectId, structureId);
        if (structure is null)
        {
            return StructureServiceResult<StructureCatalogSyncResultDto>.NotFound();
        }

        var validationError = ValidateCatalogSyncRequest(structure);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureCatalogSyncResultDto>.Invalid(validationError);
        }

        var preview = await BuildCatalogSyncPreview(structure);
        var missingNodes = preview.Nodes
            .Where(node => node.Action == "create")
            .OrderBy(node => node.LevelIndex)
            .ThenBy(node => node.SortOrder)
            .ThenBy(node => node.Name)
            .ToList();

        if (missingNodes.Count == 0)
        {
            return StructureServiceResult<StructureCatalogSyncResultDto>.Success(
                new StructureCatalogSyncResultDto(structure.Id, 0, await GetStructureDto(structure.Id)));
        }

        var now = DateTime.UtcNow;
        var createdNodesBySource = new Dictionary<(string SourceKind, int SourceId), StructureNode>();
        foreach (var missingNode in missingNodes)
        {
            var node = new StructureNode
            {
                StructureId = structure.Id,
                LinkedCatalogEntryId = missingNode.SourceKind == CatalogSourceEntry ? missingNode.SourceId : null,
                LinkedCatalogEntryGroupId = missingNode.SourceKind == CatalogSourceGroup ? missingNode.SourceId : null,
                Name = missingNode.Name,
                Description = NormalizeOptionalText(missingNode.Description),
                NodeType = missingNode.SourceKind == CatalogSourceEntry ? "catalogEntry" : "catalogGroup",
                LevelIndex = missingNode.LevelIndex,
                SortOrder = missingNode.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.StructureNodes.Add(node);
            createdNodesBySource[(missingNode.SourceKind, missingNode.SourceId)] = node;
        }

        await dbContext.SaveChangesAsync();

        var existingNodesBySource = preview.Nodes
            .Where(node => node.ExistingNodeId is not null)
            .ToDictionary(
                node => (node.SourceKind, node.SourceId),
                node => node.ExistingNodeId!.Value);

        foreach (var missingNode in missingNodes.Where(node => node.ParentSourceKind is not null && node.ParentSourceId is not null))
        {
            var node = createdNodesBySource[(missingNode.SourceKind, missingNode.SourceId)];
            var parentKey = (missingNode.ParentSourceKind!, missingNode.ParentSourceId!.Value);
            if (createdNodesBySource.TryGetValue(parentKey, out var createdParent))
            {
                node.ParentNodeId = createdParent.Id;
            }
            else if (existingNodesBySource.TryGetValue(parentKey, out var existingParentId))
            {
                node.ParentNodeId = existingParentId;
            }
        }

        structure.UpdatedAt = now;
        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureCatalogSyncResultDto>.Success(
            new StructureCatalogSyncResultDto(structure.Id, missingNodes.Count, await GetStructureDto(structure.Id)));
    }

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
        InvalidateRelationGraphCache(projectId);

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
        InvalidateRelationGraphCache(projectId);

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
            LayoutKind = sourceStructure.LayoutKind,
            NodeBindingMode = sourceStructure.NodeBindingMode,
            CatalogSyncMode = sourceStructure.CatalogSyncMode,
            LinkedCatalogId = sourceStructure.LinkedCatalogId,
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
                LinkedCatalogEntryId = sourceNode.LinkedCatalogEntryId,
                LinkedCatalogEntryGroupId = sourceNode.LinkedCatalogEntryGroupId,
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
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureUsageDto>.Success(await GetStructureUsageDto(usage.Id));
    }

    public async Task<StructureServiceResult<StructureCatalogAssignmentSyncPreviewDto>> PreviewCatalogAssignmentSyncAsync(
        int projectId,
        int usageId)
    {
        var usage = await LoadUsageForCatalogAssignmentSync(projectId, usageId);
        if (usage?.Structure is null)
        {
            return StructureServiceResult<StructureCatalogAssignmentSyncPreviewDto>.NotFound();
        }

        var validationError = ValidateCatalogAssignmentSyncRequest(usage);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureCatalogAssignmentSyncPreviewDto>.Invalid(validationError);
        }

        return StructureServiceResult<StructureCatalogAssignmentSyncPreviewDto>.Success(
            await BuildCatalogAssignmentSyncPreview(projectId, usage));
    }

    public async Task<StructureServiceResult<StructureCatalogAssignmentSyncResultDto>> ApplyCatalogAssignmentSyncAsync(
        int projectId,
        int usageId)
    {
        var usage = await LoadUsageForCatalogAssignmentSync(projectId, usageId);
        if (usage?.Structure is null)
        {
            return StructureServiceResult<StructureCatalogAssignmentSyncResultDto>.NotFound();
        }

        var validationError = ValidateCatalogAssignmentSyncRequest(usage);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureCatalogAssignmentSyncResultDto>.Invalid(validationError);
        }

        var preview = await BuildCatalogAssignmentSyncPreview(projectId, usage);
        var missingItems = preview.Items
            .Where(item => item.Action == "create")
            .OrderBy(item => item.StructureNodeName)
            .ThenBy(item => item.StoryObjectName)
            .ToList();

        if (missingItems.Count > 0)
        {
            var now = DateTime.UtcNow;
            var nextSortOrder = (await dbContext.StructureAssignments
                .Where(assignment =>
                    assignment.ProjectId == projectId &&
                    assignment.StructureUsageId == usage.Id)
                .Select(assignment => (int?)assignment.SortOrder)
                .MaxAsync() ?? -1) + 1;

            foreach (var item in missingItems)
            {
                dbContext.StructureAssignments.Add(new StructureAssignment
                {
                    ProjectId = projectId,
                    StructureUsageId = usage.Id,
                    StructureNodeId = item.StructureNodeId,
                    StoryObjectId = item.StoryObjectId,
                    SortOrder = nextSortOrder++,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            usage.UpdatedAt = now;
            await dbContext.SaveChangesAsync();
            InvalidateRelationGraphCache(projectId);
        }

        var assignments = await ReadStructureAssignmentsAsync(dbContext.StructureAssignments
            .AsNoTracking()
            .Where(assignment =>
                assignment.ProjectId == projectId &&
                assignment.StructureUsageId == usage.Id));

        return StructureServiceResult<StructureCatalogAssignmentSyncResultDto>.Success(
            new StructureCatalogAssignmentSyncResultDto(usage.Id, missingItems.Count, assignments));
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
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult.Success();
    }

    public async Task<StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>> GetStructureAssignmentsAsync(
        int projectId,
        int? structureUsageId,
        int? structureId,
        int? structureNodeId,
        int? storyObjectId)
    {
        if (!await ProjectExists(projectId))
        {
            return StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>.NotFound();
        }

        var query = dbContext.StructureAssignments
            .AsNoTracking()
            .Where(assignment => assignment.ProjectId == projectId);

        if (structureUsageId is not null)
        {
            query = query.Where(assignment => assignment.StructureUsageId == structureUsageId);
        }

        if (structureId is not null)
        {
            query = query.Where(assignment => assignment.StructureUsage!.StructureId == structureId);
        }

        if (structureNodeId is not null)
        {
            query = query.Where(assignment => assignment.StructureNodeId == structureNodeId);
        }

        if (storyObjectId is not null)
        {
            query = query.Where(assignment => assignment.StoryObjectId == storyObjectId);
        }

        var assignments =
            structureUsageId is null &&
            structureId is null &&
            structureNodeId is null &&
            storyObjectId is null
                ? await cacheSingleFlight.GetOrCreateAsync(
                    ProjectCacheKeys.StructureAssignments(projectId),
                    async entry =>
                    {
                        entry.AbsoluteExpirationRelativeToNow = StructureReadCacheDuration;
                        return await ReadStructureAssignmentsAsync(query);
                    })
                : await ReadStructureAssignmentsAsync(query);

        return StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>.Success(assignments);
    }

    private static Task<List<StructureAssignmentDto>> ReadStructureAssignmentsAsync(IQueryable<StructureAssignment> query) =>
        query
            .OrderBy(assignment => assignment.StructureUsage!.Structure!.Name)
            .ThenBy(assignment => assignment.StructureNode!.LevelIndex)
            .ThenBy(assignment => assignment.StructureNode!.SortOrder)
            .ThenBy(assignment => assignment.SortOrder)
            .Select(assignment => new StructureAssignmentDto(
                assignment.Id,
                assignment.ProjectId,
                assignment.StructureUsageId,
                assignment.StructureUsage!.StructureId,
                assignment.StructureUsage.Structure!.Name,
                assignment.StructureNodeId,
                assignment.StructureNode!.Name,
                assignment.StoryObjectId,
                assignment.StoryObject!.Name,
                assignment.StoryObject.ObjectType!.Key,
                assignment.RoleLabel,
                assignment.Notes,
                assignment.SortOrder))
            .ToListAsync();

    public async Task<StructureServiceResult<StructureAssignmentDto>> AssignObjectToStructureAsync(
        int projectId,
        int usageId,
        StructureAssignmentRequest request)
    {
        var usage = await dbContext.StructureUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(currentUsage =>
                currentUsage.ProjectId == projectId &&
                currentUsage.Id == usageId);
        if (usage is null)
        {
            return StructureServiceResult<StructureAssignmentDto>.NotFound();
        }

        var validationError = await ValidateStructureAssignmentRequest(projectId, usage.StructureId, request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid(validationError);
        }

        var existingAssignment = await dbContext.StructureAssignments.AnyAsync(assignment =>
            assignment.ProjectId == projectId &&
            assignment.StructureUsageId == usageId &&
            assignment.StructureNodeId == request.StructureNodeId &&
            assignment.StoryObjectId == request.StoryObjectId);
        if (existingAssignment)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid("Object is already assigned to this structure node.");
        }

        var now = DateTime.UtcNow;
        var assignment = new StructureAssignment
        {
            ProjectId = projectId,
            StructureUsageId = usageId,
            StructureNodeId = request.StructureNodeId,
            StoryObjectId = request.StoryObjectId,
            RoleLabel = NormalizeOptionalText(request.RoleLabel),
            Notes = NormalizeOptionalText(request.Notes),
            SortOrder = request.SortOrder,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.StructureAssignments.Add(assignment);
        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureAssignmentDto>.Success(await GetStructureAssignmentDto(assignment.Id));
    }

    public async Task<StructureServiceResult<StructureAssignmentDto>> UpdateStructureAssignmentAsync(
        int projectId,
        int assignmentId,
        StructureAssignmentRequest request)
    {
        var assignment = await dbContext.StructureAssignments
            .Include(currentAssignment => currentAssignment.StructureUsage)
            .FirstOrDefaultAsync(currentAssignment =>
                currentAssignment.ProjectId == projectId &&
                currentAssignment.Id == assignmentId);
        if (assignment is null)
        {
            return StructureServiceResult<StructureAssignmentDto>.NotFound();
        }

        var validationError = await ValidateStructureAssignmentRequest(
            projectId,
            assignment.StructureUsage!.StructureId,
            request);
        if (validationError is not null)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid(validationError);
        }

        var duplicateAssignment = await dbContext.StructureAssignments.AnyAsync(currentAssignment =>
            currentAssignment.ProjectId == projectId &&
            currentAssignment.Id != assignmentId &&
            currentAssignment.StructureUsageId == assignment.StructureUsageId &&
            currentAssignment.StructureNodeId == request.StructureNodeId &&
            currentAssignment.StoryObjectId == request.StoryObjectId);
        if (duplicateAssignment)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid("Object is already assigned to this structure node.");
        }

        if ((assignment.StructureNodeId != request.StructureNodeId ||
             assignment.StoryObjectId != request.StoryObjectId) &&
            await TargetHasTimelineReferences(projectId, "structureAssignment", assignmentId))
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid(
                "Structure assignment is referenced by timeline events. Remove timeline references before changing its object or node.");
        }

        assignment.StructureNodeId = request.StructureNodeId;
        assignment.StoryObjectId = request.StoryObjectId;
        assignment.RoleLabel = NormalizeOptionalText(request.RoleLabel);
        assignment.Notes = NormalizeOptionalText(request.Notes);
        assignment.SortOrder = request.SortOrder;
        assignment.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureAssignmentDto>.Success(await GetStructureAssignmentDto(assignment.Id));
    }

    public async Task<StructureServiceResult> DeleteStructureAssignmentAsync(int projectId, int assignmentId)
    {
        var assignment = await dbContext.StructureAssignments.FirstOrDefaultAsync(currentAssignment =>
            currentAssignment.ProjectId == projectId &&
            currentAssignment.Id == assignmentId);
        if (assignment is null)
        {
            return StructureServiceResult.NotFound();
        }

        if (await TargetHasTimelineReferences(projectId, "structureAssignment", assignmentId))
        {
            return StructureServiceResult.Invalid(
                "Structure assignment is referenced by timeline events and cannot be removed.");
        }

        dbContext.StructureAssignments.Remove(assignment);
        await dbContext.SaveChangesAsync();
        InvalidateRelationGraphCache(projectId);

        return StructureServiceResult.Success();
    }

    private void InvalidateRelationGraphCache(int projectId)
    {
        cacheSingleFlight.Remove(ProjectCacheKeys.RelationGraph(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureSummaries(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.StructureDetailsPrefix(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureUsages(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureAssignments(projectId));
    }

    private Task<Structure?> LoadStructureForCatalogSync(int projectId, int structureId) =>
        dbContext.Structures
            .Include(structure => structure.Nodes)
            .FirstOrDefaultAsync(structure =>
                structure.ProjectId == projectId &&
                structure.Id == structureId);

    private Task<StructureUsage?> LoadUsageForCatalogAssignmentSync(int projectId, int usageId) =>
        dbContext.StructureUsages
            .Include(usage => usage.Structure)
                .ThenInclude(structure => structure!.Nodes)
            .FirstOrDefaultAsync(usage =>
                usage.ProjectId == projectId &&
                usage.Id == usageId);

    private static string? ValidateCatalogSyncRequest(Structure structure)
    {
        if (structure.CatalogSyncMode == "manual")
        {
            return "Structure catalog synchronization is disabled.";
        }

        if (structure.LinkedCatalogId is null)
        {
            return "Linked catalog is required for structure catalog synchronization.";
        }

        return ValidateCatalogSyncMode(structure.CatalogSyncMode, structure.NodeBindingMode, structure.LinkedCatalogId);
    }

    private static string? ValidateCatalogAssignmentSyncRequest(StructureUsage usage)
    {
        var structure = usage.Structure;
        if (structure?.LinkedCatalogId is null)
        {
            return "Structure must be linked to a catalog before assignment synchronization.";
        }

        if (usage.TargetKind == "catalog" && usage.TargetId != structure.LinkedCatalogId.Value)
        {
            return "Catalog-targeted structure usage must target the same catalog as the structure.";
        }

        var hasLinkedNodes = structure.Nodes.Any(node =>
            node.LinkedCatalogEntryId is not null ||
            node.LinkedCatalogEntryGroupId is not null);
        if (!hasLinkedNodes)
        {
            return "Structure has no nodes linked to catalog entries or groups.";
        }

        return ValidateUniqueCatalogNodeBindings(structure.Nodes);
    }

    private async Task<StructureCatalogAssignmentSyncPreviewDto> BuildCatalogAssignmentSyncPreview(
        int projectId,
        StructureUsage usage)
    {
        var structure = usage.Structure!;
        var linkedCatalogId = structure.LinkedCatalogId!.Value;
        var entryNodesById = structure.Nodes
            .Where(node => node.LinkedCatalogEntryId is not null)
            .GroupBy(node => node.LinkedCatalogEntryId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(node => node.Id).First());
        var groupNodesById = structure.Nodes
            .Where(node => node.LinkedCatalogEntryGroupId is not null)
            .GroupBy(node => node.LinkedCatalogEntryGroupId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(node => node.Id).First());
        var catalogGroupIds = await dbContext.CatalogEntryGroups
            .AsNoTracking()
            .Where(group => group.CatalogId == linkedCatalogId)
            .Select(group => group.Id)
            .ToListAsync();
        var catalogGroupIdSet = catalogGroupIds.ToHashSet();
        var parentIdsByChildGroupId = (await dbContext.CatalogEntryGroupHierarchyLinks
            .AsNoTracking()
            .Where(link =>
                catalogGroupIdSet.Contains(link.ParentGroupId) &&
                catalogGroupIdSet.Contains(link.ChildGroupId))
            .ToListAsync())
            .GroupBy(link => link.ChildGroupId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(link => link.ParentGroupId).OrderBy(parentGroupId => parentGroupId).ToList());
        var existingAssignmentKeys = (await dbContext.StructureAssignments
            .AsNoTracking()
            .Where(assignment =>
                assignment.ProjectId == projectId &&
                assignment.StructureUsageId == usage.Id)
            .Select(assignment => new { assignment.StructureNodeId, assignment.StoryObjectId })
            .ToListAsync())
            .Select(assignment => (assignment.StructureNodeId, assignment.StoryObjectId))
            .ToHashSet();

        var selectionsQuery = dbContext.StoryObjectCatalogSelections
            .AsNoTracking()
            .Include(selection => selection.StoryObject)
            .Include(selection => selection.CatalogEntry)
            .Where(selection =>
                selection.StoryObject!.ProjectId == projectId &&
                selection.CatalogId == linkedCatalogId);

        if (usage.TargetKind == "object")
        {
            selectionsQuery = selectionsQuery.Where(selection => selection.StoryObjectId == usage.TargetId);
        }

        var selections = await selectionsQuery
            .OrderBy(selection => selection.StoryObject!.Name)
            .ThenBy(selection => selection.SortOrder)
            .ToListAsync();
        var seenItems = new HashSet<(int StructureNodeId, int StoryObjectId)>();
        var items = new List<StructureCatalogAssignmentSyncItemDto>();

        (int GroupId, StructureNode Node)? FindNearestLinkedGroupNode(int groupId)
        {
            var visitedGroupIds = new HashSet<int>();
            var queue = new Queue<int>();
            queue.Enqueue(groupId);

            while (queue.Count > 0)
            {
                var currentGroupId = queue.Dequeue();
                if (!visitedGroupIds.Add(currentGroupId))
                {
                    continue;
                }

                if (groupNodesById.TryGetValue(currentGroupId, out var node))
                {
                    return (currentGroupId, node);
                }

                foreach (var parentGroupId in parentIdsByChildGroupId.GetValueOrDefault(currentGroupId) ?? [])
                {
                    queue.Enqueue(parentGroupId);
                }
            }

            return null;
        }

        foreach (var selection in selections)
        {
            StructureNode? node = null;
            string? sourceKind = null;
            int? sourceId = null;

            if (selection.TargetType == CatalogSourceEntry &&
                selection.CatalogEntryId is not null &&
                entryNodesById.TryGetValue(selection.CatalogEntryId.Value, out var entryNode))
            {
                node = entryNode;
                sourceKind = CatalogSourceEntry;
                sourceId = selection.CatalogEntryId.Value;
            }
            else if (selection.TargetType == CatalogSourceEntry &&
                selection.CatalogEntry?.EntryGroupId is not null &&
                FindNearestLinkedGroupNode(selection.CatalogEntry.EntryGroupId.Value) is { } entryGroupNode)
            {
                node = entryGroupNode.Node;
                sourceKind = CatalogSourceGroup;
                sourceId = entryGroupNode.GroupId;
            }
            else if (selection.TargetType == CatalogSourceGroup &&
                selection.CatalogEntryGroupId is not null &&
                FindNearestLinkedGroupNode(selection.CatalogEntryGroupId.Value) is { } groupNode)
            {
                node = groupNode.Node;
                sourceKind = CatalogSourceGroup;
                sourceId = groupNode.GroupId;
            }

            if (node is null || sourceKind is null || sourceId is null || selection.StoryObject is null)
            {
                continue;
            }

            var itemKey = (node.Id, selection.StoryObjectId);
            if (!seenItems.Add(itemKey))
            {
                continue;
            }

            items.Add(new StructureCatalogAssignmentSyncItemDto(
                selection.StoryObjectId,
                selection.StoryObject.Name,
                node.Id,
                node.Name,
                sourceKind,
                sourceId.Value,
                existingAssignmentKeys.Contains(itemKey) ? "exists" : "create"));
        }

        return new StructureCatalogAssignmentSyncPreviewDto(
            usage.Id,
            structure.Id,
            linkedCatalogId,
            items.Count(item => item.Action == "exists"),
            items.Count(item => item.Action == "create"),
            items);
    }

    private async Task<StructureCatalogSyncPreviewDto> BuildCatalogSyncPreview(Structure structure)
    {
        var existingEntryNodes = structure.Nodes
            .Where(node => node.LinkedCatalogEntryId is not null)
            .GroupBy(node => node.LinkedCatalogEntryId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(node => node.Id).First());
        var existingGroupNodes = structure.Nodes
            .Where(node => node.LinkedCatalogEntryGroupId is not null)
            .GroupBy(node => node.LinkedCatalogEntryGroupId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(node => node.Id).First());

        var candidates = new List<CatalogSyncCandidate>();
        var catalogId = structure.LinkedCatalogId!.Value;

        if (structure.CatalogSyncMode is "catalogGroups" or "catalogTree")
        {
            var groups = await dbContext.CatalogEntryGroups
                .AsNoTracking()
                .Include(group => group.ParentLinks)
                .Where(group => group.CatalogId == catalogId)
                .OrderBy(group => group.SortOrder)
                .ThenBy(group => group.Name)
                .ToListAsync();
            var groupById = groups.ToDictionary(group => group.Id);
            var groupLevels = new Dictionary<int, int>();

            int GetGroupLevel(int groupId, HashSet<int>? path = null)
            {
                if (groupLevels.TryGetValue(groupId, out var cachedLevel))
                {
                    return cachedLevel;
                }

                path ??= [];
                if (!path.Add(groupId))
                {
                    return 0;
                }

                var group = groupById[groupId];
                var parentId = group.ParentLinks
                    .Select(link => (int?)link.ParentGroupId)
                    .FirstOrDefault(parentGroupId => parentGroupId is not null && groupById.ContainsKey(parentGroupId.Value));
                var level = parentId is null ? 0 : GetGroupLevel(parentId.Value, path) + 1;
                groupLevels[groupId] = level;
                return level;
            }

            foreach (var group in groups)
            {
                var parentId = group.ParentLinks
                    .Select(link => (int?)link.ParentGroupId)
                    .FirstOrDefault(parentGroupId => parentGroupId is not null && groupById.ContainsKey(parentGroupId.Value));
                var existingNode = existingGroupNodes.GetValueOrDefault(group.Id);
                candidates.Add(new CatalogSyncCandidate(
                    CatalogSourceGroup,
                    group.Id,
                    group.Name,
                    null,
                    parentId is null ? null : CatalogSourceGroup,
                    parentId,
                    existingNode?.Id,
                    parentId is null ? null : existingGroupNodes.GetValueOrDefault(parentId.Value)?.Id,
                    existingNode?.LevelIndex ?? GetGroupLevel(group.Id),
                    group.SortOrder));
            }
        }

        if (structure.CatalogSyncMode is "catalogEntries" or "catalogTree")
        {
            var entries = await dbContext.CatalogEntries
                .AsNoTracking()
                .Include(entry => entry.ParentLinks)
                .Where(entry => entry.CatalogId == catalogId)
                .OrderBy(entry => entry.SortOrder)
                .ThenBy(entry => entry.Name)
                .ToListAsync();
            var entryById = entries.ToDictionary(entry => entry.Id);
            var entryLevels = new Dictionary<int, int>();

            int GetEntryLevel(int entryId, HashSet<int>? path = null)
            {
                if (entryLevels.TryGetValue(entryId, out var cachedLevel))
                {
                    return cachedLevel;
                }

                path ??= [];
                if (!path.Add(entryId))
                {
                    return 0;
                }

                var entry = entryById[entryId];
                var parentEntryId = entry.ParentLinks
                    .Select(link => (int?)link.ParentEntryId)
                    .FirstOrDefault(parentId => parentId is not null && entryById.ContainsKey(parentId.Value));
                if (parentEntryId is not null)
                {
                    var childLevel = GetEntryLevel(parentEntryId.Value, path) + 1;
                    entryLevels[entryId] = childLevel;
                    return childLevel;
                }

                if (structure.CatalogSyncMode == "catalogTree" && entry.EntryGroupId is not null)
                {
                    var groupLevel = candidates.FirstOrDefault(candidate =>
                        candidate.SourceKind == CatalogSourceGroup &&
                        candidate.SourceId == entry.EntryGroupId.Value)?.LevelIndex;
                    if (groupLevel is not null)
                    {
                        entryLevels[entryId] = groupLevel.Value + 1;
                        return entryLevels[entryId];
                    }
                }

                entryLevels[entryId] = 0;
                return 0;
            }

            foreach (var entry in entries)
            {
                var parentEntryId = entry.ParentLinks
                    .Select(link => (int?)link.ParentEntryId)
                    .FirstOrDefault(parentId => parentId is not null && entryById.ContainsKey(parentId.Value));
                string? parentSourceKind = null;
                int? parentSourceId = null;
                int? parentNodeId = null;

                if (parentEntryId is not null)
                {
                    parentSourceKind = CatalogSourceEntry;
                    parentSourceId = parentEntryId;
                    parentNodeId = existingEntryNodes.GetValueOrDefault(parentEntryId.Value)?.Id;
                }
                else if (structure.CatalogSyncMode == "catalogTree" && entry.EntryGroupId is not null)
                {
                    parentSourceKind = CatalogSourceGroup;
                    parentSourceId = entry.EntryGroupId;
                    parentNodeId = existingGroupNodes.GetValueOrDefault(entry.EntryGroupId.Value)?.Id;
                }

                var existingNode = existingEntryNodes.GetValueOrDefault(entry.Id);
                candidates.Add(new CatalogSyncCandidate(
                    CatalogSourceEntry,
                    entry.Id,
                    entry.Name,
                    entry.Description,
                    parentSourceKind,
                    parentSourceId,
                    existingNode?.Id,
                    parentNodeId,
                    existingNode?.LevelIndex ?? GetEntryLevel(entry.Id),
                    entry.SortOrder));
            }
        }

        var nodes = candidates
            .OrderBy(candidate => candidate.LevelIndex)
            .ThenBy(candidate => candidate.SortOrder)
            .ThenBy(candidate => candidate.Name)
            .Select(candidate => new StructureCatalogSyncNodeDto(
                candidate.SourceKind,
                candidate.SourceId,
                candidate.Name,
                candidate.Description,
                candidate.ParentSourceId,
                candidate.ParentSourceKind,
                candidate.ExistingNodeId,
                candidate.ParentNodeId,
                candidate.LevelIndex,
                candidate.SortOrder,
                candidate.ExistingNodeId is null ? "create" : "exists"))
            .ToList();

        return new StructureCatalogSyncPreviewDto(
            structure.Id,
            structure.LinkedCatalogId,
            structure.CatalogSyncMode,
            nodes.Count(node => node.Action == "exists"),
            nodes.Count(node => node.Action == "create"),
            nodes);
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
                LinkedCatalogEntryId = requestedNode.LinkedCatalogEntryId,
                LinkedCatalogEntryGroupId = requestedNode.LinkedCatalogEntryGroupId,
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

    private async Task<string?> ValidateStructureRequest(int projectId, StructureRequest request)
    {
        var nameError = RequestValidators.ValidateName(request.Name, "Structure name", 160);
        if (nameError is not null)
        {
            return nameError;
        }

        var descriptionError = RequestValidators.ValidateOptionalLength(
            request.Description,
            "Structure description",
            1000,
            trimBeforeCheck: false);
        if (descriptionError is not null)
        {
            return descriptionError;
        }

        if (string.IsNullOrWhiteSpace(request.OwnerKind))
        {
            return "Structure owner kind is required.";
        }

        if (string.IsNullOrWhiteSpace(request.LayoutKind))
        {
            return "Structure layout kind is required.";
        }

        if (string.IsNullOrWhiteSpace(request.NodeBindingMode))
        {
            return "Structure node binding mode is required.";
        }

        var catalogSyncMode = NormalizeCatalogSyncMode(request.CatalogSyncMode);
        var ownerKind = request.OwnerKind.Trim();
        if (!SupportedOwnerKinds.Contains(ownerKind))
        {
            return "Unsupported structure owner kind.";
        }

        if (!SupportedLayoutKinds.Contains(request.LayoutKind.Trim()))
        {
            return "Unsupported structure layout kind.";
        }

        var nodeBindingMode = request.NodeBindingMode.Trim();
        if (!SupportedNodeBindingModes.Contains(nodeBindingMode))
        {
            return "Unsupported structure node binding mode.";
        }

        if (!SupportedCatalogSyncModes.Contains(catalogSyncMode))
        {
            return "Unsupported structure catalog sync mode.";
        }

        var ownerError = await ValidateOwner(projectId, ownerKind, request.OwnerId);
        if (ownerError is not null)
        {
            return ownerError;
        }

        if (request.LinkedCatalogId is not null && !await CatalogExists(projectId, request.LinkedCatalogId.Value))
        {
            return "Linked catalog was not found.";
        }

        var catalogSyncError = ValidateCatalogSyncMode(catalogSyncMode, nodeBindingMode, request.LinkedCatalogId);
        if (catalogSyncError is not null)
        {
            return catalogSyncError;
        }

        if (request.Nodes is null || request.Edges is null)
        {
            return "Structure nodes and edges are required.";
        }

        if (request.Nodes.Count > 500)
        {
            return "Structure can contain up to 500 nodes.";
        }

        if (request.Edges.Count > 1000)
        {
            return "Structure can contain up to 1000 edges.";
        }

        var clientIds = new HashSet<string>();
        foreach (var node in request.Nodes)
        {
            var clientId = node.ClientId.Trim();
            if (clientId.Length == 0)
            {
                return "Structure node client id is required.";
            }

            if (!clientIds.Add(clientId))
            {
                return "Structure node client ids must be unique.";
            }

            var nodeError = ValidateNode(node);
            if (nodeError is not null)
            {
                return nodeError;
            }
        }

        foreach (var node in request.Nodes)
        {
            if (string.IsNullOrWhiteSpace(node.ParentClientId))
            {
                continue;
            }

            var parentClientId = node.ParentClientId.Trim();
            if (!clientIds.Contains(parentClientId))
            {
                return "Structure node parent was not found.";
            }

            if (parentClientId == node.ClientId.Trim())
            {
                return "Structure node cannot be its own parent.";
            }

            var parentNode = request.Nodes.First(currentNode => currentNode.ClientId.Trim() == parentClientId);
            if (parentNode.LevelIndex >= node.LevelIndex)
            {
                return "Structure node parent must be placed on a higher level.";
            }
        }

        var linkedEntryIds = request.Nodes
            .Where(node => node.LinkedCatalogEntryId is not null)
            .Select(node => node.LinkedCatalogEntryId!.Value)
            .ToList();
        var linkedGroupIds = request.Nodes
            .Where(node => node.LinkedCatalogEntryGroupId is not null)
            .Select(node => node.LinkedCatalogEntryGroupId!.Value)
            .ToList();

        if ((linkedEntryIds.Count > 0 || linkedGroupIds.Count > 0) && request.LinkedCatalogId is null)
        {
            return "Linked catalog is required when structure nodes are linked to catalog data.";
        }

        if (linkedEntryIds.Count != linkedEntryIds.Distinct().Count())
        {
            return "Each linked catalog entry can be used by only one structure node.";
        }

        if (linkedGroupIds.Count != linkedGroupIds.Distinct().Count())
        {
            return "Each linked catalog group can be used by only one structure node.";
        }

        if (nodeBindingMode == "none" && (linkedEntryIds.Count > 0 || linkedGroupIds.Count > 0))
        {
            return "Structure node binding mode does not allow catalog links.";
        }

        if (nodeBindingMode == "catalogEntry" && linkedGroupIds.Count > 0)
        {
            return "Structure node binding mode allows only catalog entries.";
        }

        if (nodeBindingMode == "catalogEntryGroup" && linkedEntryIds.Count > 0)
        {
            return "Structure node binding mode allows only catalog groups.";
        }

        var distinctLinkedEntryIds = linkedEntryIds.Distinct().ToList();
        var distinctLinkedGroupIds = linkedGroupIds.Distinct().ToList();

        if (distinctLinkedEntryIds.Count > 0 && !await CatalogEntriesExist(request.LinkedCatalogId!.Value, distinctLinkedEntryIds))
        {
            return "One or more linked catalog entries were not found.";
        }

        if (distinctLinkedGroupIds.Count > 0 && !await CatalogEntryGroupsExist(request.LinkedCatalogId!.Value, distinctLinkedGroupIds))
        {
            return "One or more linked catalog groups were not found.";
        }

        var edgeKeys = new HashSet<(string SourceClientId, string TargetClientId, string RelationType)>();
        foreach (var edge in request.Edges)
        {
            var sourceClientId = edge.SourceClientId.Trim();
            var targetClientId = edge.TargetClientId.Trim();
            if (!clientIds.Contains(sourceClientId) || !clientIds.Contains(targetClientId))
            {
                return "Structure edge references a missing node.";
            }

            if (sourceClientId == targetClientId)
            {
                return "Structure edge cannot connect a node to itself.";
            }

            var edgeError =
                RequestValidators.ValidateName(edge.RelationType, "Structure edge relation type", 80) ??
                RequestValidators.ValidateOptionalLength(edge.Description, "Structure edge description", 1000, trimBeforeCheck: false);
            if (edgeError is not null)
            {
                return edgeError;
            }

            if (!edgeKeys.Add((sourceClientId, targetClientId, edge.RelationType.Trim())))
            {
                return "Structure edges must be unique by source, target, and relation type.";
            }
        }

        return null;
    }

    private static string? ValidateUniqueCatalogNodeBindings(IEnumerable<StructureNode> nodes)
    {
        var duplicateEntryLink = nodes
            .Where(node => node.LinkedCatalogEntryId is not null)
            .GroupBy(node => node.LinkedCatalogEntryId!.Value)
            .Any(group => group.Count() > 1);
        if (duplicateEntryLink)
        {
            return "Each linked catalog entry can be used by only one structure node.";
        }

        var duplicateGroupLink = nodes
            .Where(node => node.LinkedCatalogEntryGroupId is not null)
            .GroupBy(node => node.LinkedCatalogEntryGroupId!.Value)
            .Any(group => group.Count() > 1);
        return duplicateGroupLink
            ? "Each linked catalog group can be used by only one structure node."
            : null;
    }

    private async Task<string?> ValidateStructureUsageRequest(int projectId, StructureUsageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TargetKind))
        {
            return "Structure usage target kind is required.";
        }

        var targetKind = request.TargetKind.Trim();
        if (!SupportedUsageTargetKinds.Contains(targetKind))
        {
            return "Unsupported structure usage target kind.";
        }

        var displayNameError = RequestValidators.ValidateOptionalLength(
            request.DisplayName,
            "Structure usage display name",
            160);
        if (displayNameError is not null)
        {
            return displayNameError;
        }

        var notesError = RequestValidators.ValidateOptionalLength(
            request.Notes,
            "Structure usage notes",
            1000,
            trimBeforeCheck: false);
        if (notesError is not null)
        {
            return notesError;
        }

        return await ValidateUsageTarget(projectId, targetKind, request.TargetId);
    }

    private async Task<string?> ValidateStructureAssignmentRequest(
        int projectId,
        int structureId,
        StructureAssignmentRequest request)
    {
        if (request.StructureNodeId <= 0)
        {
            return "Structure assignment node is required.";
        }

        if (request.StoryObjectId <= 0)
        {
            return "Structure assignment object is required.";
        }

        if (request.SortOrder < 0)
        {
            return "Structure assignment sort order must be zero or greater.";
        }

        var roleLabelError = RequestValidators.ValidateOptionalLength(
            request.RoleLabel,
            "Structure assignment role",
            120);
        if (roleLabelError is not null)
        {
            return roleLabelError;
        }

        var notesError = RequestValidators.ValidateOptionalLength(
            request.Notes,
            "Structure assignment notes",
            1000,
            trimBeforeCheck: false);
        if (notesError is not null)
        {
            return notesError;
        }

        var nodeExists = await dbContext.StructureNodes.AnyAsync(node =>
            node.Id == request.StructureNodeId &&
            node.StructureId == structureId);
        if (!nodeExists)
        {
            return "Structure assignment node was not found in this structure.";
        }

        var objectExists = await dbContext.Objects.AnyAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.Id == request.StoryObjectId);
        if (!objectExists)
        {
            return "Structure assignment object was not found.";
        }

        return null;
    }

    private static string? ValidateNode(StructureNodeRequest node)
    {
        if (node.LevelIndex < 0 || node.SortOrder < 0)
        {
            return "Structure node level and sort order must be zero or greater.";
        }

        if (node.LinkedCatalogEntryId is not null && node.LinkedCatalogEntryGroupId is not null)
        {
            return "Structure node can link to either a catalog entry or a catalog group.";
        }

        return
            RequestValidators.ValidateName(node.Name, "Structure node name", 160) ??
            RequestValidators.ValidateOptionalLength(node.Description, "Structure node description", 1000, trimBeforeCheck: false) ??
            RequestValidators.ValidateOptionalLength(node.NodeType, "Structure node type", 80) ??
            RequestValidators.ValidateOptionalLength(node.Color, "Structure node color", 40) ??
            RequestValidators.ValidateOptionalLength(node.IconKey, "Structure node icon", 80);
    }

    private static string? ValidateStructureDetailsRequest(StructureDetailsRequest request) =>
        RequestValidators.ValidateName(request.Name, "Structure name", 160) ??
        RequestValidators.ValidateOptionalLength(request.Description, "Structure description", 1000, trimBeforeCheck: false);

    private static string? ValidateStructureNodeDetailsRequest(StructureNodeDetailsRequest request) =>
        RequestValidators.ValidateName(request.Name, "Structure node name", 160) ??
        RequestValidators.ValidateOptionalLength(request.Description, "Structure node description", 1000, trimBeforeCheck: false) ??
        RequestValidators.ValidateOptionalLength(request.NodeType, "Structure node type", 80) ??
        RequestValidators.ValidateOptionalLength(request.Color, "Structure node color", 40) ??
        RequestValidators.ValidateOptionalLength(request.IconKey, "Structure node icon", 80);

    private static string NormalizeCatalogSyncMode(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "manual" : value.Trim();

    private static string? ValidateCatalogSyncMode(string catalogSyncMode, string nodeBindingMode, int? linkedCatalogId)
    {
        if (catalogSyncMode == "manual")
        {
            return null;
        }

        if (linkedCatalogId is null)
        {
            return "Linked catalog is required when catalog synchronization is enabled.";
        }

        return catalogSyncMode switch
        {
            "catalogEntries" when nodeBindingMode is not ("catalogEntry" or "mixed") =>
                "Catalog entry synchronization requires entry or mixed node binding.",
            "catalogGroups" when nodeBindingMode is not ("catalogEntryGroup" or "mixed") =>
                "Catalog group synchronization requires group or mixed node binding.",
            "catalogTree" when nodeBindingMode != "mixed" =>
                "Catalog tree synchronization requires mixed node binding.",
            _ => null,
        };
    }

    private async Task<string?> ValidateOwner(int projectId, string ownerKind, int? ownerId)
    {
        if (ownerKind == "project")
        {
            return ownerId is null || ownerId == projectId ? null : "Project-owned structure must use the current project id.";
        }

        if (ownerId is null)
        {
            return "Structure owner id is required.";
        }

        if (ownerKind == "catalog")
        {
            return await CatalogExists(projectId, ownerId.Value) ? null : "Structure owner catalog was not found.";
        }

        return await dbContext.Objects.AnyAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.Id == ownerId.Value)
            ? null
            : "Structure owner object was not found.";
    }

    private async Task<string?> ValidateUsageTarget(int projectId, string targetKind, int targetId)
    {
        if (targetKind == "project")
        {
            return targetId == projectId ? null : "Project structure usage must target the current project.";
        }

        if (targetId <= 0)
        {
            return "Structure usage target id is required.";
        }

        if (targetKind == "catalog")
        {
            return await CatalogExists(projectId, targetId) ? null : "Structure usage target catalog was not found.";
        }

        return await dbContext.Objects.AnyAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.Id == targetId)
            ? null
            : "Structure usage target object was not found.";
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
                currentStructure.LayoutKind,
                currentStructure.NodeBindingMode,
                currentStructure.CatalogSyncMode,
                currentStructure.LinkedCatalogId,
                0,
                currentStructure.Nodes
                    .OrderBy(node => node.LevelIndex)
                    .ThenBy(node => node.SortOrder)
                    .ThenBy(node => node.Id)
                    .Select(node => new StructureNodeDto(
                        node.Id,
                        node.ParentNodeId,
                        node.LinkedCatalogEntryId,
                        node.LinkedCatalogEntryGroupId,
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
            node.LinkedCatalogEntryId,
            node.LinkedCatalogEntryGroupId,
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
            .Where(currentAssignment => currentAssignment.Id == assignmentId)
            .Select(currentAssignment => new StructureAssignmentDto(
                currentAssignment.Id,
                currentAssignment.ProjectId,
                currentAssignment.StructureUsageId,
                currentAssignment.StructureUsage!.StructureId,
                currentAssignment.StructureUsage.Structure!.Name,
                currentAssignment.StructureNodeId,
                currentAssignment.StructureNode!.Name,
                currentAssignment.StoryObjectId,
                currentAssignment.StoryObject!.Name,
                currentAssignment.StoryObject.ObjectType!.Key,
                currentAssignment.RoleLabel,
                currentAssignment.Notes,
                currentAssignment.SortOrder))
            .FirstAsync();

        return assignment;
    }

    private static int? NormalizeOwnerId(string ownerKind, int? ownerId) =>
        ownerKind.Trim() == "project" ? null : ownerId;

    private static int NormalizeUsageTargetId(string targetKind, int targetId) => targetId;

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record CatalogSyncCandidate(
        string SourceKind,
        int SourceId,
        string Name,
        string? Description,
        string? ParentSourceKind,
        int? ParentSourceId,
        int? ExistingNodeId,
        int? ParentNodeId,
        int LevelIndex,
        int SortOrder);
}
