namespace StoryDB.Api.Contracts.Auth;

public record AuthRegisterRequest(string Email, string Password, string? DisplayName);

public record AuthLoginRequest(string Email, string Password);

public record AuthProfileUpdateRequest(string Email, string DisplayName, string? AvatarImagePath);

public record AuthUserDto(
    int Id,
    string Email,
    string DisplayName,
    string? AvatarImagePath,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
