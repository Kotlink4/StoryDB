using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Files;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/uploads")]
public class UploadsController(IFileStorageService fileStorageService) : ControllerBase
{
    [HttpPost("images")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<UploadImageDto>> UploadImage([FromForm] IFormFile file)
    {
        var validationError = RequestValidators.ValidateUploadImage(
            file,
            fileStorageService.AllowedImageContentTypes,
            fileStorageService.MaxImageBytes);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var storedFile = await fileStorageService.SaveImageAsync(file, HttpContext.RequestAborted);

        return Ok(new UploadImageDto(storedFile.Path));
    }
}

public record UploadImageDto(string path);
