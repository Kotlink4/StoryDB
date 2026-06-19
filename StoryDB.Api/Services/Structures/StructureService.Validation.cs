using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
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

        var ownerKind = request.OwnerKind.Trim();
        if (!SupportedOwnerKinds.Contains(ownerKind))
        {
            return "Unsupported structure owner kind.";
        }

        if (!SupportedLayoutKinds.Contains(request.LayoutKind.Trim()))
        {
            return "Unsupported structure layout kind.";
        }

        var applicationScope = NormalizeApplicationScope(request.ApplicationScope);
        if (!SupportedApplicationScopes.Contains(applicationScope))
        {
            return "Unsupported structure application scope.";
        }

        var ownerError = await ValidateOwner(projectId, ownerKind, request.OwnerId);
        if (ownerError is not null)
        {
            return ownerError;
        }

        if (request.LinkedCatalogId is not null)
        {
            return "Structures no longer support linked catalogs. Catalog entry scope applies to all project catalogs.";
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

        if (linkedEntryIds.Count > 0 || linkedGroupIds.Count > 0)
        {
            return "Structure nodes no longer support catalog links. Store hierarchy data in structure nodes.";
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
            if (objectApplicationScope != structureScope)
            {
                return "Structure assignment object does not match structure application scope.";
            }
        }
        else if (target.TargetKind == "catalogEntry")
        {
            if (structureScope != "catalogEntries")
            {
                return "Structure assignment catalog entry does not match structure application scope.";
            }

            var entryExists = await dbContext.CatalogEntries.AnyAsync(entry =>
                entry.Id == target.TargetId &&
                entry.Catalog != null &&
                entry.Catalog.ProjectId == projectId);
            if (!entryExists)
            {
                return "Structure assignment catalog entry was not found.";
            }
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
