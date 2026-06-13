using Microsoft.AspNetCore.Http;

namespace StoryDB.Api.Files;

public interface IFileStorageService
{
    string UploadsRootPath { get; }

    long MaxImageBytes { get; }

    IReadOnlyDictionary<string, string> AllowedImageContentTypes { get; }

    void EnsureUploadsRoot();

    Task<StoredFile> SaveImageAsync(IFormFile file, CancellationToken cancellationToken = default);

    bool IsUploadedImagePath(string? path);

    Task<bool> DeleteUploadedFileAsync(string? path, CancellationToken cancellationToken = default);
}

public sealed record StoredFile(
    string Path,
    string FileName,
    string ContentType,
    long Size);
