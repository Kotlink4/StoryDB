namespace StoryDB.Api.Observability;

public interface IAuditLogQueue
{
    bool TryEnqueue(AuditLogWriteRequest request);

    AuditLogQueueStatsDto GetStats();
}

public sealed record AuditLogQueueStatsDto(
    int Capacity,
    long Queued,
    long Enqueued,
    long Processed,
    long Failed,
    long Dropped);
