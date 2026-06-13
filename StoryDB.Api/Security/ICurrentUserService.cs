namespace StoryDB.Api.Security;

public interface ICurrentUserService
{
    int? UserId { get; }

    bool IsAuthenticated { get; }
}
