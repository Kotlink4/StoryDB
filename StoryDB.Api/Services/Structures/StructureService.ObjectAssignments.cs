using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    public async Task<StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>> GetStructureAssignmentsAsync(
        int projectId,
        int? structureUsageId,
        int? structureId,
        int? structureNodeId,
        int? storyObjectId,
        string? targetKind,
        int? targetId)
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
            query = query.Where(assignment =>
                assignment.TargetKind == "storyObject" &&
                assignment.TargetId == storyObjectId);
        }

        var normalizedTargetKind = NormalizeOptionalText(targetKind);
        if (normalizedTargetKind is not null)
        {
            query = query.Where(assignment => assignment.TargetKind == normalizedTargetKind);
        }

        if (targetId is not null)
        {
            query = query.Where(assignment => assignment.TargetId == targetId);
        }

        var assignments =
            structureUsageId is null &&
            structureId is null &&
            structureNodeId is null &&
            storyObjectId is null &&
            normalizedTargetKind is null &&
            targetId is null
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

    private async Task<List<StructureAssignmentDto>> ReadStructureAssignmentsAsync(IQueryable<StructureAssignment> query)
    {
        var assignments = await query
            .Include(assignment => assignment.StructureUsage)
                .ThenInclude(usage => usage!.Structure)
            .Include(assignment => assignment.StructureNode)
            .Include(assignment => assignment.StoryObject)
                .ThenInclude(storyObject => storyObject!.ObjectType)
            .OrderBy(assignment => assignment.StructureUsage!.Structure!.Name)
            .ThenBy(assignment => assignment.StructureNode!.LevelIndex)
            .ThenBy(assignment => assignment.StructureNode!.SortOrder)
            .ThenBy(assignment => assignment.SortOrder)
            .ToListAsync();

        var catalogEntryIds = assignments
            .Where(assignment => assignment.TargetKind == "catalogEntry")
            .Select(assignment => assignment.TargetId)
            .Distinct()
            .ToArray();
        var catalogEntriesById = catalogEntryIds.Length == 0
            ? new Dictionary<int, CatalogEntry>()
            : await dbContext.CatalogEntries
                .AsNoTracking()
                .Include(entry => entry.Catalog)
                .Where(entry => catalogEntryIds.Contains(entry.Id))
                .ToDictionaryAsync(entry => entry.Id);

        return assignments
            .Select(assignment => ToStructureAssignmentDto(assignment, catalogEntriesById))
            .ToList();
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

        var target = NormalizeAssignmentTarget(request);
        var existingAssignment = await dbContext.StructureAssignments.AnyAsync(assignment =>
            assignment.ProjectId == projectId &&
            assignment.StructureUsageId == usageId &&
            assignment.StructureNodeId == request.StructureNodeId &&
            assignment.TargetKind == target.TargetKind &&
            assignment.TargetId == target.TargetId);
        if (existingAssignment)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid("Target is already assigned to this structure node.");
        }

        var now = DateTime.UtcNow;
        var assignment = new StructureAssignment
        {
            ProjectId = projectId,
            StructureUsageId = usageId,
            StructureNodeId = request.StructureNodeId,
            TargetKind = target.TargetKind,
            TargetId = target.TargetId,
            StoryObjectId = target.StoryObjectId,
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

        var target = NormalizeAssignmentTarget(request);
        var duplicateAssignment = await dbContext.StructureAssignments.AnyAsync(currentAssignment =>
            currentAssignment.ProjectId == projectId &&
            currentAssignment.Id != assignmentId &&
            currentAssignment.StructureUsageId == assignment.StructureUsageId &&
            currentAssignment.StructureNodeId == request.StructureNodeId &&
            currentAssignment.TargetKind == target.TargetKind &&
            currentAssignment.TargetId == target.TargetId);
        if (duplicateAssignment)
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid("Target is already assigned to this structure node.");
        }

        if ((assignment.StructureNodeId != request.StructureNodeId ||
             assignment.TargetKind != target.TargetKind ||
             assignment.TargetId != target.TargetId) &&
            await TargetHasTimelineReferences(projectId, "structureAssignment", assignmentId))
        {
            return StructureServiceResult<StructureAssignmentDto>.Invalid(
                "Structure assignment is referenced by timeline events. Remove timeline references before changing its target or node.");
        }

        assignment.StructureNodeId = request.StructureNodeId;
        assignment.TargetKind = target.TargetKind;
        assignment.TargetId = target.TargetId;
        assignment.StoryObjectId = target.StoryObjectId;
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
}


