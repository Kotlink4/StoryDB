using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Timelines;

namespace StoryDB.Api.Validation;

public sealed partial class TimelineEventValidator
{
    private static readonly HashSet<string> SupportedChangeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "field",
        "attribute",
        "relationship",
        "ownership",
        "catalogSelection",
        "hierarchySelection",
        "location",
        "structureAssignment",
        "status",
        "custom",
    };

    private static readonly HashSet<string> SupportedTargetTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "storyObject",
        "catalog",
        "catalogEntry",
        "catalogEntryGroup",
        "characterRelationship",
        "objectRelation",
        "attributeDefinition",
        "hierarchyNode",
        "structure",
        "structureUsage",
        "structureAssignment",
        "structureNode",
        "custom",
    };

    private async Task ValidateChanges(
        int projectId,
        IEnumerable<TimelineChangeRequest>? changes,
        ValidationResult result)
    {
        var index = 0;
        foreach (var change in changes ?? Array.Empty<TimelineChangeRequest>())
        {
            var fieldPrefix = $"changes[{index}]";
            if (string.IsNullOrWhiteSpace(change.ChangeType))
            {
                result.Add($"{fieldPrefix}.changeType", "Timeline change type is required.");
            }
            else if (!SupportedChangeTypes.Contains(change.ChangeType.Trim()))
            {
                result.Add($"{fieldPrefix}.changeType", "Unsupported timeline change type.");
            }

            ValidationRules.MaxLength(result, $"{fieldPrefix}.fieldKey", change.FieldKey, 120, "Timeline change field name is too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.fieldName", change.FieldName, 160, "Timeline change field name is too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.oldValueJson", change.OldValueJson, 4000, "Timeline change value is too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.newValueJson", change.NewValueJson, 4000, "Timeline change value is too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.notes", change.Notes, 2000, "Timeline change notes are too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.effectiveFromLabel", change.EffectiveFromLabel, 120, "Timeline change labels are too long.");
            ValidationRules.MaxLength(result, $"{fieldPrefix}.effectiveToLabel", change.EffectiveToLabel, 120, "Timeline change labels are too long.");
            ValidationRules.OrderedRange(
                result,
                $"{fieldPrefix}.effectiveFromValue",
                $"{fieldPrefix}.effectiveToValue",
                change.EffectiveFromValue,
                change.EffectiveToValue,
                "Timeline change end value cannot be earlier than start value.");

            index++;
        }

        await ValidateTargets(projectId, changes, result, "changes");
    }

    private async Task ValidateTargets(
        int projectId,
        IEnumerable<TimelineTargetRequest>? targets,
        ValidationResult result,
        string fieldPrefix)
    {
        var index = 0;
        foreach (var target in targets ?? Array.Empty<TimelineTargetRequest>())
        {
            var targetFieldPrefix = $"{fieldPrefix}[{index}]";
            var targetType = target.TargetType?.Trim();
            if (string.IsNullOrWhiteSpace(targetType))
            {
                result.Add($"{targetFieldPrefix}.targetType", "Timeline target type is required.");
                index++;
                continue;
            }

            if (targetType.Equals("custom", StringComparison.OrdinalIgnoreCase))
            {
                index++;
                continue;
            }

            if (!SupportedTargetTypes.Contains(targetType))
            {
                result.Add($"{targetFieldPrefix}.targetType", "Unsupported timeline target type.");
                index++;
                continue;
            }

            if (target.TargetId <= 0)
            {
                result.Add($"{targetFieldPrefix}.targetId", "Timeline target id is required.");
                index++;
                continue;
            }

            if (!await TargetExists(projectId, targetType, target.TargetId))
            {
                result.Add($"{targetFieldPrefix}.targetId", "One or more timeline targets were not found.");
            }

            index++;
        }
    }

    private async Task<bool> TargetExists(int projectId, string targetType, int targetId) =>
        targetType switch
        {
            var value when value.Equals("storyObject", StringComparison.OrdinalIgnoreCase) => await dbContext.Objects.AnyAsync(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.Id == targetId),
            var value when value.Equals("catalog", StringComparison.OrdinalIgnoreCase) => await dbContext.Catalogs.AnyAsync(catalog =>
                catalog.ProjectId == projectId &&
                catalog.Id == targetId),
            var value when value.Equals("catalogEntry", StringComparison.OrdinalIgnoreCase) => await dbContext.CatalogEntries.AnyAsync(entry =>
                entry.Id == targetId &&
                entry.Catalog != null &&
                entry.Catalog.ProjectId == projectId),
            var value when value.Equals("catalogEntryGroup", StringComparison.OrdinalIgnoreCase) => await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.Id == targetId &&
                group.Catalog != null &&
                group.Catalog.ProjectId == projectId),
            var value when value.Equals("characterRelationship", StringComparison.OrdinalIgnoreCase) => await dbContext.CharacterRelationships.AnyAsync(relationship =>
                relationship.Id == targetId &&
                relationship.SourceCharacter != null &&
                relationship.SourceCharacter.ProjectId == projectId),
            var value when value.Equals("objectRelation", StringComparison.OrdinalIgnoreCase) => await dbContext.ObjectRelations.AnyAsync(relation =>
                relation.Id == targetId &&
                relation.SourceObject != null &&
                relation.SourceObject.ProjectId == projectId),
            var value when value.Equals("attributeDefinition", StringComparison.OrdinalIgnoreCase) => await dbContext.AttributeDefinitions.AnyAsync(definition =>
                definition.ProjectId == projectId &&
                definition.Id == targetId),
            var value when value.Equals("hierarchyNode", StringComparison.OrdinalIgnoreCase) => await dbContext.HierarchyNodes.AnyAsync(node =>
                node.Id == targetId &&
                node.Group != null &&
                node.Group.ProjectId == projectId),
            var value when value.Equals("structure", StringComparison.OrdinalIgnoreCase) => await dbContext.Structures.AnyAsync(structure =>
                structure.ProjectId == projectId &&
                structure.Id == targetId),
            var value when value.Equals("structureUsage", StringComparison.OrdinalIgnoreCase) => await dbContext.StructureUsages.AnyAsync(usage =>
                usage.ProjectId == projectId &&
                usage.Id == targetId),
            var value when value.Equals("structureAssignment", StringComparison.OrdinalIgnoreCase) => await dbContext.StructureAssignments.AnyAsync(assignment =>
                assignment.ProjectId == projectId &&
                assignment.Id == targetId),
            var value when value.Equals("structureNode", StringComparison.OrdinalIgnoreCase) => await dbContext.StructureNodes.AnyAsync(node =>
                node.Id == targetId &&
                node.Structure != null &&
                node.Structure.ProjectId == projectId),
            _ => false,
        };
}
