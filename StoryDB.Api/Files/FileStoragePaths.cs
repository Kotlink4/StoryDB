namespace StoryDB.Api.Files;

public static class FileStoragePaths
{
    public const string UploadsRequestPath = "/uploads";
    public const string LegacyImageRequestPath = "/uploads/images/";
    public const string ImageRequestPath = LegacyImageRequestPath;
    public const string ProjectImageRequestPath = "/uploads/projects/";
    public const string GlobalImageRequestPath = "/uploads/global/images/";
    public const int MaxImagePathLength = 512;

    public static bool IsUploadedImagePath(string? path)
    {
        var normalizedPath = path?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedPath))
        {
            return false;
        }

        return normalizedPath.StartsWith(LegacyImageRequestPath, StringComparison.OrdinalIgnoreCase) ||
            normalizedPath.StartsWith(ProjectImageRequestPath, StringComparison.OrdinalIgnoreCase) ||
            normalizedPath.StartsWith(GlobalImageRequestPath, StringComparison.OrdinalIgnoreCase);
    }
}
