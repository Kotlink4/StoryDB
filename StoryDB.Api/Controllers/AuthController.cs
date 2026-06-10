using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(StoryDbContext dbContext) : ControllerBase
{
    private readonly PasswordHasher<AppUser> passwordHasher = new();

    [AllowAnonymous]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> GetCurrentUser()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await dbContext.Users.FindAsync(userId.Value);
        if (user is null)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }

        return Ok(ToDto(user));
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthUserDto>> Register(AuthRegisterRequest request)
    {
        var email = NormalizeEmailInput(request.Email);
        var displayName = request.DisplayName?.Trim();
        var validationError = ValidateCredentials(email, request.Password);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var normalizedEmail = NormalizeEmail(email);
        var exists = await dbContext.Users.AnyAsync(user => user.NormalizedEmail == normalizedEmail);
        if (exists)
        {
            return Conflict("User with this email already exists.");
        }

        var now = DateTime.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? email : displayName,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        await SignIn(user);

        return CreatedAtAction(nameof(GetCurrentUser), ToDto(user));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserDto>> Login(AuthLoginRequest request)
    {
        var email = NormalizeEmailInput(request.Email);
        var validationError = ValidateCredentials(email, request.Password);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var normalizedEmail = NormalizeEmail(email);
        var user = await dbContext.Users.FirstOrDefaultAsync(currentUser =>
            currentUser.NormalizedEmail == normalizedEmail);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return Unauthorized("Invalid email or password.");
        }

        var passwordResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Invalid email or password.");
        }

        if (passwordResult == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            user.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        await SignIn(user);

        return Ok(ToDto(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private async Task SignIn(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
    }

    private int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static string? ValidateCredentials(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !email.Contains('@'))
        {
            return "Valid email is required.";
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6 || password.Length > 128)
        {
            return "Password must be between 6 and 128 characters.";
        }

        return null;
    }

    private static string NormalizeEmailInput(string email) => email.Trim();

    private static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    private static AuthUserDto ToDto(AppUser user) => new(user.Id, user.Email ?? string.Empty, user.DisplayName);
}

public record AuthRegisterRequest(string Email, string Password, string? DisplayName);

public record AuthLoginRequest(string Email, string Password);

public record AuthUserDto(int Id, string Email, string DisplayName);
