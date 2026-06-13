namespace StoryDB.Api.Validation;

public sealed class ValidationResult
{
    private readonly List<ValidationIssue> issues = [];

    public bool IsValid => issues.Count == 0;

    public IReadOnlyList<ValidationIssue> Issues => issues;

    public string? FirstError => issues.FirstOrDefault()?.Message;

    public void Add(string field, string message) => issues.Add(new ValidationIssue(field, message));
}

public sealed record ValidationIssue(string Field, string Message);
