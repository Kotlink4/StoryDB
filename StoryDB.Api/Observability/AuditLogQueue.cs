using System.Threading.Channels;

namespace StoryDB.Api.Observability;

public sealed class AuditLogQueue : BackgroundService, IAuditLogQueue
{
    private readonly Channel<AuditLogWriteRequest> channel;
    private readonly IServiceScopeFactory scopeFactory;
    private readonly ILogger<AuditLogQueue> logger;
    private readonly int capacity;
    private long queued;
    private long enqueued;
    private long processed;
    private long failed;
    private long dropped;

    public AuditLogQueue(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogQueue> logger,
        IConfiguration configuration)
    {
        this.scopeFactory = scopeFactory;
        this.logger = logger;

        capacity = Math.Max(100, configuration.GetValue("Logging:AuditQueueCapacity", 2_000));
        channel = Channel.CreateBounded<AuditLogWriteRequest>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public bool TryEnqueue(AuditLogWriteRequest request)
    {
        if (!channel.Writer.TryWrite(request))
        {
            Interlocked.Increment(ref dropped);
            return false;
        }

        Interlocked.Increment(ref queued);
        Interlocked.Increment(ref enqueued);
        return true;
    }

    public AuditLogQueueStatsDto GetStats() =>
        new(
            capacity,
            Interlocked.Read(ref queued),
            Interlocked.Read(ref enqueued),
            Interlocked.Read(ref processed),
            Interlocked.Read(ref failed),
            Interlocked.Read(ref dropped));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var request in channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
                await auditLogService.WriteRequestAuditAsync(request, stoppingToken);
                Interlocked.Increment(ref processed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                Interlocked.Increment(ref failed);
                logger.LogError(
                    exception,
                    "Could not write queued audit log for {Method} {Path} with trace {TraceId}.",
                    request.HttpMethod,
                    request.Path,
                    request.TraceId);
            }
            finally
            {
                Interlocked.Decrement(ref queued);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        channel.Writer.TryComplete();
        await base.StopAsync(cancellationToken);
    }
}
