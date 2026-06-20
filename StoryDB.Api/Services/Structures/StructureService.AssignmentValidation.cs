using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
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

        var target = NormalizeAssignmentTarget(request);
        if (!SupportedAssignmentTargetKinds.Contains(target.TargetKind))
        {
            return "Unsupported structure assignment target kind.";
        }

        if (target.TargetId <= 0)
        {
            return "Structure assignment target is required.";
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

        var structureScope = await dbContext.Structures
            .Where(structure => structure.ProjectId == projectId && structure.Id == structureId)
            .Select(structure => structure.ApplicationScope)
            .FirstOrDefaultAsync();
        if (structureScope is null)
        {
            return "Structure was not found.";
        }

        return await ValidateAssignmentTarget(projectId, structureScope, target);
    }

    private async Task<string?> ValidateAssignmentTarget(
        int projectId,
        string structureScope,
        StructureAssignmentTarget target)
    {
        if (target.TargetKind == "storyObject")
        {
            var objectTypeKey = await dbContext.Objects
                .Where(storyObject => storyObject.ProjectId == projectId && storyObject.Id == target.TargetId)
                .Select(storyObject => storyObject.ObjectType!.Key)
                .FirstOrDefaultAsync();
            if (objectTypeKey is null)
            {
                return "Structure assignment object was not found.";
            }

            var objectApplicationScope = GetStructureApplicationScopeForObjectType(objectTypeKey);
            return objectApplicationScope == structureScope
                ? null
                : "Structure assignment object does not match structure application scope.";
        }

        if (target.TargetKind == "catalogEntry")
        {
            if (structureScope != "catalogEntries")
            {
                return "Structure assignment catalog entry does not match structure application scope.";
            }

            var entryExists = await dbContext.CatalogEntries.AnyAsync(entry =>
                entry.Id == target.TargetId &&
                entry.Catalog != null &&
                entry.Catalog.ProjectId == projectId);
            return entryExists ? null : "Structure assignment catalog entry was not found.";
        }

        return null;
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
}
