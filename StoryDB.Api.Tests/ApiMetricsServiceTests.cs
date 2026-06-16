using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using StoryDB.Api.Observability;

namespace StoryDB.Api.Tests;

public class ApiMetricsServiceTests
{
    [Fact]
    public void Record_WhenEndpointLimitIsReached_AggregatesNewPathsIntoOverflowBucket()
    {
        var metrics = new ApiMetricsService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Observability:MaxTrackedEndpoints"] = "10",
            })
            .Build());

        for (var index = 0; index < 12; index += 1)
        {
            var context = new DefaultHttpContext();
            context.Request.Method = HttpMethods.Get;
            context.Request.Path = $"/api/load-test/path-{index}";
            context.Response.StatusCode = StatusCodes.Status200OK;

            metrics.RequestStarted();
            metrics.Record(context, elapsedMs: index + 1, slowRequestThresholdMs: 1_000);
        }

        var snapshot = metrics.GetSnapshot();

        Assert.Equal(12, snapshot.TotalRequests);
        Assert.Equal(0, snapshot.ActiveRequests);
        Assert.Equal(11, snapshot.TrackedEndpointCount);
        Assert.Equal(10, snapshot.MaxTrackedEndpoints);
        Assert.Equal(2, snapshot.OverflowRequests);
        Assert.Contains(snapshot.Endpoints, endpoint =>
            endpoint.Path == "/__other__" &&
            endpoint.TotalRequests == 2);
    }

    [Fact]
    public void RequestStarted_IsVisibleUntilRequestIsRecorded()
    {
        var metrics = new ApiMetricsService(new ConfigurationBuilder().Build());

        metrics.RequestStarted();

        var activeSnapshot = metrics.GetSnapshot();
        Assert.Equal(1, activeSnapshot.ActiveRequests);

        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = "/health";
        context.Response.StatusCode = StatusCodes.Status200OK;

        metrics.Record(context, elapsedMs: 12, slowRequestThresholdMs: 1_000);

        var completedSnapshot = metrics.GetSnapshot();
        Assert.Equal(0, completedSnapshot.ActiveRequests);
        Assert.Equal(1, completedSnapshot.TotalRequests);
    }
}
