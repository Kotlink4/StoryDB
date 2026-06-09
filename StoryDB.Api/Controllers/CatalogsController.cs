using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/catalogs")]
public class CatalogsController(StoryDbContext dbContext) : ControllerBase
{
    private static readonly HashSet<string> SupportedFieldTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "longText",
        "number",
        "select",
        "entryReference",
        "multipleEntryReference",
    };

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CatalogDto>>> GetCatalogs(int projectId)
    {
        var catalogs = await dbContext.Catalogs
            .AsNoTracking()
            .Where(catalog => catalog.ProjectId == projectId && !catalog.IsSystem)
            .OrderBy(catalog => catalog.SortOrder)
            .ThenBy(catalog => catalog.Name)
            .Select(catalog => ToDto(catalog))
            .ToListAsync();

        return Ok(catalogs);
    }

    [HttpPost]
    public async Task<ActionResult<CatalogDto>> CreateCatalog(int projectId, CatalogRequest request)
    {
        var validationError = ValidateCatalogRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId))
        {
            return NotFound();
        }

        var name = request.Name.Trim();
        var key = ToCatalogKey(name);
        var existingKeys = await dbContext.Catalogs
            .Where(catalog => catalog.ProjectId == projectId)
            .Select(catalog => catalog.Key)
            .ToListAsync();
        key = EnsureUniqueKey(key, existingKeys);

        var hasDuplicateName = await dbContext.Catalogs.AnyAsync(catalog =>
            catalog.ProjectId == projectId && catalog.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog with this name already exists.");
        }

        var sortOrder = await dbContext.Catalogs
            .Where(catalog => catalog.ProjectId == projectId)
            .Select(catalog => (int?)catalog.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var catalog = new Catalog
        {
            ProjectId = projectId,
            Key = key,
            Name = name,
            Description = NormalizeOptionalText(request.Description),
            SupportsHierarchy = request.SupportsHierarchy,
            IsSystem = false,
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Catalogs.Add(catalog);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCatalogs), new { projectId }, ToDto(catalog));
    }

    [HttpPut("{catalogId:int}")]
    public async Task<ActionResult<CatalogDto>> UpdateCatalog(
        int projectId,
        int catalogId,
        CatalogRequest request)
    {
        var validationError = ValidateCatalogRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var catalog = await dbContext.Catalogs
            .FirstOrDefaultAsync(currentCatalog =>
                currentCatalog.ProjectId == projectId &&
                currentCatalog.Id == catalogId);
        if (catalog is null)
        {
            return NotFound();
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.Catalogs.AnyAsync(currentCatalog =>
            currentCatalog.ProjectId == projectId &&
            currentCatalog.Id != catalogId &&
            currentCatalog.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog with this name already exists.");
        }

        catalog.Name = name;
        catalog.Description = NormalizeOptionalText(request.Description);
        catalog.SupportsHierarchy = request.SupportsHierarchy;
        catalog.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Ok(ToDto(catalog));
    }

    [HttpDelete("{catalogId:int}")]
    public async Task<IActionResult> DeleteCatalog(int projectId, int catalogId)
    {
        var catalog = await dbContext.Catalogs
            .FirstOrDefaultAsync(currentCatalog =>
                currentCatalog.ProjectId == projectId &&
                currentCatalog.Id == catalogId);
        if (catalog is null)
        {
            return NotFound();
        }

        if (catalog.IsSystem)
        {
            return BadRequest("System catalogs cannot be deleted.");
        }

        var entryIds = await dbContext.CatalogEntries
            .Where(entry => entry.CatalogId == catalogId)
            .Select(entry => entry.Id)
            .ToListAsync();
        if (entryIds.Count > 0)
        {
            dbContext.CatalogEntryHierarchyLinks.RemoveRange(
                dbContext.CatalogEntryHierarchyLinks.Where(link =>
                    entryIds.Contains(link.ParentEntryId) || entryIds.Contains(link.ChildEntryId)));
            dbContext.CatalogEntryFieldValues.RemoveRange(
                dbContext.CatalogEntryFieldValues.Where(value =>
                    value.ReferencedEntryId != null && entryIds.Contains(value.ReferencedEntryId.Value)));
        }

        var referencingFields = await dbContext.CatalogFieldDefinitions
            .Where(definition => definition.ReferenceCatalogId == catalogId)
            .ToListAsync();
        foreach (var field in referencingFields)
        {
            field.ReferenceCatalogId = null;
        }

        dbContext.Catalogs.Remove(catalog);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{catalogId:int}/entries")]
    public async Task<ActionResult<IReadOnlyList<CatalogEntryDto>>> GetEntries(int projectId, int catalogId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var entries = await dbContext.CatalogEntries
            .AsNoTracking()
            .Include(entry => entry.EntryGroup)
            .Include(entry => entry.FieldValues)
            .Where(entry => entry.CatalogId == catalogId)
            .OrderBy(entry => entry.SortOrder)
            .ThenBy(entry => entry.Name)
            .Select(entry => ToDto(entry))
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost("{catalogId:int}/entries")]
    public async Task<ActionResult<CatalogEntryDto>> CreateEntry(
        int projectId,
        int catalogId,
        CatalogEntryRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var validationError = ValidateName(request.Name, "Catalog entry name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (request.Description?.Length > 1000)
        {
            return BadRequest("Description must be 1000 characters or shorter.");
        }

        if (request.EntryGroupId is not null)
        {
            var groupExists = await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == request.EntryGroupId);
            if (!groupExists)
            {
                return BadRequest("Catalog entry group was not found.");
            }
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntries.AnyAsync(entry =>
            entry.CatalogId == catalogId && entry.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog entry with this name already exists.");
        }

        var sortOrder = await dbContext.CatalogEntries
            .Where(entry => entry.CatalogId == catalogId)
            .Select(entry => (int?)entry.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var entry = new CatalogEntry
        {
            CatalogId = catalogId,
            EntryGroupId = request.EntryGroupId,
            Name = name,
            Description = NormalizeOptionalText(request.Description),
            ImagePath = request.ImagePath,
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.CatalogEntries.Add(entry);
        await dbContext.SaveChangesAsync();

        var fieldValidationError = await ReplaceEntryFieldValues(catalogId, entry.Id, request.FieldValues);
        if (fieldValidationError is not null)
        {
            return BadRequest(fieldValidationError);
        }

        await dbContext.SaveChangesAsync();
        entry.EntryGroup = request.EntryGroupId is null
            ? null
            : await dbContext.CatalogEntryGroups.AsNoTracking().FirstOrDefaultAsync(group => group.Id == request.EntryGroupId);
        entry.FieldValues = await dbContext.CatalogEntryFieldValues
            .AsNoTracking()
            .Where(value => value.CatalogEntryId == entry.Id)
            .ToListAsync();

        return CreatedAtAction(nameof(GetEntries), new { projectId, catalogId }, ToDto(entry));
    }

    [HttpPut("{catalogId:int}/entries/{entryId:int}")]
    public async Task<ActionResult<CatalogEntryDto>> UpdateEntry(
        int projectId,
        int catalogId,
        int entryId,
        CatalogEntryRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var entry = await dbContext.CatalogEntries
            .Include(currentEntry => currentEntry.EntryGroup)
            .FirstOrDefaultAsync(currentEntry =>
                currentEntry.CatalogId == catalogId &&
                currentEntry.Id == entryId);
        if (entry is null)
        {
            return NotFound();
        }

        var validationError = ValidateName(request.Name, "Catalog entry name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (request.Description?.Length > 1000)
        {
            return BadRequest("Description must be 1000 characters or shorter.");
        }

        if (request.EntryGroupId is not null)
        {
            var groupExists = await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == request.EntryGroupId);
            if (!groupExists)
            {
                return BadRequest("Catalog entry group was not found.");
            }
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntries.AnyAsync(currentEntry =>
            currentEntry.CatalogId == catalogId &&
            currentEntry.Id != entryId &&
            currentEntry.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog entry with this name already exists.");
        }

        entry.EntryGroupId = request.EntryGroupId;
        entry.Name = name;
        entry.Description = NormalizeOptionalText(request.Description);
        entry.ImagePath = request.ImagePath;
        entry.UpdatedAt = DateTime.UtcNow;

        var fieldValidationError = await ReplaceEntryFieldValues(catalogId, entry.Id, request.FieldValues);
        if (fieldValidationError is not null)
        {
            return BadRequest(fieldValidationError);
        }

        await dbContext.SaveChangesAsync();

        entry.EntryGroup = request.EntryGroupId is null
            ? null
            : await dbContext.CatalogEntryGroups.AsNoTracking().FirstOrDefaultAsync(group => group.Id == request.EntryGroupId);
        entry.FieldValues = await dbContext.CatalogEntryFieldValues
            .AsNoTracking()
            .Where(value => value.CatalogEntryId == entry.Id)
            .ToListAsync();

        return Ok(ToDto(entry));
    }

    [HttpDelete("{catalogId:int}/entries/{entryId:int}")]
    public async Task<IActionResult> DeleteEntry(int projectId, int catalogId, int entryId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var entry = await dbContext.CatalogEntries
            .FirstOrDefaultAsync(currentEntry =>
                currentEntry.CatalogId == catalogId &&
                currentEntry.Id == entryId);
        if (entry is null)
        {
            return NotFound();
        }

        dbContext.CatalogEntryHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryHierarchyLinks.Where(link =>
                link.ParentEntryId == entryId || link.ChildEntryId == entryId));
        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value =>
                value.ReferencedEntryId == entryId));

        dbContext.CatalogEntries.Remove(entry);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{catalogId:int}/entry-groups")]
    public async Task<ActionResult<IReadOnlyList<CatalogEntryGroupDto>>> GetEntryGroups(int projectId, int catalogId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var groups = await dbContext.CatalogEntryGroups
            .AsNoTracking()
            .Where(group => group.CatalogId == catalogId)
            .OrderBy(group => group.SortOrder)
            .ThenBy(group => group.Name)
            .Select(group => new CatalogEntryGroupDto(group.Id, group.Name))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost("{catalogId:int}/entry-groups")]
    public async Task<ActionResult<CatalogEntryGroupDto>> CreateEntryGroup(
        int projectId,
        int catalogId,
        CatalogEntryGroupRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var validationError = ValidateName(request.Name, "Catalog entry group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntryGroups.AnyAsync(group =>
            group.CatalogId == catalogId && group.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog entry group with this name already exists.");
        }

        var sortOrder = await dbContext.CatalogEntryGroups
            .Where(group => group.CatalogId == catalogId)
            .Select(group => (int?)group.SortOrder)
            .MaxAsync() ?? 0;
        var group = new CatalogEntryGroup
        {
            CatalogId = catalogId,
            Name = name,
            SortOrder = sortOrder + 10,
        };

        dbContext.CatalogEntryGroups.Add(group);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEntryGroups), new { projectId, catalogId }, new CatalogEntryGroupDto(group.Id, group.Name));
    }

    [HttpPut("{catalogId:int}/entry-groups/{groupId:int}")]
    public async Task<ActionResult<CatalogEntryGroupDto>> UpdateEntryGroup(
        int projectId,
        int catalogId,
        int groupId,
        CatalogEntryGroupRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var group = await dbContext.CatalogEntryGroups
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.CatalogId == catalogId &&
                currentGroup.Id == groupId);
        if (group is null)
        {
            return NotFound();
        }

        var validationError = ValidateName(request.Name, "Catalog entry group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntryGroups.AnyAsync(currentGroup =>
            currentGroup.CatalogId == catalogId &&
            currentGroup.Id != groupId &&
            currentGroup.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Catalog entry group with this name already exists.");
        }

        group.Name = name;
        await dbContext.SaveChangesAsync();

        return Ok(new CatalogEntryGroupDto(group.Id, group.Name));
    }

    [HttpDelete("{catalogId:int}/entry-groups/{groupId:int}")]
    public async Task<IActionResult> DeleteEntryGroup(int projectId, int catalogId, int groupId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var group = await dbContext.CatalogEntryGroups
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.CatalogId == catalogId &&
                currentGroup.Id == groupId);
        if (group is null)
        {
            return NotFound();
        }

        dbContext.CatalogEntryGroups.Remove(group);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{catalogId:int}/field-groups")]
    public async Task<ActionResult<IReadOnlyList<CatalogFieldGroupDto>>> GetFieldGroups(int projectId, int catalogId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var groups = await dbContext.CatalogFieldGroups
            .AsNoTracking()
            .Where(group => group.CatalogId == catalogId)
            .OrderBy(group => group.SortOrder)
            .ThenBy(group => group.Name)
            .Select(group => new CatalogFieldGroupDto(group.Id, group.Name))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost("{catalogId:int}/field-groups")]
    public async Task<ActionResult<CatalogFieldGroupDto>> CreateFieldGroup(
        int projectId,
        int catalogId,
        CatalogFieldGroupRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var validationError = ValidateName(request.Name, "Field group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogFieldGroups.AnyAsync(group =>
            group.CatalogId == catalogId && group.Name == name);
        if (hasDuplicateName)
        {
            return BadRequest("Field group with this name already exists.");
        }

        var sortOrder = await dbContext.CatalogFieldGroups
            .Where(group => group.CatalogId == catalogId)
            .Select(group => (int?)group.SortOrder)
            .MaxAsync() ?? 0;
        var group = new CatalogFieldGroup
        {
            CatalogId = catalogId,
            Name = name,
            SortOrder = sortOrder + 10,
        };

        dbContext.CatalogFieldGroups.Add(group);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFieldGroups), new { projectId, catalogId }, new CatalogFieldGroupDto(group.Id, group.Name));
    }

    [HttpGet("{catalogId:int}/fields")]
    public async Task<ActionResult<IReadOnlyList<CatalogFieldDefinitionDto>>> GetFieldDefinitions(int projectId, int catalogId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var fields = await dbContext.CatalogFieldDefinitions
            .AsNoTracking()
            .Include(field => field.FieldGroup)
            .Where(field => field.CatalogId == catalogId)
            .OrderBy(field => field.FieldGroup == null ? "" : field.FieldGroup.Name)
            .ThenBy(field => field.SortOrder)
            .ThenBy(field => field.Name)
            .Select(field => ToDto(field))
            .ToListAsync();

        return Ok(fields);
    }

    [HttpPost("{catalogId:int}/fields")]
    public async Task<ActionResult<CatalogFieldDefinitionDto>> CreateFieldDefinition(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var validationError = await ValidateFieldDefinitionRequest(projectId, catalogId, request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var sortOrder = await dbContext.CatalogFieldDefinitions
            .Where(field => field.CatalogId == catalogId)
            .Select(field => (int?)field.SortOrder)
            .MaxAsync() ?? 0;
        var field = new CatalogFieldDefinition
        {
            CatalogId = catalogId,
            FieldGroupId = request.FieldGroupId,
            Name = request.Name.Trim(),
            DataType = request.DataType.Trim(),
            IsRequired = request.IsRequired,
            MinValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? request.MinValue
                : null,
            MaxValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? request.MaxValue
                : null,
            OptionsJson = request.DataType.Equals("select", StringComparison.OrdinalIgnoreCase)
                ? JsonSerializer.Serialize(NormalizeOptions(request.Options))
                : null,
            ReferenceCatalogId = request.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
                                 request.DataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase)
                ? request.ReferenceCatalogId
                : null,
            SortOrder = sortOrder + 10,
        };

        dbContext.CatalogFieldDefinitions.Add(field);
        await dbContext.SaveChangesAsync();

        field.FieldGroup = request.FieldGroupId is null
            ? null
            : await dbContext.CatalogFieldGroups.AsNoTracking().FirstOrDefaultAsync(group => group.Id == request.FieldGroupId);

        return CreatedAtAction(nameof(GetFieldDefinitions), new { projectId, catalogId }, ToDto(field));
    }

    [HttpPut("{catalogId:int}/fields/{fieldId:int}")]
    public async Task<ActionResult<CatalogFieldDefinitionDto>> UpdateFieldDefinition(
        int projectId,
        int catalogId,
        int fieldId,
        CatalogFieldDefinitionRequest request)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var field = await dbContext.CatalogFieldDefinitions
            .Include(currentField => currentField.FieldGroup)
            .FirstOrDefaultAsync(currentField =>
                currentField.CatalogId == catalogId &&
                currentField.Id == fieldId);
        if (field is null)
        {
            return NotFound();
        }

        var validationError = await ValidateFieldDefinitionRequest(projectId, catalogId, request, fieldId);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        field.FieldGroupId = request.FieldGroupId;
        field.Name = request.Name.Trim();
        field.DataType = request.DataType.Trim();
        field.IsRequired = request.IsRequired;
        field.MinValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
            ? request.MinValue
            : null;
        field.MaxValue = request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
            ? request.MaxValue
            : null;
        field.OptionsJson = request.DataType.Equals("select", StringComparison.OrdinalIgnoreCase)
            ? JsonSerializer.Serialize(NormalizeOptions(request.Options))
            : null;
        field.ReferenceCatalogId = request.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
                                   request.DataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase)
            ? request.ReferenceCatalogId
            : null;

        await dbContext.SaveChangesAsync();

        field.FieldGroup = request.FieldGroupId is null
            ? null
            : await dbContext.CatalogFieldGroups.AsNoTracking().FirstOrDefaultAsync(group => group.Id == request.FieldGroupId);

        return Ok(ToDto(field));
    }

    [HttpDelete("{catalogId:int}/fields/{fieldId:int}")]
    public async Task<IActionResult> DeleteFieldDefinition(int projectId, int catalogId, int fieldId)
    {
        if (!await CatalogExists(projectId, catalogId))
        {
            return NotFound();
        }

        var field = await dbContext.CatalogFieldDefinitions
            .FirstOrDefaultAsync(currentField =>
                currentField.CatalogId == catalogId &&
                currentField.Id == fieldId);
        if (field is null)
        {
            return NotFound();
        }

        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value => value.FieldDefinitionId == fieldId));
        dbContext.CatalogFieldDefinitions.Remove(field);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> CatalogExists(int projectId, int catalogId)
    {
        return await dbContext.Catalogs.AnyAsync(catalog =>
            catalog.ProjectId == projectId && catalog.Id == catalogId);
    }

    private async Task<string?> ValidateFieldDefinitionRequest(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionRequest request,
        int? fieldIdToIgnore = null)
    {
        var nameError = ValidateName(request.Name, "Field name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (!SupportedFieldTypes.Contains(request.DataType))
        {
            return "Unsupported field data type.";
        }

        var name = request.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogFieldDefinitions.AnyAsync(field =>
            field.CatalogId == catalogId &&
            field.Name == name &&
            field.Id != fieldIdToIgnore);
        if (hasDuplicateName)
        {
            return "Field with this name already exists.";
        }

        if (request.FieldGroupId is not null)
        {
            var groupExists = await dbContext.CatalogFieldGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == request.FieldGroupId);
            if (!groupExists)
            {
                return "Field group was not found.";
            }
        }

        if (request.DataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
            request.MinValue is not null &&
            request.MaxValue is not null &&
            request.MinValue > request.MaxValue)
        {
            return "Minimum value cannot be greater than maximum value.";
        }

        if (request.DataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
            NormalizeOptions(request.Options).Count == 0)
        {
            return "Select fields require at least one option.";
        }

        if (request.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
            request.DataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase))
        {
            if (request.ReferenceCatalogId is null)
            {
                return "Reference catalog is required.";
            }

            var referenceCatalogExists = await dbContext.Catalogs.AnyAsync(catalog =>
                catalog.ProjectId == projectId && catalog.Id == request.ReferenceCatalogId);
            if (!referenceCatalogExists)
            {
                return "Reference catalog was not found.";
            }
        }

        return null;
    }

    private async Task<string?> ReplaceEntryFieldValues(
        int catalogId,
        int entryId,
        IReadOnlyList<CatalogEntryFieldValueRequest>? fieldValues)
    {
        var definitions = await dbContext.CatalogFieldDefinitions
            .Where(field => field.CatalogId == catalogId)
            .ToListAsync();
        var definitionsById = definitions.ToDictionary(field => field.Id);
        var requestValues = fieldValues ?? [];

        foreach (var requiredField in definitions.Where(field => field.IsRequired))
        {
            var requestValue = requestValues.FirstOrDefault(value => value.FieldDefinitionId == requiredField.Id);
            var hasValue = requestValue is not null &&
                           (!string.IsNullOrWhiteSpace(requestValue.Value) ||
                            (requestValue.ReferencedEntryIds?.Count ?? 0) > 0);
            if (!hasValue)
            {
                return $"{requiredField.Name} is required.";
            }
        }

        var valuesToAdd = new List<CatalogEntryFieldValue>();
        foreach (var requestValue in requestValues)
        {
            if (!definitionsById.TryGetValue(requestValue.FieldDefinitionId, out var definition))
            {
                return "Catalog field was not found.";
            }

            if (definition.DataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(requestValue.Value))
            {
                if (!double.TryParse(requestValue.Value, out var numericValue))
                {
                    return $"{definition.Name}: value must be a number.";
                }

                if (definition.MinValue is not null && numericValue < definition.MinValue)
                {
                    return $"{definition.Name}: value is below the minimum.";
                }

                if (definition.MaxValue is not null && numericValue > definition.MaxValue)
                {
                    return $"{definition.Name}: value is above the maximum.";
                }
            }

            if (definition.DataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(requestValue.Value))
            {
                var options = string.IsNullOrWhiteSpace(definition.OptionsJson)
                    ? []
                    : JsonSerializer.Deserialize<IReadOnlyList<string>>(definition.OptionsJson) ?? [];
                if (options.Count > 0 && !options.Contains(requestValue.Value, StringComparer.OrdinalIgnoreCase))
                {
                    return $"{definition.Name}: choose one of the allowed values.";
                }
            }

            if (definition.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
                definition.DataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase))
            {
                var referencedIds = (requestValue.ReferencedEntryIds ?? [])
                    .Distinct()
                    .ToList();
                if (definition.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) && referencedIds.Count > 1)
                {
                    return $"{definition.Name}: choose one referenced entry.";
                }

                if (referencedIds.Count > 0)
                {
                    var validReferenceCount = await dbContext.CatalogEntries.CountAsync(entry =>
                        definition.ReferenceCatalogId != null &&
                        entry.CatalogId == definition.ReferenceCatalogId &&
                        referencedIds.Contains(entry.Id));
                    if (validReferenceCount != referencedIds.Count)
                    {
                        return $"{definition.Name}: referenced entry was not found.";
                    }
                }

                valuesToAdd.AddRange(referencedIds.Select(referencedId => new CatalogEntryFieldValue
                {
                    CatalogEntryId = entryId,
                    FieldDefinitionId = definition.Id,
                    ReferencedEntryId = referencedId,
                }));

                continue;
            }

            if (!string.IsNullOrWhiteSpace(requestValue.Value))
            {
                valuesToAdd.Add(new CatalogEntryFieldValue
                {
                    CatalogEntryId = entryId,
                    FieldDefinitionId = definition.Id,
                    Value = requestValue.Value.Trim(),
                });
            }
        }

        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value => value.CatalogEntryId == entryId));
        dbContext.CatalogEntryFieldValues.AddRange(valuesToAdd);

        return null;
    }

    private static string? ValidateCatalogRequest(CatalogRequest request)
    {
        var nameError = ValidateName(request.Name, "Catalog name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (request.Description?.Length > 1000)
        {
            return "Description must be 1000 characters or shorter.";
        }

        return null;
    }

    private static string? ValidateName(string name, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"{fieldName} is required.";
        }

        if (name.Trim().Length > 120)
        {
            return $"{fieldName} must be 120 characters or shorter.";
        }

        return null;
    }

    private static string NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? "" : value.Trim();
    }

    private static string ToCatalogKey(string name)
    {
        var key = new string(name
            .Trim()
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray());
        key = string.Join("-", key.Split('-', StringSplitOptions.RemoveEmptyEntries));

        return string.IsNullOrWhiteSpace(key) ? "catalog" : key;
    }

    private static string EnsureUniqueKey(string key, IReadOnlyCollection<string> existingKeys)
    {
        var usedKeys = existingKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (!usedKeys.Contains(key))
        {
            return key;
        }

        var index = 2;
        var nextKey = $"{key}-{index}";
        while (usedKeys.Contains(nextKey))
        {
            index += 1;
            nextKey = $"{key}-{index}";
        }

        return nextKey;
    }

    private static List<string> NormalizeOptions(IReadOnlyList<string>? options)
    {
        return (options ?? [])
            .Select(option => option.Trim())
            .Where(option => option.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static CatalogDto ToDto(Catalog catalog)
    {
        return new CatalogDto(
            catalog.Id,
            catalog.Key,
            catalog.Name,
            catalog.Description,
            catalog.IsSystem,
            catalog.SupportsHierarchy);
    }

    private static CatalogEntryDto ToDto(CatalogEntry entry)
    {
        var values = entry.FieldValues
            .GroupBy(value => value.FieldDefinitionId)
            .Select(group => new CatalogEntryFieldValueDto(
                group.Key,
                group.FirstOrDefault(value => value.Value != null)?.Value,
                group
                    .Where(value => value.ReferencedEntryId != null)
                    .Select(value => value.ReferencedEntryId!.Value)
                    .OrderBy(id => id)
                    .ToList()))
            .ToList();

        return new CatalogEntryDto(
            entry.Id,
            entry.Name,
            entry.Description,
            entry.ImagePath,
            entry.EntryGroupId,
            entry.EntryGroup?.Name,
            values);
    }

    private static CatalogFieldDefinitionDto ToDto(CatalogFieldDefinition field)
    {
        return new CatalogFieldDefinitionDto(
            field.Id,
            field.Name,
            field.DataType,
            field.IsRequired,
            field.FieldGroupId,
            field.FieldGroup?.Name,
            field.MinValue,
            field.MaxValue,
            string.IsNullOrWhiteSpace(field.OptionsJson)
                ? []
                : JsonSerializer.Deserialize<IReadOnlyList<string>>(field.OptionsJson) ?? [],
            field.ReferenceCatalogId);
    }
}

public record CatalogRequest(
    string Name,
    string? Description,
    bool SupportsHierarchy);

public record CatalogEntryRequest(
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    IReadOnlyList<CatalogEntryFieldValueRequest>? FieldValues);

public record CatalogEntryFieldValueRequest(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int>? ReferencedEntryIds);

public record CatalogEntryGroupRequest(string Name);

public record CatalogFieldGroupRequest(string Name);

public record CatalogFieldDefinitionRequest(
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string>? Options,
    int? ReferenceCatalogId);

public record CatalogDto(
    int Id,
    string Key,
    string Name,
    string? Description,
    bool IsSystem,
    bool SupportsHierarchy);

public record CatalogEntryDto(
    int Id,
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    string? EntryGroupName,
    IReadOnlyList<CatalogEntryFieldValueDto> FieldValues);

public record CatalogEntryFieldValueDto(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int> ReferencedEntryIds);

public record CatalogEntryGroupDto(int Id, string Name);

public record CatalogFieldGroupDto(int Id, string Name);

public record CatalogFieldDefinitionDto(
    int Id,
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    string? FieldGroupName,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string> Options,
    int? ReferenceCatalogId);
