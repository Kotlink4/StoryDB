using StoryDB.Api.Files;

namespace StoryDB.Api.Validation;

public static class ValidationRules
{
    public static string? NormalizeOptionalText(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }

    public static void Required(ValidationResult result, string field, string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            result.Add(field, message);
        }
    }

    public static void RequiredNumber(ValidationResult result, string field, decimal? value, string message)
    {
        if (value is null)
        {
            result.Add(field, message);
        }
    }

    public static void MaxLength(
        ValidationResult result,
        string field,
        string? value,
        int maxLength,
        string message)
    {
        if (value?.Trim().Length > maxLength)
        {
            result.Add(field, message);
        }
    }

    public static void OrderedRange(
        ValidationResult result,
        string startField,
        string endField,
        decimal? startValue,
        decimal? endValue,
        string message)
    {
        if (startValue is not null && endValue is not null && endValue < startValue)
        {
            result.Add(endField, message);
        }
    }

    public static string? GetUploadedImagePathError(string? imagePath)
    {
        var normalizedImagePath = NormalizeOptionalText(imagePath);
        if (normalizedImagePath is null)
        {
            return null;
        }

        if (normalizedImagePath.Length > FileStoragePaths.MaxImagePathLength)
        {
            return "Image path is too long.";
        }

        return FileStoragePaths.IsUploadedImagePath(normalizedImagePath)
            ? null
            : "Image path must reference an uploaded image.";
    }

    public static void UploadedImagePath(ValidationResult result, string field, string? imagePath)
    {
        var imagePathError = GetUploadedImagePathError(imagePath);
        if (imagePathError is not null)
        {
            result.Add(field, imagePathError);
        }
    }
}

