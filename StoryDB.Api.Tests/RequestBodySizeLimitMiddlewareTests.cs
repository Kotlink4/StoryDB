using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using StoryDB.Api.Security;

namespace StoryDB.Api.Tests;

public class RequestBodySizeLimitMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_SetsKestrelBodyLimitForRegularRequests()
    {
        var feature = new TestMaxRequestBodySizeFeature();
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/projects";
        context.Features.Set<IHttpMaxRequestBodySizeFeature>(feature);
        var nextCalled = false;
        var middleware = new RequestBodySizeLimitMiddleware(
            _ =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            },
            BuildConfiguration(("Security:MaxRequestBodyBytes", "12345")));

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.Equal(12345, feature.MaxRequestBodySize);
    }

    [Fact]
    public async Task InvokeAsync_SetsUploadBodyLimitForUploadRequests()
    {
        var feature = new TestMaxRequestBodySizeFeature();
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/uploads/images";
        context.Features.Set<IHttpMaxRequestBodySizeFeature>(feature);
        var middleware = new RequestBodySizeLimitMiddleware(
            _ => Task.CompletedTask,
            BuildConfiguration(("Security:MaxUploadBytes", "98765")));

        await middleware.InvokeAsync(context);

        Assert.Equal(98765, feature.MaxRequestBodySize);
    }

    [Fact]
    public async Task InvokeAsync_WhenContentLengthExceedsLimit_ReturnsPayloadTooLarge()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/projects";
        context.Request.ContentLength = 200;
        var nextCalled = false;
        var middleware = new RequestBodySizeLimitMiddleware(
            _ =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            },
            BuildConfiguration(("Security:MaxRequestBodyBytes", "100")));

        await middleware.InvokeAsync(context);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenFeatureIsReadOnly_DoesNotOverwriteBodyLimit()
    {
        var feature = new TestMaxRequestBodySizeFeature
        {
            IsReadOnly = true,
            MaxRequestBodySize = 4096,
        };
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/projects";
        context.Features.Set<IHttpMaxRequestBodySizeFeature>(feature);
        var middleware = new RequestBodySizeLimitMiddleware(
            _ => Task.CompletedTask,
            BuildConfiguration(("Security:MaxRequestBodyBytes", "12345")));

        await middleware.InvokeAsync(context);

        Assert.Equal(4096, feature.MaxRequestBodySize);
    }

    private static IConfiguration BuildConfiguration(params (string Key, string Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value)))
            .Build();

    private sealed class TestMaxRequestBodySizeFeature : IHttpMaxRequestBodySizeFeature
    {
        public bool IsReadOnly { get; init; }

        public long? MaxRequestBodySize { get; set; }
    }
}
