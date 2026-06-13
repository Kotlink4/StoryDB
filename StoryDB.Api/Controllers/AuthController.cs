using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Auth;
using StoryDB.Api.Services.Auth;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> GetCurrentUser()
    {
        var result = await authService.GetCurrentUserAsync();
        return await ToActionResult(result);
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthUserDto>> Register(AuthRegisterRequest request)
    {
        var result = await authService.RegisterAsync(request);
        return await ToActionResult(result, created: true);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserDto>> Login(AuthLoginRequest request)
    {
        var result = await authService.LoginAsync(request);
        return await ToActionResult(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<AuthUserDto>> UpdateCurrentUser(AuthProfileUpdateRequest request)
    {
        var result = await authService.UpdateCurrentUserAsync(request);
        return await ToActionResult(result);
    }

    private async Task<ActionResult<AuthUserDto>> ToActionResult(
        AuthServiceResult<AuthUserDto> result,
        bool created = false)
    {
        if (result.ShouldSignOut)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        if (result.Principal is not null)
        {
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, result.Principal);
        }

        return result.Status switch
        {
            AuthServiceStatus.Success when created => CreatedAtAction(nameof(GetCurrentUser), result.Value),
            AuthServiceStatus.Success => Ok(result.Value),
            AuthServiceStatus.Unauthorized when result.Error is null => Unauthorized(),
            AuthServiceStatus.Unauthorized => Unauthorized(result.Error),
            AuthServiceStatus.Conflict => Conflict(result.Error),
            AuthServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
