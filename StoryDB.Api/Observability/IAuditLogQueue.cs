namespace StoryDB.Api.Observability;

public interface IAuditLogQueue
{
    bool TryEnqueue(AuditLogWriteRequest request);
}
