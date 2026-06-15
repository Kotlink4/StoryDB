using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Structures;

public sealed class StructureService(StoryDbContext dbContext) : IStructureService
{
    private static readonly HashSet<string> SupportedOwnerKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedUsageTargetKinds = ["project", "catalog", "object"];
    private static readonly HashSet<string> SupportedLayoutKinds = ["levels", "tree", "graph"];
    private static readonly HashSet<string> SupportedNodeBindingModes = ["none", "catalogEntry", "catalogEntryGroup", "mixed"];

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

        var structures = await query
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
                structure.LinkedCatalogId,
                structure.Nodes.Count,
                structure.Edges.Count,
                structure.Usages.Count))
            .ToListAsync();

        return StructureServiceResult<IReadOnlyList<StructureSummaryDto>>.Success(structures);
    }

    public async Task<StructureServiceResult<StructureDto>> GetStructureAsync(int projectId, int structureId)
    {
        if (!await StructureExists(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.NotFound();
        }

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structureId));
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
            LinkedCatalogId = request.LinkedCatalogId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Structures.Add(structure);
        await dbContext.SaveChangesAsync();
        await ReplaceStructureItems(structure, request, now);

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

        var now = DateTime.UtcNow;
        structure.Name = request.Name.Trim();
        structure.Description = NormalizeOptionalText(request.Description);
        structure.OwnerKind = request.OwnerKind.Trim();
        structure.OwnerId = NormalizeOwnerId(request.OwnerKind, request.OwnerId);
        structure.LayoutKind = request.LayoutKind.Trim();
        structure.NodeBindingMode = request.NodeBindingMode.Trim();
        structure.LinkedCatalogId = request.LinkedCatalogId;
        structure.UpdatedAt = now;

        dbContext.StructureEdges.RemoveRange(structure.Edges);
        dbContext.StructureNodes.RemoveRange(structure.Nodes);
        await dbContext.SaveChangesAsync();
        await ReplaceStructureItems(structure, request, now);

        return StructureServiceResult<StructureDto>.Success(await GetStructureDto(structure.Id));
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

        dbContext.Structures.Remove(structure);
        await dbContext.SaveChangesAsync();

        return StructureServiceResult.Success();
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

        var usages = await query
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

        return StructureServiceResult<StructureUsageDto>.Success(await GetStructureUsageDto(usage.Id));
    }

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

        dbContext.StructureUsages.Remove(usage);
        await dbContext.SaveChangesAsync();

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

        var assignments = await query
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

        return StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>.Success(assignments);
    }

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

        assignment.StructureNodeId = request.StructureNodeId;
        assignment.StoryObjectId = request.StoryObjectId;
        assignment.RoleLabel = NormalizeOptionalText(request.RoleLabel);
        assignment.Notes = NormalizeOptionalText(request.Notes);
        assignment.SortOrder = request.SortOrder;
        assignment.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

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

        dbContext.StructureAssignments.Remove(assignment);
        await dbContext.SaveChangesAsync();

        return StructureServiceResult.Success();
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

        var ownerError = await ValidateOwner(projectId, ownerKind, request.OwnerId);
        if (ownerError is not null)
        {
            return ownerError;
        }

        if (request.LinkedCatalogId is not null && !await CatalogExists(projectId, request.LinkedCatalogId.Value))
        {
            return "Linked catalog was not found.";
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
            .Distinct()
            .ToList();
        var linkedGroupIds = request.Nodes
            .Where(node => node.LinkedCatalogEntryGroupId is not null)
            .Select(node => node.LinkedCatalogEntryGroupId!.Value)
            .Distinct()
            .ToList();

        if ((linkedEntryIds.Count > 0 || linkedGroupIds.Count > 0) && request.LinkedCatalogId is null)
        {
            return "Linked catalog is required when structure nodes are linked to catalog data.";
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

        if (linkedEntryIds.Count > 0 && !await CatalogEntriesExist(request.LinkedCatalogId!.Value, linkedEntryIds))
        {
            return "One or more linked catalog entries were not found.";
        }

        if (linkedGroupIds.Count > 0 && !await CatalogEntryGroupsExist(request.LinkedCatalogId!.Value, linkedGroupIds))
        {
            return "One or more linked catalog groups were not found.";
        }

        foreach (var edge in request.Edges)
        {
            if (!clientIds.Contains(edge.SourceClientId.Trim()) || !clientIds.Contains(edge.TargetClientId.Trim()))
            {
                return "Structure edge references a missing node.";
            }

            var edgeError =
                RequestValidators.ValidateName(edge.RelationType, "Structure edge relation type", 80) ??
                RequestValidators.ValidateOptionalLength(edge.Description, "Structure edge description", 1000, trimBeforeCheck: false);
            if (edgeError is not null)
            {
                return edgeError;
            }
        }

        return null;
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
                currentStructure.LinkedCatalogId,
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

        return structure;
    }

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
}
