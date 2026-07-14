using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IStructureService
{
    private static readonly TimeSpan StructureReadCacheDuration = TimeSpan.FromSeconds(15);
    private static readonly HashSet<string> SupportedOwnerKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedUsageTargetKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedAssignmentTargetKinds = ["storyObject", "catalogEntry"];
    private static readonly HashSet<string> SupportedApplicationScopes =
        ["characters", "items", "locations", "organizations", "catalogEntries"];
    private static readonly HashSet<string> SupportedLayoutKinds = ["levels", "tree", "graph"];

    private sealed record StructureAssignmentTarget(string TargetKind, int TargetId, int? StoryObjectId);

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
            ApplicationScope = NormalizeApplicationScope(request.ApplicationScope),
            LayoutKind = request.LayoutKind.Trim(),
            NodeBindingMode = "none",
            CatalogSyncMode = "manual",
            LinkedCatalogId = null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Structures.Add(structure);
        await dbContext.SaveChangesAsync();
        await ReplaceStructureItems(structure, request, now);
        await EnsureProjectStructureUsage(projectId, structure.Id, now);
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structure.Id));
    }

    private async Task EnsureProjectStructureUsage(int projectId, int structureId, DateTime now)
    {
        var exists = await dbContext.StructureUsages.AnyAsync(usage =>
            usage.ProjectId == projectId &&
            usage.StructureId == structureId &&
            usage.TargetKind == "project" &&
            usage.TargetId == projectId);
        if (exists)
        {
            return;
        }

        dbContext.StructureUsages.Add(new StructureUsage
        {
            ProjectId = projectId,
            StructureId = structureId,
            TargetKind = "project",
            TargetId = projectId,
            DisplayName = null,
            Notes = null,
            IsPrimary = false,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();
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

        if (await StructureHasTimelineReferences(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.Invalid(
                "Structure is referenced by timeline events. Remove timeline references before editing the structure topology.");
        }

        var lockedNodeError = await ValidateLockedStructureNodes(projectId, structure, request);
        if (lockedNodeError is not null)
        {
            return StructureServiceResult<StructureDto>.Invalid(lockedNodeError);
        }

        var now = DateTime.UtcNow;
        structure.Name = request.Name.Trim();
        structure.Description = NormalizeOptionalText(request.Description);
        structure.OwnerKind = request.OwnerKind.Trim();
        structure.OwnerId = NormalizeOwnerId(request.OwnerKind, request.OwnerId);
        structure.ApplicationScope = NormalizeApplicationScope(request.ApplicationScope);
        structure.LayoutKind = request.LayoutKind.Trim();
        structure.NodeBindingMode = "none";
        structure.CatalogSyncMode = "manual";
        structure.LinkedCatalogId = null;
        structure.UpdatedAt = now;

        await SyncStructureItems(structure, request, now);
        await InvalidateRelationGraphCache(projectId);

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

        var now = DateTime.UtcNow;
        structure.Name = request.Name.Trim();
        structure.Description = NormalizeOptionalText(request.Description);
        structure.UpdatedAt = now;

        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

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

        if (await StructureNodeHasAssignments(projectId, node.Id) || await StructureNodeHasChildren(structureId, node.Id))
        {
            return StructureServiceResult<StructureNodeDto>.Invalid(
                "Structure node has object assignments or child nodes and cannot be edited.");
        }

        node.Name = request.Name.Trim();
        node.Description = NormalizeOptionalText(request.Description);
        node.NodeType = NormalizeOptionalText(request.NodeType);
        node.Color = NormalizeOptionalText(request.Color);
        node.IconKey = NormalizeOptionalText(request.IconKey);
        var now = DateTime.UtcNow;
        node.UpdatedAt = now;
        node.Structure!.UpdatedAt = node.UpdatedAt;

        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

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

        if (await StructureHasAssignments(projectId, structureId))
        {
            return StructureServiceResult.Invalid(
                "Structure has object assignments. Remove assignments before deleting the structure.");
        }

        if (await StructureHasTimelineReferences(projectId, structureId))
        {
            return StructureServiceResult.Invalid(
                "Structure is referenced by timeline events and cannot be deleted.");
        }

        var usages = await dbContext.StructureUsages
            .Where(usage =>
                usage.ProjectId == projectId &&
                usage.StructureId == structureId)
            .ToListAsync();
        dbContext.StructureUsages.RemoveRange(usages);
        dbContext.Structures.Remove(structure);
        await dbContext.SaveChangesAsync();
        await InvalidateRelationGraphCache(projectId);

        return StructureServiceResult.Success();
    }

}
