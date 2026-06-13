using StoryDB.Api.Contracts.Auth;

namespace StoryDB.Api.Services.Auth;

public interface IAuthService
{
    Task<AuthServiceResult<AuthUserDto>> GetCurrentUserAsync();

    Task<AuthServiceResult<AuthUserDto>> RegisterAsync(AuthRegisterRequest request);

    Task<AuthServiceResult<AuthUserDto>> LoginAsync(AuthLoginRequest request);

    Task<AuthServiceResult<AuthUserDto>> UpdateCurrentUserAsync(AuthProfileUpdateRequest request);
}
