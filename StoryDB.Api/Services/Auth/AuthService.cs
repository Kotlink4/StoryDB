using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Auth;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Auth;

public sealed class AuthService(
    StoryDbContext dbContext,
    ICurrentUserService currentUserService) : IAuthService
{
    private readonly PasswordHasher<AppUser> passwordHasher = new();

    public async Task<AuthServiceResult<AuthUserDto>> GetCurrentUserAsync()
    {
        var userId = currentUserService.UserId;
        if (userId is null)
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized();
        }

        var user = await dbContext.Users.FindAsync(userId.Value);
        if (user is null)
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized(shouldSignOut: true);
        }

        return AuthServiceResult<AuthUserDto>.Success(ToDto(user));
    }

    public async Task<AuthServiceResult<AuthUserDto>> RegisterAsync(AuthRegisterRequest request)
    {
        var email = AuthInputValidator.NormalizeEmailInput(request.Email);
        var displayName = request.DisplayName?.Trim();
        var validationError = AuthInputValidator.ValidateCredentials(email, request.Password);
        if (validationError is not null)
        {
            return AuthServiceResult<AuthUserDto>.Invalid(validationError);
        }

        var normalizedEmail = AuthInputValidator.NormalizeEmail(email);
        var exists = await dbContext.Users.AnyAsync(user => user.NormalizedEmail == normalizedEmail);
        if (exists)
        {
            return AuthServiceResult<AuthUserDto>.Conflict("User with this email already exists.");
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

        return AuthServiceResult<AuthUserDto>.Success(ToDto(user), CreatePrincipal(user));
    }

    public async Task<AuthServiceResult<AuthUserDto>> LoginAsync(AuthLoginRequest request)
    {
        var email = AuthInputValidator.NormalizeEmailInput(request.Email);
        var validationError = AuthInputValidator.ValidateCredentials(email, request.Password);
        if (validationError is not null)
        {
            return AuthServiceResult<AuthUserDto>.Invalid(validationError);
        }

        var normalizedEmail = AuthInputValidator.NormalizeEmail(email);
        var user = await dbContext.Users.FirstOrDefaultAsync(currentUser =>
            currentUser.NormalizedEmail == normalizedEmail);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized("Invalid email or password.");
        }

        var passwordResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized("Invalid email or password.");
        }

        if (passwordResult == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            user.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        return AuthServiceResult<AuthUserDto>.Success(ToDto(user), CreatePrincipal(user));
    }

    public async Task<AuthServiceResult<AuthUserDto>> UpdateCurrentUserAsync(AuthProfileUpdateRequest request)
    {
        var userId = currentUserService.UserId;
        if (userId is null)
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized();
        }

        var user = await dbContext.Users.FindAsync(userId.Value);
        if (user is null)
        {
            return AuthServiceResult<AuthUserDto>.Unauthorized(shouldSignOut: true);
        }

        var email = AuthInputValidator.NormalizeEmailInput(request.Email);
        var displayName = request.DisplayName?.Trim() ?? string.Empty;
        var validationError = RequestValidators.ValidateAuthProfile(email, displayName, request.AvatarImagePath);
        if (validationError is not null)
        {
            return AuthServiceResult<AuthUserDto>.Invalid(validationError);
        }

        var normalizedEmail = AuthInputValidator.NormalizeEmail(email);
        var emailExists = await dbContext.Users.AnyAsync(currentUser =>
            currentUser.Id != user.Id &&
            currentUser.NormalizedEmail == normalizedEmail);
        if (emailExists)
        {
            return AuthServiceResult<AuthUserDto>.Conflict("User with this email already exists.");
        }

        user.DisplayName = displayName;
        user.Email = email;
        user.NormalizedEmail = normalizedEmail;
        user.AvatarImagePath = TrimToNull(request.AvatarImagePath);
        user.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return AuthServiceResult<AuthUserDto>.Success(ToDto(user), CreatePrincipal(user));
    }

    private static ClaimsPrincipal CreatePrincipal(AppUser user)
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
        return new ClaimsPrincipal(identity);
    }

    private static string? TrimToNull(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }

    private static AuthUserDto ToDto(AppUser user) => new(
        user.Id,
        user.Email ?? string.Empty,
        user.DisplayName,
        user.AvatarImagePath,
        user.CreatedAt,
        user.UpdatedAt);
}
