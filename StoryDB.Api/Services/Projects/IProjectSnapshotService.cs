using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.Services.Projects;

public interface IProjectSnapshotService
{
    Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> GetLatestSnapshotAsync(
        int projectId,
        string scope,
        CancellationToken cancellationToken = default);

    Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishCurrentSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken = default);

    Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishPublishedSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken = default);

    Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> RebuildCurrentSnapshotSectionsAsync(
        int projectId,
        IReadOnlyList<string> sections,
        CancellationToken cancellationToken = default);
}

public enum ProjectSnapshotServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record ProjectSnapshotServiceResult<TValue>(
    ProjectSnapshotServiceStatus Status,
    TValue? Value = default,
    string? Error = null)
{
    public static ProjectSnapshotServiceResult<TValue> Success(TValue value) =>
        new(ProjectSnapshotServiceStatus.Success, value);

    public static ProjectSnapshotServiceResult<TValue> NotFound() =>
        new(ProjectSnapshotServiceStatus.NotFound);

    public static ProjectSnapshotServiceResult<TValue> Invalid(string error) =>
        new(ProjectSnapshotServiceStatus.Invalid, default, error);
}
