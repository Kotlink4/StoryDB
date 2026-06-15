using System.Threading.Channels;

namespace StoryDB.Api.Observability;

public sealed class AuditLogQueue : BackgroundService, IAuditLogQueue
{
    private readonly Channel<AuditLogWriteRequest> channel;
    private readonly IServiceScopeFactory scopeFactory;
    private readonly ILogger<AuditLogQueue> logger;

    public AuditLogQueue(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogQueue> logger,
        IConfiguration configuration)
    {
        this.scopeFactory = scopeFactory;
        this.logger = logger;

        var capacity = Math.Max(100, configuration.GetValue("Logging:AuditQueueCapacity", 2_000));
        channel = Channel.CreateBounded<AuditLogWriteRequest>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public bool TryEnqueue(AuditLogWriteRequest request) => channel.Writer.TryWrite(request);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var request in channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
                await auditLogService.WriteRequestAuditAsync(request, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Could not write queued audit log for {Method} {Path} with trace {TraceId}.",
                    request.HttpMethod,
                    request.Path,
                    request.TraceId);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        channel.Writer.TryComplete();
        await base.StopAsync(cancellationToken);
    }
}
