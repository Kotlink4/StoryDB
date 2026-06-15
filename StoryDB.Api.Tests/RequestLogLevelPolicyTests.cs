using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using StoryDB.Api.Observability;

namespace StoryDB.Api.Tests;

public class RequestLogLevelPolicyTests
{
    [Theory]
    [InlineData(StatusCodes.Status200OK)]
    [InlineData(StatusCodes.Status204NoContent)]
    [InlineData(StatusCodes.Status302Found)]
    public void GetLogLevel_FastSuccessfulRequest_ReturnsDebug(int statusCode)
    {
        var logLevel = RequestLogLevelPolicy.GetLogLevel(statusCode, elapsedMs: 25, slowRequestThresholdMs: 750);

        Assert.Equal(LogLevel.Debug, logLevel);
    }

    [Theory]
    [InlineData(StatusCodes.Status400BadRequest)]
    [InlineData(StatusCodes.Status401Unauthorized)]
    [InlineData(StatusCodes.Status404NotFound)]
    public void GetLogLevel_FastClientError_ReturnsInformation(int statusCode)
    {
        var logLevel = RequestLogLevelPolicy.GetLogLevel(statusCode, elapsedMs: 25, slowRequestThresholdMs: 750);

        Assert.Equal(LogLevel.Information, logLevel);
    }

    [Theory]
    [InlineData(StatusCodes.Status200OK, 750)]
    [InlineData(StatusCodes.Status404NotFound, 750)]
    [InlineData(StatusCodes.Status500InternalServerError, 25)]
    public void GetLogLevel_SlowOrServerErrorRequest_ReturnsWarning(int statusCode, long elapsedMs)
    {
        var logLevel = RequestLogLevelPolicy.GetLogLevel(statusCode, elapsedMs, slowRequestThresholdMs: 750);

        Assert.Equal(LogLevel.Warning, logLevel);
    }
}
