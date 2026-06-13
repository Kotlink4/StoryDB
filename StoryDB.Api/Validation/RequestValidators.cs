using Microsoft.AspNetCore.Http;
using StoryDB.Api.Files;

namespace StoryDB.Api.Validation;

public static class RequestValidators
{
    public static string? ValidateName(string? name, string fieldName, int maxLength = 120)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"{fieldName} is required.";
        }

        return name.Trim().Length > maxLength
            ? $"{fieldName} must be {maxLength} characters or shorter."
            : null;
    }

    public static string? ValidateOptionalLength(
        string? value,
        string fieldName,
        int maxLength,
        bool trimBeforeCheck = true)
    {
        var normalizedValue = trimBeforeCheck ? value?.Trim() : value;
        return normalizedValue?.Length > maxLength
            ? $"{fieldName} must be {maxLength} characters or shorter."
            : null;
    }

    public static string? ValidateOptionalUploadedImagePath(string? imagePath, string fieldName)
    {
        var normalizedImagePath = ValidationRules.NormalizeOptionalText(imagePath);
        if (normalizedImagePath is null)
        {
            return null;
        }

        if (normalizedImagePath.Length > FileStoragePaths.MaxImagePathLength)
        {
            return $"{fieldName} must be 512 characters or shorter.";
        }

        return FileStoragePaths.IsUploadedImagePath(normalizedImagePath)
            ? null
            : $"{fieldName} must reference an uploaded image.";
    }

    public static string? ValidateRequiredGalleryImage(string? imagePath, string? caption)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return "Gallery image path is required.";
        }

        var imagePathError = ValidationRules.GetUploadedImagePathError(imagePath);
        if (imagePathError is not null)
        {
            return imagePathError;
        }

        return ValidateOptionalLength(caption, "Gallery image caption", 240);
    }

    public static string? ValidateProject(string name, string? coverImagePath)
    {
        var nameError = ValidateName(name, "Project name");
        if (nameError is not null)
        {
            return nameError;
        }

        return ValidateOptionalUploadedImagePath(coverImagePath, "Project cover image path");
    }

    public static string? ValidateStoryObject(
        string name,
        string? surname,
        string? description,
        string? age,
        string? role,
        string? imagePath)
    {
        var nameError = ValidateName(name, "Object name");
        if (nameError is not null)
        {
            return nameError;
        }

        return
            ValidateOptionalLength(surname, "Surname", 120) ??
            ValidateOptionalLength(description, "Description", 1000, trimBeforeCheck: false) ??
            ValidateOptionalLength(age, "Age", 120) ??
            ValidateOptionalLength(role, "Role", 120) ??
            ValidateOptionalUploadedImagePath(imagePath, "Object image path");
    }

    public static string? ValidateCatalog(
        string name,
        string? description,
        string? hierarchyMode,
        IReadOnlySet<string> supportedHierarchyModes)
    {
        var nameError = ValidateName(name, "Catalog name");
        if (nameError is not null)
        {
            return nameError;
        }

        var descriptionError = ValidateOptionalLength(description, "Description", 1000, trimBeforeCheck: false);
        if (descriptionError is not null)
        {
            return descriptionError;
        }

        var normalizedHierarchyMode = string.IsNullOrWhiteSpace(hierarchyMode) ? "entries" : hierarchyMode.Trim();
        return supportedHierarchyModes.Contains(normalizedHierarchyMode)
            ? null
            : "Unsupported catalog hierarchy mode.";
    }

    public static string? ValidateCatalogEntry(string name, string? description, string? imagePath)
    {
        var nameError = ValidateName(name, "Catalog entry name");
        if (nameError is not null)
        {
            return nameError;
        }

        return
            ValidateOptionalLength(description, "Description", 1000, trimBeforeCheck: false) ??
            ValidateOptionalUploadedImagePath(imagePath, "Catalog entry image path");
    }

    public static string? ValidateCatalogFieldDefinition(
        string name,
        string dataType,
        double? minValue,
        double? maxValue,
        IReadOnlyList<string>? options,
        int? referenceCatalogId,
        IReadOnlySet<string> supportedFieldTypes)
    {
        var nameError = ValidateName(name, "Field name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (!supportedFieldTypes.Contains(dataType))
        {
            return "Unsupported field data type.";
        }

        if (
            dataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
            minValue is not null &&
            maxValue is not null &&
            minValue > maxValue)
        {
            return "Minimum value cannot be greater than maximum value.";
        }

        if (
            dataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
            NormalizeOptions(options).Count == 0)
        {
            return "Select fields require at least one option.";
        }

        if (
            (dataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
             dataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase)) &&
            referenceCatalogId is null)
        {
            return "Reference catalog is required.";
        }

        return null;
    }

    public static string? ValidateAttributeGroup(string typeKey, string name, string? iconKey)
    {
        var nameError = ValidateName(name, "Attribute group name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (string.IsNullOrWhiteSpace(typeKey))
        {
            return "Object type key is required.";
        }

        return ValidateOptionalLength(iconKey, "Attribute group icon key", 80);
    }

    public static string? ValidateAttributeDefinition(
        string typeKey,
        string name,
        string dataType,
        double? minValue,
        double? maxValue,
        string? unit,
        string? iconKey,
        IReadOnlyList<string>? options,
        IReadOnlySet<string> supportedDataTypes)
    {
        var nameError = ValidateName(name, "Attribute name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (string.IsNullOrWhiteSpace(typeKey))
        {
            return "Object type key is required.";
        }

        if (!supportedDataTypes.Contains(dataType))
        {
            return "Unsupported attribute data type.";
        }

        if (
            dataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
            minValue is not null &&
            maxValue is not null &&
            minValue > maxValue)
        {
            return "Minimum value cannot be greater than maximum value.";
        }

        if (
            dataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
            NormalizeOptions(options).Count == 0)
        {
            return "Select attributes require at least one option.";
        }

        return
            ValidateOptionalLength(unit, "Attribute unit", 40) ??
            ValidateOptionalLength(iconKey, "Attribute icon key", 80);
    }

    public static string? ValidateHierarchyNode(string name, string? description)
    {
        var nameError = ValidateName(name, "Hierarchy node name");
        if (nameError is not null)
        {
            return nameError;
        }

        return ValidateOptionalLength(description, "Description", 1000, trimBeforeCheck: false);
    }

    public static string? ValidateAuthCredentials(string? email, string? password)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !email.Contains('@'))
        {
            return "Valid email is required.";
        }

        return string.IsNullOrWhiteSpace(password) || password.Length < 6 || password.Length > 128
            ? "Password must be between 6 and 128 characters."
            : null;
    }

    public static string? ValidateAuthProfile(string email, string displayName, string? avatarImagePath)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Trim().Length > 120)
        {
            return "Display name must be between 1 and 120 characters.";
        }

        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !email.Contains('@'))
        {
            return "Valid email is required.";
        }

        var normalizedAvatarPath = ValidationRules.NormalizeOptionalText(avatarImagePath);
        if (normalizedAvatarPath?.Length > 512)
        {
            return "Avatar image path must be 512 characters or shorter.";
        }

        return normalizedAvatarPath is not null &&
               !normalizedAvatarPath.StartsWith(FileStoragePaths.UploadsRequestPath, StringComparison.Ordinal)
            ? "Avatar image path must point to an uploaded file."
            : null;
    }

    public static string? ValidateUploadImage(
        IFormFile? file,
        IReadOnlyDictionary<string, string> allowedContentTypes,
        long maxSizeBytes)
    {
        if (file is null || file.Length == 0)
        {
            return "Image file is required.";
        }

        if (file.Length > maxSizeBytes)
        {
            return "Image file must be 8 MB or smaller.";
        }

        return allowedContentTypes.ContainsKey(file.ContentType)
            ? null
            : "Only JPEG, PNG, WebP, and GIF images are supported.";
    }

    public static string? ValidateRelationGraphLayoutItem(
        int storyObjectId,
        decimal width,
        decimal height,
        decimal x,
        decimal y)
    {
        if (storyObjectId <= 0 || width <= 0 || height <= 0)
        {
            return "Layout item has invalid dimensions.";
        }

        return null;
    }

    private static List<string> NormalizeOptions(IReadOnlyList<string>? options)
    {
        return (options ?? [])
            .Select(option => option.Trim())
            .Where(option => option.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

}

