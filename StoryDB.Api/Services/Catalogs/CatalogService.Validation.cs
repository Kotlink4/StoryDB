using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
    private async Task<string?> ValidateEntryRequest(
        int catalogId,
        CatalogEntryDraft draft,
        int? entryIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        if (draft.EntryGroupId is not null)
        {
            var groupExists = await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == draft.EntryGroupId,
                cancellationToken);
            if (!groupExists)
            {
                return "Catalog entry group was not found.";
            }
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntries.AnyAsync(entry =>
            entry.CatalogId == catalogId &&
            entry.Name == name &&
            entry.Id != entryIdToIgnore,
            cancellationToken);
        return hasDuplicateName ? "Catalog entry with this name already exists." : null;
    }

    private async Task<string?> ValidateEntryGroupRequest(
        int catalogId,
        CatalogEntryGroupDraft draft,
        int? groupIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntryGroups.AnyAsync(group =>
            group.CatalogId == catalogId &&
            group.Name == name &&
            group.Id != groupIdToIgnore,
            cancellationToken);
        return hasDuplicateName ? "Catalog entry group with this name already exists." : null;
    }

    private async Task<string?> ValidateFieldDefinitionRequest(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionDraft draft,
        int? fieldIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        var requestError = RequestValidators.ValidateCatalogFieldDefinition(
            draft.Name,
            draft.DataType,
            draft.MinValue,
            draft.MaxValue,
            draft.Options,
            draft.ReferenceCatalogId,
            FieldTypes);
        if (requestError is not null)
        {
            return requestError;
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogFieldDefinitions.AnyAsync(field =>
            field.CatalogId == catalogId &&
            field.Name == name &&
            field.Id != fieldIdToIgnore,
            cancellationToken);
        if (hasDuplicateName)
        {
            return "Field with this name already exists.";
        }

        if (draft.FieldGroupId is not null)
        {
            var groupExists = await dbContext.CatalogFieldGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == draft.FieldGroupId,
                cancellationToken);
            if (!groupExists)
            {
                return "Field group was not found.";
            }
        }

        if (IsReferenceField(draft.DataType))
        {
            var referenceCatalogExists = await dbContext.Catalogs.AnyAsync(catalog =>
                catalog.ProjectId == projectId && catalog.Id == draft.ReferenceCatalogId,
                cancellationToken);
            if (!referenceCatalogExists)
            {
                return "Reference catalog was not found.";
            }
        }

        return null;
    }

    private async Task<string?> ValidateCatalogCanBeDeleted(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        if (await dbContext.Structures.AnyAsync(structure =>
            structure.ProjectId == projectId &&
            structure.OwnerKind == "catalog" &&
            structure.OwnerId == catalogId,
            cancellationToken))
        {
            return "Catalog owns one or more structures and cannot be deleted.";
        }

        if (await dbContext.StructureUsages.AnyAsync(usage =>
            usage.ProjectId == projectId &&
            usage.TargetKind == "catalog" &&
            usage.TargetId == catalogId,
            cancellationToken))
        {
            return "Catalog has connected structure usages and cannot be deleted.";
        }

        if (await dbContext.CatalogFieldDefinitions.AnyAsync(definition =>
            definition.ReferenceCatalogId == catalogId &&
            definition.Catalog!.ProjectId == projectId,
            cancellationToken))
        {
            return "Catalog is used as a reference field source and cannot be deleted.";
        }

        return null;
    }
}

