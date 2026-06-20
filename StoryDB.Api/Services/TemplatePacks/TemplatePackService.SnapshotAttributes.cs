using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
    private async Task ApplyAttributesAsync(
        int projectId,
        IReadOnlyList<AttributeSnapshot> attributes,
        CancellationToken cancellationToken)
    {
        if (attributes.Count == 0)
        {
            return;
        }

        var objectTypes = await dbContext.ObjectTypes
            .Where(type => type.ProjectId == projectId)
            .ToDictionaryAsync(type => type.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var existingGroups = await dbContext.AttributeGroups
            .Where(group => group.ProjectId == projectId)
            .ToListAsync(cancellationToken);
        var existingDefinitions = await dbContext.AttributeDefinitions
            .Where(definition => definition.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        foreach (var attribute in attributes)
        {
            if (!objectTypes.TryGetValue(attribute.TypeKey, out var objectType))
            {
                continue;
            }

            AttributeGroup? group = null;
            if (!string.IsNullOrWhiteSpace(attribute.GroupName))
            {
                group = existingGroups.FirstOrDefault(currentGroup =>
                    currentGroup.ObjectTypeId == objectType.Id &&
                    string.Equals(currentGroup.Name, attribute.GroupName, StringComparison.OrdinalIgnoreCase));
                if (group is null)
                {
                    group = new AttributeGroup
                    {
                        ProjectId = projectId,
                        ObjectTypeId = objectType.Id,
                        Name = attribute.GroupName,
                        SortOrder = attribute.SortOrder,
                    };
                    dbContext.AttributeGroups.Add(group);
                    existingGroups.Add(group);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            var definitionExists = existingDefinitions.Any(currentDefinition =>
                currentDefinition.ObjectTypeId == objectType.Id &&
                string.Equals(currentDefinition.Name, attribute.Name, StringComparison.OrdinalIgnoreCase));
            if (definitionExists)
            {
                continue;
            }

            var definition = new AttributeDefinition
            {
                ProjectId = projectId,
                ObjectTypeId = objectType.Id,
                AttributeGroupId = group?.Id,
                Name = attribute.Name,
                DataType = attribute.DataType,
                IconKey = attribute.IconKey,
                MinValue = attribute.MinValue,
                MaxValue = attribute.MaxValue,
                Unit = attribute.Unit,
                OptionsJson = attribute.OptionsJson,
                SortOrder = attribute.SortOrder,
            };
            dbContext.AttributeDefinitions.Add(definition);
            existingDefinitions.Add(definition);
        }
    }
}
