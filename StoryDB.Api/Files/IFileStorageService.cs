using Microsoft.AspNetCore.Http;

namespace StoryDB.Api.Files;

public interface IFileStorageService
{
    string UploadsRootPath { get; }

    long MaxImageBytes { get; }

    IReadOnlyDictionary<string, string> AllowedImageContentTypes { get; }

    void EnsureUploadsRoot();

    Task<StoredFile> SaveImageAsync(IFormFile file, int? projectId = null, CancellationToken cancellationToken = default);

    bool IsUploadedImagePath(string? path);

    Task<bool> DeleteUploadedFileAsync(string? path, CancellationToken cancellationToken = default);
}

public sealed record StoredFile(
    string Path,
    string FileName,
    string OriginalFileName,
    string OriginalPath,
    string ContentType,
    long Size,
    int Width,
    int Height,
    string Sha256,
    IReadOnlyList<StoredFileVariant> Variants);

public sealed record StoredFileVariant(
    string Key,
    string Path,
    string ContentType,
    long Size,
    int Width,
    int Height);
