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

}
