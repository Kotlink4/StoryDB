using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Uploads;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Files;
using StoryDB.Api.Security;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("upload")]
[Route("api/uploads")]
public class UploadsController(
    IFileStorageService fileStorageService,
    StoryDbContext dbContext,
    ICurrentUserService currentUserService,
    IProjectAccessService projectAccessService) : ControllerBase
{
    [HttpPost("images")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 8 * 1024 * 1024)]
    public async Task<ActionResult<UploadImageDto>> UploadImage([FromForm] IFormFile file, [FromQuery] int? projectId)
    {
        if (projectId is not null &&
            !await projectAccessService.HasProjectWriteAccessAsync(projectId.Value, HttpContext.RequestAborted))
        {
            return NotFound();
        }

        var validationError = RequestValidators.ValidateUploadImage(
            file,
            fileStorageService.AllowedImageContentTypes,
            fileStorageService.MaxImageBytes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        StoredFile storedFile;
        try
        {
            storedFile = await fileStorageService.SaveImageAsync(file, projectId, HttpContext.RequestAborted);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }

        var now = DateTime.UtcNow;
        var asset = new MediaAsset
        {
            OwnerUserId = currentUserService.UserId,
            ProjectId = projectId,
            OriginalFileName = storedFile.OriginalFileName,
            StorageDirectory = storedFile.OriginalPath[..storedFile.OriginalPath.LastIndexOf('/')],
            OriginalPath = storedFile.OriginalPath,
            PublicPath = storedFile.Path,
            ContentType = storedFile.ContentType,
            Width = storedFile.Width,
            Height = storedFile.Height,
            SizeBytes = storedFile.Size,
            Sha256 = storedFile.Sha256,
            IsMigrated = false,
            CreatedAt = now,
            UpdatedAt = now,
            Variants = storedFile.Variants.Select(variant => new MediaAssetVariant
            {
                VariantKey = variant.Key,
                Path = variant.Path,
                ContentType = variant.ContentType,
                Width = variant.Width,
                Height = variant.Height,
                SizeBytes = variant.Size,
                CreatedAt = now,
            }).ToList(),
        };

        dbContext.MediaAssets.Add(asset);
        await dbContext.SaveChangesAsync(HttpContext.RequestAborted);

        return Ok(new UploadImageDto(storedFile.Path));
    }
}

